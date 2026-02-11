<template>
  <div class="q-pa-md">
    <editable-table
      row-key="id"
      :row-model="HealthcareProviderSchema"
      :data="store.data"
      flat
      bordered
      header-class="text-h6 bg-blue text-white"
      header-style="font-size: 1rem;"
      :editable="true"
      :editable-columns="['*']"
      :hide-columns="['id']"
      :column-labels="{
        requestCounter: 'Teller',
        firstName: 'Voornaam',
        name: 'Familienaam',
        address: 'Adres',
        docType: 'Soort',
      }"
      :extraColumnOptions="colOpts"
      :update-row="store.updateRow"
      :add-row="store.addRow"
      :delete-row="store.deleteRow"
      :initial-rows-per-page="10"
      :actions="['add', 'clone', 'delete']"
    />
  </div>
</template>

<script setup lang="ts">
import { max } from 'radashi'
import EditableTable from '../../src/component/ZodTable.vue'
import { HealthcareProviderSchema } from './healthcare-provider.schema'
import { useTableExampleStore } from './stores/healthcareProviderStore'

const colOpts = {
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
}
const store = useTableExampleStore()
function nextRowId() {
  const maxId = max(store.data.map((row) => row.id)) ?? 0
  return maxId + 2
}
// test
</script>
