import { isString } from 'radashi'
import { z } from 'zod'

export type ColEditType = 'string' | 'integer' | 'real' | 'static-enum' | 'foreign-key' | 'boolean'

export interface ZodTableColumnProps<T = any> {
  // editable: boolean
  colEditType: string
  options?: T[]
  optionLabel?: string
  optionValue?: string
  colSchema?: z.ZodType
}

export function getColumnInfo(
  colSchema: z.ZodType,
  key: string,
  columnOptions: ZodTableColumnProps | undefined,
): ZodTableColumnProps {
  const json = colSchema.toJSONSchema()
  const colEditType: ColEditType = !!columnOptions
    ? 'foreign-key'
    : json.enum
      ? 'static-enum'
      : Array.isArray(json?.type)
        ? json.type.find((t: string) => t !== 'null')
        : json?.type
  if (colEditType === 'foreign-key') return { colEditType, ...columnOptions }
  if (colEditType === 'static-enum') return { colEditType, options: json.enum }
  return { colEditType, options: [] }
}

export const parseNumericValue = (colEditType: string, value: string | number | null) =>
  value ? (colEditType === 'integer' ? parseInt : parseFloat)(value.toString()) : 0

export const numericProps = (colEditType: string, scope: { value: unknown; set: () => void; cancel: () => void }) => ({
  'onUpdate:modelValue': (val: string | number | null) => {
    scope.value = parseNumericValue(colEditType, val)
  },
  onBlur: (e: Event) => {
    scope.value = parseNumericValue(colEditType, (e.target as HTMLInputElement).value)
  },
  type: 'number' as const,
  'input-class': 'no-spinners',
  step: colEditType === 'integer' ? ('1' as const) : ('any' as const),
})

export function visualProps(col: ZodTableColumnProps | 'rowsPerPage'): Record<string, boolean | string> {
  const keys = ['dense', 'optionsDense', 'borderless', 'emit-value', 'map-options', 'autoFocus']
  const matrix: Record<string, boolean[]> = {
    boolean: [true, false, false, false, false, false],
    'foreign-key': [true, true, true, true, true, false],
    'static-enum': [true, true, true, false, false, false],
    string: [true, false, false, false, false, true],
    integer: [true, false, false, false, false, true],
    real: [true, false, false, false, false, true],
    rowsPerPage: [true, true, true, false, false, false],
  }
  const selector = isString(col) ? col : col.colEditType
  return Object.fromEntries(keys.map((key, i) => [key, matrix[selector][i]]))
}
