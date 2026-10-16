import { Component, inject, signal } from '@angular/core';
import { FormField, email, form, required, submit } from '@angular/forms/signals';
import { Text } from '@ng-native/components';
import { NativeHeader } from '@ng-native/router';
import { AuthService, authErrorMessage } from '../../core/auth.service.ts';
import { Button } from '../../shared/ui/button.ts';
import { errorText } from '../../shared/ui/form-utils.ts';
import { Screen } from '../../shared/ui/screen.ts';
import { TextField } from '../../shared/ui/text-field.ts';

@Component({
  imports: [Button, FormField, NativeHeader, Screen, Text, TextField],
  selector: 'app-forgot-password-page',
  host: { style: 'flex: 1' },
  template: `
    <native-header title="Reset password" />
    <app-screen>
      <text class="text-base text-vault-muted">
        We will email you a reset link. Resetting the password makes saved passwords unreadable,
        because they are encrypted with a key derived from it.
      </text>

      <app-text-field
        [formField]="f.email"
        label="Email"
        keyboardType="email-address"
        [error]="emailError()"
      />

      @if (failure()) {
        <text class="text-sm text-vault-danger">{{ failure() }}</text>
      }
      @if (sent()) {
        <text class="text-sm text-vault-ok">Reset link sent. Check your inbox.</text>
      }

      <app-button label="Send reset link" [loading]="f().submitting()" (press)="submitForm()" />
    </app-screen>
  `,
})
export class ForgotPasswordPage {
  private readonly auth = inject(AuthService);

  protected readonly model = signal({ email: '' });
  protected readonly f = form(this.model, (p) => {
    required(p.email, { message: 'Enter your email.' });
    email(p.email, { message: 'Enter a valid email.' });
  });
  protected readonly failure = signal('');
  protected readonly sent = signal(false);
  protected readonly emailError = () => errorText(this.f.email);

  protected submitForm(): Promise<boolean> {
    this.failure.set('');
    this.sent.set(false);
    return submit(this.f, async () => {
      try {
        await this.auth.resetPassword(this.model().email);
        this.sent.set(true);
      } catch (error) {
        this.failure.set(authErrorMessage(error));
      }
      return undefined;
    });
  }
}
