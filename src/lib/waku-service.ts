/**
 * @fileOverview HTTP Stealth Relay. Waku полностью удален.
 * Бронебойная доставка зашифрованных сообщений через собственный сервер.
 */

// Заглушки, чтобы не ломать старый код UI
export async function initWaku() {
  console.log('[Relay] Waku engine removed. Using Indestructible HTTP Relay.');
  return true; 
}

export async function getWakuHistory(targetId: string, onMessage: (payload: string) => void) {
  // История автоматически подгружается при первом вызове subscribeToP2P через lastSync
  return; 
}

/**
 * Отправка сообщения через HTTP Relay
 */
export async function sendP2PMessage(targetId: string, encryptedPayload: string): Promise<boolean> {
  try {
    const res = await fetch('/api/relay', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        targetId, 
        payload: encryptedPayload,
        timestamp: Date.now()
      })
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
      const res = await fetch(`/api/relay?targetId=${myId}&since=${lastSync}`);
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
