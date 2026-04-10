import z from 'zod'

/**
 * Flatten complex classes to dot-noted-properties
 *
 * const health = { type: 'default', office: { name: 'health office', meta: { foo: 'bar' }}}
 *
 * outputs: { type: 'default', 'office.name': 'health office', 'office.meta.foo': 'bar' }
 *
 * @param schema z.ZodTypeAny
 * @param prefix String - Mostly used recursively
 * @returns
 */
export function flattenSchema(schema: z.ZodTypeAny, prefix = ''): Record<string, z.ZodTypeAny> {
  const flat: Record<string, z.ZodTypeAny> = {}

  if (schema instanceof z.ZodObject) {
    for (const key in schema.shape) {
      const fieldSchema = schema.shape[key]
      const newKey = prefix ? `${prefix}.${key}` : key

      // unwrap optional or nullable types
      const unwrapped = fieldSchema._def?.innerType || fieldSchema

      if (unwrapped instanceof z.ZodObject) {
        Object.assign(flat, flattenSchema(unwrapped, newKey))
      } else {
        flat[newKey] = unwrapped
      }
    }
  }

  return flat
}

// safely get nested value
export function getNestedValue(obj: any, path: string) {
  return path.split('.').reduce((acc, key) => acc?.[key], obj)
}

// safely set nested value
export function setNestedValue<T extends object>(obj: T, path: string, value: unknown) {
  const keys = path.split('.')
  let curr: any = obj
  keys.forEach((k, i) => {
    if (i === keys.length - 1) {
      curr[k] = value
    } else {
      curr[k] = curr[k] ?? {}
      curr = curr[k]
    }
  })
}
