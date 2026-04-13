<template>
  <q-table
    :columns="filteredColumns"
    :rows="props.data"
    :row-key="props.rowKey"
    :rows-per-page-options="rowsPerPageOptions"
    :pagination="{ rowsPerPage: props.initialRowsPerPage }"
    v-bind="$attrs"
  >
    <template v-slot:header="headerProps">
      <q-tr :props="headerProps">
        <q-th v-for="col in headerProps.cols" :key="col.name" :props="headerProps">
          {{ col.label }}
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
      <q-tr :props="slotProps">
        <q-td
          v-for="col in slotProps.cols as (QTableColumn & ZodTableColumnProps)[]"
          :key="col.name"
          :props="slotProps"
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
                :model-value="getNestedValue(slotProps.row, col.name)"
                :options="col.options"
                v-bind="visualProps(col)"
                @update:model-value="
                  (val) => (setNestedValue(slotProps.row, col.name, val), props.updateRow?.(slotProps.row))
                "
                :disable="!col.editable"
                :clearable="
                  col.name in (extraColumnOptions ?? {}) &&
                  extraColumnOptions?.[col.name as ColumnKeyType<T>]?.clearable
                "
              />
            </template>

            <template v-else-if="'foreign-key' === col.colEditType">
              <q-select
                :model-value="getNestedValue(slotProps.row, col.name)"
                :options="col.options"
                v-bind="visualProps(col)"
                @update:model-value="
                  (val) => (setNestedValue(slotProps.row, col.name, val), props.updateRow?.(slotProps.row))
                "
                :disable="!col.editable"
                :option-value="col.optionValue"
                :option-label="col.optionLabel"
                :clearable="
                  col.name in (extraColumnOptions ?? {}) &&
                  extraColumnOptions?.[col.name as ColumnKeyType<T>]?.clearable
                "
              />
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
                        label="Now"
                        color="primary"
                        flat
                        @click="setNestedValue(slotProps.row, col.name, new Date().toISOString())"
                      />
                      <q-btn
                        v-close-popup
                        label="Clear"
                        color="primary"
                        flat
                        @click="setNestedValue(slotProps.row, col.name, undefined)"
                        v-if="typeof getNestedValue(slotProps.row, col.name) !== 'undefined'"
                      />
                      <q-btn v-close-popup label="Close" color="primary" flat />
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
                size="sm"
                dense
                color="primary"
                @click="gotoRow.handler(slotProps.row)"
                :title="gotoRow.label"
              />
            </template>
            <q-btn
              v-if="editable && canClone"
              icon="content_copy"
              size="sm"
              dense
              color="primary"
              @click="props.addRow?.(slotProps.row)"
              title="clone"
            />
            <q-btn
              v-if="editable && canDelete"
              icon="delete"
              size="sm"
              dense
              color="negative"
              @click="confirmDelete(slotProps.row)"
              title="delete"
            />
          </div>
        </q-td>
      </q-tr>
    </template>
    <template v-slot:bottom="scope">
      <div class="row items-center full-width">
        <div class="row items-center q-gutter-sm">
          <q-toggle v-if="showEditableToggle" v-model="editable" title="Editable" />
          <q-btn
            v-if="canAdd && editable"
            label="Toevoegen"
            icon="add"
            color="primary"
            size="sm"
            @click="props.addRow?.()"
          />
        </div>
        <q-space />
        <div class="row items-center q-gutter-sm">
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
            dense
            borderless
            optionsDense
          >
            <template v-slot:selected>
              {{ visibleTogglesCount }} / {{ togglableColumnKeys.length }} columns
            </template>
          </q-select>
          <span class="q-mr-sm q-ml-md">Records per page:</span>
          <q-select
            :model-value="scope.pagination.rowsPerPage"
            :options="rowsPerPageOptions"
            v-bind="visualProps('rowsPerPage')"
            @update:model-value="(val: any) => (scope.pagination.rowsPerPage = val)"
          />
          <span class="q-ml-md">
            {{ getPaginationRange(scope.pagination.page, scope.pagination.rowsPerPage).firstRow }}-{{
              getPaginationRange(scope.pagination.page, scope.pagination.rowsPerPage).lastRow
            }}
            of {{ totalRows }}
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
import { computed, ComputedRef, ref, watch } from 'vue'
import z from 'zod'
import { ColEditType, getColumnInfo, numericProps, visualProps, ZodTableColumnProps } from './edit-utils'
import { flattenSchema, getNestedValue, setNestedValue } from './nest-utils'
import { useDateTimeModel } from './datetime-composables'
import { ColumnKeyType, GotoAction, ZodRowType } from './table-types'

//TODO! navigatie in de tabel kritisch bekijken, is dat te vereenvoudigen ?
//TODO! All meta labels are english, consider translating via Key-Value property or translation files ?

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
    hideColumns?: Array<ColumnKey>
    togglableColumns?: Array<ColumnKey | '*'>
    updateRow?: (row: Row) => void
    addRow?: (row?: Row) => void
    deleteRow?: (row: Row) => void
    gotoRow?: ((row: Row) => void) | GotoAction<Row> | Array<GotoAction<Row>>
    initialRowsPerPage?: number
    actions?: Action[]
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
}>()

// Via v-model to optionally notify parent
const editable = defineModel<boolean>('editable')

const dateTimeStep = ref<'date' | 'time'>('date')

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
    title: 'Confirm Delete',
    message: 'Are you sure you want to delete this row?',
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
const _manualVisible = ref<ColumnKey[] | null>(null)
const visibleColumnKeys = computed<ColumnKey[]>({
  get(): ColumnKey[] {
    const defaults = baseColumns.value.map(c => c.name as ColumnKey)
    return (_manualVisible.value ?? defaults) as ColumnKey[]
  },
  set(val: ColumnKey[]) {
    _manualVisible.value = val
  }
})

const filteredColumns = computed(() => {
  const visibleSet = new Set(visibleColumnKeys.value)

  return baseColumns.value.filter((c) => {
    const key = c.name as ColumnKey

    // always show non-togglable columns
    if (!togglableColumnKeys.value.includes(key)) {
      return true
    }

    // togglable columns depend on selection
    return visibleSet.has(key)
  })
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
</style>
