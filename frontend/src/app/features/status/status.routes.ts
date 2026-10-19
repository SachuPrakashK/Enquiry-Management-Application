import { Routes } from '@angular/router';
export const statusRoutes: Routes = [
  {
    path: '',
    data: {
      kind: 'statuses',
    },
    loadComponent: () => import('../masters/master-list').then((m) => m.MasterList),
  },
  {
    path: 'create',
    data: {
      kind: 'statuses',
    },
    loadComponent: () => import('../masters/master-form').then((m) => m.MasterForm),
  },
  {
    path: ':id/edit',
    data: {
      kind: 'statuses',
    },
    loadComponent: () => import('../masters/master-form').then((m) => m.MasterForm),
  },
];
