
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
  soft: '0 4px 15px rgba(0,0,0,0.3)',
  medium: '0 8px 30px rgba(0,0,0,0.5)',
  hard: '0 12px 50px rgba(0,0,0,0.8)'
};

const BOX_SHADOW_MAP = {
  none: 'none',
  soft: '0 15px 35px -5px rgba(0,0,0,0.25)',
  medium: '0 25px 60px -10px rgba(0,0,0,0.4)',
  hard: '0 40px 100px -15px rgba(0,0,0,0.6)'
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

function renderBlock(block: PageBlock, isLast: boolean, isFirstContent: boolean, headerHeight: string = '0px', headerOverlay: boolean = false): string {
  const { type, content, styles, id } = block;
  const safeTitle = escapeHTML(content.title || '');
  const safeDesc = escapeHTML(content.description || '');
  const safeBtn = escapeHTML(content.buttonText || '');
  const safeBtnUrl = escapeHTML(content.buttonUrl || '#');

  const bgRgba = hexToRgba(styles.backgroundColor, styles.backgroundOpacity ?? 1);
  const borderRadiusStyle = styles.borderRadius ? `border-radius: ${styles.borderRadius};` : '';
  const borderStyle = `${styles.borderWidth || '0px'} solid ${styles.borderColor || 'transparent'}`;
  const glowStyle = styles.borderGlow ? `box-shadow: 0 0 ${styles.borderGlowStrength || 30}px ${styles.borderColor || styles.textColor};` : 'none';

  if (type === 'header') {
    const position = styles.isOverlay ? 'absolute' : 'relative';
    return `
      <header id="${id}" style="width: 100%; flex-shrink: 0; background-color: ${bgRgba}; color: ${styles.textColor}; min-height: ${styles.minHeight}; border: ${borderStyle}; ${glowStyle !== 'none' ? glowStyle : ''} display: flex; align-items: center; justify-content: space-between; padding: 0 50px; font-family: ${FONT_MAP[styles.fontFamily]}; position: ${position}; top: 0; left: 0; z-index: 1000; ${borderRadiusStyle}">
        <div style="font-weight: 900; font-size: 2rem; letter-spacing: -0.05em; color: ${styles.textColor};">${safeTitle}</div>
        <nav style="display: flex; gap: 40px;">
          ${(content.links || []).map(l => `<a href="${l.url}" style="text-decoration: none; color: inherit; font-size: 0.8rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.3em; opacity: 0.7; transition: opacity 0.3s;">${escapeHTML(l.label)}</a>`).join('')}
        </nav>
      </header>
    `;
  }

  const fontSizeValue = styles.fontSize === 'huge' ? '6rem' : styles.fontSize === 'large' ? '4.5rem' : '2.5rem';
  const btnRadiusValue = styles.buttonRadius === 'full' ? '9999px' : styles.buttonRadius === 'md' ? '2rem' : '0px';
  
  const marginTop = (isFirstContent && headerOverlay) ? `margin-top: -${headerHeight};` : '';
  const containerStyle = `min-height: ${styles.minHeight || 'auto'}; ${borderRadiusStyle} background-color: ${bgRgba}; border: ${borderStyle}; ${glowStyle !== 'none' ? glowStyle : ''} overflow: visible; position: relative; display: flex; align-items: center; justify-content: center; width: 100%; flex-shrink: 0; ${isLast ? 'flex-grow: 1;' : ''} ${marginTop}`;
  
  const bgImageStyle = styles.backgroundImage 
    ? `position: absolute; inset: 0; background-image: url('${styles.backgroundImage}'); background-size: cover; background-position: center; opacity: ${styles.backgroundOpacity ?? 1}; pointer-events: none; z-index: 1;`
    : '';

  const overlay = styles.backgroundImage ? `<div style="position: absolute; inset: 0; background-color: black; opacity: ${styles.overlayOpacity || 0.5}; z-index: 2; pointer-events: none;"></div>` : '';

  // Title Effects
  const titleGlow = styles.titleBorderGlow ? `0 0 ${styles.titleBorderGlowStrength || 20}px ${styles.titleBorderColor || styles.titleColor || styles.textColor}` : 'none';
  const titleShadowVal = TEXT_SHADOW_MAP[styles.titleShadow || 'none'];
  const titleTextShadow = titleGlow !== 'none' ? `${titleGlow}${titleShadowVal !== 'none' ? `, ${titleShadowVal}` : ''}` : titleShadowVal;

  const titleStyle = `color: ${styles.titleColor || styles.textColor}; font-family: ${FONT_MAP[styles.titleFont || styles.fontFamily]}; font-size: ${fontSizeValue}; font-weight: 900; letter-spacing: -0.04em; line-height: 1.1; margin-bottom: 40px; transform: translate(${styles.titleX}px, ${styles.titleY}px); opacity: ${styles.titleOpacity ?? 1}; -webkit-text-stroke: ${styles.titleBorderWidth || '0px'} ${styles.titleBorderColor || 'transparent'}; text-shadow: ${titleTextShadow};`;

  // Desc Effects
  const descGlow = styles.descBorderGlow ? `0 0 ${styles.descBorderGlowStrength || 20}px ${styles.descBorderColor || styles.descColor || styles.textColor}` : 'none';
  const descShadowVal = TEXT_SHADOW_MAP[styles.descShadow || 'none'];
  const descTextShadow = descGlow !== 'none' ? `${descGlow}${descShadowVal !== 'none' ? `, ${descShadowVal}` : ''}` : descShadowVal;

  const descStyle = `color: ${styles.descColor || styles.textColor}; font-family: ${FONT_MAP[styles.descFont || styles.fontFamily]}; font-size: 1.5rem; line-height: 1.6; max-width: 900px; margin: 0 auto 60px; transform: translate(${styles.descX}px, ${styles.descY}px); opacity: ${styles.descOpacity ?? 0.85}; -webkit-text-stroke: ${styles.descBorderWidth || '0px'} ${styles.descBorderColor || 'transparent'}; text-shadow: ${descTextShadow};`;

  // Button Container Effects
  const btnContainerGlow = styles.buttonBorderGlow ? `0 0 ${styles.buttonBorderGlowStrength || 40}px ${styles.buttonBorderColor || styles.buttonBgColor}` : 'none';
  const btnContainerShadowVal = BOX_SHADOW_MAP[styles.buttonShadow || 'none'];
  const btnBoxShadow = btnContainerGlow !== 'none' ? `${btnContainerGlow}${btnContainerShadowVal !== 'none' ? `, ${btnContainerShadowVal}` : ''}` : btnContainerShadowVal;

  // Button Text Effects
  const btnTextGlow = styles.buttonTextBorderGlow ? `0 0 ${styles.buttonTextBorderGlowStrength || 15}px ${styles.buttonTextBorderColor || styles.buttonTextColor}` : 'none';
  const btnTextShadowVal = TEXT_SHADOW_MAP[styles.buttonTextShadow || 'none'];
  const btnTextShadow = btnTextGlow !== 'none' ? `${btnTextGlow}${btnTextShadowVal !== 'none' ? `, ${btnTextShadowVal}` : ''}` : btnTextShadowVal;

  const btnStyle = `background-color: ${styles.buttonBgColor}; color: ${styles.buttonTextColor}; font-family: ${FONT_MAP[styles.buttonFontFamily || 'sans']}; border-radius: ${btnRadiusValue}; display: inline-block; padding: 25px 80px; text-decoration: none; font-weight: 900; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.3em; transform: translate(${styles.btnX}px, ${styles.btnY}px); opacity: ${styles.buttonOpacity ?? 1}; border: ${styles.buttonBorderWidth || '0px'} solid ${styles.buttonBorderColor || 'transparent'}; box-shadow: ${btnBoxShadow}; -webkit-text-stroke: ${styles.buttonTextBorderWidth || '0px'} ${styles.buttonTextBorderColor || 'transparent'}; text-shadow: ${btnTextShadow}; transition: all 0.3s ease;`;

  return `
    <section id="${id}" style="${containerStyle}">
      ${bgImageStyle ? `<div style="${bgImageStyle}"></div>` : ''}
      ${overlay}
      <div style="position: relative; z-index: 10; width: 100%; max-width: 1400px; padding: 120px 50px; text-align: center;">
        <h2 style="${titleStyle}">${safeTitle}</h2>
        <p style="${descStyle}">${safeDesc}</p>
        ${safeBtn ? `<a href="${safeBtnUrl}" style="${btnStyle}">${safeBtn}</a>` : ''}
      </div>
    </section>
  `;
}

export function generateFullHTML(blocks: PageBlock[]): string {
  const headers = blocks.filter(b => b.type === 'header');
  const footers = blocks.filter(b => b.type === 'footer');
  const contentBlocks = blocks.filter(b => b.type !== 'header' && b.type !== 'footer');
  
  const activeHeader = headers[0];
  const headerHeight = activeHeader?.styles.minHeight || '0px';
  const headerOverlay = activeHeader?.styles.isOverlay || false;

  let html = '';
  
  headers.forEach(h => {
    html += renderBlock(h, false, false);
  });

  contentBlocks.forEach((b, i) => {
    html += renderBlock(b, i === contentBlocks.length - 1, i === 0, headerHeight, headerOverlay);
  });

  footers.forEach(f => {
    html += renderBlock(f, false, false);
  });

  return `
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Synthesis Web3 Project</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&family=Playfair+Display:wght@700&family=JetBrains+Mono&family=Montserrat:wght@400;700;900&family=Oswald:wght@400;700&family=Merriweather:wght@400;700&family=Bebas+Neue&family=Dancing+Script:wght@700&display=swap" rel="stylesheet">
    <style>
        * { box-sizing: border-box; }
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
        main {
          flex-grow: 1;
          display: flex;
          flex-direction: column;
          width: 100%;
        }
        a { transition: all 0.3s ease; }
        a:hover { opacity: 0.95; transform: translateY(-2px); }
        
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: rgba(0,0,0,0.2); }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
    </style>
</head>
<body class="antialiased">
    <main>
      ${html}
    </main>
    ${footers.length === 0 ? `
      <footer style="padding: 100px 50px; background-color: #010101; color: #fff; text-align: center; border-top: 1px solid rgba(255,255,255,0.05); flex-shrink: 0;">
        <div style="font-family: 'JetBrains Mono', monospace; font-size: 11px; opacity: 0.3; letter-spacing: 0.5em; text-transform: uppercase;">
          &copy; ${new Date().getFullYear()} WEB3 CYBER SERVICES • THE SOVEREIGN STANDARD
        </div>
      </footer>
    ` : ''}
</body>
</html>
  `;
}
