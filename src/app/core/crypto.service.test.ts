import { randomBytes } from 'node:crypto';
import { Crypto } from '@ng-native/expo/crypto';
import { injectService } from '@ng-native/testing';
import { expect, test, vi } from 'vitest';
import { AuthService } from './auth.service.ts';
import {
  CryptoService,
  KDF_ITERATIONS,
  KEY_STORE,
  WrongPasswordError,
  type KeyMaterial,
  type KeyStore,
} from './crypto.service.ts';
import { generatePassword } from './password-generator.ts';
import { fakeAuth } from '../testing/fakes.ts';

vi.mock('./firebase.ts', () => ({ auth: {}, db: {} }));

class MemoryKeyStore implements KeyStore {
  readonly saved = new Map<string, KeyMaterial>();
  async get(uid: string) {
    return this.saved.get(uid) ?? null;
  }
  async save(uid: string, material: KeyMaterial) {
    this.saved.set(uid, material);
  }
}

function setup(store = new MemoryKeyStore()) {
  const auth = fakeAuth();
  const service = injectService(CryptoService, {
    providers: [
      { provide: AuthService, useValue: auth },
      { provide: KEY_STORE, useValue: store },
      { provide: KDF_ITERATIONS, useValue: 1000 },
      { provide: Crypto.SOURCE, useValue: { getRandomBytes: (n: number) => new Uint8Array(randomBytes(n)) } },
    ],
  });
  return { service, store, auth };
}

test('is locked until unlocked, and refuses to encrypt while locked', () => {
  const { service } = setup();

  expect(service.unlocked()).toBe(false);
  expect(() => service.encrypt('secret')).toThrow('locked');
});

test('a first unlock creates the salt and verifier, and round trips secrets', async () => {
  const { service, store } = setup();

  await service.unlock('correct horse battery');

  expect(service.unlocked()).toBe(true);
  expect(store.saved.get('u1')).toMatchObject({ iterations: 1000 });
  const sealed = service.encrypt('hunter2 ñ 🔑');
  expect(sealed).toMatch(/^v1:[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+$/);
  expect(sealed).not.toContain('hunter2');
  expect(service.decrypt(sealed)).toBe('hunter2 ñ 🔑');
});

test('the same text encrypts differently each time (fresh IV)', async () => {
  const { service } = setup();
  await service.unlock('correct horse battery');

  expect(service.encrypt('same')).not.toBe(service.encrypt('same'));
});

test('a second session with the right password reads earlier secrets', async () => {
  const first = setup();
  await first.service.unlock('correct horse battery');
  const sealed = first.service.encrypt('persisted');

  const second = setup(first.store);
  await second.service.unlock('correct horse battery');

  expect(second.service.decrypt(sealed)).toBe('persisted');
});

test('the wrong password is rejected and does not unlock', async () => {
  const first = setup();
  await first.service.unlock('correct horse battery');

  const second = setup(first.store);
  await expect(second.service.unlock('not the password')).rejects.toBeInstanceOf(WrongPasswordError);
  expect(second.service.unlocked()).toBe(false);
});

test('a tampered secret fails to decrypt', async () => {
  const { service } = setup();
  await service.unlock('correct horse battery');
  const [version, iv, cipher] = service.encrypt('secret').split(':');
  const flipped = (cipher[0] === 'A' ? 'B' : 'A') + cipher.slice(1);

  expect(() => service.decrypt(`${version}:${iv}:${flipped}`)).toThrow();
});

test('lock forgets the key', async () => {
  const { service } = setup();
  await service.unlock('correct horse battery');

  service.lock();

  expect(service.unlocked()).toBe(false);
  expect(() => service.decrypt('v1:a:b')).toThrow('locked');
});

test('generated passwords have the requested length and every character class', () => {
  const random = (n: number) => new Uint8Array(randomBytes(n));

  for (let i = 0; i < 50; i++) {
    const password = generatePassword(random, 20);
    expect(password).toHaveLength(20);
    expect(password).toMatch(/[a-z]/);
    expect(password).toMatch(/[A-Z]/);
    expect(password).toMatch(/[0-9]/);
    expect(password).toMatch(/[^a-zA-Z0-9]/);
  }
  expect(generatePassword(random)).not.toBe(generatePassword(random));
});
