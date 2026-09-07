import type { NextRequest } from 'next/server';
import { handle, parseQuery } from '@/server/http/route';
import { expensesApi } from '@/modules/expenses/api';
import { expenseQuerySchema } from '@/modules/expenses/validation';

/** GET /api/expenses — expense register with totals and category breakdown (FR-04). */
export function GET(request: NextRequest) {
  return handle(() => expensesApi.list(parseQuery(request, expenseQuerySchema)));
}
