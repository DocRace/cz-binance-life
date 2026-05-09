import crypto from 'crypto';

/** Sort query keys; match Partner test script convention. */
export function sortedQueryStringFromObject(query) {
  if (!query || typeof query !== 'object') return '';
  const keys = Object.keys(query).filter((k) => query[k] !== undefined && query[k] !== null).sort();
  if (!keys.length) return '';
  return keys.map((k) => `${k}=${encodeURIComponent(String(query[k]))}`).join('&');
}

/** Partner HMAC — same formula as scripts/partner-api-full-test.js: METHOD|pathname|sortedQuery|ts|nonce */
export function partnerSignature(method, pathname, sortedQuerySl, timestamp, nonce, secret) {
  const stringToSign = `${method.toUpperCase()}|${pathname}|${sortedQuerySl}|${timestamp}|${nonce}`;
  return {
    signature: crypto.createHmac('sha256', secret).update(stringToSign).digest('hex'),
    stringToSign,
  };
}

export function makePartnerAuthHeaders(method, pathname, sortedQuerySl, secret, appKey) {
  const timestamp = Math.floor(Date.now() / 1000);
  const nonce = crypto.randomBytes(16).toString('hex');
  const { signature } = partnerSignature(method, pathname, sortedQuerySl, timestamp, nonce, secret);
  const h = {
    'X-App-Key': appKey,
    'X-Timestamp': String(timestamp),
    'X-Nonce': nonce,
    'X-Signature': signature,
  };
  return h;
}
