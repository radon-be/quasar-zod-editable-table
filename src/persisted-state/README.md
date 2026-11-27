# Persisted State

This self-contained helper uses only Vue and Zod. It can later move into a
dedicated package without coupling its callers to Quasar or zod-table.

## App prefixes

Install `createPersistedStatePlugin({ prefix })` once for each Vue app, or call
`providePersistedStatePrefix(prefix, app)` from that app's setup. A prefix is
required; `usePersistedState` throws if no prefix was provided. Stored keys use
the form `<app-prefix>:<namespace>:<key>`, isolating microfrontends that share
an origin. Each part must be non-empty and cannot contain `:`.

## Persisted values

`usePersistedState` receives a Zod schema, a storage-format `version`, defaults,
and optional one-step-at-a-time migrations:

```typescript
const state = usePersistedState({
  namespace: 'filters',
  key: 'materials',
  schema: z.object({ status: z.string().optional() }),
  version: 2,
  defaults: () => ({ status: 'active' }),
  migrate: {
    1: (oldData) => z.object({ status: z.string() }).parse(oldData),
  },
})
```

The envelope is `{ v, updatedAt, data }`. Reads validate the envelope and
`data`, migrate older versions step by step, and fall back to defaults for
invalid, newer, or unmigratable values. `status` reports `missing`, `valid`,
`migrated`, `reset`, or `unavailable`. `reset()` removes the stored key.
When browser storage is unavailable or a write fails, the reactive value
continues to work in memory and `persistenceFailed` is true.

**Persist the user's changes, not the resolved state.** A complete snapshot can
be structurally valid but still pin old defaults indefinitely. Store only
differences from current defaults, then derive the effective value from the
current defaults and those differences on every load. This lets new defaults
reach users unless they explicitly chose otherwise.

The helper's `version` (`v` in storage) describes the shape of the stored data
and changes only when that format changes. A caller may also keep its own reset
number in `data` (for example, `useZodTableState`'s `revision`) to discard
user-selected layout choices without changing the storage format.

`clearPersistedState()` clears all keys belonging to the current app prefix;
passing a namespace clears only that namespace. These helpers use Vue's
current app context when called during setup; from callbacks outside setup, pass
the app prefix explicitly as the second clear argument or in prune options.
`prunePersistedState` removes
only structurally valid envelopes with an old `updatedAt`, and the plugin's
optional `prune` setting runs it at most once per app instance.
