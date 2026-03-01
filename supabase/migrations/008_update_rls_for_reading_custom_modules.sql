-- MODULES policies
CREATE POLICY "Anyone can read modules they created"
  ON modules FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND auth.uid() = modules.creator_id
  );

-- SECTIONS policies
CREATE POLICY "Anyone can read sections of modules they created"
  ON sections FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM modules
      WHERE modules.id = sections.module_id
      AND auth.uid() IS NOT NULL
      AND auth.uid() = modules.creator_id
    )
  );

-- QUIZZES policies
CREATE POLICY "Anyone can read quizzes for modules they created"
  ON quizzes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sections
      JOIN modules ON modules.id = sections.module_id
      WHERE sections.id = quizzes.section_id
      AND auth.uid() IS NOT NULL
      AND auth.uid() = modules.creator_id
    )
  );
