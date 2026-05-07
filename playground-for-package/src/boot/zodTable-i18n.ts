import { boot } from 'quasar/wrappers'
import { ref } from 'vue'
import { provideZodTableI18n } from '@radon-be/quasar-app-extension-zod-table'

const i18nLabels = ref({
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
})

export default boot(({ app }) => {
  provideZodTableI18n(i18nLabels, app)
})
