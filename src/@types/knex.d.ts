/* eslint-disable no-unused-vars */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Knex } from 'knex'

declare module 'knex/types/tables' {
  export interface Tables {
    users: {
      id: string
      name: string
      nickname: string
      email: string
      birth: Date
      created_at: string
      session_id?: string
    }
    meals: {
      id: string
      name: string
      description: string
      dateTime: Date
      isInDiet: boolean
      created_at: string
      updated_at: string
      userId: string
    }
  }
}
