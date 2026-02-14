// ============================================================
// Tests — Farcaster Service (Webhook Signature Verification)
// ============================================================

import crypto from 'crypto';
import { verifyWebhookSignature } from '../src/services/farcaster';

describe('verifyWebhookSignature', () => {
  it('verifies a valid HMAC-SHA512 signature', () => {
    const body = '{"type":"cast.created","data":{"hash":"0xabc"}}';
    const secret = 'test-webhook-secret'; // matches setup.ts
    const hmac = crypto.createHmac('sha512', secret);
    hmac.update(body);
    const signature = hmac.digest('hex');

    expect(verifyWebhookSignature(body, signature)).toBe(true);
  });

  it('rejects an invalid signature', () => {
    const body = '{"type":"cast.created"}';
    const fakeSignature = crypto.createHmac('sha512', 'wrong-secret')
      .update(body)
      .digest('hex');

    expect(verifyWebhookSignature(body, fakeSignature)).toBe(false);
  });

  it('rejects a tampered body', () => {
    const originalBody = '{"type":"cast.created"}';
    const secret = 'test-webhook-secret';
    const signature = crypto.createHmac('sha512', secret)
      .update(originalBody)
      .digest('hex');

    const tamperedBody = '{"type":"cast.deleted"}';
    expect(verifyWebhookSignature(tamperedBody, signature)).toBe(false);
  });
});
