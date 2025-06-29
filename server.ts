import Koa from 'koa'
import cors from '@koa/cors'
import qs from 'koa-qs'
import Router from '@koa/router'
import { koaSwagger } from 'koa2-swagger-ui'
import bodyParser from 'koa-bodyparser'
import { RegisterRoutes } from './src/routes/generated/routes'
import * as swagger from './src/docs/swagger.json'
import { getBookDatabase } from './src/database_access'
import { DatabaseWarehouse, getWarehouseDatabase } from './src/warehouse/warehouse_database'
import { type AppBookDatabaseState, type AppWarehouseDatabaseState } from './src/app/state'
import { type Server, type IncomingMessage, type ServerResponse } from 'http'

export async function createServer (
  port: number = 0,
  randomizeDbName = false
): Promise<Server<typeof IncomingMessage, typeof ServerResponse>> {
  const app = new Koa<AppBookDatabaseState & AppWarehouseDatabaseState>()

  const bookDbName = randomizeDbName ? Math.floor(Math.random() * 100000).toString() : 'mcmasterful-books'
  const warehouseDbName = randomizeDbName ? Math.floor(Math.random() * 100000).toString() : 'mcmasterful-warehouse'

  const state: AppBookDatabaseState & AppWarehouseDatabaseState = {
    books: getBookDatabase(bookDbName),
    warehouse: new DatabaseWarehouse(await getWarehouseDatabase(warehouseDbName))
  }

  // Inject state into Koa context
  app.use(async (ctx, next) => {
    ctx.state = state
    await next()
  })

  qs(app)
  app.use(cors())
  app.use(bodyParser())

  const tsoaRouter = new Router()
  RegisterRoutes(tsoaRouter)
  app.use(tsoaRouter.routes())
  app.use(tsoaRouter.allowedMethods())

  app.use(
    koaSwagger({
      routePrefix: '/docs',
      specPrefix: '/docs/spec',
      exposeSpec: true,
      swaggerOptions: { spec: swagger }
    })
  )

  return app.listen(port)
}
