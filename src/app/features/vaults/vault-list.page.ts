import { Component } from '@angular/core';
import { Pressable, Text, View } from '@ng-native/components';
import { NativeHeader, NativeRouterLink } from '@ng-native/router';

@Component({
  imports: [NativeHeader, NativeRouterLink, Pressable, Text, View],
  selector: 'app-vault-list-page',
  host: { style: 'flex: 1' },
  template: `
    <native-header title="Vaults" />
    <view class="flex-1 gap-3 bg-vault-bg p-6">
      <text class="text-base text-vault-muted">Your vaults will be listed here.</text>
      <pressable
        accessibilityRole="button"
        class="rounded-xl border border-vault-border bg-vault-surface p-4 press:bg-vault-border"
        [nativeRouterLink]="['/vaults', 'demo']"
      >
        <text class="text-base font-semibold text-vault-text">Demo vault</text>
      </pressable>
    </view>
  `,
})
export class VaultListPage {}
