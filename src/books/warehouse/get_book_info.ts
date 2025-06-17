import { type ZodRouter } from 'koa-zod-router'
import { type ShelfId, type BookID } from '../../adapter/assignment-4'
import { InMemoryWarehouse, type WarehouseData, getDefaultWarehouseData } from './warehouse_data'
import { z } from 'zod'

async function getBookInfo (data: WarehouseData, bookId: BookID): Promise<Record<ShelfId, number>> {
  const copies = await data.getCopies(bookId)
  const response: Record<ShelfId, number> = {}

  for (const shelf of Object.keys(copies)) {
    const number = copies[shelf]
    if (number > 0) {
      response[shelf] = number
    }
  }

  return response
}

export function getBookInfoRouter (router: ZodRouter): void {
  router.register({
    name: 'place books on shelf',
    method: 'get',
    path: '/warehouse/:book',
    validate: {
      params: z.object({
        book: z.string()
      })
    },
    handler: async (ctx, next) => {
      const { book } = ctx.request.params

      try {
        const bookInfo = await getBookInfo(await getDefaultWarehouseData(), book)

        ctx.status = 200
        ctx.body = bookInfo
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

  test('if there are no copies of a book on any shelves, gets an empty object', async () => {
    const data = new InMemoryWarehouse()

    const result = await getBookInfo(data, 'my-book')

    expect(Object.keys(result)).toHaveLength(0)
  })

  test('if there are copies of a book on shelves, gets the correct info', async () => {
    const data = new InMemoryWarehouse({ books: { book: { shelf_1: 15, shelf_2: 1 } } })
    const result = await getBookInfo(data, 'book')

    expect(Object.keys(result)).toHaveLength(2)
    expect(result.shelf_1).toEqual(15)
    expect(result.shelf_2).toEqual(1)
  })
}
