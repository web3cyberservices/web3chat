/**
 * @fileOverview Симулированный P2P-слой на базе BroadcastChannel.
 * Позволяет тестировать зашифрованную переписку между вкладками браузера.
 */

// Типизация для совместимости с существующим кодом
export async function initWaku(): Promise<any> {
  console.log('Transport: Simulated P2P initialized (BroadcastChannel mode)');
  return { status: 'online' };
}

export function createContentTopic(id: string) {
  return `web3chat_topic_${id}`;
}

/**
 * Отправляет зашифрованное сообщение через широковещательный канал браузера.
 */
export async function sendP2PMessage(targetId: string, encryptedPayload: string): Promise<boolean> {
  try {
    const channel = new BroadcastChannel(createContentTopic(targetId));
    channel.postMessage({
      payload: encryptedPayload,
      senderTopic: targetId,
      timestamp: Date.now()
    });
    
    // Также сохраняем в localStorage для надежности (эмуляция "облака")
    const storageKey = `web3_offline_${targetId}`;
    const existing = JSON.parse(localStorage.getItem(storageKey) || '[]');
    existing.push({ payload: encryptedPayload, time: Date.now() });
    localStorage.setItem(storageKey, JSON.stringify(existing.slice(-50)));
    
    setTimeout(() => channel.close(), 100);
    return true;
  } catch (e) {
    console.error('Simulated Send Error:', e);
    return false;
  }
}

/**
 * Подписывается на входящие сообщения через BroadcastChannel.
 */
export async function subscribeToP2P(ids: string[], onMessage: (payload: string, topicId: string) => void) {
  const channels: BroadcastChannel[] = [];

  ids.forEach(id => {
    const channel = new BroadcastChannel(createContentTopic(id));
    channel.onmessage = (event) => {
      if (event.data && event.data.payload) {
        onMessage(event.data.payload, id);
      }
    };
    channels.push(channel);
  });

  // Эмуляция получения "оффлайн" сообщений при подписке
  ids.forEach(id => {
    const storageKey = `web3_offline_${id}`;
    const offlineMessages = JSON.parse(localStorage.getItem(storageKey) || '[]');
    if (offlineMessages.length > 0) {
      offlineMessages.forEach((m: any) => onMessage(m.payload, id));
      localStorage.removeItem(storageKey); // Очищаем после получения
    }
  });

  return () => {
    channels.forEach(c => c.close());
  };
}
