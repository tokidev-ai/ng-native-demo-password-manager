import { Injectable, InjectionToken, computed, effect, inject, signal } from '@angular/core';
import { gcm } from '@noble/ciphers/aes.js';
import { pbkdf2Async } from '@noble/hashes/pbkdf2.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { Crypto } from '@ng-native/expo/crypto';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { AuthService } from './auth.service.ts';
import { db } from './firebase.ts';

/**
 * Client-side encryption for secrets.
 *
 * The key is derived from the account password (PBKDF2-SHA256 with a random per-user salt) and
 * kept in memory only. Secrets are sealed with AES-256-GCM, a fresh random 96-bit IV each time,
 * and stored as `v1:<iv>:<ciphertext+tag>` in base64. Firestore never sees the key or any
 * plaintext secret, and a changed or corrupted value fails GCM authentication when opened.
 */

/** PBKDF2 rounds for new accounts. Stored with the salt, so it can be raised later. */
export const KDF_ITERATIONS = new InjectionToken<number>('KDF_ITERATIONS', {
  providedIn: 'root',
  factory: () => 100_000,
});

/** What is kept per user (not secret) to rebuild the key and to check the password. */
export interface KeyMaterial {
  salt: string;
  iterations: number;
  /** A known text sealed with the key, so a wrong password is detected before any real data. */
  verifier: string;
}

export interface KeyStore {
  get(uid: string): Promise<KeyMaterial | null>;
  save(uid: string, material: KeyMaterial): Promise<void>;
}

class FirestoreKeyStore implements KeyStore {
  async get(uid: string): Promise<KeyMaterial | null> {
    const snapshot = await getDoc(doc(db, 'users', uid));
    const data = snapshot.data();
    if (!data?.['keySalt']) return null;
    return {
      salt: data['keySalt'],
      iterations: data['kdfIterations'],
      verifier: data['keyVerifier'],
    };
  }

  async save(uid: string, material: KeyMaterial): Promise<void> {
    await setDoc(
      doc(db, 'users', uid),
      { keySalt: material.salt, kdfIterations: material.iterations, keyVerifier: material.verifier },
      { merge: true },
    );
  }
}

export const KEY_STORE = new InjectionToken<KeyStore>('KEY_STORE', {
  providedIn: 'root',
  factory: () => new FirestoreKeyStore(),
});

export class WrongPasswordError extends Error {
  constructor() {
    super('This password cannot unlock your vaults.');
    this.name = 'WrongPasswordError';
  }
}

const VERSION = 'v1';
const VERIFIER_TEXT = 'ng-vault-key-check';
const encoder = new TextEncoder();
const decoder = new TextDecoder();

export function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export function fromBase64(text: string): Uint8Array {
  const binary = atob(text);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

@Injectable({ providedIn: 'root' })
export class CryptoService {
  private readonly random = inject(Crypto);
  private readonly store = inject(KEY_STORE);
  private readonly auth = inject(AuthService);
  private readonly iterations = inject(KDF_ITERATIONS);

  private readonly key = signal<Uint8Array | null>(null);
  readonly unlocked = computed(() => this.key() !== null);

  constructor() {
    // Signing out forgets the key.
    effect(() => {
      if (this.auth.user() === null) this.key.set(null);
    });
  }

  /**
   * Derives the key from the account password. A new account gets a fresh salt and verifier;
   * an existing one is checked against its verifier and throws `WrongPasswordError` on mismatch.
   */
  async unlock(password: string): Promise<void> {
    const uid = this.auth.user()?.uid;
    if (!uid) throw new Error('Not signed in.');

    const material = await this.store.get(uid);
    if (!material) {
      const salt = this.random.randomBytes(16);
      const key = await this.derive(password, salt, this.iterations);
      await this.store.save(uid, {
        salt: toBase64(salt),
        iterations: this.iterations,
        verifier: this.seal(key, VERIFIER_TEXT),
      });
      this.key.set(key);
      return;
    }

    const key = await this.derive(password, fromBase64(material.salt), material.iterations);
    let ok = false;
    try {
      ok = this.open(key, material.verifier) === VERIFIER_TEXT;
    } catch {
      ok = false;
    }
    if (!ok) throw new WrongPasswordError();
    this.key.set(key);
  }

  lock(): void {
    this.key.set(null);
  }

  encrypt(plain: string): string {
    return this.seal(this.requireKey(), plain);
  }

  decrypt(sealed: string): string {
    return this.open(this.requireKey(), sealed);
  }

  private requireKey(): Uint8Array {
    const key = this.key();
    if (!key) throw new Error('The vault is locked.');
    return key;
  }

  private derive(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
    return pbkdf2Async(sha256, password, salt, { c: iterations, dkLen: 32 });
  }

  private seal(key: Uint8Array, plain: string): string {
    const iv = this.random.randomBytes(12);
    const cipher = gcm(key, iv).encrypt(encoder.encode(plain));
    return `${VERSION}:${toBase64(iv)}:${toBase64(cipher)}`;
  }

  private open(key: Uint8Array, sealed: string): string {
    const [version, iv, cipher] = sealed.split(':');
    if (version !== VERSION || !iv || !cipher) throw new Error('Unsupported secret format.');
    return decoder.decode(gcm(key, fromBase64(iv)).decrypt(fromBase64(cipher)));
  }
}
