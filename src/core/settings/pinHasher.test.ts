import { describe, expect, it } from 'vitest';
import { hashPin, newSalt, pinMatches } from './pinHasher';

describe('pinHasher', () => {
  it('produces a 32-hex-char salt from 16 random bytes', () => {
    const salt = newSalt((n) => new Uint8Array(n).fill(0xab));
    expect(salt).toBe('ab'.repeat(16));
    expect(newSalt()).toMatch(/^[0-9a-f]{32}$/);
  });

  it('hashes exactly like Android: hex(sha256("salt:pin"))', async () => {
    // echo -n "0011:1234" | shasum -a 256
    expect(await hashPin('1234', '0011')).toBe(
      '9e7ed704de7baff8614365284b44866d3e40a6c0e4b2a6f7141d3c62bd3d95eb',
    );
    expect(await hashPin('1234', '0011')).not.toBe(await hashPin('1234', '0012'));
  });

  it('matches only a non-empty expected hash', async () => {
    const hash = await hashPin('1234', 'salt');
    expect(await pinMatches('1234', 'salt', hash)).toBe(true);
    expect(await pinMatches('4321', 'salt', hash)).toBe(false);
    expect(await pinMatches('1234', 'salt', '')).toBe(false);
  });
});
