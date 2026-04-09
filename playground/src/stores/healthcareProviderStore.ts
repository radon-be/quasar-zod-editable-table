import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  createHealthcareProvider,
  type HealthcareProvider,
  HealthcareProviderSchema,
} from '../healthcare-provider.schema'
import z from 'zod'
import dataJson from './data.json'

export const useTableExampleStore = defineStore('tableExample', () => {
  const ProvidersSchema = z.array(HealthcareProviderSchema)
  const dataParsed = ProvidersSchema.parse(dataJson)
  const data = ref<HealthcareProvider[]>(dataParsed)

  function updateRow(updatedRow: HealthcareProvider) {
    console.log('Updating row:', updatedRow.id, '=>', updatedRow)
    const index = data.value.findIndex((r) => r.id === updatedRow.id)
    if (index !== -1) {
      data.value[index] = { ...updatedRow }
    }
  }

  function addRow(templateRow?: HealthcareProvider): HealthcareProvider {
    const newDoc = templateRow ? { ...templateRow } : createHealthcareProvider()
    const id = Math.max(...data.value.map((d) => d.id)) + 1
    newDoc.id = id
    data.value.push(newDoc)
    console.log('Added new row:', newDoc)
    return newDoc
  }

  function deleteRow(rowToDelete: HealthcareProvider) {
    console.log('Deleting row:', rowToDelete.id)
    const index = data.value.findIndex((r) => r.id === rowToDelete.id)
    if (index !== -1) {
      data.value.splice(index, 1)
    }
  }

  return { data, updateRow, addRow, deleteRow }
})
