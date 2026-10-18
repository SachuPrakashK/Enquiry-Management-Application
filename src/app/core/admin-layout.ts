import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from './auth.service';
import { IconName, SvgIcon } from '../shared/svg-icon';
import { ActionMenu } from '../shared/action-menu';

interface NavigationItem {
  label: string;
  path: string;
  icon: IconName;
}
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-admin-layout',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, SvgIcon, ActionMenu],
  templateUrl: './admin-layout.html',
})
export class AdminLayout {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly menuOpen = signal(false);
  readonly sidebarCollapsed = signal(false);
  readonly role = this.auth.role;
  readonly currentUser = this.auth.currentUser;
  readonly profileImage = computed(() => this.currentUser()?.profileImage || '');
  readonly userName = computed(() => {
    const user = this.currentUser();
    return user ? `${user.firstName} ${user.lastName}`.trim() : '';
  });
  readonly userInitials = computed(() => {
    const user = this.currentUser();
    return user ? `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase() : '';
  });
  readonly sections = computed(() =>
    [
      { label: '', items: [{ label: 'Dashboard', path: '/admin/dashboard', icon: 'dashboard' }] },
      {
        items: [
          { label: 'Make Enquiry', path: '/admin/enquiries/create', icon: 'plus' },
          { label: 'Enquiry Listing', path: '/admin/enquiries', icon: 'enquiry' },
          { label: 'Follow-ups', path: '/admin/follow-ups', icon: 'follow-up' },
        ],
      },
      {
        items: this.auth.hasRole('Super Admin')
          ? [
              { label: 'Enquiry Status', path: '/admin/statuses', icon: 'status' },
              { label: 'Enquiry Categories', path: '/admin/categories', icon: 'category' },
            ]
          : [],
      },
      {
        items: this.auth.hasRole('Super Admin')
          ? [{ label: 'Users', path: '/admin/users', icon: 'users' }]
          : [],
      },
    ].filter((section): section is { label?: string; items: NavigationItem[] } =>
      Boolean(section.items.length),
    ),
  );
  constructor() {
    if (!this.currentUser()) this.auth.refreshCurrentUser().subscribe();
  }
  logout() {
    this.auth.logout();
    void this.router.navigateByUrl('/auth/sign-in');
  }
}
