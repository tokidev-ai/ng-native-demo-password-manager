import { Component, inject, signal } from '@angular/core';
import { FormField, form, required, submit } from '@angular/forms/signals';
import { Text } from '@ng-native/components';
import { NativeHeader, NativeNavigation } from '@ng-native/router';
import { AuthService, authErrorMessage } from '../../core/auth.service.ts';
import { CryptoService, WrongPasswordError } from '../../core/crypto.service.ts';
import { Button } from '../../shared/ui/button.ts';
import { errorText } from '../../shared/ui/form-utils.ts';
import { Screen } from '../../shared/ui/screen.ts';
import { TextField } from '../../shared/ui/text-field.ts';

/** Shown when the session was restored but the encryption key is gone from memory. */
@Component({
  imports: [Button, FormField, NativeHeader, Screen, Text, TextField],
  selector: 'app-unlock-page',
  host: { style: 'flex: 1' },
  template: `
    <native-header title="Unlock" />
    <app-screen>
      <text class="mt-4 text-3xl font-bold text-vault-text">Unlock your vaults</text>
      <text class="text-base text-vault-muted">
        Enter the password for {{ auth.email() }}. It never leaves your device.
      </text>

      <app-text-field
        [formField]="f.password"
        label="Password"
        [secure]="true"
        [error]="passwordError()"
      />

      @if (failure()) {
        <text class="text-sm text-vault-danger">{{ failure() }}</text>
      }

      <app-button label="Unlock" [loading]="f().submitting()" (press)="unlock()" />
      <app-button label="Sign out" variant="ghost" (press)="signOut()" />
    </app-screen>
  `,
})
export class UnlockPage {
  protected readonly auth = inject(AuthService);
  private readonly crypto = inject(CryptoService);
  private readonly nav = inject(NativeNavigation);

  protected readonly model = signal({ password: '' });
  protected readonly f = form(this.model, (p) => {
    required(p.password, { message: 'Enter your password.' });
  });
  protected readonly failure = signal('');
  protected readonly passwordError = () => errorText(this.f.password);

  protected unlock(): Promise<boolean> {
    this.failure.set('');
    return submit(this.f, async () => {
      try {
        await this.crypto.unlock(this.model().password);
        await this.nav.reset(['/vaults']);
      } catch (error) {
        this.failure.set(
          error instanceof WrongPasswordError ? 'Wrong password.' : authErrorMessage(error),
        );
      }
      return undefined;
    });
  }

  protected async signOut(): Promise<void> {
    await this.auth.signOut();
    await this.nav.reset(['/login']);
  }
}
