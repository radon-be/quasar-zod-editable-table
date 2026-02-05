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
    :schema="userSchema"
    :rows="rows"
    @update:rows="handleUpdate"
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

const rows = ref([
  { id: 1, name: 'Alice', email: 'alice@example.com', role: 'admin', age: 30 },
  { id: 2, name: 'Bob', email: 'bob@example.com', role: 'user', age: 25 }
]);

function handleUpdate(newRows) {
  rows.value = newRows;
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
| `schema` | `ZodObject` | The Zod schema defining the table structure. |
| `rows` | `Array` | The data rows to display. |
| `title` | `String` | Table title. |

## Events

- `@update:rows`: Emitted when data changes.

## License

MIT
