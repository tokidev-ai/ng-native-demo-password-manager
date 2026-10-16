import { Component, inject } from '@angular/core';
import { Text } from '@ng-native/components';
import { NativeHeader, NativeNavigation } from '@ng-native/router';
import { AuthService } from '../../core/auth.service.ts';
import { Button } from '../../shared/ui/button.ts';
import { Screen } from '../../shared/ui/screen.ts';

@Component({
  imports: [Button, NativeHeader, Screen, Text],
  selector: 'app-settings-page',
  host: { style: 'flex: 1' },
  template: `
    <native-header title="Settings" />
    <app-screen>
      <text class="text-sm font-medium text-vault-muted">Signed in as</text>
      <text class="text-base text-vault-text">{{ auth.email() }}</text>
      <app-button label="Sign out" variant="danger" (press)="signOut()" />
    </app-screen>
  `,
})
export class SettingsPage {
  protected readonly auth = inject(AuthService);
  private readonly nav = inject(NativeNavigation);

  protected async signOut(): Promise<void> {
    await this.auth.signOut();
    await this.nav.reset(['/login']);
  }
}
