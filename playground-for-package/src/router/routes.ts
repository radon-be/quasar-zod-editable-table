import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('src/AppClient.vue'),
  },
  {
    path: '/server',
    component: () => import('src/AppServer.vue'),
  },
];

export default routes;
