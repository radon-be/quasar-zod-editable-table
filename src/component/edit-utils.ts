import { nextTick } from 'vue'
import { z } from 'zod'

export type ColEditType = 'string' | 'integer' | 'real' | 'static-enum' | 'foreign-key' | 'boolean'

export interface ZodTableColumnProps<T = any> {
  // editable: boolean
  colEditType: ColEditType
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

export const numericInputHandlers = (
  colEditType: string,
  scope: { value: unknown; set: () => void; cancel: () => void },
) => ({
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

export function visualProps(col: ZodTableColumnProps): Record<string, boolean | string> {
  const keys = ['dense', 'optionsDense', 'borderless', 'emit-value', 'map-options']
  const matrix: Record<string, boolean[]> = {
    boolean: [true, false, false, false, false],
    'foreign-key': [true, true, true, true, true],
    'static-enum': [true, true, true, false, false],
  }
  return Object.fromEntries(keys.map((key, i) => [key, matrix[col.colEditType][i]]))
}

export const inputProps = (
  scope: { value: unknown; set: () => void; cancel: () => void },
  rowIndex: number,
  colName: string,
  moveFocus: (
    rowIndex: number,
    colName: string,
    direction: 'next' | 'prev',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    columns: any,
  ) => void,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  columns: any[],
) => {
  return {
    autofocus: true,
    dense: true,
    onKeydown: (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        scope.set()
      }
      if (e.key === 'Tab') {
        e.preventDefault()
        scope.set()
        // Wait for the popup to close and value to settle
        nextTick(() => {
          moveFocus(rowIndex, colName, e.shiftKey ? 'prev' : 'next', columns)
        })
      }
    },
  }
}
