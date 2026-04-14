import type { DefineComponent } from 'vue'

declare module '@vue/runtime-core' {
  export interface GlobalComponents {
    ZodTable: DefineComponent<any, any, any>
  }
}

export {}