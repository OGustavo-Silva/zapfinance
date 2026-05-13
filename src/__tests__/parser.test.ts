import { describe, it, expect } from 'vitest';
import { parseMessage } from '../command-parser/parser';

describe('Parser — despesa avulsa', () => {
  it('parse simples sem categoria', () => {
    const r = parseMessage('$$ uber 35,50');
    expect(r?.ok).toBe(true);
    if (!r?.ok) return;
    expect(r.command.type).toBe('EXPENSE_ONEOFF');
    if (r.command.type !== 'EXPENSE_ONEOFF') return;
    expect(r.command.name).toBe('uber');
    expect(r.command.amountCents).toBe(3550);
    expect(r.command.category).toBeNull();
  });

  it('parse com categoria simples', () => {
    const r = parseMessage('$$ mac 50,90 comida');
    expect(r?.ok).toBe(true);
    if (!r?.ok) return;
    if (r.command.type !== 'EXPENSE_ONEOFF') return;
    expect(r.command.name).toBe('mac');
    expect(r.command.amountCents).toBe(5090);
    expect(r.command.category).toBe('comida');
  });

  it('parse com nome e categoria com aspas', () => {
    const r = parseMessage('$$ "ifood mercado" 120,90 "casa e mercado"');
    expect(r?.ok).toBe(true);
    if (!r?.ok) return;
    if (r.command.type !== 'EXPENSE_ONEOFF') return;
    expect(r.command.name).toBe('ifood mercado');
    expect(r.command.amountCents).toBe(12090);
    expect(r.command.category).toBe('casa e mercado');
  });

  it('aceita ponto decimal', () => {
    const r = parseMessage('$$ netflix 55.90 streaming');
    expect(r?.ok).toBe(true);
    if (!r?.ok) return;
    if (r.command.type !== 'EXPENSE_ONEOFF') return;
    expect(r.command.amountCents).toBe(5590);
  });

  it('erro quando sem valor', () => {
    const r = parseMessage('$$ somente-nome');
    expect(r?.ok).toBe(false);
  });

  it('retorna null para mensagem sem $$', () => {
    const r = parseMessage('uber 35,50');
    expect(r).toBeNull();
  });
});

describe('Parser — despesa mensal', () => {
  it('parse com vencimento (dia) e categoria', () => {
    const r = parseMessage('$$ mensal netflix 55,90 10 streaming');
    expect(r?.ok).toBe(true);
    if (!r?.ok) return;
    if (r.command.type !== 'EXPENSE_MONTHLY') return;
    expect(r.command.name).toBe('netflix');
    expect(r.command.amountCents).toBe(5590);
    expect(r.command.dueDay).toBe(10);
    expect(r.command.category).toBe('streaming');
  });

  it('mantém compatibilidade com DD/MM usando apenas o dia', () => {
    const r = parseMessage('$$ mensal netflix 55,90 10/05 streaming');
    expect(r?.ok).toBe(true);
    if (!r?.ok) return;
    if (r.command.type !== 'EXPENSE_MONTHLY') return;
    expect(r.command.dueDay).toBe(10);
    expect(r.command.category).toBe('streaming');
  });

  it('parse sem vencimento usa dia 1', () => {
    const r = parseMessage('$$ mensal netflix 55,90');
    expect(r?.ok).toBe(true);
    if (!r?.ok) return;
    if (r.command.type !== 'EXPENSE_MONTHLY') return;
    expect(r.command.dueDay).toBe(1);
  });

  it('erro com dia inválido', () => {
    const r = parseMessage('$$ mensal netflix 55,90 40');
    expect(r?.ok).toBe(false);
  });
});

describe('Parser — comandos de manutenção', () => {
  it('marcar pago', () => {
    const r = parseMessage('$$ pago netflix');
    expect(r?.ok).toBe(true);
    if (!r?.ok) return;
    if (r.command.type !== 'MARK_PAID') return;
    expect(r.command.name).toBe('netflix');
  });

  it('alterar categoria por nome', () => {
    const r = parseMessage('$$ categoria netflix streaming');
    expect(r?.ok).toBe(true);
    if (!r?.ok) return;
    if (r.command.type !== 'SET_CATEGORY') return;
    expect(r.command.ref).toBe('netflix');
    expect(r.command.category).toBe('streaming');
  });

  it('alterar categoria por ID numérico', () => {
    const r = parseMessage('$$ categoria 42 streaming');
    expect(r?.ok).toBe(true);
    if (!r?.ok) return;
    if (r.command.type !== 'SET_CATEGORY') return;
    expect(r.command.ref).toBe(42);
  });
});

describe('Parser — queries', () => {
  it('resumo', () => {
    const r = parseMessage('$$ resumo');
    expect(r?.ok).toBe(true);
    if (!r?.ok) return;
    expect(r.command.type).toBe('QUERY_RESUMO');
  });

  it('listar', () => {
    const r = parseMessage('$$ listar');
    expect(r?.ok).toBe(true);
    if (!r?.ok) return;
    expect(r.command.type).toBe('QUERY_LISTAR');
  });

  it('vencimentos', () => {
    const r = parseMessage('$$ vencimentos');
    expect(r?.ok).toBe(true);
    if (!r?.ok) return;
    expect(r.command.type).toBe('QUERY_VENCIMENTOS');
  });

  it('periodo válido', () => {
    const r = parseMessage('$$ periodo 05/2026');
    expect(r?.ok).toBe(true);
    if (!r?.ok) return;
    if (r.command.type !== 'QUERY_PERIODO') return;
    expect(r.command.month).toBe(5);
    expect(r.command.year).toBe(2026);
  });

  it('periodo com mês inválido', () => {
    const r = parseMessage('$$ periodo 13/2026');
    expect(r?.ok).toBe(false);
  });
});

describe('Parser — aspas não fechadas', () => {
  it('retorna erro de parse', () => {
    const r = parseMessage('$$ "nome sem fechar 35,50');
    expect(r?.ok).toBe(false);
  });
});
