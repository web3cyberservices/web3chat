import { io, Socket } from 'socket.io-client';

/**
 * @fileOverview Socket.IO Service. 
 * Реализует доставку сообщений через WebSocket с поддержкой комнат.
 */

let socket: Socket | null = null;

export async function initWaku() {
  if (typeof window === 'undefined') return null;
  
  if (!socket) {
    // Подключаемся к текущему хосту
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
  
  // Сообщаем серверу наш ID, чтобы он добавил нас в нашу комнату
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
  // История подгружается автоматически из локальной IndexedDB или API
  return;
}