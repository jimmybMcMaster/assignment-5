import { MongoMemoryServer } from 'mongodb-memory-server'
import { afterAll } from 'vitest'

export async function setup (): Promise<void> {
  const instance = await MongoMemoryServer.create({ binary: { version: '7.0.7' } })
  const uri = instance.getUri();
  (global as any).__MONGOINSTANCE = instance;
  (global as any).MONGO_URI = uri.slice(0, uri.lastIndexOf('/'))
}

export async function teardown (): Promise<void> {
  const instance: MongoMemoryServer = (global as any).__MONGOINSTANCE
  await instance.stop({ doCleanup: true })
}

await setup()

afterAll(teardown)
