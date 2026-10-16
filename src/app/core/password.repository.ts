import { InjectionToken } from '@angular/core';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  updateDoc,
} from 'firebase/firestore';
import { db } from './firebase.ts';

/** What is stored for a password entry. `password` and `notes` are encrypted. */
export interface PasswordFields {
  title: string;
  website: string;
  username: string;
  password: string;
  notes: string;
}

export interface PasswordRecord extends PasswordFields {
  id: string;
  createdAt: number;
  updatedAt: number;
}

/** Where password entries are stored. Firestore in the app, an in-memory fake in tests. */
export interface PasswordRepository {
  watch(
    uid: string,
    vaultId: string,
    next: (records: PasswordRecord[]) => void,
    fail: (error: unknown) => void,
  ): () => void;
  add(uid: string, vaultId: string, fields: PasswordFields): Promise<string>;
  update(uid: string, vaultId: string, id: string, fields: PasswordFields): Promise<void>;
  remove(uid: string, vaultId: string, id: string): Promise<void>;
}

class FirestorePasswordRepository implements PasswordRepository {
  watch(
    uid: string,
    vaultId: string,
    next: (records: PasswordRecord[]) => void,
    fail: (error: unknown) => void,
  ) {
    return onSnapshot(
      collection(db, 'users', uid, 'vaults', vaultId, 'passwords'),
      (snapshot) =>
        next(snapshot.docs.map((d) => ({ ...(d.data() as Omit<PasswordRecord, 'id'>), id: d.id }))),
      fail,
    );
  }

  async add(uid: string, vaultId: string, fields: PasswordFields): Promise<string> {
    const now = Date.now();
    const ref = await addDoc(collection(db, 'users', uid, 'vaults', vaultId, 'passwords'), {
      ...fields,
      createdAt: now,
      updatedAt: now,
    });
    return ref.id;
  }

  async update(uid: string, vaultId: string, id: string, fields: PasswordFields): Promise<void> {
    await updateDoc(doc(db, 'users', uid, 'vaults', vaultId, 'passwords', id), {
      ...fields,
      updatedAt: Date.now(),
    });
  }

  async remove(uid: string, vaultId: string, id: string): Promise<void> {
    await deleteDoc(doc(db, 'users', uid, 'vaults', vaultId, 'passwords', id));
  }
}

export const PASSWORD_REPOSITORY = new InjectionToken<PasswordRepository>('PASSWORD_REPOSITORY', {
  providedIn: 'root',
  factory: () => new FirestorePasswordRepository(),
});
