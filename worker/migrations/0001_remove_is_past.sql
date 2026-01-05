-- Migration: Remove is_past column from fixtures table
-- The is_past field will be computed dynamically in the API layer
-- based on comparing match_date with the current date

-- Drop the is_past column from fixtures table
ALTER TABLE fixtures DROP COLUMN is_past;
