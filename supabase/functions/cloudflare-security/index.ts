import { createClient } from 'npm:@supabase/supabase-js@2'
import { z } from 'npm:zod@3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const CF_API = 'https://api.cloudflare.com/client/v4'

const ActionSchema = z.object({
  action: z.enum(['get_zones', 'zone_settings', 'purge_cache', 'security_level', 'firewall_rules', 'analytics']),
  zone_id: z.string().optional(),
  params: z.record(z.unknown()).optional(),
})

async function cfFetch(path: string, token: string, options?: RequestInit) {
  const res = await fetch(`${CF_API}${path}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(`Cloudflare API error [${res.status}]: ${JSON.stringify(data.errors)}`)
  }
  return data
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Auth check
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Check admin role
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle()
    if (!roleData) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const CF_TOKEN = Deno.env.get('CLOUDFLARE_API_KEY')
    const CF_ACCOUNT = Deno.env.get('CLOUDFLARE_ACCOUNT_ID')
    if (!CF_TOKEN) throw new Error('CLOUDFLARE_API_KEY not configured')
    if (!CF_ACCOUNT) throw new Error('CLOUDFLARE_ACCOUNT_ID not configured')

    const body = await req.json()
    const parsed = ActionSchema.safeParse(body)
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten().fieldErrors }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { action, zone_id, params } = parsed.data
    let result: unknown

    switch (action) {
      case 'get_zones': {
        result = await cfFetch(`/zones?account.id=${CF_ACCOUNT}`, CF_TOKEN)
        break
      }
      case 'zone_settings': {
        if (!zone_id) throw new Error('zone_id required')
        result = await cfFetch(`/zones/${zone_id}/settings`, CF_TOKEN)
        break
      }
      case 'purge_cache': {
        if (!zone_id) throw new Error('zone_id required')
        result = await cfFetch(`/zones/${zone_id}/purge_cache`, CF_TOKEN, {
          method: 'POST',
          body: JSON.stringify({ purge_everything: true }),
        })
        break
      }
      case 'security_level': {
        if (!zone_id) throw new Error('zone_id required')
        const level = (params?.level as string) || 'medium'
        result = await cfFetch(`/zones/${zone_id}/settings/security_level`, CF_TOKEN, {
          method: 'PATCH',
          body: JSON.stringify({ value: level }),
        })
        break
      }
      case 'firewall_rules': {
        if (!zone_id) throw new Error('zone_id required')
        result = await cfFetch(`/zones/${zone_id}/firewall/rules`, CF_TOKEN)
        break
      }
      case 'analytics': {
        if (!zone_id) throw new Error('zone_id required')
        const since = (params?.since as string) || '-1440' // last 24h
        result = await cfFetch(`/zones/${zone_id}/analytics/dashboard?since=${since}`, CF_TOKEN)
        break
      }
    }

    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err: unknown) {
    console.error('Cloudflare security error:', err)
    const message = err instanceof Error ? err.message : 'Unknown error'
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
