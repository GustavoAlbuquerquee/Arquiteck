import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { email, password, nome_completo, nome_fantasia, cnpj } = await req.json()

    if (!email || !password || !nome_fantasia || !cnpj) {
      return new Response(
        JSON.stringify({ error: 'Dados obrigatórios faltando' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 1. Criar tenant
    const { data: tenant, error: tenantError } = await supabaseAdmin
      .from('tenants')
      .insert({ nome_fantasia, cnpj })
      .select('id')
      .single()

    if (tenantError) {
      return new Response(
        JSON.stringify({ error: `Erro ao criar empresa: ${tenantError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Criar usuário via Admin API
    const { data: user, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        tenant_id: tenant.id,
        nome_completo: nome_completo || ''
      }
    })

    if (userError) {
      await supabaseAdmin.from('tenants').delete().eq('id', tenant.id)
      return new Response(
        JSON.stringify({ error: `Erro ao criar usuário: ${userError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ 
        user: user.user,
        tenant_id: tenant.id,
        message: 'Conta criada com sucesso!' 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
