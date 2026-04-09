-- Create sequence starting after existing receipts (5 exist)
CREATE SEQUENCE IF NOT EXISTS public.receipt_number_seq START WITH 6;

-- Helper function to atomically get next receipt number
CREATE OR REPLACE FUNCTION public.next_receipt_number()
RETURNS TEXT
LANGUAGE sql
VOLATILE
SET search_path = public
AS $$
  SELECT 'RCP-' || LPAD(nextval('public.receipt_number_seq')::TEXT, 4, '0');
$$;