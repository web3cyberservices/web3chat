
/**
 * @fileOverview Децентрализованный сетевой слой Waku (v2.0 2026 Edition).
 * Оптимизирован для работы через WSS в защищенных средах.
 */

import type { LightNode } from '@waku/sdk';

let nodeInstance: LightNode | null = null;
let initPromise: Promise<LightNode> | null = null;

// Стабильные DNS-адреса узлов Waku
const PRODUCTION_NODES = [
  '/dns4/node-01.do-ams3.waku.org/tcp/443/wss/p2p/16Uiu2HAmPLeTwoVYdgZ86idWAtCB88JQM6no8Y2zH7tgJaSShwLS'
];

export async function initWaku(): Promise<LightNode> {
  if (nodeInstance) return nodeInstance;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      const { createLightNode, Protocols, DefaultPubsubTopic } = await import('@waku/sdk');

      // Создаем узел. Если bootstrapPeers вызывает ошибку, используем стандартные настройки
      let node;
      try {
        node = await createLightNode({ 
          bootstrapPeers: PRODUCTION_NODES,
          defaultBootstrap: true
        });
      } catch (e) {
        console.warn('Waku: Custom nodes failed, using default bootstrap...', e);
        node = await createLightNode({ defaultBootstrap: true });
      }

      await node.start();
      
      // Асинхронное ожидание пиров
      node.waitForRemotePeer([Protocols.LightPush, Protocols.Filter, Protocols.Store], 10000)
        .catch(() => console.warn('Waku: Still searching for peers...'));

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

    const result = await node.lightPush.send(encoder, {
      payload: new TextEncoder().encode(encryptedPayload),
    });

    return !result.errors || result.errors.length === 0;
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

    const { unsubscribe } = await node.filter.subscribe([decoder], (wakuMessage) => {
      if (wakuMessage?.payload) {
        const text = new TextDecoder().decode(wakuMessage.payload);
        onMessage(text);
      }
    });

    return unsubscribe;
  } catch (e) {
    console.error('P2P Subscription Failed:', e);
    return () => {};
  }
}
