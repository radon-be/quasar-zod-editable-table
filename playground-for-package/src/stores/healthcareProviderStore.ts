import { defineStore } from 'pinia'
import { ref } from 'vue'
import z from 'zod'
import dataJson from './data.json'
import { createHealthcareProvider, type HealthcareProvider, HealthcareProviderSchema } from 'src/types/healthcare-provider.schema'

export const useTableExampleStore = defineStore('tableExample', () => {
  const ProvidersSchema = z.array(HealthcareProviderSchema)
  const dataParsed = ProvidersSchema.parse(dataJson)
  const data = ref<HealthcareProvider[]>(dataParsed)

  async function updateRow(updatedRow: HealthcareProvider): Promise<HealthcareProvider> {
    console.log('Updating row:', updatedRow.id, '=>', updatedRow)
    const index = data.value.findIndex((r) => r.id === updatedRow.id)
    if (index !== -1) {
      data.value[index] = { ...updatedRow }
    }
    await new Promise((resolve) => setTimeout(resolve, 100))
    return updatedRow
  }

  async function addRow(templateRow?: HealthcareProvider): Promise<HealthcareProvider> {
    const newDoc = templateRow ? { ...templateRow } : createHealthcareProvider()
    const id = Math.max(...data.value.map((d) => d.id)) + 1
    newDoc.id = id
    data.value.push(newDoc)
    console.log('Added new row:', newDoc)
    await new Promise((resolve) => setTimeout(resolve, 100))
    return newDoc
  }

  async function cloneRow(rowToClone: HealthcareProvider): Promise<HealthcareProvider> {
    return await addRow(rowToClone)
  }

  async function deleteRow(rowToDelete: HealthcareProvider): Promise<void> {
    console.log('Deleting row:', rowToDelete.id)
    const index = data.value.findIndex((r) => r.id === rowToDelete.id)
    if (index !== -1) {
      data.value.splice(index, 1)
    }
    await new Promise((resolve) => setTimeout(resolve, 100))
  }

  return { data, updateRow, addRow, cloneRow, deleteRow }
})
