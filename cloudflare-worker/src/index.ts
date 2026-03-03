export interface Env {
  WEBRTC_SIGNALING: DurableObjectNamespace;
}

export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url);
    
    // Handle WebSocket upgrade requests
    if (request.headers.get("Upgrade") === "websocket") {
      // Use a single Durable Object for all connections for simplicity in this example,
      // or partition by room ID. Partitioning by room ID is better for scale.
      const roomId = url.searchParams.get("roomId") || "global";
      const id = env.WEBRTC_SIGNALING.idFromName(roomId);
      const stub = env.WEBRTC_SIGNALING.get(id);
      return stub.fetch(request);
    }

    return new Response("Expected WebSocket", { status: 426 });
  }
};

export class WebRTCSignaling {
  state: DurableObjectState;
  sessions: Map<WebSocket, { id: string; name: string }>;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.sessions = new Map();
  }

  async fetch(request: Request) {
    const webSocketPair = new WebSocketPair();
    const [client, server] = Object.values(webSocketPair);

    this.state.acceptWebSocket(server);

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  async webSocketMessage(ws: WebSocket, msg: string) {
    try {
      const data = JSON.parse(msg);

      switch (data.type) {
        case 'join': {
          const { peerId, name } = data;
          this.sessions.set(ws, { id: peerId, name });
          
          // Notify others
          this.broadcast(ws, {
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
          
          // Find target websocket
          for (const [clientWs, info] of this.sessions.entries()) {
            if (info.id === target) {
              clientWs.send(JSON.stringify({
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
          const { peerId, audioEnabled, videoEnabled } = data;
          this.broadcast(ws, {
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
  }

  async webSocketClose(ws: WebSocket, code: number, reason: string, wasClean: boolean) {
    const info = this.sessions.get(ws);
    if (info) {
      this.sessions.delete(ws);
      this.broadcast(ws, {
        type: 'user-left',
        peerId: info.id
      });
    }
  }

  broadcast(sender: WebSocket, message: any) {
    const msgStr = JSON.stringify(message);
    for (const ws of this.sessions.keys()) {
      if (ws !== sender) {
        try {
          ws.send(msgStr);
        } catch (e) {
          // Ignore
        }
      }
    }
  }
}
