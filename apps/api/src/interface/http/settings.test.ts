import { describe, expect, test } from 'bun:test';
import { buildTestApp, signIn } from '../../test/harness';

const newCategory = { name: '  Pets ', type: 'despesa', color: '#E87BA4' };

const expense = {
  date: '2026-11-06',
  description: 'Feira',
  note: '',
  type: 'despesa',
  categoryId: 'c-mercado',
  valueCents: 5_000,
  split: false,
  confirmed: true,
  recurring: false,
};

async function signedIn() {
  const ctx = await buildTestApp();
  await signIn(ctx.agent);
  return ctx;
}

describe('GET /api/categories', () => {
  test('returns how many entries use each category', async () => {
    const { agent } = await signedIn();
    await agent.post('/api/transactions').send(expense).expect(201);
    await agent.post('/api/transactions').send(expense).expect(201);
    const { body } = await agent.get('/api/categories').expect(200);
    expect(body.usage).toEqual({ 'c-mercado': 2 });
  });
});

describe('POST /api/categories', () => {
  test('creates a category with a trimmed name', async () => {
    const { agent } = await signedIn();
    const { body } = await agent.post('/api/categories').send(newCategory).expect(201);
    expect(body.category).toEqual({
      id: expect.any(String),
      name: 'Pets',
      type: 'despesa',
      color: '#E87BA4',
    });
    const list = await agent.get('/api/categories').expect(200);
    expect(list.body.categories).toContainEqual(body.category);
  });

  test('rejects an empty name', async () => {
    const { agent } = await signedIn();
    const res = await agent
      .post('/api/categories')
      .send({ ...newCategory, name: '  ' })
      .expect(400);
    expect(res.body.error.message).toBe('Dê um nome para a categoria.');
  });

  test('rejects a case-insensitive duplicate within the type', async () => {
    const { agent } = await signedIn();
    const res = await agent
      .post('/api/categories')
      .send({ ...newCategory, name: 'mercado' })
      .expect(409);
    expect(res.body.error).toEqual({
      code: 'conflict',
      message: 'Já existe uma categoria com esse nome nesse tipo.',
    });
  });

  test('allows the same name in the other type', async () => {
    const { agent } = await signedIn();
    await agent
      .post('/api/categories')
      .send({ ...newCategory, name: 'Mercado', type: 'receita' })
      .expect(201);
  });

  test('rejects a color outside the palette', async () => {
    const { agent } = await signedIn();
    await agent
      .post('/api/categories')
      .send({ ...newCategory, color: '#000000' })
      .expect(400);
  });
});

describe('PATCH /api/categories/:id', () => {
  test('renames and recolors a category', async () => {
    const { agent } = await signedIn();
    const { body } = await agent
      .patch('/api/categories/c-mercado')
      .send({ name: ' Supermercado ', color: '#EDA100' })
      .expect(200);
    expect(body.category).toEqual({
      id: 'c-mercado',
      name: 'Supermercado',
      type: 'despesa',
      color: '#EDA100',
    });
  });

  test('keeps the same name in a different case', async () => {
    const { agent } = await signedIn();
    await agent.patch('/api/categories/c-mercado').send({ name: 'MERCADO', color: '#1BAF7A' }).expect(200);
  });

  test('rejects a name taken by another category of the type', async () => {
    const { agent } = await signedIn();
    const res = await agent
      .patch('/api/categories/c-mercado')
      .send({ name: 'saúde', color: '#1BAF7A' })
      .expect(409);
    expect(res.body.error.message).toBe('Já existe uma categoria com esse nome nesse tipo.');
  });

  test('does not change the type', async () => {
    const { agent } = await signedIn();
    await agent
      .patch('/api/categories/c-mercado')
      .send({ name: 'Mercado', color: '#1BAF7A', type: 'receita' })
      .expect(400);
  });

  test('answers 404 for an unknown category', async () => {
    const { agent } = await signedIn();
    await agent.patch('/api/categories/c-unknown').send({ name: 'X', color: '#1BAF7A' }).expect(404);
  });
});

describe('DELETE /api/categories/:id', () => {
  test('deletes an unused category', async () => {
    const { agent } = await signedIn();
    await agent.delete('/api/categories/c-lazer').expect(204);
    const { body } = await agent.get('/api/categories').expect(200);
    expect(body.categories.map((c: { id: string }) => c.id)).not.toContain('c-lazer');
  });

  test('refuses to delete a category in use', async () => {
    const { agent } = await signedIn();
    await agent.post('/api/transactions').send(expense).expect(201);
    const res = await agent.delete('/api/categories/c-mercado').expect(409);
    expect(res.body.error.message).toBe('Mercado está em uso e não pode ser excluída');
  });

  test('answers 404 for an unknown category', async () => {
    const { agent } = await signedIn();
    await agent.delete('/api/categories/c-unknown').expect(404);
  });
});

describe('PUT /api/settings', () => {
  test('saves the partner name and share', async () => {
    const { agent } = await signedIn();
    const { body } = await agent
      .put('/api/settings')
      .send({ partnerName: ' Bia ', partnerShare: 40 })
      .expect(200);
    expect(body.settings).toEqual({ partnerName: 'Bia', partnerShare: 40 });
    const saved = await agent.get('/api/settings').expect(200);
    expect(saved.body.settings).toEqual({ partnerName: 'Bia', partnerShare: 40 });
  });

  test.each([[{ partnerShare: 42 }], [{ partnerShare: 105 }], [{ partnerName: 7 }]])(
    'rejects %p',
    async (patch) => {
      const { agent } = await signedIn();
      await agent
        .put('/api/settings')
        .send({ partnerName: 'Bia', partnerShare: 50, ...patch })
        .expect(400);
    },
  );
});

describe('authorization', () => {
  test.each([
    ['post', '/api/categories'],
    ['patch', '/api/categories/c-mercado'],
    ['delete', '/api/categories/c-lazer'],
    ['put', '/api/settings'],
  ] as const)('%s %s requires a session', async (method, path) => {
    const { agent } = await buildTestApp();
    await agent[method](path).send({}).expect(401);
  });
});
