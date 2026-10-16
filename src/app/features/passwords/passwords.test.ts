import { withComponentInputBinding } from '@angular/router';
import { Dialogs } from '@ng-native/device';
import { Clipboard } from '@ng-native/expo/clipboard';
import { Crypto } from '@ng-native/expo/crypto';
import { Haptics } from '@ng-native/expo/haptics';
import { provideNativeRouter } from '@ng-native/router';
import { render, screen, userEvent } from '@ng-native/testing';
import { beforeEach, expect, test, vi } from 'vitest';
import { routes } from '../../app.routes.ts';
import { App } from '../../app.ts';
import { AuthService } from '../../core/auth.service.ts';
import { CryptoService } from '../../core/crypto.service.ts';
import { PASSWORD_REPOSITORY } from '../../core/password.repository.ts';
import { VAULT_REPOSITORY } from '../../core/vault.repository.ts';
import {
  InMemoryPasswordRepository,
  InMemoryVaultRepository,
  answeringDialogs,
  fakeAuth,
  fakeCrypto,
} from '../../testing/fakes.ts';

vi.mock('../../core/firebase.ts', () => ({ auth: {}, db: {} }));

let vaults: InMemoryVaultRepository;
let passwords: InMemoryPasswordRepository;
let copied: string[];

beforeEach(() => {
  vaults = new InMemoryVaultRepository();
  vaults.seed({ id: 'v1', name: 'Work' });
  passwords = new InMemoryPasswordRepository();
  copied = [];
});

async function openVault(confirm = true) {
  await render(App, {
    providers: [
      provideNativeRouter(routes, withComponentInputBinding()),
      { provide: AuthService, useValue: fakeAuth() },
      { provide: CryptoService, useValue: fakeCrypto() },
      { provide: VAULT_REPOSITORY, useValue: vaults },
      { provide: PASSWORD_REPOSITORY, useValue: passwords },
      { provide: Dialogs.SOURCE, useValue: answeringDialogs(confirm) },
      {
        provide: Clipboard.SOURCE,
        useValue: {
          getStringAsync: async () => copied.at(-1) ?? '',
          setStringAsync: async (text: string) => !!copied.push(text),
          addClipboardListener: () => ({ remove: () => undefined }),
        },
      },
      { provide: Haptics.SOURCE, useValue: null },
      { provide: Crypto.SOURCE, useValue: { getRandomBytes: (n: number) => new Uint8Array(n).fill(7) } },
    ],
  });
  const user = userEvent.setup();
  await user.press(await screen.findByRole('button', { name: 'Open Work' }));
  return user;
}

test('shows an empty state for a vault without passwords', async () => {
  await openVault();

  expect(await screen.findByText('No passwords yet')).toBeTruthy();
});

test('adds a password and stores the secret encrypted', async () => {
  const user = await openVault();

  await user.press(await screen.findByRole('button', { name: 'Add password' }));
  await user.type(await screen.findByLabelText('Title'), 'GitHub');
  await user.type(screen.getByLabelText('Website'), 'https://github.com');
  await user.type(screen.getByLabelText('Username or email'), 'ana@example.com');
  await user.type(screen.getByLabelText('Password'), 's3cret!');
  await user.press(screen.getByRole('button', { name: 'Save password' }));

  expect(await screen.findByText('GitHub')).toBeTruthy();
  const [stored] = [...(passwords.data.get('v1')?.values() ?? [])];
  expect(stored).toMatchObject({ title: 'GitHub', username: 'ana@example.com' });
  expect(stored.password).toBe('enc:s3cret!');
  expect(JSON.stringify(stored)).not.toContain('"s3cret!"');
});

test('requires title, username and password', async () => {
  const user = await openVault();

  await user.press(await screen.findByRole('button', { name: 'Add password' }));
  await user.press(await screen.findByRole('button', { name: 'Save password' }));

  expect(await screen.findByText('Give it a title.')).toBeTruthy();
  expect(screen.getByText('Enter or generate a password.')).toBeTruthy();
  expect(passwords.data.get('v1')?.size ?? 0).toBe(0);
});

test('generates a strong password into the form', async () => {
  const user = await openVault();

  await user.press(await screen.findByRole('button', { name: 'Add password' }));
  await user.press(await screen.findByRole('button', { name: 'Generate strong password' }));

  const field = screen.getByLabelText('Password');
  expect(String(field.props?.text ?? field.props?.value ?? '')).toHaveLength(20);
});

test('filters the list with the search box', async () => {
  passwords.seed('v1', { title: 'GitHub', website: 'github.com' });
  passwords.seed('v1', { title: 'Netflix', website: 'netflix.com' });
  const user = await openVault();
  await screen.findByText('GitHub');

  await user.type(screen.getByLabelText('Search'), 'net');

  expect(screen.queryByText('GitHub')).toBeNull();
  expect(screen.getByText('Netflix')).toBeTruthy();
});

test('reveals the password and copies it to the clipboard', async () => {
  passwords.seed('v1', { title: 'GitHub', username: 'ana', password: 'enc:hunter2' });
  const user = await openVault();

  await user.press(await screen.findByRole('button', { name: 'Open GitHub' }));
  expect(await screen.findByText('••••••••••••')).toBeTruthy();

  await user.press(screen.getByRole('button', { name: 'Reveal password' }));
  expect(screen.getByText('hunter2')).toBeTruthy();

  await user.press(screen.getByRole('button', { name: 'Copy password' }));
  expect(copied).toEqual(['hunter2']);
  expect(await screen.findByText('Password copied')).toBeTruthy();
});

test('edits a password and keeps the new secret encrypted', async () => {
  passwords.seed('v1', { id: 'p1', title: 'GitHub', username: 'ana', password: 'enc:old' });
  const user = await openVault();

  await user.press(await screen.findByRole('button', { name: 'Open GitHub' }));
  await user.press(await screen.findByRole('button', { name: 'Edit' }));
  const field = await screen.findByLabelText('Password');
  await user.clear(field);
  await user.type(field, 'new-secret');
  await user.press(screen.getByRole('button', { name: 'Save password' }));

  await screen.findByRole('button', { name: 'Open GitHub' });
  expect(passwords.data.get('v1')?.get('p1')?.password).toBe('enc:new-secret');
});

test('deletes a password after confirming', async () => {
  passwords.seed('v1', { id: 'p1', title: 'GitHub', username: 'ana' });
  const user = await openVault(true);

  await user.press(await screen.findByRole('button', { name: 'Open GitHub' }));
  await user.press(await screen.findByRole('button', { name: 'Delete password' }));

  expect(await screen.findByText('No passwords yet')).toBeTruthy();
  expect(passwords.data.get('v1')?.size).toBe(0);
});

test('flags entries that cannot be decrypted', async () => {
  passwords.seed('v1', { id: 'p1', title: 'Old', username: 'ana', password: 'garbage' });
  const user = await openVault();

  await user.press(await screen.findByRole('button', { name: 'Open Old' }));

  expect(await screen.findByText('This entry cannot be decrypted with your current password.')).toBeTruthy();
});
