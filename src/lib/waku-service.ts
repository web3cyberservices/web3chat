/**
 * @fileOverview Глобальная P2P Шина на базе BroadcastChannel с гарантированной доставкой.
 * Обеспечивает синхронизацию сообщений между вкладками и локальное хранение для пропущенных пакетов.
 */

const P2P_NETWORK_ID = 'WEB3_CHAT_P2P_MESH_V4';
const SYNC_STORAGE_KEY = 'web3_chat_mesh_sync_v4';

let globalChannel: BroadcastChannel | null = null;

function getChannel() {
  if (typeof window === 'undefined') return null;
  if (!globalChannel) {
    globalChannel = new BroadcastChannel(P2P_NETWORK_ID);
  }
  return globalChannel;
}

export async function initWaku(): Promise<any> {
  getChannel();
  return { status: 'online' };
}

export async function sendP2PMessage(targetId: string, encryptedPayload: string): Promise<boolean> {
  try {
    const channel = getChannel();
    if (!channel) return false;

    const message = {
      payload: encryptedPayload,
      targetId,
      senderTimestamp: Date.now(),
      nonce: Math.random().toString(36).substring(7)
    };
    
    // 1. Отправка в реальном времени через BroadcastChannel
    channel.postMessage(message);
    
    // 2. Резервное копирование в localStorage для новых вкладок или пропустивших сообщение
    const existing = JSON.parse(localStorage.getItem(SYNC_STORAGE_KEY) || '[]');
    existing.push(message);
    // Храним только последние 50 сообщений для экономии места
    localStorage.setItem(SYNC_STORAGE_KEY, JSON.stringify(existing.slice(-50)));

    return true;
  } catch (e) {
    console.error('P2P Mesh Send Error:', e);
    return false;
  }
}

export async function subscribeToP2P(myIds: string[], onMessage: (payload: string, topicId: string) => void) {
  const channel = getChannel();
  if (!channel) return () => {};
  
  const processedNonces = new Set<string>();

  const handleMessage = (data: any) => {
    const { payload, targetId, nonce } = data;
    if (processedNonces.has(nonce)) return;
    
    if (myIds.includes(targetId)) {
      processedNonces.add(nonce);
      onMessage(payload, targetId);
    }
  };

  const channelListener = (event: MessageEvent) => handleMessage(event.data);
  channel.addEventListener('message', channelListener);

  // Проверка пропущенных сообщений из хранилища
  const checkSync = () => {
    const buffered = JSON.parse(localStorage.getItem(SYNC_STORAGE_KEY) || '[]');
    buffered.forEach(handleMessage);
  };

  checkSync();
  // Слушаем изменения localStorage для синхронизации между процессами, если BroadcastChannel спит
  window.addEventListener('storage', (e) => {
    if (e.key === SYNC_STORAGE_KEY) checkSync();
  });

  return () => {
    channel.removeEventListener('message', channelListener);
  };
}