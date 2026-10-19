import { Routes } from '@angular/router';

import { authGuard, guestGuard, roleGuard } from './core/auth.guard';
export const routes: Routes = [
  {
    path: 'auth',
    loadComponent: () => import('./features/auth/auth-layout').then((m) => m.AuthLayout),
    children: [
      { path: '', redirectTo: 'sign-in', pathMatch: 'full' },
      { path: 'sign-in', canActivate: [guestGuard], loadComponent: () => import('./features/auth/login').then((m) => m.Login) },
      { path: 'register', canActivate: [guestGuard], loadComponent: () => import('./features/auth/register').then((m) => m.Register) },
      { path: 'forgot-password', canActivate: [guestGuard], loadComponent: () => import('./features/auth/forgot-password').then((m) => m.ForgotPassword) },
      { path: 'reset-password', canActivate: [guestGuard], loadComponent: () => import('./features/auth/reset-password').then((m) => m.ResetPassword) },
    ],
  },
  { path: 'login', redirectTo: 'auth/sign-in', pathMatch: 'full' },
  {
    path: 'admin',
    canActivate: [authGuard],
    canActivateChild: [authGuard],
    loadComponent: () => import('./core/admin-layout').then((m) => m.AdminLayout),
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/enquiry/dashboard').then((m) => m.Dashboard),
      },
      {
        path: 'profile',
        loadComponent: () => import('./features/users/profile').then((m) => m.Profile),
      },
      {
        path: 'users',
        canActivate: [roleGuard('Super Admin')],
        loadChildren: () => import('./features/users/user.routes').then((m) => m.userRoutes),
      },
      {
        path: 'follow-ups',
        loadComponent: () =>
          import('./features/enquiry/follow-up-list').then((m) => m.FollowUpList),
      },
      {
        path: 'statuses',
        canActivate: [roleGuard('Super Admin')],
        loadChildren: () => import('./features/status/status.routes').then((m) => m.statusRoutes),
      },
      {
        path: 'categories',
        canActivate: [roleGuard('Super Admin')],
        loadChildren: () =>
          import('./features/category/category.routes').then((m) => m.categoryRoutes),
      },
      {
        path: 'enquiries',
        loadChildren: () =>
          import('./features/enquiry/enquiry.routes').then((m) => m.enquiryRoutes),
      },
      { path: '**', loadComponent: () => import('./shared/not-found').then((m) => m.NotFound) },
    ],
  },
  { path: '', redirectTo: 'admin/dashboard', pathMatch: 'full' },
  { path: '**', loadComponent: () => import('./shared/not-found').then((m) => m.NotFound) },
];
