import { Routes } from '@angular/router';
export const categoryRoutes: Routes = [
  {
    path: '',
    data: {
      kind: 'categories',
    },
    loadComponent: () => import('../masters/master-list').then((m) => m.MasterList),
  },
  {
    path: 'create',
    data: {
      kind: 'categories',
    },
    loadComponent: () => import('../masters/master-form').then((m) => m.MasterForm),
  },
  {
    path: ':id/edit',
    data: {
      kind: 'categories',
    },
    loadComponent: () => import('../masters/master-form').then((m) => m.MasterForm),
  },
];
