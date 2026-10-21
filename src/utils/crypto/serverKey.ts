// Gets the server's RSA public key once and keeps it in memory.
// The server never sends its private key; it is in its own key file / env variable.
import axios from 'axios';
import appConfig from '@/configs/app.config';
import type { ApiResponse } from '@/types/api';
import { fromBase64 } from './base64';
import type { ServerKey } from './types';

type PublicKeyData = { keyId: string; publicKey: string; algorithm: string; mode: string };

let cached: Promise<ServerKey> | null = null;

async function load(): Promise<ServerKey> {
  // plain axios (not BaseService): this one call cannot be encrypted, it is how encryption starts
  const res = await axios.post<ApiResponse<PublicKeyData>>(`${appConfig.apiPrefix}/Crypto/GetPublicKey`, {});
  const data = res.data.Data;
  const key = await globalThis.crypto.subtle.importKey(
    'spki',
    fromBase64(data.publicKey),
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['encrypt'],
  );
  return { keyId: data.keyId, key };
}

export function getServerKey(): Promise<ServerKey> {
  cached ??= load().catch((e) => {
    cached = null; // try again on the next call
    throw e;
  });
  return cached;
}

/**
 * The server said KEY_CHANGED for a call made with `usedKeyId`: fetch the key again.
 * When several calls fail together, only the first one clears it, so the new key is fetched once.
 */
export async function forgetServerKey(usedKeyId?: string) {
  const current = cached ? await cached.catch(() => null) : null;
  if (!current || !usedKeyId || current.keyId === usedKeyId) cached = null;
}
