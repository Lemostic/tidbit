import { Plus, Trash } from "@phosphor-icons/react";
import { mergeAttributes, Node, NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from "@tiptap/react";
import { useEffect, useState } from "react";
import {
  cleanTimelineDescription,
  cleanTimelineSingleLine,
  normalizeTimelineItem,
  timelineDescriptionMaxLength,
  timelineTextMaxLength,
  type TimelineItemData,
  type TimelineItemInput,
} from "./timelineCardModel";

type TimelineItem = TimelineItemData;

interface TimelineCardAttrs {
  items: TimelineItem[];
}

function makeItemId(): string {
  return `timeline-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createTimelineItem(date = new Date()): TimelineItem {
  const datePart = [date.getFullYear(), date.getMonth() + 1, date.getDate()]
    .map((value, index) => String(value).padStart(index === 0 ? 4 : 2, "0"))
    .join("-");
  const timePart = [date.getHours(), date.getMinutes()]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
  return { id: makeItemId(), datetime: `${datePart}T${timePart}`, title: "新时间节点", description: "" };
}

function normalizeTimelineItems(value: unknown): TimelineItem[] {
  if (!Array.isArray(value)) return [];
  return value.map((item, index) => normalizeTimelineItem(item as TimelineItemInput, index));
}

export function createTimelineCardAttrs(): TimelineCardAttrs {
  return { items: [createTimelineItem()] };
}

function formatTimelineLabel(item: TimelineItem): string {
  return item.datetime.replace("T", " ") || "未设置时间";
}

interface TimelineItemEditorProps {
  item: TimelineItem;
  index: number;
  onUpdate: (patch: Partial<TimelineItem>) => void;
  onDelete: () => void;
}

function TimelineItemEditor({ item, index, onUpdate, onDelete }: TimelineItemEditorProps) {
  const [titleDraft, setTitleDraft] = useState(item.title);
  const [detailDraft, setDetailDraft] = useState(item.description);

  useEffect(() => setTitleDraft(item.title), [item.title]);
  useEffect(() => setDetailDraft(item.description), [item.description]);

  return (
    <li className="timeline-card__item" data-timeline-item="true" data-datetime={item.datetime}>
      <span className="timeline-card__rail" aria-hidden="true"><span /></span>
      <div className="timeline-card__event">
        <input
          className="timeline-card__event-title"
          aria-label={`时间节点 ${index + 1} 标题`}
          value={titleDraft}
          maxLength={timelineTextMaxLength}
          onMouseDown={(event) => event.stopPropagation()}
          onChange={(event) => setTitleDraft(event.target.value)}
          onBlur={() => onUpdate({ title: cleanTimelineSingleLine(titleDraft, "未命名事件") })}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
            if (event.key === "Escape") { setTitleDraft(item.title); event.currentTarget.blur(); }
          }}
        />
        <textarea
          className="timeline-card__detail"
          aria-label={`时间节点 ${index + 1} 详情`}
          value={detailDraft}
          maxLength={timelineDescriptionMaxLength}
          rows={2}
          placeholder="补充该时间节点的详情"
          onMouseDown={(event) => event.stopPropagation()}
          onChange={(event) => setDetailDraft(event.target.value)}
          onBlur={() => onUpdate({ description: cleanTimelineDescription(detailDraft) })}
          onKeyDown={(event) => {
            if (event.key === "Escape") { setDetailDraft(item.description); event.currentTarget.blur(); }
          }}
        />
        <div className="timeline-card__item-actions">
          <input
            type="datetime-local"
            aria-label={`时间节点 ${index + 1} 时间`}
            value={item.datetime}
            onMouseDown={(event) => event.stopPropagation()}
            onChange={(event) => onUpdate({ datetime: event.target.value })}
          />
          <button type="button" aria-label={`删除时间节点 ${index + 1}`} title="删除节点" onMouseDown={(event) => event.stopPropagation()} onClick={onDelete}><Trash size={12} /></button>
        </div>
      </div>
    </li>
  );
}

function TimelineCardView({ node, updateAttributes, deleteNode, selected }: NodeViewProps) {
  const attrs = node.attrs as TimelineCardAttrs;
  const items = normalizeTimelineItems(attrs.items);

  const updateItems = (nextItems: TimelineItem[]) => updateAttributes({ items: nextItems });
  const updateItem = (index: number, patch: Partial<TimelineItem>) => {
    updateItems(items.map((item, itemIndex) => itemIndex === index ? normalizeTimelineItem({ ...item, ...patch }, itemIndex) : item));
  };
  return (
    <NodeViewWrapper
      className={`timeline-card${selected ? " is-selected" : ""}`}
      data-timeline-card="true"
      contentEditable={false}
    >
      <ol className="timeline-card__list" data-timeline-items="true">
        {items.map((item, index) => (
          <TimelineItemEditor
            key={item.id}
            item={item}
            index={index}
            onUpdate={(patch) => updateItem(index, patch)}
            onDelete={() => items.length === 1 ? deleteNode() : updateItems(items.filter((_, itemIndex) => itemIndex !== index))}
          />
        ))}
      </ol>
      <button type="button" className="timeline-card__add" aria-label="添加时间节点" title="添加时间节点" onMouseDown={(event) => event.stopPropagation()} onClick={() => updateItems([...items, createTimelineItem()])}>
        <Plus size={12} weight="bold" />添加节点
      </button>
    </NodeViewWrapper>
  );
}

export const TimelineCard = Node.create({
  name: "timelineCard",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      items: { default: [] },
    };
  },

  parseHTML() {
    return [{
      tag: "div[data-timeline-card]",
      getAttrs: (element) => {
        const container = element as HTMLElement;
        const items = Array.from(container.querySelectorAll("ol[data-timeline-items] > li[data-timeline-item]"))
          .map((item, index) => ({
            id: item.getAttribute("data-id") ?? `timeline-${index + 1}`,
            datetime: item.getAttribute("data-datetime") ?? "",
            date: item.getAttribute("data-date") ?? "",
            time: item.getAttribute("data-time") ?? "",
            title: item.querySelector("[data-timeline-item-title]")?.textContent ?? "",
            description: item.querySelector("[data-timeline-item-description]")?.textContent ?? "",
          }));
        return {
          items: normalizeTimelineItems(items),
        };
      },
    }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const attrs = node.attrs as TimelineCardAttrs;
    const items = normalizeTimelineItems(attrs.items);
    return [
      "div",
      mergeAttributes({ "data-timeline-card": "true" }, Object.fromEntries(
        Object.entries(HTMLAttributes).filter(([key]) => key !== "items")
      )),
      ["ol", { "data-timeline-items": "true" }, ...items.map((item) => [
        "li",
        { "data-timeline-item": "true", "data-id": item.id, "data-datetime": item.datetime },
        ["time", { "data-timeline-date": "true", dateTime: item.datetime }, formatTimelineLabel(item)],
        ["div", { "data-timeline-content": "true" },
          ["strong", { "data-timeline-item-title": "true" }, item.title],
          ...(item.description ? [["p", { "data-timeline-item-description": "true" }, item.description]] : []),
        ],
      ])],
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(TimelineCardView);
  },

  addStorage() {
    return {
      markdown: {
        serialize(state: { write(value: string): void; closeBlock(node: unknown): void }, node: { attrs: TimelineCardAttrs }) {
          const items = normalizeTimelineItems(node.attrs.items);
          const lines = items.map((item) => {
            const heading = [formatTimelineLabel(item), `**${item.title}**`].filter(Boolean).join(" ");
            return `- ${heading}${item.description ? `\n  ${item.description.replace(/\n/g, "\n  ")}` : ""}`;
          });
          state.write(lines.join("\n"));
          state.closeBlock(node);
        },
      },
    };
  },
});
