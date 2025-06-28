import { type ZodRouter } from 'koa-zod-router'
import booksList from './list'
import createOrUpdateBook from './create_or_update'
import deleteBook from './delete'
import getBookRoute from './lookup'
import { type BookDatabaseAccessor } from '../database_access'

export function setupBookRoutes (
  router: ZodRouter,
  books: BookDatabaseAccessor
): void {
  booksList(router, books)
  createOrUpdateBook(router, books)
  deleteBook(router, books)
  getBookRoute(router, books)
}
