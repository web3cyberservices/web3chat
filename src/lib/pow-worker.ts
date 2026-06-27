/**
 * Web Worker для вычисления Proof-of-Work.
 * Выполняет тяжелые хэш-вычисления в фоновом потоке, не блокируя UI.
 */
self.onmessage = async (e: MessageEvent) => {
  const { payload, difficulty } = e.data;
  const target = '0'.repeat(difficulty);
  const encoder = new TextEncoder();
  let nonce = 0;

  try {
    while (true) {
      const data = encoder.encode(payload + nonce);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      if (hashHex.startsWith(target)) {
        self.postMessage({ nonce, hash: hashHex });
        break;
      }
      nonce++;

      // Периодическая проверка, не нужно ли прервать цикл (опционально)
      if (nonce % 2000 === 0) {
        // Даем браузеру "вздохнуть" в воркере, хотя он и так в фоне
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }
  } catch (error) {
    self.postMessage({ error: 'PoW calculation failed' });
  }
};
