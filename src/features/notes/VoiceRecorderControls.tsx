import { Microphone, Pause, Play, Square, X } from "@phosphor-icons/react";
import type { Editor } from "@tiptap/react";
import type { Transaction } from "@tiptap/pm/state";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { formatRecordingDuration, formatRecordingName } from "./AudioRecording";
import { DEFAULT_VOICE_OPTIONS, VoiceCapture, type CapturedVoice, type CaptureSnapshot, type VoiceOptions, type VoiceQuality } from "./voiceCapture";
import "./voiceRecorder.css";

function blobToDataUrl(blob: Blob, signal: AbortSignal): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    const abort = () => reader.abort();
    signal.addEventListener("abort", abort, { once: true });
    reader.onloadend = () => signal.removeEventListener("abort", abort);
    reader.onabort = () => reject(new Error("已取消录音插入"));
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("录音读取失败"));
    reader.readAsDataURL(blob);
  });
}

export function VoiceRecorderControls({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<VoiceOptions>(DEFAULT_VOICE_OPTIONS);
  const [status, setStatus] = useState<"ready" | "starting" | "active" | "preview" | "inserting">("ready");
  const [snapshot, setSnapshot] = useState<CaptureSnapshot | null>(null);
  const [preview, setPreview] = useState<CapturedVoice | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [message, setMessage] = useState("");
  const capture = useRef<VoiceCapture | null>(null);
  const generation = useRef(0);
  const conversion = useRef<AbortController | null>(null);
  const panel = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const bookmark = useRef(editor.state.selection.getBookmark());
  const busy = status === "starting" || status === "active" || status === "inserting";

  useEffect(() => {
    if (!preview) { setPreviewUrl(""); return; }
    const url = URL.createObjectURL(preview.blob);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [preview]);
  useEffect(() => () => { generation.current++; conversion.current?.abort(); capture.current?.cancel(); }, []);
  useEffect(() => {
    if (!open) return;
    panel.current?.focus();
    const map = ({ transaction }: { transaction: Transaction }) => { bookmark.current = bookmark.current.map(transaction.mapping); };
    editor.on("transaction", map);
    return () => { editor.off("transaction", map); };
  }, [open, editor]);

  const close = () => {
    generation.current++;
    conversion.current?.abort();
    capture.current?.cancel();
    capture.current = null;
    setOpen(false); setPreview(null); setSnapshot(null); setStatus("ready");
    trigger.current?.focus();
  };
  const start = async () => {
    if (capture.current) return;
    const token = ++generation.current;
    setMessage(""); setPreview(null); setSnapshot(null); setStatus("starting");
    const session = new VoiceCapture(options, state => {
      if (token !== generation.current) return;
      setSnapshot(state); setStatus("active");
    }, (result, warning) => {
      if (token !== generation.current) return;
      capture.current = null;
      setSnapshot(null);
      setPreview(result); setMessage(warning || (!result ? "未捕获到可用音频，请重试" : "")); setStatus(result ? "preview" : "ready");
    });
    capture.current = session;
    try { await session.start(); }
    catch (cause) {
      session.cancel();
      if (token !== generation.current) return;
      capture.current = null; setStatus("ready");
      const name = cause instanceof Error ? cause.name : "";
      setMessage(name === "NotAllowedError" || name === "SecurityError" ? "未获得麦克风权限，请在系统设置中允许访问" : name === "NotFoundError" ? "未找到麦克风，请连接设备后重试" : "无法启动录音，请检查麦克风是否被占用");
    }
  };
  const insert = async () => {
    if (!preview || status === "inserting") return;
    const token = generation.current;
    conversion.current = new AbortController();
    setStatus("inserting");
    try {
      const src = await blobToDataUrl(preview.blob, conversion.current.signal);
      if (token !== generation.current || editor.isDestroyed) return;
      const selection = bookmark.current.resolve(editor.state.doc);
      editor.chain().focus().setTextSelection({ from: selection.from, to: selection.to }).insertContent({ type: "audioRecording", attrs: { name: formatRecordingName(preview.startedAt), src, mimeType: preview.blob.type, durationMs: preview.durationMs } }).run();
      close();
    } catch {
      if (token === generation.current) { setStatus("preview"); setMessage("录音插入失败，音频仍可试听，请重试"); }
    }
  };

  return <>
    <button ref={trigger} type="button" className="toolbar__btn" aria-label="开始录音" title="录制语音备忘录" aria-haspopup="dialog" onClick={() => { bookmark.current = editor.state.selection.getBookmark(); setMessage(""); setOpen(true); }}><Microphone size={16} /></button>
    {open && createPortal(<div className="voice-panel-backdrop" onMouseDown={event => event.stopPropagation()}>
      <div ref={panel} className="voice-panel" role="dialog" aria-modal="true" aria-label="语音备忘录" tabIndex={-1} onKeyDown={event => {
        if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); close(); }
        if (event.key === "Tab") {
          const focusable = Array.from(panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), audio[controls]') ?? []);
          const first = focusable[0]; const last = focusable[focusable.length - 1];
          if (event.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) { event.preventDefault(); last?.focus(); }
          else if (!event.shiftKey && (document.activeElement === last || document.activeElement === panel.current)) { event.preventDefault(); first?.focus(); }
        }
      }}>
        <header><div><strong>语音备忘录</strong><p>保留灵感，随时回听</p></div><button type="button" className="toolbar__btn" aria-label="关闭并放弃录音" title="关闭并放弃录音" onClick={close}><X size={18} /></button></header>
        <fieldset disabled={busy || status === "preview"}>
          <label className="voice-panel__quality">录音质量<select aria-label="录音质量" value={options.quality} onChange={event => setOptions({ ...options, quality: event.target.value as VoiceQuality })}><option value="compact">精简 · 32 kbps</option><option value="balanced">均衡 · 64 kbps</option><option value="high">高质量 · 128 kbps</option></select></label>
          <div className="voice-panel__options">{([["noiseSuppression", "设备降噪"], ["echoCancellation", "回声消除"], ["autoGainControl", "自动增益"], ["skipSilence", "跳过静音"]] as const).map(([key, label]) => <label key={key}><input type="checkbox" checked={options[key]} onChange={event => setOptions({ ...options, [key]: event.target.checked })} />{label}</label>)}</div>
          {options.skipSilence && <label className="voice-panel__quality">静音阈值<select aria-label="静音阈值" value={options.sensitivity} onChange={event => setOptions({ ...options, sensitivity: Number(event.target.value) })}><option value={1}>低 · 保留轻声</option><option value={2}>中 · 日常对话</option><option value={3}>高 · 仅明显语音</option></select></label>}
        </fieldset>
        {status === "starting" && <p role="status">正在请求麦克风权限…</p>}
        {snapshot && <div className="voice-panel__capture"><span role="status">{{ recording: "正在录音", paused: "已手动暂停", silence: "正在跳过静音", processing: "正在生成试听…" }[snapshot.phase]}</span><div className="voice-panel__times"><span>总时长 <b>{formatRecordingDuration(snapshot.elapsedMs)}</b></span><span>已保留 <b>{formatRecordingDuration(snapshot.retainedMs)}</b></span></div><meter aria-label="麦克风输入音量" min={0} max={1} value={Math.min(1, snapshot.level * 5)} /><p className="voice-panel__hint">{snapshot.effects}<br />编码：{snapshot.mimeType || "设备默认"}</p></div>}
        {preview && <div className="voice-panel__preview"><audio controls src={previewUrl} aria-label="试听录音" /><p>{formatRecordingDuration(preview.durationMs)} · {(preview.blob.size / 1024 / 1024).toFixed(2)} MiB · {preview.blob.type || "设备默认编码"}</p></div>}
        {(message || snapshot?.warning) && <p role="status" className="voice-panel__message">{message || snapshot?.warning}</p>}
        <p className="voice-panel__hint">码率为编码目标，效果以设备支持为准。最长 30 分钟或约 25 MiB；录音保存在当前笔记中。</p>
        {options.skipSilence && <p className="voice-panel__hint">保留 0.75 秒前缓冲和 1.2 秒尾音。安静语音建议关闭此项；进入后台将关闭静音跳过。</p>}
        <footer>
          <button type="button" onClick={close}>{busy ? "取消录音" : preview ? "放弃" : "取消"}</button>
          {status === "ready" && <button type="button" className="voice-panel__primary" onClick={() => void start()}><Microphone size={16} />开始录音</button>}
          {status === "active" && <><button type="button" disabled={snapshot?.phase === "processing"} onClick={() => capture.current?.pause(snapshot?.phase !== "paused")}>{snapshot?.phase === "paused" ? <Play size={16} /> : <Pause size={16} />}{snapshot?.phase === "paused" ? "继续" : "暂停"}</button><button type="button" className="voice-panel__primary" disabled={snapshot?.phase === "processing"} onClick={() => capture.current?.finish()}><Square size={14} />停止并试听</button></>}
          {status === "preview" && <><button type="button" onClick={() => { setPreview(null); setSnapshot(null); setMessage(""); setStatus("ready"); }}>重新录制</button><button type="button" className="voice-panel__primary" onClick={() => void insert()}>插入笔记</button></>}
          {status === "inserting" && <button type="button" disabled>正在插入…</button>}
        </footer>
      </div>
    </div>, document.body)}
  </>;
}
