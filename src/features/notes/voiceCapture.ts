export type VoiceQuality = "compact" | "balanced" | "high";
export interface VoiceOptions { quality: VoiceQuality; noiseSuppression: boolean; echoCancellation: boolean; autoGainControl: boolean; skipSilence: boolean; sensitivity: number }
export const DEFAULT_VOICE_OPTIONS: VoiceOptions = { quality: "balanced", noiseSuppression: true, echoCancellation: true, autoGainControl: false, skipSilence: false, sensitivity: 2 };
export const VOICE_LIMIT_MS = 30 * 60 * 1000;
export const VOICE_LIMIT_BYTES = 25 * 1024 * 1024;
export const VOICE_BITRATES = { compact: 32_000, balanced: 64_000, high: 128_000 };
export const LEAD_MS = 750;
export const TAIL_MS = 1200;
export type CapturePhase = "recording" | "paused" | "silence" | "processing";
export interface CaptureSnapshot { phase: CapturePhase; elapsedMs: number; retainedMs: number; level: number; mimeType: string; effects: string; warning: string }
export interface CapturedVoice { blob: Blob; durationMs: number; startedAt: Date }

export function voiceConstraints(options: VoiceOptions, supported: MediaTrackSupportedConstraints): MediaTrackConstraints {
  const constraints: MediaTrackConstraints = {};
  if (supported.channelCount) constraints.channelCount = { ideal: options.quality === "high" ? 2 : 1 };
  for (const key of ["noiseSuppression", "echoCancellation", "autoGainControl"] as const) {
    if (supported[key]) constraints[key] = options[key];
  }
  return constraints;
}

export function createVoiceRecorder(stream: MediaStream, quality: VoiceQuality): MediaRecorder {
  const audioBitsPerSecond = VOICE_BITRATES[quality];
  for (const mimeType of ["audio/webm;codecs=opus", "audio/ogg;codecs=opus", "audio/webm", "audio/mp4"]) {
    if (!MediaRecorder.isTypeSupported(mimeType)) continue;
    try { return new MediaRecorder(stream, { mimeType, audioBitsPerSecond }); } catch { /* Try the next supported encoder. */ }
  }
  return new MediaRecorder(stream, { audioBitsPerSecond });
}

/** Hysteresis runs on the undelayed input; the encoder receives a 750 ms lead-in. */
export class SilencePolicy {
  private lastSound = 0;
  hasSpeech = false;
  constructor(private sensitivity: number) {}
  update(level: number, elapsed: number, currentlySilent: boolean): boolean {
    const threshold = [0.006, 0.012, 0.024][this.sensitivity - 1] ?? 0.012;
    if (level >= threshold * (currentlySilent ? 1.3 : 1)) { this.lastSound = elapsed; this.hasSpeech = true; }
    return elapsed - this.lastSound > TAIL_MS + LEAD_MS;
  }
}

export class VoiceCapture {
  private stream?: MediaStream;
  private context?: AudioContext;
  private destination?: MediaStreamAudioDestinationNode;
  private inputGain?: GainNode;
  private pauseTimer?: ReturnType<typeof setTimeout>;
  private drainingPause = false;
  private recorder?: MediaRecorder;
  private timer?: ReturnType<typeof setInterval>;
  private chunks: Blob[] = [];
  private bytes = 0;
  private cancelled = false;
  private finishing = false;
  private manualPause = false;
  private silent = false;
  private skipping = false;
  private started = 0;
  private startedAt = new Date();
  private retained = 0;
  private lastTick = 0;
  private speech = false;
  private warning = "";
  private effects = "";
  private stopTimer?: ReturnType<typeof setTimeout>;
  constructor(private options: VoiceOptions, private onUpdate: (state: CaptureSnapshot) => void, private onDone: (result: CapturedVoice | null, message: string) => void) {}

  async start(): Promise<void> {
    if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) throw new Error("当前设备不支持录音");
    const stream = await navigator.mediaDevices.getUserMedia({ audio: voiceConstraints(this.options, navigator.mediaDevices.getSupportedConstraints()) });
    if (this.cancelled) { stream.getTracks().forEach(track => track.stop()); return; }
    this.stream = stream;
    const settings = stream.getAudioTracks()[0]?.getSettings() ?? {};
    this.effects = ([ ["noiseSuppression", "降噪"], ["echoCancellation", "回声消除"], ["autoGainControl", "自动增益"] ] as const)
      .map(([key, label]) => `${label}：${settings[key] === true ? "已开启" : settings[key] === false ? "关闭" : "设备未确认"}`).join(" · ");
    let source = stream;
    let analyser: AnalyserNode | undefined;
    try {
      this.context = new AudioContext();
      await this.context.resume();
      if (this.cancelled) { this.release(); return; }
      const input = this.context.createMediaStreamSource(stream);
      analyser = this.context.createAnalyser();
      analyser.fftSize = 4096;
      input.connect(analyser);
      if (this.options.skipSilence && this.context.state === "running" && !document.hidden) {
        const delay = this.context.createDelay(1);
        delay.delayTime.value = LEAD_MS / 1000;
        this.destination = this.context.createMediaStreamDestination();
        this.destination.channelCount = this.options.quality === "high" ? 2 : 1;
        this.inputGain = this.context.createGain();
        input.connect(this.inputGain).connect(delay).connect(this.destination);
        source = this.destination.stream;
        this.skipping = true;
      } else if (this.options.skipSilence) this.warning = "无法安全缓冲，已关闭跳过静音";
    } catch { this.warning = "音量分析不可用，已关闭跳过静音"; this.skipping = false; }
    if (this.cancelled) { this.release(); return; }
    const recorder = createVoiceRecorder(source, this.options.quality);
    this.recorder = recorder;
    const policy = new SilencePolicy(this.options.sensitivity);
    const samples = new Float32Array(analyser?.fftSize ?? 1024);
    recorder.ondataavailable = event => {
      if (this.cancelled || event.data.size === 0) return;
      this.chunks.push(event.data);
      this.bytes += event.data.size;
      if (this.bytes >= VOICE_LIMIT_BYTES) this.finish("已达到 25 MiB 上限，录音已停止");
    };
    recorder.onerror = () => this.finish("录音中断，可试听已保留的部分", false);
    recorder.onstop = () => {
      this.account();
      const mimeType = recorder.mimeType || this.chunks[0]?.type || "audio/webm";
      const blob = new Blob(this.chunks, { type: mimeType });
      this.chunks = [];
      this.release();
      if (this.cancelled) return;
      const noSpeech = this.options.skipSilence && this.skipping && !this.speech;
      this.onDone(blob.size && this.retained > 0 && !noSpeech ? { blob, durationMs: this.retained, startedAt: this.startedAt } : null,
        noSpeech ? "未检测到语音，请关闭跳过静音或提高灵敏度后重试" : this.warning);
    };
    stream.getTracks().forEach(track => { track.onended = () => this.finish("麦克风已断开，可试听已保留的部分", false); });
    this.startedAt = new Date();
    this.started = this.lastTick = performance.now();
    recorder.start(250);
    const tick = () => {
      const now = performance.now();
      const gap = now - this.lastTick;
      this.account(now);
      const elapsedMs = now - this.started;
      let level = 0;
      if (analyser && this.context?.state === "running") {
        analyser.getFloatTimeDomainData(samples);
        level = Math.sqrt(samples.reduce((sum, value) => sum + value * value, 0) / samples.length);
      }
      if (this.context && this.destination && this.context.state !== "running") { this.finish("音频处理已暂停，可试听已保留的部分", false); return; }
      if (this.skipping && (document.hidden || gap > LEAD_MS / 2)) {
        this.skipping = false;
        this.warning = "窗口进入后台或音频分析延迟，已关闭跳过静音";
        this.silent = false;
      }
      if (this.skipping && !this.manualPause && !this.finishing) this.silent = policy.update(level, elapsedMs, this.silent);
      this.speech ||= policy.hasSpeech;
      this.syncPause();
      this.onUpdate({ phase: this.finishing ? "processing" : this.manualPause ? "paused" : this.silent ? "silence" : "recording", elapsedMs, retainedMs: this.retained, level, mimeType: recorder.mimeType, effects: this.effects, warning: this.warning });
      if (elapsedMs >= VOICE_LIMIT_MS) this.finish("已达到 30 分钟上限，录音已停止");
    };
    this.timer = setInterval(tick, 50);
    document.addEventListener("visibilitychange", this.onVisibility);
    tick();
  }

  private onVisibility = () => {
    if (document.hidden && this.skipping) {
      this.account();
      this.skipping = this.silent = false;
      this.warning = "窗口进入后台，已关闭跳过静音以保留语音";
      this.syncPause();
    }
  };
  private account(now = performance.now()) {
    if (this.recorder?.state === "recording") this.retained += Math.max(0, now - this.lastTick);
    this.lastTick = now;
  }
  private syncPause() {
    const recorder = this.recorder;
    if (!recorder || recorder.state === "inactive") return;
    const paused = (this.manualPause && !this.drainingPause) || (!this.manualPause && this.silent);
    if (paused && recorder.state === "recording") recorder.pause();
    if (!paused && recorder.state === "paused") recorder.resume();
  }
  pause(paused: boolean) {
    if (this.finishing) return;
    this.account();
    this.manualPause = paused;
    clearTimeout(this.pauseTimer);
    this.drainingPause = false;
    if (this.inputGain) {
      this.inputGain.gain.value = paused ? 0 : 1;
      if (paused && this.recorder?.state === "recording") {
        this.drainingPause = true;
        this.pauseTimer = setTimeout(() => {
          this.account();
          this.drainingPause = false;
          this.syncPause();
        }, LEAD_MS);
      }
    }
    if (!paused) this.silent = false;
    this.syncPause();
  }
  finish(message = "", flush = true) {
    if (this.finishing || this.cancelled) return;
    this.finishing = true;
    this.warning = message || this.warning;
    const stop = () => {
      this.account();
      if (this.recorder?.state !== "inactive") this.recorder?.stop();
    };
    // Let the delayed tail reach the encoder before stopping.
    if (flush && this.destination && this.recorder?.state === "recording") this.stopTimer = setTimeout(stop, LEAD_MS);
    else stop();
  }
  cancel() {
    this.cancelled = true;
    if (this.recorder && this.recorder.state !== "inactive") this.recorder.stop();
    this.chunks = [];
    this.release();
  }
  private release() {
    clearInterval(this.timer);
    clearTimeout(this.stopTimer);
    clearTimeout(this.pauseTimer);
    document.removeEventListener("visibilitychange", this.onVisibility);
    this.stream?.getTracks().forEach(track => { track.onended = null; track.stop(); });
    this.destination?.stream.getTracks().forEach(track => track.stop());
    if (this.context && this.context.state !== "closed") void this.context.close().catch(() => undefined);
  }
}
