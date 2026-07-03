/**
 * @fileOverview Стабильный P2P-слой на базе BroadcastChannel и локального кэша.
 * Актуальная реализация для июля 2026 года, имитирующая P2P сеть без внешних ошибок.
 */

export async function initWaku(): Promise<any> {
  console.log('Transport: Web3 P2P initialized (Safe Mode)');
  return { status: 'online' };
}

export function createContentTopic(id: string) {
  return `web3chat_v2_${id.slice(0, 32)}`;
}

/**
 * Отправляет зашифрованное сообщение через широковещательный канал браузера.
 */
export async function sendP2PMessage(targetId: string, encryptedPayload: string): Promise<boolean> {
  try {
    const topic = createContentTopic(targetId);
    const channel = new BroadcastChannel(topic);
    
    channel.postMessage({
      payload: encryptedPayload,
      senderTopic: targetId,
      timestamp: Date.now()
    });
    
    // Эмуляция сетевой задержки и сохранения
    const storageKey = `web3_buffer_${targetId}`;
    const existing = JSON.parse(localStorage.getItem(storageKey) || '[]');
    existing.push({ payload: encryptedPayload, time: Date.now() });
    localStorage.setItem(storageKey, JSON.stringify(existing.slice(-100)));
    
    setTimeout(() => channel.close(), 100);
    return true;
  } catch (e) {
    console.error('P2P Transport Error:', e);
    return false;
  }
}

/**
 * Подписывается на входящие сообщения.
 */
export async function subscribeToP2P(ids: string[], onMessage: (payload: string, topicId: string) => void) {
  const activeChannels: BroadcastChannel[] = [];

  ids.forEach(id => {
    const topic = createContentTopic(id);
    const channel = new BroadcastChannel(topic);
    
    channel.onmessage = (event) => {
      if (event.data && event.data.payload) {
        onMessage(event.data.payload, id);
      }
    };
    activeChannels.push(channel);
    
    // Проверка оффлайн-буфера
    const storageKey = `web3_buffer_${id}`;
    const buffered = JSON.parse(localStorage.getItem(storageKey) || '[]');
    if (buffered.length > 0) {
      buffered.forEach((m: any) => onMessage(m.payload, id));
      localStorage.removeItem(storageKey); 
    }
  });

  return () => {
    activeChannels.forEach(c => c.close());
  };
}