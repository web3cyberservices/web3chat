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

const TEXT_SHADOW_MAP = {
  none: 'none',
  soft: '0 0 15px rgba(0,0,0,0.3)',
  medium: '0 0 30px rgba(0,0,0,0.5)',
  hard: '0 0 50px rgba(0,0,0,0.7)'
};

const BOX_SHADOW_MAP = {
  none: 'none',
  soft: '0 0 35px -5px rgba(0,0,0,0.2)',
  medium: '0 0 60px -10px rgba(0,0,0,0.35)',
  hard: '0 0 100px -15px rgba(0,0,0,0.5)'
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
  if (!hex || hex === 'transparent') return 'transparent';
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

  const bgRgba = hexToRgba(styles.backgroundColor, styles.backgroundOpacity ?? 1);
  const borderRadiusStyle = styles.borderRadius ? `border-radius: ${styles.borderRadius};` : '';
  const borderStyle = `${styles.borderWidth || '0px'} solid ${styles.borderColor || 'transparent'}`;
  
  const blockGlow = styles.borderGlow ? `0 0 ${styles.borderGlowStrength || 30}px ${styles.borderColor || styles.textColor}` : 'none';

  if (type === 'header') {
    const position = styles.isOverlay ? 'absolute' : 'relative';
    return `
      <header id="${id}" style="width: 100%; background-color: ${bgRgba}; color: ${styles.textColor}; min-height: ${styles.minHeight}; border: ${borderStyle}; box-shadow: ${blockGlow}; display: flex; align-items: center; justify-content: space-between; padding: 0 50px; font-family: ${FONT_MAP[styles.fontFamily]}; position: ${position}; top: 0; left: 0; z-index: 1000; ${borderRadiusStyle}">
        <div style="font-weight: 900; font-size: 1.5rem; letter-spacing: -0.05em; color: ${styles.textColor};">${safeTitle}</div>
        <nav style="display: flex; gap: 40px;">
          ${(content.links || []).map(l => `<a href="${l.url}" style="text-decoration: none; color: inherit; font-size: 0.75rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.2em; opacity: 0.7;">${escapeHTML(l.label)}</a>`).join('')}
        </nav>
      </header>
    `;
  }

  const fontSizeValue = styles.fontSize === 'huge' ? '6rem' : styles.fontSize === 'large' ? '4.5rem' : '2.5rem';
  const btnRadiusValue = styles.buttonRadius === 'full' ? '9999px' : styles.buttonRadius === 'md' ? '2rem' : '0px';
  
  const containerStyle = `min-height: ${styles.minHeight || 'auto'}; ${borderRadiusStyle} background-color: ${bgRgba}; border: ${borderStyle}; box-shadow: ${blockGlow}; overflow: hidden; position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; width: 100%; ${isLast ? 'flex-grow: 1;' : ''}`;
  
  const bgImageStyle = styles.backgroundImage 
    ? `position: absolute; inset: 0; background-image: url('${styles.backgroundImage}'); background-size: cover; background-position: center center; background-repeat: no-repeat; opacity: ${styles.backgroundOpacity ?? 1}; pointer-events: none; z-index: 1;`
    : '';

  const overlay = (styles.backgroundImage && styles.overlayOpacity !== undefined) ? `<div style="position: absolute; inset: 0; background-color: black; opacity: ${styles.overlayOpacity}; z-index: 2; pointer-events: none;"></div>` : '';

  const titleShadow = TEXT_SHADOW_MAP[styles.titleShadow || 'none'];
  const titleGlow = styles.titleBorderGlow ? `0 0 ${styles.titleBorderGlowStrength || 20}px ${styles.titleBorderColor || styles.titleColor || styles.textColor}` : 'none';
  const titleCombinedShadow = titleGlow !== 'none' ? `${titleGlow}${titleShadow !== 'none' ? `, ${titleShadow}` : ''}` : titleShadow;

  const descShadow = TEXT_SHADOW_MAP[styles.descShadow || 'none'];
  const descGlow = styles.descBorderGlow ? `0 0 ${styles.descBorderGlowStrength || 20}px ${styles.descBorderColor || styles.descColor || styles.textColor}` : 'none';
  const descCombinedShadow = descGlow !== 'none' ? `${descGlow}${descShadow !== 'none' ? `, ${descShadow}` : ''}` : descShadow;

  const btnContainerShadow = BOX_SHADOW_MAP[styles.buttonShadow || 'none'];
  const btnContainerGlow = styles.buttonBorderGlow ? `0 0 ${styles.buttonBorderGlowStrength || 40}px ${styles.buttonBorderColor || styles.buttonBgColor}` : 'none';
  const btnCombinedShadow = btnContainerGlow !== 'none' ? `${btnContainerGlow}${btnContainerShadow !== 'none' ? `, ${btnContainerShadow}` : ''}` : btnContainerShadow;

  const btnTextShadow = TEXT_SHADOW_MAP[styles.buttonTextShadow || 'none'];
  const btnTextGlow = styles.buttonTextBorderGlow ? `0 0 ${styles.buttonTextBorderGlowStrength || 15}px ${styles.buttonTextBorderColor || styles.buttonTextColor}` : 'none';
  const btnTextCombinedShadow = btnTextGlow !== 'none' ? `${btnTextGlow}${btnTextShadow !== 'none' ? `, ${btnTextShadow}` : ''}` : btnTextShadow;

  return `
    <section id="${id}" style="${containerStyle}">
      ${bgImageStyle ? `<div style="${bgImageStyle}"></div>` : ''}
      ${overlay}
      <div style="position: relative; z-index: 10; width: 100%; padding: 120px 50px; text-align: center;">
        <h2 style="color: ${styles.titleColor || styles.textColor}; font-family: ${FONT_MAP[styles.titleFont || styles.fontFamily]}; font-size: ${fontSizeValue}; font-weight: 900; letter-spacing: -0.04em; line-height: 1.1; margin-bottom: 40px; transform: translate(${styles.titleX}px, ${styles.titleY}px); opacity: ${styles.titleOpacity ?? 1}; -webkit-text-stroke: ${styles.titleBorderWidth || '0px'} ${styles.titleBorderColor || 'transparent'}; text-shadow: ${titleCombinedShadow};">${safeTitle}</h2>
        <p style="color: ${styles.descColor || styles.textColor}; font-family: ${FONT_MAP[styles.descFont || styles.fontFamily]}; font-size: 1.5rem; line-height: 1.6; max-width: 900px; margin: 0 auto 60px; transform: translate(${styles.descX}px, ${styles.descY}px); opacity: ${styles.descOpacity ?? 0.85}; -webkit-text-stroke: ${styles.descBorderWidth || '0px'} ${styles.descBorderColor || 'transparent'}; text-shadow: ${descCombinedShadow};">${safeDesc}</p>
        ${safeBtn ? `<a href="${safeBtnUrl}" style="background-color: ${styles.buttonBgColor}; color: ${styles.buttonTextColor}; font-family: ${FONT_MAP[styles.buttonFontFamily || 'sans']}; border-radius: ${btnRadiusValue}; display: inline-block; padding: 25px 80px; text-decoration: none; font-weight: 900; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.3em; transform: translate(${styles.btnX}px, ${styles.btnY}px); opacity: ${styles.buttonOpacity ?? 1}; border: ${styles.buttonBorderWidth || '0px'} solid ${styles.buttonBorderColor || 'transparent'}; box-shadow: ${btnCombinedShadow}; -webkit-text-stroke: ${styles.buttonTextBorderWidth || '0px'} ${styles.buttonTextBorderColor || 'transparent'}; text-shadow: ${btnTextCombinedShadow};">${safeBtn}</a>` : ''}
      </div>
    </section>
  `;
}

export function generateFullHTML(blocks: PageBlock[]): string {
  const headers = blocks.filter(b => b.type === 'header');
  const footers = blocks.filter(b => b.type === 'footer');
  const contentBlocks = blocks.filter(b => b.type !== 'header' && b.type !== 'footer');
  
  let html = '';
  headers.forEach(h => { html += renderBlock(h, false); });
  contentBlocks.forEach((b, i) => { html += renderBlock(b, i === contentBlocks.length - 1); });
  footers.forEach(f => { html += renderBlock(f, false); });

  return `
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Synthesis Web3 Project</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&family=Playfair+Display:wght@700&family=JetBrains+Mono&family=Montserrat:wght@400;700;900&family=Oswald:wght@400;700&family=Merriweather:wght@400;700&family=Bebas+Neue&family=Dancing+Script:wght@700&display=swap" rel="stylesheet">
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { 
          height: 100%; 
          background-color: #020204; 
          color: #ffffff; 
          font-family: 'Inter', sans-serif;
        }
        body {
          display: flex;
          flex-direction: column;
          min-height: 100dvh;
          overflow-x: hidden;
        }
        main {
          flex: 1;
          display: flex;
          flex-direction: column;
          width: 100%;
          position: relative;
        }
        a { transition: all 0.3s ease; }
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: rgba(0,0,0,0.2); }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
    </style>
</head>
<body>
    <main>
      ${html}
    </main>
    ${footers.length === 0 ? `
      <footer style="padding: 40px; background-color: #010101; text-align: center; border-top: 1px solid rgba(255,255,255,0.05); shrink-0;">
        <div style="font-family: 'JetBrains Mono', monospace; font-size: 10px; opacity: 0.3; letter-spacing: 0.4em; text-transform: uppercase;">
          &copy; ${new Date().getFullYear()} WEB3 CYBER SERVICES • THE SOVEREIGN STANDARD
        </div>
      </footer>
    ` : ''}
</body>
</html>
  `;
}
