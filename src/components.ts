export { default as ZodTable } from './component/ZodTable.vue'
export { provideZodTableI18n, createZodTableI18nPlugin, useZodTableI18n } from './composables/useZodTableI18n'
export { flattenSchema } from './component/nest-utils'
export type { I18nLabels, GotoAction, RowAction, CloneRowAction, UpdateRowAction, DeleteRowAction, DeleteRowActionConfig, ColumnKeyType, ColumnKeyShape, ZodRowType } from './component/table-types'