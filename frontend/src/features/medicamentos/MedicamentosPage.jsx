// NCM · Medicamentos — página del módulo
import { useState } from 'react';
import { useMedicamentos } from './useMedicamentos';
import MedCard from './MedCard';
import MedFormModal from './MedFormModal';

export default function MedicamentosPage() {
  const { meds, total, loading, error, isAdmin, query, setQuery, create, update, remove } =
    useMedicamentos();
  const [modal, setModal] = useState(null); // null | { mode, med? }

  const onDelete = async (med) => {
    if (!window.confirm(`¿Quitar "${med.generic_name}" de la biblioteca?`)) return;
    try { await remove(med.id); } catch (e) { alert(e.message); }
  };

  const onSubmit = async (payload) => {
    if (modal.mode === 'edit') await update(modal.med.id, payload);
    else await create(payload);
    setModal(null);
  };

  return (
    <div className="pb-20 md:pb-0">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h1 className="text-2xl font-bold text-zinc-800 dark:text-zinc-100">💊 Librería de Medicamentos</h1>
        {isAdmin && (
          <button type="button" onClick={() => setModal({ mode: 'create' })}
            className="rounded-lg bg-sky-600 text-white px-4 py-2 text-sm font-medium hover:bg-sky-700 shrink-0">
            + Agregar fármaco
          </button>
        )}
      </div>

      <input value={query} onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar por nombre genérico o comercial…"
        className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm mb-4" />

      {loading && <p className="text-zinc-500">Cargando biblioteca…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {!loading && !error && meds.length === 0 && (
        <p className="text-zinc-500">
          {total === 0
            ? `La biblioteca está vacía.${isAdmin ? ' Agrega el primer fármaco.' : ''}`
            : 'Sin resultados para la búsqueda.'}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {meds.map((m) => (
          <MedCard key={m.id} med={m} isAdmin={isAdmin}
            onEdit={(med) => setModal({ mode: 'edit', med })}
            onDelete={onDelete} />
        ))}
      </div>

      {modal && (
        <MedFormModal
          med={modal.mode === 'edit' ? modal.med : null}
          onCancel={() => setModal(null)}
          onSubmit={onSubmit} />
      )}
    </div>
  );
}
