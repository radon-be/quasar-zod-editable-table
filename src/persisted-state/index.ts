import { effectScope, inject, provide, ref, watch } from 'vue'
import type { App, InjectionKey, Ref } from 'vue'
import { z } from 'zod'

export type PersistedStateStatus = 'missing' | 'valid' | 'migrated' | 'reset' | 'unavailable'

export type PersistedStateOptions<T> = {
  namespace: string
  key: string
  schema: z.ZodType<T>
  version: number
  defaults: T | (() => T)
  migrate?: Record<number, (data: unknown) => unknown>
}

export type PersistedState<T> = {
  value: Ref<T>
  status: Ref<PersistedStateStatus>
  persistenceFailed: Ref<boolean>
  reset: () => void
}

export const PersistedStatePrefixKey: InjectionKey<string> = Symbol.for('PersistedStatePrefix')

type NormalizedOptions<T> = Omit<PersistedStateOptions<T>, 'defaults'> & {
  defaults: () => T
}

type CacheEntry<T> = {
  storageKey: string
  options: NormalizedOptions<T>
  value: Ref<T>
  status: Ref<PersistedStateStatus>
  persistenceFailed: Ref<boolean>
  skipNextSave: boolean
}

type StoredEnvelope = {
  v: number
  updatedAt: string
  data: unknown
}

const cache = new Map<string, CacheEntry<unknown>>()
const prunedApps = new WeakSet<App>()
let listeningWindow: Window | undefined

function validatePart(name: string, value: string) {
  if (!value.trim() || value.includes(':')) {
    throw new Error(`${name} must be a non-empty string without ":"`)
  }
}

function validatePrefix(prefix: string) {
  validatePart('prefix', prefix)
}

function requirePrefix() {
  const prefix = inject(PersistedStatePrefixKey, undefined)
  if (!prefix) {
    throw new Error(
      'Persisted state requires a per-app prefix. Install createPersistedStatePlugin({ prefix }) first.',
    )
  }
  return prefix
}

function resolvePrefix(explicitPrefix?: string) {
  if (explicitPrefix !== undefined) {
    validatePrefix(explicitPrefix)
    return explicitPrefix
  }
  return requirePrefix()
}

function getStorage(): Storage | undefined {
  try {
    return typeof window === 'undefined' ? undefined : window.localStorage
  } catch {
    return undefined
  }
}

function getDefault<T>(options: NormalizedOptions<T>): T {
  const result = options.schema.safeParse(options.defaults())
  if (!result.success) {
    throw new Error(`Persisted state defaults failed validation for "${options.namespace}:${options.key}"`)
  }
  return result.data
}

function isEnvelope(value: unknown): value is StoredEnvelope {
  if (typeof value !== 'object' || value === null) return false
  const envelope = value as Record<string, unknown>
  const updatedAt =
    typeof envelope.updatedAt === 'string' &&
    Number.isFinite(Date.parse(envelope.updatedAt)) &&
    new Date(envelope.updatedAt).toISOString() === envelope.updatedAt
  return (
    Number.isInteger(envelope.v) &&
    typeof envelope.v === 'number' &&
    envelope.v >= 1 &&
    updatedAt &&
    Object.prototype.hasOwnProperty.call(envelope, 'data')
  )
}

function readEnvelope<T>(
  raw: string,
  options: NormalizedOptions<T>,
): { data: T; status: PersistedStateStatus; writeBack: boolean } {
  let envelope: unknown
  try {
    envelope = JSON.parse(raw)
  } catch {
    return { data: getDefault(options), status: 'reset', writeBack: true }
  }

  if (!isEnvelope(envelope) || envelope.v > options.version) {
    return { data: getDefault(options), status: 'reset', writeBack: true }
  }

  if (envelope.v === options.version) {
    const result = options.schema.safeParse(envelope.data)
    return result.success
      ? { data: result.data, status: 'valid', writeBack: false }
      : { data: getDefault(options), status: 'reset', writeBack: true }
  }

  let data = envelope.data
  try {
    for (let version = envelope.v; version < options.version; version += 1) {
      const migrate = options.migrate?.[version]
      if (!migrate) {
        return { data: getDefault(options), status: 'reset', writeBack: true }
      }
      data = migrate(data)
    }
  } catch (error) {
    console.error(`Persisted state migration failed for "${options.namespace}:${options.key}"`, error)
    return { data: getDefault(options), status: 'reset', writeBack: true }
  }

  const result = options.schema.safeParse(data)
  return result.success
    ? { data: result.data, status: 'migrated', writeBack: true }
    : { data: getDefault(options), status: 'reset', writeBack: true }
}

function persist<T>(entry: CacheEntry<T>) {
  const storage = getStorage()
  if (!storage) {
    entry.persistenceFailed.value = true
    entry.status.value = 'unavailable'
    return
  }

  const parsed = entry.options.schema.safeParse(entry.value.value)
  if (!parsed.success) {
    entry.persistenceFailed.value = true
    console.error(`Persisted state value failed validation for "${entry.options.namespace}:${entry.options.key}"`)
    return
  }

  try {
    storage.setItem(
      entry.storageKey,
      JSON.stringify({
        v: entry.options.version,
        updatedAt: new Date().toISOString(),
        data: parsed.data,
      }),
    )
    entry.persistenceFailed.value = false
  } catch {
    entry.persistenceFailed.value = true
    entry.status.value = 'unavailable'
  }
}

function applyRaw<T>(entry: CacheEntry<T>, raw: string | null) {
  if (raw === null) {
    entry.skipNextSave = true
    entry.value.value = getDefault(entry.options)
    entry.status.value = 'missing'
    entry.persistenceFailed.value = false
    entry.skipNextSave = false
    return
  }

  const result = readEnvelope(raw, entry.options)
  entry.skipNextSave = true
  entry.value.value = result.data
  entry.status.value = result.status
  entry.persistenceFailed.value = false
  entry.skipNextSave = false
  if (result.writeBack) persist(entry)
}

function ensureStorageListener() {
  if (typeof window === 'undefined') return
  if (listeningWindow === window) return
  listeningWindow?.removeEventListener('storage', onStorage)
  listeningWindow = window
  listeningWindow.addEventListener('storage', onStorage)
}

function onStorage(event: StorageEvent) {
  if (!event.key) return
  const entry = cache.get(event.key)
  if (!entry) return
  try {
    applyRaw(entry, event.newValue)
  } catch (error) {
    console.error(`Could not apply cross-tab persisted state update for "${event.key}"`, error)
  }
}

function createEntry<T>(storageKey: string, options: NormalizedOptions<T>): CacheEntry<T> {
  let initialValue = getDefault(options)
  let initialStatus: PersistedStateStatus = 'missing'
  let persistenceFailed = false
  let initialWriteBack = false
  const storage = getStorage()

  if (!storage) {
    initialStatus = 'unavailable'
    persistenceFailed = true
  } else {
    try {
      const raw = storage.getItem(storageKey)
      if (raw !== null) {
        const result = readEnvelope(raw, options)
        initialValue = result.data
        initialStatus = result.status
        initialWriteBack = result.writeBack
      }
    } catch {
      initialStatus = 'unavailable'
      persistenceFailed = true
    }
  }

  const value = ref(initialValue) as Ref<T>
  const entry: CacheEntry<T> = {
    storageKey,
    options,
    value,
    status: ref(initialStatus),
    persistenceFailed: ref(persistenceFailed),
    skipNextSave: false,
  }

  cache.set(storageKey, entry as CacheEntry<unknown>)
  effectScope(true).run(() => {
    watch(
      entry.value,
      () => {
        if (!entry.skipNextSave) persist(entry)
      },
      { deep: true, flush: 'sync' },
    )
  })
  if (initialWriteBack) persist(entry)
  return entry
}

function resolveOptions<T>(options: PersistedStateOptions<T>): NormalizedOptions<T> {
  validatePart('namespace', options.namespace)
  validatePart('key', options.key)
  if (!Number.isInteger(options.version) || options.version < 1) {
    throw new Error('Persisted state version must be a positive integer')
  }

  return {
    ...options,
    defaults: typeof options.defaults === 'function' ? (options.defaults as () => T) : () => options.defaults as T,
  }
}

export function usePersistedState<T>(input: PersistedStateOptions<T>): PersistedState<T> {
  const options = resolveOptions(input)
  const prefix = requirePrefix()
  const storageKey = `${prefix}:${options.namespace}:${options.key}`
  let entry = cache.get(storageKey) as CacheEntry<T> | undefined

  if (entry && entry.options.version !== options.version) {
    throw new Error(`Persisted state "${storageKey}" was opened with multiple format versions`)
  }
  if (!entry) entry = createEntry(storageKey, options)
  const currentEntry = entry

  ensureStorageListener()
  return {
    value: currentEntry.value,
    status: currentEntry.status,
    persistenceFailed: currentEntry.persistenceFailed,
    reset() {
      const storage = getStorage()
      let failed = !storage
      if (storage) {
        try {
          storage.removeItem(storageKey)
        } catch (error) {
          failed = true
          console.error(`Could not clear persisted state "${storageKey}"`, error)
        }
      }
      currentEntry.persistenceFailed.value = failed
      currentEntry.skipNextSave = true
      currentEntry.value.value = getDefault(currentEntry.options)
      currentEntry.status.value = failed ? 'unavailable' : 'missing'
      currentEntry.skipNextSave = false
    },
  }
}

export function providePersistedStatePrefix(prefix: string, app?: App) {
  validatePrefix(prefix)
  if (app) {
    app.provide(PersistedStatePrefixKey, prefix)
  } else {
    provide(PersistedStatePrefixKey, prefix)
  }
}

export function createPersistedStatePlugin(options: {
  prefix: string
  prune?: { olderThanDays?: number }
}) {
  validatePrefix(options.prefix)

  return {
    install(app: App) {
      providePersistedStatePrefix(options.prefix, app)
      if (options.prune && !prunedApps.has(app)) {
        prunedApps.add(app)
        prunePrefix(options.prefix, options.prune)
      }
    },
  }
}

function isEnvelopeForPruning(value: unknown): value is StoredEnvelope {
  return isEnvelope(value)
}

function prunePrefix(prefix: string, { olderThanDays = 90 }: { olderThanDays?: number } = {}) {
  if (!Number.isFinite(olderThanDays) || olderThanDays < 0) {
    throw new Error('olderThanDays must be a non-negative number')
  }

  const storage = getStorage()
  if (!storage) return 0

  const prefixWithDelimiter = `${prefix}:`
  const cutoff = Date.now() - olderThanDays * 24 * 60 * 60 * 1000
  let removed = 0

  try {
    for (let index = storage.length - 1; index >= 0; index -= 1) {
      try {
        const key = storage.key(index)
        if (!key?.startsWith(prefixWithDelimiter)) continue
        const raw = storage.getItem(key)
        if (raw === null) continue

        let parsed: unknown
        try {
          parsed = JSON.parse(raw)
        } catch {
          continue
        }
        if (isEnvelopeForPruning(parsed) && Date.parse(parsed.updatedAt) < cutoff) {
          storage.removeItem(key)
          removed += 1
          const entry = cache.get(key)
          if (entry) applyRaw(entry, null)
        }
      } catch {
        console.error('Could not prune persisted state because browser storage failed')
        return removed
      }
    }
  } catch {
    console.error('Could not prune persisted state because browser storage failed')
    return removed
  }

  return removed
}

export function prunePersistedState({
  olderThanDays = 90,
  prefix,
}: { olderThanDays?: number; prefix?: string } = {}) {
  return prunePrefix(resolvePrefix(prefix), { olderThanDays })
}

export function clearPersistedState(namespace?: string, appPrefix?: string) {
  const prefix = resolvePrefix(appPrefix)
  if (namespace !== undefined) validatePart('namespace', namespace)
  const keyPrefix = namespace === undefined ? `${prefix}:` : `${prefix}:${namespace}:`
  const storage = getStorage()
  let removed = 0
  let failed = !storage

  if (storage) {
    try {
      for (let index = storage.length - 1; index >= 0; index -= 1) {
        try {
          const key = storage.key(index)
          if (key?.startsWith(keyPrefix)) {
            storage.removeItem(key)
            removed += 1
          }
        } catch (error) {
          failed = true
          console.error('Could not clear persisted state because browser storage failed', error)
          break
        }
      }
    } catch (error) {
      failed = true
      console.error('Could not clear persisted state because browser storage failed', error)
    }
  }

  for (const [key, entry] of cache) {
    if (!key.startsWith(keyPrefix)) continue
    entry.skipNextSave = true
    entry.value.value = getDefault(entry.options)
    entry.status.value = failed ? 'unavailable' : 'missing'
    entry.persistenceFailed.value = failed
    entry.skipNextSave = false
  }

  return removed
}
