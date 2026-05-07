import { MaybeRefOrGetter, toValue } from "vue"

export type MaybeTypeOrRowGetter<T, Row> =
  | MaybeRefOrGetter<T>
  | ((row: Row) => T)

export function toRowValue<T, Row>(
  input: MaybeTypeOrRowGetter<T, Row> | undefined,
  row: Row,
  fallback?: T,
): T | undefined {
  if (typeof input === 'function') {
    return (input as (r: Row) => T)(row)
  }
  return toValue(input as MaybeRefOrGetter<T>) ?? fallback
}