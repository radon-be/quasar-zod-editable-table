import assert from 'node:assert/strict'
import test from 'node:test'
import { createApp, createRenderer, h } from 'vue'
import { z } from 'zod'
import {
  clearPersistedState,
  createPersistedStatePlugin,
  prunePersistedState,
  usePersistedState,
  useZodTableState,
} from '../dist/components.js'

class MemoryStorage {
  values = new Map()
  failReads = false
  failWrites = false

  get length() {
    return this.values.size
  }

  key(index) {
    return [...this.values.keys()][index] ?? null
  }

  getItem(key) {
    if (this.failReads) throw new Error('Storage read denied')
    return this.values.get(key) ?? null
  }

  setItem(key, value) {
    if (this.failWrites) throw new Error('Storage write denied')
    this.values.set(key, String(value))
  }

  removeItem(key) {
    if (this.failWrites) throw new Error('Storage write denied')
    this.values.delete(key)
  }
}

const storage = new MemoryStorage()
const storageListeners = new Map()
Object.defineProperty(globalThis, 'window', {
  configurable: true,
  value: {
    localStorage: storage,
    addEventListener: (name, listener) => storageListeners.set(name, listener),
    removeEventListener: (name) => storageListeners.delete(name),
  },
})

function createContext(prefix, callback) {
  const app = createApp({})
  app.use(createPersistedStatePlugin({ prefix }))
  return app.runWithContext(callback)
}

function storedKey(prefix, namespace, key) {
  return `${prefix}:${namespace}:${key}`
}

test('persisted state writes the versioned envelope and reports valid reads', () => {
  const key = storedKey('test-envelope', 'settings', 'main')
  storage.values.delete(key)
  const state = createContext('test-envelope', () =>
    usePersistedState({
      namespace: 'settings',
      key: 'main',
      schema: z.object({ count: z.number() }),
      version: 1,
      defaults: { count: 0 },
    }),
  )

  assert.equal(state.status.value, 'missing')
  state.value.value.count = 4
  const envelope = JSON.parse(storage.getItem(key))
  assert.equal(envelope.v, 1)
  assert.ok(Number.isFinite(Date.parse(envelope.updatedAt)))
  assert.deepEqual(envelope.data, { count: 4 })
  assert.equal(state.persistenceFailed.value, false)

  const secondKey = storedKey('test-envelope-read', 'settings', 'main')
  storage.setItem(
    secondKey,
    JSON.stringify({ v: 1, updatedAt: new Date().toISOString(), data: { count: 9 } }),
  )
  const restored = createContext('test-envelope-read', () =>
    usePersistedState({
      namespace: 'settings',
      key: 'main',
      schema: z.object({ count: z.number() }),
      version: 1,
      defaults: { count: 0 },
    }),
  )
  assert.equal(restored.value.value.count, 9)
  assert.equal(restored.status.value, 'valid')
})

test('older envelopes migrate through every version and are rewritten', () => {
  const key = storedKey('test-migration', 'settings', 'main')
  storage.setItem(
    key,
    JSON.stringify({ v: 1, updatedAt: new Date().toISOString(), data: { oldCount: 2 } }),
  )
  const state = createContext('test-migration', () =>
    usePersistedState({
      namespace: 'settings',
      key: 'main',
      schema: z.object({ count: z.number() }),
      version: 3,
      defaults: { count: 0 },
      migrate: {
        1: (oldData) => ({ count: oldData.oldCount + 1 }),
        2: (oldData) => ({ count: oldData.count * 2 }),
      },
    }),
  )

  assert.equal(state.value.value.count, 6)
  assert.equal(state.status.value, 'migrated')
  assert.equal(JSON.parse(storage.getItem(key)).v, 3)
})

test('invalid, newer, and unmigratable envelopes reset to defaults', () => {
  for (const [prefix, envelope] of [
    ['test-invalid-json', '{'],
    ['test-invalid-schema', JSON.stringify({ v: 1, updatedAt: new Date().toISOString(), data: { count: 'bad' } })],
    ['test-newer', JSON.stringify({ v: 2, updatedAt: new Date().toISOString(), data: { count: 10 } })],
    ['test-missing-migration', JSON.stringify({ v: 1, updatedAt: new Date().toISOString(), data: { count: 10 } })],
  ]) {
    const key = storedKey(prefix, 'settings', 'main')
    storage.setItem(key, envelope)
    const state = createContext(prefix, () =>
      usePersistedState({
        namespace: 'settings',
        key: 'main',
        schema: z.object({ count: z.number() }),
        version: prefix === 'test-missing-migration' ? 3 : 1,
        defaults: { count: 5 },
      }),
    )
    assert.equal(state.value.value.count, 5, prefix)
    assert.equal(state.status.value, 'reset', prefix)
    assert.deepEqual(JSON.parse(storage.getItem(key)).data, { count: 5 }, prefix)
  }
})

test('storage failures keep state usable in memory', () => {
  storage.failReads = true
  const state = createContext('test-unavailable', () =>
    usePersistedState({
      namespace: 'settings',
      key: 'main',
      schema: z.object({ count: z.number() }),
      version: 1,
      defaults: { count: 3 },
    }),
  )
  storage.failReads = false

  assert.equal(state.value.value.count, 3)
  assert.equal(state.status.value, 'unavailable')
  assert.equal(state.persistenceFailed.value, true)
  storage.failWrites = true
  assert.doesNotThrow(() => {
    state.value.value.count = 4
  })
  storage.failWrites = false
  assert.equal(state.persistenceFailed.value, true)
})

test('different app prefixes isolate the same namespace and key', () => {
  const first = createContext('test-app-one', () =>
    usePersistedState({
      namespace: 'tables',
      key: 'materials',
      schema: z.object({ count: z.number() }),
      version: 1,
      defaults: { count: 0 },
    }),
  )
  const second = createContext('test-app-two', () =>
    usePersistedState({
      namespace: 'tables',
      key: 'materials',
      schema: z.object({ count: z.number() }),
      version: 1,
      defaults: { count: 0 },
    }),
  )
  first.value.value.count = 1
  second.value.value.count = 2

  assert.equal(JSON.parse(storage.getItem(storedKey('test-app-one', 'tables', 'materials'))).data.count, 1)
  assert.equal(JSON.parse(storage.getItem(storedKey('test-app-two', 'tables', 'materials'))).data.count, 2)
})

test('prefixes cannot overlap through colon-delimited keys', () => {
  assert.throws(() => createPersistedStatePlugin({ prefix: 'app:tables' }), /prefix/)
})

test('clearing preserves shared refs and persistence for existing and remounted consumers', () => {
  const renderer = createRenderer({
    createElement: () => ({}),
    insert: () => {},
    remove: () => {},
    setElementText: () => {},
    patchProp: () => {},
  })
  const options = {
    namespace: 'settings',
    key: 'main',
    schema: z.object({ count: z.number() }),
    version: 1,
    defaults: { count: 0 },
  }
  let state
  const app = renderer.createApp({
    setup() {
      state = usePersistedState(options)
      return () => h('div')
    },
  })
  app.use(createPersistedStatePlugin({ prefix: 'test-remount' }))
  app.mount({})
  const first = state
  first.value.value.count = 1
  clearPersistedState(undefined, 'test-remount')
  assert.equal(first.value.value.count, 0)
  first.value.value.count = 2
  assert.equal(JSON.parse(storage.getItem('test-remount:settings:main')).data.count, 2)
  app.unmount()

  const second = createContext('test-remount', () => usePersistedState(options))
  assert.equal(second.value, first.value)
  second.value.value.count = 3
  assert.equal(JSON.parse(storage.getItem('test-remount:settings:main')).data.count, 3)
})

test('pruning removes only expired valid envelopes under the app prefix', () => {
  const expired = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString()
  const fresh = new Date().toISOString()
  storage.setItem('test-prune:tables:old', JSON.stringify({ v: 1, updatedAt: expired, data: {} }))
  storage.setItem('test-prune:tables:new', JSON.stringify({ v: 1, updatedAt: fresh, data: {} }))
  storage.setItem('test-prune:tables:bad', '{')
  storage.setItem('test-prune-other:tables:old', JSON.stringify({ v: 1, updatedAt: expired, data: {} }))

  const removed = createContext('test-prune', () => prunePersistedState({ olderThanDays: 90 }))
  assert.equal(removed, 1)
  assert.equal(storage.getItem('test-prune:tables:old'), null)
  assert.notEqual(storage.getItem('test-prune:tables:new'), null)
  assert.notEqual(storage.getItem('test-prune:tables:bad'), null)
  assert.notEqual(storage.getItem('test-prune-other:tables:old'), null)
})

test('clearing scopes to an app prefix or one namespace', () => {
  storage.setItem('test-clear:tables:a', '1')
  storage.setItem('test-clear:filters:a', '2')
  storage.setItem('test-clear-other:tables:a', '3')

  assert.equal(createContext('test-clear', () => clearPersistedState('tables')), 1)
  assert.equal(storage.getItem('test-clear:tables:a'), null)
  assert.equal(storage.getItem('test-clear:filters:a'), '2')
  assert.equal(createContext('test-clear', () => clearPersistedState()), 1)
  assert.equal(storage.getItem('test-clear:filters:a'), null)
  assert.equal(storage.getItem('test-clear-other:tables:a'), '3')
})

const tableDefaults = (columns, pageSize = 25) => ({
  columns,
  pageSize,
  sortBy: 'name',
  descending: false,
})

const schemaFor = (keys) => z.object(Object.fromEntries(keys.map((key) => [key, z.string()])))

function tableState(prefix, defaults, { schemaKeys = ['id', 'name', 'status', 'remarks', 'date'], ...options } = {}) {
  return createContext(prefix, () =>
    useZodTableState('materials', schemaFor(schemaKeys), defaults, {
      togglableColumns: ['name', 'status', 'remarks', 'date'],
      ...options,
    }),
  )
}

test('table state applies current defaults and preserves only user deltas', () => {
  const unchanged = tableState('test-table-defaults', tableDefaults(['name', 'status']))
  const newDefaults = tableState(
    'test-table-defaults',
    { columns: ['name', 'status', 'date'], pageSize: 50, sortBy: 'name', descending: false },
  )
  assert.deepEqual(newDefaults.visibleColumns.value, ['name', 'status', 'date'])
  assert.equal(newDefaults.pagination.value.rowsPerPage, 50)

  const customized = tableState('test-table-customized', tableDefaults(['name', 'status']))
  customized.onUpdateTogglableColumns(['name', 'remarks'])
  customized.onUpdatePagination({
    ...customized.pagination.value,
    rowsPerPage: 50,
    sortBy: 'status',
    descending: true,
  })

  const updatedDefaults = tableState(
    'test-table-customized',
    { columns: ['status', 'date'], pageSize: 25, sortBy: 'name', descending: false },
    { schemaKeys: ['id', 'name', 'status', 'remarks', 'date'], togglableColumns: ['name', 'status', 'remarks', 'date'] },
  )
  assert.deepEqual(updatedDefaults.visibleColumns.value, ['date', 'remarks'])
  assert.equal(updatedDefaults.pagination.value.rowsPerPage, 50)
  assert.equal(updatedDefaults.pagination.value.sortBy, 'status')
  assert.equal(updatedDefaults.pagination.value.descending, true)

  const removedColumns = tableState(
    'test-table-customized',
    { columns: ['status', 'date'], pageSize: 25, sortBy: 'name', descending: false },
    { schemaKeys: ['id', 'status', 'date'], togglableColumns: ['status', 'date'] },
  )
  assert.deepEqual(removedColumns.visibleColumns.value, ['date'])
  assert.equal(removedColumns.pagination.value.sortBy, 'status')
})

test('table state keeps choices for any schema column without extra options', () => {
  const run = () =>
    createContext('test-table-schema-keys', () =>
      useZodTableState(
        'materials',
        z.object({ id: z.string(), name: z.string(), remarks: z.string(), extra: z.object({ note: z.string() }) }),
        { columns: ['name'], pageSize: 25, sortBy: 'name', descending: false },
      ),
    )
  const state = run()
  state.onUpdateTogglableColumns(['name', 'remarks', 'extra.note'])
  state.onUpdatePagination({ ...state.pagination.value, sortBy: 'extra.note', descending: true })

  const reloaded = run()
  assert.deepEqual(reloaded.visibleColumns.value, ['name', 'remarks', 'extra.note'])
  assert.equal(reloaded.pagination.value.sortBy, 'extra.note')
  assert.equal(reloaded.pagination.value.descending, true)
})

test('table state drops saved changes when they match new defaults', () => {
  const customized = tableState('test-table-normalize', tableDefaults(['name', 'status']))
  customized.onUpdateTogglableColumns(['status'])
  customized.onUpdatePagination({
    ...customized.pagination.value,
    rowsPerPage: 50,
    sortBy: 'status',
    descending: true,
  })

  const updated = tableState(
    'test-table-normalize',
    { columns: ['status'], pageSize: 50, sortBy: 'status', descending: true },
    { schemaKeys: ['id', 'name', 'status'], togglableColumns: ['name', 'status'] },
  )
  assert.deepEqual(updated.visibleColumns.value, ['status'])
  assert.equal(updated.pagination.value.rowsPerPage, 50)
  const stored = JSON.parse(storage.getItem(storedKey('test-table-normalize', 'zod-table', 'materials')))
  assert.deepEqual(stored.data, { revision: 1 })
})

test('table state removes stale columns and sort keys from stored changes', () => {
  const key = storedKey('test-table-stale', 'zod-table', 'materials')
  storage.setItem(
    key,
    JSON.stringify({
      v: 1,
      updatedAt: new Date().toISOString(),
      data: { revision: 1, shown: ['removed'], hidden: ['status'], sortBy: 'removed' },
    }),
  )
  const state = tableState(
    'test-table-stale',
    tableDefaults(['name', 'status']),
    { schemaKeys: ['id', 'name', 'status'], togglableColumns: ['name', 'status', 'removed'] },
  )

  assert.deepEqual(state.visibleColumns.value, ['name'])
  assert.equal(state.pagination.value.sortBy, 'name')
  assert.deepEqual(JSON.parse(storage.getItem(key)).data, { revision: 1, hidden: ['status'] })
})

test('table revision changes reset saved state and page state is not persisted', () => {
  const state = tableState('test-table-revision', tableDefaults(['name', 'status']))
  state.onUpdateTogglableColumns(['status'])
  state.onUpdatePagination({ ...state.pagination.value, page: 4, rowsNumber: 200, rowsPerPage: 50 })

  const nextRevision = tableState(
    'test-table-revision',
    tableDefaults(['name']),
    { revision: 2, schemaKeys: ['id', 'name', 'status'], togglableColumns: ['name', 'status'] },
  )
  assert.deepEqual(nextRevision.visibleColumns.value, ['name'])
  assert.equal(nextRevision.pagination.value.page, 1)
  assert.equal(nextRevision.pagination.value.rowsPerPage, 25)
  const stored = JSON.parse(storage.getItem(storedKey('test-table-revision', 'zod-table', 'materials')))
  assert.deepEqual(stored.data, { revision: 2 })
  assert.equal('page' in stored.data, false)
  assert.equal('rowsNumber' in stored.data, false)
})

test('table reset restores current defaults and removes the persisted entry', () => {
  const state = tableState('test-table-reset', tableDefaults(['name', 'status']))
  state.onUpdateTogglableColumns(['name'])
  state.onUpdatePagination({ ...state.pagination.value, page: 3, rowsPerPage: 50 })
  state.reset()

  assert.deepEqual(state.visibleColumns.value, ['name', 'status'])
  assert.equal(state.pagination.value.page, 1)
  assert.equal(state.pagination.value.rowsPerPage, 25)
  assert.equal(storage.getItem(storedKey('test-table-reset', 'zod-table', 'materials')), null)
})

test('table bindings are directly usable and shared changes update pagination', () => {
  const first = tableState('test-table-shared', tableDefaults(['name', 'status']))
  const second = tableState('test-table-shared', tableDefaults(['name', 'status']))
  assert.equal(first.bindings.pagination, first.pagination.value)
  assert.deepEqual(first.bindings.defaultToggledColumns, ['name', 'status'])

  first.onUpdatePagination({ ...first.pagination.value, rowsPerPage: 50, sortBy: 'status' })
  assert.equal(second.pagination.value.rowsPerPage, 50)
  assert.equal(second.pagination.value.sortBy, 'status')

  const key = storedKey('test-table-shared', 'zod-table', 'materials')
  storageListeners.get('storage')({
    key,
    newValue: JSON.stringify({
      v: 1,
      updatedAt: new Date().toISOString(),
      data: { revision: 1, hidden: ['status'], pageSize: 100 },
    }),
  })
  assert.deepEqual(first.bindings.defaultToggledColumns, ['name'])
  assert.equal(first.pagination.value.rowsPerPage, 100)
  assert.equal(second.pagination.value.rowsPerPage, 100)

  clearPersistedState('zod-table', 'test-table-shared')
  assert.equal(first.pagination.value.rowsPerPage, 25)
  assert.equal(second.pagination.value.rowsPerPage, 25)
  second.onUpdateTogglableColumns(['status'])
  assert.deepEqual(first.visibleColumns.value, ['status'])
  assert.deepEqual(JSON.parse(storage.getItem(key)).data, { revision: 1, hidden: ['name'] })
})

test('a different revision received later does not restore obsolete choices', () => {
  const state = tableState('test-table-cross-revision', tableDefaults(['name', 'status']), { revision: 2 })
  state.onUpdatePagination({ ...state.pagination.value, rowsPerPage: 50 })
  storageListeners.get('storage')({
    key: 'test-table-cross-revision:zod-table:materials',
    newValue: JSON.stringify({
      v: 1,
      updatedAt: new Date().toISOString(),
      data: { revision: 1, hidden: ['status'], pageSize: 100 },
    }),
  })
  assert.deepEqual(state.visibleColumns.value, ['name', 'status'])
  assert.equal(state.pagination.value.rowsPerPage, 25)
  state.onUpdateTogglableColumns(['status'])
  assert.deepEqual(
    JSON.parse(storage.getItem('test-table-cross-revision:zod-table:materials')).data,
    { revision: 2, hidden: ['name'] },
  )
})
