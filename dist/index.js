/**
 * Quasar App Extension index/runner script
 * (runs on each dev/build)
 *
 * Docs: https://quasar.dev/app-extensions/development-guide/index-api
 */
export default function (api) {
    api.extendQuasarConf((conf) => {
        conf.boot?.push('~@radon/quasar-app-extension-zod-table/dist/boot/register.js');
    });
}
//# sourceMappingURL=index.js.map