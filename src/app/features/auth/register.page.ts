import { Component, inject, signal } from '@angular/core';
import {
  FormField,
  email,
  form,
  minLength,
  required,
  submit,
  validate,
} from '@angular/forms/signals';
import { Text } from '@ng-native/components';
import { NativeHeader, NativeNavigation } from '@ng-native/router';
import { AuthService, authErrorMessage } from '../../core/auth.service.ts';
import { CryptoService, WrongPasswordError } from '../../core/crypto.service.ts';
import { Button } from '../../shared/ui/button.ts';
import { errorText } from '../../shared/ui/form-utils.ts';
import { Screen } from '../../shared/ui/screen.ts';
import { TextField } from '../../shared/ui/text-field.ts';

@Component({
  imports: [Button, FormField, NativeHeader, Screen, Text, TextField],
  selector: 'app-register-page',
  host: { style: 'flex: 1' },
  template: `
    <native-header title="Create account" />
    <app-screen>
      <text class="text-base text-vault-muted">
        Your password also unlocks your vaults. It cannot be recovered, so keep it safe.
      </text>

      <app-text-field
        [formField]="f.email"
        label="Email"
        keyboardType="email-address"
        [error]="emailError()"
      />
      <app-text-field
        [formField]="f.password"
        label="Password"
        [secure]="true"
        [error]="passwordError()"
      />
      <app-text-field
        [formField]="f.confirm"
        label="Confirm password"
        [secure]="true"
        [error]="confirmError()"
      />

      @if (failure()) {
        <text class="text-sm text-vault-danger">{{ failure() }}</text>
      }

      <app-button label="Create account" [loading]="f().submitting()" (press)="submitForm()" />
    </app-screen>
  `,
})
export class RegisterPage {
  private readonly auth = inject(AuthService);
  private readonly crypto = inject(CryptoService);
  private readonly nav = inject(NativeNavigation);

  protected readonly model = signal({ email: '', password: '', confirm: '' });
  protected readonly f = form(this.model, (p) => {
    required(p.email, { message: 'Enter your email.' });
    email(p.email, { message: 'Enter a valid email.' });
    required(p.password, { message: 'Choose a password.' });
    minLength(p.password, 8, { message: 'At least 8 characters.' });
    validate(p.confirm, ({ value, valueOf }) =>
      value() === valueOf(p.password)
        ? undefined
        : { kind: 'mismatch', message: 'Passwords do not match.' },
    );
  });
  protected readonly failure = signal('');
  protected readonly emailError = () => errorText(this.f.email);
  protected readonly passwordError = () => errorText(this.f.password);
  protected readonly confirmError = () => errorText(this.f.confirm);

  protected submitForm(): Promise<boolean> {
    this.failure.set('');
    return submit(this.f, async () => {
      try {
        const { email, password } = this.model();
        await this.auth.signUp(email, password);
        await this.crypto.unlock(password);
        await this.nav.reset(['/vaults']);
      } catch (error) {
        if (error instanceof WrongPasswordError) {
          // Signed in, but this password does not match the one the vaults were sealed with.
          await this.auth.signOut();
          this.failure.set(error.message);
        } else {
          this.failure.set(authErrorMessage(error));
        }
      }
      return undefined;
    });
  }
}
