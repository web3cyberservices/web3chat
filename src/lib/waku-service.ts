import { createLightNode, Protocols, createEncoder, createDecoder, waitForRemotePeer } from '@waku/sdk';
import { wakuDnsDiscovery } from '@waku/dns-discovery';
import protobuf from 'protobufjs';

/**
 * @fileOverview БРОНЕБОЙНЫЙ P2P сервис Waku. Стандарт Июля 2026.
 * Использует DNS + Hardcoded Fallback для обхода блокировок DoH (CORS/AdBlock).
 */

const CLUSTER_ID = 1;
const SHARD_ID = 0;

export const ChatDataPacket = new protobuf.Type("ChatDataPacket")
  .add(new protobuf.Field("timestamp", 1, "uint64"))
  .add(new protobuf.Field("sender", 2, "string"))
  .add(new protobuf.Field("message", 3, "string"));

let nodeInstance: any = null;
let initPromise: Promise<any> | null = null;

export function createContentTopic(id: string) {
  const safeId = (id || 'default').slice(0, 10);
  return `/web3chat/1/u-${safeId}/proto`;
}

export function getMessageEncoder(contentTopic: string) {
  const pubsubTopic = `/waku/2/rs/${CLUSTER_ID}/${SHARD_ID}`;
  return createEncoder({ contentTopic, pubsubTopic, ephemeral: true });
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
      console.log('[Waku] Initializing INDESTRUCTIBLE Production Mesh...');
      
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
      console.log('[Waku] Node Engine Started. Dialing Hardcoded Prod Peers...');

      // ХАКЕРСКИЙ ФОЛЛБЕК: Если DNS заблокирован провайдером, 
      // подключаемся к боевым серверам напрямую по Multiaddr
      const fallbackPeers = [
        "/dns4/node-01.ac-cn-hongkong-c.waku.nodes.status.im/tcp/8000/wss/p2p/16Uiu2HAm4v86YNwGjtBhtSsN4ePC8Eq84HkS7U2WXXE1WjEGAg6s",
        "/dns4/node-01.do-ams3.waku.nodes.status.im/tcp/8000/wss/p2p/16Uiu2HAmPLe7Mzm8TsYUubgCAW1aJoeFScxrCE87TjKU8hsPA1Eb",
        "/dns4/node-01.gc-us-central1-a.waku.nodes.status.im/tcp/8000/wss/p2p/16Uiu2HAmJb2e28qLXxT5kZxVUUoJt72EMzNGXB47Rxx5hw3q4YjS"
      ];

      for (const peer of fallbackPeers) {
        try {
          await node.dial(peer);
          console.log(`[Waku] Fallback connection to ${peer} SUCCESS!`);
        } catch (e) {
          // Игнорируем ошибки диала отдельных пиров
        }
      }

      console.log('[Waku] Waiting for Filter/LightPush protocols...');
      // Ждем пиров через автономную функцию
      await waitForRemotePeer(node, [Protocols.LightPush, Protocols.Filter], 20000).catch(() => {
         console.warn("[Waku] Timeout on waitForRemotePeer, but forcing initialization.");
      });
      
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

    return await node.filter.subscribe([decoder], callback);
  } catch (e) {
    console.error('[Waku] Subscription Failure:', e);
    return null;
  }
}
