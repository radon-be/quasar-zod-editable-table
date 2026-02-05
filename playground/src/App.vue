<template>
  <div class="q-pa-md"></div>
</template>

<script setup lang="ts">
  import { ref } from 'vue';
  import z from 'zod';

  const userSchema = z.object({
    id: z.number(),
    name: z.string(),
    age: z.number(),
    role: z.enum(['admin', 'user', 'guest']),
    isActive: z.boolean()
  });

  type User = z.infer<typeof userSchema>;

  const users = ref<User[]>([
    { id: 1, name: 'Alice', age: 30, role: 'admin', isActive: true },
    { id: 2, name: 'Bob', age: 25, role: 'user', isActive: false }
  ]);

  const addRow = (row?: User) => {
    const newId = Math.max(...users.value.map((u) => u.id), 0) + 1;
    const newUser: User = row
      ? { ...row, id: newId }
      : {
          id: newId,
          name: 'New User',
          age: 18,
          role: 'user',
          isActive: true
        };
    users.value.push(newUser);
  };

  const updateRow = (row: User) => {
    const index = users.value.findIndex((u) => u.id === row.id);
    if (index !== -1) {
      users.value[index] = row;
    }
  };

  const deleteRow = (row: User) => {
    users.value = users.value.filter((u) => u.id !== row.id);
  };
</script>
