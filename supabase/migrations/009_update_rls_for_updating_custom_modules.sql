-- MODULE GENERATION STATUS policies
CREATE POLICY "Anyone can update their own module generation status"
    ON module_generation_status FOR UPDATE
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM modules
            WHERE modules.id = module_generation_status.module_id
            AND auth.uid() IS NOT NULL
            AND auth.uid() = modules.creator_id
        )
    );

-- MODULES policies
CREATE POLICY "Anyone can update their own modules"
  ON modules FOR UPDATE
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND auth.uid() = modules.creator_id
  );
