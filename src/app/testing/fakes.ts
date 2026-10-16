import { signal } from '@angular/core';
import type { NativeDialogs } from '@ng-native/device';
import type { Vault } from '../core/models.ts';
import type { VaultInput, VaultRepository } from '../core/vault.repository.ts';

/** A signed in user, for specs that start past the login. */
export function fakeAuth(email = 'ana@example.com') {
  const user = signal<unknown>({ uid: 'u1', email });
  return {
    user,
    isSignedIn: signal(true),
    email: signal(email),
    whenReady: async () => undefined,
    signOut: async () => user.set(null),
  };
}

/** Answers every confirmation dialog with `answer`, without showing anything. */
export function answeringDialogs(answer: boolean): NativeDialogs {
  return {
    platform: 'ios',
    alert(_title, _message, buttons) {
      const pick = buttons.find((b) => (answer ? b.style !== 'cancel' : b.style === 'cancel'));
      pick?.onPress?.();
    },
  };
}

export class InMemoryVaultRepository implements VaultRepository {
  readonly data = new Map<string, Vault>();
  private listener: ((vaults: Vault[]) => void) | null = null;
  private seq = 0;

  seed(vault: Partial<Vault> & { name: string }): Vault {
    const full: Vault = {
      id: vault.id ?? `v${++this.seq}`,
      name: vault.name,
      color: vault.color ?? '#6366f1',
      createdAt: 1,
      updatedAt: 1,
    };
    this.data.set(full.id, full);
    return full;
  }

  watch(_uid: string, next: (vaults: Vault[]) => void) {
    this.listener = next;
    next([...this.data.values()]);
    return () => {
      this.listener = null;
    };
  }

  async add(_uid: string, input: VaultInput) {
    const vault = this.seed(input);
    this.emit();
    return vault.id;
  }

  async update(_uid: string, vaultId: string, input: VaultInput) {
    const current = this.data.get(vaultId);
    if (current) this.data.set(vaultId, { ...current, ...input, updatedAt: 2 });
    this.emit();
  }

  async remove(_uid: string, vaultId: string) {
    this.data.delete(vaultId);
    this.emit();
  }

  private emit() {
    this.listener?.([...this.data.values()]);
  }
}
