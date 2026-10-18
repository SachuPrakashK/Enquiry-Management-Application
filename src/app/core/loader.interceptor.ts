import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs';
import { LoaderService } from './loader.service';

export const loaderInterceptor: HttpInterceptorFn = (request, next) => {
  const loader = inject(LoaderService);
  loader.start();

  return next(request).pipe(finalize(() => loader.stop()));
};
