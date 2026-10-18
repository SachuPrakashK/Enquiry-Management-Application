import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { AdminRole } from '../shared/models';
export const authGuard: CanActivateFn = () =>
  inject(AuthService).authenticated() || inject(Router).createUrlTree(['/auth/sign-in']);
export const guestGuard: CanActivateFn = () =>
  !inject(AuthService).authenticated() || inject(Router).createUrlTree(['/admin/dashboard']);
export const roleGuard =
  (...roles: AdminRole[]): CanActivateFn =>
  () =>
    inject(AuthService).hasRole(...roles) || inject(Router).createUrlTree(['/admin/dashboard']);
