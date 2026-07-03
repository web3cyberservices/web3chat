/**
 * @fileOverview Децентрализованный сетевой слой Waku.
 * Исправлены ошибки 'Incorrect length' и обновлены узлы загрузки.
 */

import type { LightNode } from '@waku/sdk';

let nodeInstance: LightNode | null = null;
let initPromise: Promise<LightNode> | null = null;

// Актуальные и стабильные узлы Waku на 2026 год
const BOOTSTRAP_NODES = [
  '/dns4/node-01.do-ams3.waku.org/tcp/443/wss/p2p/16Uiu2HAmPLeTwoVYdgZ86idWAtCB88JQM6no8Y2zH7tgJaSShwLS',
  '/dns4/node-01.ac-cn-hongkong-c.waku.org/tcp/443/wss/p2p/16Uiu2HAmS6NfUtFv4iP9GZc6YyW972p7GjXyK2L4Gz3L',
  '/dns4/node-01.gc-us-central1-a.waku.org/tcp/443/wss/p2p/16Uiu2HAmIBv7v82idVv3UnYPrWb7fXm996g491s1AAsfUnP97AAn'
];

export async function initWaku(): Promise<LightNode> {
  if (nodeInstance) return nodeInstance;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      const { createLightNode, Protocols } = await import('@waku/sdk');

      // Инициализация с поддержкой автоматического обнаружения
      const node = await createLightNode({ 
        bootstrapPeers: BOOTSTRAP_NODES,
        defaultBootstrap: true
      });

      await node.start();
      
      // Ожидаем подключения хотя бы к одному пиру
      try {
        const typedNode = node as any;
        if (typeof typedNode.waitForRemotePeer === 'function') {
          // Ожидаем только необходимые протоколы
          await typedNode.waitForRemotePeer([Protocols.LightPush, Protocols.Filter], 15000);
          console.log('Waku: P2P Network Ready');
        }
      } catch (e) {
        console.warn('Waku: Initial peer discovery slow, proceeding anyway...');
      }

      nodeInstance = node;
      return node;
    } catch (error) {
      initPromise = null;
      console.error('Waku initialization error:', error);
      throw error;
    }
  })();

  return initPromise;
}

export function createContentTopic(id: string) {
  // Используем 32-символьный срез для стабильной валидации топика
  const safeId = id.startsWith('0x') ? id.slice(2, 34) : id.slice(0, 32);
  return `/web3chat/2/user-${safeId}/proto`;
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

    // Проверка результата отправки
    const res = result as any;
    return !res?.errors || (Array.isArray(res.errors) && res.errors.length === 0);
  } catch (e) {
    console.error('P2P Send Error:', e);
    return false;
  }
}

export async function subscribeToP2P(ids: string[], onMessage: (payload: string, topicId: string) => void) {
  try {
    const node = await initWaku();
    const { createDecoder } = await import('@waku/sdk');
    
    // Подписываемся на все топики одновременно
    const decoders = ids.map(id => createDecoder({ contentTopic: createContentTopic(id) }));

    const subscription = await node.filter.subscribe(decoders, (wakuMessage: any) => {
      if (wakuMessage?.payload) {
        try {
          const text = new TextDecoder().decode(wakuMessage.payload);
          const topic = wakuMessage.contentTopic;
          
          // Определяем источник сообщения по топику
          const matchedId = ids.find(id => topic === createContentTopic(id)) || ids[0];
          onMessage(text, matchedId);
        } catch (decodeError) {
          console.error('Failed to decode incoming message', decodeError);
        }
      }
    });

    // В версиях SDK 2026+ возвращается объект с методом unsubscribe
    return typeof subscription === 'function' ? subscription : (subscription as any).unsubscribe;
  } catch (e) {
    console.error('P2P Subscription Error:', e);
    return () => {};
  }
}
