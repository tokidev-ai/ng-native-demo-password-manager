import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { FormField, form, required, submit } from '@angular/forms/signals';
import { Text } from '@ng-native/components';
import { Crypto } from '@ng-native/expo/crypto';
import { NativeHeader, NativeNavigation } from '@ng-native/router';
import { generatePassword } from '../../core/password-generator.ts';
import { PasswordService } from '../../core/password.service.ts';
import { Button } from '../../shared/ui/button.ts';
import { errorText } from '../../shared/ui/form-utils.ts';
import { Screen } from '../../shared/ui/screen.ts';
import { TextField } from '../../shared/ui/text-field.ts';

/** Create (`/vaults/:vaultId/passwords/new`) or edit (`.../passwords/:passwordId/edit`). */
@Component({
  imports: [Button, FormField, NativeHeader, Screen, Text, TextField],
  selector: 'app-password-form-page',
  host: { style: 'flex: 1' },
  template: `
    <native-header [title]="isEdit() ? 'Edit password' : 'New password'" />
    <app-screen>
      <app-text-field
        [formField]="f.title"
        label="Title"
        placeholder="GitHub, Netflix…"
        autoCapitalize="words"
        [error]="titleError()"
      />
      <app-text-field
        [formField]="f.website"
        label="Website"
        placeholder="https://github.com"
        keyboardType="url"
      />
      <app-text-field
        [formField]="f.username"
        label="Username or email"
        keyboardType="email-address"
        [error]="usernameError()"
      />
      <app-text-field
        [formField]="f.password"
        label="Password"
        [secure]="!showPassword()"
        [error]="passwordError()"
      />
      <app-button
        [label]="showPassword() ? 'Hide password' : 'Show password'"
        variant="ghost"
        (press)="showPassword.set(!showPassword())"
      />
      <app-button label="Generate strong password" variant="secondary" (press)="generate()" />
      <app-text-field [formField]="f.notes" label="Notes" [multiline]="true" />

      @if (failure()) {
        <text class="text-sm text-vault-danger">{{ failure() }}</text>
      }

      <app-button label="Save password" [loading]="f().submitting()" (press)="save()" />
    </app-screen>
  `,
})
export class PasswordFormPage {
  readonly vaultId = input.required<string>();
  /** Absent when creating. */
  readonly passwordId = input<string>();

  private readonly passwords = inject(PasswordService);
  private readonly random = inject(Crypto);
  private readonly nav = inject(NativeNavigation);
  private readonly collection = this.passwords.connect(this.vaultId);

  protected readonly isEdit = computed(() => !!this.passwordId());
  protected readonly showPassword = signal(false);
  protected readonly failure = signal('');

  protected readonly model = signal({ title: '', website: '', username: '', password: '', notes: '' });
  protected readonly f = form(this.model, (p) => {
    required(p.title, { message: 'Give it a title.' });
    required(p.username, { message: 'Enter the username or email.' });
    required(p.password, { message: 'Enter or generate a password.' });
  });
  protected readonly titleError = () => errorText(this.f.title);
  protected readonly usernameError = () => errorText(this.f.username);
  protected readonly passwordError = () => errorText(this.f.password);

  private loaded = false;

  constructor() {
    // Fill the form once the entry being edited has arrived and been decrypted.
    effect(() => {
      const id = this.passwordId();
      const entry = id ? this.collection.entries().find((e) => e.id === id) : undefined;
      if (!entry || this.loaded) return;
      this.loaded = true;
      untracked(() =>
        this.model.set({
          title: entry.title,
          website: entry.website,
          username: entry.username,
          password: entry.password,
          notes: entry.notes,
        }),
      );
    });
  }

  protected generate(): void {
    this.model.update((m) => ({ ...m, password: generatePassword((n) => this.random.randomBytes(n)) }));
    this.showPassword.set(true);
  }

  protected save(): Promise<boolean> {
    this.failure.set('');
    return submit(this.f, async () => {
      try {
        const id = this.passwordId();
        if (id) await this.passwords.update(this.vaultId(), id, this.model());
        else await this.passwords.create(this.vaultId(), this.model());
        this.nav.back();
      } catch {
        this.failure.set('Could not save the password. Try again.');
      }
      return undefined;
    });
  }
}
