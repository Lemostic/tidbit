import { z } from "zod";

export const noteSchema = z.object({
  id: z.number(),
  group_id: z.number().nullable(),
  title: z.string().nullable(),
  content_md: z.string(),
  content_html: z.string(),
  word_count: z.number(),
  is_pinned: z.boolean(),
  is_content_hidden: z.boolean(),
  is_archived: z.boolean(),
  is_trashed: z.boolean(),
  trashed_at: z.number().nullable(),
  geom_x: z.number().nullable(),
  geom_y: z.number().nullable(),
  geom_w: z.number(),
  geom_h: z.number(),
  edge_dock: z.enum(["left", "right", "top", "bottom", "none"]),
  created_at: z.number(),
  updated_at: z.number(),
  color: z.string().nullable(),
  sort_order: z.number(),
});

export const groupSchema = z.object({
  id: z.number(),
  name: z.string(),
  color: z.string().nullable(),
  background_color: z.string().nullable(),
  icon: z.string().nullable(),
  sort_order: z.number(),
  pinned: z.boolean(),
  collapsed: z.boolean(),
  created_at: z.number(),
  updated_at: z.number(),
});
