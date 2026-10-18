import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { ToastService } from './toast.service';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const toast = inject(ToastService);
  const authenticationRequest = request.url.includes('/auth/');
  return next(request).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401 && !authenticationRequest) {
        auth.logout();
        toast.error('Your session is no longer valid. Please sign in again.');
        void router.navigate(['/auth/sign-in']);
      } else if (error instanceof HttpErrorResponse && error.status === 403) {
        toast.warning('You do not have permission to perform this action.');
      }
      return throwError(() => error);
    }),
  );
};
