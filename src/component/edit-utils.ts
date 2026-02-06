import { nextTick } from 'vue'
import type { ZodTableColumn } from './types'

export const parseNumericValue = (colEditType: string, value: string | number | null) => {
  const parser = colEditType === 'integer' ? parseInt : parseFloat
  return value ? parser(value.toString()) : 0
}

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

export const getDropdownProps = (col: ZodTableColumn) => {
  const common = {
    dense: true,
    optionsDense: true,
    borderless: true,
  }
  if (col.colEditType === 'dynamic-dropdown') {
    return {
      ...common,
      'option-label': col.optionLabel,
      'option-value': col.optionValue,
      'emit-value': true,
      'map-options': true,
    }
  }
  return common
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
