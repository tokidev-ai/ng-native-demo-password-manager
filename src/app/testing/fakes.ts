import { signal } from '@angular/core';
import type { NativeDialogs } from '@ng-native/device';
import type { Vault } from '../core/models.ts';
import type {
  PasswordFields,
  PasswordRecord,
  PasswordRepository,
} from '../core/password.repository.ts';
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

/** A stand-in for CryptoService: "encrypts" by prefixing, and unlocks without deriving a key. */
export function fakeCrypto(startUnlocked = true) {
  const unlocked = signal(startUnlocked);
  const calls: string[] = [];
  return {
    unlocked,
    calls,
    unlock: async (password: string) => {
      calls.push(password);
      unlocked.set(true);
    },
    lock: () => unlocked.set(false),
    encrypt: (plain: string) => `enc:${plain}`,
    decrypt: (sealed: string) => {
      if (!sealed.startsWith('enc:')) throw new Error('bad');
      return sealed.slice(4);
    },
  };
}

export class InMemoryPasswordRepository implements PasswordRepository {
  /** Keyed by vault id. */
  readonly data = new Map<string, Map<string, PasswordRecord>>();
  private listeners = new Map<string, (records: PasswordRecord[]) => void>();
  private seq = 0;

  seed(vaultId: string, fields: Partial<PasswordFields> & { title: string; id?: string }) {
    const record: PasswordRecord = {
      id: fields.id ?? `p${++this.seq}`,
      title: fields.title,
      website: fields.website ?? '',
      username: fields.username ?? '',
      password: fields.password ?? 'enc:secret',
      notes: fields.notes ?? '',
      createdAt: 1,
      updatedAt: 1,
    };
    this.vault(vaultId).set(record.id, record);
    return record;
  }

  watch(_uid: string, vaultId: string, next: (records: PasswordRecord[]) => void) {
    this.listeners.set(vaultId, next);
    next([...this.vault(vaultId).values()]);
    return () => {
      this.listeners.delete(vaultId);
    };
  }

  async add(_uid: string, vaultId: string, fields: PasswordFields) {
    const record = this.seed(vaultId, fields);
    this.emit(vaultId);
    return record.id;
  }

  async update(_uid: string, vaultId: string, id: string, fields: PasswordFields) {
    const current = this.vault(vaultId).get(id);
    if (current) this.vault(vaultId).set(id, { ...current, ...fields, updatedAt: 2 });
    this.emit(vaultId);
  }

  async remove(_uid: string, vaultId: string, id: string) {
    this.vault(vaultId).delete(id);
    this.emit(vaultId);
  }

  private vault(vaultId: string) {
    let map = this.data.get(vaultId);
    if (!map) this.data.set(vaultId, (map = new Map()));
    return map;
  }

  private emit(vaultId: string) {
    this.listeners.get(vaultId)?.([...this.vault(vaultId).values()]);
  }
}
