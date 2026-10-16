import { Component, computed, input, model } from '@angular/core';
import { Text, TextInput, View } from '@ng-native/components';

/**
 * A labelled text input that works as a Signal Forms control:
 * `<app-text-field [formField]="f.email" label="Email" [error]="..." />`.
 * Signal Forms writes `value` and reads `touched`, and sets `disabled` and `invalid`.
 */
@Component({
  imports: [Text, TextInput, View],
  selector: 'app-text-field',
  template: `
    <view class="gap-1">
      <text class="text-sm font-medium text-vault-muted">{{ label() }}</text>
      <view
        class="rounded-xl border bg-vault-surface px-4"
        [class.border-vault-border]="!showError()"
        [class.border-vault-danger]="showError()"
      >
        <text-input
          class="py-3 text-base text-vault-text"
          placeholderTextColor="#8b94b2"
          [accessibilityLabel]="label()"
          [(value)]="value"
          [placeholder]="placeholder()"
          [secureTextEntry]="secure()"
          [multiline]="multiline()"
          [keyboardType]="keyboardType()"
          [autoCapitalize]="autoCapitalize()"
          [autoCorrect]="false"
          [editable]="!disabled()"
          (touch)="touched.set(true)"
        />
      </view>
      @if (showError()) {
        <text class="text-sm text-vault-danger">{{ error() }}</text>
      }
    </view>
  `,
})
export class TextField {
  readonly label = input.required<string>();
  readonly placeholder = input('');
  readonly secure = input(false);
  readonly multiline = input(false);
  readonly keyboardType = input<'default' | 'email-address' | 'url'>('default');
  readonly autoCapitalize = input<'none' | 'sentences' | 'words'>('none');
  /** The message to show once the field has been touched and is invalid. */
  readonly error = input('');

  // The Signal Forms control contract.
  readonly value = model('');
  readonly touched = model(false);
  readonly disabled = input(false);
  readonly invalid = input(false);

  protected readonly showError = computed(() => this.touched() && this.invalid() && !!this.error());
}
