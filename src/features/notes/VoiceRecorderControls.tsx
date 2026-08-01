import { Microphone, Square, X } from "@phosphor-icons/react";
import type { Editor } from "@tiptap/react";
import { useEffect, useRef, useState } from "react";
import { formatRecordingDuration, formatRecordingName, type AudioRecordingAttrs } from "./AudioRecording";

interface VoiceRecorderControlsProps {
  editor: Editor;
}

const mimeTypeCandidates = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
];

function preferredMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  return mimeTypeCandidates.find((mimeType) => MediaRecorder.isTypeSupported(mimeType));
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("录音读取失败"));
    reader.readAsDataURL(blob);
  });
}

export function VoiceRecorderControls({ editor }: VoiceRecorderControlsProps) {
  const [recording, setRecording] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const saveOnStopRef = useRef(false);
  const mountedRef = useRef(true);

  const clearResources = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    recorderRef.current = null;
  };

  useEffect(() => () => {
    mountedRef.current = false;
    saveOnStopRef.current = false;
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
    clearResources();
  }, []);

  const start = async () => {
    setError(null);
    if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setError("当前设备不支持录音");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const startedAt = new Date();
      const startedAtMs = startedAt.getTime();
      const mimeType = preferredMimeType();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      const chunks: Blob[] = [];

      streamRef.current = stream;
      recorderRef.current = recorder;
      saveOnStopRef.current = false;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };
      recorder.onerror = () => {
        clearResources();
        if (mountedRef.current) {
          setRecording(false);
          setError("录音中断，请重试");
        }
      };
      recorder.onstop = async () => {
        const shouldSave = saveOnStopRef.current;
        const durationMs = Math.max(0, Date.now() - startedAtMs);
        const actualMimeType = recorder.mimeType || mimeType || "audio/webm";
        clearResources();
        if (mountedRef.current) setRecording(false);
        if (!shouldSave || chunks.length === 0) return;

        try {
          const src = await blobToDataUrl(new Blob(chunks, { type: actualMimeType }));
          const attrs: AudioRecordingAttrs = {
            name: formatRecordingName(startedAt),
            src,
            mimeType: actualMimeType,
            durationMs,
          };
          editor.chain().insertContent({ type: "audioRecording", attrs }).run();
        } catch {
          if (mountedRef.current) setError("录音保存失败");
        }
      };

      recorder.start(250);
      setElapsedMs(0);
      setRecording(true);
      intervalRef.current = setInterval(() => setElapsedMs(Date.now() - startedAtMs), 250);
    } catch (cause) {
      clearResources();
      const denied = cause instanceof DOMException && (cause.name === "NotAllowedError" || cause.name === "SecurityError");
      setError(denied ? "未获得麦克风权限" : "无法启动录音");
    }
  };

  const finish = (save: boolean) => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === "inactive") return;
    saveOnStopRef.current = save;
    recorder.stop();
  };

  if (recording) {
    return (
      <div className="voice-recorder" aria-live="polite">
        <span className="voice-recorder__time mono"><span aria-hidden="true" />{formatRecordingDuration(elapsedMs)}</span>
        <button type="button" className="toolbar__btn voice-recorder__stop" aria-label="停止并插入录音" title="停止并插入" onClick={() => finish(true)}>
          <Square size={13} weight="fill" />
        </button>
        <button type="button" className="toolbar__btn" aria-label="取消录音" title="取消录音" onClick={() => finish(false)}>
          <X size={15} />
        </button>
      </div>
    );
  }

  return (
    <>
      <button type="button" className="toolbar__btn" aria-label="开始录音" title="录制语音备忘录" onClick={() => void start()}>
        <Microphone size={16} />
      </button>
      {error && <span className="voice-recorder__error" role="status" title={error}>{error}</span>}
    </>
  );
}
