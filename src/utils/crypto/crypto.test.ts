// Plays both sides: the browser code encrypts, a fake "server" (same steps as the Java filter) opens it.
import { describe, expect, it } from 'vitest';
import { fromBase64, toBase64, utf8 } from './base64';
import { decryptResponse, isEncryptedResponse } from './decryption';
import { encryptRequest } from './encryption';
import { endpointOf } from './aad';

const subtle = globalThis.crypto.subtle;

async function serverKeys() {
  const pair = await subtle.generateKey(
    { name: 'RSA-OAEP', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
    true,
    ['encrypt', 'decrypt'],
  );
  return { pair, server: { keyId: 'test', key: pair.publicKey } };
}

async function serverOpens(body: { EncryptedAESKey: string; EncryptedData: string; IV: string }, privateKey: CryptoKey, endpoint: string) {
  const raw = await subtle.decrypt({ name: 'RSA-OAEP' }, privateKey, fromBase64(body.EncryptedAESKey));
  const aes = await subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
  const plain = await subtle.decrypt(
    { name: 'AES-GCM', iv: fromBase64(body.IV), additionalData: utf8(`pavti-request:${endpoint}`) },
    aes,
    fromBase64(body.EncryptedData),
  );
  return { aes, json: JSON.parse(new TextDecoder().decode(plain)) };
}

describe('API encryption', () => {
  it('server can open what the browser sends, and the browser can open the answer', async () => {
    const { pair, server } = await serverKeys();
    const data = { itemName: 'मसाला डोसा', price: 180 };
    const { body, aesKey } = await encryptRequest(data, 'MenuItem/Save', server);
    expect(JSON.stringify(body)).not.toContain('180');

    const { aes, json } = await serverOpens(body, pair.privateKey, 'MenuItem/Save');
    expect(json).toEqual(data);

    const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
    const answer = { Success: true, StatusCode: 200, Message: 'Saved', Data: true };
    const cipher = await subtle.encrypt(
      { name: 'AES-GCM', iv, additionalData: utf8('pavti-response:MenuItem/Save') },
      aes,
      utf8(JSON.stringify(answer)),
    );
    const reply = { EncryptedData: toBase64(cipher), IV: toBase64(iv) };
    expect(isEncryptedResponse(reply)).toBe(true);
    expect(await decryptResponse(reply, aesKey, 'MenuItem/Save')).toEqual(answer);
  });

  it('a body made for one API cannot be opened as another', async () => {
    const { pair, server } = await serverKeys();
    const { body } = await encryptRequest({ id: 5 }, 'Order/GetById', server);
    await expect(serverOpens(body, pair.privateKey, 'Order/Cancel')).rejects.toThrow();
  });

  it('every request gets a new key and IV', async () => {
    const { server } = await serverKeys();
    const a = await encryptRequest({ x: 1 }, 'A', server);
    const b = await encryptRequest({ x: 1 }, 'A', server);
    expect(a.body.IV).not.toBe(b.body.IV);
    expect(a.body.EncryptedData).not.toBe(b.body.EncryptedData);
  });

  it('endpoint names match the server', () => {
    expect(endpointOf('/Order/Save')).toBe('Order/Save');
    expect(endpointOf('http://localhost:8080/api/Order/Save/')).toBe('Order/Save');
  });
});
