
/**
 * @fileOverview Децентрализованный P2P транспорт на базе Waku SDK.
 * Обеспечивает реальную передачу сообщений через глобальную сеть нод.
 */

import { 
  createLightNode, 
  Protocols, 
  createEncoder, 
  createDecoder,
  type LightNode
} from '@waku/sdk';

const APP_NAME = 'web3-chat-v1';

let node: LightNode | null = null;
let nodePromise: Promise<LightNode> | null = null;

/**
 * Инициализация Waku Light Node.
 * Использует defaultBootstrap для автоматического поиска пиров в сети.
 */
export async function initWaku(): Promise<LightNode> {
  if (node) return node;
  if (nodePromise) return nodePromise;

  nodePromise = (async () => {
    try {
      const newNode = await createLightNode({ 
        defaultBootstrap: true 
      });

      await newNode.start();
      
      // Ждем подключения хотя бы к одному пиру для отправки и получения данных
      await newNode.waitForRemotePeer([Protocols.LightPush, Protocols.Filter]);
      
      node = newNode;
      return newNode;
    } catch (error) {
      console.error('Waku initialization failed:', error);
      nodePromise = null;
      throw error;
    }
  })();

  return nodePromise;
}

/**
 * Отправка сообщения конкретному получателю или в группу.
 */
export async function sendP2PMessage(targetId: string, encryptedPayload: string): Promise<boolean> {
  try {
    const waku = await initWaku();
    const contentTopic = `/${APP_NAME}/1/message-${targetId}/proto`;
    const encoder = createEncoder({ contentTopic });

    const payload = new TextEncoder().encode(encryptedPayload);
    
    const result = await waku.lightPush.send(encoder, { payload });
    
    if (result.errors && result.errors.length > 0) {
      console.error('Waku send errors:', result.errors);
      return false;
    }

    return true;
  } catch (e) {
    console.error('P2P Send Error:', e);
    return false;
  }
}

/**
 * Подписка на входящие сообщения для списка ID (свой ID и ID групп).
 */
export async function subscribeToP2P(
  myIds: string[], 
  onMessage: (payload: string, topicId: string) => void
) {
  const waku = await initWaku();
  
  const decoders = myIds.map(id => 
    createDecoder(`/${APP_NAME}/1/message-${id}/proto`)
  );

  const unsubscribe = await waku.filter.subscribe(
    decoders,
    (wakuMessage) => {
      if (!wakuMessage.payload) return;
      
      try {
        const payload = new TextDecoder().decode(wakuMessage.payload);
        const topicId = wakuMessage.contentTopic.split('message-')[1].split('/')[0];
        onMessage(payload, topicId);
      } catch (e) {
        console.error('Error decoding Waku message:', e);
      }
    }
  );

  return unsubscribe;
}
