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
        docType: 'Soort'
      }"
      :update-row="store.updateRow"
      :add-row="store.addRow"
      :delete-row="store.deleteRow"
      :initial-rows-per-page="10"
      :actions="['add', 'clone', 'delete']"
    />
  </div>
</template>

<script setup lang="ts">
  import EditableTable from '../../src/component/ZodTable.vue';
  import { HealthcareProviderSchema } from './healthcare-provider.schema';

  import { useTableExampleStore } from './stores/healthcareProviderStore';
  const store = useTableExampleStore();
</script>
