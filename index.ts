import Koa from 'koa'
import cors from '@koa/cors'
import zodRouter from 'koa-zod-router'
import qs from 'koa-qs'
import Router from '@koa/router'
import { koaSwagger } from 'koa2-swagger-ui'
import { RegisterRoutes } from './src/routes/generated/routes'
import * as swagger from './src/docs/swagger.json'
import bodyParser from 'koa-bodyparser'
import { setupBookRoutes } from './src/books'
import { setupWarehouseRoutes } from './src/warehouse'

const app = new Koa()

// We use koa-qs to enable parsing complex query strings, like our filters.
qs(app)

// And we add cors to ensure we can access our API from the mcmasterful-books website
app.use(cors())

// Needed fot tsoa routes
app.use(bodyParser())

const router = zodRouter({ zodRouter: { exposeRequestErrors: true } })

setupBookRoutes(router)
setupWarehouseRoutes(router)

app.use(router.routes())

// tsoa routes
const tsoaRouter = new Router()
RegisterRoutes(tsoaRouter)
app.use(tsoaRouter.routes())
app.use(tsoaRouter.allowedMethods())

// swagger ui
app.use(
  koaSwagger({
    routePrefix: '/docs',
    specPrefix: '/docs/spec',
    exposeSpec: true,
    swaggerOptions: { spec: swagger }
  })
)

app.listen(3000, () => {
  console.log('listening!')
})
