import { type ZodRouter } from 'koa-zod-router'
import booksList from './list'
import createOrUpdateBook from './create_or_update'
import deleteBook from './delete'
import getBookRoute from './lookup'

export function setupBookRoutes (router: ZodRouter): void {
  // Setup Book List Route
  booksList(router)

  // Setup Book Create Route
  createOrUpdateBook(router)

  // Setup Book Delete Route
  deleteBook(router)

  // Lookup Book
  getBookRoute(router)
}
