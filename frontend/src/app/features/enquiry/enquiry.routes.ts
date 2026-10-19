import { Routes } from '@angular/router';
import { EnquiryStore } from './enquiry.store';
export const enquiryRoutes: Routes = [
  {
    path: '',
    providers: [EnquiryStore],
    loadComponent: () => import('./enquiry-list').then((m) => m.EnquiryList),
    children: [
      { path: 'create', loadComponent: () => import('./enquiry-form').then((m) => m.EnquiryForm) },
      { path: ':id/edit', loadComponent: () => import('./enquiry-form').then((m) => m.EnquiryForm) },
    ],
  },
  { path: ':id', loadComponent: () => import('./enquiry-detail').then((m) => m.EnquiryDetail) },
];
