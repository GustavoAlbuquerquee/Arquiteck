import { describe, expect, it } from 'vitest';
import {
  calcularProximoFollowup,
  descreverQuando,
  diasEsfriando,
  estaNoExpediente,
  formatarDuracao,
  minutosUteisEntre,
  pesoUrgencia,
  proximaAbertura,
  situacaoDoCard,
  type DadosRelogio,
} from './relogios';
import { alertaPrincipal, calcularMetricas, temposDeResposta } from './metricas';

// Datas sempre com o fuso explícito de São Paulo (-03:00), para o teste não
// depender do fuso da máquina. 12/10/2026 é uma segunda-feira.
const sp = (iso: string) => new Date(`${iso}-03:00`);

const base: DadosRelogio = {
  status: 'em_conversa',
  created_at: '2026-10-01T12:00:00Z',
  etapa_desde: '2026-10-01T12:00:00Z',
  ultimo_contato_cliente_at: null,
  ultimo_contato_nosso_at: null,
  proximo_followup_at: null,
  data_prevista_instalacao: null,
};

describe('minutosUteisEntre', () => {
  it('conta minuto a minuto dentro do expediente', () => {
    expect(minutosUteisEntre(sp('2026-10-12T09:00'), sp('2026-10-12T09:30'))).toBe(30);
  });

  it('pausa entre sexta 18:00 e segunda 08:00', () => {
    expect(minutosUteisEntre(sp('2026-10-16T17:50'), sp('2026-10-19T08:10'))).toBe(20);
  });

  it('não conta nada no fim de semana', () => {
    expect(minutosUteisEntre(sp('2026-10-17T10:00'), sp('2026-10-17T15:00'))).toBe(0);
  });

  it('ignora o que vem antes das 08:00 e depois das 18:00', () => {
    expect(minutosUteisEntre(sp('2026-10-12T07:00'), sp('2026-10-12T08:05'))).toBe(5);
    expect(minutosUteisEntre(sp('2026-10-12T17:00'), sp('2026-10-13T09:00'))).toBe(120);
    expect(minutosUteisEntre(sp('2026-10-12T19:00'), sp('2026-10-12T23:00'))).toBe(0);
  });

  it('soma vários dias úteis (10h por dia)', () => {
    expect(minutosUteisEntre(sp('2026-10-12T08:00'), sp('2026-10-16T18:00'))).toBe(5 * 600);
  });

  it('devolve zero para intervalo vazio ou invertido', () => {
    expect(minutosUteisEntre(sp('2026-10-12T10:00'), sp('2026-10-12T10:00'))).toBe(0);
    expect(minutosUteisEntre(sp('2026-10-12T11:00'), sp('2026-10-12T10:00'))).toBe(0);
  });

  it('não depende do fuso da máquina: 11:00 UTC é 08:00 em São Paulo', () => {
    expect(
      minutosUteisEntre(new Date('2026-10-12T10:00:00Z'), new Date('2026-10-12T11:30:00Z')),
    ).toBe(30);
  });
});

describe('expediente', () => {
  it('abre às 08:00 e fecha às 18:00, de segunda a sexta', () => {
    expect(estaNoExpediente(sp('2026-10-12T07:59'))).toBe(false);
    expect(estaNoExpediente(sp('2026-10-12T08:00'))).toBe(true);
    expect(estaNoExpediente(sp('2026-10-12T17:59'))).toBe(true);
    expect(estaNoExpediente(sp('2026-10-12T18:00'))).toBe(false);
    expect(estaNoExpediente(sp('2026-10-17T10:00'))).toBe(false);
  });

  it('próxima abertura: mesmo dia de manhã, dia seguinte à noite, segunda no fim de semana', () => {
    expect(proximaAbertura(sp('2026-10-12T06:30'))).toEqual(sp('2026-10-12T08:00'));
    expect(proximaAbertura(sp('2026-10-12T19:00'))).toEqual(sp('2026-10-13T08:00'));
    expect(proximaAbertura(sp('2026-10-16T18:30'))).toEqual(sp('2026-10-19T08:00'));
    const agora = sp('2026-10-12T10:00');
    expect(proximaAbertura(agora)).toBe(agora);
  });

  it('descreve quando volta', () => {
    const sexta = sp('2026-10-16T18:30');
    expect(descreverQuando(sp('2026-10-19T08:00'), sexta)).toBe('segunda às 08:00');
    expect(descreverQuando(sp('2026-10-17T08:00'), sexta)).toBe('amanhã às 08:00');
  });
});

describe('formatarDuracao', () => {
  it('usa o formato da referência', () => {
    expect(formatarDuracao(0)).toBe('menos de 1 min');
    expect(formatarDuracao(12)).toBe('12 min');
    expect(formatarDuracao(65)).toBe('1h 05min');
    expect(formatarDuracao(685)).toBe('11h 25min');
    expect(formatarDuracao(36 * 60)).toBe('36h');
    expect(formatarDuracao(3 * 1440 + 4 * 60 + 10)).toBe('3d 4h');
    expect(formatarDuracao(-90)).toBe('1h 30min');
  });
});

describe('situacaoDoCard: precisa responder', () => {
  it('cliente falou por último: relógio de resposta, no prazo até 15 min', () => {
    const d = { ...base, ultimo_contato_cliente_at: sp('2026-10-12T09:00').toISOString() };
    const noPrazo = situacaoDoCard(d, sp('2026-10-12T09:10'));
    expect(noPrazo).toMatchObject({ tipo: 'responder', minutosUteis: 10, atrasado: false });
    const noLimite = situacaoDoCard(d, sp('2026-10-12T09:15'));
    expect(noLimite).toMatchObject({ minutosUteis: 15, atrasado: false });
    const atrasado = situacaoDoCard(d, sp('2026-10-12T19:00'));
    expect(atrasado).toMatchObject({ tipo: 'responder', minutosUteis: 540, atrasado: true });
  });

  it('pausa à noite: mensagem às 17:55, às 08:05 do dia seguinte conta 10 min', () => {
    const d = { ...base, ultimo_contato_cliente_at: sp('2026-10-12T17:55').toISOString() };
    expect(situacaoDoCard(d, sp('2026-10-13T08:05'))).toMatchObject({
      tipo: 'responder',
      minutosUteis: 10,
      atrasado: false,
    });
  });

  it('respondemos depois do cliente: bola com o cliente', () => {
    const d = {
      ...base,
      ultimo_contato_cliente_at: sp('2026-10-12T09:00').toISOString(),
      ultimo_contato_nosso_at: sp('2026-10-12T09:05').toISOString(),
    };
    expect(situacaoDoCard(d, sp('2026-10-12T11:00')).tipo).toBe('esperando');
  });

  it('novo contato sem nenhum registro conta desde a entrada na etapa', () => {
    const d = { ...base, status: 'novo_contato' as const, etapa_desde: sp('2026-10-12T10:00').toISOString() };
    expect(situacaoDoCard(d, sp('2026-10-12T10:20'))).toMatchObject({
      tipo: 'responder',
      minutosUteis: 20,
      atrasado: true,
    });
  });

  it('cliente que escreve durante a produção também entra na fila de resposta', () => {
    const d = {
      ...base,
      status: 'producao' as const,
      ultimo_contato_cliente_at: sp('2026-10-12T09:00').toISOString(),
    };
    expect(situacaoDoCard(d, sp('2026-10-12T09:05')).tipo).toBe('responder');
  });
});

describe('follow-up do orçamento', () => {
  const enviado = sp('2026-10-12T10:00');
  const orc: DadosRelogio = {
    ...base,
    status: 'orcamento',
    etapa_desde: enviado.toISOString(),
    ultimo_contato_nosso_at: enviado.toISOString(),
  };

  it('D+1 vence um dia depois do último contato nosso', () => {
    const s = situacaoDoCard(orc, sp('2026-10-12T22:00'), 0);
    expect(s).toMatchObject({ tipo: 'followup', marco: 'D+1', atrasado: false, minutos: 12 * 60 });
  });

  it('atrasado 11h 25min, como na referência', () => {
    const s = situacaoDoCard(orc, sp('2026-10-13T21:25'), 0);
    expect(s).toMatchObject({ tipo: 'followup', atrasado: true, minutos: -685 });
    if (s.tipo === 'followup') expect(formatarDuracao(s.minutos)).toBe('11h 25min');
  });

  it('cadência D+1, D+3, D+7 quando cada cobrança é feita no dia', () => {
    const d1 = calcularProximoFollowup(enviado, 0)!;
    const d3 = calcularProximoFollowup(d1, 1)!;
    const d7 = calcularProximoFollowup(d3, 2)!;
    const dia = 86_400_000;
    expect((d1.getTime() - enviado.getTime()) / dia).toBe(1);
    expect((d3.getTime() - enviado.getTime()) / dia).toBe(3);
    expect((d7.getTime() - enviado.getTime()) / dia).toBe(7);
    expect(calcularProximoFollowup(d7, 3)).toBeNull();
  });

  it('marco segue as cobranças feitas; depois do D+7 o card só espera o cliente', () => {
    const cobradoD1 = { ...orc, ultimo_contato_nosso_at: sp('2026-10-13T10:00').toISOString() };
    expect(situacaoDoCard(cobradoD1, sp('2026-10-13T12:00'), 1)).toMatchObject({
      tipo: 'followup',
      marco: 'D+3',
    });
    expect(situacaoDoCard(cobradoD1, sp('2026-10-13T12:00'), 3).tipo).toBe('esperando');
  });

  it('proximo_followup_at gravado tem prioridade: vence em 36h', () => {
    const d = { ...orc, proximo_followup_at: sp('2026-10-14T10:00').toISOString() };
    const s = situacaoDoCard(d, sp('2026-10-12T22:00'), 0);
    expect(s).toMatchObject({ tipo: 'followup', minutos: 36 * 60 });
    if (s.tipo === 'followup') expect(formatarDuracao(s.minutos)).toBe('36h');
  });
});

describe('esfriando', () => {
  const parado = sp('2026-10-09T10:00').toISOString();
  const d = {
    ...base,
    etapa_desde: parado,
    created_at: parado,
    ultimo_contato_nosso_at: parado,
  };

  it('3 dias ou mais sem movimento nas etapas de venda', () => {
    expect(diasEsfriando(d, sp('2026-10-12T10:00'))).toBe(3);
    expect(diasEsfriando(d, sp('2026-10-12T09:59'))).toBeNull();
  });

  it('qualquer contato recente tira do esfriamento', () => {
    const recente = { ...d, ultimo_contato_cliente_at: sp('2026-10-11T10:00').toISOString() };
    expect(diasEsfriando(recente, sp('2026-10-12T10:00'))).toBeNull();
  });

  it('não vale para Fechado nem para a execução', () => {
    expect(diasEsfriando({ ...d, status: 'fechado' }, sp('2026-10-20T10:00'))).toBeNull();
    expect(diasEsfriando({ ...d, status: 'producao' }, sp('2026-10-20T10:00'))).toBeNull();
  });
});

describe('execução', () => {
  it('conta dias na etapa e dias até a instalação', () => {
    const d = {
      ...base,
      status: 'producao' as const,
      etapa_desde: sp('2026-10-08T15:00').toISOString(),
      data_prevista_instalacao: '2026-10-20',
    };
    expect(situacaoDoCard(d, sp('2026-10-12T23:30'))).toMatchObject({
      tipo: 'etapa',
      dias: 4,
      diasParaInstalacao: 8,
    });
  });
});

describe('ordem de urgência', () => {
  it('resposta atrasada vem antes de follow-up atrasado, que vem antes de resposta no prazo', () => {
    const agora = sp('2026-10-12T12:00');
    const respAtrasada = pesoUrgencia({ tipo: 'responder', desde: agora, minutosUteis: 20, atrasado: true }, null, agora);
    const fupAtrasado = pesoUrgencia({ tipo: 'followup', marco: 'D+1', vence: agora, minutos: -600, atrasado: true }, null, agora);
    const respNoPrazo = pesoUrgencia({ tipo: 'responder', desde: agora, minutosUteis: 5, atrasado: false }, null, agora);
    expect(respAtrasada).toBeGreaterThan(fupAtrasado);
    expect(fupAtrasado).toBeGreaterThan(respNoPrazo);
  });
});

describe('métricas', () => {
  const ev = (project_id: string, tipo: string, quando: string) => ({
    project_id,
    tipo,
    created_at: sp(quando).toISOString(),
  });

  it('sem respostas registradas, devolve null (a tela mostra —)', () => {
    const m = calcularMetricas([], [], sp('2026-10-12T12:00'));
    expect(m.tempoMedioResposta).toBeNull();
    expect(m.percentualNoPrazo).toBeNull();
  });

  it('pareia mensagem do cliente com a resposta seguinte, em minutos úteis', () => {
    const eventos = [
      ev('a', 'contato_cliente', '2026-10-12T09:00'),
      ev('a', 'mensagem', '2026-10-12T09:03'),
      ev('a', 'resposta', '2026-10-12T09:10'),
      ev('b', 'mensagem', '2026-10-12T17:50'),
      ev('b', 'resposta', '2026-10-13T08:30'),
      ev('b', 'followup', '2026-10-13T09:00'), // sem mensagem antes: não é resposta
      ev('c', 'mensagem', '2026-10-12T11:00'), // ainda sem resposta
    ];
    expect(temposDeResposta(eventos).sort((x, y) => x - y)).toEqual([10, 40]);
    const m = calcularMetricas(eventos, [], sp('2026-10-13T12:00'));
    expect(m.tempoMedioResposta).toBe(25);
    expect(m.percentualNoPrazo).toBe(50);
  });

  it('alerta aponta o caso mais grave', () => {
    const agora = sp('2026-10-12T12:00');
    const card = (id: string, minutosUteis: number) => ({
      id,
      nome: id,
      esfriando: null,
      situacao: { tipo: 'responder' as const, desde: agora, minutosUteis, atrasado: minutosUteis > 15 },
    });
    const alerta = alertaPrincipal([card('Ana', 30), card('Carlos', 600), card('Bia', 5)]);
    expect(alerta).toMatchObject({ tipo: 'resposta', quantidade: 2, minutos: 600 });
    expect(alerta?.pior.nome).toBe('Carlos');
    expect(alertaPrincipal([card('Bia', 5)])).toBeNull();
  });
});
