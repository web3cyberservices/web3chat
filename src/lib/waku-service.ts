/**
 * @fileOverview Децентрализованный сетевой слой Waku (v2.0 2026 Edition).
 * Оптимизирован для работы через WSS в защищенных средах.
 */

import type { LightNode } from '@waku/sdk';

let nodeInstance: LightNode | null = null;
let initPromise: Promise<LightNode> | null = null;

// Стабильные DNS-адреса узлов Waku для 2026 года
const PRODUCTION_NODES = [
  '/dns4/node-01.do-ams3.waku.org/tcp/443/wss/p2p/16Uiu2HAmPLeTwoVYdgZ86idWAtCB88JQM6no8Y2zH7tgJaSShwLS'
];

export async function initWaku(): Promise<LightNode> {
  if (nodeInstance) return nodeInstance;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      const { createLightNode, Protocols } = await import('@waku/sdk');

      const node = await createLightNode({ 
        bootstrapPeers: PRODUCTION_NODES,
        defaultBootstrap: true
      });

      await node.start();
      
      // FIX 1 & 2: Дожидаемся подключения пиров только для необходимых протоколов
      const typedNode = node as any;
      if (typeof typedNode.waitForRemotePeer === 'function') {
        try {
          // Ждем только LightPush и Filter. Store часто отсутствует на публичных нодах.
          await typedNode.waitForRemotePeer([Protocols.LightPush, Protocols.Filter], 15000);
          console.log('Waku: Connected to active peers');
        } catch (e) {
          console.warn('Waku: Peer discovery timeout, continuing in background...');
        }
      }

      nodeInstance = node;
      return node;
    } catch (error) {
      initPromise = null;
      console.error('Waku Engine Failure:', error);
      throw error;
    }
  })();

  return initPromise;
}

export function createContentTopic(id: string) {
  return `/web3chat/1/u-${id.slice(0, 10)}/proto`;
}

export async function sendP2PMessage(targetId: string, encryptedPayload: string): Promise<boolean> {
  try {
    const node = await initWaku();
    const { createEncoder } = await import('@waku/sdk');
    
    const contentTopic = createContentTopic(targetId);
    const encoder = createEncoder({ contentTopic });

    const result: any = await node.lightPush.send(encoder, {
      payload: new TextEncoder().encode(encryptedPayload),
    });

    // Безопасная проверка результата для SDK 2026
    return !result?.errors || (Array.isArray(result.errors) && result.errors.length === 0);
  } catch (e) {
    console.error('P2P Send Error:', e);
    return false;
  }
}

export async function subscribeToP2P(targetId: string, onMessage: (payload: string) => void) {
  try {
    const node = await initWaku();
    const { createDecoder } = await import('@waku/sdk');
    
    const contentTopic = createContentTopic(targetId);
    const decoder = createDecoder(contentTopic);

    // В SDK 2.0 subscribe возвращает объект управления подпиской
    const subscription: any = await node.filter.subscribe([decoder], (wakuMessage: any) => {
      if (wakuMessage?.payload) {
        const text = new TextDecoder().decode(wakuMessage.payload);
        onMessage(text);
      }
    });

    return () => {
      if (typeof subscription === 'function') {
        subscription();
      } else if (subscription?.unsubscribe) {
        subscription.unsubscribe();
      }
    };
  } catch (e) {
    console.error('P2P Subscription Failed:', e);
    return () => {};
  }
}
