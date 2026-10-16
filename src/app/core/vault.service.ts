import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { AuthService } from './auth.service.ts';
import type { Vault } from './models.ts';
import { VAULT_REPOSITORY, type VaultInput } from './vault.repository.ts';

export const VAULT_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899'];

@Injectable({ providedIn: 'root' })
export class VaultService {
  private readonly repo = inject(VAULT_REPOSITORY);
  private readonly auth = inject(AuthService);

  private readonly items = signal<Vault[]>([]);
  readonly vaults = computed(() =>
    [...this.items()].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })),
  );
  /** True until the first snapshot for the signed in user arrives. */
  readonly loading = signal(true);
  readonly error = signal('');

  constructor() {
    effect((onCleanup) => {
      const user = this.auth.user();
      this.items.set([]);
      this.error.set('');
      this.loading.set(user !== null);
      if (!user) return;
      const stop = this.repo.watch(
        user.uid,
        (vaults) => {
          this.items.set(vaults);
          this.loading.set(false);
        },
        () => {
          this.error.set('Could not load your vaults.');
          this.loading.set(false);
        },
      );
      onCleanup(stop);
    });
  }

  find(vaultId: string | undefined): Vault | undefined {
    return vaultId ? this.items().find((v) => v.id === vaultId) : undefined;
  }

  create(input: VaultInput): Promise<string> {
    return this.repo.add(this.uid(), input);
  }

  update(vaultId: string, input: VaultInput): Promise<void> {
    return this.repo.update(this.uid(), vaultId, input);
  }

  remove(vaultId: string): Promise<void> {
    return this.repo.remove(this.uid(), vaultId);
  }

  private uid(): string {
    const user = this.auth.user();
    if (!user) throw new Error('Not signed in.');
    return user.uid;
  }
}
