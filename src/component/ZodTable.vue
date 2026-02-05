<template>
  <q-table :columns="columns" :rows="props.data" :row-key="props.rowKey" :rows-per-page-options="rowsPerPageOptions"
    :pagination="{ rowsPerPage: props.initialRowsPerPage }" v-bind="$attrs">
    <template v-slot:header="headerProps">
      <q-tr :props="headerProps">
        <q-th v-for="col in headerProps.cols" :key="col.name" :props="headerProps">
          {{ col.label }}
        </q-th>
        <q-th v-if="hasActions && props.editable" auto-width :class="props.headerClass"
          :style="props.headerStyle"></q-th>
      </q-tr>
    </template>
    <template v-slot:body="slotProps">
      <q-tr :props="slotProps">
        <q-td v-for="col in slotProps.cols" :key="col.name" :props="slotProps">
          <!-- Dynamic slot for custom cell rendering: body-cell-[name] -->
          <slot :name="`body-cell-${col.name}`" v-bind="slotProps" :col="col" :row="slotProps.row">
            <q-checkbox v-if="col.colEditType === 'checkbox'" v-model="slotProps.row[col.name]" dense
              :disable="!col.editable" @update:model-value="() => props.updateRow?.(slotProps.row)" />
            <template v-else>
              {{ renderNonEdit(slotProps.row[col.name], col) }}
              <template v-if="col.editable">
                <q-popup-edit v-model="slotProps.row[col.name]" v-slot="scope"
                  :ref="(el: any) => setPopupRef(el, slotProps.rowIndex, col.name)"
                  @save="(newValue:any) => handleSave(slotProps.row, col.name, newValue)">
                  <q-input v-if="col.colEditType === 'text'" v-model="scope.value"
                    v-bind="inputProps(scope, slotProps.rowIndex, col.name)" />
                  <q-input v-if="['integer', 'real'].includes(col.colEditType)" v-model.number="scope.value" v-bind="{
                      ...inputProps(scope, slotProps.rowIndex, col.name),
                      ...numericInputHandlers(col.colEditType, scope),
                    }" />
                  <q-select v-if="['dynamic-dropdown', 'static-dropdown'].includes(col.colEditType)"
                    v-model="scope.value" :options="col.options" v-bind="{
                      ...inputProps(scope, slotProps.rowIndex, col.name),
                      ...getDropdownProps(col),
                    }" @update:model-value="scope.set" />
                </q-popup-edit>
              </template>
            </template>
          </slot>
        </q-td>
        <q-td v-if="hasActions && props.editable" auto-width>
          <q-btn v-if="canClone" icon="content_copy" flat dense color="primary" @click="cloneRow(slotProps.row)" />
          <q-btn v-if="canDelete" icon="delete" flat dense color="negative" @click="confirmDelete(slotProps.row)" />
        </q-td>
      </q-tr>
    </template>
    <template v-slot:bottom="scope">
      <div class="row items-center full-width">
        <q-btn v-if="canAdd && props.editable" label="Toevoegen" icon="add" color="primary" flat dense
          @click="addNewRow" />
        <q-space />
        <div class="row items-center">
          <span class="q-mr-md">Records per page:</span>
          <q-select :model-value="scope.pagination.rowsPerPage" :options="rowsPerPageOptions" dense options-dense
            borderless @update:model-value="(val: any) => (scope.pagination.rowsPerPage = val)" />
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
import { useQuasar, type QTableColumn } from 'quasar'
import { computed, nextTick } from 'vue'
import z from 'zod'
import type { ColumnOption } from './types'
import { useTableFocus } from './useTableFocus'
import { getColumnMetadata, type ColEditType } from './zod-utils'

//TODO! dropdowns altijd tonen, ook in niet-edit modus
//TODO! navigatie in de tabel kritisch bekijken, is dat te vereenvoudigen ?

interface ZodTableColumn extends QTableColumn {
  colEditType: ColEditType
  options?: unknown[]
  optionLabel?: string | ((opt: unknown) => string)
  optionValue?: string | ((opt: unknown) => unknown)
  colSchema?: z.ZodType
}

type RowModel = z.ZodObject<T>
type Row = z.infer<RowModel>
type RowKey = keyof Row | '*'

defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(
  defineProps<{
    columnLabels?: Partial<Record<RowKey, string>>
    columnOptions?: Partial<Record<RowKey, ColumnOption>>
    rowKey: string
    rowModel: RowModel
    data?: Row[]
    headerClass?: string
    headerStyle?: string
    editable: boolean
    editableColumns?: Array<RowKey>
    hideColumns?: Array<RowKey>
    updateRow?: (row: Row) => void
    addRow?: (row?: Row) => void
    deleteRow?: (row: Row) => void
    initialRowsPerPage?: number
    actions?: Action[]
  }>(),
  {
    rowModel: () => z.object({}) as RowModel,
    data: () => [],
    headerClass: '',
    headerStyle: '',
    initialRowsPerPage: 5,
    actions: () => [],
  },
)

const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1)
type Action = 'add' | 'clone' | 'delete'

const totalRows = computed(() => props.data?.length || 0)
const rowsPerPageOptions = [3, 5, 7, 10, 15, 20, 25, 50]

const hasActions = computed(() => props.actions && props.actions.length > 0)
const canAdd = computed(() => props.actions?.includes('add') && props.addRow)
const canClone = computed(() => props.actions?.includes('clone') && props.addRow)
const canDelete = computed(() => props.actions?.includes('delete') && props.deleteRow)

const getPaginationRange = (page: number, rowsPerPage: number) => {
  const firstRow = (page - 1) * rowsPerPage + 1
  const lastRow = Math.min(page * rowsPerPage, totalRows.value)
  return { firstRow, lastRow }
}

const getColumnLabel = (key: string) => (props.columnLabels as Record<string, string> | undefined)?.[key]

const $q = useQuasar()

const { popupRefs, setPopupRef, moveFocus: focusMove } = useTableFocus()

const confirmDelete = (row: Row) => {
  $q.dialog({
    title: 'Confirm Delete',
    message: 'Are you sure you want to delete this row?',
    cancel: true,
    persistent: true,
  }).onOk(() => {
    props.deleteRow?.(row)
  })
}

const cloneRow = (row: Row) => {
  const clonedRow = { ...row }
  props.addRow?.(clonedRow)
}

const addNewRow = () => {
  if (!props.addRow) return
  props.addRow()
}

const handleSave = (row: Row, colName: RowKey, newValue: string) => {
  const key = colName as keyof Row
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(row as any)[key] = newValue
  props.updateRow?.(row)
}

const parseNumericValue = (colEditType: string, value: string | number | null) => {
  const parser = colEditType === 'integer' ? parseInt : parseFloat
  return value ? parser(value.toString()) : 0
}

const numericInputHandlers = (colEditType: string, scope: { value: unknown; set: () => void; cancel: () => void }) => ({
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

const getDropdownProps = (col: ZodTableColumn) => {
  if (col.colEditType === 'dynamic-dropdown') {
    return {
      'option-label': col.optionLabel,
      'option-value': col.optionValue,
      'emit-value': true,
      'map-options': true,
    }
  }
  return {}
}

const inputProps = (
  scope: { value: unknown; set: () => void; cancel: () => void },
  rowIndex: number,
  colName: string,
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
          focusMove(rowIndex, colName, e.shiftKey ? 'prev' : 'next', columns.value)
        })
      }
    },
  }
}

const columns = computed<ZodTableColumn[]>(() =>
  Object.keys(props.rowModel.shape)
    .filter((key) => !(props.hideColumns ?? []).includes(key as RowKey))
    .map((key) => {
      const keyCast = key as RowKey
      const colSchema = props.rowModel.shape[key] as z.ZodType
      const meta = getColumnMetadata(colSchema)

      const externalOptions = props.columnOptions?.[keyCast]

      // If dynamic or enum, it's a dropdown
      const colEditType: ColEditType = externalOptions ? 'dynamic-dropdown' : meta.colEditType

      const editable =
        props.editable && (props.editableColumns?.includes(keyCast) || props.editableColumns?.includes('*'))

      const options = externalOptions?.options ?? meta.options ?? []
      const optionLabel = externalOptions?.optionLabel ?? 'label'
      const optionValue = externalOptions?.optionValue ?? 'value'

      return {
        name: key,
        label: getColumnLabel(key) ?? capitalize(key),
        field: key,
        align: 'left' as const,
        sortable: true,
        headerClasses: props.headerClass,
        headerStyle: props.headerStyle,
        colEditType,
        editable,
        options,
        optionLabel,
        optionValue,
        colSchema,
      }
    }),
)
const renderNonEdit = (val: unknown, col: ZodTableColumn) => {
  if (col.colEditType !== 'dynamic-dropdown') {
    return val
  }

  const selected = col.options?.find((opt: unknown) => {
    const optVal =
      typeof col.optionValue === 'function'
        ? col.optionValue(opt)
        : (opt as Record<string, unknown>)[col.optionValue as string]
    return optVal === val
  })

  if (selected) {
    return typeof col.optionLabel === 'function'
      ? col.optionLabel(selected)
      : (selected as Record<string, unknown>)[col.optionLabel || 'label']
  }
  return val
}
</script>

<style scoped></style>
