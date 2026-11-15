import { useRef } from 'react';
import type { Img } from '../../ml/conv';

/** A clickable pixel grid: drag to paint, hold Shift (or use the eraser) to erase. */
export function DrawPad({ img, onChange, erase, highlight }: { img: Img; onChange: (img: Img) => void; erase: boolean; highlight?: { x: number; y: number } }) {
  const down = useRef(false);
  const cell = 11;
  const size = img.size * cell;

  const paint = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = Math.floor(((e.clientX - r.left) / r.width) * img.size);
    const y = Math.floor(((e.clientY - r.top) / r.height) * img.size);
    if (x < 0 || y < 0 || x >= img.size || y >= img.size) return;
    const v = erase || e.shiftKey ? 0 : 1;
    if (img.px[y * img.size + x] === v) return;
    const px = img.px.slice();
    px[y * img.size + x] = v;
    onChange({ size: img.size, px });
  };

  return (
    <svg
      className="draw-pad"
      viewBox={`0 0 ${size} ${size}`}
      onPointerDown={(e) => {
        down.current = true;
        e.currentTarget.setPointerCapture(e.pointerId);
        paint(e);
      }}
      onPointerMove={(e) => down.current && paint(e)}
      onPointerUp={() => (down.current = false)}
    >
      {Array.from(img.px, (v, i) => (
        <rect key={i} x={(i % img.size) * cell} y={Math.floor(i / img.size) * cell} width={cell - 1} height={cell - 1} fill={v ? '#f3f1ec' : '#2b2b2b'} />
      ))}
      {highlight && <rect x={highlight.x * cell - 0.5} y={highlight.y * cell - 0.5} width={cell * 3} height={cell * 3} fill="none" stroke="#ffd166" strokeWidth={2} />}
    </svg>
  );
}
