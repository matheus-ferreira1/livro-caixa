import { describe, expect, test } from 'bun:test';
import request from 'supertest';
import { MAX_ENTRY_CENTS, MONTHLY_RECURRENCE, weeklyRecurrence, type Transaction } from '@livro-caixa/domain';
import { buildTestApp, signIn } from '../../test/harness';

let n = 0;
function anOccurrence(overrides: Partial<Transaction>): Transaction {
  n += 1;
  return {
    id: `r${n}`,
    date: '2026-10-10',
    description: 'Internet fibra',
    note: 'Fatura de outubro',
    type: 'despesa',
    categoryId: 'c-mercado',
    valueCents: 11_990,
    split: true,
    confirmed: true,
    recurring: true,
    seriesId: 's-internet',
    recurrence: MONTHLY_RECURRENCE,
    ...overrides,
  };
}

async function appWith(transactions: Transaction[]) {
  const ctx = await buildTestApp();
  for (const t of transactions) ctx.container.transactions.insert(t);
  await signIn(ctx.agent);
  return ctx;
}

const SERIES = [
  anOccurrence({ date: '2026-09-30' }),
  anOccurrence({ date: '2026-10-31', valueCents: 12_490 }),
];

const novemberItem = { seriesId: 's-internet', date: '2026-11-30', valueCents: 12_490 };

describe('GET /api/recurring/candidates', () => {
  test('suggests the latest occurrence of each series, capped to the month', async () => {
    const { agent } = await appWith(SERIES);
    const { body } = await agent.get('/api/recurring/candidates?month=2026-11').expect(200);
    expect(body.candidates).toEqual([
      expect.objectContaining({ seriesId: 's-internet', date: '2026-11-30', valueCents: 12_490 }),
    ]);
    expect(body.candidates[0].source).toMatchObject({ id: 'r2', description: 'Internet fibra' });
  });

  test('rejects an invalid month', async () => {
    const { agent } = await appWith([]);
    await agent.get('/api/recurring/candidates?month=2026-13').expect(400);
  });

  test('requires a session', async () => {
    const { app } = await buildTestApp();
    await request(app).get('/api/recurring/candidates?month=2026-11').expect(401);
  });
});

const WEEKLY = [
  anOccurrence({ id: 'w1', date: '2026-10-30', seriesId: 's-feira', recurrence: weeklyRecurrence([1, 5]) }),
];
const weeklyItem = (date: string) => ({ seriesId: 's-feira', date, valueCents: 11_990 });

describe('weekly series', () => {
  test('suggests one candidate per date carrying the recurrence', async () => {
    const { agent } = await appWith(WEEKLY);
    const { body } = await agent.get('/api/recurring/candidates?month=2026-11').expect(200);
    expect(body.candidates.map((c: { date: string }) => c.date).slice(0, 3)).toEqual([
      '2026-11-02',
      '2026-11-06',
      '2026-11-09',
    ]);
    expect(body.candidates[0].source.recurrence).toEqual({ frequency: 'weekly', weekdays: [1, 5] });
  });

  test('generates several dates, each entry keeping the recurrence', async () => {
    const { agent } = await appWith(WEEKLY);
    const { body } = await agent
      .post('/api/recurring/generate')
      .send({ month: '2026-11', items: [weeklyItem('2026-11-02'), weeklyItem('2026-11-06')] })
      .expect(201);
    expect(body.transactions.map((t: { date: string }) => t.date)).toEqual(['2026-11-02', '2026-11-06']);
    for (const t of body.transactions)
      expect(t.recurrence).toEqual({ frequency: 'weekly', weekdays: [1, 5] });
  });

  test.each([
    ['a repeated date', ['2026-11-02', '2026-11-02']],
    ['a date that is not a candidate', ['2026-11-03']],
  ])('refuses %s', async (_name, dates) => {
    const { agent, container } = await appWith(WEEKLY);
    const res = await agent
      .post('/api/recurring/generate')
      .send({ month: '2026-11', items: dates.map(weeklyItem) })
      .expect(409);
    expect(res.body.error.code).toBe('conflict');
    expect(container.transactions.listByMonth('2026-11')).toEqual([]);
  });

  test('refuses the same dates generated twice', async () => {
    const { agent } = await appWith(WEEKLY);
    const payload = { month: '2026-11', items: [weeklyItem('2026-11-02'), weeklyItem('2026-11-06')] };
    await agent.post('/api/recurring/generate').send(payload).expect(201);
    await agent.post('/api/recurring/generate').send(payload).expect(409);
  });
});

describe('POST /api/recurring/generate', () => {
  test('keeps a monthly item whose date was edited within the month', async () => {
    const { agent } = await appWith(SERIES);
    await agent
      .post('/api/recurring/generate')
      .send({ month: '2026-11', items: [{ ...novemberItem, date: '2026-11-15' }] })
      .expect(201);
  });

  test('refuses two items for one monthly series', async () => {
    const { agent } = await appWith(SERIES);
    await agent
      .post('/api/recurring/generate')
      .send({ month: '2026-11', items: [novemberItem, { ...novemberItem, date: '2026-11-15' }] })
      .expect(409);
  });

  test('creates pending entries in the same series, without the note', async () => {
    const { agent } = await appWith(SERIES);
    const { body } = await agent
      .post('/api/recurring/generate')
      .send({ month: '2026-11', items: [{ ...novemberItem, date: '2026-11-28', valueCents: 13_000 }] })
      .expect(201);
    expect(body.transactions).toEqual([
      expect.objectContaining({
        id: expect.any(String),
        date: '2026-11-28',
        valueCents: 13_000,
        description: 'Internet fibra',
        note: '',
        split: true,
        confirmed: false,
        recurring: true,
        seriesId: 's-internet',
      }),
    ]);
    const month = await agent.get('/api/transactions?month=2026-11').expect(200);
    expect(month.body.transactions).toHaveLength(1);
    const after = await agent.get('/api/recurring/candidates?month=2026-11').expect(200);
    expect(after.body.candidates).toEqual([]);
  });

  test('asks for at least one entry', async () => {
    const { agent } = await appWith(SERIES);
    const res = await agent.post('/api/recurring/generate').send({ month: '2026-11', items: [] }).expect(400);
    expect(res.body.error.message).toBe('Selecione ao menos um lançamento.');
  });

  test.each([{ date: '2026-12-01' }, { valueCents: 0 }])('rejects %p and inserts nothing', async (patch) => {
    const { agent, container } = await appWith([
      ...SERIES,
      anOccurrence({ id: 'luz', date: '2026-10-12', description: 'Luz', seriesId: 's-luz' }),
    ]);
    const res = await agent
      .post('/api/recurring/generate')
      .send({
        month: '2026-11',
        items: [
          { seriesId: 's-luz', date: '2026-11-12', valueCents: 20_000 },
          { ...novemberItem, ...patch },
        ],
      })
      .expect(400);
    expect(res.body.error.message).toBe(
      'Revise “Internet fibra”: a data deve ser em Novembro 2026 e o valor maior que zero.',
    );
    expect(container.transactions.listByMonth('2026-11')).toEqual([]);
  });

  test('refuses a series that is no longer a candidate, so nothing is generated twice', async () => {
    const { agent } = await appWith(SERIES);
    const payload = { month: '2026-11', items: [novemberItem] };
    await agent.post('/api/recurring/generate').send(payload).expect(201);
    const res = await agent.post('/api/recurring/generate').send(payload).expect(409);
    expect(res.body.error.code).toBe('conflict');
  });

  test('rejects an amount above the largest an entry may have and inserts nothing', async () => {
    const { agent, container } = await appWith(SERIES);
    await agent
      .post('/api/recurring/generate')
      .send({ month: '2026-11', items: [{ ...novemberItem, valueCents: MAX_ENTRY_CENTS + 1 }] })
      .expect(400);
    expect(container.transactions.listByMonth('2026-11')).toEqual([]);
  });

  test('rejects a malformed body', async () => {
    const { agent } = await appWith(SERIES);
    await agent.post('/api/recurring/generate').send({ month: '2026-11' }).expect(400);
  });
});
