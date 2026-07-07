
import { createLightNode, Protocols, createEncoder, createDecoder } from '@waku/sdk';

/**
 * @fileOverview P2P сервис Waku. Стандарт июля 2026.
 * Работает в основной сети Mainnet Mesh.
 */

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
      console.log('[Waku] Initializing Global Mainnet Mesh (2026 Standard)...');
      
      const node = await createLightNode({ 
        defaultBootstrap: true,
      });
      
      await node.start();
      
      try {
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
    
    // В 2026 обязательно указываем routingInfo (shard)
    const encoder = createEncoder({ 
      contentTopic: topic, 
      ephemeral: true,
      routingInfo: { shard: 0 } as any
    });

    const result = await node.lightPush.send(encoder, {
      payload: new TextEncoder().encode(encryptedPayload)
    });

    return !result?.errors?.length;
  } catch (e) {
    console.error('[Waku] Critical Send Error:', e);
    return false;
  }
}

export async function subscribeToP2P(myId: string, onMessage: (payload: string) => void) {
  try {
    const node = await initWaku();
    const topic = createContentTopic(myId);
    
    const decoder = createDecoder({
      contentTopic: topic,
      routingInfo: { shard: 0 } as any
    });

    const callback = (wakuMessage: any) => {
      if (wakuMessage?.payload) {
        const decoded = new TextDecoder().decode(wakuMessage.payload);
        onMessage(decoded);
      }
    };

    return await node.filter.subscribe([decoder], callback);
  } catch (e) {
    console.error('[Waku] Subscription Failure:', e);
    return null;
  }
}
