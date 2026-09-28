<template>
  <div class="q-pa-md">
    <div class="row justify-end q-mb-sm">
      <q-btn flat dense icon="cloud_sync" label="Server-side demo" href="/server" />
    </div>
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
import type { HealthcareProvider } from 'src/types/healthcare-provider.schema';
import { HealthcareProviderSchema } from 'src/types/healthcare-provider.schema';

const store = useTableExampleStore();

const handleGoto = (event: Event, row: HealthcareProvider) => {
  console.log('handleGoto event', event, row);
};
</script>
