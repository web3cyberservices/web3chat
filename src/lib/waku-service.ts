
'use client';

import { createLightNode, Protocols, createEncoder, createDecoder } from '@waku/sdk';
import { wakuDnsDiscovery } from '@waku/dns-discovery';

/**
 * @fileOverview Боевой P2P сервис Waku. Стандарт Июля 2026.
 * Использует DNS Discovery и Sharded Mesh с защитой от race conditions.
 */

let nodeInstance: any = null;
let initPromise: Promise<any> | null = null;

const CLUSTER_ID = 1;

/**
 * Создает топик контента.
 */
export function createContentTopic(id: string) {
  const safeId = (id || 'default').slice(0, 10);
  return `/web3chat/1/u-${safeId}/proto`;
}

/**
 * Возвращает энкодер для отправки сообщений.
 * В SDK 2026 createEncoder ожидает объект конфигурации.
 */
export function getMessageEncoder(contentTopic: string) {
  return createEncoder({ 
    contentTopic, 
    ephemeral: true 
  });
}

/**
 * Возвращает декодер для получения сообщений.
 * В SDK 2026 createDecoder ожидает строку (contentTopic).
 */
export function getMessageDecoder(contentTopic: string) {
  return createDecoder(contentTopic);
}

/**
 * Инициализирует ноду Waku с использованием DNS Discovery (Mainnet).
 */
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
        // Слушаем все шарды кластера 1, чтобы избежать ошибок конфигурации топиков
        shardInfo: {
          clusterId: CLUSTER_ID,
          shards: [0, 1, 2, 3, 4, 5, 6, 7]
        }
      } as any);
      
      await node.start();
      
      const anyNode = node as any;
      
      // Ждем базовых пиров для работы сети
      if (anyNode.waitForRemotePeer) {
        console.log('[Waku] Discovery in progress (Mainnet)...');
        await anyNode.waitForRemotePeer([Protocols.LightPush, Protocols.Filter], 60000);
      }
      
      console.log('[Waku] Node online and peered.');
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

/**
 * Отправляет зашифрованное сообщение через P2P сеть.
 */
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

/**
 * Подписывается на входящие сообщения.
 * Внедрен барьер ожидания пиров Filter для предотвращения ошибок подписки.
 */
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
    if (anyNode.waitForRemotePeer) {
      console.log('[Waku] Waiting for Filter-capable peer to establish subscription...');
      await anyNode.waitForRemotePeer([Protocols.Filter], 30000);
    }

    console.log('[Waku] Initiating subscription for:', topic);
    const subscription = await node.filter.subscribe([decoder], callback);
    return subscription;
  } catch (e) {
    console.error('[Waku] Subscription Failure:', e);
    throw e;
  }
}
