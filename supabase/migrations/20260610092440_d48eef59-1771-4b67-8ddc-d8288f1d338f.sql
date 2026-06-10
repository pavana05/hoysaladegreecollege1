DROP POLICY IF EXISTS "Authenticated users can broadcast to dm topics" ON realtime.messages;

CREATE POLICY "Users broadcast only to existing dm counterparts"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND (
    (
      realtime.topic() LIKE 'dm:%'
      AND EXISTS (
        SELECT 1 FROM public.direct_messages dm
        WHERE (
          (dm.sender_id = auth.uid() AND dm.receiver_id::text = substring(realtime.topic() FROM 4))
          OR (dm.receiver_id = auth.uid() AND dm.sender_id::text = substring(realtime.topic() FROM 4))
        )
      )
    )
    OR realtime.topic() LIKE ('user:' || auth.uid()::text || '%')
  )
);