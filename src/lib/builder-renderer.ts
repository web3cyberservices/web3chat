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

function renderBlock(block: PageBlock, isLast: boolean): string {
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
    md: 'rounded-[1.5rem]',
    full: 'rounded-full'
  }[styles.buttonRadius || 'full'];

  const bgRgba = hexToRgba(styles.backgroundColor, styles.backgroundOpacity ?? 1);
  const borderRadiusStyle = styles.borderRadius ? `border-radius: ${styles.borderRadius};` : '';

  const containerStyle = `min-height: ${styles.minHeight || 'auto'}; ${borderRadiusStyle} background-color: ${bgRgba}; overflow: hidden; position: relative; display: flex; align-items: center; justify-content: center; width: 100%; flex-shrink: 0; ${isLast ? 'flex-grow: 1;' : ''}`;
  
  const bgImageStyle = styles.backgroundImage 
    ? `position: absolute; inset: 0; background-image: url('${styles.backgroundImage}'); background-size: cover; background-position: center; opacity: ${styles.backgroundOpacity ?? 1}; pointer-events: none; z-index: 1;`
    : '';

  const titleFinalStyle = `color: ${styles.titleColor || styles.textColor}; font-family: ${FONT_MAP[styles.titleFont || styles.fontFamily]}; transform: translate(${styles.titleX || 0}px, ${styles.titleY || 0}px); opacity: ${styles.titleOpacity ?? 1};`;
  const descFinalStyle = `color: ${styles.descColor || styles.textColor}; font-family: ${FONT_MAP[styles.descFont || styles.fontFamily]}; transform: translate(${styles.descX || 0}px, ${styles.descY || 0}px); opacity: ${styles.descOpacity ?? 0.85};`;
  const btnFinalStyle = `background-color: ${styles.buttonBgColor}; color: ${styles.buttonTextColor}; font-family: ${FONT_MAP[styles.buttonFontFamily || 'sans']}; transform: translate(${styles.btnX || 0}px, ${styles.btnY || 0}px); opacity: ${styles.buttonOpacity ?? 1};`;

  const overlay = styles.backgroundImage ? `<div style="position: absolute; inset: 0; background-color: black; opacity: ${styles.overlayOpacity || 0.5}; z-index: 2; pointer-events: none;"></div>` : '';

  if (type === 'header') {
    return `
      <header id="${id}" style="width: 100%; flex-shrink: 0; background-color: ${styles.backgroundColor}; color: ${styles.textColor}; min-height: ${styles.minHeight}; display: flex; align-items: center; justify-content: space-between; padding: 0 40px; font-family: ${fontStack}; ${styles.isSticky ? 'position: sticky; top: 0; z-index: 1000;' : 'position: relative;'} box-shadow: 0 4px 30px rgba(0,0,0,0.15);">
        <div style="font-weight: 900; font-size: 1.75rem; letter-spacing: -0.05em; color: ${styles.textColor};">${safeTitle}</div>
        <nav style="display: flex; gap: 40px;">
          ${(content.links || []).map(l => `<a href="${l.url}" style="text-decoration: none; color: inherit; font-size: 0.7rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.2em; opacity: 0.7; transition: opacity 0.3s;">${escapeHTML(l.label)}</a>`).join('')}
        </nav>
      </header>
    `;
  }

  return `
    <section id="${id}" class="builder-section" style="${containerStyle}">
      ${bgImageStyle ? `<div style="${bgImageStyle}"></div>` : ''}
      ${overlay}
      <div style="position: relative; z-index: 10; width: 100%; max-width: 1200px; padding: 100px 40px; text-align: center;">
        <h2 class="${sizeClass}" style="font-weight: 900; letter-spacing: -0.03em; line-height: 1; margin-bottom: 30px; transition: transform 0.2s ease; ${titleFinalStyle}">${safeTitle}</h2>
        <p style="font-size: 1.25rem; line-height: 1.6; max-width: 850px; margin: 0 auto 50px; transition: transform 0.2s ease; ${descFinalStyle}">${safeDesc}</p>
        ${safeBtn ? `<a href="${safeBtnUrl}" class="${btnRadiusClass}" style="display: inline-block; padding: 20px 60px; text-decoration: none; font-weight: 900; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.2em; box-shadow: 0 20px 60px rgba(0,0,0,0.3); transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); ${btnFinalStyle}">${safeBtn}</a>` : ''}
      </div>
    </section>
  `;
}

export function generateFullHTML(blocks: PageBlock[]): string {
  const headers = blocks.filter(b => b.type === 'header').map(b => renderBlock(b, false)).join('\n');
  const footers = blocks.filter(b => b.type === 'footer').map(b => renderBlock(b, false)).join('\n');
  const contentBlocks = blocks.filter(b => b.type !== 'header' && b.type !== 'footer');
  
  const content = contentBlocks.map((b, i) => renderBlock(b, i === contentBlocks.length - 1)).join('\n');

  return `
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Web3 Synthesis Project</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&family=Playfair+Display:wght@700&family=JetBrains+Mono&family=Montserrat:wght@400;700;900&family=Oswald:wght@400;700&family=Merriweather:wght@400;700&family=Bebas+Neue&family=Dancing+Script:wght@700&display=swap" rel="stylesheet">
    <style>
        :root {
          color-scheme: dark light;
        }
        body { 
          font-family: 'Inter', sans-serif; 
          overflow-x: hidden; 
          scroll-behavior: smooth; 
          background-color: #020204; 
          color: #ffffff; 
          margin: 0; 
          display: flex; 
          flex-direction: column; 
          min-height: 100dvh; 
        }
        header, section, footer { box-sizing: border-box; }
        main {
          flex-grow: 1;
          display: flex;
          flex-direction: column;
          width: 100%;
        }
        a:hover { opacity: 0.6; }
        .rounded-full { border-radius: 9999px; }
        .rounded-xl { border-radius: 1.5rem; }
        
        /* Custom scrollbar */
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: rgba(0,0,0,0.1); }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
    </style>
</head>
<body class="antialiased">
    ${headers}
    <main>
      ${content}
    </main>
    ${footers || `
      <footer style="padding: 80px 40px; background-color: #010101; color: #fff; text-align: center; border-top: 1px solid rgba(255,255,255,0.05); flex-shrink: 0;">
        <div style="font-family: 'JetBrains Mono', monospace; font-size: 10px; opacity: 0.3; letter-spacing: 0.4em; text-transform: uppercase;">
          &copy; ${new Date().getFullYear()} WEB3 CYBER SERVICES • THE SOVEREIGN STANDARD
        </div>
      </footer>
    `}
</body>
</html>
  `;
}