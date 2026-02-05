// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface ColumnOption<T = any> {
  options: T[];
  optionLabel?: string | ((opt: T) => string);
  optionValue?: string | ((opt: T) => any);
}
