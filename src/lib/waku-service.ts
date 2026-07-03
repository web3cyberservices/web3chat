import { createLightNode, Protocols, createEncoder, createDecoder } from '@waku/sdk';

let nodeInstance: any = null;
let initPromise: Promise<any> | null = null;

export function createContentTopic(id: string) {
  const safeId = (id || 'default').slice(0, 10);
  return `/web3chat/1/u-${safeId}/proto`;
}

// Универсальные обертки для поддержки любых версий Waku SDK (до и после 0.0.28)
function getSafeEncoder(topic: string) {
  try {
    const encoder = (createEncoder as any)({ contentTopic: topic, ephemeral: true });
    // Если SDK старый, он примет объект за строку и криво положит его в contentTopic
    if (encoder && typeof encoder.contentTopic === 'object') {
      return (createEncoder as any)(topic, true); // Вызов для версии 0.0.27
    }
    return encoder;
  } catch (e) {
    return (createEncoder as any)(topic, true);
  }
}

function getSafeDecoder(topic: string) {
  try {
    const decoder = (createDecoder as any)({ contentTopic: topic });
    if (decoder && typeof decoder.contentTopic === 'object') {
      return (createDecoder as any)(topic); // Вызов для версии 0.0.27
    }
    return decoder;
  } catch (e) {
    return (createDecoder as any)(topic);
  }
}

export async function initWaku() {
  if (nodeInstance) return nodeInstance;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      console.log('[Waku] Starting Light Node...');
      const node = await createLightNode({ defaultBootstrap: true });
      await node.start();
      console.log('[Waku] Node started. Searching for peers...');
      
      try {
        // Ограничиваем ожидание пиров 10 секундами
        await node.waitForRemotePeer([Protocols.LightPush, Protocols.Filter], 10000);
        console.log('[Waku] Peers found! P2P Network is ACTIVE.');
      } catch (peerError) {
        console.warn('[Waku] Peer discovery timeout. Waku will continue in background.');
      }
      
      nodeInstance = node;
      return node;
    } catch (error) {
      initPromise = null;
      console.error('[Waku] Init failed:', error);
      throw error;
    }
  })();

  return initPromise;
}

export async function sendP2PMessage(targetId: string, encryptedPayload: string): Promise<boolean> {
  try {
    const node = await initWaku();
    const topic = createContentTopic(targetId);
    
    // Используем нашу безопасную обертку
    const encoder = getSafeEncoder(topic);

    console.log(`[Waku] Sending to ${topic}...`);
    
    const result = await node.lightPush.send(encoder, {
      payload: new TextEncoder().encode(encryptedPayload)
    });

    if (result?.errors && result.errors.length > 0) {
      console.error('[Waku] Send rejected by peer:', result.errors);
      return false;
    }

    console.log('[Waku] Message sent successfully!');
    return true;
  } catch (e) {
    console.error('[Waku] P2P Send Error:', e);
    return false;
  }
}

export async function subscribeToP2P(myId: string, onMessage: (payload: string) => void) {
  try {
    const node = await initWaku();
    const topic = createContentTopic(myId);
    
    // Используем нашу безопасную обертку
    const decoder = getSafeDecoder(topic);

    console.log(`[Waku] Subscribing to ${topic}...`);

    const subscription = await node.filter.subscribe([decoder], (wakuMessage: any) => {
      if (wakuMessage?.payload) {
        console.log('[Waku] Message received!');
        const text = new TextDecoder().decode(wakuMessage.payload);
        onMessage(text);
      }
    });

    return subscription;
  } catch (e) {
    console.error('[Waku] P2P Subscription Failed:', e);
    return null;
  }
}