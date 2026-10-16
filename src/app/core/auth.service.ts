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
    default:
      return 'Something went wrong. Please try again.';
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
