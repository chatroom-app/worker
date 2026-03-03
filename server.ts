import express from 'express';
import { createServer as createViteServer } from 'vite';
import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';

async function startServer() {
  const app = express();
  const PORT = 3000;
  const server = http.createServer(app);
  const wss = new WebSocketServer({ server });

  // Room state
  const rooms = new Map<string, Set<WebSocket>>();
  const clients = new Map<WebSocket, { id: string; roomId: string; name: string }>();

  wss.on('connection', (ws) => {
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        switch (data.type) {
          case 'join': {
            const { roomId, peerId, name } = data;
            clients.set(ws, { id: peerId, roomId, name });
            
            if (!rooms.has(roomId)) {
              rooms.set(roomId, new Set());
            }
            const room = rooms.get(roomId)!;
            room.add(ws);

            // Notify others
            room.forEach((clientWs) => {
              if (clientWs !== ws && clientWs.readyState === WebSocket.OPEN) {
                clientWs.send(JSON.stringify({
                  type: 'user-joined',
                  peerId,
                  name
                }));
              }
            });
            break;
          }
          
          case 'offer':
          case 'answer':
          case 'ice-candidate': {
            const { target, caller, ...rest } = data;
            const clientInfo = clients.get(ws);
            if (!clientInfo) return;
            
            const room = rooms.get(clientInfo.roomId);
            if (!room) return;

            room.forEach((clientWs) => {
              const info = clients.get(clientWs);
              if (info && info.id === target && clientWs.readyState === WebSocket.OPEN) {
                clientWs.send(JSON.stringify({
                  type: data.type,
                  caller,
                  ...rest
                }));
              }
            });
            break;
          }
          case 'media-state': {
            const { roomId, peerId, audioEnabled, videoEnabled } = data;
            const room = rooms.get(roomId);
            if (room) {
              room.forEach((clientWs) => {
                if (clientWs !== ws && clientWs.readyState === WebSocket.OPEN) {
                  clientWs.send(JSON.stringify({
                    type: 'media-state',
                    peerId,
                    audioEnabled,
                    videoEnabled
                  }));
                }
              });
            }
            break;
          }
        }
      } catch (e) {
        console.error('WebSocket message error:', e);
      }
    });

    ws.on('close', () => {
      const clientInfo = clients.get(ws);
      if (clientInfo) {
        const { id, roomId } = clientInfo;
        const room = rooms.get(roomId);
        if (room) {
          room.delete(ws);
          if (room.size === 0) {
            rooms.delete(roomId);
          } else {
            room.forEach((clientWs) => {
              if (clientWs.readyState === WebSocket.OPEN) {
                clientWs.send(JSON.stringify({
                  type: 'user-left',
                  peerId: id
                }));
              }
            });
          }
        }
        clients.delete(ws);
      }
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
