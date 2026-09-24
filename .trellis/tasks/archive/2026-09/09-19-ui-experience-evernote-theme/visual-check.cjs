const { chromium } = require('playwright');
const path = require('node:path');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => {
    localStorage.setItem('theme', 'evernote');
    localStorage.setItem('changelog-seen-version', '0.2.10');
    localStorage.setItem('docking-enabled', 'false');
    const notes = ['产品设计 · 九月复盘', '把灵感留在今天', '下一次迭代计划'].map((title,i) => ({
      id: i+1, title, group_id: null, content_md: '记录想法，整理行动。让重要的事情清晰可见。',
      content_html: '<p>记录想法，整理行动。让重要的事情清晰可见。</p>', word_count: 24,
      is_pinned: i===0, is_content_hidden:false, is_archived:false, is_trashed:false,
      trashed_at:null, geom_x:null, geom_y:null, geom_w:280, geom_h:360,
      edge_dock:'none', created_at:Date.now(), updated_at:Date.now(),
      color:null, sort_order:i, status:['todo','doing','done'][i], tags:['工作'], reminder:null,
    }));
    window.__TAURI_EVENT_PLUGIN_INTERNALS__ = { unregisterListener() {} };
    window.__TAURI_INTERNALS__ = {
      metadata:{currentWindow:{label:new URLSearchParams(location.search).get('mode') || 'main'},currentWebview:{label:'main'}},
      transformCallback: () => 1, unregisterCallback() {}, convertFileSrc: x => x,
      invoke: async (cmd,args={}) => {
        if(cmd==='notes_list') return notes;
        if(cmd==='notes_get') return notes.find(n=>n.id===args.id);
        if(cmd==='notes_update_content') { const n=notes.find(n=>n.id===args.id); n.content_html=args.html; n.content_md=args.md; n.word_count=args.words; return n; }
        if(cmd==='groups_list') return [];
        if(cmd==='tags_list') return ['工作'];
        if(cmd==='backup_list') return [];
        if(cmd==='data_directory_get') return { default_dir:'D:/Notes', active_dir:'D:/Notes', pending_dir:null };
        if(cmd.includes('is_maximized')) return false;
        if(cmd.includes('scale_factor')) return 1;
        if(cmd.includes('outer_position')) return {x:0,y:0};
        if(cmd.includes('outer_size')) return {width:1440,height:960};
        if(cmd.includes('monitor')) return null;
        if(cmd.includes('listen')) return 1;
        if(cmd==='autostart_get') return false;
        if(cmd.includes('counts')) return {all:3};
        return null;
      }
    };
  });
  await page.goto('http://127.0.0.1:1421');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path:path.join(__dirname,'evernote-wide.png') });
  console.log('wide', await page.locator('body').innerText());
  await page.getByRole('button',{name:'产品设计 · 九月复盘',exact:true}).click();
  await page.locator('.ProseMirror').waitFor();
  await page.waitForTimeout(500);
  for (const theme of ['dark', 'evernote']) {
    await page.evaluate(t => document.documentElement.dataset.theme = t, theme);
    for (const scale of [1, 1.25, 1.5]) {
      await page.evaluate(z => document.body.style.zoom = z, scale);
      const delta = await page.locator('.color-swatch.is-active').evaluate(e => {
        const a=e.getBoundingClientRect(), b=e.querySelector('svg').getBoundingClientRect();
        return {x: Math.abs(a.x+a.width/2-b.x-b.width/2), y:Math.abs(a.y+a.height/2-b.y-b.height/2)};
      });
      if(delta.x>1 || delta.y>1) throw new Error('Swatch misaligned '+JSON.stringify({theme,scale,delta}));
      console.log('swatch',theme,scale,delta);
    }
  }
  await page.evaluate(()=>document.body.style.zoom='1');
  await page.screenshot({path:path.join(__dirname,'evernote-editor.png')});
  await page.getByRole('button',{name:'插入表格',exact:true}).click();
  await page.locator('.ProseMirror table').waitFor();
  if(await page.locator('.ProseMirror table tr').count()!==3) throw Error('Expected 3 rows');
  await page.getByRole('button',{name:'下方插入行',exact:true}).click();
  if(await page.locator('.ProseMirror table tr').count()!==4) throw Error('Row insert failed');
  await page.screenshot({path:path.join(__dirname,'0210-table.png')});
  await page.getByRole('button',{name:'开始录音',exact:true}).click();
  await page.getByRole('dialog',{name:'语音备忘录'}).waitFor();
  await page.screenshot({path:path.join(__dirname,'0210-recording.png')});
  await page.keyboard.press('Escape');
  await page.setViewportSize({width:520,height:820});
  await page.locator('.note-card').first().click();
  await page.locator('.ProseMirror').waitFor();
  await page.waitForTimeout(500);
  await page.getByRole('button',{name:'更多格式',exact:true}).click();
  await page.getByRole('button',{name:'插入表格',exact:true}).waitFor({state:'visible'});
  await page.screenshot({path:path.join(__dirname,'0210-toolbar-narrow.png')});
  const overflow = await page.locator('.editor-tools').evaluate(e=>e.scrollWidth>e.clientWidth+1);
  if(overflow) throw Error('Narrow toolbar overflow');
  const narrowDelta=await page.locator('.color-swatch.is-active').evaluate(e=>{
    const a=e.getBoundingClientRect(),b=e.querySelector('svg').getBoundingClientRect();
    return Math.max(Math.abs(a.x+a.width/2-b.x-b.width/2),Math.abs(a.y+a.height/2-b.y-b.height/2));
  });
  if(narrowDelta>1) throw Error('Narrow swatch not centered');
  await page.getByRole('button',{name:'开始录音',exact:true}).click();
  await page.getByRole('dialog',{name:'语音备忘录'}).waitFor();
  await page.waitForTimeout(250);
  await page.screenshot({path:path.join(__dirname,'0210-recording-narrow.png')});
  await page.keyboard.press('Escape');
  await page.setViewportSize({width:1440,height:960});
  await page.getByRole('button',{name:'设置',exact:true}).click();
  await page.getByRole('combobox',{name:'主题',exact:true}).waitFor();
  await page.waitForTimeout(500);
  await page.screenshot({path:path.join(__dirname,'evernote-settings.png')});
  await page.setViewportSize({width:480,height:800});
  await page.screenshot({path:path.join(__dirname,'evernote-narrow.png')});
  await page.emulateMedia({reducedMotion:'reduce'});
  console.log('reducedMotion',await page.locator('.titlebar__brand-mark').evaluate(e=>getComputedStyle(e).animationName));
  console.log('overflow',await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth));
  console.log('errors',errors);
  await page.setViewportSize({width:360,height:720});
  await page.goto('http://127.0.0.1:1421/?mode=wander-1');
  await page.waitForLoadState('networkidle');
  await page.getByRole('button',{name:'切换为编辑',exact:true}).click();
  await page.locator('.ProseMirror').waitFor();
  await page.getByRole('button',{name:'更多格式',exact:true}).click();
  await page.getByRole('button',{name:'插入表格',exact:true}).waitFor({state:'visible'});
  const embeddedOverflow=await page.locator('.editor-tools').evaluate(e=>e.scrollWidth>e.clientWidth+1);
  if(embeddedOverflow) throw Error('Embedded toolbar overflow');
  await page.screenshot({path:path.join(__dirname,'0210-embedded.png')});
  await page.getByRole('button',{name:'开始录音',exact:true}).click();
  await page.getByRole('dialog',{name:'语音备忘录'}).waitFor();
  await page.screenshot({path:path.join(__dirname,'0210-recording-embedded.png')});
  await browser.close();
  if(errors.length) process.exitCode=1;
})().catch(e=>{console.error(e); process.exitCode=1;});
