import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createVoiceRecorder, DEFAULT_VOICE_OPTIONS, LEAD_MS, SilencePolicy, TAIL_MS, VoiceCapture, voiceConstraints, VOICE_LIMIT_BYTES, VOICE_LIMIT_MS } from "../features/notes/voiceCapture";

let amplitude = 0;
const track = { stop: vi.fn(), getSettings: () => ({ noiseSuppression: true }), onended: null as null | (() => void) };
const stream = { getTracks: () => [track], getAudioTracks: () => [track] } as unknown as MediaStream;
class Recorder {
  static latest: Recorder;
  static isTypeSupported = vi.fn<[string], boolean>(() => true);
  state = "inactive";
  mimeType = "audio/webm;codecs=opus";
  ondataavailable?: (event: { data: Blob }) => void;
  onstop?: () => void;
  onerror?: () => void;
  constructor(_stream: MediaStream, public options: MediaRecorderOptions) { Recorder.latest = this; }
  start() { this.state = "recording"; }
  pause() { this.state = "paused"; }
  resume() { this.state = "recording"; }
  stop() { this.state = "inactive"; this.ondataavailable?.({ data: new Blob(["recorded audio"], { type: this.mimeType }) }); this.onstop?.(); }
}
class Context {
  state = "running";
  resume = vi.fn(async (): Promise<void> => undefined);
  close = vi.fn(async (): Promise<void> => { this.state = "closed"; });
  createMediaStreamSource() { return { connect: (node: unknown) => node }; }
  createAnalyser() { return { fftSize: 4096, getFloatTimeDomainData: (array: Float32Array) => array.fill(amplitude) }; }
  createDelay() { return { delayTime: { value: 0 }, connect: (node: unknown) => node }; }
  createGain() { return { gain: { value: 1 }, connect: (node: unknown) => node }; }
  createMediaStreamDestination() { return { stream }; }
}
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setInterval", "clearInterval", "setTimeout", "clearTimeout", "performance"] });
  vi.stubGlobal("MediaRecorder", Recorder);
  vi.stubGlobal("AudioContext", Context);
  Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia: vi.fn(async () => stream), getSupportedConstraints: () => ({ noiseSuppression: true, channelCount: true }) } });
  Object.defineProperty(document, "hidden", { configurable: true, value: false });
  amplitude = 0; track.stop.mockClear(); track.onended = null;
  Recorder.isTypeSupported.mockReset().mockReturnValue(true);
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe("voice capture", () => {
  it("requests only supported effects and the selected encoder target", () => {
    expect(voiceConstraints(DEFAULT_VOICE_OPTIONS, { noiseSuppression: true })).toEqual({ noiseSuppression: true });
    createVoiceRecorder(stream, "high");
    expect(Recorder.latest.options.audioBitsPerSecond).toBe(128_000);
  });
  it("preserves tail and uses a separate resume threshold", () => {
    const policy = new SilencePolicy(2);
    expect(policy.update(.02, 100, false)).toBe(false);
    expect(policy.update(0, 100 + TAIL_MS + LEAD_MS, false)).toBe(false);
    expect(policy.update(0, 101 + TAIL_MS + LEAD_MS, false)).toBe(true);
    expect(policy.update(.013, 2200, true)).toBe(true);
    expect(policy.update(.02, 2250, true)).toBe(false);
    expect(policy.hasSpeech).toBe(true);
  });
  it("never lets speech detection resume a manual pause and excludes paused duration", async () => {
    const done = vi.fn();
    const capture = new VoiceCapture({ ...DEFAULT_VOICE_OPTIONS, skipSilence: true }, vi.fn(), done);
    await capture.start();
    amplitude = .1;
    vi.advanceTimersByTime(1000);
    capture.pause(true);
    vi.advanceTimersByTime(2000);
    expect(Recorder.latest.state).toBe("paused");
    capture.pause(false);
    vi.advanceTimersByTime(500);
    capture.finish();
    vi.advanceTimersByTime(LEAD_MS);
    expect(done.mock.calls[0][0].durationMs).toBe(3000);
    expect(track.stop).toHaveBeenCalled();
  });
  it("rejects an all-silence session", async () => {
    const done = vi.fn();
    const capture = new VoiceCapture({ ...DEFAULT_VOICE_OPTIONS, skipSilence: true }, vi.fn(), done);
    await capture.start();
    vi.advanceTimersByTime(3000);
    expect(Recorder.latest.state).toBe("paused");
    capture.finish();
    expect(done).toHaveBeenCalledWith(null, expect.stringContaining("未检测到语音"));
  });
  it("stops a microphone granted after cancellation without publishing audio", async () => {
    let grant!: (stream: MediaStream) => void;
    vi.mocked(navigator.mediaDevices.getUserMedia).mockReturnValue(new Promise(resolve => { grant = resolve; }));
    const done = vi.fn();
    const capture = new VoiceCapture(DEFAULT_VOICE_OPTIONS, vi.fn(), done);
    const pending = capture.start(); capture.cancel(); grant(stream); await pending;
    expect(track.stop).toHaveBeenCalled(); expect(done).not.toHaveBeenCalled();
  });
  it("offers partial audio on unplugging and stops at the size bound", async () => {
    const done = vi.fn();
    const capture = new VoiceCapture(DEFAULT_VOICE_OPTIONS, vi.fn(), done);
    await capture.start(); vi.advanceTimersByTime(500);
    track.onended?.();
    expect(done.mock.calls[0][0].blob.size).toBeGreaterThan(0);
    expect(done.mock.calls[0][1]).toContain("断开");
    const second = new VoiceCapture(DEFAULT_VOICE_OPTIONS, vi.fn(), done);
    await second.start(); vi.advanceTimersByTime(500);
    Recorder.latest.ondataavailable?.({ data: new Blob([new Uint8Array(VOICE_LIMIT_BYTES)]) });
    expect(done.mock.calls[1][1]).toContain("25 MiB");
  });
  it("disables silence skip in background while preserving manual pause", async () => {
    const capture = new VoiceCapture({ ...DEFAULT_VOICE_OPTIONS, skipSilence: true }, vi.fn(), vi.fn());
    await capture.start(); vi.advanceTimersByTime(3000);
    capture.pause(true);
    Object.defineProperty(document, "hidden", { configurable: true, value: true });
    document.dispatchEvent(new Event("visibilitychange"));
    expect(Recorder.latest.state).toBe("paused");
    capture.pause(false); expect(Recorder.latest.state).toBe("recording"); capture.cancel();
  });
  it("falls back to a supported codec while retaining the bitrate target", () => {
    Recorder.isTypeSupported.mockImplementation(mime => mime === "audio/mp4");
    createVoiceRecorder(stream, "compact");
    expect(Recorder.latest.options).toEqual({ mimeType: "audio/mp4", audioBitsPerSecond: 32_000 });
  });
  it("auto-stops at the wall-clock limit even while manually paused", async () => {
    const done = vi.fn();
    const capture = new VoiceCapture(DEFAULT_VOICE_OPTIONS, vi.fn(), done);
    await capture.start();
    vi.advanceTimersByTime(1000);
    capture.pause(true);
    vi.advanceTimersByTime(VOICE_LIMIT_MS - 1000);
    expect(done).toHaveBeenCalledTimes(1);
    expect(done.mock.calls[0][0].durationMs).toBe(1000);
    expect(done.mock.calls[0][1]).toContain("30 分钟");
    expect(vi.getTimerCount()).toBe(0);
  });
  it("cleans up cancellation while audio context resume is pending", async () => {
    let resume!: () => void;
    const close = vi.fn(async (): Promise<void> => undefined);
    class PendingContext extends Context {
      resume = vi.fn(() => new Promise<void>(resolve => { resume = resolve; }));
      close = close;
    }
    vi.stubGlobal("AudioContext", PendingContext);
    const done = vi.fn();
    const update = vi.fn();
    const capture = new VoiceCapture(DEFAULT_VOICE_OPTIONS, update, done);
    const pending = capture.start();
    await vi.waitFor(() => expect(resume).toBeTypeOf("function"));
    capture.cancel();
    resume();
    await pending;
    expect(close).toHaveBeenCalled();
    expect(track.stop).toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
    expect(done).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
});
