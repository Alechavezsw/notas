import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import {
  ArrowLeft,
  Building2,
  Plus,
  Trash2,
  Link as LinkIcon,
  Loader2,
  Landmark,
  Users,
  BarChart3,
  FileText,
  Globe,
  Mail,
  MapPin,
  Hash,
  Calendar,
  CheckCircle2,
  Circle,
  ListChecks,
  Factory,
  Briefcase,
  Sparkles,
  ChevronDown,
} from 'lucide-react';

const STORAGE_KEY = 'alenotes_mis_empresas';
const SECTIONS_STORAGE_KEY = 'alenotes_mis_empresas_sections';
const ROW_ID = 'default';

const DEFAULT_EMPRESA_SECTIONS = {
  identificacion: true,
  presencia: true,
  kpis: true,
  enlaces: true,
  contactos: true,
  notas: true,
  objetivos: true,
  proximos: true,
};

function loadEmpresaSections() {
  try {
    const raw = localStorage.getItem(SECTIONS_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return {};
}

function sectionIsOpen(sectionsState, empresaId, sectionId) {
  const company = sectionsState[empresaId];
  if (company && company[sectionId] !== undefined) return company[sectionId];
  return DEFAULT_EMPRESA_SECTIONS[sectionId] ?? true;
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

const CARD_ACCENTS = [
  { id: 'slate', gradient: 'from-slate-500 to-slate-700', progress: 'from-slate-400 to-cyan-400', section: 'text-cyan-400', stepHover: 'hover:border-cyan-400/50 hover:bg-cyan-500/10' },
  { id: 'blue', gradient: 'from-blue-600 to-indigo-700', progress: 'from-blue-400 to-indigo-400', section: 'text-blue-400', stepHover: 'hover:border-blue-400/50 hover:bg-blue-500/10' },
  { id: 'teal', gradient: 'from-teal-500 to-emerald-700', progress: 'from-teal-400 to-emerald-400', section: 'text-teal-400', stepHover: 'hover:border-teal-400/50 hover:bg-teal-500/10' },
  { id: 'amber', gradient: 'from-amber-500 to-orange-700', progress: 'from-amber-400 to-yellow-400', section: 'text-amber-400', stepHover: 'hover:border-amber-400/50 hover:bg-amber-500/10' },
  { id: 'violet', gradient: 'from-violet-600 to-purple-800', progress: 'from-violet-400 to-fuchsia-400', section: 'text-violet-400', stepHover: 'hover:border-violet-400/50 hover:bg-violet-500/10' },
  { id: 'rose', gradient: 'from-rose-600 to-red-800', progress: 'from-rose-400 to-orange-400', section: 'text-rose-400', stepHover: 'hover:border-rose-400/50 hover:bg-rose-500/10' },
  { id: 'cyan', gradient: 'from-cyan-500 to-blue-800', progress: 'from-cyan-300 to-blue-500', section: 'text-cyan-400', stepHover: 'hover:border-cyan-400/50 hover:bg-cyan-500/10' },
];

function accentById(id) {
  return CARD_ACCENTS.find((a) => a.id === id) || CARD_ACCENTS[0];
}

function randomAccentId() {
  return CARD_ACCENTS[Math.floor(Math.random() * CARD_ACCENTS.length)].id;
}

function resolveAccent(item) {
  if (item.accent && CARD_ACCENTS.some((a) => a.id === item.accent)) return accentById(item.accent);
  let h = 0;
  const s = String(item.id || '');
  for (let i = 0; i < s.length; i++) h = (h + s.charCodeAt(i) * (i + 1)) % 10007;
  return CARD_ACCENTS[h % CARD_ACCENTS.length];
}

const STATUSES = [
  { id: 'operativa', label: 'Operativa', dot: 'bg-emerald-500' },
  { id: 'formacion', label: 'En formación', dot: 'bg-sky-500' },
  { id: 'escala', label: 'Escalando', dot: 'bg-violet-500' },
  { id: 'pausada', label: 'Pausada', dot: 'bg-amber-500' },
  { id: 'venta', label: 'En venta / salida', dot: 'bg-orange-500' },
  { id: 'cerrada', label: 'Cerrada', dot: 'bg-gray-500' },
];

function statusMeta(id) {
  return STATUSES.find((s) => s.id === id) || STATUSES[0];
}

function newCompany() {
  return {
    id: `emp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    accent: randomAccentId(),
    tradeName: '',
    legalName: '',
    taxId: '',
    industry: '',
    status: 'operativa',
    founded: '',
    website: '',
    emailCompany: '',
    cityRegion: '',
    tagline: '',
    notesGeneral: '',
    notesLegal: '',
    notesOps: '',
    links: [],
    contacts: [],
    kpis: [],
    objectives: [],
    nextActions: [],
    updatedAt: new Date().toISOString(),
  };
}

function SectionTitle({ Icon, accent, children }) {
  return (
    <h3 className={`flex items-center gap-2 text-xs font-bold uppercase tracking-widest ${accent.section}`}>
      <Icon size={16} className="opacity-90 shrink-0" />
      {children}
    </h3>
  );
}

function EmpresaSection({
  sectionId,
  empresaId,
  isOpen,
  onToggle,
  Icon,
  accent,
  title,
  badge,
  children,
  className = '',
  bodyClassName = '',
}) {
  return (
    <div className={`rounded-2xl border border-white/10 bg-black/25 overflow-hidden ${className}`}>
      <button
        type="button"
        onClick={() => onToggle(empresaId, sectionId)}
        aria-expanded={isOpen}
        className="w-full flex items-center justify-between gap-3 p-4 hover:bg-white/[0.04] transition-colors text-left"
      >
        <div className="flex items-center gap-2 min-w-0">
          <SectionTitle Icon={Icon} accent={accent}>
            {title}
          </SectionTitle>
          {badge}
        </div>
        <ChevronDown
          size={18}
          className={`text-gray-500 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          aria-hidden
        />
      </button>
      {isOpen && (
        <div className={`px-4 pb-4 border-t border-white/5 ${bodyClassName}`}>
          {children}
        </div>
      )}
    </div>
  );
}

export default function MisEmpresas() {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(!!supabase);
  const [saveStatus, setSaveStatus] = useState('saved');
  const [filterStatus, setFilterStatus] = useState('todas');
  const [search, setSearch] = useState('');
  const [sectionsState, setSectionsState] = useState(loadEmpresaSections);
  const saveTimeoutRef = useRef(null);

  const toggleEmpresaSection = useCallback((empresaId, sectionId) => {
    setSectionsState((prev) => {
      const next = {
        ...prev,
        [empresaId]: {
          ...DEFAULT_EMPRESA_SECTIONS,
          ...prev[empresaId],
          [sectionId]: !sectionIsOpen(prev, empresaId, sectionId),
        },
      };
      try {
        localStorage.setItem(SECTIONS_STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  useEffect(() => {
    if (supabase) {
      (async () => {
        try {
          const { data, error } = await supabase
            .from('mis_empresas_data')
            .select('items')
            .eq('id', ROW_ID)
            .maybeSingle();
          if (!error && data?.items && Array.isArray(data.items)) setItems(data.items);
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
        const { error } = await supabase.from('mis_empresas_data').upsert(
          { id: ROW_ID, items: list, updated_at: new Date().toISOString() },
          { onConflict: 'id' }
        );
        if (error) throw error;
        setSaveStatus('saved');
      } catch (err) {
        console.error('Error guardando Mis empresas:', err);
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
      prev.map((it) => (it.id === id ? { ...it, ...patch, updatedAt: new Date().toISOString() } : it))
    );
  }, []);

  const addItem = useCallback(() => setItems((prev) => [newCompany(), ...prev]), []);

  const removeItem = useCallback((id) => {
    if (!window.confirm('¿Eliminar esta empresa del registro?')) return;
    setItems((prev) => prev.filter((it) => it.id !== id));
  }, []);

  const pushSub = useCallback((itemId, key, row) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== itemId) return it;
        const arr = Array.isArray(it[key]) ? it[key] : [];
        return { ...it, [key]: [...arr, row], updatedAt: new Date().toISOString() };
      })
    );
  }, []);

  const patchSub = useCallback((itemId, key, rowId, patch) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== itemId) return it;
        const arr = (it[key] || []).map((r) => (r.id === rowId ? { ...r, ...patch } : r));
        return { ...it, [key]: arr, updatedAt: new Date().toISOString() };
      })
    );
  }, []);

  const removeSub = useCallback((itemId, key, rowId) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== itemId) return it;
        return {
          ...it,
          [key]: (it[key] || []).filter((r) => r.id !== rowId),
          updatedAt: new Date().toISOString(),
        };
      })
    );
  }, []);

  const stats = useMemo(() => {
    const total = items.length;
    const operativas = items.filter((i) => i.status === 'operativa' || i.status === 'escala').length;
    const formacion = items.filter((i) => i.status === 'formacion').length;
    return { total, operativas, formacion };
  }, [items]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((it) => {
      if (filterStatus !== 'todas' && it.status !== filterStatus) return false;
      if (!q) return true;
      const blob = [
        it.tradeName,
        it.legalName,
        it.industry,
        it.tagline,
        it.cityRegion,
        it.taxId,
        it.notesGeneral,
        it.notesLegal,
        it.notesOps,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return blob.includes(q);
    });
  }, [items, filterStatus, search]);

  return (
    <div className="min-h-screen bg-[#070b12] text-gray-100 selection:bg-blue-500/30">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 right-0 h-[28rem] w-[28rem] rounded-full bg-blue-600/15 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-96 w-96 rounded-full bg-teal-600/10 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 pb-28 pt-6 sm:pt-10">
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
                  <span className="inline-flex items-center gap-1 text-blue-300/90">
                    <Loader2 size={12} className="animate-spin" /> Guardando…
                  </span>
                )}
                {saveStatus === 'saved' && !isLoading && <span className="text-emerald-400/90">Guardado</span>}
                {saveStatus === 'error' && <span className="text-amber-400">Revisá Supabase o usá local</span>}
              </>
            ) : (
              <span>Local · sin Supabase</span>
            )}
          </div>
        </div>

        <header className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.02] p-6 sm:p-10 shadow-2xl mb-10">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.03\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-60" />
          <div className="relative flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/15 border border-blue-400/30 text-xs font-semibold text-blue-200 mb-4">
                <Landmark size={14} />
                Mis empresas
              </div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight bg-gradient-to-r from-white via-blue-100 to-teal-200 bg-clip-text text-transparent mb-3">
                Registro ampliado de tus sociedades y negocios
              </h1>
              <p className="text-gray-400 max-w-2xl text-sm sm:text-base leading-relaxed">
                Ficha completa: datos fiscales, personas, enlaces, indicadores, notas por área, objetivos y próximos pasos.
                Guardado automático como en Opportunity.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="rounded-2xl bg-black/35 border border-white/10 px-4 py-3 min-w-[88px]">
                <div className="text-2xl font-bold text-white">{stats.total}</div>
                <div className="text-[10px] uppercase tracking-wider text-gray-500">Empresas</div>
              </div>
              <div className="rounded-2xl bg-black/35 border border-emerald-500/20 px-4 py-3 min-w-[88px]">
                <div className="text-2xl font-bold text-emerald-400">{stats.operativas}</div>
                <div className="text-[10px] uppercase tracking-wider text-gray-500">Activas / escala</div>
              </div>
              <div className="rounded-2xl bg-black/35 border border-sky-500/20 px-4 py-3 min-w-[88px]">
                <div className="text-2xl font-bold text-sky-400">{stats.formacion}</div>
                <div className="text-[10px] uppercase tracking-wider text-gray-500">En formación</div>
              </div>
            </div>
          </div>
        </header>

        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between mb-8">
          <button
            type="button"
            onClick={addItem}
            className="inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 font-semibold text-white bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-500 hover:to-teal-500 shadow-lg border border-white/10 transition-all active:scale-[0.98]"
          >
            <Plus size={20} />
            Nueva empresa
          </button>
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center flex-1 sm:max-w-xl">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre, rubro, notas…"
              className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-10">
          <span className="text-xs text-gray-500 uppercase tracking-wider self-center mr-1">Estado</span>
          {[{ id: 'todas', label: 'Todas' }, ...STATUSES.map((s) => ({ id: s.id, label: s.label }))].map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setFilterStatus(opt.id)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium border transition-colors ${
                filterStatus === opt.id
                  ? 'bg-blue-500/25 text-blue-100 border-blue-400/50'
                  : 'bg-white/5 text-gray-400 border-white/10 hover:border-white/25'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-24 text-gray-500">
            <Loader2 className="animate-spin" size={36} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 rounded-3xl border border-dashed border-white/15 bg-white/[0.02]">
            <Factory className="mx-auto text-gray-600 mb-4" size={52} />
            <p className="text-gray-400 mb-2">No hay empresas en esta vista.</p>
            <button type="button" onClick={addItem} className="text-blue-400 hover:text-blue-300 text-sm font-medium">
              Agregar la primera
            </button>
          </div>
        ) : (
          <ul className="space-y-10">
            {filtered.map((it) => {
              const accent = resolveAccent(it);
              const st = statusMeta(it.status);
              const objectives = it.objectives || [];
              const nextActions = it.nextActions || [];
              const objDone = objectives.filter((o) => o.done).length;
              const objPct = objectives.length ? (objDone / objectives.length) * 100 : 0;
              const actDone = nextActions.filter((a) => a.done).length;
              const actPct = nextActions.length ? (actDone / nextActions.length) * 100 : 0;

              return (
                <li
                  key={it.id}
                  className="group relative rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] shadow-2xl overflow-hidden"
                >
                  <div className={`h-1.5 bg-gradient-to-r ${accent.gradient}`} aria-hidden />

                  <div className="p-5 sm:p-8">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between mb-8">
                      <div className="flex items-start gap-4 min-w-0">
                        <div
                          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${accent.gradient} shadow-lg ring-2 ring-white/10`}
                        >
                          <Building2 size={28} className="text-white" />
                        </div>
                        <div className="min-w-0 flex-1 space-y-2">
                          <input
                            type="text"
                            value={it.tradeName}
                            onChange={(e) => patchItem(it.id, { tradeName: e.target.value })}
                            placeholder="Nombre comercial / marca"
                            className="w-full bg-transparent text-2xl sm:text-3xl font-bold text-white placeholder-gray-500 focus:outline-none border-b border-transparent focus:border-white/20 pb-1"
                          />
                          <input
                            type="text"
                            value={it.legalName || ''}
                            onChange={(e) => patchItem(it.id, { legalName: e.target.value })}
                            placeholder="Razón social (legal)"
                            className="w-full bg-transparent text-sm text-gray-400 placeholder-gray-600 focus:outline-none"
                          />
                          <input
                            type="text"
                            value={it.tagline || ''}
                            onChange={(e) => patchItem(it.id, { tagline: e.target.value })}
                            placeholder="Una línea: qué hace la empresa"
                            className="w-full bg-transparent text-sm text-blue-200/80 placeholder-gray-600 focus:outline-none italic"
                          />
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                        <select
                          value={it.status}
                          onChange={(e) => patchItem(it.id, { status: e.target.value })}
                          className="rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                        >
                          {STATUSES.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.label}
                            </option>
                          ))}
                        </select>
                        <span className="inline-flex items-center gap-2 rounded-full bg-black/30 border border-white/10 px-3 py-1.5 text-xs text-gray-300">
                          <span className={`w-2 h-2 rounded-full ${st.dot}`} />
                          {st.label}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeItem(it.id)}
                          className="p-2 rounded-xl text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          aria-label="Eliminar"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                    </div>

                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 mb-8">
                      <EmpresaSection
                        sectionId="identificacion"
                        empresaId={it.id}
                        isOpen={sectionIsOpen(sectionsState, it.id, 'identificacion')}
                        onToggle={toggleEmpresaSection}
                        Icon={Hash}
                        accent={accent}
                        title="Identificación"
                      >
                        <div className="space-y-3 pt-3">
                          <input
                            type="text"
                            value={it.taxId || ''}
                            onChange={(e) => patchItem(it.id, { taxId: e.target.value })}
                            placeholder="CUIT / CIF / ID fiscal"
                            className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                          />
                          <input
                            type="text"
                            value={it.industry || ''}
                            onChange={(e) => patchItem(it.id, { industry: e.target.value })}
                            placeholder="Rubro / industria"
                            className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                          />
                          <div className="flex items-center gap-2 text-gray-500">
                            <Calendar size={14} />
                            <input
                              type="text"
                              value={it.founded || ''}
                              onChange={(e) => patchItem(it.id, { founded: e.target.value })}
                              placeholder="Inicio (año o fecha)"
                              className="flex-1 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                            />
                          </div>
                        </div>
                      </EmpresaSection>

                      <EmpresaSection
                        sectionId="presencia"
                        empresaId={it.id}
                        isOpen={sectionIsOpen(sectionsState, it.id, 'presencia')}
                        onToggle={toggleEmpresaSection}
                        Icon={Globe}
                        accent={accent}
                        title="Presencia"
                      >
                        <div className="space-y-3 pt-3">
                          <div className="flex items-center gap-2 text-gray-500">
                            <LinkIcon size={14} />
                            <input
                              type="url"
                              value={it.website || ''}
                              onChange={(e) => patchItem(it.id, { website: e.target.value })}
                              placeholder="https://sitio web"
                              className="flex-1 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-cyan-200/90 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
                            />
                          </div>
                          <div className="flex items-center gap-2 text-gray-500">
                            <Mail size={14} />
                            <input
                              type="email"
                              value={it.emailCompany || ''}
                              onChange={(e) => patchItem(it.id, { emailCompany: e.target.value })}
                              placeholder="Email corporativo"
                              className="flex-1 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                            />
                          </div>
                          <div className="flex items-center gap-2 text-gray-500">
                            <MapPin size={14} />
                            <input
                              type="text"
                              value={it.cityRegion || ''}
                              onChange={(e) => patchItem(it.id, { cityRegion: e.target.value })}
                              placeholder="Ciudad / región / sede"
                              className="flex-1 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                            />
                          </div>
                        </div>
                      </EmpresaSection>

                      <EmpresaSection
                        sectionId="kpis"
                        empresaId={it.id}
                        isOpen={sectionIsOpen(sectionsState, it.id, 'kpis')}
                        onToggle={toggleEmpresaSection}
                        Icon={BarChart3}
                        accent={accent}
                        title="Indicadores rápidos"
                        className="sm:col-span-2 lg:col-span-1"
                      >
                        <ul className="space-y-2 mb-2 pt-3">
                          {(it.kpis || []).map((k) => (
                            <li key={k.id} className="flex gap-2 items-center group/k">
                              <input
                                type="text"
                                value={k.label}
                                onChange={(e) => patchSub(it.id, 'kpis', k.id, { label: e.target.value })}
                                placeholder="Nombre"
                                className="w-2/5 min-w-0 rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-xs focus:outline-none"
                              />
                              <input
                                type="text"
                                value={k.value}
                                onChange={(e) => patchSub(it.id, 'kpis', k.id, { value: e.target.value })}
                                placeholder="Valor"
                                className="flex-1 rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-xs focus:outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => removeSub(it.id, 'kpis', k.id)}
                                className="p-1 text-gray-600 hover:text-red-400 opacity-0 group-hover/k:opacity-100"
                                aria-label="Quitar"
                              >
                                <Trash2 size={14} />
                              </button>
                            </li>
                          ))}
                        </ul>
                        <button
                          type="button"
                          onClick={() =>
                            pushSub(it.id, 'kpis', {
                              id: `kpi-${Date.now()}`,
                              label: '',
                              value: '',
                            })
                          }
                          className="w-full py-2 rounded-xl border border-dashed border-white/15 text-xs text-gray-400 hover:text-white hover:border-blue-400/40 transition-colors"
                        >
                          + Indicador
                        </button>
                      </EmpresaSection>
                    </div>

                    <div className="grid gap-6 lg:grid-cols-2 mb-8">
                      <EmpresaSection
                        sectionId="enlaces"
                        empresaId={it.id}
                        isOpen={sectionIsOpen(sectionsState, it.id, 'enlaces')}
                        onToggle={toggleEmpresaSection}
                        Icon={LinkIcon}
                        accent={accent}
                        title="Enlaces y referencias"
                        className="bg-black/20"
                      >
                        <ul className="space-y-2 pt-3">
                          {(it.links || []).map((l) => (
                            <li key={l.id} className="flex flex-col sm:flex-row gap-2 group/l">
                              <input
                                type="text"
                                value={l.label}
                                onChange={(e) => patchSub(it.id, 'links', l.id, { label: e.target.value })}
                                placeholder="Etiqueta"
                                className="sm:w-1/3 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm focus:outline-none"
                              />
                              <input
                                type="url"
                                value={l.url}
                                onChange={(e) => patchSub(it.id, 'links', l.id, { url: e.target.value })}
                                placeholder="URL"
                                className="flex-1 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-cyan-200/80 focus:outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => removeSub(it.id, 'links', l.id)}
                                className="self-end sm:self-center p-2 text-gray-600 hover:text-red-400"
                              >
                                <Trash2 size={16} />
                              </button>
                            </li>
                          ))}
                        </ul>
                        <button
                          type="button"
                          onClick={() =>
                            pushSub(it.id, 'links', { id: `lnk-${Date.now()}`, label: '', url: '' })
                          }
                          className="mt-3 w-full py-2 rounded-xl border border-dashed border-white/15 text-xs text-gray-400 hover:border-blue-400/40"
                        >
                          + Enlace
                        </button>
                      </EmpresaSection>

                      <EmpresaSection
                        sectionId="contactos"
                        empresaId={it.id}
                        isOpen={sectionIsOpen(sectionsState, it.id, 'contactos')}
                        onToggle={toggleEmpresaSection}
                        Icon={Users}
                        accent={accent}
                        title="Personas clave"
                        className="bg-black/20"
                      >
                        <ul className="space-y-3 pt-3">
                          {(it.contacts || []).map((c) => (
                            <li
                              key={c.id}
                              className="rounded-xl border border-white/10 bg-black/30 p-3 space-y-2 group/c"
                            >
                              <div className="flex gap-2 flex-wrap">
                                <input
                                  type="text"
                                  value={c.name}
                                  onChange={(e) => patchSub(it.id, 'contacts', c.id, { name: e.target.value })}
                                  placeholder="Nombre"
                                  className="flex-1 min-w-[120px] rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-sm focus:outline-none"
                                />
                                <input
                                  type="text"
                                  value={c.role}
                                  onChange={(e) => patchSub(it.id, 'contacts', c.id, { role: e.target.value })}
                                  placeholder="Rol"
                                  className="flex-1 min-w-[100px] rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-sm focus:outline-none"
                                />
                              </div>
                              <div className="flex gap-2 flex-wrap">
                                <input
                                  type="text"
                                  value={c.phone || ''}
                                  onChange={(e) => patchSub(it.id, 'contacts', c.id, { phone: e.target.value })}
                                  placeholder="Teléfono"
                                  className="flex-1 min-w-[100px] rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-xs focus:outline-none"
                                />
                                <input
                                  type="email"
                                  value={c.email || ''}
                                  onChange={(e) => patchSub(it.id, 'contacts', c.id, { email: e.target.value })}
                                  placeholder="Email"
                                  className="flex-1 min-w-[120px] rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-xs focus:outline-none"
                                />
                                <button
                                  type="button"
                                  onClick={() => removeSub(it.id, 'contacts', c.id)}
                                  className="p-1.5 text-gray-600 hover:text-red-400"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </li>
                          ))}
                        </ul>
                        <button
                          type="button"
                          onClick={() =>
                            pushSub(it.id, 'contacts', {
                              id: `ct-${Date.now()}`,
                              name: '',
                              role: '',
                              phone: '',
                              email: '',
                            })
                          }
                          className="mt-3 w-full py-2 rounded-xl border border-dashed border-white/15 text-xs text-gray-400 hover:border-blue-400/40"
                        >
                          + Persona
                        </button>
                      </EmpresaSection>
                    </div>

                    <EmpresaSection
                      sectionId="notas"
                      empresaId={it.id}
                      isOpen={sectionIsOpen(sectionsState, it.id, 'notas')}
                      onToggle={toggleEmpresaSection}
                      Icon={FileText}
                      accent={accent}
                      title="Notas por área (amplio)"
                      className="mb-8 bg-black/20"
                    >
                      <div className="grid gap-4 md:grid-cols-3 pt-3">
                        <div>
                          <label className="block text-[10px] uppercase tracking-wider text-gray-500 mb-1.5 flex items-center gap-1">
                            <Briefcase size={10} /> General
                          </label>
                          <textarea
                            value={it.notesGeneral || ''}
                            onChange={(e) => patchItem(it.id, { notesGeneral: e.target.value })}
                            rows={5}
                            placeholder="Estrategia, cultura, recordatorios…"
                            className="w-full rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-y min-h-[7rem]"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase tracking-wider text-gray-500 mb-1.5 flex items-center gap-1">
                            <Landmark size={10} /> Legal / fiscal
                          </label>
                          <textarea
                            value={it.notesLegal || ''}
                            onChange={(e) => patchItem(it.id, { notesLegal: e.target.value })}
                            rows={5}
                            placeholder="Sociedad, impuestos, contratos…"
                            className="w-full rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-violet-500/30 resize-y min-h-[7rem]"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase tracking-wider text-gray-500 mb-1.5 flex items-center gap-1">
                            <Factory size={10} /> Operaciones
                          </label>
                          <textarea
                            value={it.notesOps || ''}
                            onChange={(e) => patchItem(it.id, { notesOps: e.target.value })}
                            rows={5}
                            placeholder="Proveedores, procesos, logística…"
                            className="w-full rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-teal-500/30 resize-y min-h-[7rem]"
                          />
                        </div>
                      </div>
                    </EmpresaSection>

                    <div className="grid gap-6 lg:grid-cols-2">
                      <EmpresaSection
                        sectionId="objetivos"
                        empresaId={it.id}
                        isOpen={sectionIsOpen(sectionsState, it.id, 'objetivos')}
                        onToggle={toggleEmpresaSection}
                        Icon={Sparkles}
                        accent={accent}
                        title="Objetivos estratégicos"
                        badge={
                          objectives.length > 0 ? (
                            <span className="text-[10px] text-gray-500 font-normal normal-case tracking-normal ml-1">
                              {objDone}/{objectives.length}
                            </span>
                          ) : null
                        }
                      >
                        {objectives.length > 0 && (
                          <div className="h-1.5 rounded-full bg-white/10 mb-3 mt-3 overflow-hidden">
                            <div
                              className={`h-full rounded-full bg-gradient-to-r ${accent.progress} transition-all duration-500`}
                              style={{ width: `${objPct}%` }}
                            />
                          </div>
                        )}
                        <ul className="space-y-2">
                          {objectives.map((o) => (
                            <li key={o.id} className="flex items-start gap-2 group/o">
                              <button
                                type="button"
                                onClick={() => patchSub(it.id, 'objectives', o.id, { done: !o.done })}
                                className="mt-0.5 text-gray-500 hover:text-emerald-400"
                              >
                                {o.done ? (
                                  <CheckCircle2 size={20} className="text-emerald-400" />
                                ) : (
                                  <Circle size={20} />
                                )}
                              </button>
                              <input
                                type="text"
                                value={o.text}
                                onChange={(e) => patchSub(it.id, 'objectives', o.id, { text: e.target.value })}
                                placeholder="Objetivo…"
                                className={`flex-1 bg-transparent text-sm border-b border-transparent focus:border-white/20 focus:outline-none pb-0.5 ${
                                  o.done ? 'text-gray-500 line-through' : 'text-gray-200'
                                }`}
                              />
                              <button
                                type="button"
                                onClick={() => removeSub(it.id, 'objectives', o.id)}
                                className="p-1 text-gray-600 hover:text-red-400 opacity-0 group-hover/o:opacity-100"
                              >
                                <Trash2 size={14} />
                              </button>
                            </li>
                          ))}
                        </ul>
                        <button
                          type="button"
                          onClick={() =>
                            pushSub(it.id, 'objectives', { id: `obj-${Date.now()}`, text: '', done: false })
                          }
                          className={`mt-3 w-full py-2 rounded-xl border border-dashed border-white/15 text-xs text-gray-400 transition-colors ${accent.stepHover}`}
                        >
                          + Objetivo
                        </button>
                      </EmpresaSection>

                      <EmpresaSection
                        sectionId="proximos"
                        empresaId={it.id}
                        isOpen={sectionIsOpen(sectionsState, it.id, 'proximos')}
                        onToggle={toggleEmpresaSection}
                        Icon={ListChecks}
                        accent={accent}
                        title="Próximos pasos"
                        badge={
                          nextActions.length > 0 ? (
                            <span className="text-[10px] text-gray-500 font-normal normal-case tracking-normal ml-1">
                              {actDone}/{nextActions.length}
                            </span>
                          ) : null
                        }
                      >
                        {nextActions.length > 0 && (
                          <div className="h-1.5 rounded-full bg-white/10 mb-3 mt-3 overflow-hidden">
                            <div
                              className={`h-full rounded-full bg-gradient-to-r ${accent.progress} transition-all duration-500`}
                              style={{ width: `${actPct}%` }}
                            />
                          </div>
                        )}
                        <ul className="space-y-2">
                          {nextActions.map((a) => (
                            <li key={a.id} className="flex items-start gap-2 group/a">
                              <button
                                type="button"
                                onClick={() => patchSub(it.id, 'nextActions', a.id, { done: !a.done })}
                                className="mt-0.5 text-gray-500 hover:text-emerald-400"
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
                                onChange={(e) => patchSub(it.id, 'nextActions', a.id, { text: e.target.value })}
                                placeholder="Acción concreta…"
                                className={`flex-1 bg-transparent text-sm border-b border-transparent focus:border-white/20 focus:outline-none pb-0.5 ${
                                  a.done ? 'text-gray-500 line-through' : 'text-gray-200'
                                }`}
                              />
                              <button
                                type="button"
                                onClick={() => removeSub(it.id, 'nextActions', a.id)}
                                className="p-1 text-gray-600 hover:text-red-400 opacity-0 group-hover/a:opacity-100"
                              >
                                <Trash2 size={14} />
                              </button>
                            </li>
                          ))}
                        </ul>
                        <button
                          type="button"
                          onClick={() =>
                            pushSub(it.id, 'nextActions', { id: `na-${Date.now()}`, text: '', done: false })
                          }
                          className={`mt-3 w-full py-2 rounded-xl border border-dashed border-white/15 text-xs text-gray-400 transition-colors ${accent.stepHover}`}
                        >
                          + Paso
                        </button>
                      </EmpresaSection>
                    </div>

                    <p className="mt-6 text-[10px] text-gray-600 text-right">
                      Actualizado{' '}
                      {it.updatedAt
                        ? new Date(it.updatedAt).toLocaleString('es-AR', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : ''}
                    </p>
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
