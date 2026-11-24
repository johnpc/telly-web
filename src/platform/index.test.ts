import { describe, expect, it } from 'vitest';
import { bootPlatform } from './index';

describe('bootPlatform', () => {
  it('runs every platform module as a no-op on a plain browser', () => {
    expect(() => bootPlatform()).not.toThrow();
  });
});
