import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

let configured = false;

/**
 * Social card SVGs render Bengali text via sharp/libvips, which delegates font
 * matching to the system's fontconfig + pango stack. Relying solely on an
 * OS-level font package (as the Dockerfile's `apk add font-noto-bengali` does)
 * only covers that exact container image — a bare `pnpm dev` host or any
 * environment without that package renders Bengali glyphs as tofu boxes.
 * Bundling the font in-repo and pointing FONTCONFIG_PATH at a generated config
 * makes rendering correct everywhere, while still falling back to whatever
 * system fonts exist for everything else.
 */
export function ensureBengaliFontconfig(): void {
  if (configured) return;
  configured = true;

  // A deployer who has already configured font discovery knows best.
  if (process.env.FONTCONFIG_PATH) return;

  const candidates = [
    resolve(process.cwd(), 'apps/api/assets/fonts'),
    resolve(process.cwd(), 'assets/fonts'),
  ];
  const fontsDir = candidates.find((dir) => existsSync(join(dir, 'NotoSansBengali.ttf')));
  if (!fontsDir) return;

  const confDir = mkdtempSync(join(tmpdir(), 'fontconfig-'));
  const cacheDir = join(confDir, 'cache');
  mkdirSync(cacheDir, { recursive: true });
  writeFileSync(
    join(confDir, 'fonts.conf'),
    `<?xml version="1.0"?>
<!DOCTYPE fontconfig SYSTEM "fonts.dtd">
<fontconfig>
  <dir>${fontsDir}</dir>
  <cachedir>${cacheDir}</cachedir>
  <include ignore_missing="yes">/etc/fonts/fonts.conf</include>
</fontconfig>
`,
  );
  process.env.FONTCONFIG_PATH = confDir;
}
