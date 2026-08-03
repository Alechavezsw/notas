import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  ArrowLeft,
  Heart,
  Droplets,
  Moon,
  Scale,
  Smile,
  Plus,
  Minus,
  Calendar,
  TrendingUp,
  Loader2,
  ListChecks,
  Activity,
  FlaskConical,
  HeartPulse,
  Laugh,
  Eye,
  Brain,
  Bug,
  ShieldAlert,
  Sparkles,
  MessageSquare,
  CheckCircle2,
  Circle,
} from 'lucide-react';

const STORAGE_KEY = 'alenotes_salud';
const SALUD_ID = 'default';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

const MOOD_OPTIONS = [
  { value: 1, label: 'Muy mal', emoji: '😢', color: 'bg-red-100 text-red-700 border-red-200' },
  { value: 2, label: 'Mal', emoji: '😕', color: 'bg-orange-100 text-orange-700 border-orange-200' },
  { value: 3, label: 'Regular', emoji: '😐', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  { value: 4, label: 'Bien', emoji: '🙂', color: 'bg-lime-100 text-lime-700 border-lime-200' },
  { value: 5, label: 'Muy bien', emoji: '😊', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
];

/** Pasos del día: áreas de salud a marcar como tareas atendidas hoy. */
const PASOS_SALUD = [
  { key: 'higado', label: 'Hígado', Icon: Activity },
  { key: 'colesterol', label: 'Colesterol', Icon: FlaskConical },
  { key: 'corazon', label: 'Corazón', Icon: HeartPulse },
  { key: 'peso', label: 'Peso', Icon: Scale },
  { key: 'dentadura', label: 'Dentadura', Icon: Laugh },
  { key: 'acne', label: 'Acné', Icon: Sparkles },
  { key: 'vista', label: 'Vista', Icon: Eye },
  { key: 'estres', label: 'Estrés', Icon: Brain },
  { key: 'hongos', label: 'Hongos', Icon: Bug },
  { key: 'vph', label: 'VPH', Icon: ShieldAlert },
  { key: 'otros', label: 'Otros', Icon: MessageSquare },
];

function tienePasosSalud(r) {
  if (!r || typeof r !== 'object') return false;
  const p = r.pasosSalud;
  if (p && typeof p === 'object' && Object.values(p).some(Boolean)) return true;
  return false;
}

function labelsPasosActivos(r) {
  if (!r?.pasosSalud || typeof r.pasosSalud !== 'object') return [];
  return PASOS_SALUD.filter((item) => r.pasosSalud[item.key]).map((item) => item.label);
}

function pasosStats(pasosSalud) {
  const map = pasosSalud && typeof pasosSalud === 'object' ? pasosSalud : {};
  const done = PASOS_SALUD.filter((item) => map[item.key]).length;
  const total = PASOS_SALUD.length;
  return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
}

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

export default function Salud() {
  const [registros, setRegistros] = useState({});
  const [isLoading, setIsLoading] = useState(!!supabase);
  const [saveStatus, setSaveStatus] = useState('saved');
  const [saveError, setSaveError] = useState(null);
  const saveTimeoutRef = useRef(null);

  const todayKey = getTodayKey();
  const hoy = registros[todayKey] || {
    peso: '',
    vasosAgua: 0,
    horasSueno: '',
    animo: null,
    pasosSalud: {},
  };

  useEffect(() => {
    if (supabase) {
      (async () => {
        try {
          const { data, error } = await supabase
            .from('salud')
            .select('registros')
            .eq('id', SALUD_ID)
            .maybeSingle();
          if (!error && data?.registros && typeof data.registros === 'object') {
            setRegistros(data.registros);
          }
        } catch (_) {}
        setIsLoading(false);
      })();
    } else {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        setRegistros(raw ? JSON.parse(raw) : {});
      } catch (_) {}
      setIsLoading(false);
    }
  }, []);

  const saveToBackend = useCallback(async (reg) => {
    if (supabase) {
      setSaveStatus('saving');
      setSaveError(null);
      try {
        const { error } = await supabase.from('salud').upsert(
          { id: SALUD_ID, registros: reg, updated_at: new Date().toISOString() },
          { onConflict: 'id' }
        );
        if (error) throw error;
        setSaveStatus('saved');
      } catch (err) {
        const msg = err?.message || err?.error_description || String(err);
        console.error('Error guardando salud:', err);
        setSaveStatus('error');
        setSaveError(msg);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(reg));
        } catch (_) {}
      }
    } else {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(reg));
      } catch (_) {}
    }
  }, []);

  useEffect(() => {
    if (isLoading) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => saveToBackend(registros), 1000);
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [registros, isLoading, saveToBackend]);

  const updateHoy = (field, value) => {
    setRegistros((prev) => ({
      ...prev,
      [todayKey]: {
        ...(prev[todayKey] || {}),
        [field]: value,
      },
    }));
  };

  const togglePasoSalud = (key) => {
    const prevMap = hoy.pasosSalud && typeof hoy.pasosSalud === 'object' ? hoy.pasosSalud : {};
    updateHoy('pasosSalud', { ...prevMap, [key]: !prevMap[key] });
  };

  const pasosHoy = pasosStats(hoy.pasosSalud);

  const diasConDatos = useMemo(
    () =>
      Object.keys(registros)
        .filter((k) => {
          const r = registros[k];
          return (
            r.peso ||
            r.vasosAgua ||
            r.horasSueno ||
            r.animo ||
            tienePasosSalud(r)
          );
        })
        .sort()
        .reverse()
        .slice(0, 14),
    [registros]
  );

  const chartData = useMemo(() => {
    return [...diasConDatos].reverse().map((key) => {
      const r = registros[key] || {};
      const date = new Date(key);
      const label = date.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
      return {
        key,
        label,
        peso: r.peso ? Number(r.peso) : null,
        vasos: r.vasosAgua ?? 0,
        sueno: r.horasSueno ? Number(r.horasSueno) : null,
        animo: r.animo ?? null,
      };
    });
  }, [diasConDatos, registros]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50/80 via-white to-sky-50/80 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-gray-500">
          <div className="w-14 h-14 rounded-2xl bg-rose-100 flex items-center justify-center">
            <Loader2 size={28} className="animate-spin text-rose-600" />
          </div>
          <p className="text-sm font-medium">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50/80 via-white to-sky-50/80">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-gray-200/60 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link
            to="/"
            className="flex items-center gap-2 text-gray-600 hover:text-rose-600 transition-colors font-medium"
          >
            <ArrowLeft size={20} />
            Notas
          </Link>
          <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-rose-600 flex items-center justify-center text-white shadow-lg shadow-rose-200">
              <Heart size={22} />
            </div>
            Salud
          </h1>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {!supabase && <span className="text-xs text-amber-600" title="Configura .env con VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY">Solo local</span>}
            {supabase && (
              <span className="text-xs">
                {saveStatus === 'saving' && <span className="flex items-center gap-1 text-amber-600"><Loader2 size={12} className="animate-spin" /> Guardando...</span>}
                {saveStatus === 'saved' && <span className="text-emerald-600">Guardado</span>}
                {saveStatus === 'error' && <span className="text-red-600" title={saveError || 'Error'}>Error{saveError ? `: ${saveError}` : ''}</span>}
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 pb-16">
        <p className="text-sm text-gray-500 mb-6 flex items-center gap-2">
          <Calendar size={16} />
          Hoy, {new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>

        {/* Pasos de salud */}
        <section className="rounded-2xl bg-white/90 backdrop-blur border border-gray-200/60 shadow-lg shadow-gray-100 p-5 mb-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-11 h-11 rounded-xl bg-emerald-100 flex items-center justify-center">
              <ListChecks size={22} className="text-emerald-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-semibold text-gray-800">Pasos de salud</h2>
                <span className="text-xs tabular-nums text-emerald-700 font-medium">{pasosHoy.done}/{pasosHoy.total}</span>
              </div>
              <p className="text-xs text-gray-500">Marcá como tarea cada área en la que hoy te ocupaste</p>
            </div>
          </div>
          {pasosHoy.total > 0 && (
            <div className="h-1.5 rounded-full bg-emerald-100 mb-3 overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all"
                style={{ width: `${pasosHoy.pct}%` }}
              />
            </div>
          )}
          <ul className="space-y-1">
            {PASOS_SALUD.map(({ key, label, Icon }) => {
              const on = !!(hoy.pasosSalud && hoy.pasosSalud[key]);
              return (
                <li key={key}>
                  <button
                    type="button"
                    onClick={() => togglePasoSalud(key)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all ${
                      on
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                        : 'bg-gray-50/80 border-gray-100 text-gray-700 hover:border-gray-200 hover:bg-white'
                    }`}
                  >
                    {on ? (
                      <CheckCircle2 size={20} className="text-emerald-500 shrink-0" />
                    ) : (
                      <Circle size={20} className="text-gray-300 shrink-0" />
                    )}
                    <Icon size={18} className={`shrink-0 ${on ? 'text-emerald-600' : 'text-gray-400'}`} />
                    <span className={`text-sm font-medium flex-1 ${on ? 'line-through decoration-emerald-300/80' : ''}`}>
                      {label}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Peso */}
        <section className="rounded-2xl bg-white/90 backdrop-blur border border-gray-200/60 shadow-lg shadow-gray-100 p-5 mb-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-11 h-11 rounded-xl bg-sky-100 flex items-center justify-center">
              <Scale size={22} className="text-sky-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-800">Peso</h2>
              <p className="text-xs text-gray-500">kg</p>
            </div>
          </div>
          <input
            type="number"
            placeholder="Ej. 72.5"
            step="0.1"
            min="0"
            value={hoy.peso ?? ''}
            onChange={(e) => updateHoy('peso', e.target.value ? parseFloat(e.target.value) : '')}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-lg font-medium focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-300 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
        </section>

        {/* Vasos de agua */}
        <section className="rounded-2xl bg-white/90 backdrop-blur border border-gray-200/60 shadow-lg shadow-gray-100 p-5 mb-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-11 h-11 rounded-xl bg-blue-100 flex items-center justify-center">
              <Droplets size={22} className="text-blue-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-800">Vasos de agua</h2>
              <p className="text-xs text-gray-500">Objetivo: 8 al día</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => updateHoy('vasosAgua', Math.max(0, (hoy.vasosAgua || 0) - 1))}
              className="w-12 h-12 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 font-bold transition-colors"
            >
              <Minus size={20} />
            </button>
            <span className="text-3xl font-bold text-gray-800 tabular-nums min-w-[3rem] text-center">
              {hoy.vasosAgua || 0}
            </span>
            <button
              type="button"
              onClick={() => updateHoy('vasosAgua', (hoy.vasosAgua || 0) + 1)}
              className="w-12 h-12 rounded-full bg-blue-500 hover:bg-blue-600 flex items-center justify-center text-white font-bold transition-colors shadow-md shadow-blue-200"
            >
              <Plus size={20} />
            </button>
          </div>
          <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-400 to-blue-500 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, ((hoy.vasosAgua || 0) / 8) * 100)}%` }}
            />
          </div>
        </section>

        {/* Horas de sueño */}
        <section className="rounded-2xl bg-white/90 backdrop-blur border border-gray-200/60 shadow-lg shadow-gray-100 p-5 mb-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-11 h-11 rounded-xl bg-indigo-100 flex items-center justify-center">
              <Moon size={22} className="text-indigo-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-800">Horas de sueño</h2>
              <p className="text-xs text-gray-500">Última noche</p>
            </div>
          </div>
          <input
            type="number"
            placeholder="Ej. 7.5"
            step="0.5"
            min="0"
            max="24"
            value={hoy.horasSueno ?? ''}
            onChange={(e) => updateHoy('horasSueno', e.target.value ? parseFloat(e.target.value) : '')}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-lg font-medium focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
        </section>

        {/* Estado de ánimo */}
        <section className="rounded-2xl bg-white/90 backdrop-blur border border-gray-200/60 shadow-lg shadow-gray-100 p-5 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-11 h-11 rounded-xl bg-amber-100 flex items-center justify-center">
              <Smile size={22} className="text-amber-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-800">¿Cómo te sentís hoy?</h2>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {MOOD_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => updateHoy('animo', hoy.animo === opt.value ? null : opt.value)}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 transition-all ${
                  hoy.animo === opt.value
                    ? `${opt.color} border-current scale-105 shadow-md`
                    : 'bg-gray-50 border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
                title={opt.label}
              >
                <span className="text-xl">{opt.emoji}</span>
                <span className="text-sm font-medium hidden sm:inline">{opt.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Gráficos */}
        {chartData.length > 0 && (
          <section className="rounded-2xl bg-white/90 backdrop-blur border border-gray-200/60 shadow-lg shadow-gray-100 overflow-hidden mb-6">
            <div className="bg-gradient-to-r from-rose-500/10 to-sky-500/10 px-5 py-4 border-b border-gray-100 flex items-center gap-2">
              <TrendingUp size={20} className="text-rose-500" />
              <h2 className="font-semibold text-gray-800">Gráficos (últimos días)</h2>
            </div>
            <div className="p-4 space-y-6">
              {chartData.some((d) => d.peso != null) && (
                <div>
                  <h3 className="text-sm font-medium text-gray-600 mb-2 flex items-center gap-2">
                    <Scale size={16} className="text-sky-600" /> Peso (kg)
                  </h3>
                  <ResponsiveContainer width="100%" height={180}>
                    <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} domain={['auto', 'auto']} />
                      <Tooltip formatter={(v) => (v != null ? `${v} kg` : '-')} labelFormatter={(l) => l} />
                      <Line type="monotone" dataKey="peso" stroke="#0ea5e9" strokeWidth={2} dot={{ r: 4 }} name="Peso" connectNulls />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
              {chartData.some((d) => d.vasos > 0) && (
                <div>
                  <h3 className="text-sm font-medium text-gray-600 mb-2 flex items-center gap-2">
                    <Droplets size={16} className="text-blue-600" /> Vasos de agua
                  </h3>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="vasos" fill="#3b82f6" name="Vasos" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
              {chartData.some((d) => d.sueno != null) && (
                <div>
                  <h3 className="text-sm font-medium text-gray-600 mb-2 flex items-center gap-2">
                    <Moon size={16} className="text-indigo-600" /> Horas de sueño
                  </h3>
                  <ResponsiveContainer width="100%" height={180}>
                    <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} domain={[0, 12]} />
                      <Tooltip formatter={(v) => (v != null ? `${v} h` : '-')} labelFormatter={(l) => l} />
                      <Line type="monotone" dataKey="sueno" stroke="#6366f1" strokeWidth={2} dot={{ r: 4 }} name="Sueño (h)" connectNulls />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Historial reciente */}
        {diasConDatos.length > 0 && (
          <section className="rounded-2xl bg-white/90 backdrop-blur border border-gray-200/60 shadow-lg shadow-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-rose-500/10 to-sky-500/10 px-5 py-4 border-b border-gray-100 flex items-center gap-2">
              <TrendingUp size={20} className="text-rose-500" />
              <h2 className="font-semibold text-gray-800">Últimos registros</h2>
            </div>
            <div className="divide-y divide-gray-100 max-h-64 overflow-y-auto">
              {diasConDatos.map((key) => {
                const r = registros[key];
                const dateStr = new Date(key).toLocaleDateString('es-AR', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                });
                const pasosLabels = labelsPasosActivos(r);
                return (
                  <div key={key} className="px-5 py-3 flex flex-wrap items-center gap-3 text-sm">
                    <span className="font-medium text-gray-500 w-28">{dateStr}</span>
                    {r.peso && <span className="text-gray-700">Peso: <strong>{r.peso} kg</strong></span>}
                    {(r.vasosAgua ?? 0) > 0 && <span className="text-blue-600">Agua: {r.vasosAgua} vasos</span>}
                    {r.horasSueno && <span className="text-indigo-600">Sueño: {r.horasSueno}h</span>}
                    {r.animo && (
                      <span className={MOOD_OPTIONS.find((o) => o.value === r.animo)?.color}>
                        {MOOD_OPTIONS.find((o) => o.value === r.animo)?.emoji}
                      </span>
                    )}
                    {pasosLabels.length > 0 && (
                      <span className="text-emerald-700 text-xs font-medium">Pasos: {pasosLabels.join(', ')}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
