import { Component, computed, input, output } from '@angular/core';
import { Pressable, Text } from '@ng-native/components';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

const BASE = 'items-center rounded-xl px-4 py-3.5';
const VARIANTS: Record<ButtonVariant, { box: string; label: string }> = {
  primary: { box: 'bg-vault-accent press:bg-vault-accent-press', label: 'text-white' },
  secondary: {
    box: 'border border-vault-border bg-vault-surface press:bg-vault-border',
    label: 'text-vault-text',
  },
  danger: { box: 'bg-vault-danger press:opacity-80', label: 'text-white' },
  ghost: { box: 'press:opacity-60', label: 'text-vault-accent' },
};

@Component({
  imports: [Pressable, Text],
  selector: 'app-button',
  template: `
    <pressable
      accessibilityRole="button"
      [accessibilityLabel]="label()"
      [accessibilityState]="{ disabled: blocked() }"
      [class]="boxClass()"
      (press)="onPress()"
    >
      <text class="text-base font-semibold" [class]="labelClass()">
        {{ loading() ? 'Please wait…' : label() }}
      </text>
    </pressable>
  `,
})
export class Button {
  readonly label = input.required<string>();
  readonly variant = input<ButtonVariant>('primary');
  readonly loading = input(false);
  readonly disabled = input(false);
  readonly press = output<void>();

  protected readonly blocked = computed(() => this.disabled() || this.loading());
  protected readonly boxClass = computed(
    () => `${BASE} ${VARIANTS[this.variant()].box} ${this.blocked() ? 'opacity-50' : ''}`,
  );
  protected readonly labelClass = computed(() => VARIANTS[this.variant()].label);

  protected onPress(): void {
    if (!this.blocked()) this.press.emit();
  }
}
