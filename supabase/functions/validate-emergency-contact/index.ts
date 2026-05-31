import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

interface Payload {
  name?: unknown;
  relation?: unknown;
  phone?: unknown;
  ownPhone?: unknown;
}

const ALLOWED_RELATIONS = ["Father", "Mother", "Guardian", "Sibling", "Spouse", "Relative", "Other"];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let body: Payload;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const errors: Record<string, string> = {};

  // Name
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name) {
    errors.name = 'Emergency contact name is required';
  } else if (name.length < 2) {
    errors.name = 'Name must be at least 2 characters';
  } else if (name.length > 100) {
    errors.name = 'Name must be under 100 characters';
  } else if (!/^[A-Za-z\s.'-]+$/.test(name)) {
    errors.name = 'Use letters, spaces, dots, apostrophes, and hyphens only';
  }

  // Relation
  const relation = typeof body.relation === 'string' ? body.relation.trim() : '';
  if (!relation) {
    errors.relation = 'Relation is required';
  } else if (!ALLOWED_RELATIONS.includes(relation)) {
    errors.relation = `Relation must be one of: ${ALLOWED_RELATIONS.join(', ')}`;
  }

  // Phone
  const phoneRaw = typeof body.phone === 'string' ? body.phone : '';
  const phoneDigits = phoneRaw.replace(/\D/g, '');
  const ownDigits = (typeof body.ownPhone === 'string' ? body.ownPhone : '').replace(/\D/g, '');

  if (!phoneDigits) {
    errors.phone = 'Emergency phone is required';
  } else if (!/^\d{10}$/.test(phoneDigits)) {
    errors.phone = 'Phone must be exactly 10 digits';
  } else if (!/^[6-9]/.test(phoneDigits)) {
    errors.phone = 'Indian mobile numbers must start with 6, 7, 8, or 9';
  } else if (ownDigits && phoneDigits === ownDigits) {
    errors.phone = 'Emergency phone must differ from your own number';
  }

  const ok = Object.keys(errors).length === 0;

  return new Response(JSON.stringify({ ok, errors }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
