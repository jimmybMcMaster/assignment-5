import { Controller, Get, Put, Post, Path, Request, Route, SuccessResponse, Body, Response } from 'tsoa'
import { type BookID, type OrderId, type ShelfId } from '../../adapter/assignment-4'
import { type DefaultContext, type ParameterizedContext, type Request as KoaRequest } from 'koa'
import { type AppWarehouseDatabaseState } from '../app/state'

@Route('warehouse')
export class WarehouseController extends Controller {
  /**
   * Get a list of shelves and how many copies of the book are on each.
   */
  @Get('{book}')
  @SuccessResponse('200', 'Book Found')
  @Response<undefined>(500, 'Server Error')
  public async getBookInfo (
    @Path() book: BookID,
      @Request() request: KoaRequest
  ): Promise<Record<ShelfId, number>> {
    const ctx = request.ctx as ParameterizedContext<AppWarehouseDatabaseState, DefaultContext>
    const warehouse = ctx.state.warehouse

    const copies = await warehouse.getCopies(book)
    const response: Record<ShelfId, number> = {}

    for (const shelf of Object.keys(copies)) {
      const number = copies[shelf]
      if (number > 0) {
        response[shelf] = number
      }
    }

    return response
  }

  /**
   * Place books on a shelf.
   */
  @Put('{book}/{shelf}/{number}')
  @SuccessResponse('200', 'Books Placed')
  public async placeBooksOnShelf (
    @Path() book: BookID,
      @Path() shelf: ShelfId,
      @Path() number: number,
      @Request() request: KoaRequest
  ): Promise<void> {
    const ctx = request.ctx as ParameterizedContext<AppWarehouseDatabaseState, DefaultContext>
    const warehouse = ctx.state.warehouse

    if (number < 0) {
      throw new Error("Can't place less than 0 books on a shelf")
    }

    const current = await warehouse.getCopiesOnShelf(book, shelf) ?? 0
    await warehouse.placeBookOnShelf(book, shelf, current + number)
  }

  /**
   * Place an order for one or more books.
   */
  @Post('order')
  @SuccessResponse('201', 'Order Placed')
  public async placeOrder (
    @Body() body: { order: BookID[] },
      @Request() request: KoaRequest
  ): Promise<OrderId> {
    const ctx = request.ctx as ParameterizedContext<AppWarehouseDatabaseState, DefaultContext>
    const warehouse = ctx.state.warehouse

    const order: Record<BookID, number> = {}

    for (const book of body.order) {
      order[book] = 1 + (order[book] ?? 0)
    }

    return await warehouse.placeOrder(order)
  }

  /**
   * List all existing orders.
   */
  @Get('order')
  @SuccessResponse('200', 'Orders Listed')
  public async listOrders (
    @Request() request: KoaRequest
  ): Promise<Array<{ orderId: OrderId, books: Record<BookID, number> }>> {
    const ctx = request.ctx as ParameterizedContext<AppWarehouseDatabaseState, DefaultContext>
    const warehouse = ctx.state.warehouse

    return await warehouse.listOrders()
  }

  /**
   * Fulfil an order by removing books from shelves.
   */
  @Put('fulfil/{order}')
  @SuccessResponse('200', 'Order Fulfilled')
  public async fulfilOrder (
    @Path() order: OrderId,
      @Body() booksFulfilled: Array<{ book: BookID, shelf: ShelfId, numberOfBooks: number }>,
      @Request() request: KoaRequest
  ): Promise<void> {
    const ctx = request.ctx as ParameterizedContext<AppWarehouseDatabaseState, DefaultContext>
    const warehouse = ctx.state.warehouse

    const orderData = await warehouse.getOrder(order)
    if (orderData === false) {
      throw new Error('no such order')
    }

    const removedCount: Record<BookID, number> = {}
    for (const { book, numberOfBooks } of booksFulfilled) {
      if (!(book in orderData)) {
        throw new Error('one of the books is not in the order')
      }
      removedCount[book] = numberOfBooks + (removedCount[book] ?? 0)
    }

    for (const book of Object.keys(orderData)) {
      if (removedCount[book] !== orderData[book]) {
        throw new Error('incorrect number of books')
      }
    }

    const processedFulfilment = await Promise.all(
      booksFulfilled.map(async ({ book, shelf, numberOfBooks }) => {
        const currentCopiesOnShelf = await warehouse.getCopiesOnShelf(book, shelf)
        const newCopiesOnShelf = currentCopiesOnShelf - numberOfBooks
        if (newCopiesOnShelf < 0) {
          throw new Error('not enough copies on given shelves')
        }
        return { book, shelf, numberOfBooks: newCopiesOnShelf }
      })
    )

    await warehouse.removeOrder(order)
    await Promise.all(
      processedFulfilment.map(async ({ book, shelf, numberOfBooks }) => {
        await warehouse.placeBookOnShelf(book, shelf, numberOfBooks)
      })
    )
  }
}
