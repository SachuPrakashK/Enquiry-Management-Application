import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError, map, Observable, of, switchMap, tap, throwError } from 'rxjs';
import { AdminRole, AdminUser, AuthSession } from '../shared/models';
import { API_BASE_URL } from './api.config';

const sessionKey = 'enquiry-admin-session';
type SignInResponse = { userId: string; role: AdminRole; token: string; expiresAt: number };

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly api = inject(API_BASE_URL);
  private readonly session = signal(this.readSession());
  private readonly authenticatedUser = signal<AdminUser | null>(null);
  readonly authenticated = computed(() => this.session() !== null);
  readonly currentUser = this.authenticatedUser.asReadonly();
  readonly role = computed<AdminRole | null>(() => this.session()?.role ?? null);
  readonly userId = computed(() => this.session()?.userId ?? null);
  readonly accessToken = computed(() => this.session()?.token ?? null);

  signIn(identifier: string, password: string, remember: boolean): Observable<SignInResponse> {
    return this.http.post<SignInResponse>(`${this.api}/auth/sign-in`, { identifier, password }).pipe(
      tap((identity) => this.storeSession(identity, remember)),
      switchMap((identity) =>
        this.http.get<AdminUser>(`${this.api}/adminUsers/${identity.userId}`).pipe(
          tap((user) => this.authenticatedUser.set(user)),
          map(() => identity),
        ),
      ),
    );
  }

  refreshCurrentUser(): Observable<AdminUser | null> {
    const id = this.userId();
    if (!id) {
      this.authenticatedUser.set(null);
      return of(null);
    }
    return this.http.get<AdminUser>(`${this.api}/adminUsers/${id}`).pipe(
      tap((user) => this.authenticatedUser.set(user)),
      catchError(() => {
        this.logout();
        return of(null);
      }),
    );
  }

  updateCurrentUser(user: AdminUser): void {
    if (user.id !== this.userId()) return;
    this.authenticatedUser.set(user);
    const current = this.session();
    if (!current || current.role === user.role) return;
    const updated = { ...current, role: user.role };
    const storage = localStorage.getItem(sessionKey) ? localStorage : sessionStorage;
    storage.setItem(sessionKey, JSON.stringify(updated));
    this.session.set(updated);
  }

  register(payload: { firstName: string; lastName: string; email: string; username: string; password: string }): Observable<AdminUser> {
    const email = payload.email.trim().toLowerCase();
    const username = payload.username.trim();
    const registration = {
          firstName: payload.firstName.trim(),
          lastName: payload.lastName.trim(),
          email,
          username,
          password: payload.password,
          role: 'Admin',
          isActive: true
        };
    const submitRegistration = () =>
      this.http.post<AdminUser>(`${this.api}/auth/register`, registration);
    return this.http.post<{ emailAvailable: boolean; usernameAvailable: boolean }>(
      `${this.api}/auth/check-availability`,
      { email, username },
    ).pipe(
      catchError((error: unknown) => {
        if (error instanceof HttpErrorResponse && error.status >= 500) return of(null);
        return throwError(() => error);
      }),
      switchMap((availability) => {
        if (!availability) return submitRegistration();
        if (!availability.emailAvailable)
          return throwError(() => new Error('An account with this email already exists.'));
        if (!availability.usernameAvailable)
          return throwError(() => new Error('This username is already in use.'));
        return submitRegistration();
      }),
    );
  }

  forgotPassword(email: string): Observable<void> {
    return this.http.post<void>(`${this.api}/auth/forgot-password`, { email });
  }

  resetPassword(password: string, token: string | null): Observable<void> {
    return this.http.post<void>(`${this.api}/auth/reset-password`, { password, token });
  }

  hasRole(...roles: AdminRole[]): boolean {
    const role = this.role();
    return role !== null && roles.includes(role);
  }

  logout(): void {
    sessionStorage.removeItem(sessionKey);
    localStorage.removeItem(sessionKey);
    this.session.set(null);
    this.authenticatedUser.set(null);
  }

  private readSession(): AuthSession | null {
    const stored = localStorage.getItem(sessionKey) || sessionStorage.getItem(sessionKey);
    if (!stored) return null;
    try {
      const value: unknown = JSON.parse(stored);
      if (!value || typeof value !== 'object') return this.clearInvalidSession();
      const session = value as Partial<AuthSession>;
      if (
        typeof session.userId !== 'string' ||
        !session.userId ||
        (session.role !== 'Super Admin' && session.role !== 'Admin') ||
        typeof session.token !== 'string' ||
        !session.token ||
        typeof session.expiresAt !== 'number' ||
        session.expiresAt <= Date.now()
      )
        return this.clearInvalidSession();
      return session as AuthSession;
    } catch {
      return this.clearInvalidSession();
    }
  }

  private clearInvalidSession(): null {
    sessionStorage.removeItem(sessionKey);
    localStorage.removeItem(sessionKey);
    return null;
  }

  private storeSession(identity: SignInResponse, remember: boolean): void {
    const session: AuthSession = identity;
    localStorage.removeItem(sessionKey);
    sessionStorage.removeItem(sessionKey);
    (remember ? localStorage : sessionStorage).setItem(sessionKey, JSON.stringify(session));
    this.session.set(session);
  }
}
