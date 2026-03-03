const sessions = new Map<WebSocket, { id: string; roomId: string; name: string }>();

export default {
  async fetch(request: Request) {
    const upgradeHeader = request.headers.get('Upgrade');
    if (!upgradeHeader || upgradeHeader !== 'websocket') {
      return new Response('Expected Upgrade: websocket', { status: 426 });
    }

    const webSocketPair = new WebSocketPair();
    const [client, server] = Object.values(webSocketPair);

    server.accept();

    server.addEventListener('message', event => {
      try {
        const data = JSON.parse(event.data as string);
        
        switch (data.type) {
          case 'join': {
            const { roomId, peerId, name } = data;
            sessions.set(server, { id: peerId, roomId: roomId || 'global', name });
            
            // Notify others in the same room
            broadcast(server, roomId || 'global', {
              type: 'user-joined',
              peerId,
              name
            });
            break;
          }
          
          case 'offer':
          case 'answer':
          case 'ice-candidate': {
            const { target, caller, ...rest } = data;
            const clientInfo = sessions.get(server);
            if (!clientInfo) return;
            
            for (const [ws, info] of sessions.entries()) {
              if (info.id === target && info.roomId === clientInfo.roomId) {
                ws.send(JSON.stringify({
                  type: data.type,
                  caller,
                  ...rest
                }));
                break;
              }
            }
            break;
          }
          
          case 'media-state': {
            const { roomId, peerId, audioEnabled, videoEnabled } = data;
            broadcast(server, roomId || 'global', {
              type: 'media-state',
              peerId,
              audioEnabled,
              videoEnabled
            });
            break;
          }
        }
      } catch (err) {
        console.error(err);
      }
    });

    server.addEventListener('close', () => {
      const info = sessions.get(server);
      if (info) {
        sessions.delete(server);
        broadcast(server, info.roomId, {
          type: 'user-left',
          peerId: info.id
        });
      }
    });

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }
};

function broadcast(sender: WebSocket, roomId: string, message: any) {
  const msgStr = JSON.stringify(message);
  for (const [ws, info] of sessions.entries()) {
    if (ws !== sender && info.roomId === roomId) {
      try {
        ws.send(msgStr);
      } catch (e) {
        // Ignore
      }
    }
  }
}
