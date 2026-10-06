-- Migration: Track players who have left the squad
-- Sync sets left_at when a player drops off the ELTTL squad and clears it if
-- they return. Hidden players keep their availability and selection history.

ALTER TABLE players ADD COLUMN left_at INTEGER;
