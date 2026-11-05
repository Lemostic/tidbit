// Run tauri build with proper env, then bundle nsis+msi
const { spawnSync } = require('node:child_process');

const env = { ...process.env, CI: 'true', NO_COLOR: '1' };
const cwd = 'D:/dev/Projects/github/tidbit';

function run(label, cmd, args, opts = {}) {
  console.log('\n>>> ' + label);
  const r = spawnSync(cmd, args, { cwd, env, encoding: 'utf8', shell: false, ...opts });
  console.log('exit:', r.status, 'signal:', r.signal);
  if (r.stdout) console.log('--STDOUT--\n' + r.stdout);
  if (r.stderr) console.log('--STDERR--\n' + r.stderr);
  return r;
}

// Step 1: vite build
run('pnpm build', 'node', ['node_modules/vite/bin/vite.js', 'build'], { timeout: 120000 });

// Step 2: tauri build (skip bundle, just compile rust + produce exe)
const r = run('tauri build --no-bundle', 'node', ['node_modules/@tauri-apps/cli/tauri.js', 'build', '--no-bundle'], { timeout: 600000 });
if (r.status !== 0) {
  console.log('Tauri build failed, aborting bundle step.');
  process.exit(1);
}

// Step 3: tauri bundle (nsis + msi)
const r2 = run('tauri bundle', 'node', ['node_modules/@tauri-apps/cli/tauri.js', 'bundle', '--bundles', 'nsis,msi'], { timeout: 600000 });
console.log(r2.status === 0 ? '\n=== BUILD COMPLETE ===' : '\n=== BUNDLE FAILED ===');
process.exit(r2.status);
