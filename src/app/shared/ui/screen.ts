import { Component } from '@angular/core';
import { ScrollView } from '@ng-native/components';

/** A scrolling page body on the vault background, for screens made of forms. */
@Component({
  imports: [ScrollView],
  selector: 'app-screen',
  host: { style: 'flex: 1' },
  template: `
    <scroll-view
      class="flex-1 bg-vault-bg"
      keyboardShouldPersistTaps="handled"
      [contentContainerStyle]="{ padding: 24, gap: 16, flexGrow: 1 }"
    >
      <ng-content />
    </scroll-view>
  `,
})
export class Screen {}
