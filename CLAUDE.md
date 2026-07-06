# CLAUDE.md — NCM (Núcleo Clínico Modular)

> Contexto para Claude Code. Este archivo se lee al inicio de cada sesión.
> Refleja el **estado real** del proyecto en disco, que **difiere del TDD original** (ver aviso).

## ⚠️ Aviso sobre el TDD antiguo
Existe un documento de arquitectura (TDD) que describe un stack **Flutter + NestJS + PostgreSQL offline-first** (Riverpod, Drift, Prisma, ML Kit, Clean Architecture de 4 capas, motor de sync, etc.). **Ese stack NO es el que se construyó y NO aplica.** La app real es **web: React + Supabase**. Del TDD solo siguen vigentes las **decisiones de dominio** (modelo de datos, roles, trazabilidad, soft delete, disclaimers, verificación humana del OCR). Ignora todo lo que el TDD diga sobre stack técnico, arquitectura de capas o sincronización offline.

## Qué es NCM
App de gestión clínica para personal de enfermería hospitalaria (Chile). Multi-dispositivo, sincronizada vía Supabase, usable desde cualquier PC. En producción en Vercel.

## Stack real (no proponer alternativas salvo petición explícita)
- **Frontend:** React 18 + Vite 5 + Tailwind CSS v3 (con dark mode)
- **Backend/DB:** Supabase (PostgreSQL + Auth + RLS). El frontend usa la anon key directo, sin backend intermediario. **Única excepción:** una función serverless de Vercel (`frontend/api/parse-lab.ts`) que llama a Claude para estructurar el OCR de laboratorio (ver "OCR híbrido de Laboratorio").
- **Deploy:** Vercel (auto-deploy en cada `git push` a `main`). El **Root Directory del proyecto en Vercel es `frontend`**.
- **Entorno:** Windows · VS Code · PowerShell. Ruta local del repo: `C:\Users\tprom\Claude\Projects\dev\ncm`

## Estructura del repo (monorepo)
- `frontend/` — la app React
  - `src/lib/<x>Service.js` — capa de datos (acceso a Supabase)
  - `src/lib/<x>/constants.js` — helpers puros y constantes por módulo
  - `src/lib/supabase.js` — cliente (`import { supabase } from './supabase'`)
  - `src/features/<x>/` — componentes y hooks del módulo
  - `src/pages/<X>.jsx` — wrapper de 1 línea que renderiza `features/<x>/<X>Page.jsx`
  - `src/sql/` — migraciones `.sql` (historial; se aplican a mano en Supabase)
  - `api/` — **funciones serverless de Vercel** (p. ej. `parse-lab.ts`). Como el Root Directory de Vercel es `frontend`, las funciones van aquí, NO en la `/api` de la raíz del repo.
- `api/`, `backend/` — presentes en la raíz del monorepo; **legacy, no se despliegan** (quedan fuera del Root Directory `frontend`).

## Comandos (PowerShell)
```powershell
cd frontend
npm run dev          # servidor local (Vite, normalmente http://localhost:5173)
npm run build        # build de producción
```
Para probar las funciones `/api` en local hace falta `vercel dev` (Vite solo no las corre).
Git (desde la raíz del repo, un clon fuera de OneDrive):
```powershell
git pull                                     # al empezar
git add .; git commit -m "..."; git push     # al terminar
```
Chequeo de sintaxis de un archivo antes de darlo por bueno:
```powershell
npx --yes esbuild@0.21.5 <ruta_al_archivo> --format=esm > $null
```
esbuild infiere el loader por la extensión (`.jsx` → JSX). No pasar `--loader` para archivos con extensión.

## Variables de entorno (Vercel, por entorno)
- `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` — se **hornean en el build** (deben estar antes de buildear). Localmente van en `frontend/.env` (ignorado por git).
- `ANTHROPIC_API_KEY` — **secreto de servidor, SIN prefijo `VITE_`**. Lo usa `frontend/api/parse-lab.ts`. Debe estar en **Preview y Production**.
- Un cambio de env var en Vercel requiere **redeploy** para tomar efecto.

## Invariantes de arquitectura (NO violar)
- **Soft delete siempre**: columnas `deleted`, `deleted_by`, `deleted_at` en toda tabla clínica. "Eliminar" = `update deleted = true`. **Excepción:** las tablas de **laboratorio** (`lab_panels`, `lab_results`) NO usan soft delete; usan **borrado físico con cascade** + **purga por minimización** (retención de 7 fechas), por ser dato de salud sensible (Ley 21.719). La purga registra solo metadata en `audit_log`, nunca valores de salud.
- **Modelo episode-centric**: `patients` (identidad) ↔ `episodes` (ingreso) ↔ datos clínicos. Todo cuelga del episodio, no de la cama.
- **Autoría**: `created_by` / `updated_by` como `uuid` **sin FK**. Se setean con `actorId()` → `supabase.auth.getUser()`.
- **RLS**: una sola policy por tabla, `for all to authenticated using (true) with check (true)`. El filtrado de borrados va en la **query** (`.eq('deleted', false)`), NO en la policy.
- **Único gate por rol**: escritura admin-only en la **biblioteca de fármacos** (`medication_library`), vía tabla `profiles(id, role)` + función `is_admin()` (SECURITY DEFINER). El resto de datos clínicos: cualquier `authenticated` lee/escribe.
- **Bloqueo de RUT** (Ley 21.719) en campos de texto libre. Helpers en `lib/sala/validation.js` (`containsRut`, `firstRutField`, `redactRut`).
- **Disclaimers no suprimibles** en calculadoras y en la vista de laboratorio.
- **Migraciones**: se aplican **a mano en el SQL editor de Supabase** (no versionadas). Guardar los `.sql` en `frontend/src/sql/`. Correr siempre en el proyecto Supabase correcto (hay más de uno; el de producción usa la `VITE_SUPABASE_URL` del entorno Production).
- **Trazabilidad**: `record_versions` (historial clínico, visible al personal — UI pendiente) + `audit_log` (forense, lectura solo admin — candado pendiente).

## Convenciones de código
- Servicios, features y constantes según la estructura de arriba.
- **Exports nombrados** (no default) en services, hooks y componentes del feature. (Las páginas `features/<x>/<X>Page.jsx` usan `export default`, igual que Sala/Medicamentos.)
- **Nunca** un hook (`useState`/`useEffect`) fuera del cuerpo del componente.
- Estilos: Tailwind v3, dark mode (`dark:`), paleta **zinc + sky-600**. Campos: `w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm`. Modales: `fixed inset-0 z-50 bg-black/40 grid place-items-center p-4`.
- UX de la ficha: la ventana **solo cierra** con "Guardar cambios" o la X (el fondo oscuro no cierra).
- **Idioma:** UI en español; código en inglés.

## Estado de módulos
- ✅ Auth + login · Dashboard · **Mi Rotativa** (turnos, feriados CL, Google Calendar)
- ✅ **Sala** — camas draggables, ficha/episodio con autoguardado, lesiones por presión, balance hídrico
- ✅ **Medicamentos** — biblioteca (admin-only), asignación a camas, modo borrador, hover card en las camas
- ✅ **Laboratorio (Módulo 2)** — página + selector de camas ocupadas (`LaboratorioPage.jsx` + wrapper `pages/Laboratorio.jsx`); matriz (`LabMatrixView.jsx`) con destacar/actualizar y **borrar columna (×)**; formulario de ingreso manual (`LabAddForm.jsx`) con preview de alterados y bloqueo de RUT; **OCR híbrido** (ver abajo). `getAlteredLabs` en `salaService.js` devuelve los destacados con su último valor. `savePanel` es resiliente: si la purga (`lab_purge_old_panels`) falla, el informe igual queda guardado. **Pendiente:** export Excel/PDF; pulir sección de laboratorio en `BedFichaScreen.jsx`; candado de lectura admin-only en `audit_log`.
- ⛔ Pendientes/Tareas · Entrega de turno

## OCR híbrido de Laboratorio (cómo funciona)
Decisión regulatoria (Ley 21.719): la **imagen/PDF nunca sale del dispositivo**; solo viaja **texto de-identificado** a la IA.
1. En `LabAddForm` el usuario sube una **foto o PDF**. El reconocimiento es **on-device** (`frontend/src/lib/laboratorio/ocr.js`): `tesseract.js` para imágenes; `pdfjs-dist` para PDF — extrae la capa de texto directa y, si es un PDF escaneado, renderiza a canvas y le pasa Tesseract.
2. El texto se **de-identifica** (`redactRut` tapa el RUT) y se muestra en un cuadro editable para que el humano borre nombres antes de enviar.
3. Solo el **texto de-identificado** va a la función serverless `frontend/api/parse-lab.ts`, que llama a **Claude Haiku 4.5** (`@anthropic-ai/sdk`) con *strict tool use* y devuelve JSON `{takenAt, labSource, results[]}`. La `ANTHROPIC_API_KEY` vive en el servidor.
4. El JSON **prellena** el formulario; el humano revisa y guarda. **Nunca** se guarda sin revisión humana.
- Deps: `tesseract.js` + `pdfjs-dist` (frontend), `@anthropic-ai/sdk` (raíz y frontend). Tesseract descarga el idioma `spa` de un CDN la primera vez.

## Modelo de datos de Laboratorio (referencia)
- `lab_panels` = un informe escaneado (una **columna** de la matriz): `episode_id`, `taken_at`, `lab_source` + autoría. Sin soft delete.
- `lab_results` = un analito (una **celda**): `panel_id`, `analyte`, `analyte_key` (normalizado, para agrupar en la misma fila), `value_text`, `value_num`, `unit`, `ref_low`/`ref_high`/`ref_text` (intervalo escaneado de ESE informe), `is_abnormal` (rojo, fijo por celda).
- `lab_highlights` = analitos destacados por episodio: `episode_id`, `analyte_key`, `unique(episode_id, analyte_key)`.
- La matriz: filas = analitos (destacados A→Z arriba, resto A→Z), columnas = fechas. "Destacar" = borrador local; "Actualizar resultado" = confirma (`setHighlights`) y Sala (que lee en vivo) muestra los destacados con su último valor. El OCR **prellena** la pantalla de verificación; nunca guarda valores definitivos sin revisión humana.

## Gotchas conocidos
- `create table if not exists` NO agrega columnas si la tabla ya existe. Tabla vacía → `drop ... cascade` + recrear; con datos → `alter table`.
- Hooks fuera del componente → pantalla en blanco (`Invalid hook call`).
- RLS partida (SELECT que filtra `deleted` + UPDATE aparte) rompe el soft-delete (`42501`). Solución: una sola policy `FOR ALL`.
- `addBed(wardId, number, status, spawnIndex)` es de **4 args** (una versión scaffold de 2 args rompía todo). Sospechar de archivos de servicio con comentarios genéricos tipo "Ajusta la ruta del cliente…".
- En el SQL editor corres como `postgres` (superusuario) → la RLS no se evalúa; los errores de policy solo aparecen desde la app.
- Git en dos computadores + OneDrive da problemas. Trabajar desde un clon fuera de OneDrive; `git pull` al empezar, `git push` al terminar.
- **Vercel Root Directory = `frontend`**: las funciones serverless deben estar en `frontend/api/`, no en la `/api` de la raíz del repo (si no, dan **404**). Hay dos `vercel.json` (raíz y `frontend/`); el activo es `frontend/vercel.json`.
- **Sin cliente HTTP para la IA en el frontend**: la key de Claude va en la función serverless. Nunca ponerla con prefijo `VITE_` ni llamar a la API de Claude desde el navegador.
- **Migraciones por entorno**: `lab_purge_old_panels` y las tablas de laboratorio deben existir en el proyecto Supabase que usa cada entorno de Vercel. Si producción apunta a otro Supabase, correr el SQL ahí también. Síntoma: `Could not find the function public.lab_purge_old_panels ... in the schema cache`.

## Cómo trabajar (importante)
- **Antes de continuar, SIEMPRE preguntar cómo proseguir y "¿quieres hacer algún cambio a lo que ya está propuesto?"** antes de ponerse a construir.
- **Paso a paso**: proponer → confirmar → construir. No escribir código antes de confirmar el enfoque.
- Respuestas **concisas**, directo a lo técnico, sin reexplicar el contexto.
- Al entregar un archivo que divergió de la versión local, entregarlo **completo** (no snippets) para no pisar cambios.
- Chequear la sintaxis (esbuild) antes de dar por bueno un archivo.
- Windows/PowerShell. Explicaciones amables (el desarrollador es novato).
- Ante dudas regulatorias (dato de salud, Ley 21.719, SaMD): señalar el riesgo con precisión y sugerir asesoría, sin bloquear el avance técnico.
