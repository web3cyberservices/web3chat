
'use client';

import { createLightNode, ReliableChannel } from '@waku/sdk';
import protobuf from 'protobufjs';

/**
 * @fileOverview Сетевой слой Waku Reliable Channel.
 * Использует SDS (Scalable Data Sync) для гарантированной доставки.
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
      console.log('[Waku] Initializing Node with Default Bootstrap...');
      const node = await createLightNode({ defaultBootstrap: true });
      await node.start();
      console.log('[Waku] Node started successfully.');
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
  // Консистентное имя канала для 1:1 чатов
  return [id1, id2].sort().join('-').slice(0, 32);
}

export async function setupReliableChannel(node: any, channelName: string, myId: string) {
  const ct = `/web3chat/1/${channelName}/proto`;
  const encoder = node.createEncoder({ contentTopic: ct });
  const decoder = node.createDecoder({ contentTopic: ct });

  console.log('[Waku] Creating Reliable Channel:', channelName);
  return await ReliableChannel.create(node, channelName, myId, encoder, decoder);
}
