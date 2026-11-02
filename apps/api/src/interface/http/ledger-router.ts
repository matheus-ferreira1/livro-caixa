import { isIsoDate, isMonthKey, PAGE_SIZES, transactionInputSchema } from '@livro-caixa/domain';
import { Router } from 'express';
import { z } from 'zod';
import type { Container } from '../../container';
import { dashboardRouter } from './dashboard-router';
import { recurringRouter } from './recurring-router';
import { requireAuth } from './require-auth';
import { settingsRouter } from './settings-router';
import { summaryRouter } from './summary-router';

const monthQuery = z.object({ month: z.string().refine(isMonthKey) });

const isoDate = z.string().refine(isIsoDate);

const searchQuery = z.object({
  type: z.enum(['all', 'receita', 'despesa', 'acerto']).default('all'),
  status: z.enum(['all', 'confirmed', 'pending']).default('all'),
  category: z.string().default('all'),
  q: z.string().max(200).default(''),
  from: isoDate.optional(),
  to: isoDate.optional(),
  sort: z.enum(['date', 'description', 'value']).default('date'),
  dir: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce
    .number()
    .int()
    .refine((n) => (PAGE_SIZES as readonly number[]).includes(n))
    .default(PAGE_SIZES[0]),
});

const flagsPatch = z
  .object({ confirmed: z.boolean().optional(), split: z.boolean().optional() })
  .strict()
  .refine((p) => Object.keys(p).length > 0);

export function ledgerRouter(container: Container): Router {
  const router = Router();
  router.use(requireAuth(container));

  router.use(settingsRouter(container));
  router.use(recurringRouter(container));
  router.use(summaryRouter(container));
  router.use(dashboardRouter(container));

  router.get('/transactions', (req, res) => {
    const { month } = monthQuery.parse(req.query);
    res.json({ transactions: container.listMonthTransactions.execute(month) });
  });

  router.get('/transactions/search', (req, res) => {
    const { q, ...rest } = searchQuery.parse(req.query);
    res.json(container.searchTransactions.execute({ ...rest, query: q }));
  });

  router.post('/transactions', (req, res) => {
    const transaction = container.saveTransaction.execute(null, transactionInputSchema.parse(req.body));
    res.status(201).json({ transaction });
  });

  router.put('/transactions/:id', (req, res) => {
    const transaction = container.saveTransaction.execute(
      req.params.id,
      transactionInputSchema.parse(req.body),
    );
    res.json({ transaction });
  });

  router.patch('/transactions/:id', (req, res) => {
    const transaction = container.toggleTransactionFlags.execute(req.params.id, flagsPatch.parse(req.body));
    res.json({ transaction });
  });

  router.delete('/transactions/:id', (req, res) => {
    container.deleteTransaction.execute(req.params.id);
    res.status(204).end();
  });

  return router;
}
