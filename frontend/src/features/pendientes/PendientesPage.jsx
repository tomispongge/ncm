// frontend/src/features/pendientes/PendientesPage.jsx
// Selector de camas ocupadas → panel de gestión de pendientes de esa cama.
// Reusa el acceso a datos de Sala (ward + camas).
import { useEffect, useState } from 'react';
import { getOrCreateDefaultWard, listBeds } from '../../lib/salaService';
import PendientesPanel from './PendientesPanel';

export default function PendientesPage() {
  const [beds, setBeds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const w = await getOrCreateDefaultWard();
        const all = await listBeds(w.id);
        setBeds(all.filter((b) => b.episode_id)); // solo ocupadas
      } catch (e) {
        setError(e?.message || String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="pb-20 md:pb-0">
      <h1 className="text-2xl font-bold text-zinc-800 dark:text-zinc-100 mb-1">✅ Pendientes</h1>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
        Elige una cama para gestionar sus pendientes.
      </p>

      {loading && <p className="text-zinc-500">Cargando camas…</p>}
      {error && <p className="text-sm text-red-600">No se pudieron cargar las camas. Intenta de nuevo.</p>}

      {!loading && !error && beds.length === 0 && (
        <p className="text-zinc-500">
          No hay camas ocupadas. Ocupa una cama en <span className="font-medium">Sala</span> para
          registrar pendientes.
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {beds.map((bed) => (
          <button
            key={bed.id}
            type="button"
            onClick={() => setSelected(bed)}
            className="text-left rounded-2xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-4 hover:border-sky-500 hover:shadow-sm transition"
          >
            <div className="text-base font-semibold text-zinc-900 dark:text-zinc-100">{bed.label}</div>
            <div className="mt-1 text-sm text-sky-600 dark:text-sky-400">Ver pendientes →</div>
          </button>
        ))}
      </div>

      {selected && (
        <PendientesPanel
          episodeId={selected.episode_id}
          bedLabel={selected.label}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
