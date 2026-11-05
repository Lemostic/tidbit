import { Table, TableCell, TableHeader, TableRow } from "@tiptap/extension-table";
import { DOMSerializer, type Node as ProseMirrorNode } from "@tiptap/pm/model";
import type { Editor } from "@tiptap/react";

interface TableMarkdownState {
  out: string;
  inTable: boolean;
  write(value: string): void;
  renderInline(node: ProseMirrorNode): void;
  ensureNewLine(): void;
  closeBlock(node: ProseMirrorNode): void;
}

// tiptap-markdown's default table serializer does not escape cell pipes,
// including pipes inside code marks. Keep the fix at the table boundary.
export const EditorTable = Table.extend({
  addStorage() {
    return {
      markdown: {
        serialize(this: { editor: Editor }, state: TableMarkdownState, node: ProseMirrorNode) {
          let simple = true;
          node.forEach((row, _offset, rowIndex) => row.forEach(cell => {
            if (cell.attrs.colspan > 1 || cell.attrs.rowspan > 1 || cell.childCount !== 1
              || cell.firstChild?.type.name !== "paragraph"
              || cell.type.name !== (rowIndex === 0 ? "tableHeader" : "tableCell")) simple = false;
            cell.descendants(child => { if (child.type.name === "hardBreak") simple = false; });
          }));
          if (!simple) {
            const element = DOMSerializer.fromSchema(node.type.schema).serializeNode(node) as HTMLElement;
            state.write(element.outerHTML);
            state.closeBlock(node);
            return;
          }
          state.inTable = true;
          node.forEach((row, _offset, index) => {
            state.write("| ");
            row.forEach((cell, _cellOffset, column) => {
              if (column) state.write(" | ");
              // A separate serializer state finalizes inline mark delimiters before
              // escaping pipes; mutating the shared output invalidates mark offsets.
              const storage = this.editor.storage as unknown as { markdown: { serializer: { serialize(node: ProseMirrorNode): string } } };
              const content = storage.markdown.serializer.serialize(node.type.schema.topNodeType.create(null, cell.content));
              state.write(content.replace(/\n/g, "<br>").replace(/\|/g, "\\|"));
            });
            state.write(" |");
            state.ensureNewLine();
            if (!index) {
              state.write(`| ${Array.from({ length: row.childCount }, () => "---").join(" | ")} |`);
              state.ensureNewLine();
            }
          });
          state.inTable = false;
          state.closeBlock(node);
        },
        parse: {},
      },
    };
  },
}).configure({ resizable: false });

export const editorTableExtensions = [EditorTable, TableRow, TableHeader, TableCell];
