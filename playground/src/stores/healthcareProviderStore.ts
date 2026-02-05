import { defineStore } from 'pinia';
import { ref } from 'vue';
import { createHealthcareProvider, type HealthcareProvider } from '../healthcare-provider.schema';

export const useTableExampleStore = defineStore('tableExample', () => {
  const data = ref<HealthcareProvider[]>(
    [
      [1, 'Dokter', 'Bibber', 'Marke', 'dokter', 145, true],
      [2, 'Louis', 'Pasteur', 'Kortrijk', 'bioloog', 0, true],
      [3, 'Hippocrates', ' ', 'Kortrijk', 'Griek', 10, false]
    ].map(
      ([id, firstName, name, address, docType, rqc, active]) =>
        ({ id, firstName, name, address, docType, requestCounter: rqc, active }) as HealthcareProvider //prettier-ignore
    )
  );

  function updateRow(updatedRow: HealthcareProvider) {
    console.log('Updating row:', updatedRow.id, '=>', updatedRow);
    const index = data.value.findIndex((r) => r.id === updatedRow.id);
    if (index !== -1) {
      data.value[index] = { ...updatedRow };
    }
  }

  function addRow(templateRow?: HealthcareProvider): HealthcareProvider {
    const newDoc = templateRow ? { ...templateRow } : createHealthcareProvider();
    const id = Math.max(...data.value.map((d) => d.id)) + 1;
    newDoc.id = id;
    data.value.push(newDoc);
    console.log('Added new row:', newDoc);
    return newDoc;
  }

  function deleteRow(rowToDelete: HealthcareProvider) {
    console.log('Deleting row:', rowToDelete.id);
    const index = data.value.findIndex((r) => r.id === rowToDelete.id);
    if (index !== -1) {
      data.value.splice(index, 1);
    }
  }

  return { data, updateRow, addRow, deleteRow };
});
