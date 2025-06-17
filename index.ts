import Koa from 'koa'
import cors from '@koa/cors'
import zodRouter from 'koa-zod-router'
import qs from 'koa-qs'
import { setupBookRoutes } from './src/books'
import { setupWarehouseRoutes } from './src/warehouse'

const app = new Koa()

// We use koa-qs to enable parsing complex query strings, like our filters.
qs(app)

// And we add cors to ensure we can access our API from the mcmasterful-books website
app.use(cors())

const router = zodRouter({ zodRouter: { exposeRequestErrors: true } })

setupBookRoutes(router)
setupWarehouseRoutes(router)

app.use(router.routes())

app.listen(3000, () => {
  console.log('listening!')
})
