// Encrypts one request body (Health 360: utils/encryption).
//  1. a fresh AES-256 key for this one request
//  2. the JSON body → AES-GCM with a random 12-byte IV
//  3. the AES key → RSA-OAEP (SHA-256) with the server's public key, so only the server can open it
import { requestAad } from './aad';
import { toBase64, utf8 } from './base64';
import type { EncryptedRequest, ServerKey } from './types';

export async function encryptRequest(
  data: unknown,
  endpoint: string,
  server: ServerKey,
): Promise<{ body: EncryptedRequest; aesKey: CryptoKey }> {
  const subtle = globalThis.crypto.subtle;
  const aesKey = await subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const cipher = await subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: utf8(requestAad(endpoint)) },
    aesKey,
    utf8(JSON.stringify(data ?? {})),
  );
  const rawKey = await subtle.exportKey('raw', aesKey);
  const wrappedKey = await subtle.encrypt({ name: 'RSA-OAEP' }, server.key, rawKey);
  return {
    body: { EncryptedAESKey: toBase64(wrappedKey), EncryptedData: toBase64(cipher), IV: toBase64(iv), KeyId: server.keyId },
    aesKey,
  };
}
