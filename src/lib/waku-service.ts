
import { createLightNode, Protocols, createEncoder, createDecoder } from '@waku/sdk';

let nodeInstance: any = null;
let initPromise: Promise<any> | null = null;

export function createContentTopic(id: string) {
  const safeId = (id || 'default').slice(0, 10);
  return `/web3chat/1/u-${safeId}/proto`;
}

export async function initWaku() {
  if (nodeInstance) return nodeInstance;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      console.log('[Waku] Starting Light Node...');
      // В новой версии это подключит нас к рабочим серверам на открытый порт 443
      const node = await createLightNode({ defaultBootstrap: true });
      await node.start();
      console.log('[Waku] Node started. Waiting for network...');
      
      try {
        await node.waitForRemotePeer([Protocols.LightPush, Protocols.Filter], 10000);
        console.log('[Waku] Connected to mesh!');
      } catch (peerError) {
        console.warn('[Waku] Initial peer wait timeout. Running in background.');
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
    
    // В новой версии этот энкодер работает идеально и без костылей
    const encoder = createEncoder({ contentTopic: topic, ephemeral: true });

    console.log(`[Waku] Sending message...`);
    const result = await node.lightPush.send(encoder, {
      payload: new TextEncoder().encode(encryptedPayload)
    });

    if (result?.errors?.length) {
      console.error('[Waku] Send rejected:', result.errors);
      return false;
    }
    
    console.log('[Waku] Message delivered to network!');
    return true;
  } catch (e) {
    console.error('[Waku] Send Error:', e);
    return false;
  }
}

export async function subscribeToP2P(myId: string, onMessage: (payload: string) => void) {
  const node = await initWaku();
  const topic = createContentTopic(myId);
  
  // Чистый декодер для новой версии
  const decoder = createDecoder(topic);

  const callback = (wakuMessage: any) => {
    if (wakuMessage?.payload) {
      onMessage(new TextDecoder().decode(wakuMessage.payload));
    }
  };

  const trySubscribe = async (): Promise<any> => {
    try {
      const sub = await node.filter.subscribe([decoder], callback);
      console.log(`[Waku] Successfully subscribed to ${topic}!`);
      return sub;
    } catch (e: any) {
      console.warn('[Waku] Network not ready yet. Retrying subscription in 5s...');
      return new Promise(resolve => setTimeout(() => resolve(trySubscribe()), 5000));
    }
  };

  return await trySubscribe();
}
