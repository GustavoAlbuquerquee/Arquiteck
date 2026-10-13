import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

// Cria um membro no tenant do admin que fez a chamada.
// O tenant e o papel vão em app_metadata, que só o service_role consegue gravar.
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. Identificar quem chamou
    const token = req.headers.get('Authorization')?.replace('Bearer ', '')
    if (!token) return json({ error: 'Não autenticado' }, 401)

    const { data: { user: caller } } = await supabaseAdmin.auth.getUser(token)
    if (!caller) return json({ error: 'Não autenticado' }, 401)

    const { data: callerProfile } = await supabaseAdmin
      .from('profiles')
      .select('tenant_id, role')
      .eq('id', caller.id)
      .maybeSingle()

    if (!callerProfile || callerProfile.role !== 'admin') {
      return json({ error: 'Apenas administradores podem adicionar membros' }, 403)
    }

    // 2. Validar dados
    const { email, password, nome_completo, cargo } = await req.json()

    if (!email || !nome_completo) {
      return json({ error: 'E-mail e nome são obrigatórios' }, 400)
    }
    if (!password || String(password).length < 8) {
      return json({ error: 'A senha inicial deve ter no mínimo 8 caracteres' }, 400)
    }

    // 3. Criar usuário
    const { data: created, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nome_completo },
      app_metadata: { tenant_id: callerProfile.tenant_id, role: 'membro' },
    })

    if (userError || !created.user) {
      const jaExiste = userError?.message?.toLowerCase().includes('already')
      return json(
        { error: jaExiste ? 'Este e-mail já está cadastrado' : 'Não foi possível criar o usuário' },
        jaExiste ? 409 : 500
      )
    }

    // 4. Garantir o perfil (o trigger normalmente já criou)
    const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
      id: created.user.id,
      tenant_id: callerProfile.tenant_id,
      nome_completo,
      cargo: cargo || null,
      role: 'membro',
    })

    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(created.user.id)
      return json({ error: 'Não foi possível criar o perfil do membro' }, 500)
    }

    return json({ user_id: created.user.id })
  } catch (_error) {
    return json({ error: 'Erro inesperado ao adicionar membro' }, 500)
  }
})
