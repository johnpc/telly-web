/**
 * Platform bootstraps for store-packaged builds (Xbox PWA, LG webOS, Samsung
 * Tizen). Each module detects its host at runtime and is a no-op elsewhere, so
 * ONE build serves every target. Register new platforms here.
 */
import { bootPwa } from './pwa';
import { bootTizen } from './tizen';
import { bootWebOS } from './webos';

export function bootPlatform(): void {
  bootPwa();
  bootTizen();
  bootWebOS();
  // Platform modules append themselves below.
}
