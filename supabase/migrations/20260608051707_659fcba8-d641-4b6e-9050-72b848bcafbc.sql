
DROP POLICY IF EXISTS "Users broadcast to their own channels" ON realtime.messages;

CREATE POLICY "Authenticated users can broadcast to dm topics"
  ON realtime.messages
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (
      realtime.topic() LIKE 'dm:%'
      OR realtime.topic() LIKE ('user:' || auth.uid()::text || '%')
    )
  );
