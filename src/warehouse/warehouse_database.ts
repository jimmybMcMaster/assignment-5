import { ObjectId, type Collection, type Db } from 'mongodb'
import { type BookID, type OrderId, type ShelfId } from '../../adapter/assignment-4'
import { client } from '../database_access'
import { type WarehouseData, InMemoryWarehouse } from './warehouse_data'
import { generateId, seedWarehouseDatabase } from '../../database_test_utilities'

export interface WarehouseDatabaseAccessor {
  database: Db
  books: Collection<{ book: BookID, shelf: ShelfId, count: number }>
  orders: Collection<{ books: Record<BookID, number> }>
}

export async function getWarehouseDatabase (): Promise<WarehouseDatabaseAccessor> {
  const database = client.db((global as any).MONGO_URI !== undefined ? Math.floor(Math.random() * 100000).toPrecision() : 'mcmasterful-warehouse')
  const books = database.collection<{ book: BookID, shelf: ShelfId, count: number }>('books')
  await books.createIndex({ book: 1, shelf: 1 }, { unique: true })
  const orders = database.collection<{ books: Record<BookID, number> }>('orders')

  return {
    database,
    books,
    orders
  }
}

export class DatabaseWarehouse implements WarehouseData {
  accessor: WarehouseDatabaseAccessor

  constructor (accessor: WarehouseDatabaseAccessor) {
    this.accessor = accessor
  }

  async placeBookOnShelf (book: string, shelf: string, count: number): Promise<void> {
    await this.accessor.books.insertOne({ book, shelf, count })
  }

  async getCopiesOnShelf (book: string, shelf: string): Promise<number> {
    const result = await this.accessor.books.findOne({ book, shelf })
    return result !== null ? result.count : 0
  }

  async getCopies (book: string): Promise<Record<ShelfId, number>> {
    const result = this.accessor.books.find({ book })
    const copies: Record<ShelfId, number> = {}

    while (await result.hasNext()) {
      const value = await result.next()
      if (value === null) {
        break
      }
      copies[value.shelf] = value.count
    }

    return copies
  }

  async getOrder (order: OrderId): Promise<Record<BookID, number> | false> {
    const result = await this.accessor.orders.findOne({ _id: ObjectId.createFromHexString(order) })
    return result !== null ? result.books : false
  }

  async removeOrder (order: OrderId): Promise<void> {
    await this.accessor.orders.deleteOne({ _id: ObjectId.createFromHexString(order) })
  }

  async listOrders (): Promise<Array<{ orderId: OrderId, books: Record<BookID, number> }>> {
    const result = await this.accessor.orders.find().toArray()

    return result.map(({ _id, books }) => {
      return { orderId: _id.toHexString(), books }
    })
  }

  async placeOrder (books: Record<string, number>): Promise<OrderId> {
    const result = await this.accessor.orders.insertOne({ books })
    return result.insertedId.toHexString()
  }
}

if (import.meta.vitest !== undefined) {
  const { test, expect } = import.meta.vitest

  test('placing a book adds the book to the database', async () => {
    const memData = new InMemoryWarehouse()
    const dbData = new DatabaseWarehouse(await getWarehouseDatabase())

    const book = generateId<BookID>()
    const shelf = 'my_shelf'
    const copies = 5

    await Promise.all([memData.placeBookOnShelf(book, shelf, copies), dbData.placeBookOnShelf(book, shelf, copies)])
    const [memResult, dbResult] = await Promise.all([memData.getCopiesOnShelf(book, shelf), dbData.getCopiesOnShelf(book, shelf)])

    expect(memResult).toEqual(dbResult)
    expect(dbResult).toEqual(5)
  })

  test('getting a non existant book/shelf combination returns a zero', async () => {
    const memData = new InMemoryWarehouse()
    const dbData = new DatabaseWarehouse(await getWarehouseDatabase())

    const [memResult, dbResult] = await Promise.all([memData.getCopiesOnShelf('book', 'shelf'), dbData.getCopiesOnShelf('book', 'shelf')])

    expect(memResult).toEqual(dbResult)
    expect(dbResult).toEqual(0)
  })

  test('get all the copies of an existing book', async () => {
    const dbPromise = getWarehouseDatabase()
    const db = await dbPromise

    const bookId = generateId<BookID>()
    const seed = { books: { [bookId]: { shelf_1: 5, shelf_2: 3 } }, orders: {} }

    await seedWarehouseDatabase(db, seed)
    const memData = new InMemoryWarehouse(seed)
    const dbData = new DatabaseWarehouse(db)

    const [memResult, dbResult] = await Promise.all([memData.getCopies(bookId), dbData.getCopies(bookId)])

    expect(memResult.shelf_1).toEqual(dbResult.shelf_1)
    expect(dbResult.shelf_1).toEqual(5)
    expect(memResult.shelf_2).toEqual(dbResult.shelf_2)
    expect(dbResult.shelf_2).toEqual(3)
  })

  test('order crud works as expected', async () => {
    const db = await getWarehouseDatabase()
    const memData = new InMemoryWarehouse()
    const dbData = new DatabaseWarehouse(db)

    const [memOrderId, dbOrderId] = await Promise.all([memData.placeOrder({ book: 2 }), dbData.placeOrder({ book: 2 })])
    const [memOrder, dbOrder] = await Promise.all([memData.getOrder(memOrderId), dbData.getOrder(dbOrderId)])

    expect(memOrder).toMatchObject(dbOrder)
    expect(dbOrder).toBeTruthy()
    if (dbOrder !== false) {
      expect(dbOrder.book).toEqual(2)
    }

    const [memOrderId2, dbOrderId2] = await Promise.all([memData.placeOrder({ book: 1 }), dbData.placeOrder({ book: 1 })])
    const [memList, dbList] = await Promise.all([memData.listOrders(), dbData.listOrders()])

    expect(memList.length).toEqual(dbList.length)
    expect(dbList.length).toEqual(2)

    await Promise.all([memData.removeOrder(memOrderId), dbData.removeOrder(dbOrderId)])
    await Promise.all([memData.removeOrder(memOrderId2), dbData.removeOrder(dbOrderId2)])

    const [memList2, dbList2] = await Promise.all([memData.listOrders(), dbData.listOrders()])

    expect(memList2.length).toEqual(dbList2.length)
    expect(dbList2.length).toEqual(0)
  })
}

export async function getDefaultWarehouseDatabase (): Promise<WarehouseData> {
  const db = await getWarehouseDatabase()
  return new DatabaseWarehouse(db)
}
