import { withComponentInputBinding } from '@angular/router';
import { provideNativeRouter } from '@ng-native/router';
import { render, screen, userEvent } from '@ng-native/testing';
import { beforeEach, expect, test, vi } from 'vitest';
import { routes } from './app.routes.ts';
import { App } from './app.ts';
import { CryptoService } from './core/crypto.service.ts';
import { VAULT_REPOSITORY } from './core/vault.repository.ts';
import { InMemoryVaultRepository, fakeCrypto } from './testing/fakes.ts';

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

let crypto = fakeCrypto(false);

const REGISTER_INTRO = 'Your password also unlocks your vaults. It cannot be recovered, so keep it safe.';

/** The input on the screen in front: pushed-away screens stay mounted, so labels can repeat. */
const topField = async (label: string) => (await screen.findAllByLabelText(label)).at(-1)!;

const providers = () => [
  provideNativeRouter(routes, withComponentInputBinding()),
  { provide: CryptoService, useValue: crypto },
  { provide: VAULT_REPOSITORY, useValue: new InMemoryVaultRepository() },
];

beforeEach(() => {
  vi.resetAllMocks();
  fb.state.user = null;
  crypto = fakeCrypto(false);
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

  expect(await screen.findByText('No vaults yet')).toBeTruthy();
  expect(fb.signIn).toHaveBeenCalledWith('ana@example.com', 'correct-horse');
});

test('creating an account confirms it and returns to sign in', async () => {
  await render(App, { providers: providers() });
  await screen.findByText('Sign in to open your vaults.');
  const user = userEvent.setup();

  await user.press(screen.getByRole('button', { name: 'Create an account' }));
  await screen.findByText(REGISTER_INTRO);
  await user.type(await topField('Email'), 'new@example.com');
  await user.type(await topField('Password'), 'correct-horse');
  await user.type(await topField('Confirm password'), 'correct-horse');
  await user.press(screen.getByRole('button', { name: 'Create account' }));

  expect(await screen.findByText('Account created. Sign in to continue.')).toBeTruthy();
  expect(fb.signUp).toHaveBeenCalledWith('new@example.com', 'correct-horse');
  expect(fb.signOut).toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'Sign in' })).toBeTruthy();
});

test('mismatched passwords block account creation', async () => {
  await render(App, { providers: providers() });
  await screen.findByText('Sign in to open your vaults.');
  const user = userEvent.setup();

  await user.press(screen.getByRole('button', { name: 'Create an account' }));
  await screen.findByText(REGISTER_INTRO);
  await user.type(await topField('Email'), 'new@example.com');
  await user.type(await topField('Password'), 'correct-horse');
  await user.type(await topField('Confirm password'), 'different-horse');
  await user.press(screen.getByRole('button', { name: 'Create account' }));

  expect(await screen.findByText('Passwords do not match.')).toBeTruthy();
  expect(fb.signUp).not.toHaveBeenCalled();
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

test('sign in also unlocks the vaults with the same password', async () => {
  await render(App, { providers: providers() });
  await screen.findByText('Sign in to open your vaults.');
  const user = userEvent.setup();

  await user.type(screen.getByLabelText('Email'), 'ana@example.com');
  await user.type(screen.getByLabelText('Password'), 'correct-horse');
  await user.press(screen.getByRole('button', { name: 'Sign in' }));
  await screen.findByText('No vaults yet');

  expect(crypto.calls).toEqual(['correct-horse']);
});

test('a restored session must unlock before it sees the vaults', async () => {
  fb.state.user = { uid: 'u1', email: 'ana@example.com' };
  await render(App, { providers: providers() });
  const user = userEvent.setup();

  expect(await screen.findByText('Unlock your vaults')).toBeTruthy();

  await user.type(screen.getByLabelText('Password'), 'correct-horse');
  await user.press(screen.getByRole('button', { name: 'Unlock' }));

  expect(await screen.findByText('No vaults yet')).toBeTruthy();
  expect(crypto.calls).toEqual(['correct-horse']);
});
