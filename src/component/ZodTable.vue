<template>
  <q-table
    :columns="columns"
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
          v-if="hasActions && props.editable"
          auto-width
          :class="props.headerClass"
          :style="props.headerStyle"
        ></q-th>
      </q-tr>
    </template>
    <template v-slot:body="slotProps">
      <q-tr :props="slotProps">
        <q-td v-for="col in slotProps.cols" :key="col.name" :props="slotProps">
          <!-- Dynamic slot for custom cell rendering: body-cell-[name] -->
          <slot :name="`body-cell-${col.name}`" v-bind="slotProps" :col="col" :row="slotProps.row">
            <!-- boolean fields -->
            <q-checkbox
              v-if="col.colEditType === 'checkbox'"
              v-model="slotProps.row[col.name]"
              @update:model-value="() => props.updateRow?.(slotProps.row)"
              v-bind="visualProps(col)"
            />
            <!-- enum and foreign key fields -->
            <q-select
              v-else-if="col.colEditType === 'dynamic-dropdown' || col.colEditType === 'static-dropdown'"
              v-model="slotProps.row[col.name]"
              :options="col.options"
              v-bind="visualProps(col)"
              @update:model-value="() => props.updateRow?.(slotProps.row)"
            />
            <!-- text and number fields -->
            <template v-else>
              {{ slotProps.row[col.name] }}
              <template v-if="col.editable">
                <q-popup-edit
                  v-model="slotProps.row[col.name]"
                  auto-save
                  v-slot="scope"
                  :ref="(el: any) => setPopupRef(el, slotProps.rowIndex, col.name)"
                  @save="(newValue: any) => handleSave(slotProps.row, col.name, newValue)"
                >
                  <q-input
                    v-if="col.colEditType === 'text'"
                    v-model="scope.value"
                    v-bind="inputProps(scope, slotProps.rowIndex, col.name, focusMove, columns)"
                  />
                  <q-input
                    v-if="['integer', 'real'].includes(col.colEditType)"
                    v-model.number="scope.value"
                    v-bind="{
                      ...inputProps(scope, slotProps.rowIndex, col.name, focusMove, columns),
                      ...numericInputHandlers(col.colEditType, scope),
                    }"
                  />
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
        <q-btn
          v-if="canAdd && props.editable"
          label="Toevoegen"
          icon="add"
          color="primary"
          flat
          dense
          @click="addNewRow"
        />
        <q-space />
        <div class="row items-center">
          <span class="q-mr-md">Records per page:</span>
          <q-select
            :model-value="scope.pagination.rowsPerPage"
            :options="rowsPerPageOptions"
            dense
            options-dense
            borderless
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
import { QTableColumn, useQuasar } from 'quasar'
import { capitalize, intersects } from 'radashi'
import { computed } from 'vue'
import z from 'zod'
import {
  getColumnMetadata,
  inputProps,
  numericInputHandlers,
  visualProps,
  ZodTableColumnProps,
  type ColEditType,
} from './edit-utils'
import { useTableFocus } from './useTableFocus'

//TODO! navigatie in de tabel kritisch bekijken, is dat te vereenvoudigen ?

type RowModel = z.ZodObject
type Row = z.infer<RowModel>
type RowKey = keyof Row | '*'

const $q = useQuasar()

defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(
  defineProps<{
    columnLabels?: Partial<Record<RowKey, string>>
    columnOptions?: Partial<Record<RowKey, ZodTableColumnProps>>
    rowKey: string
    rowModel: z.ZodObject
    data?: Row[]
    headerClass?: string
    headerStyle?: string
    editable: boolean
    editableColumns?: Array<RowKey>
    hideColumns?: Array<RowKey>
    rowId: (row: Row) => string | number
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

const columns = computed<(QTableColumn & ZodTableColumnProps)[]>(() =>
  Object.keys(props.rowModel.shape)
    .filter((key) => !(props.hideColumns ?? []).includes(key as RowKey))
    .map((key) => {
      const keyCast = key as RowKey
      const colSchema = props.rowModel.shape[key] as z.ZodType
      const meta = getColumnMetadata(colSchema)

      const externalOptions = props.columnOptions?.[keyCast]

      // If dynamic or enum, it's a dropdown
      const colEditType: ColEditType = externalOptions ? 'dynamic-dropdown' : meta.colEditType
      const editable = props.editable && intersects(props.editableColumns ?? [], [keyCast, '*'])

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
</script>

<style scoped></style>
