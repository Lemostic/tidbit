const { chromium } = require("playwright");
const path = require("node:path");

const now = Date.now();
const groups = [
  { id: 1, name: "工作", color: "#c8553d", background_color: "#c8553d", icon: null, sort_order: 0, pinned: false, collapsed: false, created_at: now, updated_at: now },
  { id: 2, name: "灵感", color: "#3f7f74", background_color: "#3f7f74", icon: null, sort_order: 1, pinned: false, collapsed: false, created_at: now, updated_at: now },
  { id: 3, name: "生活", color: "#c2923f", background_color: "#c2923f", icon: null, sort_order: 2, pinned: false, collapsed: false, created_at: now, updated_at: now },
  { id: 4, name: "阅读", color: "#536a9b", background_color: "#536a9b", icon: null, sort_order: 3, pinned: false, collapsed: false, created_at: now, updated_at: now },
];

const notes = [
  {
    id: 11, group_id: 1, title: "周五交付清单", content_md: "确认桌面端打包\n整理发布说明\n给团队同步演示入口",
    content_html: "<p>确认桌面端打包</p><p>整理发布说明</p><p>给团队同步演示入口</p>",
    word_count: 28, is_pinned: true, is_content_hidden: false, is_archived: false, is_trashed: false,
    trashed_at: null, geom_x: null, geom_y: null, geom_w: 280, geom_h: 360, edge_dock: "none",
    created_at: now - 86400000, updated_at: now - 120000, color: "#c8553d", sort_order: 0, clothesline_x: null,
  },
  {
    id: 12, group_id: 2, title: "关于「慢」的界面", content_md: "真正好用的工具不抢注意力。它应该像一张被推到桌面中央的纸：有质感，但不喧哗。留白也是功能。",
    content_html: "<p>真正好用的工具不抢注意力。它应该像一张被推到桌面中央的纸：有质感，但不喧哗。</p><p><strong>留白也是功能。</strong></p>",
    word_count: 42, is_pinned: false, is_content_hidden: false, is_archived: false, is_trashed: false,
    trashed_at: null, geom_x: null, geom_y: null, geom_w: 280, geom_h: 360, edge_dock: "none",
    created_at: now - 172800000, updated_at: now - 3600000, color: "#3f7f74", sort_order: 1, clothesline_x: null,
  },
  {
    id: 13, group_id: 3, title: "周末采购", content_md: "咖啡豆\n黄油\n橙子\n新的签字笔",
    content_html: "<ul><li>咖啡豆</li><li>黄油</li><li>橙子</li><li>新的签字笔</li></ul>",
    word_count: 16, is_pinned: false, is_content_hidden: false, is_archived: false, is_trashed: false,
    trashed_at: null, geom_x: null, geom_y: null, geom_w: 280, geom_h: 360, edge_dock: "none",
    created_at: now - 259200000, updated_at: now - 86400000, color: "#c2923f", sort_order: 2, clothesline_x: null,
  },
  {
    id: 14, group_id: 4, title: "读书摘录：看见", content_md: "人们不是被事实说服，而是被自己愿意相信的故事说服。",
    content_html: "<blockquote>人们不是被事实说服，而是被自己愿意相信的故事说服。</blockquote>",
    word_count: 22, is_pinned: false, is_content_hidden: false, is_archived: false, is_trashed: false,
    trashed_at: null, geom_x: null, geom_y: null, geom_w: 280, geom_h: 360, edge_dock: "none",
    created_at: now - 345600000, updated_at: now - 172800000, color: "#536a9b", sort_order: 3, clothesline_x: null,
  },
  {
    id: 15, group_id: null, title: "语音想法", content_md: "把便签的回弹做得像纸，不要像弹窗。",
    content_html: '<p>把便签的回弹做得像纸，不要像弹窗。</p><div data-audio-recording="true" data-name="晨间灵感" data-mime-type="audio/webm" data-duration-ms="18000"><span data-audio-name="true">晨间想法</span><span data-audio-duration="true">00:18</span><audio controls preload="metadata" src="data:audio/webm;base64,"></audio></div>',
    word_count: 17, is_pinned: false, is_content_hidden: false, is_archived: false, is_trashed: false,
    trashed_at: null, geom_x: null, geom_y: null, geom_w: 280, geom_h: 360, edge_dock: "none",
    created_at: now - 432000000, updated_at: now - 259200000, color: null, sort_order: 4, clothesline_x: null,
  },
];

async function installTauriMock(context, { label, theme, glass = false, maximized = false, fullscreen = false, empty = false }) {
  await context.addInitScript(({ groups, notes, label, theme, glass, maximized, fullscreen, empty }) => {
    let callbackId = 1;
    const callbacks = new Map();
    const noteById = new Map(notes.map((note) => [note.id, note]));
    window.__uiAuditLog = [];
    window.__TAURI_EVENT_PLUGIN_INTERNALS__ = {
      unregisterListener() {},
    };
    window.__TAURI_INTERNALS__ = {
      metadata: { currentWindow: { label }, currentWebview: { windowLabel: label } },
      transformCallback(callback, once) {
        const id = callbackId++;
        callbacks.set(id, { callback, once });
        return id;
      },
      unregisterCallback(id) {
        callbacks.delete(id);
      },
      async invoke(command, args = {}) {
        window.__uiAuditLog.push([command, args]);
        if (command === "notes_list") return empty ? [] : notes;
        if (command === "notes_get") return noteById.get(args.id) || notes[0];
        if (command === "notes_create") return { ...notes[0], id: 99, title: args.title || "新便签" };
        if (command === "notes_update_content" || command === "notes_update_title" || command === "notes_set_pinned" ||
            command === "notes_set_archived" || command === "notes_set_content_hidden" || command === "notes_set_color" ||
            command === "notes_move_group") return noteById.get(args.id) || notes[0];
        if (command === "groups_list") return groups;
        if (command === "groups_create" || command === "groups_update") return groups[0];
        if (command === "wander_list") return [];
        if (command === "clothesline_list") return label === "clothesline" ? [11, 12, 13, 14] : [];
        if (command === "clothesline_positions") return [];
        if (command === "clothesline_is_open") return true;
        if (command === "autostart_get") return false;
        if (command === "data_directory_get") {
          return {
            default_dir: "C:\\Users\\lemostic\\AppData\\Roaming\\tidbit",
            active_dir: "C:\\Users\\lemostic\\AppData\\Roaming\\tidbit",
            pending_dir: null,
          };
        }
        if (command === "backup_list") return [];
        if (command === "plugin:window|is_maximized") return maximized;
        if (command === "plugin:window|is_fullscreen") return fullscreen;
        if (command === "plugin:window|inner_size") return { width: window.innerWidth, height: window.innerHeight };
        if (command === "plugin:window|outer_position") return { x: 0, y: 0 };
        if (command === "plugin:window|outer_size") return { width: window.innerWidth, height: window.innerHeight };
        if (command === "plugin:event|listen") return 1;
        if (command === "plugin:event|unlisten") return null;
        return null;
      },
    };
    localStorage.setItem("theme", theme);
    localStorage.setItem("window-default-size-v3", "applied");
    localStorage.setItem("docking-enabled", "false");
    localStorage.setItem("liquid-glass-enabled", String(glass));
  }, { groups, notes, label, theme, glass, maximized, fullscreen, empty });
}

async function openPage(browser, options) {
  const context = await browser.newContext({
    viewport: options.viewport,
    deviceScaleFactor: 1,
    reducedMotion: options.reducedMotion || "no-preference",
  });
  await installTauriMock(context, options);
  const page = await context.newPage();
  page.on("pageerror", (error) => console.error(`[pageerror:${options.label}]`, error.message));
  await page.goto("http://127.0.0.1:4173/", { waitUntil: "networkidle" });
  await page.waitForTimeout(700);
  return { context, page };
}

async function main() {
  const outDir = path.resolve(process.argv[2] || "tmp-ui-audit");
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  try {
  const shot = (page, name) => page.screenshot({ path: path.join(outDir, `${name}.png`) });

  // ---- floating window: sticky-note desk ------------------------------------
  {
    const { context, page } = await openPage(browser, {
      label: "main",
      theme: "light",
      viewport: { width: 500, height: 780 },
    });
    await shot(page, "audit-compact");
    await page.locator(".note-card__inner").first().click();
    await page.waitForTimeout(400);
    await shot(page, "audit-compact-editor");
    await page.keyboard.press("Escape");
    await page.locator('button[aria-label="关闭编辑器"]').click();
    await page.locator(".titlebar__search").click();
    await page.waitForTimeout(250);
    await shot(page, "audit-palette");
    await page.keyboard.press("Escape");
    await page.locator('button[aria-label="设置"]').click();
    await page.waitForTimeout(350);
    await shot(page, "audit-settings");
    await page.locator(".settings-panel__body").evaluate((element) => {
      element.style.scrollBehavior = "auto";
      element.scrollTop = element.scrollHeight;
    });
    await page.waitForTimeout(250);
    await shot(page, "audit-settings-lower");
    await page.setViewportSize({ width: 1440, height: 960 });
    await page.waitForTimeout(400);
    await shot(page, "audit-settings-wide");
    await context.close();
  }

  {
    const { context, page } = await openPage(browser, {
      label: "main",
      theme: "light",
      viewport: { width: 760, height: 820 },
    });
    await shot(page, "audit-compact-wide");
    await context.close();
  }

  {
    const { context, page } = await openPage(browser, {
      label: "main",
      theme: "light",
      empty: true,
      viewport: { width: 500, height: 780 },
    });
    await shot(page, "audit-compact-empty");
    await context.close();
  }

  // ---- maximized: the everyday desktop route into the notebook -------------
  {
    const { context, page } = await openPage(browser, {
      label: "main",
      theme: "light",
      maximized: true,
      viewport: { width: 1440, height: 960 },
    });
    await shot(page, "audit-maximized");
    await page.locator(".note-list-item__row").nth(1).click({ position: { x: 24, y: 20 } });
    await page.waitForTimeout(400);
    await shot(page, "audit-maximized-editor");
    await context.close();
  }

  // ---- fullscreen: notebook workspace --------------------------------------
  {
    const { context, page } = await openPage(browser, {
      label: "main",
      theme: "light",
      fullscreen: true,
      viewport: { width: 1440, height: 960 },
    });
    await shot(page, "audit-fullscreen");
    await page.locator(".note-list-item__row").nth(1).click({ position: { x: 24, y: 20 } });
    await page.waitForTimeout(400);
    await shot(page, "audit-fullscreen-editor");
    await context.close();
  }

  {
    const { context, page } = await openPage(browser, {
      label: "main",
      theme: "light",
      fullscreen: true,
      empty: true,
      viewport: { width: 1440, height: 960 },
    });
    await shot(page, "audit-fullscreen-empty");
    await context.close();
  }

  {
    const { context, page } = await openPage(browser, {
      label: "main",
      theme: "light",
      fullscreen: true,
      viewport: { width: 2560, height: 1400 },
    });
    await page.locator(".note-list-item__row").first().click({ position: { x: 24, y: 20 } });
    await page.waitForTimeout(400);
    await shot(page, "audit-fullscreen-wide");
    await context.close();
  }

  {
    const { context, page } = await openPage(browser, {
      label: "main",
      theme: "light",
      fullscreen: true,
      viewport: { width: 900, height: 700 },
    });
    await page.locator(".note-list-item__row").nth(3).click({ position: { x: 24, y: 20 } });
    await page.waitForTimeout(400);
    await shot(page, "audit-fullscreen-narrow");
    await context.close();
  }

  // ---- themes --------------------------------------------------------------
  for (const theme of ["dark", "sepia"]) {
    const compact = await openPage(browser, {
      label: "main",
      theme,
      viewport: { width: 500, height: 780 },
    });
    await shot(compact.page, `audit-compact-${theme}`);
    await compact.page.locator(".note-card__inner").nth(1).click();
    await compact.page.waitForTimeout(400);
    await shot(compact.page, `audit-compact-editor-${theme}`);
    await compact.context.close();

    const notebook = await openPage(browser, {
      label: "main",
      theme,
      fullscreen: true,
      viewport: { width: 1440, height: 960 },
    });
    await notebook.page.locator(".note-list-item__row").nth(2).click({ position: { x: 24, y: 20 } });
    await notebook.page.waitForTimeout(400);
    await shot(notebook.page, `audit-fullscreen-${theme}`);
    await notebook.context.close();
  }

  // ---- liquid glass --------------------------------------------------------
  {
    const { context, page } = await openPage(browser, {
      label: "main",
      theme: "light",
      glass: true,
      fullscreen: true,
      viewport: { width: 1440, height: 960 },
    });
    await page.locator(".note-list-item__row").first().click({ position: { x: 24, y: 20 } });
    await page.waitForTimeout(400);
    await shot(page, "audit-glass");
    await context.close();
  }

  // ---- auxiliary windows ---------------------------------------------------
  {
    const { context, page } = await openPage(browser, {
      label: "clothesline",
      theme: "light",
      viewport: { width: 1200, height: 460 },
    });
    await shot(page, "audit-clothesline");
    await context.close();
  }

  {
    const { context, page } = await openPage(browser, {
      label: "wander-11",
      theme: "light",
      viewport: { width: 340, height: 360 },
    });
    await shot(page, "audit-wander");
    await context.close();
  }

  } finally {
    await browser.close();
  }
  console.log(JSON.stringify({ outDir }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

