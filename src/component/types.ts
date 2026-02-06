import type { QTableColumn } from 'quasar'
import type { ColEditType } from './zod-utils'
import type { z } from 'zod'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface ColumnOption<T = any> {
  options: T[]
  optionLabel?: string | ((opt: T) => string)
  optionValue?: string | ((opt: T) => any)
}

export interface ZodTableColumn extends QTableColumn {
  colEditType: ColEditType
  options?: unknown[]
  optionLabel?: string | ((opt: unknown) => string)
  optionValue?: string | ((opt: unknown) => unknown)
  colSchema?: z.ZodType
}
