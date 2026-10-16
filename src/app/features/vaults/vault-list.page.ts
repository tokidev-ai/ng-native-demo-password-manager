import { Component, inject } from '@angular/core';
import { Pressable, Text, View } from '@ng-native/components';
import { NativeHeader, NativeNavigation } from '@ng-native/router';
import { VaultService } from '../../core/vault.service.ts';
import { Button } from '../../shared/ui/button.ts';
import { EmptyState } from '../../shared/ui/empty-state.ts';
import { Screen } from '../../shared/ui/screen.ts';

@Component({
  imports: [Button, EmptyState, NativeHeader, Pressable, Screen, Text, View],
  selector: 'app-vault-list-page',
  host: { style: 'flex: 1' },
  template: `
    <native-header title="Vaults" />
    <app-screen>
      @if (vaultService.error()) {
        <text class="text-sm text-vault-danger">{{ vaultService.error() }}</text>
      }

      @if (vaultService.loading()) {
        <text class="text-base text-vault-muted">Loading your vaults…</text>
      } @else if (vaultService.vaults().length === 0) {
        <app-empty-state
          title="No vaults yet"
          hint="A vault groups related passwords, like Work or Personal."
        />
      } @else {
        @for (vault of vaultService.vaults(); track vault.id) {
          <view class="flex-row items-center gap-3">
            <pressable
              accessibilityRole="button"
              [accessibilityLabel]="'Open ' + vault.name"
              class="flex-1 flex-row items-center gap-3 rounded-xl border border-vault-border bg-vault-surface p-4 press:bg-vault-border"
              (press)="open(vault.id)"
            >
              <view class="h-3 w-3 rounded-full" [style]="{ backgroundColor: vault.color }" />
              <text class="flex-1 text-base font-semibold text-vault-text">{{ vault.name }}</text>
            </pressable>
            <pressable
              accessibilityRole="button"
              [accessibilityLabel]="'Edit ' + vault.name"
              class="rounded-xl p-3 press:opacity-60"
              (press)="edit(vault.id)"
            >
              <text class="text-sm font-medium text-vault-accent">Edit</text>
            </pressable>
          </view>
        }
      }

      <app-button label="New vault" (press)="create()" />
      <app-button label="Settings" variant="secondary" (press)="settings()" />
    </app-screen>
  `,
})
export class VaultListPage {
  protected readonly vaultService = inject(VaultService);
  private readonly nav = inject(NativeNavigation);

  protected open(id: string): void {
    void this.nav.push(['/vaults', id]);
  }
  protected edit(id: string): void {
    void this.nav.push(['/vaults', id, 'edit']);
  }
  protected create(): void {
    void this.nav.push(['/vaults', 'new']);
  }
  protected settings(): void {
    void this.nav.push(['/settings']);
  }
}
