import { assetInputSchema, closingRequestSchema, isIsoDate } from '@livro-caixa/domain';
import { Router } from 'express';
import { z } from 'zod';
import type { Container } from '../../container';

const wealthQuery = z.object({ today: z.string().refine(isIsoDate) });

/** Patrimônio. Mounted behind the ledger's auth check. */
export function wealthRouter(container: Container): Router {
  const router = Router();

  router.get('/wealth', async (req, res) => {
    const { today } = wealthQuery.parse(req.query);
    await container.refreshQuotes.execute();
    res.json(container.getWealth.execute(today));
  });

  router.post('/wealth/closings', (req, res) => {
    const snapshot = container.registerClosing.execute(closingRequestSchema.parse(req.body));
    res.status(201).json({ snapshot });
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
