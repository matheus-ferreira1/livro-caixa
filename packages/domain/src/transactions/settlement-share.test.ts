import { describe, expect, test } from 'bun:test';
import { localization } from '../i18n/localization';
import { aTransaction } from '../test/builders';
import { computeSettlement } from './month-summary';
import { buildShareText, settlementEntry } from './settlement-share';

// Intl puts a no-break space after the currency symbol.
const money = (text: string) => text.replaceAll('R$ ', 'R$\u00a0');

const l10n = localization('pt-BR', 'BRL');
const context = { month: '2026-10', partnerName: 'Ana' };

const splitMonth = [
  aTransaction({ date: '2026-10-05', description: 'Aluguel', valueCents: 180_000, split: true }),
  aTransaction({ date: '2026-10-12', description: 'Luz', valueCents: 18_640, split: true, confirmed: false }),
];

const settle = (transactions = splitMonth) => computeSettlement(transactions, 50, { includePending: true });

describe('buildShareText', () => {
  test('lists each split bill with the partner part, then the total and the balance', () => {
    expect(buildShareText(settle(), context, l10n)).toBe(
      money(
        [
          '*Acerto de contas — Outubro 2026*',
          '',
          'Contas divididas (50% sua parte):',
          '• 05/10 Aluguel: R$ 1.800,00 → R$ 900,00',
          '• 12/10 Luz (previsto): R$ 186,40 → R$ 93,20',
          '',
          'Total das contas: R$ 1.986,40',
          'Parte de Ana (50%): R$ 993,20',
          '',
          '*Valor a acertar: R$ 993,20*',
        ].join('\n'),
      ),
    );
  });

  test('subtracts what was already received and scheduled', () => {
    const text = buildShareText(
      settle([
        ...splitMonth,
        aTransaction({ type: 'acerto', categoryId: null, valueCents: 50_000 }),
        aTransaction({ type: 'acerto', categoryId: null, valueCents: 10_000, confirmed: false }),
      ]),
      context,
      l10n,
    );
    expect(text).toContain(money('Já recebido: − R$ 500,00\nJá combinado: − R$ 100,00'));
    expect(text).toContain(money('*Valor a acertar: R$ 393,20*'));
  });

  test('says when the month has no split bills', () => {
    expect(buildShareText(settle([]), context, l10n)).toContain('• Nenhuma conta dividida neste mês');
  });
});

describe('settlementEntry', () => {
  test('is a pending acerto for the balance on the last day of the month', () => {
    expect(settlementEntry(settle(), context, l10n)).toEqual({
      date: '2026-10-31',
      description: 'Acerto das contas divididas',
      note: 'Ana · 2 contas de Outubro 2026',
      type: 'acerto',
      categoryId: null,
      valueCents: 99_320,
      split: false,
      confirmed: false,
      recurring: false,
    });
  });
});
