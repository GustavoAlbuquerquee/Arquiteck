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

    if (String(password).length < 6 || String(cnpj).replace(/\D/g, '').length !== 14) {
      return new Response(
        JSON.stringify({ error: 'Senha ou CNPJ inválidos' }),
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
      const duplicado = tenantError.code === '23505'
      return new Response(
        JSON.stringify({ error: duplicado ? 'Este CNPJ já está cadastrado' : 'Erro ao criar empresa' }),
        { status: duplicado ? 409 : 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Criar usuário via Admin API
    // tenant/role em app_metadata: só o service_role grava, e é o que o trigger usa
    const { data: user, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        tenant_id: tenant.id,
        nome_completo: nome_completo || ''
      },
      app_metadata: {
        tenant_id: tenant.id,
        role: 'admin'
      }
    })

    if (userError || !user.user) {
      await supabaseAdmin.from('tenants').delete().eq('id', tenant.id)
      const jaExiste = userError?.message?.toLowerCase().includes('already')
      return new Response(
        JSON.stringify({ error: jaExiste ? 'Este e-mail já está cadastrado' : 'Erro ao criar usuário' }),
        { status: jaExiste ? 409 : 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 3. Garantir o perfil de admin (o trigger normalmente já criou)
    const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
      id: user.user.id,
      tenant_id: tenant.id,
      nome_completo: nome_completo || email,
      role: 'admin'
    })

    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(user.user.id)
      await supabaseAdmin.from('tenants').delete().eq('id', tenant.id)
      return new Response(
        JSON.stringify({ error: 'Erro ao criar perfil' }),
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

  } catch (_error) {
    return new Response(
      JSON.stringify({ error: 'Erro inesperado ao criar conta' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
