/**
 * Quasar App Extension index/runner script
 * (runs on each dev/build)
 *
 * Docs: https://quasar.dev/app-extensions/development-guide/index-api
 */

import { IndexAPI } from '@quasar/app-vite';

export default function (api: IndexAPI) {
  api.extendQuasarConf((conf) => {
    conf.boot?.push('~@radon-be/quasar-app-extension-zod-table/dist/boot/register.js');
  });
}
