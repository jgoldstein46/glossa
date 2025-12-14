-- Add language column to modules table
-- Each module can be generated in a specific language

ALTER TABLE modules
ADD COLUMN language TEXT NOT NULL DEFAULT 'English';

-- Index for filtering by language
CREATE INDEX idx_modules_language ON modules(language);
