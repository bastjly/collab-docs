import { getCaretCoordinates } from '@/lib/caret';
import { colorForUser } from '@/lib/cursorColor';


export function RemoteCursorsOverlay({ textareaRef, value, scrollTick, cursors }) {
  const textarea = textareaRef.current;
  if (!textarea) return null;

  void value;
  void scrollTick;

  const scrollTop = textarea.scrollTop;
  const scrollLeft = textarea.scrollLeft;

  return (
    <div
      className="absolute inset-0 overflow-hidden pointer-events-none"
      aria-hidden="true"
    >
      {Object.entries(cursors).map(([userId, { position, name }]) => {
        const { top, left, height } = getCaretCoordinates(textarea, position);
        const color = colorForUser(userId);
        const x = left - scrollLeft;
        const y = top - scrollTop;
        const labelAbove = y >= 16;
        return (
          <div key={userId} style={{ position: 'absolute', top: y, left: x }}>
            <div
              style={{
                position: 'absolute',
                top: labelAbove ? -15 : height + 1,
                left: -1,
                background: color,
                color: 'white',
                fontSize: 10,
                lineHeight: '14px',
                padding: '0 4px',
                borderRadius: 3,
                whiteSpace: 'nowrap',
              }}
            >
              {name || '?'}
            </div>
            <div style={{ position: 'absolute', top: 0, left: 0, width: 2, height, background: color }} />
          </div>
        );
      })}
    </div>
  );
}
