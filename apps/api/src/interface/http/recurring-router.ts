import { isMonthKey, recurringGenerateSchema } from '@livro-caixa/domain';
import { Router } from 'express';
import { z } from 'zod';
import type { Container } from '../../container';

const monthQuery = z.object({ month: z.string().refine(isMonthKey) });

/** Gerar recorrentes. Mounted behind the ledger's auth check. */
export function recurringRouter(container: Container): Router {
  const router = Router();

  router.get('/recurring/candidates', (req, res) => {
    const { month } = monthQuery.parse(req.query);
    res.json({ candidates: container.listRecurringCandidates.execute(month) });
  });

  router.post('/recurring/generate', (req, res) => {
    const transactions = container.generateRecurring.execute(recurringGenerateSchema.parse(req.body));
    res.status(201).json({ transactions });
  });

  return router;
}
