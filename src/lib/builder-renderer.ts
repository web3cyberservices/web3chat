
import { PageBlock } from './builder-store';

/**
 * @fileOverview Generator Engine.
 * Converts No-Code JSON structure into a standalone, SEO-ready Tailwind HTML document.
 */

function escapeHTML(str: string): string {
  if (!str) return '';
  return str.replace(/[&<>"']/g, (m) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[m] as string));
}

function renderBlock(block: PageBlock): string {
  const { type, content, styles } = block;
  const safeTitle = escapeHTML(content.title || '');
  const safeDesc = escapeHTML(content.description || '');
  const safeBtn = escapeHTML(content.buttonText || '');

  switch (type) {
    case 'hero':
      return `
        <section class="${styles.padding} text-center" style="background-color: ${styles.backgroundColor}; color: ${styles.textColor}">
          <div class="max-w-4xl mx-auto px-6">
            <h1 class="text-5xl md:text-6xl font-extrabold tracking-tight">${safeTitle}</h1>
            <p class="mt-6 text-xl opacity-90 leading-relaxed">${safeDesc}</p>
            ${safeBtn ? `<a href="#" class="mt-10 inline-block px-10 py-4 bg-blue-600 text-white font-bold rounded-full shadow-xl hover:scale-105 transition-transform">${safeBtn}</a>` : ''}
          </div>
        </section>
      `;
    case 'features':
      return `
        <section class="${styles.padding}" style="background-color: ${styles.backgroundColor}; color: ${styles.textColor}">
          <div class="max-w-6xl mx-auto px-6">
            <h2 class="text-3xl font-bold text-center">${safeTitle}</h2>
            <p class="text-center mt-4 opacity-80">${safeDesc}</p>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
              <div class="p-8 bg-white/10 rounded-2xl border border-white/20">
                <h3 class="font-bold text-xl">Innovation</h3>
                <p class="mt-2 text-sm opacity-80">Next generation technology built for scale and security.</p>
              </div>
              <div class="p-8 bg-white/10 rounded-2xl border border-white/20">
                <h3 class="font-bold text-xl">Privacy</h3>
                <p class="mt-2 text-sm opacity-80">Your data is yours. We use end-to-end encryption everywhere.</p>
              </div>
              <div class="p-8 bg-white/10 rounded-2xl border border-white/20">
                <h3 class="font-bold text-xl">Speed</h3>
                <p class="mt-2 text-sm opacity-80">Optimized performance for lightning-fast user experiences.</p>
              </div>
            </div>
          </div>
        </section>
      `;
    default:
      return `<!-- Block ${type} not implemented -->`;
  }
}

export function generateFullHTML(blocks: PageBlock[]): string {
  const content = blocks.map(renderBlock).join('\n');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Generated with Web3 Cyber Services Builder</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;800&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'Inter', sans-serif; }
    </style>
</head>
<body class="antialiased">
    ${content}
    <footer class="py-12 bg-gray-900 text-white text-center border-t border-gray-800">
      <p class="text-sm opacity-50">&copy; ${new Date().getFullYear()} Build with Web3 Builder</p>
    </footer>
</body>
</html>
  `;
}
