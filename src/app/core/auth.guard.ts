import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service.ts';
import { CryptoService } from './crypto.service.ts';

/**
 * Private screens: signed in and unlocked. A session restored from storage has no encryption
 * key yet, so it goes to /unlock to type the password again.
 */
export const authGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const crypto = inject(CryptoService);
  const router = inject(Router);
  await auth.whenReady();
  if (!auth.user()) return router.createUrlTree(['/login']);
  return crypto.unlocked() ? true : router.createUrlTree(['/unlock']);
};

/** Login and register: someone already signed in goes on to the vaults (or to unlock). */
export const guestGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.whenReady();
  return auth.user() ? router.createUrlTree(['/vaults']) : true;
};

/** The unlock screen: signed in but locked. */
export const lockedGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const crypto = inject(CryptoService);
  const router = inject(Router);
  await auth.whenReady();
  if (!auth.user()) return router.createUrlTree(['/login']);
  return crypto.unlocked() ? router.createUrlTree(['/vaults']) : true;
};
