import { describe, it, expect } from 'vitest'
import { Configuration, DefaultApi } from '../client'
import { useTestServer } from './test-server-helper'

describe('GET /hello/:name', () => {
  const ctx = useTestServer()

  it('Returns a greeting with name', async () => {
    const client = new DefaultApi(new Configuration({ basePath: ctx.address }))

    const response = await client.sayHello({ name: 'James' })

    expect(response).toBe('Hello James')
  })
})
