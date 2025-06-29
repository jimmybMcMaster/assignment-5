import { Controller, Get, Path, Post, Route, Request, SuccessResponse, Delete, Body, Query, Response } from 'tsoa'
import { ObjectId } from 'mongodb'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { type BookDatabaseAccessor } from '../database_access'
import { type BookID, type Book } from '../../adapter/assignment-4'
import { type DefaultContext, type ParameterizedContext, type Request as KoaRequest } from 'koa'
import { type AppBookDatabaseState } from '../app/state'

/**
 * Controller for managing books.
 * Example:
 *
 * const cheapBook = {
 *   name: 'Cheap Book',
 *   author: 'Cheap Author',
 *   description: 'A cheap book',
 *   price: 3,
 *   image: 'url'
 * }
 *
 * const middleBook = {
 *   name: 'Middle Book',
 *   author: 'Middle Author',
 *   description: 'A middle book',
 *   price: 13,
 *   image: 'url'
 * }
 *
 * const expensiveBook = {
 *   name: 'Expensive Book',
 *   author: 'Expensive Author',
 *   description: 'An expensive book',
 *   price: 30,
 *   image: 'url'
 * }
 */
@Route('books')
export class BooksController extends Controller {
  /**
   * Look up a single book by its ID.
   * Example:
   * GET /books/{id}
   *
   * @param id - The ID of the book to retrieve.
   * @param request - The Koa request object.
   * @returns The book with the given ID or undefined if not found.
   */
  @Get('{id}')
  @SuccessResponse('200', 'Book Found')
  @Response<undefined>(404, 'Book Not Found')
  public async getBook (
    @Path() id: BookID,
      @Request() request: KoaRequest
  ): Promise<Book | undefined> {
    const ctx = request.ctx as ParameterizedContext<AppBookDatabaseState, DefaultContext>
    const { books } = ctx.state

    if (id.length !== 24) return undefined

    const found = await books.books.findOne({ _id: ObjectId.createFromHexString(id) })

    if (found == null) return undefined

    return {
      id,
      name: found.name,
      author: found.author,
      description: found.description,
      price: found.price,
      image: found.image
    }
  }

  /**
   * List all books, with optional filtering by price, name, or author.
   * Example:
   * GET /books?from=10&to=50&name=Middle
   *
   * @param request - The Koa request object.
   * @param from - Optional filter for from price range.
   * @param to - Optional filter for to price range.
   * @param name - Optional filter for book name.
   * @param author - Optional filter for book author.
   * @returns A list of books matching the filters.
   */
  @Get()
  @SuccessResponse('200', 'List Returned')
  public async listBooks (
    @Request() request: KoaRequest,
      @Query() from?: number,
      @Query() to?: number,
      @Query() name?: string,
      @Query() author?: string
  ): Promise<Book[]> {
    const ctx = request.ctx as ParameterizedContext<AppBookDatabaseState, DefaultContext>
    const { books } = ctx.state

    // Filter out invalid or empty filters
    const validFilters = [
      { from, to, name, author }
    ].filter(({ from, to, name, author }) =>
      typeof from === 'number' ||
      typeof to === 'number' ||
      (typeof name === 'string' && name.trim().length > 0) ||
      (typeof author === 'string' && author.trim().length > 0)
    )

    const query =
      validFilters.length > 0
        ? {
            $or: validFilters.map(({ from, to, name, author }) => {
              const filter: any = {}
              if (typeof from === 'number') filter.price = { $gte: from }
              if (typeof to === 'number') filter.price = { ...(filter.price ?? {}), $lte: to }
              if (typeof name === 'string') filter.name = { $regex: name.toLowerCase(), $options: 'ix' }
              if (typeof author === 'string') filter.author = { $regex: author.toLowerCase(), $options: 'ix' }
              return filter
            })
          }
        : {}

    const results = await books.books.find(query).toArray()

    return results.map(doc => ({
      id: doc._id.toHexString(),
      name: doc.name,
      image: doc.image,
      price: doc.price,
      author: doc.author,
      description: doc.description
    }))
  }

  /**
   * Create or update a book.
   * Example:
   * POST /books
   *
   * @param body - The book object to create or update.
   * @param request - The Koa request object.
   * @returns The ID of the created or updated book.
   */
  @Post()
  @SuccessResponse('201', 'Created or Updated')
  public async createOrUpdateBook (
    @Body() body: Book,
      @Request() request: KoaRequest
  ): Promise<{ id: string } | undefined> {
    const ctx = request.ctx as ParameterizedContext<AppBookDatabaseState, DefaultContext>
    const { books } = ctx.state

    if (body.id != null) {
      try {
        const result = await books.books.replaceOne(
          { _id: ObjectId.createFromHexString(body.id) },
          {
            name: body.name,
            description: body.description,
            price: body.price,
            author: body.author,
            image: body.image
          }
        )
        if (result.modifiedCount === 1) {
          return { id: body.id }
        }
        this.setStatus(404)
        return undefined
      } catch {
        this.setStatus(500)
        return undefined
      }
    } else {
      try {
        const result = await books.books.insertOne({
          name: body.name,
          description: body.description,
          price: body.price,
          author: body.author,
          image: body.image
        })
        return { id: result.insertedId.toHexString() }
      } catch {
        this.setStatus(500)
        return undefined
      }
    }
  }

  /**
   * Delete a book by its ID.
   * Example:
   * DELETE /books/{id}
   *
   * @param id - The ID of the book to delete.
   * @param request - The Koa request object.
   * @returns Nothing. Status is set according to whether the book was deleted.
   */
  @Delete('{id}')
  @SuccessResponse('200', 'Book Deleted')
  @Response<undefined>(404, 'Book Not Found')
  public async deleteBook (
    @Path() id: BookID,
      @Request() request: KoaRequest
  ): Promise<void> {
    const ctx = request.ctx as ParameterizedContext<AppBookDatabaseState, DefaultContext>
    const { books } = ctx.state

    const result = await books.books.deleteOne({ _id: ObjectId.createFromHexString(id) })

    if (result.deletedCount !== 1) {
      this.setStatus(404)
    }
  }
}
