import { io, Socket } from 'socket.io-client';

/**
 * @fileOverview Socket.IO Service. 
 * Используется как прозрачная замена Waku/Relay для real-time доставки.
 */

let socket: Socket | null = null;

export async function initWaku() {
  if (typeof window === 'undefined') return null;
  
  if (!socket) {
    // Подключаемся к текущему хосту
    socket = io();
    console.log('[Socket] Initialized');
  }
  return socket;
}

// Заглушка для истории
export async function getWakuHistory() {
  return; 
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

    console.log('[Socket] Message emitted');
    return true;
  } catch (e) {
    console.error('[Socket] Send Error:', e);
    return false;
  }
}

export async function subscribeToP2P(myId: string, onMessage: (payload: string) => void) {
  const s = await initWaku();
  if (!s) return null;
  
  console.log(`[Socket] Subscribing for ID: ${myId}`);

  // Регистрируем наш ID в комнате на сервере
  s.emit('register', myId);

  const handler = (data: { targetId: string, payload: string }) => {
    // Получаем сообщение (сервер уже отфильтровал его для нас)
    onMessage(data.payload);
  };

  s.on('receive_message', handler);

  // Возвращаем объект с методом отписки
  return {
    unsubscribe: () => {
      console.log('[Socket] Unsubscribed');
      s.off('receive_message', handler);
    }
  };
}