/**
 * @fileOverview Сетевой слой Waku (стандартные протоколы).
 * Использует Filter для получения и Light Push для отправки.
 * 
 * - initWaku - Инициализация ноды Waku в браузере.
 * - getChannelName - Генерация детерминированного имени канала.
 * - setupStandardChannel - Настройка энкодеров и декодеров для чата.
 */

import { createLightNode, Protocols, waitForRemotePeer } from '@waku/sdk';
import protobuf from 'protobufjs';

// Protobuf структура для сообщений
export const ChatDataPacket = new protobuf.Type("ChatDataPacket")
  .add(new protobuf.Field("timestamp", 1, "uint64"))
  .add(new protobuf.Field("sender", 2, "string"))
  .add(new protobuf.Field("message", 3, "string"));

let nodeInstance: any = null;
let initPromise: Promise<any> | null = null;

export async function initWaku() {
  if (typeof window === 'undefined') return null;
  if (nodeInstance) return nodeInstance;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      console.log('[Waku] Initializing Node with Mainnet Config...');
      const node = await createLightNode({ 
        defaultBootstrap: true,
        networkConfig: {
          clusterId: 1,
          shards: [0]
        }
      });
      await node.start();
      console.log('[Waku] Node started.');
      nodeInstance = node;
      return node;
    } catch (error) {
      console.error('[Waku] Initialization Failed:', error);
      initPromise = null;
      throw error;
    }
  })();

  return initPromise;
}

export function getChannelName(id1: string, id2: string) {
  return [id1, id2].sort().join('-').slice(0, 32);
}

export async function setupStandardChannel(node: any, channelName: string) {
  const ct = `/web3chat/1/${channelName}/proto`;
  
  const encoder = node.createEncoder({ contentTopic: ct });
  const decoder = node.createDecoder({ contentTopic: ct });

  console.log('[Waku] Waiting for Peers (Filter/LightPush)...');
  await waitForRemotePeer(node, [Protocols.Filter, Protocols.LightPush], 20000).catch(e => {
    console.warn('[Waku] Peer discovery timeout, proceeding with current peers.');
  });

  return { encoder, decoder, contentTopic: ct };
}
