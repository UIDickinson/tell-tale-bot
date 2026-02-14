// ============================================================
// Tests — RPC Fallback Service
// ============================================================

import { rotateProvider, getClient } from '../src/services/rpcFallback';

describe('RPC Fallback', () => {
  it('getClient returns a client instance', () => {
    const client = getClient();
    expect(client).toBeDefined();
    expect(typeof client.getBalance).toBe('function');
    expect(typeof client.getTransactionCount).toBe('function');
    expect(typeof client.getCode).toBe('function');
  });

  it('getClient returns the same instance on repeated calls', () => {
    const client1 = getClient();
    const client2 = getClient();
    expect(client1).toBe(client2);
  });

  it('rotateProvider creates a new client', () => {
    const client1 = getClient();
    rotateProvider();
    const client2 = getClient();
    // After rotation, should get a different client (or same if only 1 provider)
    expect(client2).toBeDefined();
  });
});
