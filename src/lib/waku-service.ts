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
      const node = await createLightNode({ defaultBootstrap: true });
      await node.start();
      console.log('[Waku] Node started. Waiting for network...');
      
      try {
        // Ждем любых пиров (без жестких рамок)
        await (node as any).waitForRemotePeer([], 5000);
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
    
    let encoder: any;
    try { encoder = (createEncoder as any)({ contentTopic: topic, ephemeral: true }); } 
    catch { encoder = (createEncoder as any)(topic, true); }

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
  
  let decoder: any;
  try { decoder = (createDecoder as any)(topic); } 
  catch { decoder = (createDecoder as any)({ contentTopic: topic }); }

  const callback = (wakuMessage: any) => {
    if (wakuMessage?.payload) {
      onMessage(new TextDecoder().decode(wakuMessage.payload));
    }
  };

  // Рекурсивный цикл-броня: пробуем подписаться, пока не появятся пиры
  const trySubscribe = async (): Promise<any> => {
    try {
      let sub;
      try {
        // Пробуем новый синтаксис (массив)
        sub = await node.filter.subscribe([decoder], callback);
      } catch (err) {
        // Если падает, пробуем старый синтаксис (одиночный объект)
        sub = await node.filter.subscribe(decoder, callback);
      }
      console.log(`[Waku] Successfully subscribed to ${topic}!`);
      return sub;
    } catch (e: any) {
      console.warn('[Waku] Network not ready yet. Retrying subscription in 5s...');
      return new Promise(resolve => setTimeout(() => resolve(trySubscribe()), 5000));
    }
  };

  return await trySubscribe();
}