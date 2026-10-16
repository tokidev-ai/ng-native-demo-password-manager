import { Component, computed, inject, input, signal } from '@angular/core';
import { Pressable, Text } from '@ng-native/components';
import { NativeHeader, NativeNavigation } from '@ng-native/router';
import { PasswordService } from '../../core/password.service.ts';
import { VaultService } from '../../core/vault.service.ts';
import { Button } from '../../shared/ui/button.ts';
import { EmptyState } from '../../shared/ui/empty-state.ts';
import { Screen } from '../../shared/ui/screen.ts';
import { TextField } from '../../shared/ui/text-field.ts';

/** The passwords of one vault, with search. */
@Component({
  imports: [Button, EmptyState, NativeHeader, Pressable, Screen, Text, TextField],
  selector: 'app-vault-detail-page',
  host: { style: 'flex: 1' },
  template: `
    <native-header [title]="vault()?.name ?? 'Vault'" />
    <app-screen>
      @if (collection.error()) {
        <text class="text-sm text-vault-danger">{{ collection.error() }}</text>
      }

      @if (collection.entries().length > 0) {
        <app-text-field label="Search" placeholder="Title, website or username" [(value)]="query" />
      }

      @if (collection.loading()) {
        <text class="text-base text-vault-muted">Loading passwords…</text>
      } @else if (collection.entries().length === 0) {
        <app-empty-state title="No passwords yet" hint="Add the first password to this vault." />
      } @else if (filtered().length === 0) {
        <app-empty-state title="No matches" hint="Try another search." />
      } @else {
        @for (entry of filtered(); track entry.id) {
          <pressable
            accessibilityRole="button"
            [accessibilityLabel]="'Open ' + entry.title"
            class="gap-1 rounded-xl border border-vault-border bg-vault-surface p-4 press:bg-vault-border"
            (press)="open(entry.id)"
          >
            <text class="text-base font-semibold text-vault-text">{{ entry.title }}</text>
            <text class="text-sm text-vault-muted">
              {{ entry.website || entry.username }}
            </text>
          </pressable>
        }
      }

      <app-button label="Add password" (press)="add()" />
      <app-button label="Edit vault" variant="secondary" (press)="editVault()" />
    </app-screen>
  `,
})
export class VaultDetailPage {
  /** Bound from the :vaultId route param by withComponentInputBinding. */
  readonly vaultId = input.required<string>();

  private readonly vaults = inject(VaultService);
  private readonly nav = inject(NativeNavigation);
  protected readonly collection = inject(PasswordService).connect(this.vaultId);

  protected readonly vault = computed(() => this.vaults.find(this.vaultId()));
  protected readonly query = signal('');
  protected readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    if (!q) return this.collection.entries();
    return this.collection
      .entries()
      .filter((e) => [e.title, e.website, e.username].some((v) => v.toLowerCase().includes(q)));
  });

  protected open(id: string): void {
    void this.nav.push(['/vaults', this.vaultId(), 'passwords', id]);
  }
  protected add(): void {
    void this.nav.push(['/vaults', this.vaultId(), 'passwords', 'new']);
  }
  protected editVault(): void {
    void this.nav.push(['/vaults', this.vaultId(), 'edit']);
  }
}
