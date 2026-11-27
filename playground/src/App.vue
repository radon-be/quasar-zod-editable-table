<template>
  <div class="q-pa-md">
    <div class="row justify-end q-mb-sm">
      <q-btn flat dense icon="cloud_sync" label="Server-side demo" href="/server" />
    </div>
    <ZodTable
      row-key="id"
      :row-model="rowModel"
      :data="tableRows"
      :pagination="pagination"
      :default-toggled-columns="visibleColumns"
      :i18n
      flat
      bordered
      header-class="text-h6 bg-blue text-white"
      header-style="font-size: 1rem;"
      editable
      show-editable-toggle
      :togglable-columns="togglableColumns"
      :editable-columns="['*']"
      :hide-columns="['id']"
      :column-labels="{
        requestCounter: 'Teller',
        firstName: 'Voornaam',
        name: 'Familienaam',
        address: 'Adres',
        docType: 'Soort',
        firstSeenAt: 'First seen at',
        'extra.requestedAt': 'Requested at',
        'extra.requestedTime': 'Requested time',
      }"
      :column-order="['extra.description']"
      :extraColumnOptions="{
        office: {
          colEditType: 'foreign-key',
          options: [
            { id: 'A', label: 'De Watermolen', address: 'Geneeskundestraat 13, 1000 Brussel' },
            { id: 'B', label: 'Het Botte Mes', address: 'Slachthuisstraat 12, 8500 Kortrijk' },
            { id: 'C', label: 'De Chirugrijn', address: 'Ziekenhuisweg 36, 8560 Marke' },
            { id: 'D', label: 'Het Labo', address: 'Pres. Kennedypark 2, 8500 Kortrijk' },
            { id: 'E', label: 'Bij De Beste Dokter', address: 'Dokterstraat 1, 9000 Gent' },
          ],
          optionLabel: 'label',
          optionValue: 'id',
        },
        hospital: {
          colEditType: 'foreign-key',
          options: [
            { id: 1, label: 'AZ Groeninge Kortrijk' },
            { id: 2, label: 'UZ Gent' },
          ],
          optionLabel: 'label',
          optionValue: 'id',
          clearable: true,
        },
        ['extra.requestedAt']: {
          colEditType: 'datetime',
          clearable: true,
        },
        ['extra.requestedTime']: {
          colEditType: 'time',
          clearable: true,
        },
      }"
      :update-row="handleRowUpdate"
      :add-row="addRow"
      :delete-row="{
        handler: async (_event: Event, row: HealthcareProvider) => {
          await deleteRow(row)
        },
        visible: (row: HealthcareProvider) => row.requestCounter > 100,
        confirm: (row: HealthcareProvider) => row.requestCounter > 150,
      }"
      :clone-row="handleCloneRow"
      :goto-row="[
        {
          key: 'details',
          icon: 'details',
          label: 'details',
          href: 'https://quasar.dev',
          target: '_blank',
          rel: 'noopener noreferrer',
          handler: gotoRowDetails,
          visible: (row: HealthcareProvider) => row.requestCounter > 100,
        },
        {
          key: 'measurements',
          icon: 'science',
          label: 'measurements',
          handler: gotoRowMeasurements,
          disabled: true,
        },
      ]"
      @update:pagination="onUpdatePagination"
      :actions="['add', 'clone', 'delete', 'goto']"
      @update-togglable-columns="onUpdateTogglableColumns"
      @row-click.stop="(event: Event, row: HealthcareProvider) => handleRowClick(event, row)"
    >
        <template v-slot:['header-cell-extra.description']="{ pagination }">
          <q-icon name="sort" size="xs" :class="['q-mr-xs', { 'flip-y': pagination.descending }]"  />
        </template>

        <template v-slot:['body-cell-extra.description']="{ row }">
          <div class="text-wrap" style="max-width: 200px;">
            {{ row.extra?.description }}
            <q-popup-edit
              :model-value="row.extra?.description"
              auto-save
              v-slot="scope"
              @save="(newValue) => (row.extra.description = newValue, updateRow(row))"
            >
              <q-input v-model="scope.value" dense autogrow />
            </q-popup-edit>
          </div>
        </template>

  </ZodTable>
  </div>
  <div class="q-pa-md">
    <label v-for="props in Object.entries(flattenedSchema).filter(([key]) => key !== 'id')" :key="props[0]" class="q-mr-md">
      <q-checkbox v-model="togglableColumns" :val="props[0]" :label="props[0]" size="xs" />
    </label>
  </div>
</template>

<script setup lang="ts">
import { ref, shallowRef, watch } from 'vue'
import { flattenSchema } from '../../src/component/nest-utils'
import type { ColumnKeyType } from '../../src/component/table-types'
import { useZodTableState } from '../../src/composables/useZodTableState'
import ZodTable from '../../src/component/ZodTable.vue'
import { HealthcareProvider, HealthcareProviderSchema } from './healthcare-provider.schema'
import { useTableExampleStore } from './stores/healthcareProviderStore'

const store = useTableExampleStore()
const rowModel = shallowRef(HealthcareProviderSchema)
const tableRows = store.data
const flattenedSchema = flattenSchema(HealthcareProviderSchema)
const { addRow, deleteRow, updateRow } = store
const columnKeys = [
  'id',
  'firstName',
  'name',
  'address',
  'docType',
  'office',
  'hospital',
  'requestCounter',
  'active',
  'firstSeenAt',
  'extra.requestedAt',
  'extra.requestedTime',
  'extra.extraType',
  'extra.description',
] satisfies ColumnKeyType<HealthcareProvider>[]
const allTogglableColumns = columnKeys.filter((column) => column !== 'id')
const togglableColumns = ref<ColumnKeyType<HealthcareProvider>[]>(['hospital', 'office', 'extra.requestedTime'])
const tableState = useZodTableState<HealthcareProvider>(
  'healthcare-providers',
  {
    columns: ['hospital'],
    pageSize: 10,
    sortBy: 'name',
    descending: true,
  },
  {
    columnKeys,
    togglableColumns: allTogglableColumns,
  },
)
const { pagination, visibleColumns, onUpdatePagination, onUpdateTogglableColumns } = tableState

const gotoRowDetails = async (event: Event, row: HealthcareProvider) => {
  console.log('gotoRowDetails event', event, row)
}

const gotoRowMeasurements = async (event: Event, row: HealthcareProvider) => {
  console.log('gotoRowMeasurements event', event, row)
}

const handleRowClick = (event: Event, row: HealthcareProvider) => {
  console.log('Row clicked', event, row)
}

const handleRowUpdate = (row: HealthcareProvider) => {
  console.log('Row updated', row)
  store.updateRow(row)
  return
}

const handleCloneRow = (row: HealthcareProvider) => {
  console.log('Cloning row', row)
  store.cloneRow(row)
}

const i18n = {
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
}

watch(
  pagination,
  (newData) => {
    console.log('Pagination changed', newData)
  },
)
</script>

<style scoped>
.flip-y {
  transform: scaleY(-1);
}
</style>