import { Injectable, Signal, effect, inject, signal } from '@angular/core';
import { AuthService } from './auth.service.ts';
import { CryptoService } from './crypto.service.ts';
import type { PasswordEntry } from './models.ts';
import {
  PASSWORD_REPOSITORY,
  type PasswordFields,
  type PasswordRecord,
} from './password.repository.ts';

export type PasswordInput = PasswordFields;

export interface PasswordCollection {
  readonly entries: Signal<PasswordEntry[]>;
  readonly loading: Signal<boolean>;
  readonly error: Signal<string>;
}

@Injectable({ providedIn: 'root' })
export class PasswordService {
  private readonly repo = inject(PASSWORD_REPOSITORY);
  private readonly auth = inject(AuthService);
  private readonly crypto = inject(CryptoService);

  /**
   * Live, decrypted entries of one vault. Call it from an injection context (a component field
   * or constructor): the subscription follows `vaultId` and the signed in user, and ends with
   * the component.
   */
  connect(vaultId: Signal<string | undefined>): PasswordCollection {
    const entries = signal<PasswordEntry[]>([]);
    const loading = signal(true);
    const error = signal('');

    effect((onCleanup) => {
      const id = vaultId();
      const user = this.auth.user();
      const unlocked = this.crypto.unlocked();
      entries.set([]);
      error.set('');
      if (!id || !user || !unlocked) {
        loading.set(!!user && !!id);
        return;
      }
      loading.set(true);
      const stop = this.repo.watch(
        user.uid,
        id,
        (records) => {
          entries.set(
            records
              .map((r) => this.toEntry(id, r))
              .sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' })),
          );
          loading.set(false);
        },
        () => {
          error.set('Could not load the passwords.');
          loading.set(false);
        },
      );
      onCleanup(stop);
    });

    return { entries, loading, error };
  }

  create(vaultId: string, input: PasswordInput): Promise<string> {
    return this.repo.add(this.uid(), vaultId, this.seal(input));
  }

  update(vaultId: string, id: string, input: PasswordInput): Promise<void> {
    return this.repo.update(this.uid(), vaultId, id, this.seal(input));
  }

  remove(vaultId: string, id: string): Promise<void> {
    return this.repo.remove(this.uid(), vaultId, id);
  }

  private seal(input: PasswordInput): PasswordFields {
    return {
      title: input.title.trim(),
      website: input.website.trim(),
      username: input.username.trim(),
      password: this.crypto.encrypt(input.password),
      notes: input.notes ? this.crypto.encrypt(input.notes) : '',
    };
  }

  private toEntry(vaultId: string, record: PasswordRecord): PasswordEntry {
    let password = '';
    let notes = '';
    let unreadable = false;
    try {
      password = this.crypto.decrypt(record.password);
      notes = record.notes ? this.crypto.decrypt(record.notes) : '';
    } catch {
      unreadable = true;
    }
    return { ...record, vaultId, password, notes, unreadable };
  }

  private uid(): string {
    const user = this.auth.user();
    if (!user) throw new Error('Not signed in.');
    return user.uid;
  }
}
