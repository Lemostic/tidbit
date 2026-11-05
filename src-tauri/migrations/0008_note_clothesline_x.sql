-- Migration 0008: Persist free horizontal positions of notes on the clothesline.
-- NULL means "never dragged": the frontend falls back to an even slot.

ALTER TABLE note ADD COLUMN clothesline_x REAL;
