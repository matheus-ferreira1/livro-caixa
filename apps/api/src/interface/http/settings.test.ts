import { describe, expect, test } from 'bun:test';
import request from 'supertest';
import { buildTestApp, signIn } from '../../test/harness';

const DEFAULT_SETTINGS = { partnerName: 'Companheira', partnerShare: 50, language: 'pt-BR', currency: 'BRL' };

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
    expect(body.settings).toEqual({ ...DEFAULT_SETTINGS, partnerName: 'Bia', partnerShare: 40 });
    const saved = await agent.get('/api/settings').expect(200);
    expect(saved.body.settings).toEqual({ ...DEFAULT_SETTINGS, partnerName: 'Bia', partnerShare: 40 });
  });

  test('saves the language and the currency without touching the partner fields', async () => {
    const { agent } = await signedIn();
    await agent.put('/api/settings').send({ partnerName: 'Bia', partnerShare: 40 }).expect(200);
    const { body } = await agent.put('/api/settings').send({ language: 'en', currency: 'USD' }).expect(200);
    expect(body.settings).toEqual({ partnerName: 'Bia', partnerShare: 40, language: 'en', currency: 'USD' });
    const saved = await agent.get('/api/settings').expect(200);
    expect(saved.body.settings).toEqual(body.settings);
  });

  test('keeps the language and the currency when only the partner fields are saved', async () => {
    const { agent } = await signedIn();
    await agent.put('/api/settings').send({ language: 'en', currency: 'EUR' }).expect(200);
    const { body } = await agent
      .put('/api/settings')
      .send({ partnerName: 'Bia', partnerShare: 30 })
      .expect(200);
    expect(body.settings).toEqual({ partnerName: 'Bia', partnerShare: 30, language: 'en', currency: 'EUR' });
  });

  test.each([
    [{ partnerShare: 42 }],
    [{ partnerShare: 105 }],
    [{ partnerName: 7 }],
    [{ language: 'fr' }],
    [{ currency: 'JPY' }],
  ])('rejects %p', async (patch) => {
    const { agent } = await signedIn();
    await agent
      .put('/api/settings')
      .send({ partnerName: 'Bia', partnerShare: 50, ...patch })
      .expect(400);
  });
});

describe('GET /api/preferences', () => {
  test('answers without a session with the language and the currency only', async () => {
    const { agent } = await buildTestApp();
    const { body } = await agent.get('/api/preferences').expect(200);
    expect(body).toEqual({ language: 'pt-BR', currency: 'BRL' });
  });

  test('follows what the settings say', async () => {
    const { agent, app } = await signedIn();
    await agent.put('/api/settings').send({ language: 'en', currency: 'GBP' }).expect(200);
    const { body } = await request(app).get('/api/preferences').expect(200);
    expect(body).toEqual({ language: 'en', currency: 'GBP' });
  });
});

describe('error messages follow the instance language', () => {
  test('are in pt-BR by default and in English once the language changes', async () => {
    const { agent, app } = await signedIn();
    const invalid = { ...expense, description: ' ' };
    const before = await agent.post('/api/transactions').send(invalid).expect(400);
    expect(before.body.error.message).toBe('Informe a descrição.');

    await agent.put('/api/settings').send({ language: 'en' }).expect(200);

    const after = await agent.post('/api/transactions').send(invalid).expect(400);
    expect(after.body.error.message).toBe('Enter the description.');
    const notFound = await agent.get('/api/nope').expect(404);
    expect(notFound.body.error.message).toBe('Route not found.');
    const malformed = await agent.post('/api/categories').send({}).expect(400);
    expect(malformed.body.error.message).toBe('Invalid data.');
    const signedOut = await request(app).get('/api/categories').expect(401);
    expect(signedOut.body.error.message).toBe('Session expired. Sign in again.');
  });

  test('reach the login attempt of a signed-out client', async () => {
    const { agent, app } = await signedIn();
    await agent.put('/api/settings').send({ language: 'en' }).expect(200);
    const wrong = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ana@casa.dev', password: 'wrong-password' })
      .expect(401);
    expect(wrong.body.error.message).toBe('Wrong email or password.');
  });
});

describe('when the settings cannot be read', () => {
  test.each([
    ['an unknown route', 404, 'Rota não encontrada.'],
    ['a malformed body', 400, 'Dados inválidos.'],
    ['a missing session', 401, 'Sessão expirada. Entre novamente.'],
  ])('still answers %s with the error shape, in pt-BR', async (name, status, message) => {
    const { agent, app, container } = await signedIn();
    container.settings.get = () => {
      throw new Error('database is locked');
    };
    const response =
      name === 'an unknown route'
        ? await agent.get('/api/nope')
        : name === 'a malformed body'
          ? await agent.post('/api/categories').send({})
          : await request(app).get('/api/categories');
    expect(response.status).toBe(status);
    expect(response.body.error).toEqual(expect.objectContaining({ message }));
  });
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
