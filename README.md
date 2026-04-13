# Quasar App Extension Zod Table

An editable table component for Quasar that automatically generates columns and validation from a Zod v4 schema.

## Install

To install this Quasar App Extension, run:

```bash
quasar ext add @radon-be/zod-table
```

Or install via npm:

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
- Global `editable` an per-column `editable-columns` props to enable/disable editing
- `hide-columns` props to hide some columns from the dataset
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
- `string` props can be edited with a dropdown box by adding a `extraColumnOptions` option

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
| `column-labels`       | `Object`    | Map of column keys to custom labels. Supports nested properties with dot notation (e.g., `'extra.field': 'Label'`).                                                         |
| `header-class`        | `String`    | CSS class applied to table headers.                                                                                                                                        |
| `header-style`        | `String`    | Inline styles applied to table headers.                                                                                                                                    |
| `show-editable-toggle` | `Boolean`  | Show/hide the editable toggle in the table footer (default: `false`).                                                                                                        |
| `extraColumnOptions`  | `Object`    | Advanced column configuration. Set `colEditType` ('date', 'time', 'datetime', 'foreign-key'), `options`, `optionLabel`, `optionValue`, and `clearable` for specific columns. |
| `actions`             | `Array`     | Enable action buttons: `['add', 'clone', 'delete', 'goto']`.                                                                                                                |
| `goto-row`            | `Array` \\| `Function` | Array of goto actions with `key`, `icon`, `label`, and `handler` properties, or a single handler function.                                                                 |
| `initial-rows-per-page` | `Number`  | Number of rows to display per page initially.                                                                                                                               |

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
    v-model:editable="isEditing"
    :show-editable-toggle="true"
    @update-togglable-columns="handleColumnToggle"
  />
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'

const isEditing = ref(false)

onMounted(() => {
  // Load saved column preferences from localStorage
  const saved = localStorage.getItem('tableColumns')
  if (saved) {
    // You can apply saved columns here
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
```

## License

MIT
