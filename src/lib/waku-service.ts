import { createLightNode, Protocols, createEncoder, createDecoder } from '@waku/sdk';

/**
 * @fileOverview P2P сервис Waku. Стандарт Июля 2026.
 * Использует обязательное шардирование и типизацию v2.0.
 */

let nodeInstance: any = null;
let initPromise: Promise<any> | null = null;

export function createContentTopic(id: string) {
  const safeId = (id || 'default').slice(0, 10);
  return `/web3chat/1/u-${safeId}/proto`;
}

export function getMessageEncoder(contentTopic: string) {
  // В 2026 обязательно указываем routingInfo для прохождения через шлюзы
  return createEncoder({ 
    contentTopic, 
    ephemeral: true,
    routingInfo: { shard: 0 } as any
  });
}

export function getMessageDecoder(contentTopic: string) {
  return createDecoder({
    contentTopic,
    routingInfo: { shard: 0 } as any
  });
}

export async function initWaku() {
  if (nodeInstance) return nodeInstance;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      console.log('[Waku] Initializing July 2026 Standard Mesh...');
      
      const node = await createLightNode({ 
        defaultBootstrap: true,
      });
      
      await node.start();
      
      try {
        await (node as any).waitForRemotePeer([Protocols.LightPush, Protocols.Filter], 15000);
        console.log('[Waku] Connected to Global Mesh.');
      } catch (e) {
        console.warn('[Waku] Mesh discovery slow, node will continue in background.');
      }
      
      nodeInstance = node;
      return node;
    } catch (error) {
      console.error('[Waku] Bootstrap failed:', error);
      initPromise = null;
      throw error;
    }
  })();

  return initPromise;
}

export async function sendP2PMessage(targetId: string, encryptedPayload: string): Promise<boolean> {
  try {
    const node = await initWaku();
    const topic = createContentTopic(targetId);
    const encoder = getMessageEncoder(topic);

    const result = await node.lightPush.send(encoder, {
      payload: new TextEncoder().encode(encryptedPayload)
    });

    return !result?.errors?.length;
  } catch (e) {
    console.error('[Waku] Send Error:', e);
    return false;
  }
}

export async function subscribeToP2P(myId: string, onMessage: (payload: string) => void) {
  try {
    const node = await initWaku();
    const topic = createContentTopic(myId);
    const decoder = getMessageDecoder(topic);

    const callback = (wakuMessage: any) => {
      if (wakuMessage?.payload) {
        const decoded = new TextDecoder().decode(wakuMessage.payload);
        onMessage(decoded);
      }
    };

    // В 2026 фильтр принимает массив декодеров
    return await node.filter.subscribe([decoder], callback);
  } catch (e) {
    console.error('[Waku] Subscription Error:', e);
    return null;
  }
}