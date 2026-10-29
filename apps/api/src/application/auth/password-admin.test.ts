import { describe, expect, test } from 'bun:test';
import request from 'supertest';
import { buildTestApp, TEST_USER } from '../../test/harness';

describe('admin user commands', () => {
  test('refuses to create a second user with the same e-mail', async () => {
    const { container } = await buildTestApp();
    expect(container.createUser.execute(TEST_USER)).rejects.toThrow('already exists');
  });

  test('reset-password replaces the password and revokes existing sessions', async () => {
    const { app, agent, container } = await buildTestApp();
    await agent.post('/api/auth/login').send({ email: TEST_USER.email, password: TEST_USER.password }).expect(200);

    await container.resetPassword.execute({ email: TEST_USER.email, password: 'nova-senha-456' });

    await agent.get('/api/auth/me').expect(401);
    await request(app).post('/api/auth/login').send({ email: TEST_USER.email, password: TEST_USER.password }).expect(401);
    await request(app).post('/api/auth/login').send({ email: TEST_USER.email, password: 'nova-senha-456' }).expect(200);
  });

  test('rejects passwords shorter than 8 characters', async () => {
    const { container } = await buildTestApp();
    expect(container.resetPassword.execute({ email: TEST_USER.email, password: 'curta' })).rejects.toThrow('8');
  });
});
