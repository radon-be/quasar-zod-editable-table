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
      :togglable-columns="['hospital', 'office', 'extra.requestedTime']"
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
      :delete-row="store.deleteRow"
      :goto-row="[
        {
          key: 'details',
          icon: 'details',
          label: 'details',
          href: 'https://quasar.dev',
          target: '_blank',
          rel: 'noopener noreferrer',
          handler: gotoRowDetails,
        },
        {
          key: 'measurements',
          icon: 'science',
          label: 'measurements',
          handler: gotoRowMeasurements,
        },
      ]"
      :initial-rows-per-page="10"
      :actions="['add', 'clone', 'delete', 'goto']"
      @update-togglable-columns="(cols) => console.log('update-togglable-columns changed', cols)"
      @row-click.stop="(event: MouseEvent, row: HealthcareProvider) => handleRowClick(event, row)"
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
</template>

<script setup lang="ts">
import ZodTable from '../../src/component/ZodTable.vue'
import { HealthcareProvider, HealthcareProviderSchema } from './healthcare-provider.schema'
import { useTableExampleStore } from './stores/healthcareProviderStore'

const store = useTableExampleStore()

const gotoRowDetails = (event: MouseEvent | undefined, row: HealthcareProvider) => {
  console.log('gotoRowDetails event', event, row)
}

const gotoRowMeasurements = (event: MouseEvent | undefined, row: HealthcareProvider) => {
  console.log('gotoRowMeasurements event', event, row)
}

const handleRowClick = (event: MouseEvent, row: HealthcareProvider) => {
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