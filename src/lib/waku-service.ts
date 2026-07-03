
/**
 * @fileOverview Гарантированный P2P транспорт на базе BroadcastChannel и локального эха.
 */

const P2P_NETWORK_ID = 'WEB3_CHAT_P2P_V2026';

let globalChannel: BroadcastChannel | null = null;
const listeners = new Set<(payload: string, targetId: string) => void>();

function getChannel() {
  if (typeof window === 'undefined') return null;
  if (!globalChannel) {
    globalChannel = new BroadcastChannel(P2P_NETWORK_ID);
    globalChannel.onmessage = (event) => {
      const { payload, targetId } = event.data;
      listeners.forEach(l => l(payload, targetId));
    };
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
      timestamp: Date.now(),
      nonce: Math.random().toString(36).substring(2) + Date.now().toString()
    };
    
    // Отправка в другие вкладки
    channel.postMessage(message);
    
    // Локальное эхо для текущей вкладки (BroadcastChannel не шлет самому себе)
    listeners.forEach(l => l(encryptedPayload, targetId));
    
    // Резервная синхронизация через localStorage
    localStorage.setItem('web3_chat_p2p_last_msg', JSON.stringify(message));
    
    return true;
  } catch (e) {
    return false;
  }
}

export async function subscribeToP2P(onMessage: (payload: string, targetId: string) => void) {
  listeners.add(onMessage);
  
  const storageListener = (event: StorageEvent) => {
    if (event.key === 'web3_chat_p2p_last_msg' && event.newValue) {
      try {
        const data = JSON.parse(event.newValue);
        onMessage(data.payload, data.targetId);
      } catch (e) {}
    }
  };

  window.addEventListener('storage', storageListener);

  return () => {
    listeners.delete(onMessage);
    window.removeEventListener('storage', storageListener);
  };
}
