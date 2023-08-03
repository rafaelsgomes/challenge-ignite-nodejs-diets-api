import { FastifyInstance } from 'fastify'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { knex } from '../database'
import { checkSessionIdExists } from '../middlewares/check-session-id-exists'

export async function usersRoutes(app: FastifyInstance) {
  app.post('/', async (request, reply) => {
    const createUserBodySchema = z.object({
      name: z.string(),
      nickname: z.string().min(3),
      email: z.string().email(),
      birth: z.coerce.date(),
    })

    const { name, nickname, email, birth } = createUserBodySchema.parse(
      request.body,
    )

    const sessionId = randomUUID()

    reply.cookie('sessionId', sessionId, {
      path: '/',
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    })

    await knex('users').insert({
      id: randomUUID(),
      name,
      nickname,
      email,
      birth,
      session_id: sessionId,
    })

    return reply.status(201).send()
  })

  app.get(
    '/',
    {
      preHandler: [checkSessionIdExists],
    },
    async (request, reply) => {
      const { sessionId } = request.cookies

      if (!sessionId) {
        return reply.status(400).send({ error: 'No sessionId provided!' })
      }

      const user = await knex('users')
        .where('session_id', sessionId)
        .select()
        .first()

      if (!user) {
        return reply.status(404).send({ error: 'User not found!' })
      }
      return {
        user: {
          ...user,
          birth: new Date(user.birth),
        },
      }
    },
  )
}
