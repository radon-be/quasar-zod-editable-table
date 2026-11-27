import { computed, reactive, ref, watch } from 'vue'
import { z } from 'zod'
import { flattenSchema } from '../component/nest-utils'
import type { ColumnKeyType } from '../component/table-types'
import { usePersistedState } from '../persisted-state'

export type ZodTablePagination = {
  page: number
  rowsPerPage: number
  sortBy: string | null
  descending: boolean
  rowsNumber?: number
}

export type ZodTablePaginationUpdate = {
  page: number
  rowsPerPage: number
  sortBy?: string | null
  descending?: boolean
  rowsNumber?: number
}

export type ZodTableStateDefaults<T> = {
  columns: ColumnKeyType<T>[]
  pageSize: number
  sortBy: ColumnKeyType<T> | null
  descending: boolean
}

export type UseZodTableStateOptions<T> = {
  revision?: number
  /** Columns the user may toggle. Defaults to every column of the row schema. */
  togglableColumns?: readonly ColumnKeyType<T>[]
}

type StoredTableChanges = {
  revision: number
  shown?: string[]
  hidden?: string[]
  pageSize?: number
  sortBy?: string | null
  descending?: boolean
}

const storedTableChangesSchema = z.object({
  revision: z.number().int().positive(),
  shown: z.array(z.string()).optional(),
  hidden: z.array(z.string()).optional(),
  pageSize: z.number().int().nonnegative().optional(),
  sortBy: z.string().nullable().optional(),
  descending: z.boolean().optional(),
})

function isColumnKey<T extends string>(value: string, keys: ReadonlySet<T>): value is T {
  return keys.has(value as T)
}

export function useZodTableState<T extends z.ZodRawShape>(
  key: string,
  rowModel: z.ZodObject<T>,
  defaults: ZodTableStateDefaults<T>,
  options: UseZodTableStateOptions<T> = {},
) {
  const revision = options.revision ?? 1
  if (!Number.isInteger(revision) || revision < 1) {
    throw new Error('Zod table state revision must be a positive integer')
  }

  // Valid columns always come from the row schema (the same keys ZodTable renders),
  // so saved choices for non-default columns are never dropped by mistake.
  const validColumnKeys = new Set(Object.keys(flattenSchema(rowModel)) as ColumnKeyType<T>[])
  const validTogglableColumns = new Set<ColumnKeyType<T>>(
    (options.togglableColumns ?? [...validColumnKeys]).filter((column) => validColumnKeys.has(column)),
  )
  const defaultColumns = defaults.columns.filter((column) => validTogglableColumns.has(column))
  const defaultSortBy =
    defaults.sortBy === null || isColumnKey(defaults.sortBy, validColumnKeys) ? defaults.sortBy : null
  if (!Number.isInteger(defaults.pageSize) || defaults.pageSize < 0) {
    throw new Error('Zod table state pageSize must be a non-negative integer')
  }
  const currentDefaults = {
    columns: defaultColumns,
    pageSize: defaults.pageSize,
    sortBy: defaultSortBy,
    descending: defaults.descending,
  }

  const saved = usePersistedState<StoredTableChanges>({
    namespace: 'zod-table',
    key,
    schema: storedTableChangesSchema,
    version: 1,
    defaults: () => ({ revision }),
  })

  if (saved.value.value.revision !== revision) saved.reset()

  const normalizedChanges: StoredTableChanges = { revision }
  const defaultColumnSet = new Set(defaultColumns)
  const hiddenColumns = new Set(
    (saved.value.value.hidden ?? []).filter(
      (column) => isColumnKey(column, validTogglableColumns) && defaultColumnSet.has(column),
    ),
  )
  const shownColumns = [
    ...new Set(
      (saved.value.value.shown ?? []).filter(
        (column) =>
          isColumnKey(column, validTogglableColumns) &&
          !defaultColumnSet.has(column) &&
          !hiddenColumns.has(column),
      ),
    ),
  ]
  if (shownColumns.length) normalizedChanges.shown = shownColumns
  if (hiddenColumns.size) normalizedChanges.hidden = [...hiddenColumns]
  if (saved.value.value.pageSize !== undefined && saved.value.value.pageSize !== currentDefaults.pageSize) {
    normalizedChanges.pageSize = saved.value.value.pageSize
  }
  if (
    saved.value.value.sortBy !== undefined &&
    saved.value.value.sortBy !== currentDefaults.sortBy &&
    (saved.value.value.sortBy === null || isColumnKey(saved.value.value.sortBy, validColumnKeys))
  ) {
    normalizedChanges.sortBy = saved.value.value.sortBy
  }
  if (
    saved.value.value.descending !== undefined &&
    saved.value.value.descending !== currentDefaults.descending
  ) {
    normalizedChanges.descending = saved.value.value.descending
  }
  if (JSON.stringify(saved.value.value) !== JSON.stringify(normalizedChanges)) {
    saved.value.value = normalizedChanges
  }

  const currentChanges = () => saved.value.value.revision === revision ? saved.value.value : { revision }

  const visibleColumns = computed(() => {
    const changes = currentChanges()
    const shown = (changes.shown ?? []).filter((column) => isColumnKey(column, validTogglableColumns))
    const hidden = new Set(
      (changes.hidden ?? []).filter((column) => isColumnKey(column, validTogglableColumns)),
    )
    return [
      ...defaultColumns.filter((column) => !hidden.has(column)),
      ...shown.filter((column) => !defaultColumns.includes(column)),
    ]
  })

  const pagination = ref<ZodTablePagination>({
    page: 1,
    rowsPerPage: saved.value.value.pageSize ?? currentDefaults.pageSize,
    sortBy:
      saved.value.value.sortBy === undefined ||
      (typeof saved.value.value.sortBy === 'string' &&
        !isColumnKey(saved.value.value.sortBy, validColumnKeys))
        ? currentDefaults.sortBy
        : saved.value.value.sortBy,
    descending: saved.value.value.descending ?? currentDefaults.descending,
  })

  watch(
    saved.value,
    () => {
      const changes = currentChanges()
      pagination.value = {
        ...pagination.value,
        rowsPerPage: changes.pageSize ?? currentDefaults.pageSize,
        sortBy:
          changes.sortBy === undefined ||
          (typeof changes.sortBy === 'string' && !isColumnKey(changes.sortBy, validColumnKeys))
            ? currentDefaults.sortBy
            : changes.sortBy,
        descending: changes.descending ?? currentDefaults.descending,
      }
    },
    { deep: true, flush: 'sync' },
  )

  const onUpdatePagination = (next: ZodTablePaginationUpdate) => {
    const candidateSortBy = next.sortBy === undefined ? currentDefaults.sortBy : next.sortBy
    const nextPagination: ZodTablePagination = {
      page: next.page,
      rowsPerPage: next.rowsPerPage,
      sortBy:
        candidateSortBy === null || isColumnKey(candidateSortBy, validColumnKeys)
          ? candidateSortBy
          : currentDefaults.sortBy,
      descending: next.descending ?? currentDefaults.descending,
      ...(next.rowsNumber === undefined ? {} : { rowsNumber: next.rowsNumber }),
    }
    pagination.value = nextPagination

    const changes: StoredTableChanges = { ...currentChanges(), revision }
    delete changes.pageSize
    delete changes.sortBy
    delete changes.descending
    if (nextPagination.rowsPerPage !== currentDefaults.pageSize) changes.pageSize = nextPagination.rowsPerPage
    if (
      nextPagination.sortBy !== currentDefaults.sortBy &&
      (nextPagination.sortBy === null || isColumnKey(nextPagination.sortBy, validColumnKeys))
    ) {
      changes.sortBy = nextPagination.sortBy
    }
    if (nextPagination.descending !== currentDefaults.descending) {
      changes.descending = nextPagination.descending
    }
    saved.value.value = changes
  }

  const onUpdateTogglableColumns = (visible: ColumnKeyType<T>[]) => {
    const visibleSet = new Set(visible.filter((column) => validTogglableColumns.has(column)))
    const defaultsSet = new Set(defaultColumns)
    const shown = [...visibleSet].filter((column) => !defaultsSet.has(column))
    const hidden = defaultColumns.filter((column) => !visibleSet.has(column))

    const changes: StoredTableChanges = { ...currentChanges(), revision }
    delete changes.shown
    delete changes.hidden
    if (shown.length) changes.shown = shown
    if (hidden.length) changes.hidden = hidden
    saved.value.value = changes
  }

  const bindings = reactive({
    get pagination() { return pagination.value },
    get defaultToggledColumns() { return visibleColumns.value },
    'onUpdate:pagination': onUpdatePagination,
    onUpdateTogglableColumns,
  })

  const reset = () => {
    saved.reset()
    if (saved.value.value.revision !== revision) saved.value.value = { revision }
    pagination.value = {
      page: 1,
      rowsPerPage: currentDefaults.pageSize,
      sortBy: currentDefaults.sortBy,
      descending: currentDefaults.descending,
    }
  }

  return {
    pagination,
    visibleColumns,
    onUpdatePagination,
    onUpdateTogglableColumns,
    bindings,
    reset,
    persistenceFailed: saved.persistenceFailed,
    status: saved.status,
  }
}
