// Field names match Rust snake_case — T7 used serde(rename_all = "lowercase") on EdgeDock
// but did NOT add camelCase rename on Note/Group structs, so Rust sends snake_case strings.

export type EdgeDock = "left" | "right" | "top" | "bottom" | "none";

export interface Note {
  id: number;
  group_id: number | null;
  title: string | null;
  content_md: string;
  content_html: string;
  word_count: number;
  is_pinned: boolean;
  is_content_hidden: boolean;
  is_archived: boolean;
  is_trashed: boolean;
  trashed_at: number | null;
  geom_x: number | null;
  geom_y: number | null;
  geom_w: number;
  geom_h: number;
  edge_dock: EdgeDock;
  created_at: number;
  updated_at: number;
  color: string | null;
  sort_order: number;
}

export interface Group {
  id: number;
  name: string;
  color: string | null;
  background_color: string | null;
  icon: string | null;
  sort_order: number;
  pinned: boolean;
  collapsed: boolean;
  created_at: number;
  updated_at: number;
}
