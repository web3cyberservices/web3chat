
/**
 * @fileOverview Сетевой слой Waku (Стандарт Июля 2026).
 * Реализовано: DNS Discovery, networkConfig, standalone waitForRemotePeer.
 */

import { createLightNode, Protocols, createEncoder, createDecoder, waitForRemotePeer } from '@waku/sdk';
import { wakuDnsDiscovery } from '@waku/dns-discovery';
import protobuf from 'protobufjs';

const CLUSTER_ID = 1;
const SHARD_ID = 0;

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
      console.log('[Waku] Booting P2P Node (Mainnet 2026)...');
      const node = await createLightNode({ 
        libp2p: {
          peerDiscovery: [
            wakuDnsDiscovery([
              "enrtree://AOGECG2SPND25EEFMAJ5WF3KSGJNSGV356DSTL2YVLLZWIV6SAYBM@prod.waku.nodes.status.im"
            ])
          ]
        },
        networkConfig: {
          clusterId: CLUSTER_ID,
          shards: [SHARD_ID]
        }
      });
      
      await node.start();
      
      console.log('[Waku] Waiting for Filter & LightPush peers...');
      await waitForRemotePeer(node, [Protocols.Filter, Protocols.LightPush], 25000);
      
      console.log('[Waku] Mesh Active.');
      nodeInstance = node;
      return node;
    } catch (error) {
      console.error('[Waku] Connection Failed:', error);
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
  
  const encoder = createEncoder({ contentTopic: ct, ephemeral: true });
  const decoder = createDecoder({ contentTopic: ct });

  return { encoder, decoder, contentTopic: ct };
}
