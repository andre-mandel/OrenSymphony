import http from 'http'
import type { WebSocket } from 'ws'
import { WebSocketServer } from 'ws'
import * as number from 'lib0/number'
import { setupWSConnection } from '@y/websocket-server/utils'

const wss = new WebSocketServer({ noServer: true })
const host = String(process.env.COLLAB_HOST || process.env.HOST || '0.0.0.0')
const port = number.parseInt(String(process.env.COLLAB_PORT || process.env.PORT || '1234'))

const server = http.createServer((_request, response) => {
  response.writeHead(200, { 'Content-Type': 'text/plain' })
  response.end('okay')
})

wss.on('connection', (ws: WebSocket, req) => {
  setupWSConnection(ws as any, req as any, { gc: true })
})

server.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request)
  })
})

server.listen(port, host, () => {
  // eslint-disable-next-line no-console
  console.log(`running at '${host}' on port ${port}`)
})

