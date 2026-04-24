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

### Requirements

- **Quasar Dialog Plugin**: Required for delete row confirmation dialogs. Make sure the Dialog plugin is installed in your Quasar config (`quasar.config.ts`).

## Features

- Strongly typed
- **Schema Driven**: Columns are generated automatically from Zod object definition.
- **Validation**: Input cells validate against the Zod schema.
- **Quasar Integration**: Built on top of `q-table` and `q-input`.
- Global `editable` and per-column `editable-columns` props to enable/disable editing
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
import { type ZodTable as ZodTableComponent } from '@radon-be/quasar-app-extension-zod-table';

declare module '@vue/runtime-core' {
  export interface GlobalComponents {
    ZodTable: typeof ZodTableComponent;
  }
}

export {};
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

function handleUpdate(updatedRow: User) {
  // Find the row by key (id) and update it
  const index = rows.value.findIndex((r) => r.id === updatedRow.id)
  if (index !== -1) {
    rows.value[index] = updatedRow
  }
}
</script>
```

### Advanced Features

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

## Props

| Prop                  | Type        | Description                                                                                                                                                                 |
| --------------------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `row-model`           | `ZodObject` | The Zod schema defining the table structure.                                                                                                                                |
| `data`                | `Array`     | The data rows to display.                                                                                                                                                   |
| `row-key`             | `String`    | Property name to use as a unique key for rows (required).                                                                                                                   |
| `update-row`          | `Function`  | Callback for row updates `(row) => void`.                                                                                                                                   |
| `add-row`             | `Function`  | Callback for adding rows.                                                                                                                                                   |
| `delete-row`          | `Function`  | Callback for deleting rows.                                                                                                                                                 |
| `editable`            | `Boolean`   | Enable editing mode. Can be used as `v-model:editable` for two-way binding.                                                                                                  |
| `editable-columns`    | `Array`     | List of keys (or `['*']`) that are editable.                                                                                                                                |
| `hide-columns`        | `Array`     | List of column keys to hide from display.                                                                                                                                   |
| `togglable-columns`   | `Array`     | List of keys (or `['*']`) that can be toggled on/off by the user.                                                                                                           |
| `column-order`        | `Array`     | Optional ordered list of column keys. Listed visible columns are placed first in this order; all other visible columns are appended after.                                   |
| `default-toggled-columns` | `Array` | Initial visible set for togglable columns. Accepts column keys or `['*']`. Non-togglable columns remain visible.                                                           |
| `column-labels`       | `Object`    | Map of column keys to custom labels. Supports nested properties with dot notation (e.g., `'extra.field': 'Label'`).                                                         |
| `header-class`        | `String`    | CSS class applied to table headers.                                                                                                                                        |
| `header-style`        | `String`    | Inline styles applied to table headers.                                                                                                                                    |
| `show-editable-toggle` | `Boolean`  | Show/hide the editable toggle in the table footer (default: `false`).                                                                                                        |
| `extraColumnOptions`  | `Object`    | Advanced column configuration. Set `colEditType` ('date', 'time', 'datetime', 'foreign-key'), `options`, `optionLabel`, `optionValue`, and `clearable` for specific columns. |
| `actions`             | `Array`     | Enable action buttons: `['add', 'clone', 'delete', 'goto']`.                                                                                                                |
| `goto-row`            | `Array` \\| `Function` | Array of goto actions with `key`, `icon`, `label`, and `handler` properties, or a single handler function. Handler signature is `(event, row) => void`.                    |
| `initial-rows-per-page` | `Number`  | Number of rows to display per page initially.                                                                                                                               || `i18n`                | `Object`    | Optional object with partial i18n label overrides. Merged with default Dutch labels. Keys: `noData`, `noResults`, `addButton`, `columnsLabel`, `rowsPerPageLabel`, `paginationSeparator`, `editableToggle`, `cloneButtonTitle`, `deleteButtonTitle`, `datePickerNow`, `datePickerClear`, `datePickerClose`, `deleteConfirmTitle`, `deleteConfirmMessage`. |
### Goto Actions (Event-First)

Goto handlers are event-first so you can inspect click modifiers like Ctrl/Cmd/Shift or middle-click:

```ts
type GotoAction<Row> = {
  key: string
  label?: string
  icon?: string
  handler: (event: MouseEvent | undefined, row: Row) => void
}
```

Example:

```ts
const gotoDetails = (event: MouseEvent | undefined, row: User) => {
  const url = `/users/${row.id}`

  // Open in a new tab on Ctrl/Cmd click or middle click
  if (event?.ctrlKey || event?.metaKey || event?.button === 1) {
    window.open(url, '_blank', 'noopener,noreferrer')
    return
  }

  // Open in a new window on Shift click
  if (event?.shiftKey) {
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

| Event                      | Payload       | Description                                                                                                             |
| -------------------------- | ------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `update-togglable-columns` | `ColumnKey[]` | Emitted when the user toggles column visibility. Payload is an array of currently visible column keys. Use this to store column preferences in localStorage or other persistent storage. |

### Persisting Column Visibility

You can persist column visibility preferences to localStorage:

```vue
<template>
  <ZodTable
    :row-model="schema"
    :data="rows"
    :togglable-columns="['*']"
    :default-toggled-columns="defaultColumns"
    v-model:editable="isEditing"
    :show-editable-toggle="true"
    @update-togglable-columns="handleColumnToggle"
  />
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'

const isEditing = ref(false)
const defaultColumns = ref<string[]>(['name', 'email'])

onMounted(() => {
  // Load saved column preferences from localStorage
  const saved = localStorage.getItem('tableColumns')
  if (saved) {
    defaultColumns.value = JSON.parse(saved)
  }
  
  // Load saved editable state
  const wasEditing = localStorage.getItem('tableEditable')
  if (wasEditing === 'true') {
    isEditing.value = true
  }
})

function handleColumnToggle(columns: string[]) {
  // Save column visibility to localStorage
  localStorage.setItem('tableColumns', JSON.stringify(columns))
}

// Watch editable state and save it
watch(() => isEditing.value, (val) => {
  localStorage.setItem('tableEditable', String(val))
})
</script>
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
boot: [
  'zodTable-i18n',
]
```

Now all `ZodTable` instances in your app will use these labels without needing to pass the `i18n` prop.

### Per-Component i18n Override

You can still override labels on individual components:

```vue
<ZodTable
  :row-model="schema"
  :data="rows"
  :i18n="{ addButton: 'Create' }"
/>
```

Prop overrides take precedence over global settings.

### Dynamic Language Switching

Change language at runtime by updating the exported ref:

```typescript
// In a language switcher component
import { i18nLabels } from 'boot/zodTable-i18n'

function switchToDutch() {
  i18nLabels.value = { addButton: 'Toevoegen', columnsLabel: 'Kolommen', /* ... */ }
}
```

### Plain Vite/Vue Apps

For apps without a Quasar CLI boot file, use `createZodTableI18nPlugin()` in `main.ts`:

```typescript
import { ref } from 'vue'
import { createZodTableI18nPlugin } from '@radon-be/quasar-app-extension-zod-table'

app.use(createZodTableI18nPlugin(ref({
  addButton: 'Add',
  deleteButtonTitle: 'Delete',
  // ... other overrides
})))
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
      columnsLabel: 'Columns',
      rowsPerPageLabel: 'Rows per page',
    }"
  />
</template>
```

### Available i18n Labels

The following labels can be customized:

| Key | Default Value | Description |
| --- | --- | --- |
| `noData` | 'No data available' | Message shown when table has no data |
| `noResults` | 'No results found' | Message shown when no results match filter |
| `addButton` | 'Add' | Add row button label |
| `columnsLabel` | 'Columns' | Column selector label |
| `rowsPerPageLabel` | 'Rows per page' | Rows per page selector label |
| `paginationSeparator` | 'of' | Separator in pagination text (e.g., "1-10 of 100") |
| `editableToggle` | 'Editable' | Editable mode toggle title |
| `cloneButtonTitle` | 'Clone' | Clone row button title |
| `deleteButtonTitle` | 'Delete' | Delete row button title |
| `datePickerNow` | 'Now' | Date picker "set to now" button |
| `datePickerClear` | 'Clear' | Date picker clear button |
| `datePickerClose` | 'Close' | Date picker close button |
| `deleteConfirmTitle` | 'Confirm Delete' | Delete confirmation dialog title |
| `deleteConfirmMessage` | 'Are you sure you want to delete this row?' | Delete confirmation message |

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
