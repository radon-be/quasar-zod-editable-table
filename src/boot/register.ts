import type { App } from 'vue'
import ZodTable from '../component/ZodTable.vue'
export { provideZodTableI18n, useZodTableI18n } from '../composables/useZodTableI18n'

export default function register({ app }: { app: App }) {
  app.component('ZodTable', ZodTable)
}
