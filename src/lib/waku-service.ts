
'use client';

import { createLightNode, ReliableChannel, Protocols, waitForRemotePeer } from '@waku/sdk';
import protobuf from 'protobufjs';

/**
 * @fileOverview Сетевой слой Waku Reliable Channel.
 * Использует SDS (Scalable Data Sync) для гарантированной доставки и синхронизации.
 */

// Protobuf структура для сообщений
export const ChatDataPacket = new protobuf.Type("ChatDataPacket")
  .add(new protobuf.Field("timestamp", 1, "uint64"))
  .add(new protobuf.Field("sender", 2, "string"))
  .add(new protobuf.Field("message", 3, "string"));

let nodeInstance: any = null;
let initPromise: Promise<any> | null = null;

export async function initWaku() {
  if (nodeInstance) return nodeInstance;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      console.log('[Waku] Initializing Node...');
      // В 2026 используем networkConfig для управления шардами
      const node = await createLightNode({ 
        defaultBootstrap: true,
        networkConfig: {
          clusterId: 1,
          shards: [0, 1, 2, 3]
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

export async function setupReliableChannel(node: any, channelName: string, myId: string) {
  const ct = `/web3chat/1/${channelName}/proto`;
  
  // Создаем энкодер и декодер (объектный синтаксис 2026)
  const encoder = node.createEncoder({ contentTopic: ct });
  const decoder = node.createDecoder({ contentTopic: ct });

  console.log('[Waku] Waiting for Peers (Filter/LightPush)...');
  // Standalone функция ожидания пиров
  await waitForRemotePeer(node, [Protocols.Filter, Protocols.LightPush], 15000).catch(e => {
    console.warn('[Waku] Timeout waiting for peers, but continuing...');
  });

  console.log('[Waku] Creating Reliable Channel:', channelName);
  return await ReliableChannel.create(node, channelName, myId, encoder, decoder);
}
