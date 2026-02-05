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
            <q-checkbox
              v-if="col.colEditType === 'checkbox'"
              v-model="slotProps.row[col.name]"
              dense
              :disable="!col.editable"
              @update:model-value="() => props.updateRow?.(slotProps.row)"
            />
            <template v-else>
              {{ renderCell(slotProps.row[col.name], col) }}
              <template v-if="col.editable">
                <q-popup-edit
                  v-model="slotProps.row[col.name]"
                  v-slot="scope"
                  :ref="(el) => setPopupRef(el, slotProps.rowIndex, col.name)"
                  @save="(newValue) => handleSave(slotProps.row, col.name, newValue)"
                >
                  <q-input
                    v-if="col.colEditType === 'text'"
                    v-model="scope.value"
                    v-bind="inputProps(col.colEditType, scope, slotProps.rowIndex, col.name)"
                  />
                  <q-input
                    v-if="['integer', 'real'].includes(col.colEditType)"
                    v-model.number="scope.value"
                    v-bind="{
                      ...inputProps(col.colEditType, scope, slotProps.rowIndex, col.name),
                      ...numericInputHandlers(col.colEditType, scope)
                    }"
                  />
                  <q-select
                    v-if="col.colEditType === 'dropdown'"
                    v-model="scope.value"
                    :options="col.options"
                    :option-label="col.optionLabel"
                    :option-value="col.optionValue"
                    :emit-value="col.emitValue"
                    :map-options="col.mapOptions"
                    v-bind="inputProps(col.colEditType, scope, slotProps.rowIndex, col.name)"
                    @update:model-value="scope.set"
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
            @update:model-value="(val) => (scope.pagination.rowsPerPage = val)"
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
  import z from 'zod';
  import { computed, nextTick, ref } from 'vue';
  import { type QTableColumn, useQuasar } from 'quasar';
  import type { ColumnOption } from './types';

  type RowModel = z.ZodObject<T>;
  type Row = z.infer<RowModel>;
  // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
  type RowKey = keyof Row | '*';

  defineOptions({
    inheritAttrs: false
  });

  const props = withDefaults(
    defineProps<{
      columnLabels?: Partial<Record<RowKey, string>>;
      columnOptions?: Partial<Record<RowKey, ColumnOption>>;
      rowKey: string;
      rowModel: RowModel;
      data?: Row[];
      headerClass?: string;
      headerStyle?: string;
      editable: boolean;
      editableColumns?: Array<RowKey>;
      hideColumns?: Array<RowKey>;
      updateRow?: (row: Row) => void;
      addRow?: (row?: Row) => void;
      deleteRow?: (row: Row) => void;
      initialRowsPerPage?: number;
      actions?: Action[];
    }>(),
    {
      rowModel: () => z.object({}) as RowModel,
      data: () => [],
      headerClass: '',
      headerStyle: '',
      initialRowsPerPage: 5,
      actions: () => []
    }
  );

  const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);
  type PropType = { type: 'string' | 'integer' | 'number' | 'boolean'; enum?: string[] };
  type ColEditType = 'text' | 'integer' | 'real' | 'dropdown' | 'checkbox';
  type Action = 'add' | 'clone' | 'delete';

  const totalRows = computed(() => props.data?.length || 0);
  const rowsPerPageOptions = [3, 5, 7, 10, 15, 20, 25, 50];

  const hasActions = computed(() => props.actions && props.actions.length > 0);
  const canAdd = computed(() => props.actions?.includes('add'));
  const canClone = computed(() => props.actions?.includes('clone'));
  const canDelete = computed(() => props.actions?.includes('delete'));

  // Validate that required functions are provided for enabled actions
  // TODO DRYer maken !
  if (canAdd.value && !props.addRow) {
    console.warn('[EditableTable] Action "add" is enabled but addRow prop is not provided');
  }
  if (canClone.value && !props.addRow) {
    console.warn('[EditableTable] Action "clone" is enabled but addRow prop is not provided');
  }
  if (canDelete.value && !props.deleteRow) {
    console.warn('[EditableTable] Action "delete" is enabled but deleteRow prop is not provided');
  }

  const getPaginationRange = (page: number, rowsPerPage: number) => {
    const firstRow = (page - 1) * rowsPerPage + 1;
    const lastRow = Math.min(page * rowsPerPage, totalRows.value);
    return { firstRow, lastRow };
  };

  const getColumnLabel = (key: string) => (props.columnLabels as Record<string, string> | undefined)?.[key];

  const $q = useQuasar();

  const confirmDelete = (row: Row) => {
    $q.dialog({
      title: 'Confirm Delete',
      message: 'Are you sure you want to delete this row?',
      cancel: true,
      persistent: true
    }).onOk(() => {
      props.deleteRow?.(row);
    });
  };

  const cloneRow = (row: Row) => {
    const clonedRow = { ...row };
    props.addRow?.(clonedRow);
  };

  const addNewRow = () => {
    if (!props.addRow) return;
    props.addRow();
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const popupRefs = ref<Record<string, any>>({});
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const setPopupRef = (el: any, rowIndex: number, colName: string) => {
    if (el) {
      popupRefs.value[`${rowIndex}_${colName}`] = el;
    }
  };

  const moveFocus = (rowIndex: number, currentColName: string, direction: 'next' | 'prev') => {
    const visibleCols = columns.value;
    const currentIdx = visibleCols.findIndex((c) => c.name === currentColName);
    let targetRowIndex = rowIndex;
    let targetColIndex = currentIdx + (direction === 'next' ? 1 : -1);

    // Safety break to prevent infinite loops
    let checks = 0;
    const maxChecks = 1000;

    while (checks < maxChecks) {
      checks++;

      // Handle wrapping
      if (targetColIndex >= visibleCols.length) {
        targetRowIndex++;
        targetColIndex = 0;
      } else if (targetColIndex < 0) {
        targetRowIndex--;
        targetColIndex = visibleCols.length - 1;
      }

      // Check existence
      // We rely on popupRefs to know if a cell is editable and rendered
      const nextCol = visibleCols[targetColIndex];
      const refKey = `${targetRowIndex}_${nextCol.name}`;

      if (popupRefs.value[refKey]) {
        popupRefs.value[refKey].show();
        return;
      }

      // Stop if we went too far out of likely bounds (e.g. end of page)
      if (direction === 'next' && targetRowIndex > rowIndex + 1) return;
      if (direction === 'prev' && targetRowIndex < rowIndex - 1 && targetRowIndex < 0) return;

      targetColIndex += direction === 'next' ? 1 : -1;
    }
  };

  const handleSave = (row: Row, colName: RowKey, newValue: string) => {
    // TypeScript can't narrow generic indexed types, so we need to suppress this
    (row as any)[colName] = newValue;
    props.updateRow?.(row);
  };

  const parseNumericValue = (colEditType: string, value: string | number | null) => {
    const parser = colEditType === 'integer' ? parseInt : parseFloat;
    return value ? parser(value.toString()) : 0;
  };

  const numericInputHandlers = (
    colEditType: string,
    scope: { value: unknown; set: () => void; cancel: () => void }
  ) => ({
    'onUpdate:modelValue': (val: string | number | null) => {
      scope.value = parseNumericValue(colEditType, val);
    },
    onBlur: (e: Event) => {
      scope.value = parseNumericValue(colEditType, (e.target as HTMLInputElement).value);
    },
    type: 'number' as const,
    'input-class': 'no-spinners',
    step: colEditType === 'integer' ? ('1' as const) : ('any' as const)
  });

  const inputProps = (
    editType: ColEditType,
    scope: { value: unknown; set: () => void; cancel: () => void },
    rowIndex: number,
    colName: string
  ) => {
    return {
      autofocus: true,
      dense: true,
      onKeydown: (e: KeyboardEvent) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          scope.set();
        }
        if (e.key === 'Tab') {
          e.preventDefault();
          scope.set();
          // Wait for the popup to close and value to settle
          nextTick(() => {
            moveFocus(rowIndex, colName, e.shiftKey ? 'prev' : 'next');
          });
        }
      }
    };
  };

  const CONVERT_COL_TYPES: Record<string, ColEditType> = {
    string: 'text',
    integer: 'integer',
    number: 'real',
    boolean: 'checkbox'
  };

  const jsonSchema = computed(() => (props.rowModel as any).toJSONSchema());

  const columns = computed<QTableColumn[]>(() =>
    Object.keys(props.rowModel.shape)
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
      .filter((key) => !(props.hideColumns ?? []).includes(key as RowKey))
      .map((key) => {
        const colSchema = jsonSchema.value.properties?.[key] as PropType;

        // Handle nullable/optional types which might appear as arrays (e.g. ["string", "null"])
        const schemaType = Array.isArray(colSchema.type)
          ? colSchema.type.find((t: string) => t !== 'null')
          : colSchema.type;

        const keyCast = key as RowKey;
        const externalOptions = props.columnOptions?.[keyCast];

        const colEditType: ColEditType =
          colSchema.enum || externalOptions ? 'dropdown' : (CONVERT_COL_TYPES[schemaType as string] ?? 'text');

        const editable =
          props.editable &&
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
          (props.editableColumns?.includes(keyCast) || props.editableColumns?.includes('*'));

        const options = externalOptions ? externalOptions.options : (colSchema.enum ?? []);
        const optionLabel = externalOptions?.optionLabel;
        const optionValue = externalOptions?.optionValue;
        const emitValue = externalOptions?.emitValue ?? !!optionValue;
        const mapOptions = externalOptions?.mapOptions ?? !!optionValue;

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
          emitValue,
          mapOptions
        };
      })
  );

  // Helper to render the cell value
  // If options are objects, we might need to find the label corresponding to the value
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderCell = (val: any, col: any) => {
    if (col.colEditType !== 'dropdown' || !col.optionValue || !col.options) {
      return val;
    }
    // Try to find the selected option to display its label
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const selected = col.options.find((opt: any) => {
      const optVal = typeof col.optionValue === 'function' ? col.optionValue(opt) : opt[col.optionValue];
      // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
      return optVal === val;
    });

    if (selected) {
      return typeof col.optionLabel === 'function' ? col.optionLabel(selected) : selected[col.optionLabel || 'label'];
    }
    return val;
  };
</script>

<style scoped></style>
