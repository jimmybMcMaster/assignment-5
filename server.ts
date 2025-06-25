import Koa from 'koa'
import cors from '@koa/cors'
import zodRouter from 'koa-zod-router'
import qs from 'koa-qs'
import Router from '@koa/router'
import { koaSwagger } from 'koa2-swagger-ui'
import bodyParser from 'koa-bodyparser'
import { RegisterRoutes } from './src/routes/generated/routes'
import * as swagger from './src/docs/swagger.json'
import { setupBookRoutes } from './src/books'
import { setupWarehouseRoutes } from './src/warehouse'
import { type Server, type IncomingMessage, type ServerResponse } from 'http'

export function createServer (port: number = 0): Server<typeof IncomingMessage, typeof ServerResponse> {
  const app = new Koa()

  qs(app)
  app.use(cors())
  app.use(bodyParser())

  const router = zodRouter({ zodRouter: { exposeRequestErrors: true } })
  setupBookRoutes(router)
  setupWarehouseRoutes(router)
  app.use(router.routes())

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
