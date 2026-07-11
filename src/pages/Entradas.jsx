import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import {
  ArrowLeft,
  Loader2,
  Plus,
  Trash2,
  Search,
  X,
  LayoutGrid,
  GripVertical,
  Target,
  CheckCircle2,
  Circle,
  Calendar,
  TrendingUp,
  DollarSign,
} from 'lucide-react';

const STORAGE_KEY = 'alenotes_entradas';
const ROW_ID = 'default';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

const DEFAULT_COLUMNAS = [
  { id: 'otras', label: 'Otras', header: 'from-slate-500 to-slate-600', ring: 'ring-slate-200' },
  { id: 'sw', label: 'SW', header: 'from-sky-500 to-blue-600', ring: 'ring-sky-200' },
  { id: 'cosecha', label: 'Cosecha Creativa', header: 'from-violet-500 to-purple-600', ring: 'ring-violet-200' },
  { id: 'dev', label: 'Dev', header: 'from-emerald-500 to-teal-600', ring: 'ring-emerald-200' },
  { id: 'plot', label: 'Plot Center', header: 'from-amber-500 to-orange-600', ring: 'ring-amber-200' },
  { id: 'acero', label: 'Acero y Rocka', header: 'from-orange-500 to-rose-600', ring: 'ring-orange-200' },
];

const COLUMN_STYLE_POOL = [
  { header: 'from-slate-500 to-slate-600', ring: 'ring-slate-200' },
  { header: 'from-sky-500 to-blue-600', ring: 'ring-sky-200' },
  { header: 'from-violet-500 to-purple-600', ring: 'ring-violet-200' },
  { header: 'from-emerald-500 to-teal-600', ring: 'ring-emerald-200' },
  { header: 'from-amber-500 to-orange-600', ring: 'ring-amber-200' },
  { header: 'from-orange-500 to-rose-600', ring: 'ring-orange-200' },
  { header: 'from-cyan-500 to-blue-700', ring: 'ring-cyan-200' },
  { header: 'from-fuchsia-500 to-pink-600', ring: 'ring-fuchsia-200' },
  { header: 'from-indigo-500 to-blue-700', ring: 'ring-indigo-200' },
  { header: 'from-lime-500 to-green-600', ring: 'ring-lime-200' },
];

const ESTADOS = [
  { id: 'activo', label: 'Activo' },
  { id: 'proyeccion', label: 'Proyección' },
  { id: 'pausado', label: 'Pausado' },
  { id: 'hecho', label: 'Hecho' },
];

function normalizeColumns(raw) {
  if (!Array.isArray(raw) || raw.length === 0) return DEFAULT_COLUMNAS.map((c) => ({ ...c }));
  return raw.map((col, i) => {
    const style = COLUMN_STYLE_POOL[i % COLUMN_STYLE_POOL.length];
    return {
      id: col.id || `col-legacy-${i}`,
      label: col.label || 'Sin nombre',
      header: col.header || style.header,
      ring: col.ring || style.ring,
    };
  });
}

function newColumn(label) {
  const style = COLUMN_STYLE_POOL[Math.floor(Math.random() * COLUMN_STYLE_POOL.length)];
  return {
    id: `col-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    label: label.trim() || 'Nueva columna',
    header: style.header,
    ring: style.ring,
  };
}

function columnMeta(columns, id) {
  return columns.find((c) => c.id === id) || columns[0] || DEFAULT_COLUMNAS[0];
}

function getMesActual() {
  return new Date().toISOString().slice(0, 7);
}

function formatMoney(num) {
  return new Intl.NumberFormat('es-AR', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(num) || 0);
}

function newTask() {
  return { id: `t-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`, text: '', done: false };
}

function newCard(columnId = 'otras') {
  return {
    id: `ent-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    columnId,
    titulo: '',
    monto: '',
    detalles: '',
    proyeccion: '',
    mesProyeccion: getMesActual(),
    fechaObjetivo: '',
    notas: '',
    estado: 'activo',
    tareas: [newTask()],
    updatedAt: new Date().toISOString(),
  };
}

function normalizeTasks(raw) {
  if (!Array.isArray(raw) || raw.length === 0) return [newTask()];
  return raw.map((t, i) => ({
    id: t?.id || `t-legacy-${i}`,
    text: t?.text ?? '',
    done: !!t?.done,
  }));
}

function normalizeCard(c, columns) {
  if (!c || typeof c !== 'object') return newCard(columns[0]?.id || 'otras');
  const ids = columns.map((x) => x.id);
  const fallback = ids[0] || 'otras';
  const col = ids.includes(c.columnId) ? c.columnId : fallback;
  let estado = c.estado;
  if (estado === 'por_cobrar' || estado === 'en_tramite') estado = 'activo';
  if (estado === 'cobrado') estado = 'hecho';
  if (!ESTADOS.some((e) => e.id === estado)) estado = 'activo';

  return {
    id: c.id || newCard().id,
    columnId: col,
    titulo: c.titulo ?? c.cliente ?? '',
    monto: c.monto ?? '',
    detalles: c.detalles ?? c.notas ?? '',
    proyeccion: c.proyeccion ?? '',
    mesProyeccion: c.mesProyeccion || getMesActual(),
    fechaObjetivo: c.fechaObjetivo ?? '',
    notas: c.detalles ?? c.notas ?? '',
    estado,
    tareas: normalizeTasks(c.tareas),
    updatedAt: c.updatedAt || new Date().toISOString(),
  };
}

function taskStats(tareas) {
  const list = tareas || [];
  const done = list.filter((t) => t.done).length;
  return { done, total: list.length, pct: list.length ? Math.round((done / list.length) * 100) : 0 };
}

export default function Entradas() {
  const [columns, setColumns] = useState(() => DEFAULT_COLUMNAS.map((c) => ({ ...c })));
  const [cards, setCards] = useState([]);
  const [isLoading, setIsLoading] = useState(!!supabase);
  const [saveStatus, setSaveStatus] = useState('saved');
  const [busqueda, setBusqueda] = useState('');
  const [filtroMes, setFiltroMes] = useState('');
  const [dragCardId, setDragCardId] = useState(null);
  const [nuevaColumnaNombre, setNuevaColumnaNombre] = useState('');
  const saveTimeoutRef = useRef(null);

  const applyLoadedData = useCallback((rawColumns, rawCards) => {
    const cols = normalizeColumns(rawColumns);
    setColumns(cols);
    if (Array.isArray(rawCards)) {
      setCards(rawCards.map((c) => normalizeCard(c, cols)));
    }
  }, []);

  useEffect(() => {
    if (supabase) {
      (async () => {
        try {
          const { data, error } = await supabase
            .from('entradas_data')
            .select('cards, columns')
            .eq('id', ROW_ID)
            .maybeSingle();
          if (!error && data) {
            applyLoadedData(data.columns, data.cards);
          }
        } catch (_) {}
        setIsLoading(false);
      })();
    } else {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const j = raw ? JSON.parse(raw) : null;
        if (j) applyLoadedData(j.columns, j.cards);
      } catch (_) {}
      setIsLoading(false);
    }
  }, [applyLoadedData]);

  const saveToBackend = useCallback(async (list, cols) => {
    const payload = { cards: list, columns: cols };
    if (supabase) {
      setSaveStatus('saving');
      try {
        const { error } = await supabase.from('entradas_data').upsert(
          { id: ROW_ID, ...payload, updated_at: new Date().toISOString() },
          { onConflict: 'id' }
        );
        if (error) throw error;
        setSaveStatus('saved');
      } catch (err) {
        console.error('Error guardando Entradas:', err);
        setSaveStatus('error');
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
        } catch (_) {}
      }
    } else {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      } catch (_) {}
    }
  }, []);

  useEffect(() => {
    if (isLoading) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => saveToBackend(cards, columns), 1000);
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [cards, columns, isLoading, saveToBackend]);

  const patchCard = useCallback((id, patch) => {
    const next = patch.detalles !== undefined ? { ...patch, notas: patch.detalles } : patch;
    setCards((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...next, updatedAt: new Date().toISOString() } : c))
    );
  }, []);

  const patchTask = useCallback((cardId, taskId, patch) => {
    setCards((prev) =>
      prev.map((c) => {
        if (c.id !== cardId) return c;
        return {
          ...c,
          tareas: (c.tareas || []).map((t) => (t.id === taskId ? { ...t, ...patch } : t)),
          updatedAt: new Date().toISOString(),
        };
      })
    );
  }, []);

  const addTask = useCallback((cardId) => {
    setCards((prev) =>
      prev.map((c) =>
        c.id === cardId
          ? { ...c, tareas: [...(c.tareas || []), newTask()], updatedAt: new Date().toISOString() }
          : c
      )
    );
  }, []);

  const removeTask = useCallback((cardId, taskId) => {
    setCards((prev) =>
      prev.map((c) => {
        if (c.id !== cardId) return c;
        const next = (c.tareas || []).filter((t) => t.id !== taskId);
        return { ...c, tareas: next.length ? next : [newTask()], updatedAt: new Date().toISOString() };
      })
    );
  }, []);

  const addCard = useCallback((columnId) => {
    setCards((prev) => [newCard(columnId), ...prev]);
  }, []);

  const removeCard = useCallback((id) => {
    if (!window.confirm('¿Eliminar esta entrada?')) return;
    setCards((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const moveCard = useCallback((cardId, columnId) => {
    patchCard(cardId, { columnId });
  }, [patchCard]);

  const updateColumn = useCallback((id, patch) => {
    setColumns((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }, []);

  const addColumn = useCallback(() => {
    const name = nuevaColumnaNombre.trim();
    if (!name) return;
    const col = newColumn(name);
    setColumns((prev) => [...prev, col]);
    setNuevaColumnaNombre('');
  }, [nuevaColumnaNombre]);

  const removeColumn = useCallback((id) => {
    setColumns((prev) => {
      if (prev.length <= 1) return prev;
      const fallback = prev.find((c) => c.id !== id)?.id;
      if (!fallback) return prev;
      if (!window.confirm('¿Eliminar esta columna? Las entradas pasan a otra columna.')) return prev;
      setCards((cardsPrev) =>
        cardsPrev.map((c) =>
          c.columnId === id ? { ...c, columnId: fallback, updatedAt: new Date().toISOString() } : c
        )
      );
      return prev.filter((c) => c.id !== id);
    });
  }, []);

  const mesesDisponibles = useMemo(() => {
    const set = new Set([getMesActual()]);
    cards.forEach((c) => {
      if (c.mesProyeccion) set.add(c.mesProyeccion);
    });
    return [...set].sort((a, b) => b.localeCompare(a));
  }, [cards]);

  const cardsFiltradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return cards.filter((c) => {
      if (filtroMes && c.mesProyeccion !== filtroMes) return false;
      if (!q) return true;
      const taskTexts = (c.tareas || []).map((t) => t.text);
      return [
        c.titulo,
        c.monto,
        c.detalles,
        c.proyeccion,
        c.notas,
        columnMeta(columns, c.columnId).label,
        ESTADOS.find((e) => e.id === c.estado)?.label,
        ...taskTexts,
      ].some((f) => String(f || '').toLowerCase().includes(q));
    });
  }, [cards, busqueda, filtroMes, columns]);

  const cardsPorColumna = useMemo(() => {
    const map = Object.fromEntries(columns.map((col) => [col.id, []]));
    cardsFiltradas.forEach((c) => {
      if (map[c.columnId]) map[c.columnId].push(c);
    });
    return map;
  }, [cardsFiltradas, columns]);

  const stats = useMemo(() => {
    let tareasDone = 0;
    let tareasTotal = 0;
    let proyeccion = 0;
    let activas = 0;
    let montoActivo = 0;
    cards.forEach((c) => {
      const ts = taskStats(c.tareas);
      tareasDone += ts.done;
      tareasTotal += ts.total;
      if (c.estado === 'proyeccion') proyeccion += 1;
      if (c.estado === 'activo' || c.estado === 'proyeccion') {
        activas += 1;
        montoActivo += Number(c.monto) || 0;
      }
    });
    return {
      entradas: cards.length,
      activas,
      proyeccion,
      montoActivo,
      tareasDone,
      tareasTotal,
      pct: tareasTotal ? Math.round((tareasDone / tareasTotal) * 100) : 0,
    };
  }, [cards]);

  const handleDrop = (columnId) => {
    if (dragCardId) {
      moveCard(dragCardId, columnId);
      setDragCardId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-teal-50 flex items-center justify-center">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50/80 via-white to-teal-50/80">
      <header className="sticky top-0 z-20 bg-white/85 backdrop-blur-md border-b border-gray-200/60 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2 text-gray-600 hover:text-indigo-600 transition-colors font-medium text-sm">
            <ArrowLeft size={18} />
            Notas
          </Link>
          <div className="text-center min-w-0">
            <h1 className="text-lg font-bold text-gray-800 flex items-center justify-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-teal-600 flex items-center justify-center text-white shadow-md shrink-0">
                <LayoutGrid size={18} />
              </div>
              Entradas económicas
            </h1>
            <p className="text-xs text-gray-500 mt-1">Trabajos · empresas · freelance</p>
          </div>
          <div className="text-xs">
            {supabase ? (
              <>
                {saveStatus === 'saving' && <span className="text-amber-600 flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> Guardando…</span>}
                {saveStatus === 'saved' && <span className="text-emerald-600">Guardado</span>}
                {saveStatus === 'error' && <span className="text-red-600">Error al guardar</span>}
              </>
            ) : (
              <span className="text-gray-500">Solo local</span>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-4 py-6 pb-16">
        <div className="rounded-2xl bg-white/90 border border-gray-200/60 shadow-lg p-5 sm:p-6 mb-6">
          <p className="text-sm text-gray-500 mb-4">
            Seguí ingresos y proyectos económicos por unidad: trabajos, clientes, empresas y freelance.
            Kanban con proyección, tareas y columnas editables por línea de negocio.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
            <div className="rounded-xl bg-indigo-50 border border-indigo-100 p-3">
              <div className="text-[10px] uppercase tracking-wide text-indigo-600 font-semibold">Proyectos / ingresos</div>
              <div className="text-xl font-bold text-indigo-900">{stats.entradas}</div>
            </div>
            <div className="rounded-xl bg-violet-50 border border-violet-100 p-3">
              <div className="text-[10px] uppercase tracking-wide text-violet-600 font-semibold">En proyección</div>
              <div className="text-xl font-bold text-violet-900">{stats.proyeccion}</div>
            </div>
            <div className="rounded-xl bg-teal-50 border border-teal-100 p-3">
              <div className="text-[10px] uppercase tracking-wide text-teal-600 font-semibold">Activas</div>
              <div className="text-xl font-bold text-teal-900">{stats.activas}</div>
            </div>
            <div className="rounded-xl bg-amber-50 border border-amber-100 p-3">
              <div className="text-[10px] uppercase tracking-wide text-amber-700 font-semibold">Monto activo / proy.</div>
              <div className="text-xl font-bold text-amber-900 tabular-nums">${formatMoney(stats.montoActivo)}</div>
            </div>
            <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3 col-span-2 sm:col-span-1">
              <div className="text-[10px] uppercase tracking-wide text-emerald-600 font-semibold">Tareas hechas</div>
              <div className="text-xl font-bold text-emerald-900">{stats.pct}%</div>
              <div className="text-[10px] text-emerald-700">{stats.tareasDone}/{stats.tareasTotal}</div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="search"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar trabajo, cliente, proyección, tareas…"
                className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
              {busqueda.trim() && (
                <button type="button" onClick={() => setBusqueda('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600" aria-label="Limpiar">
                  <X size={16} />
                </button>
              )}
            </div>
            <select
              value={filtroMes}
              onChange={(e) => setFiltroMes(e.target.value)}
              className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 sm:w-48"
            >
              <option value="">Todos los meses</option>
              {mesesDisponibles.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-max">
            {columns.map((col) => {
              const lista = cardsPorColumna[col.id] || [];
              const colTasks = lista.reduce(
                (acc, c) => {
                  const ts = taskStats(c.tareas);
                  return { done: acc.done + ts.done, total: acc.total + ts.total };
                },
                { done: 0, total: 0 }
              );
              return (
                <div
                  key={col.id}
                  className={`w-[300px] sm:w-[320px] flex-shrink-0 rounded-2xl bg-white/90 border border-gray-200/80 shadow-md overflow-hidden flex flex-col max-h-[calc(100vh-300px)] ${dragCardId ? 'ring-2 ring-offset-2 ' + col.ring : ''}`}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleDrop(col.id)}
                >
                  <div className={`px-4 py-3 bg-gradient-to-r ${col.header} text-white`}>
                    <div className="flex items-start justify-between gap-2">
                      <input
                        type="text"
                        value={col.label}
                        onChange={(e) => updateColumn(col.id, { label: e.target.value })}
                        className="font-semibold text-sm leading-tight bg-transparent text-white placeholder-white/60 focus:outline-none border-b border-transparent focus:border-white/40 flex-1 min-w-0"
                        title="Nombre de la columna"
                      />
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded-full">{lista.length}</span>
                        {columns.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeColumn(col.id)}
                            className="p-1 rounded hover:bg-white/20 text-white/80 hover:text-white"
                            title="Eliminar columna"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                    {colTasks.total > 0 && (
                      <p className="text-[10px] text-white/90 mt-1">
                        Tareas {colTasks.done}/{colTasks.total}
                      </p>
                    )}
                  </div>
                  <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-[120px]">
                    {lista.length === 0 ? (
                      <p className="text-xs text-gray-400 text-center py-6">Sin entradas</p>
                    ) : (
                      lista.map((card) => {
                        const ts = taskStats(card.tareas);
                        return (
                          <div
                            key={card.id}
                            draggable
                            onDragStart={() => setDragCardId(card.id)}
                            onDragEnd={() => setDragCardId(null)}
                            className={`rounded-xl border bg-white p-3 shadow-sm hover:shadow-md transition-shadow group ${card.estado === 'hecho' ? 'opacity-70 border-emerald-200' : card.estado === 'proyeccion' ? 'border-violet-200 bg-violet-50/30' : 'border-gray-100'}`}
                          >
                            <div className="flex items-start gap-1 mb-2">
                              <GripVertical size={14} className="text-gray-300 mt-1 shrink-0 cursor-grab active:cursor-grabbing" />
                              <input
                                type="text"
                                value={card.titulo}
                                onChange={(e) => patchCard(card.id, { titulo: e.target.value })}
                                placeholder="Trabajo, cliente, empresa o freelance"
                                className="flex-1 font-semibold text-sm text-gray-900 bg-transparent focus:outline-none border-b border-transparent focus:border-indigo-200 pb-0.5 min-w-0"
                              />
                              <button
                                type="button"
                                onClick={() => removeCard(card.id)}
                                className="p-1 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                                aria-label="Eliminar"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>

                            <div className="flex items-center gap-1.5 mb-2 pl-5">
                              <DollarSign size={14} className="text-emerald-600 shrink-0" />
                              <span className="text-gray-500 text-sm">$</span>
                              <input
                                type="number"
                                min={0}
                                value={card.monto ?? ''}
                                onChange={(e) => patchCard(card.id, { monto: e.target.value })}
                                placeholder="Monto"
                                className="flex-1 text-sm font-semibold tabular-nums text-emerald-800 bg-emerald-50/60 border border-emerald-100 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-emerald-200 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              />
                            </div>

                            <div className="flex flex-wrap gap-2 mb-2">
                              <select
                                value={card.estado}
                                onChange={(e) => patchCard(card.id, { estado: e.target.value })}
                                className={`text-[10px] rounded-lg border px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-200 ${
                                  card.estado === 'hecho'
                                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                    : card.estado === 'proyeccion'
                                      ? 'bg-violet-50 border-violet-200 text-violet-800'
                                      : card.estado === 'pausado'
                                        ? 'bg-gray-100 border-gray-200 text-gray-600'
                                        : 'bg-indigo-50 border-indigo-200 text-indigo-800'
                                }`}
                              >
                                {ESTADOS.map((e) => (
                                  <option key={e.id} value={e.id}>{e.label}</option>
                                ))}
                              </select>
                              <label className="flex items-center gap-1 text-[10px] text-gray-500">
                                <TrendingUp size={12} />
                                <input
                                  type="month"
                                  value={card.mesProyeccion || getMesActual()}
                                  onChange={(e) => patchCard(card.id, { mesProyeccion: e.target.value })}
                                  className="rounded border border-gray-200 px-1 py-0.5 text-[10px] focus:outline-none focus:ring-1 focus:ring-indigo-200"
                                />
                              </label>
                              <label className="flex items-center gap-1 text-[10px] text-gray-500">
                                <Calendar size={12} />
                                <input
                                  type="date"
                                  value={card.fechaObjetivo || ''}
                                  onChange={(e) => patchCard(card.id, { fechaObjetivo: e.target.value })}
                                  className="rounded border border-gray-200 px-1 py-0.5 text-[10px] focus:outline-none focus:ring-1 focus:ring-indigo-200"
                                />
                              </label>
                            </div>

                            <label className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-violet-600 mb-1">
                              <Target size={12} />
                              Proyección
                            </label>
                            <textarea
                              value={card.proyeccion}
                              onChange={(e) => patchCard(card.id, { proyeccion: e.target.value })}
                              placeholder="Qué proyectás lograr, hitos, objetivo del mes…"
                              rows={2}
                              className="w-full text-xs text-gray-700 rounded-lg border border-violet-100 bg-violet-50/50 px-2 py-1.5 mb-2 resize-y focus:outline-none focus:ring-2 focus:ring-violet-200 focus:bg-white"
                            />

                            <div className="rounded-lg border border-gray-100 bg-gray-50/80 p-2 mb-2">
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">Tareas</span>
                                <span className="text-[10px] text-gray-400">{ts.done}/{ts.total}</span>
                              </div>
                              {ts.total > 0 && (
                                <div className="h-1 rounded-full bg-gray-200 mb-2 overflow-hidden">
                                  <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${ts.pct}%` }} />
                                </div>
                              )}
                              <ul className="space-y-1">
                                {(card.tareas || []).map((task) => (
                                  <li key={task.id} className="flex items-start gap-1.5 group/task">
                                    <button
                                      type="button"
                                      onClick={() => patchTask(card.id, task.id, { done: !task.done })}
                                      className="mt-0.5 text-gray-400 hover:text-emerald-600 shrink-0"
                                      aria-label={task.done ? 'Marcar pendiente' : 'Marcar hecha'}
                                    >
                                      {task.done ? <CheckCircle2 size={16} className="text-emerald-500" /> : <Circle size={16} />}
                                    </button>
                                    <input
                                      type="text"
                                      value={task.text}
                                      onChange={(e) => patchTask(card.id, task.id, { text: e.target.value })}
                                      placeholder="Tarea…"
                                      className={`flex-1 bg-transparent text-xs focus:outline-none border-b border-transparent focus:border-gray-300 pb-0.5 min-w-0 ${task.done ? 'text-gray-400 line-through' : 'text-gray-700'}`}
                                    />
                                    <button
                                      type="button"
                                      onClick={() => removeTask(card.id, task.id)}
                                      className="p-0.5 text-gray-300 hover:text-red-500 opacity-0 group-hover/task:opacity-100 shrink-0"
                                      aria-label="Quitar tarea"
                                    >
                                      <X size={12} />
                                    </button>
                                  </li>
                                ))}
                              </ul>
                              <button
                                type="button"
                                onClick={() => addTask(card.id)}
                                className="mt-1.5 w-full text-[10px] text-gray-500 hover:text-indigo-600 flex items-center justify-center gap-1 py-1"
                              >
                                <Plus size={12} />
                                Añadir tarea
                              </button>
                            </div>

                            <label className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-gray-600 mb-1">
                              Detalles
                            </label>
                            <textarea
                              value={card.detalles ?? ''}
                              onChange={(e) => patchCard(card.id, { detalles: e.target.value })}
                              placeholder="Alcance, condiciones, facturación, contacto, observaciones…"
                              rows={2}
                              className="w-full text-xs text-gray-700 rounded-lg border border-gray-200 bg-gray-50/80 px-2 py-1.5 mb-2 resize-y focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:bg-white"
                            />
                          </div>
                        );
                      })
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => addCard(col.id)}
                    className="m-3 mt-0 flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-gray-200 text-gray-500 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50/50 text-xs font-medium transition-colors"
                  >
                    <Plus size={16} />
                    Nueva entrada económica
                  </button>
                </div>
              );
            })}
            <div className="w-[280px] sm:w-[300px] flex-shrink-0 rounded-2xl border-2 border-dashed border-gray-300 bg-white/50 flex flex-col justify-center p-4">
              <p className="text-xs font-semibold text-gray-600 mb-2">Nueva columna</p>
              <input
                type="text"
                value={nuevaColumnaNombre}
                onChange={(e) => setNuevaColumnaNombre(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addColumn())}
                placeholder="Ej. Marketing, Nuevo proyecto…"
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
              <button
                type="button"
                onClick={addColumn}
                disabled={!nuevaColumnaNombre.trim()}
                className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Plus size={16} />
                Agregar columna
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
