import { InjectionToken } from '@angular/core';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase.ts';
import type { Vault } from './models.ts';

export type VaultInput = Pick<Vault, 'name' | 'color'>;

/** Where vaults are stored. Firestore in the app, an in-memory fake in tests. */
export interface VaultRepository {
  /** Calls `next` with every change to the user's vaults. Returns the unsubscribe function. */
  watch(uid: string, next: (vaults: Vault[]) => void, fail: (error: unknown) => void): () => void;
  add(uid: string, input: VaultInput): Promise<string>;
  update(uid: string, vaultId: string, input: VaultInput): Promise<void>;
  /** Deletes the vault and every password inside it. */
  remove(uid: string, vaultId: string): Promise<void>;
}

const BATCH_LIMIT = 400;

class FirestoreVaultRepository implements VaultRepository {
  watch(uid: string, next: (vaults: Vault[]) => void, fail: (error: unknown) => void) {
    return onSnapshot(
      collection(db, 'users', uid, 'vaults'),
      (snapshot) => next(snapshot.docs.map((d) => ({ ...(d.data() as Omit<Vault, 'id'>), id: d.id }))),
      fail,
    );
  }

  async add(uid: string, input: VaultInput): Promise<string> {
    const now = Date.now();
    const ref = await addDoc(collection(db, 'users', uid, 'vaults'), {
      ...input,
      createdAt: now,
      updatedAt: now,
    });
    return ref.id;
  }

  async update(uid: string, vaultId: string, input: VaultInput): Promise<void> {
    await updateDoc(doc(db, 'users', uid, 'vaults', vaultId), { ...input, updatedAt: Date.now() });
  }

  async remove(uid: string, vaultId: string): Promise<void> {
    const passwords = await getDocs(collection(db, 'users', uid, 'vaults', vaultId, 'passwords'));
    for (let i = 0; i < passwords.docs.length; i += BATCH_LIMIT) {
      const batch = writeBatch(db);
      passwords.docs.slice(i, i + BATCH_LIMIT).forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
    await deleteDoc(doc(db, 'users', uid, 'vaults', vaultId));
  }
}

export const VAULT_REPOSITORY = new InjectionToken<VaultRepository>('VAULT_REPOSITORY', {
  providedIn: 'root',
  factory: () => new FirestoreVaultRepository(),
});
