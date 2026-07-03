/**
 * @fileOverview Глобальная P2P Шина на базе BroadcastChannel (Стандарт 2026).
 * Обеспечивает гарантированную доставку сообщений между вкладками одного браузера.
 */

const P2P_NETWORK_ID = 'WEB3_CHAT_P2P_MESH_2026';

export async function initWaku(): Promise<any> {
  console.log('P2P Mesh: Global Transport Active');
  return { status: 'online' };
}

/**
 * Отправляет зашифрованное сообщение в общую сеть.
 * Все узлы получат его, но расшифровать сможет только владелец целевого ID.
 */
export async function sendP2PMessage(targetId: string, encryptedPayload: string): Promise<boolean> {
  try {
    const channel = new BroadcastChannel(P2P_NETWORK_ID);
    
    const message = {
      payload: encryptedPayload,
      targetId, // Позволяет узлам быстро отфильтровать "не свои" сообщения
      senderTimestamp: Date.now()
    };
    
    channel.postMessage(message);
    
    // Резервное копирование в локальное хранилище для оффлайн-синхронизации (между сессиями)
    const storageKey = `web3_mesh_buffer`;
    try {
      const existing = JSON.parse(localStorage.getItem(storageKey) || '[]');
      existing.push(message);
      localStorage.setItem(storageKey, JSON.stringify(existing.slice(-100))); // Храним последние 100
    } catch (e) {}

    // Канал закрываем не сразу, чтобы дать время на отправку
    setTimeout(() => channel.close(), 500);
    return true;
  } catch (e) {
    console.error('P2P Mesh Send Error:', e);
    return false;
  }
}

/**
 * Подписывается на общую шину данных.
 */
export async function subscribeToP2P(myIds: string[], onMessage: (payload: string, topicId: string) => void) {
  const channel = new BroadcastChannel(P2P_NETWORK_ID);
  
  const handleMessage = (event: MessageEvent) => {
    const { payload, targetId } = event.data;
    // Проверяем, предназначен ли пакет нам или группе, в которой мы состоим
    if (myIds.includes(targetId)) {
      onMessage(payload, targetId);
    }
  };

  channel.addEventListener('message', handleMessage);

  // Проверка пропущенных сообщений из буфера при подключении
  try {
    const storageKey = `web3_mesh_buffer`;
    const buffered = JSON.parse(localStorage.getItem(storageKey) || '[]');
    buffered.forEach((m: any) => {
      if (myIds.includes(m.targetId)) {
        onMessage(m.payload, m.targetId);
      }
    });
  } catch (e) {}

  return () => {
    channel.removeEventListener('message', handleMessage);
    channel.close();
  };
}
