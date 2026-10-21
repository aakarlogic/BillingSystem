// Extra text bound into AES-GCM (not secret). It must be the same on the server
// (CryptoHelper.requestAad / responseAad), so a body made for one API cannot be sent to another.

/** "/Order/Save/" or "Order/Save" → "Order/Save" */
export const endpointOf = (url?: string) => (url ?? '').replace(/^.*\/api\//, '').replace(/^\/+|\/+$/g, '');

export const requestAad = (endpoint: string) => `pavti-request:${endpoint}`;
export const responseAad = (endpoint: string) => `pavti-response:${endpoint}`;
