import { withComponentInputBinding } from '@angular/router';
import { Dialogs } from '@ng-native/device';
import { provideNativeRouter } from '@ng-native/router';
import { render, screen, userEvent } from '@ng-native/testing';
import { beforeEach, expect, test, vi } from 'vitest';
import { routes } from '../../app.routes.ts';
import { App } from '../../app.ts';
import { AuthService } from '../../core/auth.service.ts';
import { VAULT_REPOSITORY } from '../../core/vault.repository.ts';
import { InMemoryVaultRepository, answeringDialogs, fakeAuth } from '../../testing/fakes.ts';

vi.mock('../../core/firebase.ts', () => ({ auth: {}, db: {} }));

let repo: InMemoryVaultRepository;

beforeEach(() => {
  repo = new InMemoryVaultRepository();
});

function open(confirm = true) {
  return render(App, {
    providers: [
      provideNativeRouter(routes, withComponentInputBinding()),
      { provide: AuthService, useValue: fakeAuth() },
      { provide: VAULT_REPOSITORY, useValue: repo },
      { provide: Dialogs.SOURCE, useValue: answeringDialogs(confirm) },
    ],
  });
}

test('shows an empty state when there are no vaults', async () => {
  await open();

  expect(await screen.findByText('No vaults yet')).toBeTruthy();
});

test('lists vaults sorted by name', async () => {
  repo.seed({ name: 'Work' });
  repo.seed({ name: 'Family' });
  await open();

  await screen.findByText('Family');
  const names = screen
    .getAllByRole('button')
    .map((b) => b.props?.accessibilityLabel)
    .filter((l): l is string => typeof l === 'string' && l.startsWith('Open '));
  expect(names).toEqual(['Open Family', 'Open Work']);
});

test('creates a vault', async () => {
  await open();
  const user = userEvent.setup();
  await screen.findByText('No vaults yet');

  await user.press(screen.getByRole('button', { name: 'New vault' }));
  await user.type(await screen.findByLabelText('Name'), 'Personal');
  await user.press(screen.getByRole('button', { name: 'Save vault' }));

  expect(await screen.findByText('Personal')).toBeTruthy();
  expect([...repo.data.values()].map((v) => v.name)).toEqual(['Personal']);
});

test('does not save a vault without a name', async () => {
  await open();
  const user = userEvent.setup();
  await user.press(await screen.findByRole('button', { name: 'New vault' }));

  await user.press(await screen.findByRole('button', { name: 'Save vault' }));

  expect(await screen.findByText('Give the vault a name.')).toBeTruthy();
  expect(repo.data.size).toBe(0);
});

test('edits a vault name', async () => {
  repo.seed({ id: 'v1', name: 'Work' });
  await open();
  const user = userEvent.setup();

  await user.press(await screen.findByRole('button', { name: 'Edit Work' }));
  const name = await screen.findByLabelText('Name');
  await user.clear(name);
  await user.type(name, 'Office');
  await user.press(screen.getByRole('button', { name: 'Save vault' }));

  expect(await screen.findByText('Office')).toBeTruthy();
  expect(repo.data.get('v1')?.name).toBe('Office');
});

test('deletes a vault after confirming', async () => {
  repo.seed({ id: 'v1', name: 'Work' });
  await open(true);
  const user = userEvent.setup();

  await user.press(await screen.findByRole('button', { name: 'Edit Work' }));
  await user.press(await screen.findByRole('button', { name: 'Delete vault' }));

  expect(await screen.findByText('No vaults yet')).toBeTruthy();
  expect(repo.data.size).toBe(0);
});

test('keeps the vault when the delete is cancelled', async () => {
  repo.seed({ id: 'v1', name: 'Work' });
  await open(false);
  const user = userEvent.setup();

  await user.press(await screen.findByRole('button', { name: 'Edit Work' }));
  await user.press(await screen.findByRole('button', { name: 'Delete vault' }));

  expect(repo.data.size).toBe(1);
});
