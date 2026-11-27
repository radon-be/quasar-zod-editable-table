# Quasar App Extension Zod Table

An editable table component for Quasar that automatically generates columns and validation from a Zod v4 schema.

## Install

To install this Quasar App Extension, run:

```bash
quasar ext add @radon-be/zod-table
```

Or install the package directly via npm:

```bash
npm install @radon-be/quasar-app-extension-zod-table
```

Import the component stylesheet once in your application entry point or Quasar boot file:

```ts
import '@radon-be/quasar-app-extension-zod-table/style.css'
```

The compiled JavaScript can also be imported in Node without a `.vue` loader. The stylesheet is separate so Node and SSR tools do not need a CSS loader.

### Requirements

- **Quasar Dialog Plugin**: Required for delete row confirmation dialogs. Make sure the Dialog plugin is installed in your Quasar config (`quasar.config.ts`).

## Features

- Strongly typed
- **Schema Driven**: Columns are generated automatically from Zod object definition.
- **Validation**: Input cells validate against the Zod schema.
- **Quasar Integration**: Built on top of `q-table` and `q-input`.
- Global `editable` and per-column `editable-columns` props to enable/disable editing
- `show-columns` prop to explicitly show specific columns (preventing unwanted auto-inclusion of new schema properties)
- `hide-columns` prop to hide specific columns from the dataset
- `column-labels` prop to re-label columns
- Support for re-labeling columns
- Visual indicators (flat, bordered, ...) are passed-through
- `header-class` and `header-style` props to customize the headers
- Optional `actions` column
- `string` data is edited in a regular `q-input`
- `number` data in a specialised `q-input` and cleaned up after editing (e.g. 00034 -> 34)
- `bool` data is represented as a checkbox
- `enum` data as a dropdown
- `datetime` support with date/time pickers for `z.string().datetime()` schemas
- `date` and `time` support with specialized date/time pickers
- **Read-only fields**: Fields marked with `z.readonly()` cannot be edited
- **Complex/nested properties**: Support for nested object properties using dot notation (e.g., `extra.requestedAt`)
- **Foreign key support**: Dropdown with complex objects using `colEditType: 'foreign-key'` with `optionLabel` and `optionValue`
- **Clearable fields**: Optional clear button for date, time, and foreign key fields
- **Togglable Columns**: Show/hide columns dynamically with the `togglable-columns` prop
- **Date/Time Picker**: Quick access "Now" button to set current date/time, "Clear" button to remove value
- **Delete Confirmation**: Confirmation dialog before deleting rows (requires Quasar Dialog plugin)
- In Edit mode: `Enter` key = save ; `Esc` key = cancel
- `string` props can be edited with a dropdown box by adding an `extraColumnOptions` option

### Version 0.3.1

Fixes the `useZodTableState` typings for apps with `exactOptionalPropertyTypes`
(Quasar's strict TypeScript mode). In 0.3.0 the published declarations typed
`pagination.rowsNumber` as `number | undefined`, so passing
`tableState.pagination` to `:pagination`, or using
`v-bind="tableState.bindings"`, was a type error. `pagination` is now typed as
`Ref<ZodTablePagination>` and `bindings` as the new exported
`ZodTableStateBindings<T>`. Runtime behaviour is unchanged; a cast added as a
workaround can be removed.

### Version 0.3.0

This release adds persisted-state helpers and table-state composables.
Compared with 0.2.5, the package now ships bundled JavaScript instead of
individual compiled source files; consumers of internal `dist` paths may need
to use the public package exports. Import the separate stylesheet as shown
above. Zod is now a peer dependency requiring `^4.4.3`. Column options without
`colEditType` now retain the schema-inferred editor rather than forcing a
foreign-key editor.

When `default-toggled-columns` is replaced after a user changes column
visibility, the table now applies the new defaults instead of keeping the
previous manual selection.

Persisted table state is opt-in: existing tables do not need the prefix
plugin. Existing app-managed settings are left untouched and are not
automatically migrated to the new storage format. Check consuming applications
before upgrading; a dependency range of `^0.2.5` does not include 0.3.0.

### IntelliSense

For TypeScript prop IntelliSense in Vue templates, make sure the Vue language server (Volar) is enabled in your project.

You can use the component in two ways:

- As a global component via the Quasar App Extension boot registration.
- As a named import:

```ts
import { ZodTable } from '@radon-be/quasar-app-extension-zod-table'
```

#### Global component IntelliSense (Quasar project)

When using the component as a global component via the app extension, add the following to your `src/env.d.ts` to enable prop IntelliSense in Vue templates:

```ts
import { type ZodTable as ZodTableComponent } from '@radon-be/quasar-app-extension-zod-table'

declare module '@vue/runtime-core' {
  export interface GlobalComponents {
    ZodTable: typeof ZodTableComponent
  }
}

export {}
```

> **Note:** Augment `@vue/runtime-core` (not `vue`) and use `typeof` on the imported value — this is required for Volar to resolve prop types in templates.

## Usage

Use the `ZodTable` component in your Vue files.

```vue
<template>
  <ZodTable
    title="My Users"
    row-key="id"
    :row-model="userSchema"
    :data="rows"
    editable
    :editable-columns="['*']"
    :update-row="handleUpdate"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { z } from 'zod'

const userSchema = z.object({
  id: z.number().readonly(), // Read-only fields cannot be edited
  name: z.string().min(1, 'Name is required'),
  email: z.string().email(),
  role: z.enum(['admin', 'user']),
  age: z.number().min(18).optional(),
})

type User = z.infer<typeof userSchema>

const rows = ref<User[]>([
  { id: 1, name: 'Alice', email: 'alice@example.com', role: 'admin', age: 30 },
  { id: 2, name: 'Bob', email: 'bob@example.com', role: 'user', age: 25 },
])

const handleUpdate = async (updatedRow: User) => {
  const index = rows.value.findIndex((r) => r.id === updatedRow.id)
  if (index !== -1) {
    rows.value[index] = updatedRow
  }
}
</script>
```

### Advanced Features

#### Pagination and Default Sort

You can control pagination and sorting via `v-model:pagination`:

```vue
<ZodTable :row-model="schema" :data="rows" v-model:pagination="pagination" />
```

```ts
const pagination = ref({
  page: 1,
  rowsPerPage: 10,
  sortBy: 'name',
  descending: false,
})
```

If you do not bind it, the component defaults to `{ page: 1, rowsPerPage: 5, sortBy: null, descending: false }`.

#### Server-side Pagination

For server-side paging, listen for the `request` event and return only the rows for the requested page. Set `pagination.rowsNumber` to the total number of rows after filtering so the table can calculate the page count.

Use `rows-per-page-options` to control the available page sizes. Changing the page size resets the current page to page 1 and emits another request.

```vue
<ZodTable
  :row-model="schema"
  :data="rows"
  :loading="loading"
  v-model:pagination="pagination"
  :rows-per-page-options="[10, 25, 50, 100]"
  @request="loadRows"
/>
```

```ts
type Pagination = {
  page: number
  rowsPerPage: number
  sortBy?: string | null
  descending?: boolean
  rowsNumber?: number
}

const pagination = ref<Pagination>({
  page: 1,
  rowsPerPage: 10,
  sortBy: null,
  descending: false,
  rowsNumber: 0,
})

async function loadRows(request: { pagination: Pagination; filter?: string | object }) {
  const result = await api.getRows(request.pagination, request.filter)

  rows.value = result.rows
  pagination.value = {
    ...request.pagination,
    rowsNumber: result.total,
  }
}
```

The `request` event is emitted when the page, page size, sort order, or filter changes. The request contains the current `pagination` model and optional `filter` value. Use `rowsPerPage: 0` when the server should return all matching rows.

Disable sorting for columns that the server cannot sort. Other columns remain sortable by default:

```vue
<ZodTable
  row-key="id"
  :row-model="schema"
  :data="rows"
  :extra-column-options="{ description: { sortable: false } }"
/>
```

`colEditType` is optional: settings such as `sortable` and padding do not change the inferred editor. Providing `options` without `colEditType` still selects the foreign-key editor.

#### Expandable Rows

Use the `expand` slot for details and a cell slot to toggle the row. Expansion is keyed by `row-key`; the table does not expand on row click automatically. The cell and expansion slots receive `row`, `expanded`, and `toggleExpand`, in addition to the QTable body slot properties. QTable's `expanded` / `v-model:expanded` can also control the expanded row keys.

```vue
<ZodTable row-key="id" :row-model="schema" :data="rows">
  <template #body-cell-name="{ row, expanded, toggleExpand }">
    <q-btn
      flat dense
      :icon="expanded ? 'expand_less' : 'expand_more'"
      :aria-label="expanded ? 'Hide details' : 'Show details'"
      :aria-expanded="expanded"
      @click.stop="toggleExpand"
    />
    {{ row.name }}
  </template>
  <template #expand="{ row }">
    Details for {{ row.name }}
  </template>
</ZodTable>
```

#### Date and Time Fields

Use Zod's datetime schema to enable date/time pickers:

```typescript
const schema = z.object({
  createdAt: z.string().datetime().optional(),
  scheduledTime: z.string().datetime().optional(),
})
```

Configure with `extraColumnOptions`:

```vue
<ZodTable
  :row-model="schema"
  :data="rows"
  :extraColumnOptions="{
    createdAt: {
      colEditType: 'date',
      clearable: true,
    },
    scheduledTime: {
      colEditType: 'time',
      clearable: true,
    },
  }"
/>
```

#### Nested/Complex Properties

Define nested schemas and access them with dot notation:

```typescript
const extraSchema = z.object({
  notes: z.string().optional(),
  requestedAt: z.string().datetime().optional(),
})

const mainSchema = z.object({
  id: z.number(),
  name: z.string(),
  extra: extraSchema.optional(),
})
```

Use dot notation in `column-labels` and `extraColumnOptions`:

```vue
<ZodTable
  :row-model="mainSchema"
  :column-labels="{
    'extra.requestedAt': 'Request Date',
    'extra.notes': 'Additional Notes',
  }"
  :extraColumnOptions="{
    'extra.requestedAt': {
      colEditType: 'date',
      clearable: true,
    },
  }"
/>
```

#### Foreign Key Support

Create dropdowns with complex objects:

```vue
<ZodTable
  :row-model="schema"
  :extraColumnOptions="{
    officeId: {
      colEditType: 'foreign-key',
      options: [
        { id: 'A', label: 'Main Office', address: 'Street 1' },
        { id: 'B', label: 'Branch Office', address: 'Street 2' },
      ],
      optionLabel: 'label',
      optionValue: 'id',
      clearable: true,
    },
  }"
/>
```

The table will display the `label` but store the `id` value.

**Note:** When editing is disabled, enum and foreign-key columns automatically render as plain text labels instead of select dropdowns to reduce visual clutter.

#### Header Templates

You can override a specific header cell using a dynamic slot named `header-cell-[columnKey]`. The slot receives `col`, `pagination`, and standard header props for full customization.

```vue
<ZodTable :row-model="schema" :data="rows">
  <template #header-cell-name="{ col, pagination }">
    <div class="row items-center q-gutter-xs">
      <q-icon name="badge" size="16px" />
      <span>{{ col.label }}</span>
      <q-icon
        v-if="pagination.sortBy === col.name"
        :name="pagination.descending ? 'south' : 'north'"
        size="12px"
      />
    </div>
  </template>
</ZodTable>
```

This follows the same dynamic naming style as `body-cell-[columnKey]`. Access `pagination.sortBy` and `pagination.descending` to show sort state indicators.

#### Controlling Column Visibility

Use `show-columns` and `hide-columns` to manage which columns appear in the table. This is particularly useful to prevent unwanted new schema properties from automatically appearing when your Zod schema evolves.

**Show specific columns only:**

```vue
<ZodTable :row-model="schema" :data="rows" :show-columns="['id', 'name', 'email']" />
```

**Hide specific columns:**

```vue
<ZodTable :row-model="schema" :data="rows" :hide-columns="['internalId', 'createdAt']" />
```

**Combine for precise control:**

```vue
<ZodTable
  :row-model="schema"
  :data="rows"
  :show-columns="['id', 'name', 'email', 'role', 'department']"
  :hide-columns="['department']"
/>
```

In the combined example, `show-columns` defines the base set (`id`, `name`, `email`, `role`, `department`), then `hide-columns` removes `department`, resulting in only `id`, `name`, `email`, and `role` being displayed.

## Props

| Prop                      | Type                 | Description                                                                                                                                                                                                                                                                                                                                                                   |
| ------------------------- | -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `row-model`               | `ZodObject`          | The Zod schema defining the table structure.                                                                                                                                                                                                                                                                                                                                  |
| `data`                    | `Array`              | The data rows to display.                                                                                                                                                                                                                                                                                                                                                     |
| `row-key`                 | `String`             | Property name to use as a unique key for rows (required).                                                                                                                                                                                                                                                                                                                     |
| `update-row`              | `Function \| Object` | Inline update action. Accepts either a simple handler `(row) => void \| Promise<void>` or an action object with optional `label`, `icon`, `visible`, `disabled`, `color`, and `handler(event, row) => void \| Promise<void>`.                                                                                                                                                 |
| `add-row`                 | `Function`           | Callback for adding rows.                                                                                                                                                                                                                                                                                                                                                     |
| `clone-row`               | `Function \| Object` | Clone action. Accepts either a simple handler `(row) => void \| Promise<void>` or an action object with optional `label`, `icon`, `visible`, `disabled`, `color`, and `handler(event, row) => void \| Promise<void>`.                                                                                                                                                         |
| `delete-row`              | `Function \| Object` | Delete action. Accepts either a simple handler `(row) => void \| Promise<void>` or an action object with optional `label`, `icon`, `visible`, `disabled`, `color`, optional `confirm` (`boolean` or `(row) => boolean`), and `handler(event, row) => void \| Promise<void>`.                                                                                                  |
| `editable`                | `Boolean`            | Enables editing mode. Can be used as `v-model:editable` for two-way binding.                                                                                                                                                                                                                                                                                                  |
| `editable-columns`        | `Array`              | List of keys (or `['*']`) that are editable.                                                                                                                                                                                                                                                                                                                                  |
| `show-columns`            | `Array`              | List of column keys to display. If specified, only these columns are shown. Use together with `hide-columns` to fine-tune visibility—`show-columns` defines the base set, then `hide-columns` removes columns from it.                                                                                                                                                        |
| `hide-columns`            | `Array`              | List of column keys to hide. Applied after `show-columns` filtering.                                                                                                                                                                                                                                                                                                          |
| `togglable-columns`       | `Array`              | List of keys (or `['*']`) that users can toggle on or off.                                                                                                                                                                                                                                                                                                                    |
| `column-order`            | `Array`              | Optional ordered list of column keys. Visible columns listed here appear first; any remaining visible columns are appended afterward.                                                                                                                                                                                                                                         |
| `default-toggled-columns` | `Array`              | Initial visible set for togglable columns. Accepts column keys or `['*']`. Non-togglable columns remain visible.                                                                                                                                                                                                                                                              |
| `column-labels`           | `Object`             | Map of column keys to custom labels. Supports nested properties using dot notation (for example, `'extra.field': 'Label'`).                                                                                                                                                                                                                                                   |
| `header-class`            | `String`             | CSS class applied to table headers.                                                                                                                                                                                                                                                                                                                                           |
| `header-style`            | `String`             | Inline styles applied to table headers.                                                                                                                                                                                                                                                                                                                                       |
| `show-editable-toggle`    | `Boolean`            | Shows or hides the editable toggle in the table footer (default: `false`).                                                                                                                                                                                                                                                                                                    |
| `extraColumnOptions`      | `Object`             | Per-column settings including optional `colEditType`, `sortable`, `options`, `optionLabel`, `optionValue`, `clearable`, `noVerticalPadding`, and `noHorizontalPadding`. |
| `actions`                 | `Array`              | Enables built-in action buttons: `['add', 'clone', 'delete', 'goto']`.                                                                                                                                                                                                                                                                                                        |
| `hide-bottom`             | `Boolean`            | Hides QTable's bottom area, including its empty-data message (default: `false`). |
| `row-action-size`         | `String`             | Quasar button size for goto, clone, and delete actions (default: `sm`). |
| `row-action-dense`        | `Boolean`            | Dense goto, clone, and delete buttons (default: `true`). |
| `goto-row`                | `Array \| Function`  | Either an array of goto actions with `key` and optional `icon`, `label`, `href`, `target`, `rel`, `visible`, `disabled`, and `color`, or a single handler function. Handler signature: `(event, row) => void \| Promise<void>`.                                                                                                                                               |
| `pagination`              | `Object`             | Pagination model (`page`, `rowsPerPage`, `sortBy`, `descending`). Use with `v-model:pagination` to control table state from the parent.                                                                                                                                                                                                                                       |
| `i18n`                    | `Object`             | Partial per-table label overrides, including `noData` and `noResults`; merged with global and default labels. See Internationalization below. |

### Goto Actions (Event-First)

Goto handlers are event-first so you can inspect click modifiers like Ctrl/Cmd/Shift or middle-click:

```ts
type GotoAction<Row> = {
  key: string
  label?: string | ((row: Row) => string)
  icon?: string | ((row: Row) => string)
  href?: string | ((row: Row) => string)
  target?: string | ((row: Row) => string)
  rel?: string | ((row: Row) => string)
  visible?: boolean | ((row: Row) => boolean)
  disabled?: boolean | ((row: Row) => boolean)
  color?: string | ((row: Row) => string)
  handler: (event: Event, row: Row) => void | Promise<void>
}
```

When `href` is provided, the goto action button is rendered as a link-capable Quasar button while still executing `handler` on click.

### Row Actions

Clone, update, and delete actions can be passed either as a simple synchronous/asynchronous function or as a row-aware action object. `delete-row` also accepts `confirm` on the object form.

```ts
type RowAction<Row> = {
  label?: string | ((row: Row) => string)
  icon?: string | ((row: Row) => string)
  visible?: boolean | ((row: Row) => boolean)
  disabled?: boolean | ((row: Row) => boolean)
  color?: string | ((row: Row) => string)
  handler: (event: Event, row: Row) => void | Promise<void>
}

type DeleteRowActionConfig<Row> = RowAction<Row> & {
  confirm?: boolean | ((row: Row) => boolean)
}

type RowActionHandler<Row> = (row: Row) => void | Promise<void>
```

### Column Cell Padding

For custom column templates, you can remove top/bottom table-cell padding per column via `extraColumnOptions`:

```vue
<ZodTable
  :row-model="schema"
  :extraColumnOptions="{
    'extra.description': {
      noVerticalPadding: true,
      noHorizontalPadding: true,
    },
  }"
/>
```

Example:

```ts
const gotoDetails = (event: Event, row: User) => {
  const url = `/users/${row.id}`

  // Open in a new tab on Ctrl/Cmd click or middle click
  if ((event as MouseEvent).ctrlKey || (event as MouseEvent).metaKey || (event as MouseEvent).button === 1) {
    window.open(url, '_blank', 'noopener,noreferrer')
    return
  }

  // Open in a new window on Shift click
  if ((event as MouseEvent).shiftKey) {
    window.open(url, '_blank', 'popup')
    return
  }

  // Default navigation
  // router.push(url)
}
```

## V-Model

- `v-model:editable` - Two-way binding for the editable state. When the user toggles the editable mode in the table footer (if `show-editable-toggle` is enabled), this binding will update.

## Events

| Event                      | Payload                         | Description                                                                                                                                                                              |
| -------------------------- | ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `row-click`                | `(event: MouseEvent, row: Row)` | Emitted when a row is clicked or activated with Enter. Keyboard activation emits a synthetic mouse click. |
| `request`                  | `({ pagination, filter })`      | Emitted for server-side pagination, sorting, or filter requests. |
| `update-togglable-columns` | `ColumnKey[]`                   | Emitted when the user toggles column visibility. Payload is an array of currently visible column keys. Use this to store column preferences in localStorage or other persistent storage. |

### Persisting Table State

Install one prefix plugin per app. The prefix separates apps that share an
origin or run as microfrontends. The Quasar extension still registers
`ZodTable`; add the prefix plugin in a boot file:

```typescript
import { boot } from 'quasar/wrappers'
import { createPersistedStatePlugin } from '@radon-be/quasar-app-extension-zod-table'

export default boot(({ app }) => {
  app.use(createPersistedStatePlugin({ prefix: 'materials-app' }))
})
```

In a plain Vue/Vite app, install the same plugin in `main.ts` before mounting:

```typescript
import registerZodTable from '@radon-be/quasar-app-extension-zod-table/dist/boot/register.js'
import { createPersistedStatePlugin } from '@radon-be/quasar-app-extension-zod-table'

registerZodTable({ app })
app.use(createPersistedStatePlugin({ prefix: 'materials-app' }))
```

Then use `useZodTableState` in the component that owns the table. Pass the same
row schema you give `ZodTable`: the composable derives the valid column keys
from it, so saved choices for columns that were removed from the schema are
discarded, while choices for any existing column are kept. `togglableColumns`
optionally narrows which columns the user may show or hide (default: all
schema columns):

```vue
<template>
  <ZodTable
    :row-model="schema"
    :data="rows"
    :togglable-columns="togglableColumns"
    v-bind="tableState.bindings"
  />
</template>

<script setup lang="ts">
import { useZodTableState, type ColumnKeyType } from '@radon-be/quasar-app-extension-zod-table'

const togglableColumns = ['name', 'status', 'remarks'] satisfies ColumnKeyType<typeof schema.shape>[]
const tableState = useZodTableState(
  'materials',
  schema,
  {
    columns: ['name', 'status'],
    pageSize: 25,
    sortBy: 'name',
    descending: false,
  },
  { togglableColumns },
)
</script>
```

The composable supplies a `pagination` ref for `v-model:pagination`, current
`visibleColumns`, change handlers, `bindings`, `reset()`, `status`, and
`persistenceFailed`. Page number and `rowsNumber` are never saved, so the
pagination ref can also be passed directly to server-side paging code.
Use `bindings` as shown, or wire `:pagination`, `:default-toggled-columns`,
`@update:pagination="onUpdatePagination"` and
`@update-togglable-columns="onUpdateTogglableColumns"` explicitly. A bare
`v-model:pagination` does not call the persistence handler.

This replaces a table-specific `useTableHandlers` and its settings-store table
entry; install the prefix plugin once per app and use a distinct key per table.
Existing app settings are not automatically migrated.

Only user changes relative to the defaults are stored: shown/hidden column
deltas and changed page size or sort settings. Current defaults are applied
again on every load, so a newly added default column reaches users unless they
made a different choice. Bump the table's `revision` option to intentionally
discard one table's saved choices after a layout change:

```typescript
const tableState = useZodTableState(
  'materials',
  schema,
  { columns: ['name', 'status'], pageSize: 25, sortBy: 'name', descending: false },
  { revision: 2 },
)
```

The default revision is `1`.

### Generic Persisted-State Helper

The exported `usePersistedState` helper can persist any Zod-validated value.
It uses the app prefix installed above and stores entries as
`<prefix>:<namespace>:<key>`:

```typescript
import { z } from 'zod'
import { usePersistedState } from '@radon-be/quasar-app-extension-zod-table'

const preferences = usePersistedState({
  namespace: 'filters',
  key: 'materials',
  schema: z.object({ status: z.string().optional() }),
  version: 1,
  defaults: { status: 'active' },
})
```

The stored envelope contains `v` (the storage-format version), `updatedAt`,
and `data`. Provide a step-by-step `migrate` map when changing the stored
shape. Invalid, newer, or unmigratable values return to defaults, with a
`status` of `reset`; missing, valid, migrated, and unavailable storage are
reported as `missing`, `valid`, `migrated`, and `unavailable`. `reset()`
clears the key. If browser storage is blocked or full, state remains usable in
memory and `persistenceFailed` becomes true.

The helper requires an app prefix and throws if used without one; this avoids
silent collisions between microfrontends. Prefixes, namespaces, and keys
must be non-empty and cannot contain `:`. `clearPersistedState()` clears
entries for the current app, or `clearPersistedState('filters')` clears one
namespace. `prunePersistedState({ olderThanDays: 90 })` removes only structurally
valid envelopes owned by that app. Pruning can also be enabled once at plugin
installation with `createPersistedStatePlugin({ prefix, prune: { olderThanDays: 90 } })`.

The helper's `v` changes only when the persisted data shape changes. The
table composable's `revision` is separate: it resets user layout choices for
one table without changing the storage format.

## Internationalization (i18n)

The ZodTable component includes default labels and messages in English. You can customize labels globally for your entire app or per-component using the `i18n` prop.

### Global i18n Setup (Recommended)

For the best experience, set up i18n globally so all `ZodTable` instances use the same language without passing props:

**Create a boot file** `src/boot/zodTable-i18n.ts`:

```typescript
import { boot } from 'quasar/wrappers'
import { ref } from 'vue'
import { provideZodTableI18n, type I18nLabels } from '@radon-be/quasar-app-extension-zod-table'

export const i18nLabels = ref<Partial<I18nLabels>>({
  addButton: 'Add',
  deleteButtonTitle: 'Delete',
  // ... other overrides
})

export default boot(({ app }) => {
  provideZodTableI18n(i18nLabels, app)
})
```

**Register the boot file** in `quasar.config.ts`:

```typescript
boot: ['zodTable-i18n']
```

Now all `ZodTable` instances in your app will use these labels without needing to pass the `i18n` prop.

### Per-Component i18n Override

You can still override labels on individual components:

```vue
<ZodTable :row-model="schema" :data="rows" :i18n="{ addButton: 'Create' }" />
```

Prop overrides take precedence over global settings.

### Dynamic Language Switching

Change language at runtime by updating the exported ref:

```typescript
// In a language switcher component
import { i18nLabels } from 'boot/zodTable-i18n'

function switchToDutch() {
  i18nLabels.value = { addButton: 'Toevoegen', columnsLabel: 'Kolommen' /* ... */ }
}
```

### Plain Vite/Vue Apps

For apps without a Quasar CLI boot file, use `createZodTableI18nPlugin()` in `main.ts`:

```typescript
import { ref } from 'vue'
import { createZodTableI18nPlugin } from '@radon-be/quasar-app-extension-zod-table'

app.use(
  createZodTableI18nPlugin(
    ref({
      addButton: 'Add',
      deleteButtonTitle: 'Delete',
      // ... other overrides
    }),
  ),
)
```

### Per-Component i18n

Alternatively, if you don't use global setup, pass `i18n` to individual components:

```vue
<template>
  <ZodTable
    :row-model="schema"
    :data="rows"
    :i18n="{
      addButton: 'Add',
      noData: 'No records yet',
      columnsLabel: 'Columns',
      rowsPerPageLabel: 'Rows per page',
    }"
  />
</template>
```

### Available i18n Labels

The following labels can be customized:

| Key                    | Default Value                               | Description                                        |
| ---------------------- | ------------------------------------------- | -------------------------------------------------- |
| `noData`               | 'No data available'                         | Message shown when table has no data               |
| `noResults`            | 'No results found'                          | Message shown when no results match filter         |
| `addButton`            | 'Add'                                       | Add row button label                               |
| `columnsLabel`         | 'Columns'                                   | Column selector label                              |
| `rowsPerPageLabel`     | 'Rows per page'                             | Rows per page selector label                       |
| `paginationSeparator`  | 'of'                                        | Separator in pagination text (e.g., "1-10 of 100") |
| `editableToggle`       | 'Editable'                                  | Editable mode toggle title                         |
| `cloneButtonTitle`     | 'Clone'                                     | Clone row button title                             |
| `deleteButtonTitle`    | 'Delete'                                    | Delete row button title                            |
| `gotoButtonTitle`      | 'Go to details'                             | Fallback label for goto actions without a label    |
| `datePickerNow`        | 'Now'                                       | Date picker "set to now" button                    |
| `datePickerClear`      | 'Clear'                                     | Date picker clear button                           |
| `datePickerClose`      | 'Close'                                     | Date picker close button                           |
| `deleteConfirmTitle`   | 'Confirm Delete'                            | Delete confirmation dialog title                   |
| `deleteConfirmMessage` | 'Are you sure you want to delete this row?' | Delete confirmation message                        |

### Dutch Example

```typescript
// src/boot/zodTable-i18n.ts
import { ref } from 'vue'
import { provideZodTableI18n } from '@radon-be/quasar-app-extension-zod-table'

const i18nLabels = ref({
  noData: 'Geen data beschikbaar',
  noResults: 'Geen resultaten gevonden',
  addButton: 'Toevoegen',
  columnsLabel: 'Kolommen',
  rowsPerPageLabel: 'Rijen per pagina',
  paginationSeparator: 'van',
  editableToggle: 'Editable',
  cloneButtonTitle: 'Klonen',
  deleteButtonTitle: 'Verwijderen',
  datePickerNow: 'Nu',
  datePickerClear: 'Wissen',
  datePickerClose: 'Sluiten',
  deleteConfirmTitle: 'Verwijdering bevestigen',
  deleteConfirmMessage: 'Weet je zeker dat je deze rij wilt verwijderen?',
})

export default boot(({ app }) => {
  provideZodTableI18n(i18nLabels, app)
})
```

### Spanish Example

```typescript
const i18nLabels = ref({
  noData: 'Sin datos disponibles',
  noResults: 'No hay resultados',
  addButton: 'Añadir',
  columnsLabel: 'Columnas',
  rowsPerPageLabel: 'Filas por página',
  paginationSeparator: 'de',
  editableToggle: 'Editable',
  cloneButtonTitle: 'Clonar',
  deleteButtonTitle: 'Eliminar',
  datePickerNow: 'Ahora',
  datePickerClear: 'Limpiar',
  datePickerClose: 'Cerrar',
  deleteConfirmTitle: 'Confirmar eliminación',
  deleteConfirmMessage: '¿Estás seguro de que deseas eliminar esta fila?',
})
```

## License

MIT
