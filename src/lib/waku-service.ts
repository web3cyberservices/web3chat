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
 */
export function getMessageEncoder(contentTopic: string) {
  return createEncoder({ 
    contentTopic, 
    ephemeral: true 
  });
}

/**
 * Возвращает декодер для получения сообщений.
 */
export function getMessageDecoder(contentTopic: string) {
  // В SDK 2026 createDecoder принимает строку contentTopic.
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
      console.log('[Waku] Initializing July 2026 Production Mesh (DNS Discovery)...');
      
      const node = await createLightNode({ 
        defaultBootstrap: false, 
        peerDiscovery: [
          wakuDnsDiscovery([
            "enrtree://AOGECG2SPND25EEFMAJ5WF3KSGJNSGV356DSTL2YVLLZWIV6SAYBM@prod.waku.nodes.status.im"
          ])
        ],
        shardInfo: {
          clusterId: CLUSTER_ID,
          shards: [0, 1, 2, 3, 4, 5, 6, 7]
        }
      } as any);
      
      await node.start();
      
      const anyNode = node as any;
      
      // Ждем базовых пиров для работы сети
      if (anyNode.waitForRemotePeer) {
        console.log('[Waku] Waiting for remote peers (LightPush & Filter)...');
        await anyNode.waitForRemotePeer([Protocols.LightPush, Protocols.Filter], 45000);
      }
      
      console.log('[Waku] Node online and peered with Mainnet.');
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
 * Подписывается на входящие сообщения с механизмом повторных попыток.
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
    
    // КРИТИЧЕСКИЙ БАРЬЕР: Ждем именно Filter пира
    if (anyNode.waitForRemotePeer) {
      await anyNode.waitForRemotePeer([Protocols.Filter], 30000);
    }

    console.log('[Waku] Initiating subscription for:', topic);
    
    // Цикл повторных попыток для исключения ошибки "No peer found"
    let subscription;
    let attempts = 3;
    while (attempts > 0) {
      try {
        subscription = await node.filter.subscribe([decoder], callback);
        if (subscription) break;
      } catch (e: any) {
        if (e.message?.includes('No peer found') && attempts > 1) {
          console.warn('[Waku] Subscription attempt failed (no peer), retrying in 5s...');
          attempts--;
          await new Promise(resolve => setTimeout(resolve, 5000));
          continue;
        }
        throw e;
      }
    }
    
    return subscription;
  } catch (e) {
    console.error('[Waku] Subscription Failure:', e);
    throw e;
  }
}