import { io, Socket } from 'socket.io-client';

/**
 * @fileOverview Socket.IO Service. 
 * Используется для real-time доставки с автоматической регистрацией в комнатах.
 */

let socket: Socket | null = null;

export async function initWaku() {
  if (typeof window === 'undefined') return null;
  
  if (!socket) {
    socket = io({
      reconnectionAttempts: 5,
      timeout: 10000,
    });
    
    socket.on('connect', () => {
      console.log('[Socket] Connected to relay server');
    });
  }
  return socket;
}

export async function sendP2PMessage(targetId: string, encryptedPayload: string): Promise<boolean> {
  try {
    const s = await initWaku();
    if (!s) return false;
    
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
  
  // Регистрация в персональной комнате для получения личных сообщений
  s.emit('register', myId);

  const handler = (data: { payload: string }) => {
    onMessage(data.payload);
  };

  s.on('receive_message', handler);

  return {
    unsubscribe: () => {
      s.off('receive_message', handler);
    }
  };
}

export async function getWakuHistory() {
  // История подтягивается из локальной БД (IndexedDB) или через API GET /api/relay
  return;
}