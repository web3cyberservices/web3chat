'use server';
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
      
      // Wait for peers that support LightPush and Filter protocols
      try {
        await newNode.waitForRemotePeer([Protocols.LightPush, Protocols.Filter], 15000);
      } catch (e) {
        console.warn('Waku: Peer discovery still in progress...');
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
    const contentTopic = `/${APP_NAME}/1/message-${targetId}/proto`;
    
    // Fix: Explicitly pass ephemeral flag and contentTopic to the encoder
    const encoder = (createEncoder as any)(contentTopic, { ephemeral: true });
    const payload = new TextEncoder().encode(encryptedPayload);
    
    // Fix: Explicitly pass contentTopic inside the message object to fix routing errors
    const result = await waku.lightPush.send(encoder, { 
      payload,
      contentTopic: contentTopic 
    });
    
    const res = result as any;
    if (res && res.errors && res.errors.length > 0) {
      console.error('Waku send errors:', res.errors);
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
      // Passing 2 arguments for SDK compatibility
      return (createDecoder as any)(topic, {});
    });

    const unsubscribePromise = waku.filter.subscribe(
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

    const unsubscribe = await unsubscribePromise;

    return (() => {
      if (typeof unsubscribe === 'function') {
        (unsubscribe as Function)();
      } else if (unsubscribe && typeof (unsubscribe as any).unsubscribe === 'function') {
        (unsubscribe as any).unsubscribe();
      }
    });
  } catch (e) {
    console.error('Subscription error:', e);
    return () => {};
  }
}