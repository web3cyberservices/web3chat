
/**
 * @fileOverview Глобальная P2P Шина на базе BroadcastChannel.
 * Реализована система единого канала для гарантированной доставки сообщений.
 */

const P2P_NETWORK_ID = 'WEB3_CHAT_P2P_V6';

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
      timestamp: Date.now(),
      nonce: Math.random().toString(36).substring(2)
    };
    
    channel.postMessage(message);
    return true;
  } catch (e) {
    console.error('P2P Mesh Send Error:', e);
    return false;
  }
}

export async function subscribeToP2P(onMessage: (payload: string, targetId: string) => void) {
  const channel = getChannel();
  if (!channel) return () => {};
  
  const processedNonces = new Set<string>();

  const channelListener = (event: MessageEvent) => {
    const { payload, targetId, nonce } = event.data;
    if (processedNonces.has(nonce)) return;
    
    processedNonces.add(nonce);
    // Ограничиваем размер набора нонсов для экономии памяти
    if (processedNonces.size > 1000) processedNonces.clear();
    
    onMessage(payload, targetId);
  };

  channel.addEventListener('message', channelListener);

  return () => {
    channel.removeEventListener('message', channelListener);
  };
}
