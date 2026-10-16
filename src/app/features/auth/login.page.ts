import { Component } from '@angular/core';
import { Pressable, Text, View } from '@ng-native/components';
import { NativeHeader, NativeRouterLink } from '@ng-native/router';

@Component({
  imports: [NativeHeader, NativeRouterLink, Pressable, Text, View],
  selector: 'app-login-page',
  host: { style: 'flex: 1' },
  template: `
    <native-header title="Sign in" />
    <view class="flex-1 justify-center gap-3 bg-vault-bg p-6">
      <text class="text-3xl font-bold text-vault-text">NG Vault</text>
      <text class="text-base text-vault-muted">Sign in form arrives with the auth feature.</text>
      <pressable
        accessibilityRole="button"
        class="mt-2 items-center rounded-xl bg-vault-accent p-4 press:bg-vault-accent-press"
        [nativeRouterLink]="['/vaults']"
      >
        <text class="text-base font-semibold text-white">Open vaults</text>
      </pressable>
    </view>
  `,
})
export class LoginPage {}
