import type { QTableColumn } from 'quasar'
import type { ColEditType } from './zod-utils'
import type { z } from 'zod'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface ColumnOption<T = any> {
  options: T[]
  optionLabel?: string
  optionValue?: string
}

export interface ZodTableColumnProps {
  editable: boolean
  colEditType: ColEditType
  options?: unknown[]
  optionLabel?: string
  optionValue?: string
  colSchema?: z.ZodType
}
