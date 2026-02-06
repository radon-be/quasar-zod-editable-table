import z from 'zod'

export type ColEditType = 'text' | 'integer' | 'real' | 'static-dropdown' | 'dynamic-dropdown' | 'checkbox'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface ColumnMetadata<T = any> {
  colEditType: ColEditType
  options?: T[]
  optionLabel?: string | ((opt: T) => string)
  optionValue?: string | ((opt: T) => any)
}

export function getColumnMetadata(schema: z.ZodType): ColumnMetadata {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const json = schema.toJSONSchema()

  if (!json) return { colEditType: 'text' }

  // Handle nullable/optional types which might appear as arrays (e.g. ["string", "null"])
  const type = Array.isArray(json.type) ? json.type.find((t: string) => t !== 'null') : json.type

  if (json.enum) {
    return {
      colEditType: 'static-dropdown',
      options: json.enum,
    }
  }

  switch (type) {
    case 'string':
      return { colEditType: 'text' }
    case 'boolean':
      return { colEditType: 'checkbox' }
    case 'integer':
      return { colEditType: 'integer' }
    case 'number':
      return { colEditType: 'real' }
    default:
      return { colEditType: 'text' }
  }
}
