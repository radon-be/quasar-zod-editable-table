import { boot } from 'quasar/wrappers';
import ZodTable from '../component/ZodTable.vue';

export default boot(({ app }) => {
  app.component('ZodTable', ZodTable);
});
