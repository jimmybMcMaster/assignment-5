import { createServer } from './server'

createServer(3000)
  .then(() => {
    console.log('Listening on port 3000')
  })
  .catch((error) => {
    console.error('Error starting server:', error)
  })
