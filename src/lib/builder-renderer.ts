import { PageBlock, FontFamily } from './builder-store';

/**
 * @fileOverview Generator Engine.
 * Converts No-Code JSON structure into a standalone, SEO-ready Tailwind HTML document.
 */

const FONT_MAP: Record<FontFamily, string> = {
  sans: 'Inter, sans-serif',
  serif: '"Playfair Display", serif',
  mono: '"JetBrains Mono", monospace',
  montserrat: 'Montserrat, sans-serif',
  oswald: 'Oswald, sans-serif',
  merriweather: 'Merriweather, serif',
  bebas: '"Bebas Neue", cursive',
  dancing: '"Dancing Script", cursive',
  inter: 'Inter, sans-serif'
};

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

function hexToRgba(hex: string, opacity: number): string {
  let r = 0, g = 0, b = 0;
  // 3 digits
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  }
  // 6 digits
  else if (hex.length === 7) {
    r = parseInt(hex.substring(1, 3), 16);
    g = parseInt(hex.substring(3, 5), 16);
    b = parseInt(hex.substring(5, 7), 16);
  }
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

function renderBlock(block: PageBlock): string {
  const { type, content, styles, id } = block;
  const safeTitle = escapeHTML(content.title || '');
  const safeDesc = escapeHTML(content.description || '');
  const safeBtn = escapeHTML(content.buttonText || '');
  const safeBtnUrl = escapeHTML(content.buttonUrl || '#');
  const safeLogoUrl = escapeHTML(content.logoUrl || '');

  const fontStack = FONT_MAP[styles.fontFamily || 'sans'];
  const btnFontStack = FONT_MAP[styles.buttonFontFamily || styles.fontFamily || 'sans'];

  const sizeClass = {
    normal: 'text-4xl md:text-5xl',
    large: 'text-5xl md:text-6xl',
    huge: 'text-7xl md:text-8xl'
  }[styles.fontSize || 'normal'];

  const btnRadiusClass = {
    none: 'rounded-none',
    md: 'rounded-xl',
    full: 'rounded-full'
  }[styles.buttonRadius || 'full'];

  const bgRgba = hexToRgba(styles.backgroundColor, styles.backgroundOpacity ?? 1);
  const borderRadiusStyle = `border-radius: ${styles.borderRadius || '0px'};`;

  const containerStyle = `min-height: ${styles.minHeight || 'auto'}; ${borderRadiusStyle} overflow: hidden;`;
  const bgLayerStyle = styles.backgroundImage 
    ? `background-image: url('${styles.backgroundImage}'); background-size: cover; background-position: center; ${borderRadiusStyle}`
    : `background-color: ${bgRgba}; ${borderRadiusStyle}`;

  const btnStyle = `background-color: ${styles.buttonBgColor}; color: ${styles.buttonTextColor}; font-family: ${btnFontStack}; transform: translate(${styles.btnX || 0}px, ${styles.btnY || 0}px);`;
  const titleStyle = `color: ${styles.textColor}; font-family: ${fontStack}; transform: translate(${styles.titleX || 0}px, ${styles.titleY || 0}px);`;
  const descStyle = `color: ${styles.textColor}; font-family: ${fontStack}; opacity: 0.9; transform: translate(${styles.descX || 0}px, ${styles.descY || 0}px);`;

  const overlay = styles.backgroundImage ? `<div class="absolute inset-0 bg-black" style="opacity: ${styles.overlayOpacity || 0.4}; ${borderRadiusStyle}"></div>` : '';
  
  const contentGroupStyle = `transform: translate(${styles.translateX || 0}px, ${styles.translateY || 0}px);`;

  switch (type) {
    case 'header':
      return `
        <header id="${id}" class="relative flex flex-col justify-center ${styles.padding}" style="${containerStyle} color: ${styles.textColor};">
          <div class="absolute inset-0 -z-10" style="${bgLayerStyle}"></div>
          <div class="relative max-w-6xl mx-auto px-6 flex items-center justify-between z-10 w-full" style="${contentGroupStyle}">
            <div class="flex items-center gap-3">
              ${safeLogoUrl ? `<img src="${safeLogoUrl}" alt="Logo" class="h-8 w-auto object-contain" style="${titleStyle}">` : `<div class="text-2xl font-black tracking-tighter" style="${titleStyle}">${safeTitle}</div>`}
            </div>
            <nav class="hidden md:flex items-center gap-8">
              ${content.links?.map(l => `<a href="${l.url}" class="text-sm font-medium hover:opacity-70 transition-opacity" style="font-family: ${fontStack}">${escapeHTML(l.label)}</a>`).join('')}
            </nav>
          </div>
        </header>
      `;
    case 'hero':
    case 'features':
    case 'pricing':
    case 'contacts':
      return `
        <section id="${id}" class="relative flex flex-col justify-center ${styles.padding}" style="${containerStyle}">
          <div class="absolute inset-0 -z-10" style="${bgLayerStyle}"></div>
          ${overlay}
          <div class="relative max-w-4xl mx-auto px-6 text-center z-10 flex flex-col gap-8 w-full" style="${contentGroupStyle}">
            <h1 class="${sizeClass} font-extrabold tracking-tight leading-tight transition-transform" style="${titleStyle}">${safeTitle}</h1>
            <p class="text-xl leading-relaxed max-w-2xl mx-auto transition-transform" style="${descStyle}">${safeDesc}</p>
            ${safeBtn ? `<div class="mt-4"><a href="${safeBtnUrl}" class="inline-block px-12 py-5 ${btnRadiusClass} font-bold shadow-2xl hover:scale-105 transition-transform" style="${btnStyle}">${safeBtn}</a></div>` : ''}
          </div>
        </section>
      `;
    case 'footer':
      return `
        <footer id="${id}" class="relative flex flex-col justify-center ${styles.padding}" style="${containerStyle} color: ${styles.textColor};">
          <div class="absolute inset-0 -z-10" style="${bgLayerStyle}"></div>
          <div class="relative max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-10 z-10 w-full" style="${contentGroupStyle}">
            <div>
              <div class="text-xl font-bold mb-4" style="${titleStyle}">${safeTitle}</div>
              <p class="opacity-60 text-sm max-w-xs" style="${descStyle}">${safeDesc}</p>
            </div>
            <div class="flex flex-wrap gap-x-10 gap-y-4 md:justify-end">
               ${content.links?.map(l => `<a href="${l.url}" class="text-sm opacity-80 hover:opacity-100 transition-opacity" style="font-family: ${fontStack}">${escapeHTML(l.label)}</a>`).join('')}
            </div>
          </div>
        </footer>
      `;
    default:
      return `<!-- Block ${type} -->`;
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
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&family=Playfair+Display:wght@700&family=JetBrains+Mono&family=Montserrat:wght@400;700;900&family=Oswald:wght@400;700&family=Merriweather:wght@400;700&family=Bebas+Neue&family=Dancing+Script:wght@700&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'Inter', sans-serif; overflow-x: hidden; scroll-behavior: smooth; }
        section, header, footer { position: relative; }
    </style>
</head>
<body class="antialiased">
    ${content}
    <footer class="py-16 bg-black text-white text-center border-t border-white/10">
      <p class="text-[10px] opacity-40 font-mono tracking-widest uppercase">&copy; ${new Date().getFullYear()} WEB3 CYBER SERVICES BUILDER</p>
    </footer>
</body>
</html>
  `;
}
