import { boot } from 'quasar/wrappers';
import MyButton from '../component/MyButton.vue';
import ZodTable from '../component/ZodTable.vue';

export default boot(({ app }) => {
  app.component('MyButton', MyButton);
  app.component('ZodTable', ZodTable);
});
