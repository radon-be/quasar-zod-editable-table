<template>
  <div class="q-pa-md">
    <ZodTable
      row-key="id"
      :row-model="HealthcareProviderSchema"
      :data="store.data"
      flat
      bordered
      header-class="text-h6 bg-blue text-white"
      header-style="font-size: 1rem;"
      editable
      show-editable-toggle
      :togglable-columns="['*']"
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
    />
  </div>
</template>

<script setup lang="ts">
import ZodTable from '../../src/component/ZodTable.vue'
import { HealthcareProvider, HealthcareProviderSchema } from './healthcare-provider.schema'
import { useTableExampleStore } from './stores/healthcareProviderStore'

const store = useTableExampleStore()

const gotoRowDetails = (row: HealthcareProvider) => {
  console.log('gotoRowDetails', row)
}

const gotoRowMeasurements = (row: HealthcareProvider) => {
  console.log('gotoRowMeasurements', row)
}
</script>
