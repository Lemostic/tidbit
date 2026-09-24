const { chromium } = require('playwright');
const path = require('node:path');
const OUT = path.join(__dirname, 'polish-survey');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
  await page.addInitScript(() => {
    localStorage.setItem('theme', 'dark');
    localStorage.setItem('changelog-seen-version', '0.2.11');
    localStorage.setItem('docking-enabled', 'false');
    window.__TAURI_EVENT_PLUGIN_INTERNALS__ = { unregisterListener() {} };
    window.__TAURI_INTERNALS__ = {
      metadata: { currentWindow: { label: 'main' }, currentWebview: { label: 'main' } },
      transformCallback: () => 1, unregisterCallback() {}, convertFileSrc: x => x,
      invoke: async (cmd) => {
        if (cmd === 'notes_list') return [];
        if (cmd === 'groups_list') return [];
        if (cmd === 'tags_list') return [];
        if (cmd === 'backup_list') return [];
        if (cmd === 'data_directory_get') return { default_dir: 'D:/Notes', active_dir: 'D:/Notes', pending_dir: null };
        if (cmd.includes('is_maximized')) return false;
        if (cmd.includes('scale_factor')) return 1;
        if (cmd.includes('outer_position')) return { x: 0, y: 0 };
        if (cmd.includes('outer_size')) return { width: 1440, height: 960 };
        if (cmd.includes('monitor')) return null;
        if (cmd.includes('listen')) return 1;
        if (cmd === 'autostart_get') return false;
        if (cmd.includes('counts')) return { all: 0 };
        return null;
      },
    };
  });
  await page.goto('http://127.0.0.1:1421');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(OUT, 'empty-dark-after.png') });
  await page.keyboard.press('Control+k');
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(OUT, 'palette-dark-after.png') });
  // reduced motion sanity: palette opens, no animations
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.keyboard.press('Escape');
  await page.keyboard.press('Control+k');
  await page.waitForTimeout(300);
  const footVisible = await page.locator('.palette__foot').isVisible();
  console.log('reduced-motion palette foot visible:', footVisible);
  await browser.close();
})().catch(e => { console.error(e); process.exitCode = 1; });
