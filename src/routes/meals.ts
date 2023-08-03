import { FastifyInstance } from 'fastify'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { knex } from '../database'
import { checkSessionIdExists } from '../middlewares/check-session-id-exists'

export async function mealsRoutes(app: FastifyInstance) {
  app.post(
    '/',
    {
      preHandler: [checkSessionIdExists],
    },
    async (request, reply) => {
      const createMealBodySchema = z.object({
        name: z.string().min(3),
        description: z.string().min(3),
        dateTime: z.coerce.date(),
        isInDiet: z.boolean(),
      })

      const { name, description, dateTime, isInDiet } =
        createMealBodySchema.parse(request.body)

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

      await knex('meals').insert({
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

      const meals = await knex('meals').where('userId', user.id)

      if (meals.length < 1) {
        return reply
          .status(404)
          .send({ error: 'No meals found for this user!' })
      }

      return {
        meals: meals.map((meal) => ({
          ...meal,
          dateTime: new Date(meal.dateTime),
          isInDiet: Number(meal.isInDiet) === 1,
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
      const getMealParamsSchema = z.object({
        id: z.string().uuid(),
      })

      const { id } = getMealParamsSchema.parse(request.params)
      const { sessionId } = request.cookies

      const user = await knex('users')
        .where('session_id', sessionId)
        .select('id')
        .first()

      if (!user) {
        return reply.status(404).send({ error: 'User not found!' })
      }

      const meal = await knex('meals')
        .where('userId', user.id)
        .where('id', id)
        .first()

      if (!meal) {
        return reply.status(404).send({ error: 'No meal found!' })
      }
      return {
        meal: {
          ...meal,
          dateTime: new Date(meal.dateTime),
          isInDiet: Number(meal.isInDiet) === 1,
        },
      }
    },
  )
  app.put(
    '/:id',
    {
      preHandler: [checkSessionIdExists],
    },
    async (request, reply) => {
      const getMealParamsSchema = z.object({
        id: z.string().uuid(),
      })
      const createMealBodySchema = z.object({
        name: z.string().min(3).optional(),
        description: z.string().min(3).optional(),
        dateTime: z.coerce.date().optional(),
        isInDiet: z.boolean().optional(),
      })

      const { id } = getMealParamsSchema.parse(request.params)
      const { name, description, dateTime, isInDiet } =
        createMealBodySchema.parse(request.body)

      const { sessionId } = request.cookies

      const user = await knex('users')
        .where('session_id', sessionId)
        .select('id')
        .first()

      if (!user) {
        return reply.status(404).send({ error: 'User not found!' })
      }

      let meal = await knex('meals')
        .where('userId', user.id)
        .where('id', id)
        .first()

      if (!meal) {
        return reply.status(404).send({ error: 'No meal found!' })
      }
      const today = new Date()
      meal = {
        ...meal,
        name: name ?? meal.name,
        description: description ?? meal.description,
        dateTime: dateTime ?? meal.dateTime,
        isInDiet: isInDiet ?? meal.isInDiet,
        updated_at: `${today.getUTCFullYear()}-${
          today.getUTCMonth() + 1
        }-${today.getUTCDate()} ${today.getUTCHours()}:${today.getUTCMinutes()}:${today.getUTCSeconds()}`,
      }

      await knex('meals')
        .update({
          ...meal,
        })
        .where('id', meal.id)

      return {
        meal: {
          ...meal,
          dateTime: new Date(meal.dateTime),
          isInDiet: Number(meal.isInDiet) === 1,
        },
      }
    },
  )
  app.delete(
    '/:id',
    {
      preHandler: [checkSessionIdExists],
    },
    async (request, reply) => {
      const getMealParamsSchema = z.object({
        id: z.string().uuid(),
      })

      const { id } = getMealParamsSchema.parse(request.params)
      const { sessionId } = request.cookies

      const user = await knex('users')
        .where('session_id', sessionId)
        .select('id')
        .first()

      if (!user) {
        return reply.status(404).send({ error: 'User not found!' })
      }

      const meal = await knex('meals')
        .where('userId', user.id)
        .where('id', id)
        .first()

      if (!meal) {
        return reply.status(404).send({ error: 'No meal found!' })
      }

      await knex('meals').delete().where('id', meal.id)

      return reply.status(204).send()
    },
  )
  app.get(
    '/metrics',
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

      const metrics = await knex('meals')
        .count('id', { as: 'total_meals' })
        .sum('isInDiet', { as: 'total_meals_in_diet' })
        .where('userId', user.id)
        .first()

      if (!metrics) {
        return {
          metrics: {
            total_meals: 0,
            total_meals_in_diet: 0,
            total_meals_out_diet: 0,
            best: 0,
          },
        }
      }

      const meals = await knex('meals').where('userId', user.id)
      let best = 0
      let current = 0
      meals.forEach((meal) => {
        current = meal.isInDiet ? current + 1 : 0
        if (best < current) {
          best = current
        }
      })

      return {
        metrics: {
          ...metrics,
          total_meals_out_diet:
            Number(metrics.total_meals) - Number(metrics.total_meals_in_diet),
          best,
        },
      }
    },
  )
}
