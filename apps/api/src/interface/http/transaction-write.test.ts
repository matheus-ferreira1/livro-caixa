import { describe, expect, test } from 'bun:test';
import { computeSettlement, settlementEntry } from '@livro-caixa/domain';
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
    const entry = settlementEntry(settlement, { month: '2026-11', partnerName: 'Ana' });

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

  test('rejects an amount too large to add up exactly', async () => {
    const { agent } = await signedIn();
    await agent
      .post('/api/transactions')
      .send({ ...input, valueCents: 1e300 })
      .expect(400);
    const month = await agent.get('/api/transactions?month=2026-11').expect(200);
    expect(month.body.transactions).toHaveLength(0);
  });
});

describe('PUT /api/transactions/:id', () => {
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
