-- Add is_active column to events table for soft delete
-- Run this in your Supabase SQL Editor

ALTER TABLE events 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Update existing events to be active
UPDATE events 
SET is_active = TRUE 
WHERE is_active IS NULL;

-- Add comment to document the column
COMMENT ON COLUMN events.is_active IS 'Indicates if event is active (TRUE) or soft-deleted (FALSE)';
