ALTER TABLE modules ADD COLUMN creator_id TEXT;

ALTER TABLE module_generation_status ENABLE ROW LEVEL SECURITY;

-- MODULE GENERATION STATUS policies
CREATE POLICY "Anyone can insert their own module generation status"
    ON module_generation_status FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM modules
            WHERE modules.id = module_generation_status.module_id
            AND auth.uid() IS NOT NULL
            AND auth.uid() = modules.creator_id
        )
    );

CREATE POLICY "Anyone can read their own module generation status"
    ON module_generation_status FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM modules
            WHERE modules.id = module_generation_status.module_id
            AND auth.uid() IS NOT NULL
            AND auth.uid() = modules.creator_id
        )
    );

-- MODULES policies
CREATE POLICY "Anyone can create modules for themselves"
  ON modules FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND auth.uid() = modules.creator_id
  );

-- SECTIONS policies
CREATE POLICY "Anyone can create sections of modules they created"
  ON sections FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM modules
      WHERE modules.id = sections.module_id
      AND auth.uid() IS NOT NULL
      AND auth.uid() = modules.creator_id
    )
  );

-- QUIZZES policies
CREATE POLICY "Anyone can create quizzes for modules they created"
  ON quizzes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sections
      JOIN modules ON modules.id = sections.module_id
      WHERE sections.id = quizzes.section_id
      AND auth.uid() IS NOT NULL
      AND auth.uid() = modules.creator_id
    )
  );
