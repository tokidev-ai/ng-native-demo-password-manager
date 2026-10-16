import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service.ts';

/** Private screens: signed in users only. */
export const authGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.whenReady();
  return auth.user() ? true : router.createUrlTree(['/login']);
};

/** Login and register: a signed in user goes straight to the vaults. */
export const guestGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.whenReady();
  return auth.user() ? router.createUrlTree(['/vaults']) : true;
};
