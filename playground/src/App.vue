<template>
  <div class="q-pa-md">
    <ZodTable
      row-key="id"
      :row-model="HealthcareProviderSchema"
      :data="store.data"
      :i18n
      flat
      bordered
      header-class="text-h6 bg-blue text-white"
      header-style="font-size: 1rem;"
      editable
      show-editable-toggle
      :togglable-columns="togglableColumns"
      :default-toggled-columns="['hospital']"
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
      :update-row="store.updateRow"
      :add-row="store.addRow"
      :delete-row="{
        handler: async (_, row) => {
          await store.deleteRow(row)          
        },
        visible: (row) => row.requestCounter > 100,
        confirm: (row) => row.requestCounter > 150,
      }"
      :clone-row="store.cloneRow"
      :goto-row="[
        {
          key: 'details',
          icon: 'details',
          label: 'details',
          href: 'https://quasar.dev',
          target: '_blank',
          rel: 'noopener noreferrer',
          handler: gotoRowDetails,
          visible: (row) => row.requestCounter > 100,
        },
        {
          key: 'measurements',
          icon: 'science',
          label: 'measurements',
          handler: gotoRowMeasurements,
          disabled: true,
        },
      ]"
      v-model:pagination="pagination"
      :actions="['add', 'clone', 'delete', 'goto']"
      @update-togglable-columns="(cols) => console.log('update-togglable-columns changed', cols)"
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
              @save="(newValue) => (row.extra.description = newValue, store.updateRow(row))"
            >
              <q-input v-model="scope.value" dense autogrow />
            </q-popup-edit>
          </div>
        </template>

  </ZodTable>
  </div>
  <div class="q-pa-md">
    <label v-for="props in Object.entries(flattenSchema(HealthcareProviderSchema)).filter(([key]) => key !== 'id')" :key="props[0]" class="q-mr-md">
      <q-checkbox v-model="togglableColumns" :val="props[0]" :label="props[0]" size="xs" />
    </label>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import ZodTable from '../../src/component/ZodTable.vue'
import { HealthcareProvider, HealthcareProviderSchema } from './healthcare-provider.schema'
import { useTableExampleStore } from './stores/healthcareProviderStore'
import { ColumnKeyType } from '../../src/component/table-types'
import { flattenSchema } from '../../src/component/nest-utils'

const store = useTableExampleStore()
const pagination = ref({
  page: 1,
  rowsPerPage: 10,
  sortBy: 'name',
  descending: true,
})

const togglableColumns = ref<ColumnKeyType<HealthcareProvider>[]>(['hospital', 'office', 'extra.requestedTime'])

const gotoRowDetails = async (event: Event, row: HealthcareProvider) => {
  console.log('gotoRowDetails event', event, row)
}

const gotoRowMeasurements = async (event: Event, row: HealthcareProvider) => {
  console.log('gotoRowMeasurements event', event, row)
}

const handleRowClick = (event: Event, row: HealthcareProvider) => {
  console.log('Row clicked', event, row)
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
</script>

<style scoped>
.flip-y {
  transform: scaleY(-1);
}
</style>