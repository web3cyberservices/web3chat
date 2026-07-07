
import { createLightNode, Protocols, createEncoder, createDecoder } from '@waku/sdk';

/**
 * @fileOverview P2P сервис Waku. Стандарт Июля 2026 (Sharded Mesh).
 */

let nodeInstance: any = null;
let initPromise: Promise<any> | null = null;

// Константы сети 2026 (Sharded Mesh)
const CLUSTER_ID = 1;
const SHARD_ID = 0;

export function createContentTopic(id: string) {
  const safeId = (id || 'default').slice(0, 10);
  return `/web3chat/1/u-${safeId}/proto`;
}

export function getMessageEncoder(contentTopic: string) {
  const pubsubTopic = `/waku/2/rs/${CLUSTER_ID}/${SHARD_ID}`;
  return createEncoder({
    contentTopic,
    ephemeral: true,
    pubsubTopic
  });
}

export function getMessageDecoder(contentTopic: string) {
  const pubsubTopic = `/waku/2/rs/${CLUSTER_ID}/${SHARD_ID}`;
  // В v0.0.25+ топик передается строкой первым аргументом
  return createDecoder(contentTopic, pubsubTopic);
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
        // Гибкое ожидание пиров (совместимость API 2026)
        const anyNode = node as any;
        const protocols = [Protocols.LightPush, Protocols.Filter];
        
        if (anyNode.waitForRemotePeer) {
          await anyNode.waitForRemotePeer(protocols, 15000);
        } else if (anyNode.waitForPeers) {
          await anyNode.waitForPeers(protocols, 15000);
        }
        
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

    if (!decoder || !node.filter) {
      throw new Error('Filter or Decoder not initialized');
    }

    const callback = (wakuMessage: any) => {
      if (wakuMessage?.payload) {
        const decoded = new TextDecoder().decode(wakuMessage.payload);
        onMessage(decoded);
      }
    };

    // Подписка через массив декодеров (Стандарт 2026)
    return await node.filter.subscribe([decoder], callback);
  } catch (e) {
    console.error('[Waku] Subscription Failure:', e);
    return null;
  }
}
