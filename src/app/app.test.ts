import { withComponentInputBinding } from '@angular/router';
import { provideNativeRouter } from '@ng-native/router';
import { render, screen, userEvent } from '@ng-native/testing';
import { beforeEach, expect, test, vi } from 'vitest';
import { routes } from './app.routes.ts';
import { App } from './app.ts';

const fb = vi.hoisted(() => {
  const state = { listener: null as null | ((user: unknown) => void), user: null as unknown };
  return {
    state,
    signIn: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    reset: vi.fn(),
  };
});

vi.mock('./core/firebase.ts', () => ({ auth: {}, db: {} }));
vi.mock('firebase/auth', () => ({
  onAuthStateChanged: (_auth: unknown, cb: (user: unknown) => void) => {
    fb.state.listener = cb;
    cb(fb.state.user);
    return () => undefined;
  },
  signInWithEmailAndPassword: async (_a: unknown, email: string, password: string) => {
    await fb.signIn(email, password);
    fb.state.listener?.({ uid: 'u1', email });
  },
  createUserWithEmailAndPassword: async (_a: unknown, email: string, password: string) => {
    await fb.signUp(email, password);
    fb.state.listener?.({ uid: 'u1', email });
  },
  signOut: async () => {
    await fb.signOut();
    fb.state.listener?.(null);
  },
  sendPasswordResetEmail: (_a: unknown, email: string) => fb.reset(email),
}));

const providers = () => [provideNativeRouter(routes, withComponentInputBinding())];

beforeEach(() => {
  vi.resetAllMocks();
  fb.state.user = null;
});

test('a signed out user lands on the sign in page', async () => {
  await render(App, { providers: providers() });

  expect(await screen.findByText('Sign in to open your vaults.')).toBeTruthy();
});

test('sign in shows validation errors and blocks an invalid submit', async () => {
  await render(App, { providers: providers() });
  await screen.findByText('Sign in to open your vaults.');

  await userEvent.setup().press(screen.getByRole('button', { name: 'Sign in' }));

  expect(await screen.findByText('Enter your email.')).toBeTruthy();
  expect(fb.signIn).not.toHaveBeenCalled();
});

test('a valid sign in calls Firebase and opens the vaults', async () => {
  await render(App, { providers: providers() });
  await screen.findByText('Sign in to open your vaults.');
  const user = userEvent.setup();

  await user.type(screen.getByLabelText('Email'), 'ana@example.com');
  await user.type(screen.getByLabelText('Password'), 'correct-horse');
  await user.press(screen.getByRole('button', { name: 'Sign in' }));

  expect(await screen.findByText('Your vaults will be listed here.')).toBeTruthy();
  expect(fb.signIn).toHaveBeenCalledWith('ana@example.com', 'correct-horse');
});

test('a wrong password shows the error and stays on the page', async () => {
  fb.signIn.mockRejectedValue({ code: 'auth/invalid-credential' });
  await render(App, { providers: providers() });
  await screen.findByText('Sign in to open your vaults.');
  const user = userEvent.setup();

  await user.type(screen.getByLabelText('Email'), 'ana@example.com');
  await user.type(screen.getByLabelText('Password'), 'wrong-password');
  await user.press(screen.getByRole('button', { name: 'Sign in' }));

  expect(await screen.findByText('Wrong email or password.')).toBeTruthy();
});

test('a user restored from a stored session skips the login', async () => {
  fb.state.user = { uid: 'u1', email: 'ana@example.com' };
  await render(App, { providers: providers() });

  expect(await screen.findByText('Your vaults will be listed here.')).toBeTruthy();
});
