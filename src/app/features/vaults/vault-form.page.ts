import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { FormField, form, maxLength, required, submit } from '@angular/forms/signals';
import { Pressable, Text, View } from '@ng-native/components';
import { Dialogs } from '@ng-native/device';
import { NativeHeader, NativeNavigation } from '@ng-native/router';
import { VAULT_COLORS, VaultService } from '../../core/vault.service.ts';
import { Button } from '../../shared/ui/button.ts';
import { errorText } from '../../shared/ui/form-utils.ts';
import { Screen } from '../../shared/ui/screen.ts';
import { TextField } from '../../shared/ui/text-field.ts';

/** Create (no `vaultId`) or edit (`/vaults/:vaultId/edit`) a vault. */
@Component({
  imports: [Button, FormField, NativeHeader, Pressable, Screen, Text, TextField, View],
  selector: 'app-vault-form-page',
  host: { style: 'flex: 1' },
  template: `
    <native-header [title]="isEdit() ? 'Edit vault' : 'New vault'" />
    <app-screen>
      <app-text-field
        [formField]="f.name"
        label="Name"
        placeholder="Work, Personal, Family…"
        autoCapitalize="words"
        [error]="nameError()"
      />

      <text class="text-sm font-medium text-vault-muted">Color</text>
      <view class="flex-row gap-3">
        @for (c of colors; track c) {
          <pressable
            accessibilityRole="button"
            [accessibilityLabel]="'Color ' + c"
            [accessibilityState]="{ selected: color() === c }"
            class="h-9 w-9 rounded-full border-2"
            [class.border-white]="color() === c"
            [class.border-transparent]="color() !== c"
            [style]="{ backgroundColor: c }"
            (press)="color.set(c)"
          />
        }
      </view>

      @if (failure()) {
        <text class="text-sm text-vault-danger">{{ failure() }}</text>
      }

      <app-button label="Save vault" [loading]="f().submitting()" (press)="save()" />
      @if (isEdit()) {
        <app-button label="Delete vault" variant="danger" (press)="remove()" />
      }
    </app-screen>
  `,
})
export class VaultFormPage {
  /** Bound from the :vaultId route param; absent when creating. */
  readonly vaultId = input<string>();

  private readonly vaults = inject(VaultService);
  private readonly dialogs = inject(Dialogs);
  private readonly nav = inject(NativeNavigation);

  protected readonly colors = VAULT_COLORS;
  protected readonly isEdit = computed(() => !!this.vaultId());
  protected readonly color = signal(VAULT_COLORS[0]);
  protected readonly failure = signal('');

  protected readonly model = signal({ name: '' });
  protected readonly f = form(this.model, (p) => {
    required(p.name, { message: 'Give the vault a name.' });
    maxLength(p.name, 40, { message: 'At most 40 characters.' });
  });
  protected readonly nameError = () => errorText(this.f.name);

  private loaded = false;

  constructor() {
    // Fill the form once the vault being edited has arrived from Firestore.
    effect(() => {
      const vault = this.vaults.find(this.vaultId());
      if (!vault || this.loaded) return;
      this.loaded = true;
      untracked(() => {
        this.model.set({ name: vault.name });
        this.color.set(vault.color);
      });
    });
  }

  protected save(): Promise<boolean> {
    this.failure.set('');
    return submit(this.f, async () => {
      try {
        const input = { name: this.model().name.trim(), color: this.color() };
        const id = this.vaultId();
        if (id) await this.vaults.update(id, input);
        else await this.vaults.create(input);
        this.nav.back();
      } catch {
        this.failure.set('Could not save the vault. Try again.');
      }
      return undefined;
    });
  }

  protected async remove(): Promise<void> {
    const id = this.vaultId();
    if (!id) return;
    const confirmed = await this.dialogs.confirm('Delete this vault?', {
      message: 'Every password inside it is deleted too. This cannot be undone.',
      confirm: 'Delete',
      destructive: true,
    });
    if (!confirmed) return;
    try {
      await this.vaults.remove(id);
      await this.nav.popToRoot();
    } catch {
      this.failure.set('Could not delete the vault. Try again.');
    }
  }
}
