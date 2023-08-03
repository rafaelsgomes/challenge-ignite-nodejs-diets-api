import { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('diets', (table) => {
    table.uuid('id').primary()
    table.text('name').notNullable()
    table.text('description').notNullable()
    table.timestamp('dateTime', { precision: 3 }).notNullable()
    table.boolean('isInDiet').defaultTo(false).notNullable()
    table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable()
    table.timestamp('updated_at').defaultTo(knex.fn.now()).notNullable()
    table.text('userId').notNullable()
    table
      .foreign('userId')
      .references('id')
      .inTable('users')
      .onUpdate('CASCADE')
      .onDelete('CASCADE')
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('diets')
}
