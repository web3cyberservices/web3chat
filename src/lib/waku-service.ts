
/**
 * @fileOverview Decentralized P2P transport powered by Waku SDK.
 * Optimized for Waku v1.x LightNode protocols.
 */

import { 
  createLightNode, 
  Protocols, 
  createEncoder, 
  createDecoder,
  type LightNode
} from '@waku/sdk';

const APP_NAME = 'web3-chat-v2';

let node: LightNode | null = null;
let nodePromise: Promise<LightNode> | null = null;

export async function initWaku(): Promise<LightNode> {
  if (node) return node;
  if (nodePromise) return nodePromise;

  nodePromise = (async () => {
    try {
      const newNode = await createLightNode({ 
        defaultBootstrap: true 
      });

      await newNode.start();
      
      const nodeAsAny = newNode as any;
      const waitMethod = nodeAsAny.waitForRemotePeer || nodeAsAny.waitForConnectedPeer;
      
      if (typeof waitMethod === 'function') {
        try {
          await waitMethod.call(newNode, [Protocols.LightPush, Protocols.Filter]);
        } catch (e) {
          console.warn('Waku: Network handshake partial. Proceeding.');
        }
      }
      
      node = newNode;
      return newNode;
    } catch (error) {
      console.error('Waku init failed:', error);
      nodePromise = null;
      throw error;
    }
  })();

  return nodePromise;
}

export async function sendP2PMessage(targetId: string, encryptedPayload: string): Promise<boolean> {
  try {
    const waku = await initWaku();
    const topic = `/${APP_NAME}/1/message-${targetId}/proto`;
    
    // Using any cast to bypass version-specific routingInfo requirements and constructor overloads
    const encoder = (createEncoder as any)({ contentTopic: topic });
    const payload = new TextEncoder().encode(encryptedPayload);
    
    const result = await waku.lightPush.send(encoder, { payload });
    
    const res = result as any;
    if (res && res.errors && res.errors.length > 0) {
      console.error('Waku push errors:', res.errors);
      return false;
    }

    return true;
  } catch (e) {
    console.error('P2P Send Error:', e);
    return false;
  }
}

export async function subscribeToP2P(
  myIds: string[], 
  onMessage: (payload: string, topicId: string) => void
): Promise<() => void> {
  try {
    const waku = await initWaku();
    
    if (!waku.filter) {
      console.error('Waku Filter protocol not available');
      return () => {};
    }

    const decoders = myIds.map(id => {
      const topic = `/${APP_NAME}/1/message-${id}/proto`;
      return (createDecoder as any)({ contentTopic: topic });
    });

    const unsubscribe = await waku.filter.subscribe(
      decoders,
      (wakuMessage) => {
        if (!wakuMessage.payload || !wakuMessage.contentTopic) return;
        
        try {
          const payload = new TextDecoder().decode(wakuMessage.payload);
          const parts = wakuMessage.contentTopic.split('message-');
          if (parts.length > 1) {
            const topicId = parts[1].split('/')[0];
            onMessage(payload, topicId);
          }
        } catch (e) {
          console.error('P2P Decode Error:', e);
        }
      }
    );

    return (unsubscribe as any);
  } catch (e) {
    console.error('Subscription error:', e);
    return () => {};
  }
}
