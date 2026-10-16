import { withComponentInputBinding } from '@angular/router';
import { provideNativeRouter } from '@ng-native/router';
import { render, screen, userEvent } from '@ng-native/testing';
import { expect, test } from 'vitest';
import { routes } from './app.routes.ts';
import { App } from './app.ts';

test('opens on the sign in page and navigates to the vaults', async () => {
  await render(App, {
    providers: [provideNativeRouter(routes, withComponentInputBinding())],
  });

  expect(await screen.findByText('NG Vault')).toBeTruthy();

  await userEvent.setup().press(screen.getByRole('button', { name: 'Open vaults' }));

  expect(await screen.findByText('Your vaults will be listed here.')).toBeTruthy();
});
