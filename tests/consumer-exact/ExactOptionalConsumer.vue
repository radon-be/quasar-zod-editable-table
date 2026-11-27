<script setup lang="ts">
// Type-only check: an app with Quasar's strict TypeScript (exactOptionalPropertyTypes) binds the table state.
import { z } from 'zod'
import { ZodTable, useZodTableState } from '@radon-be/quasar-app-extension-zod-table'

const schema = z.object({ name: z.string(), status: z.string() })
const table = useZodTableState('materials', schema, { columns: ['name'], pageSize: 25, sortBy: 'name', descending: false })
const { pagination, onUpdatePagination } = table
</script>

<template>
  <ZodTable row-key="name" :row-model="schema" :data="[]" :pagination="pagination" @update:pagination="onUpdatePagination" />
  <ZodTable row-key="name" :row-model="schema" :data="[]" v-bind="table.bindings" />
</template>
