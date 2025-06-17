import { type ZodRouter } from 'koa-zod-router'
import { type ShelfId, type BookID } from '../../adapter/assignment-4'
import { InMemoryWarehouse, type WarehouseData, getDefaultWarehouseData } from './warehouse_data'
import { z } from 'zod'

async function placeBooksOnShelf (data: WarehouseData, bookId: BookID, numberOfBooks: number, shelf: ShelfId): Promise<void> {
  if (numberOfBooks < 0) {
    throw new Error("Can't place less than 0 books on a shelf")
  }
  const current = await data.getCopiesOnShelf(bookId, shelf) ?? 0
  await data.placeBookOnShelf(bookId, shelf, current + numberOfBooks)
}

export function placeBooksOnShelfRouter (router: ZodRouter): void {
  router.register({
    name: 'place books on shelf',
    method: 'put',
    path: '/warehouse/:book/:shelf/:number',
    validate: {
      params: z.object({
        book: z.string(),
        shelf: z.string(),
        number: z.coerce.number().positive()
      })
    },
    handler: async (ctx, next) => {
      const { book, shelf, number } = ctx.request.params

      try {
        await placeBooksOnShelf(await getDefaultWarehouseData(), book, number, shelf)

        ctx.status = 200
        return await next()
      } catch (e) {
        ctx.status = 500
        return await next()
      }
    }
  })
}

if (import.meta.vitest !== undefined) {
  const { test, expect } = import.meta.vitest

  test('placing a book on a shelf with no other copies of the book results in only the placed book being there', async () => {
    const data = new InMemoryWarehouse()

    await placeBooksOnShelf(data, 'my_book', 1, 'my_shelf')

    expect(await data.getCopiesOnShelf('my_book', 'my_shelf')).toBe(1)
  })

  test('placing a book on a shelf with other copies of the book results in all of them being there', async () => {
    const data = new InMemoryWarehouse({ books: { my_book: { my_shelf: 5 } } })

    await placeBooksOnShelf(data, 'my_book', 1, 'my_shelf')

    expect(await data.getCopiesOnShelf('my_book', 'my_shelf')).toBe(6)
  })

  test('placing a negative number of books throws an error', async () => {
    const data = new InMemoryWarehouse()

    await expect(async () => { await placeBooksOnShelf(data, 'my_book', -1, 'my_shelf') }).rejects.toThrowError(/less than 0/)
  })
}
