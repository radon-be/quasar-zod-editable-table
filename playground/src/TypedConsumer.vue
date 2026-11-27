<template>
  <ZodTable
    row-key="id"
    :row-model="schema"
    :data="rows"
    @request="onRequest"
    @row-click="(event, row) => onRowClick(event, row.id, row.name)"
  />
  <ZodTable
    row-key="id"
    :row-model="schema"
    :data="rows"
    :extra-column-options="{ name: { sortable: false } }"
    v-model:expanded="expanded"
    @row-click="(_, row) => row.name.toUpperCase()"
  >
    <template #body-cell-name="{ row, expanded: isExpanded, toggleExpand }">
      <button type="button" :aria-expanded="isExpanded" @click.stop="toggleExpand">{{ row.name }}</button>
    </template>
    <template #expand="{ row }">{{ row.name }}</template>
  </ZodTable>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { z } from 'zod'
import { ZodTable } from '@radon-be/quasar-app-extension-zod-table'

const schema = z.object({ id: z.number(), name: z.string() })
const rows: z.infer<typeof schema>[] = []
const expanded = ref<number[]>([])

function onRequest(request: { pagination: { page: number; rowsPerPage: number }; filter?: string | object }) {
  request.pagination.page.toFixed()
}

function onRowClick(event: MouseEvent, id: number, name: string) {
  event.preventDefault()
  id.toFixed()
  name.toUpperCase()
}
</script>
