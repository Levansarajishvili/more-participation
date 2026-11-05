import { route } from '../lib/openapi.js';
import { pingDb } from '../lib/db.js';

/**
 * `GET /api/health` (B1): სერვისი + ბაზის `ping`. ბაზის გარეშე — 503 (ჰოსტინგი ინსტანციას
 * ტრაფიკიდან იღებს). პასუხი მინიმალურია: ვერსია, hostname და შეცდომის ტექსტი არ ჩანს.
 * @param {import('fastify').FastifyInstance} app
 * @param {{ spec: any }} options
 */
export function registerHealth(app, { spec }) {
  route(app, spec, 'getHealth', async (request, reply) => {
    const up = app.db ? await pingDb(app.db) : false;
    reply.code(up ? 200 : 503);
    return { status: up ? 'ok' : 'degraded', db: up ? 'up' : 'down' };
  });
}
