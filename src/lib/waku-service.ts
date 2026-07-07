
'use client';

import { createLightNode, Protocols, createEncoder, createDecoder } from '@waku/sdk';
import { wakuDnsDiscovery } from '@waku/dns-discovery';

/**
 * @fileOverview Боевой P2P сервис Waku. Стандарт Июля 2026.
 * Использует DNS Discovery и Sharded Mesh.
 */

let nodeInstance: any = null;
let initPromise: Promise<any> | null = null;

const CLUSTER_ID = 1;

export function createContentTopic(id: string) {
  const safeId = (id || 'default').slice(0, 10);
  return `/web3chat/1/u-${safeId}/proto`;
}

export function getMessageEncoder(contentTopic: string) {
  // В SDK 2026 (v0.0.25+) createEncoder ожидает объект.
  return createEncoder({ 
    contentTopic, 
    ephemeral: true 
  });
}

export function getMessageDecoder(contentTopic: string) {
  // Согласно логам TSC: createDecoder ожидает строку (contentTopic)
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
          (wakuDnsDiscovery as any)([
            "enrtree://AOGECG2SPND25EEFMAJ5WF3KSGJNSGV356DSTL2YVLLZWIV6SAYBM@prod.waku.nodes.status.im"
          ])
        ],
        // Слушаем все шарды кластера 1, чтобы избежать "Pubsub topic not configured"
        shardInfo: {
          clusterId: CLUSTER_ID,
          shards: [0, 1, 2, 3, 4, 5, 6, 7]
        }
      } as any);
      
      await node.start();
      
      const anyNode = node as any;
      const protocols = [Protocols.LightPush, Protocols.Filter];
      
      console.log('[Waku] Waiting for Production Peers (Mainnet Discovery)...');
      
      if (anyNode.waitForRemotePeer) {
        // Увеличиваем таймаут для медленных сетей
        await anyNode.waitForRemotePeer(protocols, 60000).catch(() => {
          console.warn('[Waku] Initial peer discovery is taking longer than expected...');
        });
      }
      
      console.log('[Waku] Node online.');
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

    const callback = (wakuMessage: any) => {
      if (wakuMessage?.payload) {
        const decoded = new TextDecoder().decode(wakuMessage.payload);
        onMessage(decoded);
      }
    };

    const anyNode = node as any;
    
    // КРИТИЧЕСКИЙ БАРЬЕР: Ждем именно Filter пира перед подпиской.
    // Это устраняет ошибку "No peer found to initiate subscription".
    if (anyNode.waitForRemotePeer) {
      console.log('[Waku] Waiting for Filter-capable peer...');
      await anyNode.waitForRemotePeer([Protocols.Filter], 30000);
    }

    console.log('[Waku] Initiating subscription for:', topic);
    return await node.filter.subscribe([decoder], callback);
  } catch (e) {
    console.error('[Waku] Subscription Failure:', e);
    throw e; // Пробрасываем ошибку для обработки в UI компоненте
  }
}
