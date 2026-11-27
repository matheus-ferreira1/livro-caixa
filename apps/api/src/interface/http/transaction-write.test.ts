import { describe, expect, test } from 'bun:test';
import { computeSettlement, localization, MAX_ENTRY_CENTS, settlementEntry } from '@livro-caixa/domain';
import { buildTestApp, signIn } from '../../test/harness';

const input = {
  date: '2026-11-06',
  description: '  Conserto do chuveiro ',
  note: 'Eletricista, troca da resistência',
  type: 'despesa',
  categoryId: 'c-moradia',
  valueCents: 18_000,
  split: true,
  confirmed: false,
  recurring: false,
};

async function signedIn() {
  const ctx = await buildTestApp();
  await signIn(ctx.agent);
  return ctx;
}

describe('POST /api/transactions', () => {
  test('creates an entry with normalized fields', async () => {
    const { agent } = await signedIn();
    const { body } = await agent.post('/api/transactions').send(input).expect(201);
    expect(body.transaction).toMatchObject({
      ...input,
      description: 'Conserto do chuveiro',
      id: expect.any(String),
      seriesId: null,
    });
    const month = await agent.get('/api/transactions?month=2026-11').expect(200);
    expect(month.body.transactions).toHaveLength(1);
  });

  test('applies the acerto rules', async () => {
    const { agent } = await signedIn();
    const { body } = await agent
      .post('/api/transactions')
      .send({ ...input, type: 'acerto', categoryId: 'c-moradia', recurring: true })
      .expect(201);
    expect(body.transaction).toMatchObject({ categoryId: null, split: false, recurring: false });
  });

  test('registers the pending acerto built by the Acerto dialog', async () => {
    const { agent } = await signedIn();
    await agent.post('/api/transactions').send(input).expect(201);
    const month = await agent.get('/api/transactions?month=2026-11').expect(200);
    const settlement = computeSettlement(month.body.transactions, 50, { includePending: true });
    const entry = settlementEntry(
      settlement,
      { month: '2026-11', partnerName: 'Ana' },
      localization('pt-BR', 'BRL'),
    );

    const { body } = await agent.post('/api/transactions').send(entry).expect(201);

    expect(body.transaction).toMatchObject({ ...entry, id: expect.any(String), valueCents: 9_000 });
  });

  test('starts a series for recurring entries', async () => {
    const { agent } = await signedIn();
    const { body } = await agent
      .post('/api/transactions')
      .send({ ...input, recurring: true })
      .expect(201);
    expect(body.transaction.seriesId).toBe(`s-${body.transaction.id}`);
  });

  test('stores and returns a weekly recurrence', async () => {
    const { agent } = await signedIn();
    const { body } = await agent
      .post('/api/transactions')
      .send({ ...input, recurring: true, recurrence: { frequency: 'weekly', weekdays: [1, 5] } })
      .expect(201);
    expect(body.transaction.recurrence).toEqual({ frequency: 'weekly', weekdays: [1, 5] });
    const list = await agent.get('/api/transactions?month=2026-11').expect(200);
    expect(list.body.transactions[0].recurrence).toEqual({ frequency: 'weekly', weekdays: [1, 5] });
  });

  test('defaults to a monthly recurrence', async () => {
    const { agent } = await signedIn();
    const { body } = await agent.post('/api/transactions').send(input).expect(201);
    expect(body.transaction.recurrence).toEqual({ frequency: 'monthly' });
  });

  test('asks for at least one weekday', async () => {
    const { agent } = await signedIn();
    const res = await agent
      .post('/api/transactions')
      .send({ ...input, recurring: true, recurrence: { frequency: 'weekly', weekdays: [] } })
      .expect(400);
    expect(res.body.error.message).toBe('Escolha ao menos um dia da semana.');
  });

  test.each([
    ['out-of-range weekday', { recurring: true, recurrence: { frequency: 'weekly', weekdays: [8] } }],
    ['repeated weekday', { recurring: true, recurrence: { frequency: 'weekly', weekdays: [1, 1] } }],
    ['weekdays on a monthly one', { recurring: true, recurrence: { frequency: 'monthly', weekdays: [1] } }],
    [
      'weekly on a non-recurring entry',
      { recurring: false, recurrence: { frequency: 'weekly', weekdays: [1] } },
    ],
    [
      'weekly on an acerto',
      { type: 'acerto', recurring: true, recurrence: { frequency: 'weekly', weekdays: [1] } },
    ],
  ])('rejects %s', async (_name, patch) => {
    const { agent } = await signedIn();
    const res = await agent
      .post('/api/transactions')
      .send({ ...input, ...patch })
      .expect(400);
    expect(res.body.error.message).toBe('Dados inválidos.');
  });

  test.each([
    [{ date: '06/11/2026' }, 'Informe a data.'],
    [{ description: '  ' }, 'Informe a descrição.'],
    [{ valueCents: 0 }, 'Informe um valor maior que zero.'],
    [{ categoryId: null }, 'Escolha uma categoria.'],
    [{ categoryId: 'c-salario' }, 'Escolha uma categoria.'],
    [{ categoryId: 'c-unknown' }, 'Escolha uma categoria.'],
  ])('rejects %p with "%s"', async (patch, message) => {
    const { agent } = await signedIn();
    const res = await agent
      .post('/api/transactions')
      .send({ ...input, ...patch })
      .expect(400);
    expect(res.body.error.message).toBe(message);
  });
});

describe('POST /api/transactions with values no ledger can hold', () => {
  test('rejects a day that does not exist', async () => {
    const { agent } = await signedIn();
    const { body } = await agent
      .post('/api/transactions')
      .send({ ...input, date: '2026-02-31' })
      .expect(400);
    expect(body.error.message).toBe('Informe a data.');
  });

  test.each([MAX_ENTRY_CENTS + 1, 1e300])('rejects the amount %p and stores nothing', async (valueCents) => {
    const { agent } = await signedIn();
    await agent
      .post('/api/transactions')
      .send({ ...input, valueCents })
      .expect(400);
    const month = await agent.get('/api/transactions?month=2026-11').expect(200);
    expect(month.body.transactions).toHaveLength(0);
  });
});

describe('PUT /api/transactions/:id', () => {
  test('replaces the recurrence', async () => {
    const { agent } = await signedIn();
    const created = await agent
      .post('/api/transactions')
      .send({ ...input, recurring: true })
      .expect(201);
    const { body } = await agent
      .put(`/api/transactions/${created.body.transaction.id}`)
      .send({ ...input, recurring: true, recurrence: { frequency: 'weekly', weekdays: [3] } })
      .expect(200);
    expect(body.transaction.recurrence).toEqual({ frequency: 'weekly', weekdays: [3] });
  });

  test('replaces an entry and keeps its series', async () => {
    const { agent } = await signedIn();
    const created = (
      await agent
        .post('/api/transactions')
        .send({ ...input, recurring: true })
        .expect(201)
    ).body.transaction;
    const { body } = await agent
      .put(`/api/transactions/${created.id}`)
      .send({ ...input, description: 'Chuveiro novo', valueCents: 25_000, recurring: false, confirmed: true })
      .expect(200);
    expect(body.transaction).toMatchObject({
      id: created.id,
      description: 'Chuveiro novo',
      valueCents: 25_000,
      recurring: false,
      seriesId: created.seriesId,
      confirmed: true,
    });
  });

  test('404s for unknown entries', async () => {
    const { agent } = await signedIn();
    await agent.put('/api/transactions/nope').send(input).expect(404);
  });
});
