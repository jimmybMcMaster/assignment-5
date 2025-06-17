import { type ZodRouter } from 'koa-zod-router'
import { type ShelfId, type BookID, type OrderId } from '../../adapter/assignment-4'
import { InMemoryWarehouse, type WarehouseData, getDefaultWarehouseData } from './warehouse_data'
import { z } from 'zod'

async function fulfilOrder (data: WarehouseData, orderId: OrderId, booksFulfilled: Array<{ book: BookID, shelf: ShelfId, numberOfBooks: number }>): Promise<void> {
  const order = await data.getOrder(orderId)
  if (order === false) {
    throw new Error('no such order')
  }

  const removedCount: Record<BookID, number> = {}
  for (const { book, numberOfBooks } of booksFulfilled) {
    if (!(book in order)) {
      throw new Error('one of the books is not in the order')
    }
    removedCount[book] = numberOfBooks + (removedCount[book] ?? 0)
  }

  for (const book of Object.keys(order)) {
    if (removedCount[book] !== order[book]) {
      throw new Error('incorrect number of books')
    }
  }

  const processedFulfilment = await Promise.all(booksFulfilled.map(async ({ book, shelf, numberOfBooks }) => {
    const currentCopiesOnShelf = await data.getCopiesOnShelf(book, shelf)
    const newCopiesOnShelf = currentCopiesOnShelf - numberOfBooks
    if (newCopiesOnShelf < 0) {
      throw new Error('not enough copies on given shelves')
    }
    return { book, shelf, numberOfBooks: newCopiesOnShelf }
  }))

  await data.removeOrder(orderId)
  await Promise.all(processedFulfilment.map(async ({ book, shelf, numberOfBooks }) => {
    await data.placeBookOnShelf(book, shelf, numberOfBooks)
  }))
}

export function fulfilOrderRouter (router: ZodRouter): void {
  router.register({
    name: 'fulfil order',
    method: 'put',
    path: '/fulfil/:order',
    validate: {
      params: z.object({
        order: z.string()
      }),
      body: z.object({
        book: z.string(),
        shelf: z.string(),
        numberOfBooks: z.number()
      }).array()
    },
    handler: async (ctx, next) => {
      const { order } = ctx.request.params
      const booksFulfilled = ctx.request.body

      try {
        await fulfilOrder(await getDefaultWarehouseData(), order, booksFulfilled)

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

  test('fulfilling a non-existant order throws an error', async () => {
    const data = new InMemoryWarehouse()

    await expect(async () => { await fulfilOrder(data, 'my-order', []) }).rejects.toThrowError('no such order')
  })

  test('fulfilling an empty order removes the order from the database', async () => {
    const data = new InMemoryWarehouse({ orders: { order: {} } })

    await fulfilOrder(data, 'order', [])

    expect(await data.getOrder('order')).toBeFalsy()
  })

  test('fulfilling a valid order with the correct amount of each book removes the order from the database and the books from the shelves', async () => {
    const data = new InMemoryWarehouse({ orders: { order: { book: 2 } }, books: { book: { shelf_1: 5, shelf_2: 1 } } })

    await fulfilOrder(data, 'order', [{ book: 'book', shelf: 'shelf_2', numberOfBooks: 1 }, { book: 'book', shelf: 'shelf_1', numberOfBooks: 1 }])

    expect(await data.getOrder('order')).toBeFalsy()
    expect(await data.getCopiesOnShelf('book', 'shelf_1')).toEqual(4)
    expect(await data.getCopiesOnShelf('book', 'shelf_2')).toEqual(0)
  })

  test('fulfilling a valid order with a wrong amount of each book doesnt fulfil the order and throws an error', async () => {
    const data = new InMemoryWarehouse({ orders: { order: { book: 3 } }, books: { book: { shelf_1: 5, shelf_2: 1 } } })

    await expect(async () => { await fulfilOrder(data, 'order', [{ book: 'book', shelf: 'shelf_2', numberOfBooks: 1 }, { book: 'book', shelf: 'shelf_1', numberOfBooks: 1 }]) }).rejects.toThrowError('incorrect number of books')

    expect(await data.getOrder('order')).toBeTruthy()
    expect(await data.getCopiesOnShelf('book', 'shelf_1')).toEqual(5)
    expect(await data.getCopiesOnShelf('book', 'shelf_2')).toEqual(1)
  })

  test('fulfilling a valid order with a missing book thorws an error', async () => {
    const data = new InMemoryWarehouse({ orders: { order: { book: 2, book_2: 1 } }, books: { book: { shelf_1: 5, shelf_2: 1 }, book_2: {} } })

    await expect(async () => { await fulfilOrder(data, 'order', [{ book: 'book', shelf: 'shelf_2', numberOfBooks: 1 }, { book: 'book', shelf: 'shelf_1', numberOfBooks: 1 }]) }).rejects.toThrowError('incorrect number of books')

    expect(await data.getOrder('order')).toBeTruthy()
    expect(await data.getCopiesOnShelf('book', 'shelf_1')).toEqual(5)
    expect(await data.getCopiesOnShelf('book', 'shelf_2')).toEqual(1)
  })

  test('fulfilling a valid order with an extra book doesnt fulfil the order and throws an error', async () => {
    const data = new InMemoryWarehouse({ orders: { order: { book: 2 } }, books: { book: { shelf_1: 5, shelf_2: 1 }, book_2: { shelf_1: 1 } } })

    await expect(async () => { await fulfilOrder(data, 'order', [{ book: 'book', shelf: 'shelf_2', numberOfBooks: 1 }, { book: 'book', shelf: 'shelf_1', numberOfBooks: 1 }, { book: 'book_2', shelf: 'shelf_1', numberOfBooks: 1 }]) }).rejects.toThrowError('one of the books is not in the order')

    expect(await data.getOrder('order')).toBeTruthy()
    expect(await data.getCopiesOnShelf('book', 'shelf_1')).toEqual(5)
    expect(await data.getCopiesOnShelf('book', 'shelf_2')).toEqual(1)
  })

  test('fulfilling a valid order without enough copies on a given shelf doesnt fulfil the order and throws an error', async () => {
    const data = new InMemoryWarehouse({ orders: { order: { book: 2 } }, books: { book: { shelf_1: 5, shelf_2: 0 } } })

    await expect(async () => { await fulfilOrder(data, 'order', [{ book: 'book', shelf: 'shelf_2', numberOfBooks: 1 }, { book: 'book', shelf: 'shelf_1', numberOfBooks: 1 }]) }).rejects.toThrowError('not enough copies on given shelves')

    expect(await data.getOrder('order')).toBeTruthy()
    expect(await data.getCopiesOnShelf('book', 'shelf_1')).toEqual(5)
    expect(await data.getCopiesOnShelf('book', 'shelf_2')).toEqual(0)
  })
}
