import { HttpErrorResponse } from '@angular/common/http';
export function errorMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0 || error.status === 502 || error.status === 504)
      return 'The API is unavailable. Start the local API and try again.';
    if (error.status === 404) return 'This record could not be found. It may have been deleted.';
    if (error.status === 401) return 'Your session is no longer valid. Please sign in again.';
    if (error.status === 403) return 'You do not have permission to perform this action.';
    const body: unknown = error.error;
    if (body && typeof body === 'object' && 'message' in body && typeof body.message === 'string')
      return body.message;
  }
  return 'The request failed. Please try again.';
}
export function shouldShowErrorToast(error: unknown): boolean {
  return !(error instanceof HttpErrorResponse && (error.status === 401 || error.status === 403));
}
