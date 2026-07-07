import { NextResponse } from 'next/server';

// Глобальное хранилище в оперативной памяти (RAM) для демонстрации.
// В продакшене здесь должна быть база данных.
let vault: { timestamp: number, payload: string }[] = [];

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.payload) return NextResponse.json({ error: 'No payload' }, { status: 400 });

    // Сохраняем зашифрованный пакет
    vault.push({
      timestamp: Date.now(),
      payload: body.payload
    });

    // Бережем ОЗУ: храним только последние 500 пакетов
    if (vault.length > 500) vault = vault.slice(-500);

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const since = Number(searchParams.get('since') || 0);

  // Отдаем только те пакеты, которые клиент еще не видел
  const newMessages = vault.filter(m => m.timestamp > since);
  
  return NextResponse.json({ messages: newMessages });
}
