import { io, Socket } from 'socket.io-client';

/**
 * @fileOverview Socket.IO Service. 
 * Реализует доставку сообщений через WebSocket с поддержкой комнат и авто-реконнекта.
 */

let socket: Socket | null = null;

export async function initWaku() {
  if (typeof window === 'undefined') return null;
  
  if (!socket) {
    socket = io({
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 20000,
    });
    
    socket.on('connect', () => {
      console.log('[Socket] Connected to relay server');
    });

    socket.on('connect_error', (err) => {
      console.error('[Socket] Connection error:', err.message);
    });
  }
  return socket;
}

export async function sendP2PMessage(targetId: string, encryptedPayload: string): Promise<boolean> {
  try {
    const s = await initWaku();
    if (!s || !s.connected) return false;
    
    s.emit('send_message', {
      targetId,
      payload: encryptedPayload,
      timestamp: Date.now()
    });

    return true;
  } catch (e) {
    console.error('[Socket] Send error:', e);
    return false;
  }
}

export async function subscribeToP2P(myId: string, onMessage: (payload: string) => void) {
  const s = await initWaku();
  if (!s) return null;
  
  const register = () => {
    console.log(`[Socket] Registering ID: ${myId}`);
    s.emit('register', myId);
  };

  // Регистрируемся сразу и при каждом восстановлении связи
  if (s.connected) register();
  s.on('connect', register);

  const handler = (data: { payload: string }) => {
    onMessage(data.payload);
  };

  s.on('receive_message', handler);

  return {
    unsubscribe: () => {
      s.off('connect', register);
      s.off('receive_message', handler);
    }
  };
}
