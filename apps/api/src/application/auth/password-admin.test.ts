import { MAX_PASSWORD_LENGTH } from '@livro-caixa/domain';
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
    await agent
      .post('/api/auth/login')
      .send({ email: TEST_USER.email, password: TEST_USER.password })
      .expect(200);

    await container.resetPassword.execute({ email: TEST_USER.email, password: 'nova-senha-456' });

    await agent.get('/api/auth/me').expect(401);
    await request(app)
      .post('/api/auth/login')
      .send({ email: TEST_USER.email, password: TEST_USER.password })
      .expect(401);
    await request(app)
      .post('/api/auth/login')
      .send({ email: TEST_USER.email, password: 'nova-senha-456' })
      .expect(200);
  });

  test('rejects a password longer than the sign-in form accepts, which could never be used', async () => {
    const { container } = await buildTestApp();
    const tooLong = 'x'.repeat(MAX_PASSWORD_LENGTH + 1);

    expect(container.resetPassword.execute({ email: TEST_USER.email, password: tooLong })).rejects.toThrow(
      String(MAX_PASSWORD_LENGTH),
    );
    expect(
      container.createUser.execute({ email: 'bia@casa.dev', name: 'Bia', password: tooLong }),
    ).rejects.toThrow(String(MAX_PASSWORD_LENGTH));
  });

  test('rejects passwords shorter than 12 characters', async () => {
    const { container } = await buildTestApp();
    expect(
      container.resetPassword.execute({ email: TEST_USER.email, password: 'onze-letras' }),
    ).rejects.toThrow('12');
  });
});
