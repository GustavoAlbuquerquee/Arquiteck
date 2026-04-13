import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Verificar autenticação
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verificar se usuário já tem tenant
    if (user.user_metadata?.tenant_id) {
      return new Response(
        JSON.stringify({ error: 'Usuário já possui uma organização' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Obter dados do body
    const { nome_fantasia, cnpj, nome_completo } = await req.json()

    if (!nome_fantasia || !cnpj) {
      return new Response(
        JSON.stringify({ error: 'Nome da empresa e CNPJ são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Criar tenant
    const { data: tenant, error: tenantError } = await supabaseClient
      .from('tenants')
      .insert({ nome_fantasia, cnpj })
      .select('id')
      .single()

    if (tenantError) {
      console.error('Erro ao criar tenant:', tenantError)
      return new Response(
        JSON.stringify({ error: tenantError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Atualizar user_metadata com tenant_id e nome_completo
    const updateData: any = { user_metadata: { tenant_id: tenant.id } }
    if (nome_completo) {
      updateData.user_metadata.nome_completo = nome_completo
    }

    const { error: updateError } = await supabaseClient.auth.admin.updateUserById(
      user.id,
      updateData
    )

    if (updateError) {
      // Rollback: deletar tenant criado
      await supabaseClient.from('tenants').delete().eq('id', tenant.id)
      console.error('Erro ao atualizar usuário:', updateError)
      return new Response(
        JSON.stringify({ error: updateError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ tenant_id: tenant.id, message: 'Organização criada com sucesso' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Erro:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
