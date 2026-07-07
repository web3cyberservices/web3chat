import { createLightNode, Protocols, createEncoder, createDecoder, waitForRemotePeer } from '@waku/sdk';
import { wakuDnsDiscovery } from '@waku/dns-discovery';
import protobuf from 'protobufjs';

/**
 * @fileOverview Боевой P2P сервис Waku. Стандарт Июля 2026.
 * Использует DNS Discovery для подключения к Mainnet и Store для истории.
 */

export const ChatDataPacket = new protobuf.Type("ChatDataPacket")
  .add(new protobuf.Field("timestamp", 1, "uint64"))
  .add(new protobuf.Field("sender", 2, "string"))
  .add(new protobuf.Field("message", 3, "string"));

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
  return createEncoder({ contentTopic, pubsubTopic, ephemeral: false });
}

export function getMessageDecoder(contentTopic: string) {
  const pubsubTopic = `/waku/2/rs/${CLUSTER_ID}/${SHARD_ID}`;
  return createDecoder({ contentTopic, pubsubTopic });
}

export async function initWaku() {
  if (typeof window === 'undefined') return null;
  if (nodeInstance) return nodeInstance;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      console.log('[Waku] Initializing July 2026 Production Mesh...');
      
      const node = await createLightNode({ 
        defaultBootstrap: false, 
        peerDiscovery: [
          wakuDnsDiscovery([
            "enrtree://AOGECG2SPND25EEFMAJ5WF3KSGJNSGV356DSTL2YVLLZWIV6SAYBM@prod.waku.nodes.status.im"
          ])
        ],
        networkConfig: {
          clusterId: CLUSTER_ID,
          shards: [SHARD_ID]
        }
      });
      
      await node.start();
      
      console.log('[Waku] Waiting for Production Peers (Filter, Push, Store)...');
      // Ждем пиров через standalone функцию (Правило 3)
      await waitForRemotePeer(node, [Protocols.LightPush, Protocols.Filter, Protocols.Store], 30000);
      
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
    if (!node) return false;
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

export async function getWakuHistory(targetId: string, onMessage: (payload: string) => void) {
  try {
    const node = await initWaku();
    if (!node || !node.store) return;
    const topic = createContentTopic(targetId);
    const decoder = getMessageDecoder(topic);

    console.log('[Waku] Fetching history from Store...');
    for await (const messagesPage of node.store.queryGenerator([decoder])) {
      for (const msg of messagesPage) {
        if (msg && msg.payload) {
          const decoded = new TextDecoder().decode(msg.payload);
          onMessage(decoded);
        }
      }
    }
  } catch (e) {
    console.error('[Waku] Store Error:', e);
  }
}

export async function subscribeToP2P(myId: string, onMessage: (payload: string) => void) {
  try {
    const node = await initWaku();
    if (!node) return null;
    const topic = createContentTopic(myId);
    const decoder = getMessageDecoder(topic);

    const callback = (wakuMessage: any) => {
      if (wakuMessage?.payload) {
        const decoded = new TextDecoder().decode(wakuMessage.payload);
        onMessage(decoded);
      }
    };

    // Гарантируем наличие пиров перед подпиской
    await waitForRemotePeer(node, [Protocols.Filter], 15000).catch(() => {
        console.warn("[Waku] Filter peer timeout, proceeding.");
    });

    return await node.filter.subscribe([decoder], callback);
  } catch (e) {
    console.error('[Waku] Subscription Failure:', e);
    return null;
  }
}
