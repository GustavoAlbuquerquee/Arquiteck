# Exemplos de Uso - Supabase Services

## 1. Autenticação e Tenant

### Criar usuário com tenant_id

```typescript
import { supabase } from '@/lib/supabase';

// Ao criar um usuário, SEMPRE adicione o tenant_id nos metadados
const { data, error } = await supabase.auth.signUp({
  email: 'usuario@marcenaria.com',
  password: 'senha_segura_123',
  options: {
    data: {
      tenant_id: '00000000-0000-0000-0000-000000000001', // UUID do tenant
      nome: 'João Silva'
    }
  }
});
```

### Login

```typescript
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'usuario@marcenaria.com',
  password: 'senha_segura_123'
});
```

### Obter tenant_id do usuário logado

```typescript
import { getCurrentTenantId } from '@/lib/supabase';

const tenantId = await getCurrentTenantId();
console.log('Tenant ID:', tenantId);
```

## 2. Clientes

```typescript
import { clientsService } from '@/lib/supabase';

// Listar todos os clientes (apenas do tenant do usuário logado)
const clientes = await clientsService.list();

// Criar novo cliente
const novoCliente = await clientsService.create({
  nome: 'Maria Santos',
  telefone: '(11) 98765-4321',
  endereco: 'Rua das Flores, 456'
});

// Buscar cliente por ID
const cliente = await clientsService.getById('uuid-do-cliente');

// Atualizar cliente
const clienteAtualizado = await clientsService.update('uuid-do-cliente', {
  telefone: '(11) 91234-5678'
});

// Deletar cliente
await clientsService.delete('uuid-do-cliente');
```

## 3. Projetos

```typescript
import { projectsService } from '@/lib/supabase';

// Listar todos os projetos (com dados do cliente)
const projetos = await projectsService.list();

// Criar novo projeto
const novoProjeto = await projectsService.create({
  client_id: 'uuid-do-cliente',
  titulo_ambiente: 'Cozinha Planejada',
  status: 'orcamento',
  data_prevista_instalacao: '2024-03-15'
});

// Buscar projeto por ID (com dados do cliente)
const projeto = await projectsService.getById('uuid-do-projeto');

// Atualizar status do projeto
const projetoAtualizado = await projectsService.update('uuid-do-projeto', {
  status: 'producao'
});

// Listar projetos de um cliente específico
const projetosDoCliente = await projectsService.listByClient('uuid-do-cliente');

// Deletar projeto
await projectsService.delete('uuid-do-projeto');
```

## 4. Checklists

```typescript
import { checklistsService, ChecklistPayload } from '@/lib/supabase';

// Criar payload do checklist
const payload: ChecklistPayload = {
  items: [
    { label: 'Medidas conferidas', checked: true },
    { label: 'Material aprovado', checked: true },
    { label: 'Cor definida', checked: false }
  ],
  croqui_url: 'https://storage.supabase.co/croqui.jpg',
  assinatura_url: 'https://storage.supabase.co/assinatura.png',
  observacoes: 'Cliente solicitou alteração na cor',
  fotos: [
    'https://storage.supabase.co/foto1.jpg',
    'https://storage.supabase.co/foto2.jpg'
  ]
};

// Criar novo checklist
const novoChecklist = await checklistsService.create({
  project_id: 'uuid-do-projeto',
  tipo_etapa: 'pre_producao',
  payload: payload
});

// Listar todos os checklists (com dados do projeto)
const checklists = await checklistsService.list();

// Buscar checklist por ID (com dados do projeto e cliente)
const checklist = await checklistsService.getById('uuid-do-checklist');

// Atualizar checklist (ex: adicionar assinatura)
const checklistAtualizado = await checklistsService.update('uuid-do-checklist', {
  payload: {
    ...payload,
    assinatura_url: 'https://storage.supabase.co/nova-assinatura.png'
  }
});

// Listar checklists de um projeto específico
const checklistsDoProjeto = await checklistsService.listByProject('uuid-do-projeto');

// Listar checklists por tipo de etapa
const checklistsPreProducao = await checklistsService.listByTipoEtapa('pre_producao');
const checklistsSaida = await checklistsService.listByTipoEtapa('saida');
const checklistsInstalacao = await checklistsService.listByTipoEtapa('instalacao');

// Deletar checklist
await checklistsService.delete('uuid-do-checklist');
```

## 5. Uso em Componentes React

```typescript
import { useEffect, useState } from 'react';
import { clientsService } from '@/lib/supabase';

function ClientesList() {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadClientes() {
      try {
        const data = await clientsService.list();
        setClientes(data);
      } catch (error) {
        console.error('Erro ao carregar clientes:', error);
      } finally {
        setLoading(false);
      }
    }

    loadClientes();
  }, []);

  if (loading) return <div>Carregando...</div>;

  return (
    <div>
      {clientes.map(cliente => (
        <div key={cliente.id}>
          <h3>{cliente.nome}</h3>
          <p>{cliente.telefone}</p>
        </div>
      ))}
    </div>
  );
}
```

## 6. Tratamento de Erros

```typescript
try {
  const cliente = await clientsService.create({
    nome: 'Teste',
    telefone: '123'
  });
} catch (error) {
  if (error.code === '23505') {
    // Violação de constraint única
    console.error('Cliente já existe');
  } else if (error.code === '42501') {
    // Erro de permissão (RLS)
    console.error('Sem permissão para esta operação');
  } else {
    console.error('Erro:', error.message);
  }
}
```

## 7. Realtime (Opcional)

```typescript
// Escutar mudanças em tempo real nos projetos
const channel = supabase
  .channel('projetos-changes')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'projects'
    },
    (payload) => {
      console.log('Mudança detectada:', payload);
      // Atualizar estado do componente
    }
  )
  .subscribe();

// Cleanup
return () => {
  supabase.removeChannel(channel);
};
```
