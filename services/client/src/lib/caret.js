// Calcule la position pixel d'un index de caractère dans un <textarea>,
// via un div miroir qui réplique le rendu du textarea.
// Coordonnées retournées relatives au content-box (scroll NON soustrait).

// Propriétés de rendu à répliquer du textarea vers le miroir.
const MIRRORED_PROPS = [
  'boxSizing', 'width', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
  'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth',
  'fontStyle', 'fontVariant', 'fontWeight', 'fontStretch', 'fontSize', 'fontFamily',
  'lineHeight', 'letterSpacing', 'wordSpacing', 'textTransform', 'textIndent',
];

let mirror = null;

function getMirror() {
  if (mirror) return mirror;
  mirror = document.createElement('div');
  mirror.setAttribute('aria-hidden', 'true');
  const s = mirror.style;
  s.position = 'absolute';
  s.top = '0';
  s.left = '-9999px';
  s.visibility = 'hidden';
  s.whiteSpace = 'pre-wrap';
  s.wordWrap = 'break-word';
  s.overflow = 'hidden';
  document.body.appendChild(mirror);
  return mirror;
}

export function getCaretCoordinates(textarea, index) {
  if (!textarea) return { top: 0, left: 0, height: 0 };
  const div = getMirror();
  const computed = window.getComputedStyle(textarea);

  for (const prop of MIRRORED_PROPS) {
    div.style[prop] = computed[prop];
  }

  div.textContent = textarea.value.slice(0, index);

  const span = document.createElement('span');
  // Au moins un caractère pour mesurer, même en fin de texte.
  span.textContent = textarea.value.slice(index) || '.';
  div.appendChild(span);

  const lineHeight = parseFloat(computed.lineHeight) || parseFloat(computed.fontSize) * 1.2;
  const coords = {
    top: span.offsetTop + parseFloat(computed.borderTopWidth),
    left: span.offsetLeft + parseFloat(computed.borderLeftWidth),
    height: lineHeight,
  };

  div.removeChild(span);
  return coords;
}
