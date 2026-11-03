import { assetInputSchema, isIsoDate } from '@livro-caixa/domain';
import { Router } from 'express';
import { z } from 'zod';
import type { Container } from '../../container';

const wealthQuery = z.object({ today: z.string().refine(isIsoDate) });

/** Patrimônio. Mounted behind the ledger's auth check. */
export function wealthRouter(container: Container): Router {
  const router = Router();

  router.get('/wealth', (req, res) => {
    const { today } = wealthQuery.parse(req.query);
    res.json(container.getWealth.execute(today));
  });

  router.post('/assets', (req, res) => {
    const asset = container.createAsset.execute(assetInputSchema.parse(req.body));
    res.status(201).json({ asset });
  });

  router.put('/assets/:id', (req, res) => {
    const asset = container.updateAsset.execute(req.params.id, assetInputSchema.parse(req.body));
    res.json({ asset });
  });

  router.delete('/assets/:id', (req, res) => {
    container.deleteAsset.execute(req.params.id);
    res.status(204).end();
  });

  return router;
}
