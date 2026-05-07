import { type ZodTable as ZodTableComponent } from '@radon-be/quasar-app-extension-zod-table';

declare module '@vue/runtime-core' {
  export interface GlobalComponents {
    ZodTable: typeof ZodTableComponent;
  }
}

export {};