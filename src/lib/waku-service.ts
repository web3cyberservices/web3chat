import { createLightNode, Protocols, createEncoder, createDecoder } from '@waku/sdk';

/**
 * @fileOverview P2P сервис Waku. Стандарт Июля 2026.
 * Исправлена ошибка pubsubTopic и ETARGET.
 */

let nodeInstance: any = null;
let initPromise: Promise<any> | null = null;

// Константы сети 2026
const CLUSTER_ID = 1;
const SHARD_ID = 0;

export function createContentTopic(id: string) {
  const safeId = (id || 'default').slice(0, 10);
  return `/web3chat/1/u-${safeId}/proto`;
}

export function getMessageEncoder(contentTopic: string) {
  return createEncoder({ 
    contentTopic, 
    ephemeral: true,
    pubsubTopic: `/waku/2/rs/${CLUSTER_ID}/${SHARD_ID}`
  });
}

export function getMessageDecoder(contentTopic: string) {
  return createDecoder({
    contentTopic,
    pubsubTopic: `/waku/2/rs/${CLUSTER_ID}/${SHARD_ID}`
  });
}

export async function initWaku() {
  if (nodeInstance) return nodeInstance;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      console.log('[Waku] Initializing July 2026 Mesh (Sharded)...');
      
      const node = await createLightNode({ 
        defaultBootstrap: true,
        shardInfo: {
          clusterId: CLUSTER_ID,
          shards: [SHARD_ID]
        }
      });
      
      await node.start();
      
      try {
        await node.waitForRemotePeer([Protocols.LightPush, Protocols.Filter], 15000);
        console.log('[Waku] Connected to Global Mesh Shard 0.');
      } catch (e) {
        console.warn('[Waku] Peer discovery is slow, continuing in background...');
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

    // В SDK 2026 фильтр принимает массив декодеров. 
    // Явное указание pubsubTopic в decoder решает ошибку undefined.pubsubTopic.
    return await node.filter.subscribe([decoder], callback);
  } catch (e) {
    console.error('[Waku] Subscription Failure:', e);
    return null;
  }
}
