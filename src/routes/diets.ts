import { FastifyInstance } from 'fastify'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { knex } from '../database'
import { checkSessionIdExists } from '../middlewares/check-session-id-exists'

export async function dietsRoutes(app: FastifyInstance) {
  app.post(
    '/',
    {
      preHandler: [checkSessionIdExists],
    },
    async (request, reply) => {
      const createDietBodySchema = z.object({
        name: z.string().min(3),
        description: z.string().min(3),
        dateTime: z.coerce.date(),
        isInDiet: z.boolean(),
      })

      const { name, description, dateTime, isInDiet } =
        createDietBodySchema.parse(request.body)

      const sessionId = request.cookies.sessionId

      if (!sessionId) {
        return reply.status(400).send({ error: 'No sessionId provided!' })
      }

      const user = await knex('users')
        .where('session_id', sessionId)
        .select('id')
        .first()

      if (!user) {
        return reply.status(404).send({ error: 'User not found!' })
      }

      await knex('diets').insert({
        id: randomUUID(),
        name,
        description,
        dateTime,
        isInDiet,
        userId: user.id,
      })

      return reply.status(201).send()
    },
  )

  app.get(
    '/',
    {
      preHandler: [checkSessionIdExists],
    },
    async (request, reply) => {
      const { sessionId } = request.cookies

      const user = await knex('users')
        .where('session_id', sessionId)
        .select('id')
        .first()

      if (!user) {
        return reply.status(404).send({ error: 'User not found!' })
      }

      const diets = await knex('diets').where('userId', user.id)

      if (diets.length < 1) {
        return reply
          .status(404)
          .send({ error: 'No diets found for this user!' })
      }

      return {
        diets: diets.map((diet) => ({
          ...diet,
          dateTime: new Date(diet.dateTime),
          isInDiet: Number(diet.isInDiet) === 1,
        })),
      }
    },
  )
  app.get(
    '/:id',
    {
      preHandler: [checkSessionIdExists],
    },
    async (request, reply) => {
      const getDietParamsSchema = z.object({
        id: z.string().uuid(),
      })

      const { id } = getDietParamsSchema.parse(request.params)
      const { sessionId } = request.cookies

      const user = await knex('users')
        .where('session_id', sessionId)
        .select('id')
        .first()

      if (!user) {
        return reply.status(404).send({ error: 'User not found!' })
      }

      const diet = await knex('diets')
        .where('userId', user.id)
        .where('id', id)
        .first()

      if (!diet) {
        return reply.status(404).send({ error: 'No diet found!' })
      }
      return {
        diet: {
          ...diet,
          dateTime: new Date(diet.dateTime),
          isInDiet: Number(diet.isInDiet) === 1,
        },
      }
    },
  )
}
