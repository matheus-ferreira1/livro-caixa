import { categoryInputSchema, categoryPatchSchema, settingsInputSchema } from '@livro-caixa/domain';
import { Router } from 'express';
import type { Container } from '../../container';

/** Configurações: categories and the partner split. Mounted behind the ledger's auth check. */
export function settingsRouter(container: Container): Router {
  const router = Router();

  router.get('/categories', (_req, res) => {
    res.json(container.listCategories.execute());
  });

  router.post('/categories', (req, res) => {
    const category = container.createCategory.execute(categoryInputSchema.parse(req.body));
    res.status(201).json({ category });
  });

  router.patch('/categories/:id', (req, res) => {
    const category = container.updateCategory.execute(req.params.id, categoryPatchSchema.parse(req.body));
    res.json({ category });
  });

  router.delete('/categories/:id', (req, res) => {
    container.deleteCategory.execute(req.params.id);
    res.status(204).end();
  });

  router.get('/settings', (_req, res) => {
    res.json({ settings: container.settings.get() });
  });

  router.put('/settings', (req, res) => {
    res.json({ settings: container.updateSettings.execute(settingsInputSchema.parse(req.body)) });
  });

  return router;
}
