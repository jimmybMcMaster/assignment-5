import { type ZodRouter } from 'koa-zod-router'
import { type BookID, type OrderId } from '../../adapter/assignment-4'
import { InMemoryWarehouse, getDefaultWarehouseData, type WarehouseData } from './warehouse_data'

async function listOrders (data: WarehouseData): Promise<Array<{ orderId: OrderId, books: Record<BookID, number> }>> {
  return await data.listOrders()
}

export function listOrdersRouter (router: ZodRouter): void {
  router.register({
    name: 'list orders',
    method: 'get',
    path: '/order',
    validate: {
    },
    handler: async (ctx, next) => {
      try {
        const result = await listOrders(await getDefaultWarehouseData())
        ctx.body = result
        ctx.status = 201
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

  test('if orders exist they can be listed', async () => {
    const data = new InMemoryWarehouse({ orders: { 'my-order': { book: 2 } } })

    const orders = await listOrders(data)

    expect(orders).toHaveLength(1)

    const order = orders[0]
    expect(order.orderId).toEqual('my-order')
    expect(order.books.book).toEqual(2)
  })
}
