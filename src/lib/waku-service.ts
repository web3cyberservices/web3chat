'use server';
import { createLightNode, Protocols, createEncoder, createDecoder } from '@waku/sdk';

/**
 * @fileOverview P2P сервис Waku. Стандарт июля 2026 (Mainnet).
 */

let nodeInstance: any = null;
let initPromise: Promise<any> | null = null;

export async function createContentTopic(id: string) {
  const safeId = (id || 'default').slice(0, 10);
  return `/web3chat/1/u-${safeId}/proto`;
}

export async function initWaku() {
  if (nodeInstance) return nodeInstance;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      console.log('[Waku] Connecting to Mainnet Mesh (Standard 2026)...');
      const node = await createLightNode({ defaultBootstrap: true });
      await node.start();
      
      try {
        // Кастинг к any для обхода внутренних ограничений типов SDK 2026
        await (node as any).waitForRemotePeer([Protocols.LightPush, Protocols.Filter], 15000);
        console.log('[Waku] Connected to Global Mesh (Port 443).');
      } catch (e) {
        console.warn('[Waku] Peer discovery timeout. Node will sync in background.');
      }
      
      nodeInstance = node;
      return node;
    } catch (error) {
      initPromise = null;
      throw error;
    }
  })();

  return initPromise;
}

export async function sendP2PMessage(targetId: string, encryptedPayload: string): Promise<boolean> {
  try {
    const node = await initWaku();
    const topic = await createContentTopic(targetId);
    
    // Используем any для обхода строгого интерфейса EncoderOptions
    const encoder = createEncoder({ 
      contentTopic: topic, 
      ephemeral: true,
      routingInfo: topic 
    } as any);

    const result = await node.lightPush.send(encoder, {
      payload: new TextEncoder().encode(encryptedPayload)
    });

    return !result?.errors?.length;
  } catch (e) {
    console.error('[Waku] Send Error:', e);
    return false;
  }
}

export async function subscribeToP2P(myId: string, onMessage: (payload: string) => void) {
  try {
    const node = await initWaku();
    const topic = await createContentTopic(myId);
    
    // createDecoder требует 2 аргумента в актуальной версии SDK 2026
    const decoder = createDecoder(topic, {} as any);

    const callback = (wakuMessage: any) => {
      if (wakuMessage?.payload) {
        const decoded = new TextDecoder().decode(wakuMessage.payload);
        onMessage(decoded);
      }
    };

    const trySubscribe = async (): Promise<any> => {
      try {
        const sub = await node.filter.subscribe([decoder], callback);
        console.log(`[Waku] Filter established for topic: ${topic}`);
        return sub;
      } catch (e) {
        return new Promise(resolve => setTimeout(() => resolve(trySubscribe()), 5000));
      }
    };

    return await trySubscribe();
  } catch (e) {
    console.error('[Waku] Subscription Error:', e);
    return null;
  }
}
