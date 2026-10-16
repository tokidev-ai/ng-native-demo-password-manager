import { Component, input } from '@angular/core';
import { Text, View } from '@ng-native/components';

@Component({
  imports: [Text, View],
  selector: 'app-empty-state',
  template: `
    <view class="items-center gap-2 rounded-2xl border border-dashed border-vault-border p-8">
      <text class="text-lg font-semibold text-vault-text">{{ title() }}</text>
      <text class="text-center text-sm text-vault-muted">{{ hint() }}</text>
    </view>
  `,
})
export class EmptyState {
  readonly title = input.required<string>();
  readonly hint = input('');
}
