import { Component, computed, inject, input, signal } from '@angular/core';
import { Text, View } from '@ng-native/components';
import { Dialogs } from '@ng-native/device';
import { Clipboard } from '@ng-native/expo/clipboard';
import { Haptics } from '@ng-native/expo/haptics';
import { NativeHeader, NativeNavigation } from '@ng-native/router';
import { PasswordService } from '../../core/password.service.ts';
import { Button } from '../../shared/ui/button.ts';
import { Screen } from '../../shared/ui/screen.ts';

@Component({
  imports: [Button, NativeHeader, Screen, Text, View],
  selector: 'app-password-detail-page',
  host: { style: 'flex: 1' },
  template: `
    <native-header [title]="entry()?.title ?? 'Password'" />
    <app-screen>
      @if (entry(); as e) {
        @if (e.unreadable) {
          <text class="text-sm text-vault-danger">
            This entry cannot be decrypted with your current password.
          </text>
        }

        <view class="gap-1">
          <text class="text-sm font-medium text-vault-muted">Website</text>
          <text class="text-base text-vault-text">{{ e.website || '—' }}</text>
        </view>
        <view class="gap-1">
          <text class="text-sm font-medium text-vault-muted">Username</text>
          <text class="text-base text-vault-text">{{ e.username }}</text>
        </view>
        <view class="gap-1">
          <text class="text-sm font-medium text-vault-muted">Password</text>
          <text class="text-base text-vault-text">
            {{ revealed() ? e.password : '••••••••••••' }}
          </text>
        </view>
        @if (e.notes) {
          <view class="gap-1">
            <text class="text-sm font-medium text-vault-muted">Notes</text>
            <text class="text-base text-vault-text">{{ e.notes }}</text>
          </view>
        }

        @if (copied()) {
          <text class="text-sm text-vault-ok">{{ copied() }} copied</text>
        }

        <app-button
          [label]="revealed() ? 'Hide password' : 'Reveal password'"
          variant="secondary"
          (press)="revealed.set(!revealed())"
        />
        <app-button label="Copy password" (press)="copy(e.password, 'Password')" />
        <app-button label="Copy username" variant="secondary" (press)="copy(e.username, 'Username')" />
        <app-button label="Edit" variant="secondary" (press)="edit()" />
        <app-button label="Delete password" variant="danger" (press)="remove()" />
      } @else {
        <text class="text-base text-vault-muted">Loading…</text>
      }
    </app-screen>
  `,
})
export class PasswordDetailPage {
  readonly vaultId = input.required<string>();
  readonly passwordId = input.required<string>();

  private readonly passwords = inject(PasswordService);
  private readonly clipboard = inject(Clipboard);
  private readonly haptics = inject(Haptics);
  private readonly dialogs = inject(Dialogs);
  private readonly nav = inject(NativeNavigation);
  private readonly collection = this.passwords.connect(this.vaultId);

  protected readonly entry = computed(() =>
    this.collection.entries().find((e) => e.id === this.passwordId()),
  );
  protected readonly revealed = signal(false);
  protected readonly copied = signal('');

  protected async copy(value: string, what: string): Promise<void> {
    await this.clipboard.write(value);
    this.haptics.notify('success');
    this.copied.set(what);
  }

  protected edit(): void {
    void this.nav.push(['/vaults', this.vaultId(), 'passwords', this.passwordId(), 'edit']);
  }

  protected async remove(): Promise<void> {
    const confirmed = await this.dialogs.confirm('Delete this password?', {
      message: 'This cannot be undone.',
      confirm: 'Delete',
      destructive: true,
    });
    if (!confirmed) return;
    await this.passwords.remove(this.vaultId(), this.passwordId());
    this.nav.back();
  }
}
