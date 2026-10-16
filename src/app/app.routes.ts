import { Routes } from '@angular/router';

/** Auth and vault routes. Guards arrive with the auth feature. */
export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login.page.ts').then((m) => m.LoginPage),
  },
  {
    path: 'vaults',
    loadComponent: () => import('./features/vaults/vault-list.page.ts').then((m) => m.VaultListPage),
  },
  {
    path: 'vaults/:vaultId',
    loadComponent: () =>
      import('./features/vaults/vault-detail.page.ts').then((m) => m.VaultDetailPage),
  },
];
