const { computeRequestHash } = require('../../src/utils/idempotency');

describe('Idempotency Request Hash Utility', () => {
  test('returns deterministic SHA-256 hash irrespective of key order', () => {
    const payloadA = { addressId: '12345', note: 'fast' };
    const payloadB = { note: 'fast', addressId: '12345' };

    const hashA = computeRequestHash(payloadA);
    const hashB = computeRequestHash(payloadB);

    expect(hashA).toBe(hashB);
    expect(hashA).toHaveLength(64);
  });

  test('produces different hash for differing payloads', () => {
    const hash1 = computeRequestHash({ addressId: 'addr1' });
    const hash2 = computeRequestHash({ addressId: 'addr2' });

    expect(hash1).not.toBe(hash2);
  });
});

