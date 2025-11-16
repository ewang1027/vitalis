-- Migration: Add chat archiving support
-- This migration adds support for archiving chat messages to preserve patient privacy
-- Run this SQL in your Supabase SQL Editor

-- Add is_archived and archived_at columns to chat_messages table
ALTER TABLE chat_messages
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Create index on is_archived for better query performance
CREATE INDEX IF NOT EXISTS idx_chat_messages_is_archived ON chat_messages(is_archived);

-- Create index on room_id and is_archived for room-specific queries
CREATE INDEX IF NOT EXISTS idx_chat_messages_room_archived ON chat_messages(room_id, is_archived);

-- Update existing records to set is_archived to false (if NULL)
UPDATE chat_messages
SET is_archived = false
WHERE is_archived IS NULL;

-- Add comments to columns for documentation
COMMENT ON COLUMN chat_messages.is_archived IS 'Indicates if the message has been archived for patient privacy';
COMMENT ON COLUMN chat_messages.archived_at IS 'Timestamp when the message was archived';
