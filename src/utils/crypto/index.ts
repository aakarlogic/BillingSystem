// API body encryption — one folder, used only by services/BaseService.ts.
// Same idea as Health 360 (RSA + AES per request), with stronger settings:
// AES-256-GCM (detects changes) and RSA-OAEP SHA-256. Server side: pavti-api com.pavti.crypto.
import appConfig from '@/configs/app.config';

export { encryptRequest } from './encryption';
export { decryptResponse, isEncryptedResponse } from './decryption';
export { getServerKey, forgetServerKey } from './serverKey';
export { endpointOf } from './aad';
export { ENCRYPTED_HEADER, KEY_CHANGED } from './types';
export type { EncryptedRequest, EncryptedResponse, ServerKey } from './types';

let warned = false;

/**
 * On when talking to the real server and VITE_ENCRYPT_API is not "false".
 * The browser only allows WebCrypto on https:// or localhost; on plain http (e.g. a phone opening
 * http://192.168.1.5) it is off and requests go plain. Use https in production.
 */
export function encryptionEnabled(): boolean {
  if (appConfig.useMockApi || !appConfig.encryptApi) return false;
  if (!globalThis.crypto?.subtle) {
    if (!warned) console.warn('Pavti: API encryption needs https:// (or localhost). Sending plain requests.');
    warned = true;
    return false;
  }
  return true;
}
