const { chromium } = require('playwright');
const path = require('node:path');

const OUT = path.join(__dirname, 'polish-survey');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

  await page.addInitScript(() => {
    localStorage.setItem('theme', 'light');
    localStorage.setItem('changelog-seen-version', '0.2.11');
    localStorage.setItem('docking-enabled', 'false');
    const notes = ['产品设计 · 九月复盘', '把灵感留在今天', '下一次迭代计划', '周会纪要与待办', '读书摘抄:卡片笔记法'].map((title, i) => ({
      id: i + 1, title, group_id: null,
      content_md: '记录想法,整理行动。让重要的事情清晰可见。\n\n- 第一条要点\n- 第二条要点',
      content_html: '<p>记录想法,整理行动。让重要的事情清晰可见。</p><ul><li>第一条要点</li><li>第二条要点</li></ul>',
      word_count: 42, is_pinned: i === 0, is_content_hidden: false, is_archived: false, is_trashed: false,
      trashed_at: null, geom_x: null, geom_y: null, geom_w: 280, geom_h: 360,
      edge_dock: 'none', created_at: Date.now() - i * 86400000, updated_at: Date.now() - i * 3600000,
      color: null, sort_order: i, status: ['todo', 'doing', 'done', 'todo', 'doing'][i], tags: i % 2 ? ['工作', '灵感'] : ['工作'],
      reminder: null,
    }));
    window.__TAURI_EVENT_PLUGIN_INTERNALS__ = { unregisterListener() {} };
    window.__TAURI_INTERNALS__ = {
      metadata: { currentWindow: { label: new URLSearchParams(location.search).get('mode') || 'main' }, currentWebview: { label: 'main' } },
      transformCallback: () => 1, unregisterCallback() {}, convertFileSrc: x => x,
      invoke: async (cmd, args = {}) => {
        if (cmd === 'notes_list') return notes;
        if (cmd === 'notes_get') return notes.find(n => n.id === args.id);
        if (cmd === 'notes_update_content') { const n = notes.find(n => n.id === args.id); n.content_html = args.html; n.content_md = args.md; n.word_count = args.words; return n; }
        if (cmd === 'groups_list') return [];
        if (cmd === 'tags_list') return ['工作', '灵感'];
        if (cmd === 'backup_list') return [];
        if (cmd === 'data_directory_get') return { default_dir: 'D:/Notes', active_dir: 'D:/Notes', pending_dir: null };
        if (cmd.includes('is_maximized')) return false;
        if (cmd.includes('scale_factor')) return 1;
        if (cmd.includes('outer_position')) return { x: 0, y: 0 };
        if (cmd.includes('outer_size')) return { width: 1440, height: 960 };
        if (cmd.includes('monitor')) return null;
        if (cmd.includes('listen')) return 1;
        if (cmd === 'autostart_get') return false;
        if (cmd.includes('counts')) return { all: 5 };
        return null;
      },
    };
  });

  await page.goto('http://127.0.0.1:1421');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(600);

  const shot = (name) => page.screenshot({ path: path.join(OUT, name + '.png') });

  // 1. Main list across themes
  for (const theme of ['light', 'dark', 'evernote', 'sepia', 'tokyo-night', 'wechat']) {
    await page.evaluate(t => { document.documentElement.dataset.theme = t; localStorage.setItem('theme', t); }, theme);
    await page.waitForTimeout(350);
    await shot('list-' + theme);
  }

  // 2. Hover state on a card (light)
  await page.evaluate(() => { document.documentElement.dataset.theme = 'light'; });
  await page.waitForTimeout(200);
  const card = page.locator('.note-card, [class*="note-card"]').first();
  if (await card.count()) { await card.hover(); await page.waitForTimeout(300); await shot('card-hover-light'); }

  // 3. Editor open (wide)
  await page.getByRole('button', { name: '产品设计 · 九月复盘', exact: true }).click();
  await page.locator('.ProseMirror').waitFor();
  await page.waitForTimeout(600);
  await shot('editor-light');
  await page.evaluate(() => { document.documentElement.dataset.theme = 'dark'; });
  await page.waitForTimeout(350);
  await shot('editor-dark');
  await page.evaluate(() => { document.documentElement.dataset.theme = 'evernote'; });
  await page.waitForTimeout(350);
  await shot('editor-evernote');

  // 4. Command palette
  await page.keyboard.press('Escape');
  await page.keyboard.press('Control+k');
  await page.waitForTimeout(500);
  await shot('palette-evernote');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);

  // 5. Settings
  await page.evaluate(() => { document.documentElement.dataset.theme = 'light'; });
  await page.waitForTimeout(200);
  await page.getByRole('button', { name: '设置', exact: true }).click();
  await page.getByRole('combobox', { name: '主题', exact: true }).waitFor();
  await page.waitForTimeout(500);
  await shot('settings-light');
  await page.evaluate(() => { document.documentElement.dataset.theme = 'dark'; });
  await page.waitForTimeout(350);
  await shot('settings-dark');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);

  // 6. Narrow window
  await page.setViewportSize({ width: 520, height: 820 });
  await page.waitForTimeout(500);
  await shot('narrow-light');
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.waitForTimeout(400);

  console.log('errors:', JSON.stringify(errors, null, 2));
  await browser.close();
})().catch(e => { console.error(e); process.exitCode = 1; });
