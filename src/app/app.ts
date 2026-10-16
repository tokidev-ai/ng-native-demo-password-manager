import { Component, inject, signal } from '@angular/core';
import { Pressable, SafeAreaProvider, SafeAreaView, Text, View } from '@ng-native/components';
import { StatusBar } from '@ng-native/device';

/**
 * Element names are lowercase, and that is load-bearing rather than style: an uppercase name is
 * read as an unknown Angular component and commits as a plain view with nothing in it.
 */
@Component({
  imports: [Pressable, SafeAreaProvider, SafeAreaView, Text, View],
  selector: 'app-root',
  template: `
    <safe-area-provider>
      <safe-area-view class="flex-1 bg-vault-bg">
        <view class="flex-1 justify-center gap-3 p-6">
          <text class="text-3xl font-bold text-vault-text">NG Vault</text>
          <text class="text-base text-vault-muted">
            Your passwords, in real native views.
          </text>

          <pressable
            accessibilityRole="button"
            class="mt-2 items-center rounded-xl bg-vault-accent p-4 press:bg-vault-accent-press"
            (press)="count.set(count() + 1)"
          >
            <text class="text-base font-semibold text-white">Tapped {{ count() }} times</text>
          </pressable>
        </view>
      </safe-area-view>
    </safe-area-provider>
  `,
  styles: `
    :host {
      flex: 1;
    }
  `,
})
export class App {
  protected readonly count = signal(0);

  constructor() {
    // The theme is dark, so the status bar icons are always light.
    inject(StatusBar).set({ style: 'light' });
  }
}
