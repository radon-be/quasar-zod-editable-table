<template>
  <main class="q-pa-md">
    <div class="row items-center justify-between q-mb-md">
      <div>
        <div class="text-h5">Server-side table</div>
        <div class="text-caption text-grey-7">Pagination, sorting, and filtering against an in-memory mock API</div>
      </div>
      <q-btn flat dense icon="table_view" label="Client-side demo" href="/" />
    </div>

    <q-input
      v-model="filter"
      class="q-mb-md"
      outlined
      dense
      clearable
      debounce="300"
      label="Filter records"
      placeholder="Search name, department, or city"
    >
      <template #append>
        <q-icon name="search" />
      </template>
    </q-input>

    <ZodTable
      :row-model="ServerRowSchema"
      row-key="id"
      :data="rows"
      :filter="filter"
      :loading="loading"
      v-model:pagination="pagination"
      flat
      bordered
      @request="handleRequest"
    />
  </main>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { z } from 'zod'
import ZodTable from '../../src/component/ZodTable.vue'

const ServerRowSchema = z.object({
  id: z.number(),
  name: z.string(),
  department: z.string(),
  city: z.string(),
  appointments: z.number(),
})

type ServerRow = z.infer<typeof ServerRowSchema>
type ServerPagination = {
  page: number
  rowsPerPage: number
  sortBy?: string | null
  descending?: boolean
  rowsNumber?: number
}
type ServerRequest = {
  pagination: ServerPagination
  filter?: string | Record<string, unknown>
}

const firstNames = ['Avery', 'Blake', 'Casey', 'Drew', 'Emery', 'Finley', 'Gray', 'Harper']
const lastNames = ['Bennett', 'Chen', 'Diaz', 'Ellis', 'Foster', 'Gupta', 'Hayes', 'Ibrahim', 'Jones']
const departments = ['Cardiology', 'Dermatology', 'Emergency', 'Neurology', 'Oncology', 'Pediatrics']
const cities = ['Brussels', 'Ghent', 'Leuven', 'Liège', 'Namur', 'Antwerp']

const mockDatabase: ServerRow[] = Array.from({ length: 127 }, (_, index) =>
  ServerRowSchema.parse({
    id: index + 1,
    name: `${firstNames[index % firstNames.length]} ${lastNames[(index * 5) % lastNames.length]}`,
    department: departments[(index * 3) % departments.length],
    city: cities[(index * 7) % cities.length],
    appointments: ((index * 17) % 240) + 1,
  }),
)

const rows = ref<ServerRow[]>([])
const filter = ref('')
const loading = ref(false)
const pagination = ref<ServerPagination>({
  page: 1,
  rowsPerPage: 10,
  sortBy: 'name',
  descending: false,
  rowsNumber: mockDatabase.length,
})

let latestRequest = 0

async function handleRequest(request: ServerRequest) {
  const requestId = ++latestRequest
  const { page, rowsPerPage, sortBy, descending } = request.pagination
  const searchTerm = String(request.filter ?? '')
    .trim()
    .toLocaleLowerCase()
  loading.value = true

  await new Promise((resolve) => setTimeout(resolve, 250))
  if (requestId !== latestRequest) return

  let result = mockDatabase.filter((row) =>
    [row.name, row.department, row.city].some((value) => value.toLocaleLowerCase().includes(searchTerm)),
  )

  if (sortBy && sortBy in (result[0] ?? {})) {
    const key = sortBy as keyof ServerRow
    const direction = descending ? -1 : 1
    result = [...result].sort((left, right) => {
      const leftValue = left[key]
      const rightValue = right[key]
      const comparison =
        typeof leftValue === 'number' && typeof rightValue === 'number'
          ? leftValue - rightValue
          : String(leftValue).localeCompare(String(rightValue))
      return comparison * direction
    })
  }

  const totalRows = result.length
  const start = rowsPerPage === 0 ? 0 : (page - 1) * rowsPerPage
  const end = rowsPerPage === 0 ? totalRows : start + rowsPerPage
  rows.value = result.slice(start, end)
  pagination.value = { ...request.pagination, rowsNumber: totalRows }
  loading.value = false
}

onMounted(() => {
  void handleRequest({ pagination: pagination.value, filter: filter.value })
})
</script>
