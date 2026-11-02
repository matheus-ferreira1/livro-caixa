import { SUMMARY_MODES } from '@livro-caixa/domain';
import { Router } from 'express';
import { z } from 'zod';
import type { Container } from '../../container';

const summaryQuery = z.object({
  // Four digits, because month keys only accept those.
  year: z
    .string()
    .regex(/^\d{4}$/)
    .transform(Number),
  mode: z.enum(SUMMARY_MODES).default('real'),
});

/** Resumo mensal. Mounted behind the ledger's auth check. */
export function summaryRouter(container: Container): Router {
  const router = Router();

  router.get('/summary', (req, res) => {
    const { year, mode } = summaryQuery.parse(req.query);
    res.json(container.getYearSummary.execute(year, mode));
  });

  return router;
}
