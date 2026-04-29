<template>
  <q-table
    :columns="filteredColumns"
    :rows="props.data"
    :row-key="props.rowKey"
    :rows-per-page-options="rowsPerPageOptions"
    v-model:pagination="pagination"
    v-bind="$attrs"
    :hide-bottom="false"
    :hide-pagination="false"
     :no-data-label="i18n.noData"
     :no-results-label="i18n.noResults"
  >
    <template v-slot:header="headerProps">
      <q-tr :props="headerProps">
        <q-th v-for="col in headerProps.cols" :key="col.name" :props="headerProps">
          <slot
            :name="`header-cell-${col.name}`"
            v-bind="headerProps"
            :col="col"
            :pagination="pagination"
          >
            {{ col.label }}
          </slot>
        </q-th>
        <q-th
          v-if="hasActions && (editable || canGoto)"
          auto-width
          :class="props.headerClass"
          :style="props.headerStyle"
        ></q-th>
      </q-tr>
    </template>
    <template v-slot:body="slotProps">
      <q-tr :props="slotProps" @click="(event: MouseEvent) => emit('row-click', event, slotProps.row)">
        <q-td
          v-for="col in slotProps.cols as (QTableColumn & ZodTableColumnProps)[]"
          :key="col.name"
          :props="slotProps"
          :class="{
            'zod-table-no-vertical-padding': hasNoVerticalPadding(col),
            'zod-table-no-horizontal-padding': hasNoHorizontalPadding(col),
          }"
        >
          <!-- Dynamic slot for custom cell rendering: body-cell-[name] -->
          <!-- boolean, dropdown and datepicker columns don't use popup edit -->
          <slot :name="`body-cell-${col.name}`" v-bind="slotProps" :col="col" :row="slotProps.row">
            <q-checkbox
              v-if="col.colEditType === 'boolean'"
              :model-value="getNestedValue(slotProps.row, col.name)"
              @update:model-value="
                (val) => (setNestedValue(slotProps.row, col.name, val), props.updateRow?.(slotProps.row))
              "
              v-bind="visualProps(col)"
              :disable="!col.editable"
            />
            <template v-else-if="col.colEditType === 'static-enum'">
              <q-select
                v-if="editable && col.editable"
                :model-value="getNestedValue(slotProps.row, col.name)"
                :options="col.options"
                v-bind="visualProps(col)"
                @update:model-value="
                  (val) => (setNestedValue(slotProps.row, col.name, val), props.updateRow?.(slotProps.row))
                "
                :clearable="
                  col.name in (extraColumnOptions ?? {}) &&
                  extraColumnOptions?.[col.name as ColumnKeyType<T>]?.clearable
                "
                options-dense
                dense
              />
              <template v-else>
                {{ getSelectLabel(col, slotProps.row) }}
              </template>
            </template>

            <template v-else-if="'foreign-key' === col.colEditType">
              <q-select
                v-if="editable && col.editable"
                :model-value="getNestedValue(slotProps.row, col.name)"
                :options="col.options"
                v-bind="visualProps(col)"
                @update:model-value="
                  (val) => (setNestedValue(slotProps.row, col.name, val), props.updateRow?.(slotProps.row))
                "
                :option-value="col.optionValue"
                :option-label="col.optionLabel"
                :clearable="
                  col.name in (extraColumnOptions ?? {}) &&
                  extraColumnOptions?.[col.name as ColumnKeyType<T>]?.clearable
                "
                options-dense
                dense
              />
              <template v-else>
                {{ getSelectLabel(col, slotProps.row) }}
              </template>
            </template>

            <template v-else>
              <!-- any other column types (that use popup edit) -->
              <template v-if="col.colEditType === 'date' || col.colEditType === 'time' || col.colEditType === 'datetime'">
                <div class="row justify-between items-center" style="flex-wrap: nowrap">
                  {{
                    date.formatDate(
                      getNestedValue(slotProps.row, col.name),
                        col.colEditType === 'date' ? 'DD-MM-YYYY' : 
                          col.colEditType === 'time' ? 'HH:mm' : 'DD-MM-YYYY HH:mm',
                    )
                  }}
                  <q-icon
                    v-if="
                      editable &&
                      (col.name in (editableColumns ?? {}) || editableColumns?.includes('*')) &&
                      col.name in (extraColumnOptions ?? {}) &&
                      extraColumnOptions?.[col.name as ColumnKeyType<T>]?.clearable &&
                      typeof getNestedValue(slotProps.row, col.name) !== 'undefined'
                    "
                    :name="$q.iconSet.field.clear"
                    size="sm"
                    class="cursor-pointer text-grey-6 hover-opacity q-ml-xs"
                    @click.stop="() => setNestedValue(slotProps.row, col.name, undefined)"
                  />
                </div>
              </template>

              <template v-else>
                {{ getNestedValue(slotProps.row, col.name) }}
              </template>

              <template v-if="editable && col.editable">
                <q-popup-proxy
                  v-if="col.colEditType === 'date' || col.colEditType === 'time' || col.colEditType === 'datetime'"
                  cover
                  transition-show="scale"
                  transition-hide="scale"
                  class="q-popup-proxy-in-table"
                  @before-show="dateTimeStep = 'date'"
                >
                  <component
                    :is="getDateTimeType(col.colEditType) === 'date' ? QDate : QTime"
                    v-model="dateOrTimeModel(slotProps.row, col.name, getDateTimeType(col.colEditType), props.updateRow).value"
                    v-bind="getDateTimeType(col.colEditType) === 'date' ? { firstDayOfWeek: '1' } : { format24h: true }"
                    @update:model-value="col.colEditType === 'datetime' && dateTimeStep === 'date' ? dateTimeStep = 'time' : null"
                  >
                    <div class="row items-center justify-between">
                      <q-btn
                        :label="i18n.datePickerNow"
                        color="primary"
                        flat
                        @click="setNestedValue(slotProps.row, col.name, new Date().toISOString())"
                      />
                      <q-btn
                        v-close-popup
                        :label="i18n.datePickerClear"
                        color="primary"
                        flat
                        @click="setNestedValue(slotProps.row, col.name, undefined)"
                        v-if="typeof getNestedValue(slotProps.row, col.name) !== 'undefined'"
                      />
                      <q-btn v-close-popup :label="i18n.datePickerClose" color="primary" flat />
                    </div>
                  </component>
                </q-popup-proxy>
                <q-popup-edit
                  v-else
                  :model-value="getNestedValue(slotProps.row, col.name)"
                  auto-save
                  v-slot="scope"
                  @save="
                    (newValue: any) => (
                      setNestedValue(slotProps.row, col.name, newValue),
                      props.updateRow?.(slotProps.row)
                    )
                  "
                >
                  <q-input
                    v-if="col.colEditType === 'string'"
                    v-model="scope.value"
                    v-bind="visualProps(col)"
                    @keydown="onPopupKeydown($event, scope)"
                  />
                  <q-input
                    v-if="['integer', 'real'].includes(col.colEditType)"
                    v-model.number="scope.value"
                    v-bind="{ ...numericProps(col.colEditType, scope), ...visualProps(col) }"
                    @keydown="onPopupKeydown($event, scope)"
                  />
                </q-popup-edit>
              </template>
            </template>
          </slot>
        </q-td>
        <q-td v-if="hasActions" auto-width>
          <div class="col q-gutter-xs">
            <template v-if="canGoto && normalizedGotoRows.length > 0">
              <q-btn
                v-for="gotoRow in normalizedGotoRows"
                :key="gotoRow.key"
                :icon="gotoRow.icon"
                :href="gotoRow.href"
                :target="gotoRow.target"
                :rel="gotoRow.rel"
                size="sm"
                dense
                color="primary"
                @click.stop="(event) => gotoRow.handler(event as MouseEvent, slotProps.row)"
                :title="gotoRow.label"
              />
            </template>
            <q-btn
              v-if="editable && canClone"
              icon="content_copy"
              size="sm"
              dense
              color="primary"
              @click.stop="props.addRow?.(slotProps.row)"
              :title="i18n.cloneButtonTitle"
            />
            <q-btn
              v-if="editable && canDelete"
              icon="delete"
              size="sm"
              dense
              color="negative"
              @click.stop="confirmDelete(slotProps.row)"
              :title="i18n.deleteButtonTitle"
            />
          </div>
        </q-td>
      </q-tr>
    </template>
    <template v-slot:no-data="scope">
      <div class="column full-width">
        <div class="row items-center q-px-md q-py-sm text-grey-7">
          <q-icon :name="scope.icon" class="q-mr-sm" />
          <span>{{ scope.message }}</span>
        </div>
        <div class="row items-center full-width q-px-none q-pb-sm">
          <div class="row items-center q-gutter-sm">
            <q-toggle v-if="showEditableToggle" v-model="editable" :title="i18n.editableToggle" />
            <q-btn
              v-if="canAdd && editable"
              :label="i18n.addButton"
              icon="add"
              color="primary"
              size="sm"
              @click="props.addRow?.()"
            />
          </div>
          <q-space />
          <div class="row items-center q-gutter-sm">
            <span v-if="typeof togglableColumns !== 'undefined'" class="q-mr-sm q-ml-md">{{ i18n.columnsLabel }}</span>
            <q-select
              v-if="typeof togglableColumns !== 'undefined'"
              v-model="visibleColumnKeys"
              @update:model-value="emit('update-togglable-columns', visibleToggles)"
              :options="togglableCols"
              option-label="label"
              option-value="name"
              emit-value
              map-options
              multiple
              borderless
              options-dense
              dense
            >
              <template v-slot:selected>
                {{ visibleTogglesCount }} / {{ togglableColumnKeys.length }}
              </template>
            </q-select>
            <span class="q-mr-sm q-ml-md">{{ i18n.rowsPerPageLabel }}</span>
            <q-select
              :model-value="pagination.rowsPerPage"
              :options="rowsPerPageOptions"
              v-bind="visualProps('rowsPerPage')"
              @update:model-value="(val: any) => (pagination.rowsPerPage = val)"
              options-dense
              dense
            />
            <span class="q-ml-md">0-0 van {{ totalRows }}</span>
          </div>
        </div>
      </div>
    </template>
    <template v-slot:bottom="scope">
      <div class="row items-center full-width">
        <div class="row items-center q-gutter-sm">
          <q-toggle v-if="showEditableToggle" v-model="editable" :title="i18n.editableToggle" />
          <q-btn
            v-if="canAdd && editable"
            :label="i18n.addButton"
            icon="add"
            color="primary"
            size="sm"
            @click="props.addRow?.()"
          />
        </div>
        <q-space />
        <div class="row items-center q-gutter-sm">
          <span v-if="typeof togglableColumns !== 'undefined'" class="q-mr-sm q-ml-md">{{ i18n.columnsLabel }}</span>
          <q-select
            v-if="typeof togglableColumns !== 'undefined'"
            v-model="visibleColumnKeys"
            @update:model-value="emit('update-togglable-columns', visibleToggles)"
            :options="togglableCols"
            option-label="label"
            option-value="name"
            emit-value
            map-options
            multiple
            borderless
            options-dense
            dense
          >
            <template v-slot:selected>
              {{ visibleTogglesCount }} / {{ togglableColumnKeys.length }} 
            </template>
          </q-select>
          <span class="q-mr-sm q-ml-md">{{ i18n.rowsPerPageLabel }}</span>
          <q-select
            :model-value="scope.pagination.rowsPerPage"
            :options="rowsPerPageOptions"
            v-bind="visualProps('rowsPerPage')"
            @update:model-value="(val: any) => { pagination.rowsPerPage = val; pagination.page = 1 }"
            options-dense
            dense
          />
          <span class="q-ml-md">
            {{ getPaginationRange(scope.pagination.page, scope.pagination.rowsPerPage).firstRow }}-{{
              getPaginationRange(scope.pagination.page, scope.pagination.rowsPerPage).lastRow
            }}
            {{ i18n.paginationSeparator }} {{ totalRows }}
          </span>
          <template v-if="scope.pagesNumber > 1">
            <q-btn icon="chevron_left" flat dense :disable="scope.isFirstPage" @click="scope.prevPage" />
            <q-btn icon="chevron_right" flat dense :disable="scope.isLastPage" @click="scope.nextPage" />
          </template>
        </div>
      </div>
    </template>
  </q-table>
</template>

<script setup lang="ts" generic="T extends z.ZodRawShape">
import { date, QDate, QTableColumn, QTime, useQuasar } from 'quasar'
import { capitalize, intersects } from 'radashi'
import { computed, ref } from 'vue'
import z from 'zod'
import { ColEditType, getColumnInfo, numericProps, visualProps, ZodTableColumnProps } from './edit-utils'
import { flattenSchema, getNestedValue, setNestedValue } from './nest-utils'
import { useDateTimeModel } from './datetime-composables'
import { ColumnKeyType, GotoAction, I18nLabels, ZodRowType } from './table-types'
import { useZodTableI18n } from '../composables/useZodTableI18n'

// TODO ! navigatie in de tabel kritisch bekijken, is dat te vereenvoudigen ?

const defaultI18n: I18nLabels = {
  noData: 'No data available',
  noResults: 'No results found',
  addButton: 'Add',
  columnsLabel: 'Columns',
  rowsPerPageLabel: 'Rows per page',
  paginationSeparator: 'of',
  editableToggle: 'Editable',
  cloneButtonTitle: 'Clone',
  deleteButtonTitle: 'Delete',
  datePickerNow: 'Now',
  datePickerClear: 'Clear',
  datePickerClose: 'Close',
  deleteConfirmTitle: 'Confirm Delete',
  deleteConfirmMessage: 'Are you sure you want to delete this row?',
}

const $q = useQuasar()
const { dateOrTimeModel } = useDateTimeModel<T>()

defineOptions({
  inheritAttrs: false,
})

// Types
type ColumnKey = ColumnKeyType<T>
type Row = ZodRowType<T>
type Action = 'add' | 'clone' | 'delete' | 'goto'

const props = withDefaults(
  defineProps<{
    rowModel: z.ZodObject<T>
    columnLabels?: Partial<Record<ColumnKey, string>>
    extraColumnOptions?: Partial<Record<ColumnKey, ZodTableColumnProps>>
    rowKey: ColumnKey
    data: Row[]
    headerClass?: string
    headerStyle?: string
    showEditableToggle?: boolean
    editableColumns?: Array<ColumnKey | '*'>
    defaultToggledColumns?: Array<ColumnKey | '*'>
    hideColumns?: Array<ColumnKey>
    togglableColumns?: Array<ColumnKey | '*'>
    columnOrder?: ColumnKey[]
    updateRow?: (row: Row) => void
    addRow?: (row?: Row) => void
    deleteRow?: (row: Row) => void
    gotoRow?: ((event: MouseEvent | undefined, row: Row) => void) | GotoAction<Row> | Array<GotoAction<Row>>
    initialRowsPerPage?: number
    actions?: Action[]
    i18n?: Partial<I18nLabels>
  }>(),
  {
    headerClass: '',
    headerStyle: '',
    initialRowsPerPage: 5,
    actions: () => [],
  },
)

const emit = defineEmits<{
  (e: 'update-togglable-columns', value: ColumnKey[]): void
  (e: 'row-click', event: MouseEvent, row: Row): void
}>()

// Via v-model to optionally notify parent
const editable = defineModel<boolean>('editable')

const dateTimeStep = ref<'date' | 'time'>('date')
const pagination = ref<{
  page: number
  rowsPerPage: number
  sortBy?: string | null
  descending?: boolean
}>({ page: 1, rowsPerPage: props.initialRowsPerPage, sortBy: null, descending: false })

const globalI18n = useZodTableI18n()
const i18n = computed(() => ({ ...defaultI18n, ...(globalI18n?.value ?? {}), ...props.i18n }))

const totalRows = computed(() => props.data?.length || 0)
const rowsPerPageOptions = [3, 5, 7, 10, 15, 20, 25, 50]
const hasActions = computed(() => props.actions && props.actions.length > 0)
const canAdd = computed(() => props.actions?.includes('add') && props.addRow)
const canClone = computed(() => props.actions?.includes('clone') && props.addRow)
const canDelete = computed(() => props.actions?.includes('delete') && props.deleteRow)
const canGoto = computed(() => props.actions?.includes('goto') && props.gotoRow)

const getPaginationRange = (page: number, rowsPerPage: number) => {
  const firstRow = (page - 1) * rowsPerPage + 1
  const lastRow = Math.min(page * rowsPerPage, totalRows.value)
  return { firstRow, lastRow }
}

const getDateTimeType = (colEditType: ColEditType) => {
  if (colEditType === 'date' || (colEditType === 'datetime' && dateTimeStep.value === 'date')) {
    return 'date'
  } else if (colEditType === 'time' || (colEditType === 'datetime' && dateTimeStep.value === 'time')) {
    return 'time'
  } else {
    return 'date'
  }
}

const getColumnLabel = (key: string) => (props.columnLabels as Record<string, string> | undefined)?.[key]

const getSelectLabel = (col: QTableColumn & ZodTableColumnProps, row: Row) => {
  const modelValue = getNestedValue(row, col.name)
  if (typeof modelValue === 'undefined' || modelValue === null) {
    return ''
  }

  const options = Array.isArray(col.options) ? col.options : []
  const optionValueKey = col.optionValue ?? 'value'
  const optionLabelKey = col.optionLabel ?? 'label'

  const matchedOption = options.find((option) => {
    if (option && typeof option === 'object') {
      return (option as Record<string, unknown>)[optionValueKey] === modelValue
    }
    return option === modelValue
  })

  if (!matchedOption) {
    return String(modelValue)
  }

  if (matchedOption && typeof matchedOption === 'object') {
    const label = (matchedOption as Record<string, unknown>)[optionLabelKey]
    return typeof label === 'undefined' || label === null ? String(modelValue) : String(label)
  }

  return String(matchedOption)
}

const hasNoVerticalPadding = (col: QTableColumn & ZodTableColumnProps) => {
  const key = col.name as ColumnKey
  const fromOptions = !!props.extraColumnOptions?.[key]?.noVerticalPadding
  const forEditableSelect =
    editable.value &&
    !!col.editable &&
    (col.colEditType === 'static-enum' || col.colEditType === 'foreign-key')

  return fromOptions || forEditableSelect
}

const hasNoHorizontalPadding = (col: QTableColumn & ZodTableColumnProps) => {
  const key = col.name as ColumnKey
  return !!props.extraColumnOptions?.[key]?.noHorizontalPadding
}

const onPopupKeydown = (e: KeyboardEvent, scope: { set: () => void }) => {
  if (e.key === 'Enter') {
    e.preventDefault()
    scope.set()
  }
}

const confirmDelete = (row: Row) => {
  if (!$q.dialog) {
    // This is a developer error, not a runtime crash
    console.error(
      '[ZodTable] Quasar Dialog plugin is not installed. ' +
        'Install it via `quasar new plugin dialog` or add it to quasar.config.ts plugins.',
    )
    return
  }

  $q.dialog({
    title: i18n.value.deleteConfirmTitle,
    message: i18n.value.deleteConfirmMessage,
    cancel: true,
    persistent: true,
  }).onOk(() => {
    props.deleteRow?.(row)
  })
}

const flattenedSchema = flattenSchema(props.rowModel)
const columns = computed<(QTableColumn & ZodTableColumnProps)[]>(() => {
  const t = Object.entries(flattenedSchema)
    .filter(([key]) => !(props.hideColumns ?? []).includes(key as ColumnKey))
    .map(([key, colSchema]) => {
      const keyCast = key as ColumnKey
      const meta = getColumnInfo(colSchema, key, props.extraColumnOptions?.[keyCast])
      return {
        name: key,
        label: getColumnLabel(key) ?? capitalize(key.split('.').slice(-1)[0]),
        field: (row: Row) => getNestedValue(row, key),
        align: 'left' as const,
        sortable: true,
        headerClasses: props.headerClass,
        headerStyle: props.headerStyle,
        ...meta,
        editable: editable.value && intersects(props.editableColumns ?? [], [keyCast, '*']),
        colSchema,
      }
    })
  return t
})

const togglableColumnKeys = computed<ColumnKey[]>(() => {
  if (!props.togglableColumns) return []
  if (props.togglableColumns.includes('*')) {
    return columns.value.map((c) => c.name as ColumnKey)
  }

  return props.togglableColumns as ColumnKey[]
})

const togglableCols = computed(() => {
  return baseColumns.value.filter((col) =>
    togglableColumnKeys.value.includes(col.name as ColumnKey)
  )
})

// const visibleColumnKeys = ref<ColumnKey[]>()
const defaultVisibleColumnKeys = computed<ColumnKey[]>(() => {
  const baseKeys = baseColumns.value.map((c) => c.name as ColumnKey)

  // If no togglable columns are configured, everything in base is visible
  if (!props.togglableColumns) return baseKeys

  const togglableSet = new Set(togglableColumnKeys.value)

  const defaultToggles =
    !props.defaultToggledColumns || props.defaultToggledColumns.includes('*')
      ? togglableColumnKeys.value
      : (props.defaultToggledColumns.filter((k) =>
          togglableSet.has(k as ColumnKey),
        ) as ColumnKey[])

  const defaultToggleSet = new Set(defaultToggles)

  return baseKeys.filter((k) => !togglableSet.has(k) || defaultToggleSet.has(k))
})

const _manualVisible = ref<ColumnKey[] | null>(null)

const visibleColumnKeys = computed<ColumnKey[]>({
  get(): ColumnKey[] {
    return (_manualVisible.value ?? defaultVisibleColumnKeys.value) as ColumnKey[]
  },
  set(val: ColumnKey[]) {
    _manualVisible.value = val
  },
})

const filteredColumns = computed(() => {
  const visibleSet = new Set(visibleColumnKeys.value)

  const visibleColumns = baseColumns.value.filter((c) => {
    const key = c.name as ColumnKey

    // always show non-togglable columns
    if (!togglableColumnKeys.value.includes(key)) {
      return true
    }

    // togglable columns depend on selection
    return visibleSet.has(key)
  })

  if (!props.columnOrder || props.columnOrder.length === 0) {
    return visibleColumns
  }

  const visibleByKey = new Map(
    visibleColumns.map((col) => [col.name as ColumnKey, col])
  )
  const orderedColumns: (QTableColumn & ZodTableColumnProps)[] = []
  const usedKeys = new Set<ColumnKey>()

  for (const key of props.columnOrder) {
    const col = visibleByKey.get(key)
    if (col && !usedKeys.has(key)) {
      orderedColumns.push(col)
      usedKeys.add(key)
    }
  }

  const remainingColumns = visibleColumns.filter(
    (col) => !usedKeys.has(col.name as ColumnKey)
  )

  return [...orderedColumns, ...remainingColumns]
})

/**
 * Since gotoRow can be a function, a single or an array of GotoAction
 * We transform the function to an instance of GotoAction
 * If a single instance we transform to GotoAction[]
 */
const normalizedGotoRows = computed<GotoAction<Row>[]>(() => {
  if (!props.gotoRow) return []
  if (typeof props.gotoRow === 'function') {
    return [{ key: 'goto', handler: props.gotoRow, icon: 'details' }]
  }
  return Array.isArray(props.gotoRow) ? props.gotoRow : [props.gotoRow]
})

const baseColumns = computed(() =>
  columns.value.filter(
    (c) => !(props.hideColumns ?? []).includes(c.name as ColumnKey)
  )
)

const visibleToggles = computed(() => {
  return visibleColumnKeys.value?.filter((key) =>
    togglableColumnKeys.value.includes(key)
  )
})

const visibleTogglesCount = computed(() => {
  return visibleToggles.value.length
})
</script>

<style>
/** Popup inherits the table column width, resulting in an overly wide wrapper  */
.q-popup-proxy-in-table {
  min-width: unset !important;
}
</style>

<style scoped>
/** Mimics the clearable quasar component style */
.hover-opacity {
  opacity: 0.6;
}

.hover-opacity:hover {
  opacity: 1;
}

.zod-table-no-vertical-padding {
  padding-top: 0 !important;
  padding-bottom: 0 !important;
}

.zod-table-no-horizontal-padding {
  padding-left: 0 !important;
  padding-right: 0 !important;
}
</style>
