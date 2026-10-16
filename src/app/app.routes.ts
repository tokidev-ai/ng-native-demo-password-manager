import { Routes } from '@angular/router';
import { authGuard, guestGuard, lockedGuard } from './core/auth.guard.ts';

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
    path: 'unlock',
    canActivate: [lockedGuard],
    loadComponent: () => import('./features/auth/unlock.page.ts').then((m) => m.UnlockPage),
  },
  {
    path: 'vaults',
    canActivate: [authGuard],
    loadComponent: () => import('./features/vaults/vault-list.page.ts').then((m) => m.VaultListPage),
  },
  {
    path: 'vaults/new',
    canActivate: [authGuard],
    loadComponent: () => import('./features/vaults/vault-form.page.ts').then((m) => m.VaultFormPage),
  },
  {
    path: 'vaults/:vaultId/edit',
    canActivate: [authGuard],
    loadComponent: () => import('./features/vaults/vault-form.page.ts').then((m) => m.VaultFormPage),
  },
  {
    path: 'vaults/:vaultId',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/vaults/vault-detail.page.ts').then((m) => m.VaultDetailPage),
  },
  {
    path: 'vaults/:vaultId/passwords/new',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/passwords/password-form.page.ts').then((m) => m.PasswordFormPage),
  },
  {
    path: 'vaults/:vaultId/passwords/:passwordId/edit',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/passwords/password-form.page.ts').then((m) => m.PasswordFormPage),
  },
  {
    path: 'vaults/:vaultId/passwords/:passwordId',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/passwords/password-detail.page.ts').then((m) => m.PasswordDetailPage),
  },
  {
    path: 'settings',
    canActivate: [authGuard],
    loadComponent: () => import('./features/settings/settings.page.ts').then((m) => m.SettingsPage),
  },
];
