import { pgTable, serial, text } from 'drizzle-orm/pg-core'

// Define your tables here
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
})
