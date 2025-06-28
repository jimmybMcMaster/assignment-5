import { type ZodRouter } from 'koa-zod-router'
import { placeBooksOnShelfRouter } from './place_on_shelf'
import { placeOrderRouter } from './place_order'
import { listOrdersRouter } from './list_orders'
import { getBookInfoRouter } from './get_book_info'
import { fulfilOrderRouter } from './fulfil_order'
import { type WarehouseData } from './warehouse_data'

export function setupWarehouseRoutes (router: ZodRouter, warehouse: WarehouseData): void {
  // Placing Books on Shelves
  placeBooksOnShelfRouter(router, warehouse)

  placeOrderRouter(router, warehouse)

  listOrdersRouter(router, warehouse)

  getBookInfoRouter(router, warehouse)

  fulfilOrderRouter(router, warehouse)
}
