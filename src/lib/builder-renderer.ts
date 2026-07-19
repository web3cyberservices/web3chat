import { PageBlock, FontFamily } from './builder-store';

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
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  } else if (hex.length === 7) {
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

  const fontStack = FONT_MAP[styles.fontFamily || 'sans'];
  
  const sizeClass = {
    normal: 'text-2xl md:text-3xl',
    large: 'text-4xl md:text-5xl',
    huge: 'text-6xl md:text-7xl'
  }[styles.fontSize || 'normal'];

  const btnRadiusClass = {
    none: 'rounded-none',
    md: 'rounded-xl',
    full: 'rounded-full'
  }[styles.buttonRadius || 'full'];

  const bgRgba = hexToRgba(styles.backgroundColor, styles.backgroundOpacity ?? 1);
  const borderRadiusStyle = styles.borderRadius ? `border-radius: ${styles.borderRadius};` : '';

  const containerStyle = `min-height: ${styles.minHeight || 'auto'}; ${borderRadiusStyle} background-color: ${bgRgba}; overflow: hidden; position: relative; display: flex; align-items: center; justify-content: center; width: 100%;`;
  
  const bgImageStyle = styles.backgroundImage 
    ? `position: absolute; inset: 0; background-image: url('${styles.backgroundImage}'); background-size: cover; background-position: center; opacity: ${styles.backgroundOpacity ?? 1}; pointer-events: none; z-index: 1;`
    : '';

  const btnStyle = `background-color: ${styles.buttonBgColor}; color: ${styles.buttonTextColor}; font-family: ${FONT_MAP[styles.buttonFontFamily || 'sans']}; transform: translate(${styles.btnX || 0}px, ${styles.btnY || 0}px);`;
  const titleStyle = `color: ${styles.textColor}; font-family: ${fontStack}; transform: translate(${styles.titleX || 0}px, ${styles.titleY || 0}px);`;
  const descStyle = `color: ${styles.textColor}; font-family: ${fontStack}; opacity: 0.85; transform: translate(${styles.descX || 0}px, ${styles.descY || 0}px);`;

  const overlay = styles.backgroundImage ? `<div style="position: absolute; inset: 0; background-color: black; opacity: ${styles.overlayOpacity || 0.5}; z-index: 2; pointer-events: none;"></div>` : '';

  if (type === 'header') {
    return `
      <header id="${id}" style="width: 100%; background-color: ${styles.backgroundColor}; color: ${styles.textColor}; min-height: ${styles.minHeight}; display: flex; align-items: center; justify-content: space-between; padding: 0 40px; font-family: ${fontStack}; ${styles.isSticky ? 'position: sticky; top: 0; z-index: 1000;' : 'position: relative;'} shadow: 0 4px 20px rgba(0,0,0,0.1);">
        <div style="font-weight: 900; font-size: 1.5rem; letter-spacing: -0.05em; ${titleStyle}">${safeTitle}</div>
        <nav style="display: flex; gap: 32px;">
          ${(content.links || []).map(l => `<a href="${l.url}" style="text-decoration: none; color: inherit; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; opacity: 0.8; hover: opacity: 1;">${escapeHTML(l.label)}</a>`).join('')}
        </nav>
      </header>
    `;
  }

  return `
    <section id="${id}" style="${containerStyle}">
      ${bgImageStyle ? `<div style="${bgImageStyle}"></div>` : ''}
      ${overlay}
      <div style="position: relative; z-index: 10; width: 100%; max-width: 1200px; padding: 80px 40px; text-align: center; transform: translate(${styles.translateX || 0}px, ${styles.translateY || 0}px);">
        <h2 class="${sizeClass}" style="font-weight: 900; letter-spacing: -0.02em; line-height: 1.1; margin-bottom: 24px; ${titleStyle}">${safeTitle}</h2>
        <p style="font-size: 1.125rem; line-height: 1.6; max-width: 800px; margin: 0 auto 40px; ${descStyle}">${safeDesc}</p>
        ${safeBtn ? `<a href="${safeBtnUrl}" class="${btnRadiusClass}" style="display: inline-block; padding: 16px 48px; text-decoration: none; font-weight: 800; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.15em; box-shadow: 0 10px 40px rgba(0,0,0,0.2); transition: all 0.3s ease; ${btnStyle}">${safeBtn}</a>` : ''}
      </div>
    </section>
  `;
}

export function generateFullHTML(blocks: PageBlock[]): string {
  const content = blocks.map(renderBlock).join('\n');

  return `
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Web3 Project Export</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&family=Playfair+Display:wght@700&family=JetBrains+Mono&family=Montserrat:wght@400;700;900&family=Oswald:wght@400;700&family=Merriweather:wght@400;700&family=Bebas+Neue&family=Dancing+Script:wght@700&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'Inter', sans-serif; overflow-x: hidden; scroll-behavior: smooth; background-color: #fcfcfc; color: #1a1a1a; margin: 0; }
        header, section, footer { box-sizing: border-box; }
        a:hover { opacity: 0.7; }
        .rounded-full { border-radius: 9999px; }
        .rounded-xl { border-radius: 1rem; }
    </style>
</head>
<body class="antialiased">
    <div style="display: flex; flex-direction: column; min-height: 100vh;">
      ${content}
      <footer style="padding: 60px 40px; background-color: #000; color: #fff; text-align: center; border-top: 1px solid rgba(255,255,255,0.1); margin-top: auto;">
        <p style="font-family: 'JetBrains Mono', monospace; font-size: 10px; opacity: 0.4; letter-spacing: 0.3em; text-transform: uppercase;">&copy; ${new Date().getFullYear()} WEB3 CYBER SERVICES • PRO ENGINE</p>
      </footer>
    </div>
</body>
</html>
  `;
}
