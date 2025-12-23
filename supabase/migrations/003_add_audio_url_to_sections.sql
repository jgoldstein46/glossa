-- Add audio_url column to sections table for storing TTS audio file URLs
ALTER TABLE sections ADD COLUMN audio_url TEXT;
