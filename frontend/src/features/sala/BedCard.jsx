// NCM · Módulo Sala — cama arrastrable
import { useRef, useState } from 'react';
import { BED_STATUS } from '../../lib/sala/constants';

const SIZE = 104;

export default function BedCard({ bed, selected, onHover, onSelect, onEdit, onDragEnd, boundsRef }) {
  const drag = useRef(null);
  const [pos, setPos] = useState({ x: bed.pos_x ?? 24, y: bed.pos_y ?? 24 });
  const status = BED_STATUS[bed.status] ?? BED_STATUS.libre;

  const onPointerDown = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { sx: e.clientX, sy: e.clientY, bx: pos.x, by: pos.y, moved: false };
  };
  const onPointerMove = (e) => {
    if (!drag.current) return;
    const dx = e.clientX - drag.current.sx;
    const dy = e.clientY - drag.current.sy;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) drag.current.moved = true;
    const rect = boundsRef?.current?.getBoundingClientRect();
    const maxX = rect ? rect.width - SIZE : Infinity;
    const maxY = rect ? rect.height - SIZE : Infinity;
    setPos({
      x: Math.min(Math.max(0, drag.current.bx + dx), maxX),
      y: Math.min(Math.max(0, drag.current.by + dy), maxY),
    });
  };
  const onPointerUp = () => {
    if (!drag.current) return;
    const { moved } = drag.current;
    drag.current = null;
    if (moved) onDragEnd(bed.id, pos.x, pos.y);
    else onSelect(bed.id);
  };

  return (
    <button
      type="button"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onMouseEnter={() => onHover(bed.id)}
      onMouseLeave={() => onHover(null)}
      onDoubleClick={() => onEdit(bed.id)}
      aria-pressed={selected}
      aria-label={`${bed.label}, ${status.label}`}
      style={{ left: pos.x, top: pos.y, width: SIZE, height: SIZE }}
      className={[
        'absolute touch-none select-none cursor-grab active:cursor-grabbing',
        'rounded-xl border-2 flex flex-col items-center justify-center gap-1.5 shadow-sm transition-colors',
        selected
          ? 'border-sky-500 ring-2 ring-sky-400/40 bg-white dark:bg-zinc-800'
          : 'border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 hover:border-sky-400',
      ].join(' ')}
    >
      <span className="text-base font-semibold text-zinc-800 dark:text-zinc-100">{bed.label}</span>
      <span className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
        <span className={`inline-block w-2 h-2 rounded-full ${status.dot}`} />
        {status.label}
      </span>
    </button>
  );
}
