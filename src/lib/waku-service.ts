import protobuf from 'protobufjs';

/**
 * @fileOverview HTTP Stealth Relay. Замена Waku P2P.
 * Бронебойная доставка зашифрованных сообщений через собственный сервер.
 */

export const ChatDataPacket = new protobuf.Type("ChatDataPacket")
  .add(new protobuf.Field("timestamp", 1, "uint64"))
  .add(new protobuf.Field("sender", 2, "string"))
  .add(new protobuf.Field("message", 3, "string"));

export async function initWaku() {
  console.log('[Relay] Waku mesh disabled. Using indestructible HTTP Relay.');
  return { connected: true };
}

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

export async function subscribeToP2P(myId: string, onMessage: (payload: string) => void) {
  let isSubscribed = true;
  // При первом запуске запрашиваем сообщения за последние 24 часа
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
      // Игнорируем ошибки сети
    }
    
    if (isSubscribed) setTimeout(poll, 2000);
  };

  poll();

  return {
    unsubscribe: () => { isSubscribed = false; }
  };
}

export async function getWakuHistory(targetId: string, onMessage: (payload: string) => void) {
  // История подтягивается автоматически при первом poll()
}