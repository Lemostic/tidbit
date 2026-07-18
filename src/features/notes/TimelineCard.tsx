import { ArrowDown, ArrowUp, CalendarDots, Plus, Trash } from "@phosphor-icons/react";
import { mergeAttributes, Node, NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from "@tiptap/react";
import { useEffect, useState } from "react";
import {
  cleanTimelineDescription,
  cleanTimelineSingleLine,
  normalizeTimelineDate,
  normalizeTimelineTime,
  timelineDescriptionMaxLength,
  timelineTextMaxLength,
} from "./timelineCardModel";

interface TimelineItem {
  id: string;
  date: string;
  time: string;
  title: string;
  description: string;
}

interface TimelineCardAttrs {
  title: string;
  items: TimelineItem[];
}

const defaultTimelineTitle = "时间轴";

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
  return { id: makeItemId(), date: datePart, time: timePart, title: "新时间节点", description: "" };
}

function normalizeItem(value: Partial<TimelineItem> | null | undefined, index: number): TimelineItem {
  return {
    id: cleanTimelineSingleLine(value?.id, `timeline-${index + 1}`),
    date: normalizeTimelineDate(value?.date),
    time: normalizeTimelineTime(value?.time),
    title: cleanTimelineSingleLine(value?.title, "未命名事件"),
    description: cleanTimelineDescription(value?.description),
  };
}

function normalizeTimelineItems(value: unknown): TimelineItem[] {
  if (!Array.isArray(value)) return [];
  return value.map((item, index) => normalizeItem(item as Partial<TimelineItem>, index));
}

export function createTimelineCardAttrs(): TimelineCardAttrs {
  return { title: defaultTimelineTitle, items: [createTimelineItem()] };
}

function formatTimelineLabel(item: TimelineItem): string {
  return [item.date, item.time].filter(Boolean).join(" ") || "未设置时间";
}

interface TimelineItemEditorProps {
  item: TimelineItem;
  index: number;
  total: number;
  onUpdate: (patch: Partial<TimelineItem>) => void;
  onMove: (direction: -1 | 1) => void;
  onDelete: () => void;
}

function TimelineItemEditor({ item, index, total, onUpdate, onMove, onDelete }: TimelineItemEditorProps) {
  const [titleDraft, setTitleDraft] = useState(item.title);
  const [descriptionDraft, setDescriptionDraft] = useState(item.description);

  useEffect(() => setTitleDraft(item.title), [item.title]);
  useEffect(() => setDescriptionDraft(item.description), [item.description]);

  return (
    <li className="timeline-card__item" data-timeline-item="true" data-date={item.date} data-time={item.time}>
      <span className="timeline-card__rail" aria-hidden="true"><span /></span>
      <div className="timeline-card__event">
        <div className="timeline-card__meta">
          <input type="date" aria-label={`时间节点 ${index + 1} 日期`} value={item.date} onMouseDown={(event) => event.stopPropagation()} onChange={(event) => onUpdate({ date: event.target.value })} />
          <input type="time" aria-label={`时间节点 ${index + 1} 时间`} value={item.time} onMouseDown={(event) => event.stopPropagation()} onChange={(event) => onUpdate({ time: event.target.value })} />
          <button type="button" aria-label={`上移时间节点 ${index + 1}`} title="上移" disabled={index === 0} onMouseDown={(event) => event.stopPropagation()} onClick={() => onMove(-1)}><ArrowUp size={12} /></button>
          <button type="button" aria-label={`下移时间节点 ${index + 1}`} title="下移" disabled={index === total - 1} onMouseDown={(event) => event.stopPropagation()} onClick={() => onMove(1)}><ArrowDown size={12} /></button>
          <button type="button" aria-label={`删除时间节点 ${index + 1}`} title="删除" disabled={total === 1} onMouseDown={(event) => event.stopPropagation()} onClick={onDelete}><Trash size={12} /></button>
        </div>
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
          className="timeline-card__description"
          aria-label={`时间节点 ${index + 1} 说明`}
          value={descriptionDraft}
          maxLength={timelineDescriptionMaxLength}
          rows={2}
          placeholder="补充事件说明"
          onMouseDown={(event) => event.stopPropagation()}
          onChange={(event) => setDescriptionDraft(event.target.value)}
          onBlur={() => onUpdate({ description: cleanTimelineDescription(descriptionDraft) })}
          onKeyDown={(event) => {
            if (event.key === "Escape") { setDescriptionDraft(item.description); event.currentTarget.blur(); }
          }}
        />
      </div>
    </li>
  );
}

function TimelineCardView({ node, updateAttributes, deleteNode, selected }: NodeViewProps) {
  const attrs = node.attrs as TimelineCardAttrs;
  const title = cleanTimelineSingleLine(attrs.title, defaultTimelineTitle);
  const items = normalizeTimelineItems(attrs.items);
  const [titleDraft, setTitleDraft] = useState(title);

  useEffect(() => setTitleDraft(title), [title]);

  const updateItems = (nextItems: TimelineItem[]) => updateAttributes({ items: nextItems });
  const updateItem = (index: number, patch: Partial<TimelineItem>) => {
    updateItems(items.map((item, itemIndex) => itemIndex === index ? normalizeItem({ ...item, ...patch }, itemIndex) : item));
  };
  const moveItem = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    const currentItem = next[index];
    const targetItem = next[target];
    if (!currentItem || !targetItem) return;
    next[index] = targetItem;
    next[target] = currentItem;
    updateItems(next);
  };

  return (
    <NodeViewWrapper
      className={`timeline-card${selected ? " is-selected" : ""}`}
      data-timeline-card="true"
      data-title={title}
      contentEditable={false}
    >
      <header className="timeline-card__head">
        <CalendarDots size={17} weight="duotone" aria-hidden="true" />
        <input
          className="timeline-card__title"
          aria-label="时间轴标题"
          value={titleDraft}
          maxLength={timelineTextMaxLength}
          onMouseDown={(event) => event.stopPropagation()}
          onChange={(event) => setTitleDraft(event.target.value)}
          onBlur={() => updateAttributes({ title: cleanTimelineSingleLine(titleDraft, defaultTimelineTitle) })}
          onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }}
        />
        <button type="button" className="timeline-card__add" aria-label="添加时间节点" title="添加时间节点" onMouseDown={(event) => event.stopPropagation()} onClick={() => updateItems([...items, createTimelineItem()])}>
          <Plus size={14} weight="bold" />
        </button>
        <button type="button" className="timeline-card__delete" aria-label="删除时间轴" title="删除时间轴" onMouseDown={(event) => event.stopPropagation()} onClick={deleteNode}>
          <Trash size={14} />
        </button>
      </header>

      <ol className="timeline-card__list" data-timeline-items="true">
        {items.map((item, index) => (
          <TimelineItemEditor
            key={item.id}
            item={item}
            index={index}
            total={items.length}
            onUpdate={(patch) => updateItem(index, patch)}
            onMove={(direction) => moveItem(index, direction)}
            onDelete={() => updateItems(items.filter((_, itemIndex) => itemIndex !== index))}
          />
        ))}
      </ol>
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
      title: { default: defaultTimelineTitle },
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
            date: item.getAttribute("data-date") ?? "",
            time: item.getAttribute("data-time") ?? "",
            title: item.querySelector("[data-timeline-item-title]")?.textContent ?? "",
            description: item.querySelector("[data-timeline-item-description]")?.textContent ?? "",
          }));
        return {
          title: cleanTimelineSingleLine(container.getAttribute("data-title") ?? container.querySelector("[data-timeline-title]")?.textContent, defaultTimelineTitle),
          items: normalizeTimelineItems(items),
        };
      },
    }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const attrs = node.attrs as TimelineCardAttrs;
    const title = cleanTimelineSingleLine(attrs.title, defaultTimelineTitle);
    const items = normalizeTimelineItems(attrs.items);
    return [
      "div",
      mergeAttributes({ "data-timeline-card": "true", "data-title": title }, Object.fromEntries(
        Object.entries(HTMLAttributes).filter(([key]) => key !== "title" && key !== "items")
      )),
      ["div", { "data-timeline-header": "true" }, ["span", { "data-timeline-title": "true" }, title]],
      ["ol", { "data-timeline-items": "true" }, ...items.map((item) => [
        "li",
        { "data-timeline-item": "true", "data-id": item.id, "data-date": item.date, "data-time": item.time },
        ["time", { "data-timeline-date": "true", dateTime: [item.date, item.time].filter(Boolean).join("T") }, formatTimelineLabel(item)],
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
          const title = cleanTimelineSingleLine(node.attrs.title, defaultTimelineTitle);
          const items = normalizeTimelineItems(node.attrs.items);
          const lines = [`时间轴：${title}`, ...items.map((item) => {
            const detail = [formatTimelineLabel(item), item.title].filter(Boolean).join(" ");
            return `- ${item.description ? `${detail}：${item.description}` : detail}`;
          })];
          state.write(lines.join("\n"));
          state.closeBlock(node);
        },
      },
    };
  },
});
