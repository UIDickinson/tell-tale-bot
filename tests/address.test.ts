// ============================================================
// Tests — Address Parsing Utilities
// ============================================================

import { extractAddress, containsAddress, shortenAddress } from '../src/utils/address';

describe('extractAddress', () => {
  it('extracts a valid checksummed address', () => {
    const result = extractAddress('Check this wallet 0x742d35Cc6634C0532925a3b844Bc9e7595f8b3a1');
    expect(result).toBe('0x742D35Cc6634C0532925A3b844Bc9E7595F8B3A1');
  });

  it('extracts a lowercase address and checksums it', () => {
    const result = extractAddress('0x742d35cc6634c0532925a3b844bc9e7595f8b3a1');
    expect(result).not.toBeNull();
    expect(result!.startsWith('0x')).toBe(true);
    expect(result!.length).toBe(42);
  });

  it('extracts address from surrounding text', () => {
    const result = extractAddress('@TellTaleBot analyze 0x742d35Cc6634C0532925a3b844Bc9e7595f8b3a1 please');
    expect(result).not.toBeNull();
  });

  it('returns null for text without addresses', () => {
    expect(extractAddress('hello world')).toBeNull();
    expect(extractAddress('')).toBeNull();
    expect(extractAddress('check this 0x123')).toBeNull(); // too short
  });

  it('returns null for invalid hex (wrong length after 0x)', () => {
    expect(extractAddress('0xZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ')).toBeNull();
  });

  it('extracts the first address when multiple are present', () => {
    const text = '0x742d35Cc6634C0532925a3b844Bc9e7595f8b3a1 and 0x0000000000000000000000000000000000000000';
    const result = extractAddress(text);
    expect(result).toBe('0x742D35Cc6634C0532925A3b844Bc9E7595F8B3A1');
  });

  it('handles the null/zero address', () => {
    const result = extractAddress('0x0000000000000000000000000000000000000000');
    expect(result).toBe('0x0000000000000000000000000000000000000000');
  });
});

describe('containsAddress', () => {
  it('returns true for text containing an address', () => {
    expect(containsAddress('Send to 0x742d35Cc6634C0532925a3b844Bc9e7595f8b3a1')).toBe(true);
  });

  it('returns false for text without addresses', () => {
    expect(containsAddress('just some text')).toBe(false);
    expect(containsAddress('')).toBe(false);
  });
});

describe('shortenAddress', () => {
  it('shortens address with default chars', () => {
    const result = shortenAddress('0x742D35Cc6634C0532925A3b844Bc9E7595F8B3A1');
    expect(result).toBe('0x742D...B3A1');
  });

  it('shortens address with custom chars count', () => {
    const result = shortenAddress('0x742D35Cc6634C0532925A3b844Bc9E7595F8B3A1', 6);
    expect(result).toBe('0x742D35...F8B3A1');
  });

  it('handles short input gracefully', () => {
    const result = shortenAddress('0x1234', 2);
    expect(result).toBe('0x12...34');
  });
});
