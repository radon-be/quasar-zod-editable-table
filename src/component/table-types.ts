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

type Primitive = string | number | boolean | bigint | symbol | null | undefined | Date

type FlattenObjectKeys<T, P extends string = ''> = {
  [K in keyof T & string]:
    NonNullable<T[K]> extends Primitive
      ? `${P}${K}`
      : NonNullable<T[K]> extends Array<any>
        ? `${P}${K}`
        : NonNullable<T[K]> extends Record<string, any>
          ? FlattenObjectKeys<NonNullable<T[K]>, `${P}${K}.`>
          : `${P}${K}`
}[keyof T & string]

export type ColumnKeyType<T> =
  T extends z.ZodRawShape ? FlattenKeys<T> :
  T extends Record<string, any> ? FlattenObjectKeys<T> :
  never

export type ColumnKeyShape<T extends z.ZodObject<any>> = FlattenKeys<T['shape']>

export type GotoTypeOrFunction<T, Row> = T | ((row: Row) => T)

export type GotoAction<Row> = {
  key: string
  label?: GotoTypeOrFunction<string, Row>
  icon?: GotoTypeOrFunction<string, Row>
  href?: GotoTypeOrFunction<string, Row>
  target?: GotoTypeOrFunction<string, Row>
  rel?: GotoTypeOrFunction<string, Row>
  visible?: GotoTypeOrFunction<boolean, Row>
  disabled?: GotoTypeOrFunction<boolean, Row>
  color?: GotoTypeOrFunction<string, Row>
  handler: (event: Event, row: Row) => Promise<void>
}

export type RowActionHandler<Row> = (row: Row) => Promise<Row>

export type RowAction<Row> = Omit<GotoAction<Row>, 'key' | 'href' | 'target' | 'rel'>

export type CloneRowAction<Row> = RowActionHandler<Row> | RowAction<Row>

export type UpdateRowAction<Row> = RowActionHandler<Row> | RowAction<Row>

export type DeleteRowActionConfig<Row> = RowAction<Row> & {
  confirm?: GotoTypeOrFunction<boolean, Row>
}

export type DeleteRowAction<Row> = RowActionHandler<Row> | DeleteRowActionConfig<Row>

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
