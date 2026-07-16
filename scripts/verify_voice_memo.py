import json
from pathlib import Path

from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[1]
SCREENSHOT = ROOT / "voice-memo-runtime-check.png"

NOTE = {
    "id": 41,
    "group_id": None,
    "title": "录音验收便签",
    "content_md": "点击编辑便签后开始录音。",
    "content_html": "<p>点击编辑便签后开始录音。</p>",
    "word_count": 13,
    "is_pinned": False,
    "is_content_hidden": False,
    "is_archived": False,
    "is_trashed": False,
    "trashed_at": None,
    "geom_x": None,
    "geom_y": None,
    "geom_w": 280,
    "geom_h": 360,
    "edge_dock": "none",
    "created_at": 1_784_165_400_000,
    "updated_at": 1_784_165_400_000,
    "color": None,
    "sort_order": 0,
}


INIT_SCRIPT = f"""
(() => {{
  let note = {json.dumps(NOTE, ensure_ascii=False)};
  let callbackId = 1;
  window.__TAURI_TEST_CALLS__ = [];
  window.__TAURI_EVENT_PLUGIN_INTERNALS__ = {{ unregisterListener() {{}} }};
  window.__TAURI_INTERNALS__ = {{
    metadata: {{ currentWindow: {{ label: 'main' }}, currentWebview: {{ label: 'main', windowLabel: 'main' }} }},
    transformCallback(callback, once) {{
      const id = callbackId++;
      window[`_${{id}}`] = (...args) => {{ callback(...args); if (once) delete window[`_${{id}}`]; }};
      return id;
    }},
    unregisterCallback(id) {{ delete window[`_${{id}}`]; }},
    convertFileSrc(path) {{ return path; }},
    async invoke(cmd, args = {{}}) {{
      window.__TAURI_TEST_CALLS__.push({{ cmd, args }});
      if (cmd === 'groups_list') return [];
      if (cmd === 'notes_list') return [note];
      if (cmd === 'notes_get') return note;
      if (cmd === 'notes_update_content') {{ note = {{ ...note, content_md: args.md, content_html: args.html, word_count: args.words }}; return note; }}
      if (cmd === 'wander_list') return [];
      if (cmd === 'backup_list') return [];
      if (cmd === 'autostart_get') return false;
      if (cmd === 'data_directory_get') return {{ default_dir: 'C:/tidbit', active_dir: 'C:/tidbit', pending_dir: null }};
      if (cmd.includes('|listen') || cmd.includes('|on_')) return callbackId++;
      return null;
    }}
  }};
}})();
"""


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(
        channel="msedge",
        headless=True,
        args=["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"],
    )
    context = browser.new_context(viewport={"width": 500, "height": 780})
    context.grant_permissions(["microphone"], origin="http://127.0.0.1:1421")
    page = context.new_page()
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.add_init_script(INIT_SCRIPT)
    page.goto("http://127.0.0.1:1421")
    page.wait_for_load_state("networkidle")

    page.get_by_text("录音验收便签", exact=True).click()
    page.get_by_label("开始录音").click()
    page.get_by_label("停止并插入录音").wait_for()
    page.wait_for_timeout(1_100)
    page.get_by_label("停止并插入录音").click()

    name = page.get_by_label("录音名称")
    name.wait_for()
    name.fill("产品站会语音")
    name.press("Enter")
    page.wait_for_timeout(800)

    assert page.locator(".audio-recording audio").count() == 1
    assert page.get_by_label("播放录音 产品站会语音").count() == 1
    calls = page.evaluate("window.__TAURI_TEST_CALLS__")
    saves = [call for call in calls if call["cmd"] == "notes_update_content"]
    assert saves, "voice memo was not persisted"
    assert "[语音备忘录：产品站会语音]" in saves[-1]["args"]["md"]
    assert 'data-name="产品站会语音"' in saves[-1]["args"]["html"]
    assert "data:audio/" in saves[-1]["args"]["html"]
    assert not errors, f"page errors: {errors}"

    page.screenshot(path=str(SCREENSHOT), full_page=True)
    browser.close()

print(f"voice memo verified: {SCREENSHOT}")
