import { isMonthKey, SUMMARY_MODES } from '@livro-caixa/domain';
import { Router } from 'express';
import { z } from 'zod';
import type { Container } from '../../container';

const dashboardQuery = z.object({
  month: z.string().refine(isMonthKey),
  mode: z.enum(SUMMARY_MODES).default('real'),
});

/** Visão geral. Mounted behind the ledger's auth check. */
export function dashboardRouter(container: Container): Router {
  const router = Router();

  router.get('/dashboard', (req, res) => {
    const { month, mode } = dashboardQuery.parse(req.query);
    res.json(container.getDashboard.execute(month, mode));
  });

  return router;
}
