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
  const safeBtnUrl = escapeHTML(content.buttonUrl || '#');

  const fontClass = {
    sans: 'font-sans',
    serif: 'font-serif',
    mono: 'font-mono'
  }[styles.fontFamily || 'sans'];

  const sizeClass = {
    normal: 'text-5xl',
    large: 'text-6xl',
    huge: 'text-8xl'
  }[styles.fontSize || 'normal'];

  const btnRadiusClass = {
    none: 'rounded-none',
    md: 'rounded-xl',
    full: 'rounded-full'
  }[styles.buttonRadius || 'full'];

  const btnFontClass = {
    sans: 'font-sans',
    serif: 'font-serif',
    mono: 'font-mono'
  }[styles.buttonFontFamily || 'sans'];

  const bgStyle = styles.backgroundImage 
    ? `background-image: url('${styles.backgroundImage}'); background-size: cover; background-position: center;`
    : `background-color: ${styles.backgroundColor};`;

  const btnStyle = `background-color: ${styles.buttonBgColor}; color: ${styles.buttonTextColor};`;

  const overlay = styles.backgroundImage ? `<div class="absolute inset-0 bg-black/40"></div>` : '';
  
  const contentTransformStyle = `transform: translate(${styles.translateX || 0}px, ${styles.translateY || 0}px);`;

  switch (type) {
    case 'header':
      return `
        <header class="relative ${styles.padding} ${fontClass}" style="${bgStyle} color: ${styles.textColor};">
          <div class="relative max-w-6xl mx-auto px-6 flex items-center justify-between z-10" style="${contentTransformStyle}">
            <div class="text-2xl font-black tracking-tighter">${safeTitle}</div>
            <nav class="hidden md:flex items-center gap-8">
              ${content.links?.map(l => `<a href="${l.url}" class="text-sm font-medium hover:opacity-70 transition-opacity">${escapeHTML(l.label)}</a>`).join('')}
            </nav>
          </div>
        </header>
      `;
    case 'hero':
      return `
        <section class="relative ${styles.padding} ${fontClass}" style="${bgStyle} color: ${styles.textColor};">
          ${overlay}
          <div class="relative max-w-4xl mx-auto px-6 text-center z-10" style="${contentTransformStyle}">
            <h1 class="${sizeClass} font-extrabold tracking-tight leading-tight">${safeTitle}</h1>
            <p class="mt-8 text-xl opacity-90 leading-relaxed max-w-2xl mx-auto">${safeDesc}</p>
            ${safeBtn ? `<div class="mt-12"><a href="${safeBtnUrl}" class="inline-block px-12 py-5 ${btnRadiusClass} ${btnFontClass} font-bold shadow-2xl hover:scale-105 transition-all" style="${btnStyle}">${safeBtn}</a></div>` : ''}
          </div>
        </section>
      `;
    case 'features':
      return `
        <section class="relative ${styles.padding} ${fontClass}" style="${bgStyle} color: ${styles.textColor};">
          ${overlay}
          <div class="relative max-w-6xl mx-auto px-6 z-10" style="${contentTransformStyle}">
            <h2 class="text-4xl font-bold text-center mb-16">${safeTitle}</h2>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-10">
              <div class="p-10 bg-white/10 backdrop-blur-md rounded-3xl border border-white/20">
                <h3 class="font-bold text-2xl mb-4">Innovation</h3>
                <p class="opacity-80 leading-relaxed">Next generation technology built for scale and security in the modern web era.</p>
              </div>
              <div class="p-10 bg-white/10 backdrop-blur-md rounded-3xl border border-white/20">
                <h3 class="font-bold text-2xl mb-4">Privacy</h3>
                <p class="opacity-80 leading-relaxed">Your data remains yours. We use advanced end-to-end encryption protocols.</p>
              </div>
              <div class="p-10 bg-white/10 backdrop-blur-md rounded-3xl border border-white/20">
                <h3 class="font-bold text-2xl mb-4">Speed</h3>
                <p class="opacity-80 leading-relaxed">Optimized performance guarantees lightning-fast user experiences globally.</p>
              </div>
            </div>
            ${safeBtn ? `<div class="mt-12 text-center"><a href="${safeBtnUrl}" class="inline-block px-12 py-5 ${btnRadiusClass} ${btnFontClass} font-bold shadow-2xl hover:scale-105 transition-all" style="${btnStyle}">${safeBtn}</a></div>` : ''}
          </div>
        </section>
      `;
    case 'footer':
      return `
        <footer class="relative ${styles.padding} ${fontClass}" style="${bgStyle} color: ${styles.textColor};">
          <div class="relative max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-10 z-10" style="${contentTransformStyle}">
            <div>
              <div class="text-xl font-bold mb-4">${safeTitle}</div>
              <p class="opacity-60 text-sm max-w-xs">${safeDesc}</p>
            </div>
            <div class="flex flex-wrap gap-x-10 gap-y-4 md:justify-end">
               ${content.links?.map(l => `<a href="${l.url}" class="text-sm opacity-80 hover:opacity-100 transition-opacity">${escapeHTML(l.label)}</a>`).join('')}
            </div>
          </div>
        </footer>
      `;
    default:
      return `<!-- Block ${type} rendered as empty container -->`;
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
    <title>Web3 Builder Export</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;800;900&family=Playfair+Display:wght@700&family=JetBrains+Mono&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'Inter', sans-serif; overflow-x: hidden; }
        .font-serif { font-family: 'Playfair Display', serif; }
        .font-mono { font-family: 'JetBrains Mono', monospace; }
    </style>
</head>
<body class="antialiased">
    ${content}
    <footer class="py-16 bg-black text-white text-center border-t border-white/10">
      <p class="text-sm opacity-40 font-mono tracking-widest">&copy; ${new Date().getFullYear()} WEB3 CYBER SERVICES BUILDER</p>
    </footer>
</body>
</html>
  `;
}
