
/**
 * @fileOverview Глобальная P2P Шина на базе BroadcastChannel.
 * Обеспечивает синхронизацию сообщений между вкладками в реальном времени.
 */

const P2P_NETWORK_ID = 'WEB3_CHAT_P2P_MESH_V5';
const SYNC_STORAGE_KEY = 'web3_chat_mesh_sync_v5';

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
    
    // 1. Отправка через BroadcastChannel для мгновенной реакции в других вкладках
    channel.postMessage(message);
    
    // 2. Дублирование в localStorage для надежности
    const existing = JSON.parse(localStorage.getItem(SYNC_STORAGE_KEY) || '[]');
    existing.push(message);
    localStorage.setItem(SYNC_STORAGE_KEY, JSON.stringify(existing.slice(-50)));

    return true;
  } catch (e) {
    console.error('P2P Mesh Send Error:', e);
    return false;
  }
}

export async function subscribeToP2P(onMessage: (payload: string, topicId: string) => void) {
  const channel = getChannel();
  if (!channel) return () => {};
  
  const processedNonces = new Set<string>();

  const handleIncoming = (data: any) => {
    const { payload, targetId, nonce } = data;
    if (processedNonces.has(nonce)) return;
    
    processedNonces.add(nonce);
    onMessage(payload, targetId);
  };

  const channelListener = (event: MessageEvent) => handleIncoming(event.data);
  channel.addEventListener('message', channelListener);

  // Проверка пропущенных сообщений при инициализации
  const checkSync = () => {
    try {
      const buffered = JSON.parse(localStorage.getItem(SYNC_STORAGE_KEY) || '[]');
      buffered.forEach(handleIncoming);
    } catch (e) {}
  };

  checkSync();

  const storageListener = (e: StorageEvent) => {
    if (e.key === SYNC_STORAGE_KEY) checkSync();
  };
  window.addEventListener('storage', storageListener);

  return () => {
    channel.removeEventListener('message', channelListener);
    window.removeEventListener('storage', storageListener);
  };
}
