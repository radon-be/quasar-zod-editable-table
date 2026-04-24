import { boot } from 'quasar/wrappers'
import ZodTable from '../component/ZodTable.vue'
export { provideZodTableI18n, useZodTableI18n } from '../composables/useZodTableI18n'

export default boot(({ app }) => {
  app.component('ZodTable', ZodTable)
})
