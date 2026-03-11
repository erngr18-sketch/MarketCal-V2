import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const rootDir = process.cwd();
const controlCheckPath = resolve(rootDir, 'CONTROL_CHECK.md');
const packageJsonPath = resolve(rootDir, 'package.json');

if (!existsSync(controlCheckPath)) {
  console.error("[controlcheck] Hata: CONTROL_CHECK.md bulunamadı.");
  process.exit(1);
}

if (!existsSync(packageJsonPath)) {
  console.error("[controlcheck] Hata: package.json bulunamadı.");
  process.exit(1);
}

const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
const scripts = packageJson?.scripts ?? {};

console.log(`[controlcheck] Node sürümü: ${process.version}`);
assertSupportedNodeVersion();
runUiGuards();

const commands = [['run', 'typecheck']];
if (typeof scripts.lint === 'string' && scripts.lint.trim().length > 0) {
  commands.push(['run', 'lint']);
}
commands.push(['run', 'build', '--ignore-scripts']);

for (const args of commands) {
  const label = `${npmCmd} ${args.join(' ')}`;
  console.log(`\n[controlcheck] Çalıştırılıyor: ${label}`);

  const result = spawnSync(npmCmd, args, {
    cwd: rootDir,
    stdio: 'inherit',
    env: {
      ...process.env,
      npm_config_ignore_scripts: args.includes('--ignore-scripts') ? 'true' : process.env.npm_config_ignore_scripts
    }
  });

  if (result.status !== 0) {
    console.error(`\n[controlcheck] Hata: ${label} başarısız oldu.`);
    process.exit(result.status ?? 1);
  }
}

console.log('\n[controlcheck] Tüm kontroller başarıyla tamamlandı.');

function assertSupportedNodeVersion() {
  const major = Number(process.versions.node.split('.')[0]);
  const supported = major === 20 || major === 22;
  const allowUnsupported = process.env.CONTROLCHECK_ALLOW_UNSUPPORTED_NODE === '1';

  if (!supported && !allowUnsupported) {
    console.error(
      `[controlcheck] Hata: Node ${process.version} desteklenen aralıkta değil. ` +
        'Önerilen sürümler: v20.x veya v22.x (LTS). ' +
        "Geçici override için CONTROLCHECK_ALLOW_UNSUPPORTED_NODE=1 kullanın."
    );
    process.exit(1);
  }

  if (!supported && allowUnsupported) {
    console.warn(`[controlcheck] Uyarı: Node ${process.version} desteklenmiyor (override aktif).`);
  }
}

function runUiGuards() {
  const layoutTsx = readRequiredFile('app/layout.tsx');
  const globalsCss = readRequiredFile('app/globals.css');
  const tailwindConfig = readRequiredFile('tailwind.config.ts');
  const comparePage = readRequiredFile('app/(panel)/analyses/marketplace-comparison/page.tsx');
  const sidebarTsx = readRequiredFile('app/components/sidebar.tsx');
  const routesTs = readRequiredFile('lib/routes.ts');

  assertMatch(layoutTsx, /import\s+['"]\.\/globals\.css['"];?/, 'app/layout.tsx', "Root layout içinde './globals.css' import'u zorunlu.");

  assertMatch(globalsCss, /@tailwind\s+base;/, 'app/globals.css', '@tailwind base; eksik.');
  assertMatch(globalsCss, /@tailwind\s+components;/, 'app/globals.css', '@tailwind components; eksik.');
  assertMatch(globalsCss, /@tailwind\s+utilities;/, 'app/globals.css', '@tailwind utilities; eksik.');
  assertMatch(globalsCss, /\.card\s*\{/, 'app/globals.css', '.card class tanımı eksik.');

  assertMatch(
    tailwindConfig,
    /\.\/app\/\*\*\/\*\.\{[^}]*ts[^}]*tsx[^}]*\}/,
    'tailwind.config.ts',
    "Tailwind content içinde './app/**/*' deseni eksik."
  );

  assertMatch(comparePage, /export\s+default\s+function/, 'app/(panel)/analyses/marketplace-comparison/page.tsx', 'Marketplace comparison page default export eksik.');
  assertMatch(routesTs, /marketplaceComparison:\s*['"]\/analyses\/marketplace-comparison['"]/, 'lib/routes.ts', "marketplaceComparison route'u eksik.");
  assertMatch(sidebarTsx, /routes\.analyses\.marketplaceComparison/, 'app/components/sidebar.tsx', "Sidebar marketplace comparison route config kullanmalı.");
  assertNoMatch(sidebarTsx, /href:\s*['"]\/app\/compare['"]/, 'app/components/sidebar.tsx', "Sidebar içinde eski '/app/compare' linki tespit edildi.");

  console.log('[controlcheck] UI guard kontrolleri geçti.');
}

function readRequiredFile(relativePath) {
  const absolutePath = resolve(rootDir, relativePath);
  if (!existsSync(absolutePath)) {
    console.error(`[controlcheck] Hata: '${relativePath}' bulunamadı.`);
    process.exit(1);
  }
  return readFileSync(absolutePath, 'utf8');
}

function assertMatch(content, pattern, file, message) {
  if (!pattern.test(content)) {
    console.error(`[controlcheck] Hata (${file}): ${message}`);
    process.exit(1);
  }
}

function assertNoMatch(content, pattern, file, message) {
  if (pattern.test(content)) {
    console.error(`[controlcheck] Hata (${file}): ${message}`);
    process.exit(1);
  }
}
