import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import {
  ArrowLeft,
  Briefcase,
  Building2,
  Sparkles,
  Plus,
  Trash2,
  Link as LinkIcon,
  Loader2,
  Target,
  Rocket,
  CheckCircle2,
  Circle,
  ChevronRight,
  Zap,
  TrendingUp,
  Archive,
  MessageSquare,
  Search,
  X,
} from 'lucide-react';

const STORAGE_KEY = 'alenotes_opportunity';
const ROW_ID = 'default';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

const KINDS = [
  { id: 'trabajo', label: 'Trabajo', Icon: Briefcase, chip: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-400/40' },
  { id: 'negocio', label: 'Negocio', Icon: Building2, chip: 'bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-400/40' },
  { id: 'freelance', label: 'Freelance', Icon: Zap, chip: 'bg-amber-500/15 text-amber-800 dark:text-amber-200 border-amber-400/40' },
  { id: 'otro', label: 'Idea / otro', Icon: Sparkles, chip: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-400/40' },
];

/** Color de la tarjeta (barra superior, icono, barra de progreso). Cada nueva oportunidad elige uno al azar. */
const CARD_ACCENTS = [
  { id: 'sky', gradient: 'from-sky-500 to-blue-600', progress: 'from-sky-400 to-cyan-300', targetDot: 'text-sky-400', stepHover: 'hover:border-sky-400/50 hover:bg-sky-500/10 hover:text-sky-100' },
  { id: 'violet', gradient: 'from-violet-500 to-purple-600', progress: 'from-violet-400 to-fuchsia-400', targetDot: 'text-violet-400', stepHover: 'hover:border-violet-400/50 hover:bg-violet-500/10 hover:text-violet-100' },
  { id: 'amber', gradient: 'from-amber-500 to-orange-600', progress: 'from-amber-400 to-rose-400', targetDot: 'text-amber-400', stepHover: 'hover:border-amber-400/50 hover:bg-amber-500/10 hover:text-amber-100' },
  { id: 'emerald', gradient: 'from-emerald-500 to-teal-600', progress: 'from-emerald-400 to-cyan-400', targetDot: 'text-emerald-400', stepHover: 'hover:border-emerald-400/50 hover:bg-emerald-500/10 hover:text-emerald-100' },
  { id: 'rose', gradient: 'from-rose-500 to-pink-600', progress: 'from-rose-400 to-orange-300', targetDot: 'text-rose-400', stepHover: 'hover:border-rose-400/50 hover:bg-rose-500/10 hover:text-rose-100' },
  { id: 'cyan', gradient: 'from-cyan-500 to-blue-600', progress: 'from-cyan-300 to-blue-400', targetDot: 'text-cyan-400', stepHover: 'hover:border-cyan-400/50 hover:bg-cyan-500/10 hover:text-cyan-100' },
  { id: 'lime', gradient: 'from-lime-500 to-green-600', progress: 'from-lime-400 to-emerald-400', targetDot: 'text-lime-400', stepHover: 'hover:border-lime-400/50 hover:bg-lime-500/10 hover:text-lime-100' },
  { id: 'fuchsia', gradient: 'from-fuchsia-500 to-purple-700', progress: 'from-fuchsia-400 to-pink-400', targetDot: 'text-fuchsia-400', stepHover: 'hover:border-fuchsia-400/50 hover:bg-fuchsia-500/10 hover:text-fuchsia-100' },
  { id: 'indigo', gradient: 'from-indigo-500 to-blue-700', progress: 'from-indigo-400 to-violet-400', targetDot: 'text-indigo-400', stepHover: 'hover:border-indigo-400/50 hover:bg-indigo-500/10 hover:text-indigo-100' },
  { id: 'orange', gradient: 'from-orange-500 to-red-600', progress: 'from-orange-400 to-amber-300', targetDot: 'text-orange-400', stepHover: 'hover:border-orange-400/50 hover:bg-orange-500/10 hover:text-orange-100' },
];

function accentById(accentId) {
  return CARD_ACCENTS.find((a) => a.id === accentId) || CARD_ACCENTS[0];
}

function randomAccentId() {
  return CARD_ACCENTS[Math.floor(Math.random() * CARD_ACCENTS.length)].id;
}

/** Oportunidades viejas sin `accent`: color estable según id para que no cambien al recargar. */
function resolveCardAccent(item) {
  if (item.accent && CARD_ACCENTS.some((a) => a.id === item.accent)) return accentById(item.accent);
  let h = 0;
  const s = String(item.id || '');
  for (let i = 0; i < s.length; i++) h = (h + s.charCodeAt(i) * (i + 1)) % 10007;
  return CARD_ACCENTS[h % CARD_ACCENTS.length];
}

const STAGES = [
  { id: 'idea', label: 'Idea', color: 'bg-slate-400' },
  { id: 'contacto', label: 'Contacto', color: 'bg-blue-500' },
  { id: 'propuesta', label: 'Propuesta', color: 'bg-indigo-500' },
  { id: 'negociacion', label: 'Negociación', color: 'bg-fuchsia-500' },
  { id: 'ganada', label: 'Ganada', color: 'bg-emerald-500' },
  { id: 'archivada', label: 'Archivo', color: 'bg-gray-400' },
];

function kindMeta(id) {
  return KINDS.find((k) => k.id === id) || KINDS[3];
}

function stageMeta(id) {
  return STAGES.find((s) => s.id === id) || STAGES[0];
}

function itemMatchesSearch(it, query) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const fields = [
    it.title,
    it.companyOrClient,
    it.notes,
    it.link,
    it.valueHint,
    kindMeta(it.kind).label,
    stageMeta(it.stage).label,
    ...(it.nextActions || []).map((a) => a.text),
  ];
  return fields.some((f) => String(f || '').toLowerCase().includes(q));
}

function newItem() {
  return {
    id: `op-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    title: '',
    kind: 'trabajo',
    stage: 'idea',
    accent: randomAccentId(),
    companyOrClient: '',
    notes: '',
    link: '',
    valueHint: '',
    nextActions: [],
    updatedAt: new Date().toISOString(),
  };
}

export default function Opportunity() {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(!!supabase);
  const [saveStatus, setSaveStatus] = useState('saved');
  const [filterKind, setFilterKind] = useState('todas');
  const [filterStage, setFilterStage] = useState('activas');
  const [busqueda, setBusqueda] = useState('');
  const saveTimeoutRef = useRef(null);

  useEffect(() => {
    if (supabase) {
      (async () => {
        try {
          const { data, error } = await supabase
            .from('opportunity_data')
            .select('items')
            .eq('id', ROW_ID)
            .maybeSingle();
          if (!error && data?.items && Array.isArray(data.items)) {
            setItems(data.items);
          }
        } catch (_) {}
        setIsLoading(false);
      })();
    } else {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const j = raw ? JSON.parse(raw) : null;
        if (j?.items && Array.isArray(j.items)) setItems(j.items);
      } catch (_) {}
      setIsLoading(false);
    }
  }, []);

  const saveToBackend = useCallback(async (list) => {
    if (supabase) {
      setSaveStatus('saving');
      try {
        const { error } = await supabase.from('opportunity_data').upsert(
          { id: ROW_ID, items: list, updated_at: new Date().toISOString() },
          { onConflict: 'id' }
        );
        if (error) throw error;
        setSaveStatus('saved');
      } catch (err) {
        console.error('Error guardando Opportunity:', err);
        setSaveStatus('error');
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify({ items: list }));
        } catch (_) {}
      }
    } else {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ items: list }));
      } catch (_) {}
    }
  }, []);

  useEffect(() => {
    if (isLoading) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => saveToBackend(items), 1000);
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [items, isLoading, saveToBackend]);

  const patchItem = useCallback((id, patch) => {
    setItems((prev) =>
      prev.map((it) =>
        it.id === id ? { ...it, ...patch, updatedAt: new Date().toISOString() } : it
      )
    );
  }, []);

  const addItem = useCallback(() => {
    setItems((prev) => [newItem(), ...prev]);
  }, []);

  const removeItem = useCallback((id) => {
    if (!window.confirm('¿Eliminar esta oportunidad?')) return;
    setItems((prev) => prev.filter((it) => it.id !== id));
  }, []);

  const addNextAction = useCallback((itemId) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== itemId) return it;
        const na = it.nextActions || [];
        return {
          ...it,
          nextActions: [...na, { id: `t-${Date.now()}`, text: '', done: false }],
          updatedAt: new Date().toISOString(),
        };
      })
    );
  }, []);

  const patchNextAction = useCallback((itemId, actionId, patch) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== itemId) return it;
        const na = (it.nextActions || []).map((a) =>
          a.id === actionId ? { ...a, ...patch } : a
        );
        return { ...it, nextActions: na, updatedAt: new Date().toISOString() };
      })
    );
  }, []);

  const removeNextAction = useCallback((itemId, actionId) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== itemId) return it;
        return {
          ...it,
          nextActions: (it.nextActions || []).filter((a) => a.id !== actionId),
          updatedAt: new Date().toISOString(),
        };
      })
    );
  }, []);

  const stats = useMemo(() => {
    const total = items.length;
    const activas = items.filter((i) => i.stage !== 'ganada' && i.stage !== 'archivada').length;
    const ganadas = items.filter((i) => i.stage === 'ganada').length;
    const doneActions = items.reduce(
      (acc, it) => acc + (it.nextActions || []).filter((a) => a.done).length,
      0
    );
    const allActions = items.reduce((acc, it) => acc + (it.nextActions || []).length, 0);
    return { total, activas, ganadas, doneActions, allActions };
  }, [items]);

  const filtered = useMemo(() => {
    return items.filter((it) => {
      if (filterKind !== 'todas' && it.kind !== filterKind) return false;
      if (filterStage === 'activas' && (it.stage === 'ganada' || it.stage === 'archivada')) return false;
      if (filterStage === 'ganadas' && it.stage !== 'ganada') return false;
      if (
        filterStage !== 'activas' &&
        filterStage !== 'ganadas' &&
        filterStage !== 'todas_etapas' &&
        it.stage !== filterStage
      ) {
        return false;
      }
      if (!itemMatchesSearch(it, busqueda)) return false;
      return true;
    });
  }, [items, filterKind, filterStage, busqueda]);

  const hayBusqueda = busqueda.trim().length > 0;

  return (
    <div className="min-h-screen bg-[#0c0a14] text-gray-100 selection:bg-fuchsia-500/40">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 -right-24 h-96 w-96 rounded-full bg-fuchsia-600/25 blur-3xl" />
        <div className="absolute top-1/3 -left-32 h-80 w-80 rounded-full bg-violet-600/20 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-64 w-64 rounded-full bg-cyan-500/15 blur-3xl" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 pb-24 pt-6 sm:pt-10">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={18} />
            Volver a notas
          </Link>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            {supabase ? (
              <>
                {saveStatus === 'saving' && (
                  <span className="inline-flex items-center gap-1 text-fuchsia-300/90">
                    <Loader2 size={12} className="animate-spin" /> Guardando…
                  </span>
                )}
                {saveStatus === 'saved' && !isLoading && (
                  <span className="text-emerald-400/90">Guardado</span>
                )}
                {saveStatus === 'error' && (
                  <span className="text-amber-400">Revisá Supabase o usá local</span>
                )}
              </>
            ) : (
              <span className="text-gray-500">Local · sin Supabase</span>
            )}
          </div>
        </div>

        <header className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.08] to-white/[0.02] p-6 sm:p-10 shadow-2xl shadow-fuchsia-950/40 mb-10">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-fuchsia-500/20 to-transparent rounded-full blur-2xl" />
          <div className="relative flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/10 text-xs font-semibold tracking-wide text-fuchsia-200/90 mb-4">
                <Rocket size={14} className="text-amber-300" />
                Opportunity
              </div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight bg-gradient-to-r from-white via-fuchsia-100 to-cyan-200 bg-clip-text text-transparent mb-3">
                Oportunidades de trabajo y negocio
              </h1>
              <p className="text-gray-400 max-w-xl text-sm sm:text-base leading-relaxed">
                Registrá leads, clientes e ideas con notas, enlaces y próximos pasos. Todo se guarda solo.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="rounded-2xl bg-black/30 border border-white/10 px-4 py-3 min-w-[100px]">
                <div className="text-2xl font-bold text-white">{stats.total}</div>
                <div className="text-[10px] uppercase tracking-wider text-gray-500">Total</div>
              </div>
              <div className="rounded-2xl bg-black/30 border border-white/10 px-4 py-3 min-w-[100px]">
                <div className="text-2xl font-bold text-cyan-300">{stats.activas}</div>
                <div className="text-[10px] uppercase tracking-wider text-gray-500">Activas</div>
              </div>
              <div className="rounded-2xl bg-black/30 border border-emerald-500/20 px-4 py-3 min-w-[100px]">
                <div className="text-2xl font-bold text-emerald-400">{stats.ganadas}</div>
                <div className="text-[10px] uppercase tracking-wider text-gray-500">Ganadas</div>
              </div>
              <div className="rounded-2xl bg-black/30 border border-fuchsia-500/20 px-4 py-3 min-w-[120px]">
                <div className="text-2xl font-bold text-fuchsia-300">
                  {stats.allActions ? Math.round((stats.doneActions / stats.allActions) * 100) : 0}%
                </div>
                <div className="text-[10px] uppercase tracking-wider text-gray-500">Pasos hechos</div>
              </div>
            </div>
          </div>
        </header>

        <div className="relative mb-8">
          <Search
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
          />
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por título, cliente, notas, enlace, valor o próximos pasos…"
            className="w-full rounded-2xl border border-white/10 bg-white/[0.06] pl-11 pr-11 py-3.5 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/40 focus:border-fuchsia-500/30 transition-shadow"
          />
          {hayBusqueda && (
            <button
              type="button"
              onClick={() => setBusqueda('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Limpiar búsqueda"
            >
              <X size={16} />
            </button>
          )}
          {hayBusqueda && !isLoading && (
            <p className="mt-2 text-xs text-gray-500">
              {filtered.length === 0
                ? 'Ninguna oportunidad coincide con la búsqueda.'
                : `${filtered.length} resultado${filtered.length !== 1 ? 's' : ''}`}
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3 mb-8">
          <button
            type="button"
            onClick={addItem}
            className="inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 font-semibold text-white bg-gradient-to-r from-fuchsia-600 to-violet-600 hover:from-fuchsia-500 hover:to-violet-500 shadow-lg shadow-fuchsia-900/50 border border-white/10 transition-all active:scale-[0.98]"
          >
            <Plus size={20} />
            Nueva oportunidad
          </button>
          <div className="flex flex-wrap gap-2 sm:ml-auto">
            <span className="w-full sm:w-auto text-xs text-gray-500 uppercase tracking-wider self-center mr-1">Tipo</span>
            {['todas', ...KINDS.map((k) => k.id)].map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setFilterKind(k)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium border transition-colors ${
                  filterKind === k
                    ? 'bg-white text-gray-900 border-white'
                    : 'bg-white/5 text-gray-400 border-white/10 hover:border-white/25'
                }`}
              >
                {k === 'todas' ? 'Todas' : kindMeta(k).label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-10">
          <span className="text-xs text-gray-500 uppercase tracking-wider self-center mr-1">Vista</span>
          {[
            { id: 'activas', label: 'En curso' },
            { id: 'ganadas', label: 'Ganadas' },
            { id: 'todas_etapas', label: 'Todas' },
            ...STAGES.map((s) => ({ id: s.id, label: s.label })),
          ].map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setFilterStage(opt.id)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium border transition-colors ${
                filterStage === opt.id
                  ? 'bg-cyan-500/20 text-cyan-200 border-cyan-400/40'
                  : 'bg-white/5 text-gray-400 border-white/10 hover:border-white/20'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20 text-gray-500">
            <Loader2 className="animate-spin" size={32} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 rounded-3xl border border-dashed border-white/15 bg-white/[0.02]">
            <Target className="mx-auto text-gray-600 mb-4" size={48} />
            <p className="text-gray-400 mb-2">
              {hayBusqueda
                ? 'Ninguna oportunidad coincide con tu búsqueda.'
                : 'No hay oportunidades en esta vista.'}
            </p>
            {hayBusqueda ? (
              <button
                type="button"
                onClick={() => setBusqueda('')}
                className="text-fuchsia-400 hover:text-fuchsia-300 text-sm font-medium"
              >
                Limpiar búsqueda
              </button>
            ) : (
              <button
                type="button"
                onClick={addItem}
                className="text-fuchsia-400 hover:text-fuchsia-300 text-sm font-medium"
              >
                Crear la primera
              </button>
            )}
          </div>
        ) : (
          <ul className="grid gap-6 sm:grid-cols-2">
            {filtered.map((it) => {
              const k = kindMeta(it.kind);
              const KIcon = k.Icon;
              const cardAccent = resolveCardAccent(it);
              const st = stageMeta(it.stage);
              const actions = it.nextActions || [];
              const doneCount = actions.filter((a) => a.done).length;
              const pct = actions.length ? (doneCount / actions.length) * 100 : 0;

              return (
                <li
                  key={it.id}
                  className="group relative rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.07] to-white/[0.02] p-5 sm:p-6 shadow-xl overflow-hidden"
                >
                  <div
                    className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${cardAccent.gradient} opacity-90`}
                    aria-hidden
                  />
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${cardAccent.gradient} shadow-lg ring-2 ring-white/10`}
                      >
                        <KIcon size={22} className="text-white" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <input
                          type="text"
                          value={it.title}
                          onChange={(e) => patchItem(it.id, { title: e.target.value })}
                          placeholder="Título de la oportunidad"
                          className="w-full bg-transparent text-lg font-bold text-white placeholder-gray-500 focus:outline-none border-b border-transparent focus:border-white/30 pb-1"
                        />
                        <input
                          type="text"
                          value={it.companyOrClient || ''}
                          onChange={(e) => patchItem(it.id, { companyOrClient: e.target.value })}
                          placeholder="Empresa, cliente o contacto"
                          className="w-full mt-1 text-sm text-gray-400 placeholder-gray-600 bg-transparent focus:outline-none"
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(it.id)}
                      className="p-2 rounded-xl text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-80 sm:opacity-0 sm:group-hover:opacity-100"
                      aria-label="Eliminar"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-4">
                    <select
                      value={it.kind}
                      onChange={(e) => patchItem(it.id, { kind: e.target.value })}
                      className={`rounded-xl border px-2 py-1.5 text-xs font-medium bg-black/30 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/40 ${k.chip}`}
                    >
                      {KINDS.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <select
                      value={it.stage}
                      onChange={(e) => patchItem(it.id, { stage: e.target.value })}
                      className="rounded-xl border border-white/15 bg-black/30 px-2 py-1.5 text-xs font-medium text-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                    >
                      {STAGES.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white ${st.color}`}
                    >
                      <TrendingUp size={10} />
                      {st.label}
                    </span>
                  </div>

                  <div className="space-y-3 mb-4">
                    <div className="flex items-center gap-2 text-gray-500 text-xs">
                      <LinkIcon size={14} />
                      <input
                        type="url"
                        value={it.link || ''}
                        onChange={(e) => patchItem(it.id, { link: e.target.value })}
                        placeholder="https://…"
                        className="flex-1 bg-black/20 border border-white/10 rounded-xl px-3 py-2 text-sm text-cyan-200 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
                      />
                    </div>
                    <div className="flex items-center gap-2 text-gray-500 text-xs">
                      <MessageSquare size={14} />
                      <input
                        type="text"
                        value={it.valueHint || ''}
                        onChange={(e) => patchItem(it.id, { valueHint: e.target.value })}
                        placeholder="Valor estimado, fee, condiciones…"
                        className="flex-1 bg-black/20 border border-white/10 rounded-xl px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-fuchsia-500/50"
                      />
                    </div>
                  </div>

                  <textarea
                    value={it.notes || ''}
                    onChange={(e) => patchItem(it.id, { notes: e.target.value })}
                    placeholder="Notas, contexto, qué ofrecen, próxima reunión…"
                    rows={3}
                    className="w-full mb-4 rounded-2xl border border-white/10 bg-black/25 px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-violet-500/30 resize-y min-h-[5rem]"
                  />

                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 flex items-center gap-2">
                        <Target size={14} className={cardAccent.targetDot} />
                        Próximos pasos
                      </span>
                      {actions.length > 0 && (
                        <span className="text-[10px] text-gray-500">
                          {doneCount}/{actions.length}
                        </span>
                      )}
                    </div>
                    {actions.length > 0 && (
                      <div className="h-1.5 rounded-full bg-white/10 mb-3 overflow-hidden">
                        <div
                          className={`h-full rounded-full bg-gradient-to-r ${cardAccent.progress} transition-all duration-500`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    )}
                    <ul className="space-y-2">
                      {actions.map((a) => (
                        <li key={a.id} className="flex items-start gap-2 group/act">
                          <button
                            type="button"
                            onClick={() => patchNextAction(it.id, a.id, { done: !a.done })}
                            className="mt-0.5 text-gray-500 hover:text-emerald-400 transition-colors"
                            aria-label={a.done ? 'Marcar pendiente' : 'Marcar hecho'}
                          >
                            {a.done ? (
                              <CheckCircle2 size={20} className="text-emerald-400" />
                            ) : (
                              <Circle size={20} />
                            )}
                          </button>
                          <input
                            type="text"
                            value={a.text}
                            onChange={(e) => patchNextAction(it.id, a.id, { text: e.target.value })}
                            placeholder="Paso concreto…"
                            className={`flex-1 bg-transparent text-sm focus:outline-none border-b border-transparent focus:border-white/20 pb-0.5 ${
                              a.done ? 'text-gray-500 line-through' : 'text-gray-200'
                            }`}
                          />
                          <button
                            type="button"
                            onClick={() => removeNextAction(it.id, a.id)}
                            className="p-1 text-gray-600 hover:text-red-400 opacity-0 group-hover/act:opacity-100 transition-opacity"
                            aria-label="Quitar paso"
                          >
                            <Trash2 size={14} />
                          </button>
                        </li>
                      ))}
                    </ul>
                    <button
                      type="button"
                      onClick={() => addNextAction(it.id)}
                      className={`mt-3 w-full py-2 rounded-xl border border-dashed border-white/20 text-xs font-medium text-gray-400 transition-colors flex items-center justify-center gap-2 ${cardAccent.stepHover}`}
                    >
                      <Plus size={14} />
                      Añadir paso
                    </button>
                  </div>

                  <div className="mt-4 flex items-center justify-between text-[10px] text-gray-600">
                    <span className="flex items-center gap-1">
                      <Archive size={10} />
                      {it.updatedAt
                        ? new Date(it.updatedAt).toLocaleString('es-AR', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : ''}
                    </span>
                    <ChevronRight size={14} className="text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
