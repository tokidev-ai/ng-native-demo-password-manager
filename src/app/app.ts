import { Component, effect, inject, untracked } from '@angular/core';
import { Router } from '@angular/router';
import { SafeAreaProvider } from '@ng-native/components';
import { StatusBar } from '@ng-native/device';
import { NativeNavigation, NativeStackOutlet } from '@ng-native/router';
import { AuthService } from './core/auth.service.ts';

const PUBLIC_PATHS = ['/login', '/register', '/forgot', '/unlock'];

/**
 * Element names are lowercase, and that is load-bearing rather than style: an uppercase name is
 * read as an unknown Angular component and commits as a plain view with nothing in it.
 */
@Component({
  imports: [NativeStackOutlet, SafeAreaProvider],
  selector: 'app-root',
  template: `
    <safe-area-provider>
      <native-stack-outlet />
    </safe-area-provider>
  `,
  styles: `
    :host {
      flex: 1;
    }
  `,
})
export class App {
  constructor() {
    // The theme is dark, so the status bar icons are always light.
    inject(StatusBar).set({ style: 'light' });

    // Signed out from anywhere (a session that expired, another device): back to the login.
    const auth = inject(AuthService);
    const router = inject(Router);
    const nav = inject(NativeNavigation);
    effect(() => {
      if (auth.user() !== null) return;
      const url = untracked(() => router.url);
      if (!PUBLIC_PATHS.some((p) => url.startsWith(p))) void nav.reset(['/login']);
    });
  }
}
