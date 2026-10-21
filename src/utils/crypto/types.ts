// Shapes sent on the wire. Names match the Java backend (com.pavti.crypto) and Health 360.

/** What the browser sends instead of the plain JSON body. All values are base64. */
export type EncryptedRequest = {
  EncryptedAESKey: string;
  EncryptedData: string;
  IV: string;
  /** which server key was used; the server answers 409 KEY_CHANGED when it has a new one */
  KeyId: string;
};

/** What the server sends back: the normal ApiResponse, encrypted with the same AES key. */
export type EncryptedResponse = {
  EncryptedData: string;
  IV: string;
};

/** The server's RSA public key, from /Crypto/GetPublicKey. */
export type ServerKey = {
  keyId: string;
  key: CryptoKey;
};

/** Header that marks an encrypted body (both directions). */
export const ENCRYPTED_HEADER = 'X-Pavti-Encrypted';
/** Data of the 409 answer when the server key changed. */
export const KEY_CHANGED = 'KEY_CHANGED';
