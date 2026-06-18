// NCM · Módulo Sala — pantalla principal
import { useEffect, useRef, useState } from 'react';
import { useSala } from './useSala';
import BedCard from './BedCard';
import BedInfoCard from './BedInfoCard';
import BedFichaScreen from './BedFichaScreen';
import AddBedDialog from './AddBedDialog';
import { getSheet } from '../../lib/salaService';
import { MAX_BEDS } from '../../lib/sala/constants';

const BED_SIZE = 104;
const PAD = 60;

export default function SalaPage() {
  const {
    beds, loading, error, canAdd, usedNumbers,
    addBed, emptyWard, persistPosition, removeBed, patchBed,
  } = useSala();

  const [hoverId, setHoverId] = useState(null);
  const [pinnedId, setPinnedId] = useState(null);
  const [editingBed, setEditingBed] = useState(null);
  const [adding, setAdding] = useState(false);
  const [sheets, setSheets] = useState({}); // bedId -> sheet | null | undefined(cargando)
  const hideTimer = useRef(null);
  const boundsRef = useRef(null);

  const activeId = pinnedId ?? hoverId;
  const activeBed = beds.find((b) => b.id === activeId) ?? null;

  const canvasW = Math.max(900, ...beds.map((b) => (Number(b.pos_x) || 0) + BED_SIZE + PAD), 0);
  const canvasH = Math.max(560, ...beds.map((b) => (Number(b.pos_y) || 0) + BED_SIZE + PAD), 0);

  // Carga la ficha de la cama activa para la tarjeta flotante (con caché).
  useEffect(() => {
    if (!activeBed) return;
    if (!activeBed.episode_id) { setSheets((p) => ({ ...p, [activeBed.id]: null })); return; }
    if (sheets[activeBed.id] !== undefined) return;
    let alive = true;
    getSheet(activeBed.episode_id)
      .then((s) => { if (alive) setSheets((p) => ({ ...p, [activeBed.id]: s })); })
      .catch(() => {});
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  const showHover = (id) => { clearTimeout(hideTimer.current); setHoverId(id); };
  const scheduleHide = () => {
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setHoverId(null), 150);
  };

  const handleCreate = async (number, status) => {
    try {
      const bed = await addBed(number, status);
      setAdding(false);
      if (status === 'ocupada' && bed) { setSheets((p) => ({ ...p, [bed.id]: undefined })); setEditingBed(bed); }
    } catch (e) { alert(e.message); }
  };

  const openEditor = (bedId) => { const b = beds.find((x) => x.id === bedId); if (b) setEditingBed(b); };
  const deleteBed = (bedId) => {
    const b = beds.find((x) => x.id === bedId);
    if (b && confirm(`¿Eliminar ${b.label}?`)) { removeBed(bedId); setPinnedId(null); setHoverId(null); }
  };
  const closeEditor = async () => {
    const b = editingBed;
    setEditingBed(null);
    if (!b) return;
    const fresh = beds.find((x) => x.id === b.id) ?? b; // toma el episode_id actualizado
    if (fresh.episode_id) {
      try {
        const s = await getSheet(fresh.episode_id);
        setSheets((p) => ({ ...p, [b.id]: s }));
      } catch { /* noop */ }
    } else {
      setSheets((p) => ({ ...p, [b.id]: null }));
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Sala</h1>
          <p className="text-sm text-zinc-500">{beds.length} / {MAX_BEDS} camas</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { if (beds.length && confirm('¿Vaciar la sala? Se eliminarán todas las camas.')) emptyWard(); }}
            disabled={!beds.length}
            className="rounded-lg border border-zinc-300 dark:border-zinc-600 px-4 py-2 text-sm font-medium hover:border-red-400 disabled:opacity-40">
            Vaciar sala
          </button>
          <button
            onClick={() => setAdding(true)}
            disabled={!canAdd}
            className="rounded-lg bg-sky-600 text-white px-4 py-2 text-sm font-medium hover:bg-sky-700 disabled:opacity-50">
            Agregar cama
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <p className="text-xs text-zinc-400">
        Toca o pasa el cursor por una cama para ver sus datos. Doble clic para editar.
      </p>

      <div className="relative overflow-auto h-[70vh] rounded-2xl border-2 border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-50/60 dark:bg-zinc-900/40 overscroll-contain">
        {loading && <p className="p-6 text-zinc-400">Cargando sala…</p>}
        {!loading && beds.length === 0 && (
          <p className="absolute inset-0 grid place-items-center text-zinc-400 text-sm text-center px-6">
            Sin camas. Usa “Agregar cama”, asígnale un número y su estado.
          </p>
        )}
        <div
          ref={boundsRef}
          className="relative min-w-full min-h-full"
          style={{ width: canvasW, height: canvasH }}
          onPointerDown={(e) => { if (e.target === e.currentTarget) { setPinnedId(null); setHoverId(null); } }}
        >
          {beds.map((bed) => (
            <BedCard
              key={bed.id}
              bed={bed}
              selected={activeId === bed.id}
              onHover={(id) => (id ? showHover(id) : scheduleHide())}
              onSelect={(id) => setPinnedId(id)}
              onEdit={openEditor}
              onDragEnd={persistPosition}
              boundsRef={boundsRef}
            />
          ))}

          {activeBed && (
            <BedInfoCard
              bed={activeBed}
              sheet={sheets[activeBed.id]}
              canvasW={canvasW}
              onMouseEnter={() => showHover(activeBed.id)}
              onMouseLeave={scheduleHide}
              onEdit={() => openEditor(activeBed.id)}
              onRemove={() => deleteBed(activeBed.id)}
              onClose={() => { setPinnedId(null); setHoverId(null); }}
            />
          )}
        </div>
      </div>

      {adding && (
        <AddBedDialog
          usedNumbers={usedNumbers}
          onCancel={() => setAdding(false)}
          onCreate={handleCreate}
        />
      )}

      {editingBed && (
        <BedFichaScreen
          bed={editingBed}
          onClose={closeEditor}
          onOccupied={(bedId, episodeId) => patchBed(bedId, { episode_id: episodeId, status: 'ocupada' })}
        />
      )}
    </div>
  );
}
