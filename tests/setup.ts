// ============================================================
// Test Setup — Set fake env vars before config.ts is imported
// ============================================================

process.env.NEYNAR_API_KEY = 'test-neynar-key';
process.env.NEYNAR_SIGNER_UUID = 'test-signer-uuid';
process.env.BOT_FID = '12345';
process.env.OPENAI_API_KEY = 'test-openai-key';
process.env.BASESCAN_API_KEY = 'test-basescan-key';
process.env.WEBHOOK_SECRET = 'test-webhook-secret';
process.env.NODE_ENV = 'test';
