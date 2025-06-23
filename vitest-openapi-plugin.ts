import util from 'node:util'

import child_process from 'node:child_process'

// Wrapping the exec function in a Promise to allow us to use async/await when calling it

// the "exec" function runs a shell command as a child process, and returns the output of that command

const exec = util.promisify(child_process.exec)

async function generateOpenApi (): Promise<void> {
  try {
    console.log('Generating OpenAPI')

    // we're calling our shell script here - but we don't really care about it's return values

    await exec('./generate-openapi.sh')
  } catch (e) {
    console.error('failed to generate open API', e)
  }
}

// We want to keep track of whether the generation has finished, and the currently active promise we can wait on.

// keeping these within a const ensures we don't accidentally refer to an older promise, in case

// multiple file changes cause the openapi generation to trigger in sequence

const openApiReady: { promise: Promise<void>, ready: boolean } = { ready: false, promise: generateOpenApi() }

// We are exporting a vite plugin - since vitest just runst vite plugins under the hood

export default

{

  name: 'OpenApi Generation Plugin',

  // when the build starts, we want to wait until the initial generation of our client and routes is comeplete

  buildStart: async () => { await openApiReady.promise; openApiReady.ready = true },

  // whenever vitest tries to load a file, we want it to wait until there isn't an actively running generation process

  // and the files are ready

  load: async () => {
    // using a while loop because if multiple files are changed in watch mode, you could end up with multiple generation

    // processes triggering one after the other - we only care about the most recent promise, but it could have been

    // created after this function awaited an earlier one

    while (!openApiReady.ready && openApiReady.promise !== undefined) {
      await openApiReady.promise
    }
  },

  // Whenever a file is changed, we mark our openapi as not being ready, start generating the routes & client,

  // and if no other generation processes started since - we can mark that we are ready

  watchChange: async () => {
    openApiReady.ready = false

    const promise = generateOpenApi()

    openApiReady.promise = promise

    await promise

    if (openApiReady.promise === promise) {
      openApiReady.ready = true
    }
  }

}
