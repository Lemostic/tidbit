-- Migration 0006: Allow group marker and tab background colors to differ.

ALTER TABLE `group` ADD COLUMN background_color TEXT;
UPDATE `group` SET background_color = color;
