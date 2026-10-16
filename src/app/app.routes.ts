import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth.guard.ts';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/login.page.ts').then((m) => m.LoginPage),
  },
  {
    path: 'register',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/register.page.ts').then((m) => m.RegisterPage),
  },
  {
    path: 'forgot',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/forgot-password.page.ts').then((m) => m.ForgotPasswordPage),
  },
  {
    path: 'vaults',
    canActivate: [authGuard],
    loadComponent: () => import('./features/vaults/vault-list.page.ts').then((m) => m.VaultListPage),
  },
  {
    path: 'vaults/:vaultId',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/vaults/vault-detail.page.ts').then((m) => m.VaultDetailPage),
  },
  {
    path: 'settings',
    canActivate: [authGuard],
    loadComponent: () => import('./features/settings/settings.page.ts').then((m) => m.SettingsPage),
  },
];
