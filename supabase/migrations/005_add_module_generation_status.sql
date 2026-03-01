-- Create enum for generation states
CREATE TYPE generation_state AS ENUM (
  'generating_content',
  'generating_audio',
  'completed',
  'content_generation_error',
  'audio_generation_error'
);

-- Create module_generation_status table
CREATE TABLE module_generation_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  state generation_state NOT NULL,
  error_message TEXT,
  error_details TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(module_id)
);

-- Create index for faster lookups
CREATE INDEX idx_module_generation_status_module_id ON module_generation_status(module_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_module_generation_status_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_module_generation_status_updated_at
BEFORE UPDATE ON module_generation_status
FOR EACH ROW
EXECUTE FUNCTION update_module_generation_status_updated_at();

-- Enable realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE module_generation_status;
