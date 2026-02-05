import { ref } from 'vue';
import type { QTableColumn } from 'quasar';

export function useTableFocus() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const popupRefs = ref<Record<string, any>>({});

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const setPopupRef = (el: any, rowIndex: number, colName: string) => {
    if (el) {
      popupRefs.value[`${rowIndex}_${colName}`] = el;
    }
  };

  const moveFocus = (
    rowIndex: number,
    currentColName: string,
    direction: 'next' | 'prev',
    visibleCols: QTableColumn[]
  ) => {
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
      // If nextCol is undefined (e.g. empty columns), break or continue?
      if (!nextCol) break;

      const refKey = `${targetRowIndex}_${nextCol.name}`;
      const popup = popupRefs.value[refKey];

      if (popup) {
        popup.show();
        return;
      }

      // Stop if we went too far out of likely bounds (e.g. end of page)
      if (direction === 'next' && targetRowIndex > rowIndex + 1) return;
      if (direction === 'prev' && targetRowIndex < rowIndex - 1 && targetRowIndex < 0) return;

      targetColIndex += direction === 'next' ? 1 : -1;
    }
  };

  return {
    popupRefs,
    setPopupRef,
    moveFocus
  };
}
