<template>
  <div class="q-ma-md">
    <zod-table
      :data="store.data"      
      :row-model="HealthcareProviderSchema"
      :togglable-columns="['id', 'name']"
      :default-toggled-columns="['name']"
      :row-key="'id'"
      :actions="['goto']"
      :goto-row="{
        key: 'goto',        
        icon: 'details',
        handler: handleGoto,
        visible: (row) => row.requestCounter > 0,
        disabled: (row) => row.requestCounter > 50,
      }"
      />
  </div>
</template>

<script setup lang="ts">
import { useTableExampleStore } from 'src/stores/healthcareProviderStore';
import { HealthcareProvider, HealthcareProviderSchema } from 'src/types/healthcare-provider.schema';

const store = useTableExampleStore()

const handleGoto = async (event: Event, row: HealthcareProvider) => {
  console.log('handleGoto event', event, row)
}
</script>
