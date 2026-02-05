import { createApp } from 'vue';
import { Quasar } from 'quasar';
import '@quasar/extras/material-icons/material-icons.css';
import 'quasar/src/css/index.sass';

import App from './App.vue';

const app = createApp(App);

app.use(Quasar, {
  plugins: {}
});

// Register the component manually since we are not running the app extension script in this lite setup
// In a full Quasar CLI app, the app extension would handle this.
import ZodTable from '../../src/component/ZodTable.vue';
app.component('ZodTable', ZodTable);

app.mount('#app');
