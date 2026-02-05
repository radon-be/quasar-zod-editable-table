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
import { ref } from 'vue';
import { z } from 'zod';

const userSchema = z.object({
  id: z.number().readonly(),
  name: z.string().min(1, 'Name is required'),
  email: z.string().email(),
  role: z.enum(['admin', 'user']),
  age: z.number().min(18).optional()
});

type User = z.infer<typeof userSchema>;

const rows = ref<User[]>([
  { id: 1, name: 'Alice', email: 'alice@example.com', role: 'admin', age: 30 },
  { id: 2, name: 'Bob', email: 'bob@example.com', role: 'user', age: 25 }
]);

function handleUpdate(updatedRow: User) {
  // Find the row by key (id) and update it
  const index = rows.value.findIndex(r => r.id === updatedRow.id);
  if (index !== -1) {
    rows.value[index] = updatedRow;
  }
}
</script>
```

## Features

- **Schema Driven**: Columns are generated automatically from Zod object definition.
- **Validation**: Input cells validate against the Zod schema.
- **Navigation**: Use Tab / Shift+Tab to navigate between cells efficiently.
- **Quasar Integration**: Built on top of `q-table` and `q-input`.

## Props

| Prop | Type | Description |
| --- | --- | --- |
| `row-model` | `ZodObject` | The Zod schema defining the table structure. |
| `data` | `Array` | The data rows to display. |
| `row-key` | `String` | Property name to use as a unique key for rows (required). |
| `update-row` | `Function` | Callback for row updates `(row) => void`. |
| `add-row` | `Function` | Callback for adding rows. |
| `delete-row` | `Function` | Callback for deleting rows. |
| `editable` | `Boolean` | Enable editing mode. |
| `editable-columns`| `Array` | List of keys (or `['*']`) that are editable. |

## License

MIT
