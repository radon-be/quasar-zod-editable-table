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
          <!-- boolean and dropdown columns don't use popup edit -->
          <slot :name="`body-cell-${col.name}`" v-bind="slotProps" :col="col" :row="slotProps.row">
            <q-checkbox
              v-if="col.colEditType === 'boolean'"
              v-model="slotProps.row[col.name]"
              @update:model-value="() => props.updateRow?.(slotProps.row)"
              v-bind="visualProps(col)"
              :disable="!props.editable || !col.editable"
            />

            <q-select
              v-else-if="col.colEditType === 'static-enum'"
              v-model="slotProps.row[col.name]"
              :options="col.options"
              v-bind="visualProps(col)"
              @update:model-value="() => props.updateRow?.(slotProps.row)"
              :disable="!props.editable || !col.editable"
            />

            <q-select
              v-else-if="'foreign-key' === col.colEditType"
              v-model="slotProps.row[col.name]"
              :options="col.options"
              v-bind="visualProps(col)"
              @update:model-value="() => props.updateRow?.(slotProps.row)"
              :disable="!props.editable || !col.editable"
              :option-value="col.optionValue"
              :option-label="col.optionLabel"
            />

            <template v-else>
              <!-- any other column types (that use popup edit) -->
              {{ slotProps.row[col.name] }}
              <template v-if="col.editable">
                <q-popup-edit
                  v-model="slotProps.row[col.name]"
                  auto-save
                  v-slot="scope"
                  @save="(newValue: any) => handleSave(slotProps.row, col.name, newValue)"
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
import { QTableColumn, useQuasar } from 'quasar'
import { capitalize, intersects } from 'radashi'
import { computed } from 'vue'
import z from 'zod'
import { getColumnInfo, numericProps, visualProps, ZodTableColumnProps } from './edit-utils'

//TODO! navigatie in de tabel kritisch bekijken, is dat te vereenvoudigen ?

const $q = useQuasar()

defineOptions({
  inheritAttrs: false,
})

type Row = z.infer<z.ZodObject<T>>
type ColumnKey = Extract<keyof Row, string>

const props = withDefaults(
  defineProps<{
    rowModel: z.ZodObject<T>
    columnLabels?: Partial<Record<ColumnKey, string>>
    extraColumnOptions?: Partial<Record<ColumnKey, ZodTableColumnProps>>
    rowKey: ColumnKey
    data: Row[]
    headerClass?: string
    headerStyle?: string
    editable: boolean
    editableColumns?: Array<ColumnKey | '*'>
    hideColumns?: Array<ColumnKey>
    updateRow?: (row: Row) => void
    addRow?: (row?: Row) => void
    deleteRow?: (row: Row) => void
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

const onPopupKeydown = (e: KeyboardEvent, scope: { set: () => void }) => {
  if (e.key === 'Enter') {
    e.preventDefault()
    scope.set()
  }
}

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
  props.addRow?.(row)
}

const addNewRow = () => {
  props.addRow?.()
}

const handleSave = (row: Row, colName: ColumnKey, newValue: string) => {
  const key = colName as keyof Row
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(row as any)[key] = newValue
  props.updateRow?.(row)
}

const columns = computed<(QTableColumn & ZodTableColumnProps)[]>(() =>
  Object.keys(props.rowModel.shape)
    .filter((key) => !(props.hideColumns ?? []).includes(key as ColumnKey))
    .map((key) => {
      const keyCast = key as ColumnKey
      const colSchema = props.rowModel.shape[key] as z.ZodType
      const meta = getColumnInfo(colSchema, key, props.extraColumnOptions?.[keyCast])
      return {
        name: key,
        label: getColumnLabel(key) ?? capitalize(key),
        field: key,
        align: 'left' as const,
        sortable: true,
        headerClasses: props.headerClass,
        headerStyle: props.headerStyle,
        ...meta,
        editable: props.editable && intersects(props.editableColumns ?? [], [keyCast, '*']),
        colSchema,
      }
    }),
)
</script>

<style scoped></style>
