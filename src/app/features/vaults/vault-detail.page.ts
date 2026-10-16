import { Component, input } from '@angular/core';
import { Text, View } from '@ng-native/components';
import { NativeHeader } from '@ng-native/router';

@Component({
  imports: [NativeHeader, Text, View],
  selector: 'app-vault-detail-page',
  host: { style: 'flex: 1' },
  template: `
    <native-header title="Vault" />
    <view class="flex-1 gap-3 bg-vault-bg p-6">
      <text class="text-base text-vault-muted">Passwords of vault {{ vaultId() }} go here.</text>
    </view>
  `,
})
export class VaultDetailPage {
  /** Bound from the :vaultId route param by withComponentInputBinding. */
  readonly vaultId = input.required<string>();
}
