import z from 'zod'

export type ZodRowType<T extends z.ZodRawShape> = z.infer<z.ZodObject<T>>

export type FlattenKeys<T, P extends string = ''> = {
  [K in keyof T & string]: T[K] extends z.ZodObject<infer R>
    ? FlattenKeys<R, `${P}${K}.`>
    : T[K] extends z.ZodOptional<z.ZodObject<infer R>>
      ? FlattenKeys<R, `${P}${K}.`>
      : T[K] extends z.ZodNullable<z.ZodObject<infer R>>
        ? FlattenKeys<R, `${P}${K}.`>
        : `${P}${K}`
}[keyof T & string]

export type ColumnKeyType<T extends z.ZodRawShape> = FlattenKeys<T>

export type ColumnKeyShape<T extends z.ZodObject<any>> = FlattenKeys<T['shape']>

export type GotoAction<Row> = {
  key: string
  label?: string
  icon?: string
  href?: string
  target?: string
  rel?: string
  handler: (event: Event | undefined, row: Row) => void
}

export type I18nLabels = {
  noData: string
  noResults: string
  addButton: string
  columnsLabel: string
  rowsPerPageLabel: string
  paginationSeparator: string
  editableToggle: string
  cloneButtonTitle: string
  deleteButtonTitle: string
  datePickerNow: string
  datePickerClear: string
  datePickerClose: string
  deleteConfirmTitle: string
  deleteConfirmMessage: string
}
