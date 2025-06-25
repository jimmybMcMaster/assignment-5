import { beforeEach, afterEach } from 'vitest'
import { createServer } from '../server'
import { type Server } from 'http'

export interface TestContext {
  address: string
  close: () => void
}

export function useTestServer (): TestContext {
  const ctx: TestContext = {
    address: '',
    close: () => {}
  }

  let server: Server

  beforeEach(() => {
    server = createServer(0)
    const { port } = server.address() as { port: number }
    ctx.address = `http://localhost:${port}`
    ctx.close = () => server.close()
  })

  afterEach(() => {
    ctx.close()
  })

  return ctx
}
