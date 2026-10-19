import { Routes } from '@angular/router';
import { UserStore } from './user.store';
export const userRoutes: Routes = [
  {
    path: '',
    providers: [UserStore],
    loadComponent: () => import('./user-list').then((m) => m.UserList),
    children: [
      { path: 'create', loadComponent: () => import('./user-form').then((m) => m.UserForm) },
      { path: ':id/edit', loadComponent: () => import('./user-form').then((m) => m.UserForm) },
    ],
  },
  { path: ':id', loadComponent: () => import('./user-detail').then((m) => m.UserDetail) },
];
