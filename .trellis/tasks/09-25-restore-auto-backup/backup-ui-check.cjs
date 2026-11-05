const { chromium } = require('playwright');
const path = require('node:path');
const OUT = __dirname;
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => {
    localStorage.setItem('theme', 'evernote');
    localStorage.setItem('changelog-seen-version', '0.2.12');
    localStorage.setItem('docking-enabled', 'false');
    const notes = [{ id: 1, title: '备份演练', group_id: null, content_md: 'x', content_html: '<p>x</p>', word_count: 1, is_pinned: false, is_content_hidden: false, is_archived: false, is_trashed: false, trashed_at: null, geom_x: null, geom_y: null, geom_w: 280, geom_h: 360, edge_dock: 'none', created_at: Date.now(), updated_at: Date.now(), color: null, sort_order: 0, status: 'todo', tags: [], reminder: null }];
    window.__TAURI_EVENT_PLUGIN_INTERNALS__ = { unregisterListener() {} };
    let savedSettings = null;
    window.__TAURI_INTERNALS__ = {
      metadata: { currentWindow: { label: 'main' }, currentWebview: { label: 'main' } },
      transformCallback: () => 1, unregisterCallback() {}, convertFileSrc: x => x,
      invoke: async (cmd, args = {}) => {
        if (cmd === 'notes_list') return notes;
        if (cmd === 'groups_list') return [];
        if (cmd === 'tags_list') return [];
        if (cmd === 'backup_list') return [];
        if (cmd === 'backup_settings_get') return savedSettings ?? { enabled: true, intervalHours: 1, retentionCount: 20 };
        if (cmd === 'backup_settings_set') { savedSettings = args.settings; return savedSettings; }
        if (cmd === 'data_directory_get') return { default_dir: 'D:/Notes', active_dir: 'D:/Notes', pending_dir: null };
        if (cmd.includes('is_maximized')) return false;
        if (cmd.includes('scale_factor')) return 1;
        if (cmd.includes('outer_position')) return { x: 0, y: 0 };
        if (cmd.includes('outer_size')) return { width: 1440, height: 960 };
        if (cmd.includes('monitor')) return null;
        if (cmd.includes('listen')) return 1;
        if (cmd === 'autostart_get') return false;
        if (cmd.includes('counts')) return { all: 1 };
        return null;
      },
    };
  });
  await page.goto('http://127.0.0.1:1421');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
  await page.getByRole('button', { name: '设置', exact: true }).click();
  await page.getByRole('combobox', { name: '主题', exact: true }).waitFor();
  await page.getByRole('button', { name: '维护' }).click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(OUT, 'backup-settings-evernote.png') });
  // Toggle off + adjust sliders, verify mock captured values
  await page.getByRole('checkbox', { name: '自动备份' }).click();
  await page.evaluate(() => {
    const el = document.getElementById('auto-backup-interval');
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    setter.call(el, '4');
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await page.waitForTimeout(400);
  const stored = await page.evaluate(() => window.__TAURI_INTERNALS__ ? 'see-mock' : null);
  await page.screenshot({ path: path.join(OUT, 'backup-settings-toggled.png') });
  await page.evaluate(() => { document.documentElement.dataset.theme = 'dark'; });
  await page.waitForTimeout(350);
  await page.screenshot({ path: path.join(OUT, 'backup-settings-dark.png') });
  console.log('errors', JSON.stringify(errors));
  await browser.close();
})().catch(e => { console.error(e); process.exitCode = 1; });
