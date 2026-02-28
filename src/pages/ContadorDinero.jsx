import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import {
  ArrowLeft,
  DollarSign,
  Wallet,
  TrendingUp,
  Plus,
  Trash2,
  Calendar,
  Loader2,
  PiggyBank,
} from 'lucide-react';

const STORAGE_KEY = 'alenotes_billetera';
const BILLETERA_ID = 'default';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

const COLORS = { actual: '#059669', aCobrar: '#d97706', total: '#4f46e5' };

function formatMoney(num) {
  return new Intl.NumberFormat('es-AR', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

function EntradaLista({ items, onAdd, onUpdate, onDelete, emptyMessage, addLabel, withDate = false }) {
  return (
    <div className="space-y-2">
      {items.length === 0 ? (
        <p className="text-sm text-gray-400 py-4 text-center">{emptyMessage}</p>
      ) : (
        items.map((item) => (
          <div
            key={item.id}
            className="flex flex-wrap items-center gap-2 p-3 rounded-xl bg-white/80 hover:bg-white border border-gray-100 transition-all"
          >
            <input
              type="text"
              placeholder="Concepto"
              value={item.concepto || ''}
              onChange={(e) => onUpdate(item.id, 'concepto', e.target.value)}
              className="flex-1 min-w-[100px] px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-300"
            />
            <div className="flex items-center gap-1">
              <span className="text-gray-500 text-sm">$</span>
              <input
                type="number"
                placeholder="0"
                min={0}
                value={item.monto ?? ''}
                onChange={(e) => onUpdate(item.id, 'monto', e.target.value)}
                className="w-24 px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-200 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
            {withDate && (
              <div className="flex items-center gap-1">
                <Calendar size={14} className="text-gray-400" />
                <input
                  type="date"
                  value={item.fecha || ''}
                  onChange={(e) => onUpdate(item.id, 'fecha', e.target.value)}
                  className="px-2 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-200"
                />
              </div>
            )}
            <button
              type="button"
              onClick={() => onDelete(item.id)}
              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              title="Eliminar"
            >
              <Trash2 size={18} />
            </button>
          </div>
        ))
      )}
      <button
        type="button"
        onClick={onAdd}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-gray-200 text-gray-500 hover:border-emerald-300 hover:text-emerald-600 hover:bg-emerald-50/50 transition-all text-sm font-medium"
      >
        <Plus size={18} />
        {addLabel}
      </button>
    </div>
  );
}

export default function ContadorDinero() {
  const [dineroActual, setDineroActual] = useState([]);
  const [aCobrar, setACobrar] = useState([]);
  const [isLoading, setIsLoading] = useState(!!supabase);
  const [saveStatus, setSaveStatus] = useState('saved');
  const saveTimeoutRef = useRef(null);

  const totalActual = useMemo(
    () => dineroActual.reduce((sum, it) => sum + (Number(it.monto) || 0), 0),
    [dineroActual]
  );
  const totalACobrar = useMemo(
    () => aCobrar.reduce((sum, it) => sum + (Number(it.monto) || 0), 0),
    [aCobrar]
  );
  const totalProyectado = totalActual + totalACobrar;

  const chartPieData = useMemo(() => {
    if (totalActual === 0 && totalACobrar === 0) return [{ name: 'Sin datos', value: 1, fill: '#e5e7eb' }];
    const data = [];
    if (totalActual > 0) data.push({ name: 'Dinero actual', value: totalActual, fill: COLORS.actual });
    if (totalACobrar > 0) data.push({ name: 'A cobrar', value: totalACobrar, fill: COLORS.aCobrar });
    return data.length ? data : [{ name: 'Sin datos', value: 1, fill: '#e5e7eb' }];
  }, [totalActual, totalACobrar]);

  const chartBarData = useMemo(() => {
    const items = [
      ...dineroActual.filter((it) => Number(it.monto) > 0).map((it) => ({ nombre: it.concepto || 'Sin concepto', monto: Number(it.monto), tipo: 'actual' })),
      ...aCobrar.filter((it) => Number(it.monto) > 0).map((it) => ({ nombre: it.concepto || 'Sin concepto', monto: Number(it.monto), tipo: 'aCobrar' })),
    ];
    return items.slice(0, 10);
  }, [dineroActual, aCobrar]);

  useEffect(() => {
    if (supabase) {
      (async () => {
        try {
          const { data, error } = await supabase
            .from('billetera')
            .select('dinero_actual, a_cobrar, cantidades')
            .eq('id', BILLETERA_ID)
            .maybeSingle();
          if (!error && data) {
            if (Array.isArray(data.dinero_actual) && data.dinero_actual.length > 0) {
              setDineroActual(data.dinero_actual.map((it) => ({ ...it, id: it.id ?? Date.now() + Math.random() })));
            }
            if (Array.isArray(data.a_cobrar)) {
              setACobrar(data.a_cobrar.map((it) => ({ ...it, id: it.id ?? Date.now() + Math.random() })));
            }
            if (Array.isArray(data.dinero_actual) && data.dinero_actual.length === 0 && data.cantidades && typeof data.cantidades === 'object') {
              const total = Object.entries(data.cantidades).reduce((s, [v, c]) => s + Number(v) * (Number(c) || 0), 0);
              if (total > 0) {
                setDineroActual([{ id: Date.now(), concepto: 'Efectivo (migrado)', monto: total }]);
              }
            }
          }
        } catch (_) {}
        setIsLoading(false);
      })();
    } else {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const data = JSON.parse(raw);
          if (Array.isArray(data.dineroActual)) setDineroActual(data.dineroActual);
          if (Array.isArray(data.aCobrar)) setACobrar(data.aCobrar);
        }
      } catch (_) {}
      setIsLoading(false);
    }
  }, []);

  const saveToBackend = useCallback(async (dineroActualData, aCobrarData) => {
    if (supabase) {
      setSaveStatus('saving');
      try {
        const { error } = await supabase.from('billetera').upsert(
          {
            id: BILLETERA_ID,
            dinero_actual: dineroActualData,
            a_cobrar: aCobrarData,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        );
        if (error) throw error;
        setSaveStatus('saved');
      } catch (err) {
        console.error('Error guardando billetera:', err);
        setSaveStatus('error');
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify({ dineroActual: dineroActualData, aCobrar: aCobrarData }));
        } catch (_) {}
      }
    } else {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ dineroActual: dineroActualData, aCobrar: aCobrarData }));
      } catch (_) {}
    }
  }, []);

  useEffect(() => {
    if (isLoading) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => saveToBackend(dineroActual, aCobrar), 1000);
    return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); };
  }, [dineroActual, aCobrar, isLoading, saveToBackend]);

  const addEntrada = (setter) => {
    setter((prev) => [...prev, { id: Date.now(), concepto: '', monto: '', fecha: '' }]);
  };
  const updateEntrada = (setter, id, field, value) => {
    setter((prev) => prev.map((it) => (it.id === id ? { ...it, [field]: value } : it)));
  };
  const deleteEntrada = (setter, id) => {
    setter((prev) => prev.filter((it) => it.id !== id));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-amber-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-gray-500">
          <div className="w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center">
            <Loader2 size={28} className="animate-spin text-emerald-600" />
          </div>
          <p className="text-sm font-medium">Cargando billetera...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50/80 via-white to-amber-50/80">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-gray-200/60 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link
            to="/"
            className="flex items-center gap-2 text-gray-600 hover:text-emerald-600 transition-colors font-medium"
          >
            <ArrowLeft size={20} />
            Notas
          </Link>
          <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-200">
              <Wallet size={22} />
            </div>
            Billetera
          </h1>
          <div className="flex items-center gap-2">
            {supabase && (
              <span className="text-xs">
                {saveStatus === 'saving' && <span className="flex items-center gap-1 text-amber-600"><Loader2 size={12} className="animate-spin" /> Guardando...</span>}
                {saveStatus === 'saved' && <span className="text-emerald-600">Guardado</span>}
                {saveStatus === 'error' && <span className="text-red-600">Error</span>}
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 pb-16">
        {/* Resumen con gradientes */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 p-5 text-white shadow-xl shadow-emerald-200/50">
            <div className="flex items-center gap-2 mb-1">
              <PiggyBank size={18} className="opacity-90" />
              <span className="text-emerald-100 text-xs font-semibold uppercase tracking-wider">Dinero actual</span>
            </div>
            <p className="text-2xl md:text-3xl font-bold tabular-nums">${formatMoney(totalActual)}</p>
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 p-5 text-white shadow-xl shadow-amber-200/50">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp size={18} className="opacity-90" />
              <span className="text-amber-100 text-xs font-semibold uppercase tracking-wider">A cobrar</span>
            </div>
            <p className="text-2xl md:text-3xl font-bold tabular-nums">${formatMoney(totalACobrar)}</p>
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 p-5 text-white shadow-xl shadow-indigo-200/50">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign size={18} className="opacity-90" />
              <span className="text-indigo-200 text-xs font-semibold uppercase tracking-wider">Total proyectado</span>
            </div>
            <p className="text-2xl md:text-3xl font-bold tabular-nums">${formatMoney(totalProyectado)}</p>
          </div>
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="rounded-2xl bg-white/90 backdrop-blur border border-gray-200/60 shadow-lg shadow-gray-100 p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Distribución</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, value }) => (value > 0 ? `${name}: $${formatMoney(value)}` : null)}
                  >
                    {chartPieData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} stroke="white" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => [`$${formatMoney(v)}`, '']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="rounded-2xl bg-white/90 backdrop-blur border border-gray-200/60 shadow-lg shadow-gray-100 p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Detalle por concepto (top 10)</h3>
            <div className="h-64">
              {chartBarData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-gray-400 text-sm">Agregá conceptos y montos para ver el gráfico</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartBarData} layout="vertical" margin={{ left: 0, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis type="number" tickFormatter={(v) => `$${formatMoney(v)}`} fontSize={11} />
                    <YAxis type="category" dataKey="nombre" width={80} fontSize={11} tick={{ fill: '#6b7280' }} />
                    <Tooltip formatter={(v) => [`$${formatMoney(v)}`, 'Monto']} labelFormatter={(l) => l} />
                    <Bar dataKey="monto" fill={COLORS.actual} radius={[0, 4, 4, 0]} name="Monto" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        {/* Dinero actual - misma UI que A cobrar */}
        <section className="rounded-2xl bg-white/90 backdrop-blur border border-gray-200/60 shadow-lg shadow-gray-100 overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-emerald-500/10 to-emerald-600/5 px-5 py-4 border-b border-emerald-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center">
                <PiggyBank size={18} className="text-emerald-600" />
              </div>
              <h2 className="font-semibold text-gray-800">Dinero actual</h2>
            </div>
            <span className="text-lg font-bold text-emerald-600 tabular-nums">${formatMoney(totalActual)}</span>
          </div>
          <div className="p-4">
            <EntradaLista
              items={dineroActual}
              onAdd={() => addEntrada(setDineroActual)}
              onUpdate={(id, field, value) => updateEntrada(setDineroActual, id, field, value)}
              onDelete={(id) => deleteEntrada(setDineroActual, id)}
              emptyMessage="No hay entradas. Agregá billetes o montos que tenés en mano."
              addLabel="Agregar billete / monto"
              withDate={true}
            />
          </div>
        </section>

        {/* A cobrar */}
        <section className="rounded-2xl bg-white/90 backdrop-blur border border-gray-200/60 shadow-lg shadow-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-amber-500/10 to-amber-600/5 px-5 py-4 border-b border-amber-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center">
                <TrendingUp size={18} className="text-amber-600" />
              </div>
              <h2 className="font-semibold text-gray-800">A cobrar</h2>
            </div>
            <span className="text-lg font-bold text-amber-600 tabular-nums">${formatMoney(totalACobrar)}</span>
          </div>
          <div className="p-4">
            <EntradaLista
              items={aCobrar}
              onAdd={() => addEntrada(setACobrar)}
              onUpdate={(id, field, value) => updateEntrada(setACobrar, id, field, value)}
              onDelete={(id) => deleteEntrada(setACobrar, id)}
              emptyMessage="No hay expectativas de cobro. Agregá conceptos y montos que esperás cobrar."
              addLabel="Agregar expectativa"
              withDate={true}
            />
          </div>
        </section>
      </main>
    </div>
  );
}
