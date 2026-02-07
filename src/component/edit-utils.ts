import { nextTick } from 'vue'
import { z } from 'zod'

export type ColEditType = 'text' | 'integer' | 'real' | 'static-dropdown' | 'dynamic-dropdown' | 'checkbox'

export interface ZodTableColumnProps<T = any> {
  // editable: boolean
  colEditType: ColEditType
  options?: T[]
  optionLabel?: string
  optionValue?: string
  colSchema?: z.ZodType
}

export function getColumnInfo(rowModel: z.ZodObject, columnKey: string) {
  type RowModel = z.infer<typeof rowModel>
}

export function getColumnMetadata(schema: z.ZodType): ZodTableColumnProps {
  const json = schema.toJSONSchema()
  if (!json) return { colEditType: 'text' } // default / unknown

  // Handle nullable/optional types which might appear as arrays (e.g. ["string", "null"])
  const type = Array.isArray(json.type) ? json.type.find((t: string) => t !== 'null') : json.type

  if (json.enum) return { colEditType: 'static-dropdown', options: json.enum }

  switch (type) {
    case 'string':
      return { colEditType: 'text' }
    case 'boolean':
      return { colEditType: 'checkbox' }
    case 'integer':
      return { colEditType: 'integer' }
    case 'number':
      return { colEditType: 'real' }
    default:
      return { colEditType: 'text' }
  }
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
  const keys = ['dense', 'optionsDense', 'borderless', 'disable']
  const matrix: Record<string, boolean[]> = {
    checkbox: [true, false, false, !col.editable],
    'dynamic-dropdown': [true, true, true, !col.editable],
    'static-dropdown': [true, true, true, !col.editable],
  }
  const base = Object.fromEntries(keys.map((key, i) => [key, matrix[col.colEditType][i]]))
  if (col.colEditType === 'dynamic-dropdown') {
    return {
      ...base,
      'option-label': col.optionLabel!,
      'option-value': col.optionValue!,
      'emit-value': true,
      'map-options': true,
    }
  }
  return base
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
