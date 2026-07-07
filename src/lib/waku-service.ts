import protobuf from 'protobufjs';

/**
 * @fileOverview HTTP Stealth Relay. Полная замена Waku P2P.
 * Реализует бронебойную доставку зашифрованных сообщений через собственный Relay API.
 * Все сообщения шифруются на клиенте (E2EE), сервер видит только бинарный шум.
 */

// Protobuf структура для бинарной упаковки (Stealth Mode)
export const ChatDataPacket = new protobuf.Type("ChatDataPacket")
  .add(new protobuf.Field("timestamp", 1, "uint64"))
  .add(new protobuf.Field("sender", 2, "string"))
  .add(new protobuf.Field("message", 3, "string"));

export async function initWaku() {
  console.log('[Relay] Waku engine removed. Using Indestructible Stealth Relay.');
  return { connected: true };
}

/**
 * Отправка сообщения через HTTP Relay
 */
export async function sendP2PMessage(targetId: string, encryptedPayload: string): Promise<boolean> {
  try {
    const res = await fetch('/api/relay', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payload: encryptedPayload })
    });
    return res.ok;
  } catch (e) {
    console.error('[Relay] Send Error:', e);
    return false;
  }
}

/**
 * Подписка на сообщения (Short Polling)
 */
export async function subscribeToP2P(myId: string, onMessage: (payload: string) => void) {
  let isSubscribed = true;
  // Синхронизируем сообщения за последние 24 часа при старте
  let lastSync = Date.now() - (24 * 60 * 60 * 1000); 

  const poll = async () => {
    if (!isSubscribed) return;
    try {
      const res = await fetch(`/api/relay?since=${lastSync}`);
      if (res.ok) {
        const data = await res.json();
        if (data.messages && Array.isArray(data.messages)) {
          data.messages.forEach((msg: any) => {
            const ts = Number(msg.timestamp);
            if (ts > lastSync) lastSync = ts;
            onMessage(msg.payload);
          });
        }
      }
    } catch (e) {
      // Игнорируем сетевые ошибки, повторяем через цикл
    }
    
    // Опрос сервера каждые 2 секунды (Баланс между скоростью и нагрузкой)
    if (isSubscribed) {
      setTimeout(poll, 2000);
    }
  };

  poll();

  return {
    unsubscribe: () => { 
      console.log('[Relay] Subscription stopped.');
      isSubscribed = false; 
    }
  };
}

export async function getWakuHistory(targetId: string, onMessage: (payload: string) => void) {
  // История автоматически подгружается при первом вызове subscribeToP2P через lastSync
}
