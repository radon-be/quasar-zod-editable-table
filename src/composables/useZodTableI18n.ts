import { inject, provide, InjectionKey, Ref, App } from 'vue'
import { I18nLabels } from '../component/table-types'

export const ZodTableI18nKey: InjectionKey<Ref<Partial<I18nLabels>>> = Symbol.for('ZodTableI18n')

/**
 * Provide global i18n labels for all ZodTable instances.
 *
 * - In a **Quasar CLI boot file**: call this directly (runs inside app plugin context).
 * - In a **plain Vite/Vue app**: pass the `app` instance so it uses `app.provide()`.
 *
 * @example Boot file (Quasar CLI)
 * export default boot(() => {
 *   provideZodTableI18n(ref({ addButton: 'Add', ... }))
 * })
 *
 * @example main.ts (plain Vite)
 * app.use(createZodTableI18nPlugin(ref({ addButton: 'Add', ... })))
 */
export function provideZodTableI18n(i18n: Ref<Partial<I18nLabels>>, app?: App) {
  if (app) {
    app.provide(ZodTableI18nKey, i18n)
  } else {
    provide(ZodTableI18nKey, i18n)
  }
}

/**
 * Creates a Vue plugin that globally provides i18n labels for all ZodTable instances.
 * Use this in plain Vite/Vue apps where there is no boot file.
 *
 * @example main.ts
 * import { ref } from 'vue'
 * import { createZodTableI18nPlugin } from '@radon-be/quasar-app-extension-zod-table'
 *
 * app.use(createZodTableI18nPlugin(ref({ addButton: 'Add', ... })))
 */
export function createZodTableI18nPlugin(i18n: Ref<Partial<I18nLabels>>) {
  return {
    install(app: App) {
      app.provide(ZodTableI18nKey, i18n)
    },
  }
}

/**
 * Get the global i18n labels for ZodTable.
 * Used internally by ZodTable component.
 *
 * Returns the provided global i18n, or an empty object if not provided.
 */
export function useZodTableI18n(): Ref<Partial<I18nLabels>> | null {
  return inject(ZodTableI18nKey, null)
}
