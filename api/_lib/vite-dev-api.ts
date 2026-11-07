import type { Plugin } from 'vite'
import { loadEnv } from 'vite'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { handleSessionsRequest } from '../sessions'
import { handleChatRequest } from '../chat'
import { readHttpBody, createApiResponseAdapter } from './http'

export function localDevApiPlugin(): Plugin {
  return {
    name: 'local-dev-api',
    apply: 'serve',
    configureServer(server) {
      const fileEnv = loadEnv(server.config.mode, process.cwd(), '')
      const mergedEnv = {
        ...fileEnv,
        ...process.env,
      }

      server.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
        const url = (req.url ?? '').split('?')[0]

        if (url === '/api/sessions') {
          const rawBody =
            req.method === 'PUT' || req.method === 'POST'
              ? await readHttpBody(req)
              : undefined

          await handleSessionsRequest(
            {
              method: req.method,
              body: rawBody,
              headers: req.headers,
            },
            createApiResponseAdapter(res),
            { env: mergedEnv }
          )
          return
        }

        if (url === '/api/chat') {
          const rawBody =
            req.method === 'POST'
              ? await readHttpBody(req)
              : undefined

          await handleChatRequest(
            {
              method: req.method,
              body: rawBody,
              headers: req.headers,
            },
            createApiResponseAdapter(res),
            { env: mergedEnv }
          )
          return
        }

        next()
      })
    },
  }
}
