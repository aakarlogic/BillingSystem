// Opens the server's encrypted answer with the AES key made for that request (Health 360: utils/decryption).
import { responseAad } from './aad';
import { fromBase64, fromUtf8, utf8 } from './base64';
import type { EncryptedResponse } from './types';

export function isEncryptedResponse(body: unknown): body is EncryptedResponse {
  return !!body && typeof body === 'object' && 'EncryptedData' in body && 'IV' in body;
}

/** Throws if the data was changed on the way (AES-GCM checks it). */
export async function decryptResponse<T = unknown>(body: EncryptedResponse, aesKey: CryptoKey, endpoint: string): Promise<T> {
  const plain = await globalThis.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromBase64(body.IV), additionalData: utf8(responseAad(endpoint)) },
    aesKey,
    fromBase64(body.EncryptedData),
  );
  return JSON.parse(fromUtf8(plain)) as T;
}
