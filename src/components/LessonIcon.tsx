/** Line-art pictogram for each lesson, drawn in the current text colour. */
export function LessonIcon({ id }: { id: string }) {
  const s = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'square' as const };
  const dot = (x: number, y: number, r = 3.5, key?: string | number) => <circle key={key ?? `${x}-${y}`} cx={x} cy={y} r={r} fill="currentColor" />;
  const ring = (x: number, y: number, r = 5, key?: string | number) => <circle key={key ?? `r${x}-${y}`} cx={x} cy={y} r={r} {...s} />;
  let body: React.ReactNode;
  switch (id) {
    case 'linear-regression':
      body = (
        <>
          <path d="M10 90 V10 M10 90 H90" {...s} />
          <path d="M14 80 L88 22" {...s} />
          {[[22, 66], [30, 76], [40, 58], [50, 60], [58, 44], [66, 50], [76, 30], [82, 38]].map(([x, y]) => dot(x, y))}
        </>
      );
      break;
    case 'logistic-regression':
      body = (
        <>
          <path d="M10 90 H90 M10 22 H90" {...s} strokeDasharray="4 4" />
          <path d="M10 86 C40 86 42 50 50 50 C58 50 60 24 90 24" {...s} />
          {[[18, 90], [28, 90], [38, 90], [62, 22], [72, 22], [82, 22]].map(([x, y]) => dot(x, y))}
        </>
      );
      break;
    case 'knn':
      body = (
        <>
          <circle cx="50" cy="50" r="26" {...s} strokeDasharray="5 4" />
          {ring(50, 50, 6)}
          {[[36, 40], [62, 36], [58, 66], [20, 20], [84, 80]].map(([x, y]) => dot(x, y))}
          {[[40, 64], [80, 22], [18, 76]].map(([x, y]) => ring(x, y, 4))}
          <path d="M50 50 L36 40 M50 50 L62 36 M50 50 L58 66 M50 50 L40 64" {...s} strokeWidth={1} />
        </>
      );
      break;
    case 'decision-tree':
      body = (
        <>
          <rect x="38" y="8" width="24" height="16" {...s} />
          <rect x="12" y="44" width="24" height="16" {...s} />
          <rect x="64" y="44" width="24" height="16" {...s} />
          <path d="M50 24 V34 H24 V44 M50 34 H76 V44 M24 60 V72 H12 V80 M24 72 H36 V80 M76 60 V80" {...s} />
          {dot(12, 84)}{dot(36, 84)}{ring(76, 85, 4)}
        </>
      );
      break;
    case 'svm':
      body = (
        <>
          <path d="M14 86 L86 14" {...s} />
          <path d="M8 70 L70 8 M30 92 L92 30" {...s} strokeDasharray="4 4" />
          {[[20, 30], [30, 18], [16, 46], [38, 34]].map(([x, y]) => dot(x, y))}
          {[[64, 70], [80, 58], [70, 84], [86, 76]].map(([x, y]) => ring(x, y, 4))}
        </>
      );
      break;
    case 'neural-network': {
      const L = [[20, 30], [20, 70], [50, 20], [50, 50], [50, 80], [80, 50]];
      body = (
        <>
          {[0, 1].flatMap((a) => [2, 3, 4].map((b) => <line key={`${a}${b}`} x1={L[a][0]} y1={L[a][1]} x2={L[b][0]} y2={L[b][1]} {...s} strokeWidth={1} />))}
          {[2, 3, 4].map((b) => <line key={`o${b}`} x1={L[b][0]} y1={L[b][1]} x2={80} y2={50} {...s} strokeWidth={1} />)}
          {L.map(([x, y], i) => ring(x, y, 7, i))}
        </>
      );
      break;
    }
    case 'deep-network':
      body = (
        <>
          {[0, 1, 2, 3].map((i) => (
            <path key={i} d={`M${12 + i * 20} ${30 - i * 4} l14 -8 v56 l-14 8 z`} {...s} />
          ))}
          <path d="M8 50 H90" {...s} strokeDasharray="3 4" strokeWidth={1} />
        </>
      );
      break;
    case 'cnn':
      body = (
        <>
          <rect x="10" y="10" width="60" height="60" {...s} />
          <path d="M10 30 H70 M10 50 H70 M30 10 V70 M50 10 V70" {...s} strokeWidth={1} />
          <rect x="30" y="30" width="40" height="40" {...s} strokeWidth={3} />
          <rect x="74" y="66" width="16" height="16" fill="currentColor" />
          <path d="M70 70 L74 66 M70 70 L74 82" {...s} strokeWidth={1} />
        </>
      );
      break;
    case 'attention':
      body = (
        <>
          {[12, 32, 52, 72].map((x) => <rect key={x} x={x} y={70} width={16} height={12} {...s} />)}
          <path d="M60 70 C60 30 20 30 20 70" {...s} strokeWidth={3} />
          <path d="M60 70 C60 44 40 44 40 70 M60 70 C60 52 80 52 80 70" {...s} strokeWidth={1} />
        </>
      );
      break;
    case 'k-means':
      body = (
        <>
          {[[28, 30], [70, 34], [44, 74]].map(([cx, cy], k) => (
            <g key={k}>
              {[[-8, -6], [6, -9], [9, 5], [-6, 8], [0, 0], [-11, 2]].map(([dx, dy], i) => dot(cx + dx, cy + dy, 2.5, `${k}${i}`))}
              <path d={`M${cx - 16} ${cy} h8 M${cx + 8} ${cy} h8 M${cx} ${cy - 16} v8 M${cx} ${cy + 8} v8`} {...s} strokeWidth={1.5} />
            </g>
          ))}
        </>
      );
      break;
    case 'hierarchical':
      body = (
        <>
          <path d="M14 88 V64 H30 V88 M22 64 V44 H50 V88 M42 88 V72 H58 V88 M36 44 V20 H78 V88 M70 88 V60 H86 V88" {...s} />
          <path d="M57 20 V10" {...s} />
        </>
      );
      break;
    case 'pca':
      body = (
        <>
          <ellipse cx="50" cy="50" rx="38" ry="14" transform="rotate(-30 50 50)" {...s} strokeDasharray="4 4" />
          <path d="M18 68 L82 32" {...s} strokeWidth={3} />
          <path d="M42 36 L58 64" {...s} />
          {[[30, 62], [40, 52], [56, 46], [66, 36], [48, 54], [62, 40], [36, 60], [72, 38]].map(([x, y]) => dot(x, y, 2.5))}
        </>
      );
      break;
    case 'q-learning':
      body = (
        <>
          <rect x="10" y="10" width="80" height="80" {...s} />
          <path d="M30 10 V90 M50 10 V90 M70 10 V90 M10 30 H90 M10 50 H90 M10 70 H90" {...s} strokeWidth={1} />
          <rect x="50" y="30" width="20" height="20" fill="currentColor" opacity={0.35} />
          <path d="M20 80 V60 H40 V20 H80" {...s} strokeWidth={3} />
          {dot(20, 80, 5)}
          <path d="M74 14 L86 20 L74 26" {...s} />
        </>
      );
      break;
    default:
      body = <rect x="20" y="20" width="60" height="60" {...s} />;
  }
  return (
    <svg viewBox="0 0 100 100" aria-hidden>
      {body}
    </svg>
  );
}
