import { Injectable, computed, signal } from '@angular/core';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth';
import { auth } from './firebase.ts';

/** Turns a Firebase auth error into something a person can act on. */
export function authErrorMessage(error: unknown): string {
  if (error) console.warn('[auth] error', (error as { code?: string }).code, error);
  const code = (error as { code?: string } | null)?.code ?? '';
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Wrong email or password.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists.';
    case 'auth/weak-password':
      return 'Choose a stronger password (at least 8 characters).';
    case 'auth/invalid-email':
      return 'That email address is not valid.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Try again in a few minutes.';
    case 'auth/network-request-failed':
      return 'No connection. Check your network and try again.';
    case 'unavailable':
      return 'Cannot reach Firestore. Check your network, and that the Firestore database is created in the Firebase console.';
    case 'auth/operation-not-allowed':
      return 'Email/Password sign-in is disabled. Enable it in Firebase console > Authentication > Sign-in method.';
    case 'auth/invalid-api-key':
    case 'auth/api-key-not-valid.-please-pass-a-valid-api-key.':
      return 'The Firebase API key in .env is not valid.';
    case 'permission-denied':
      return 'Firestore denied access. Check that the database exists and firestore.rules is deployed.';
    case 'failed-precondition':
    case 'not-found':
      return 'Firestore is not ready. Create the database in the Firebase console.';
    default: {
      // Surface the real cause instead of hiding it: it is the first thing needed to fix it.
      const detail = code || (error as Error | null)?.message || String(error);
      console.warn('[auth] unexpected error', error);
      return `Something went wrong (${detail}).`;
    }
  }
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  /** `undefined` until Firebase has restored the stored session, then the user or `null`. */
  readonly user = signal<User | null | undefined>(undefined);
  readonly isSignedIn = computed(() => !!this.user());
  readonly email = computed(() => this.user()?.email ?? '');

  private readonly ready = new Promise<void>((resolve) => {
    onAuthStateChanged(auth, (user) => {
      this.user.set(user);
      resolve();
    });
  });

  /** Resolves once the stored session has been restored, so a guard does not misjudge it. */
  whenReady(): Promise<void> {
    return this.ready;
  }

  async signIn(email: string, password: string): Promise<void> {
    await signInWithEmailAndPassword(auth, email.trim(), password);
  }

  async signUp(email: string, password: string): Promise<void> {
    await createUserWithEmailAndPassword(auth, email.trim(), password);
  }

  async signOut(): Promise<void> {
    await signOut(auth);
  }

  async resetPassword(email: string): Promise<void> {
    await sendPasswordResetEmail(auth, email.trim());
  }
}
