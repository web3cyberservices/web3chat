import { createLightNode, Protocols, createEncoder, createDecoder } from '@waku/sdk';

/**
 * @fileOverview P2P сервис Waku. Боевой стандарт июля 2026.
 * Подключение к Mainnet Mesh с поддержкой отказоустойчивой маршрутизации.
 * Директива 'use server' удалена, так как нода должна инициализироваться в рантайме.
 */

let nodeInstance: any = null;
let initPromise: Promise<any> | null = null;

export function createContentTopic(id: string) {
  const safeId = (id || 'default').slice(0, 10);
  // Стандартный префикс для децентрализованных приложений 2026
  return `/web3chat/1/u-${safeId}/proto`;
}

export async function initWaku() {
  if (nodeInstance) return nodeInstance;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      console.log('[Waku] Initializing Global Mainnet Mesh (2026 Standard)...');
      
      const node = await createLightNode({ 
        defaultBootstrap: true,
      });
      
      await node.start();
      
      try {
        // Ожидание пиров для Push и Filter протоколов
        await (node as any).waitForRemotePeer([Protocols.LightPush, Protocols.Filter], 15000);
        console.log('[Waku] Node connected to Mainnet Mesh.');
      } catch (e) {
        console.warn('[Waku] Mesh discovery timeout. Node will sync in background.');
      }
      
      nodeInstance = node;
      return node;
    } catch (error) {
      console.error('[Waku] Failed to bootstrap node:', error);
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
    
    // В 2026 году routingInfo обязателен для корректной маршрутизации
    const encoder = createEncoder({ 
      contentTopic: topic, 
      ephemeral: true,
      routingInfo: topic 
    } as any);

    const result = await node.lightPush.send(encoder, {
      payload: new TextEncoder().encode(encryptedPayload)
    });

    if (result?.errors?.length) {
      console.error('[Waku] Send errors:', result.errors);
      return false;
    }

    return true;
  } catch (e) {
    console.error('[Waku] Critical Send Error:', e);
    return false;
  }
}

export async function subscribeToP2P(myId: string, onMessage: (payload: string) => void) {
  try {
    const node = await initWaku();
    const topic = createContentTopic(myId);
    
    // В актуальном SDK 2026 createDecoder требует объект опций вторым аргументом
    const decoder = createDecoder(topic, {} as any);

    const callback = (wakuMessage: any) => {
      if (wakuMessage?.payload) {
        const decoded = new TextDecoder().decode(wakuMessage.payload);
        onMessage(decoded);
      }
    };

    const sub = await node.filter.subscribe([decoder], callback);
    console.log(`[Waku] Filter established for topic: ${topic}`);
    return sub;
  } catch (e) {
    console.error('[Waku] Subscription Failure:', e);
    return null;
  }
}