
import { createLightNode, Protocols, createEncoder, createDecoder } from '@waku/sdk';
import { wakuDnsDiscovery } from '@waku/dns-discovery';

/**
 * @fileOverview Боевой P2P сервис Waku. Стандарт Июля 2026.
 * Использует DNS Discovery для подключения к Mainnet.
 */

let nodeInstance: any = null;
let initPromise: Promise<any> | null = null;

const CLUSTER_ID = 1;
const SHARD_ID = 0;

export function createContentTopic(id: string) {
  const safeId = (id || 'default').slice(0, 10);
  return `/web3chat/1/u-${safeId}/proto`;
}

export function getMessageEncoder(contentTopic: string) {
  const pubsubTopic = `/waku/2/rs/${CLUSTER_ID}/${SHARD_ID}`;
  // В SDK 2026 для энкодера передаем объект конфигурации
  return createEncoder({ 
    contentTopic, 
    pubsubTopic,
    ephemeral: true 
  });
}

export function getMessageDecoder(contentTopic: string) {
  // Исправление: SDK 2026 (v0.0.25) createDecoder ожидает строку contentTopic
  return createDecoder(contentTopic);
}

export async function initWaku() {
  if (nodeInstance) return nodeInstance;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      console.log('[Waku] Initializing July 2026 Production Mesh...');
      
      const node = await createLightNode({ 
        defaultBootstrap: false, 
        peerDiscovery: [
          // Исправление: в SDK 2026 wakuDnsDiscovery ожидает массив строк напрямую
          (wakuDnsDiscovery as any)([
            "enrtree://AOGECG2SPND25EEFMAJ5WF3KSGJNSGV356DSTL2YVLLZWIV6SAYBM@prod.waku.nodes.status.im"
          ])
        ],
        shardInfo: {
          clusterId: CLUSTER_ID,
          shards: [SHARD_ID]
        }
      } as any);
      
      await node.start();
      
      const anyNode = node as any;
      const protocols = [Protocols.LightPush, Protocols.Filter];
      
      console.log('[Waku] Waiting for Production Peers (Filter & LightPush)...');
      
      // Хирургический барьер ожидания пиров
      if (anyNode.waitForRemotePeer) {
        await anyNode.waitForRemotePeer(protocols, 30000);
      } else if (anyNode.waitForPeers) {
        await anyNode.waitForPeers(protocols, 30000);
      }
      
      console.log('[Waku] Connected to Global Mainnet Shard 0.');
      nodeInstance = node;
      return node;
    } catch (error) {
      console.error('[Waku] Mainnet Connection Failed:', error);
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

    const anyNode = node as any;
    // Блокируем выполнение подписки до появления пиров
    if (anyNode.waitForRemotePeer) {
      await anyNode.waitForRemotePeer([Protocols.Filter], 15000).catch(() => {});
    }

    // В SDK 2026 подписка принимает массив декодеров
    return await node.filter.subscribe([decoder], callback);
  } catch (e) {
    console.error('[Waku] Subscription Failure:', e);
    return null;
  }
}
