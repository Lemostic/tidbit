import { mergeAttributes, Node, NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from "@tiptap/react";
import { Trash, Waveform } from "@phosphor-icons/react";
import { useEffect, useState } from "react";

export interface AudioRecordingAttrs {
  name: string;
  src: string;
  mimeType: string;
  durationMs: number;
}

export function formatRecordingDuration(durationMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function formatRecordingName(startedAt: Date): string {
  const date = [startedAt.getFullYear(), startedAt.getMonth() + 1, startedAt.getDate()]
    .map((value, index) => String(value).padStart(index === 0 ? 4 : 2, "0"))
    .join("-");
  const time = [startedAt.getHours(), startedAt.getMinutes(), startedAt.getSeconds()]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
  return `${date} ${time}`;
}

function cleanRecordingName(value: string): string {
  return value.replace(/[\r\n]+/g, " ").trim().slice(0, 120) || "语音备忘录";
}

function AudioRecordingView({ node, updateAttributes, deleteNode, selected }: NodeViewProps) {
  const attrs = node.attrs as AudioRecordingAttrs;
  const [name, setName] = useState(attrs.name);

  useEffect(() => setName(attrs.name), [attrs.name]);

  const commitName = () => {
    const next = cleanRecordingName(name);
    setName(next);
    if (next !== attrs.name) updateAttributes({ name: next });
  };

  return (
    <NodeViewWrapper
      className={`audio-recording${selected ? " is-selected" : ""}`}
      data-audio-recording="true"
      contentEditable={false}
    >
      <div className="audio-recording__head">
        <Waveform size={17} weight="bold" aria-hidden="true" />
        <input
          className="audio-recording__name"
          aria-label="录音名称"
          value={name}
          maxLength={120}
          onChange={(event) => setName(event.target.value)}
          onBlur={commitName}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
            if (event.key === "Escape") {
              setName(attrs.name);
              event.currentTarget.blur();
            }
          }}
        />
        <span className="audio-recording__duration mono">{formatRecordingDuration(attrs.durationMs)}</span>
        <button type="button" className="audio-recording__delete" aria-label="删除录音" title="删除录音" onClick={deleteNode}>
          <Trash size={14} />
        </button>
      </div>
      <audio controls preload="metadata" src={attrs.src} aria-label={`播放录音 ${attrs.name}`} />
    </NodeViewWrapper>
  );
}

export const AudioRecording = Node.create({
  name: "audioRecording",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      name: { default: "语音备忘录" },
      src: { default: "" },
      mimeType: { default: "audio/webm" },
      durationMs: { default: 0 },
    };
  },

  parseHTML() {
    return [{
      tag: "div[data-audio-recording]",
      getAttrs: (element) => {
        const container = element as HTMLElement;
        const audio = container.querySelector("audio");
        return {
          name: cleanRecordingName(container.getAttribute("data-name") ?? "语音备忘录"),
          src: audio?.getAttribute("src") ?? "",
          mimeType: container.getAttribute("data-mime-type") ?? "audio/webm",
          durationMs: Number(container.getAttribute("data-duration-ms")) || 0,
        };
      },
    }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const attrs = node.attrs as AudioRecordingAttrs;
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-audio-recording": "true",
        "data-name": attrs.name,
        "data-mime-type": attrs.mimeType,
        "data-duration-ms": String(attrs.durationMs),
      }),
      ["span", { "data-audio-name": "true" }, attrs.name],
      ["span", { "data-audio-duration": "true" }, formatRecordingDuration(attrs.durationMs)],
      ["audio", { controls: "", preload: "metadata", src: attrs.src }],
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(AudioRecordingView);
  },

  addStorage() {
    return {
      markdown: {
        serialize(state: { write(value: string): void; closeBlock(node: unknown): void }, node: { attrs: AudioRecordingAttrs }) {
          const name = cleanRecordingName(node.attrs.name).replaceAll("[", "").replaceAll("]", "");
          state.write(`[语音备忘录：${name}]`);
          state.closeBlock(node);
        },
      },
    };
  },
});
