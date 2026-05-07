import { computed } from 'vue'
import { getNestedValue, setNestedValue } from './nest-utils'
import { date } from 'quasar'
import { ZodRowType } from './table-types'
import { ZodRawShape } from 'zod'

/** Computed writables that convert isodatetime formats to the UX components' required structure */
export function useDateTimeModel<T extends ZodRawShape>() {
  const timeModel = (
    row: any,
    path: string,
    updateRow?: ((event: Event, row: ZodRowType<T>) => Promise<void>) | undefined,
  ) => {
    return computed({
      get: () => {
        const nested = getNestedValue(row, path)
        if (!nested) return null
        return date.formatDate(nested, 'HH:mm')
      },
      set: (newValue: string) => {
        if (!newValue) return
        const [hh, mm] = newValue.split(':').map(Number)

        const nested = getNestedValue(row, path)
        const baseDate = nested ? new Date(nested) : new Date()

        const newDate = new Date(baseDate)
        newDate.setHours(hh, mm, 0, 0)

        setNestedValue(row, path, newDate.toISOString())
        updateRow?.(new Event('update'), row)
      },
    })
  }

  const dateModel = (
    row: any,
    path: string,
    updateRow?: ((event: Event, row: ZodRowType<T>) => Promise<void>) | undefined,
  ) => {
    return computed({
      get: () => {
        const nested = getNestedValue(row, path)
        if (!nested || nested.length === 0) return null
        return date.formatDate(nested, 'YYYY/MM/DD')
      },
      set: (newValue) => {
        if (!newValue) return
        const [year, month, day] = newValue.split('/').map(Number)
        const newDate = new Date(year, month - 1, day)
        setNestedValue(row, path, newDate.toISOString())
        updateRow?.(new Event('update'), row)
      },
    })
  }

  const dateOrTimeModel = (
    row: any,
    path: string,
    dateOrTime: 'date' | 'time',
    updateRow?: ((event: Event, row: ZodRowType<T>) => Promise<void>) | undefined,
  ) => {
    if (dateOrTime === 'date') {
      return dateModel(row, path, updateRow)
    } else {
      return timeModel(row, path, updateRow)
    }
  }

  return {
    dateModel,
    timeModel,
    dateOrTimeModel,
  }
}
