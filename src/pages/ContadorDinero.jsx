import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import {
  Banknote,
  Coins,
  ArrowLeft,
  RotateCcw,
  DollarSign,
  Wallet,
  TrendingUp,
  Plus,
  Trash2,
  Calendar,
  Loader2,
} from 'lucide-react';

const STORAGE_KEY = 'alenotes_billetera';
const BILLETERA_ID = 'default';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

const DENOMINACIONES_DEFAULT = [
  { valor: 10000, label: '$10.000', tipo: 'billete' },
  { valor: 5000, label: '$5.000', tipo: 'billete' },
  { valor: 2000, label: '$2.000', tipo: 'billete' },
  { valor: 1000, label: '$1.000', tipo: 'billete' },
  { valor: 500, label: '$500', tipo: 'billete' },
  { valor: 200, label: '$200', tipo: 'billete' },
  { valor: 100, label: '$100', tipo: 'billete' },
  { valor: 50, label: '$50', tipo: 'billete' },
  { valor: 20, label: '$20', tipo: 'billete' },
  { valor: 10, label: '$10', tipo: 'moneda' },
  { valor: 5, label: '$5', tipo: 'moneda' },
  { valor: 2, label: '$2', tipo: 'moneda' },
  { valor: 1, label: '$1', tipo: 'moneda' },
];

function formatMoney(num) {
  return new Intl.NumberFormat('es-AR', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

const initialCantidades = () =>
  DENOMINACIONES_DEFAULT.reduce((acc, d) => ({ ...acc, [d.valor]: 0 }), {});

export default function ContadorDinero() {
  const [cantidades, setCantidades] = useState(initialCantidades);
  const [aCobrar, setACobrar] = useState([]);
  const [isLoading, setIsLoading] = useState(!!supabase);
  const [saveStatus, setSaveStatus] = useState('saved'); // 'saved' | 'saving' | 'error'
  const saveTimeoutRef = useRef(null);

  // Cargar datos: Supabase o localStorage
  useEffect(() => {
    if (supabase) {
      (async () => {
        try {
          const { data, error } = await supabase
            .from('billetera')
            .select('cantidades, a_cobrar')
            .eq('id', BILLETERA_ID)
            .maybeSingle();
          if (!error && data) {
            if (data.cantidades && typeof data.cantidades === 'object') {
              setCantidades((prev) => ({ ...initialCantidades(), ...prev, ...data.cantidades }));
            }
            if (Array.isArray(data.a_cobrar)) {
              setACobrar(data.a_cobrar.map((it) => ({ ...it, id: it.id ?? Date.now() + Math.random() })));
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
          if (data.cantidades) setCantidades((prev) => ({ ...initialCantidades(), ...prev, ...data.cantidades }));
          if (Array.isArray(data.aCobrar)) setACobrar(data.aCobrar);
        }
      } catch (_) {}
      setIsLoading(false);
    }
  }, []);

  // Guardar en Supabase (con debounce) o localStorage
  const saveToBackend = useCallback(async (cant, aCobrarData) => {
    if (supabase) {
      setSaveStatus('saving');
      try {
        const { error } = await supabase
          .from('billetera')
          .upsert(
            {
              id: BILLETERA_ID,
              cantidades: cant,
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
          localStorage.setItem(STORAGE_KEY, JSON.stringify({ cantidades: cant, aCobrar: aCobrarData }));
        } catch (_) {}
      }
    } else {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ cantidades: cant, aCobrar: aCobrarData }));
      } catch (_) {}
    }
  }, []);

  useEffect(() => {
    if (isLoading) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      saveToBackend(cantidades, aCobrar);
    }, 1000);
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [cantidades, aCobrar, isLoading, saveToBackend]);

  const saldoActual = useMemo(() => {
    return Object.entries(cantidades).reduce(
      (sum, [valor, cant]) => sum + Number(valor) * (Number(cant) || 0),
      0
    );
  }, [cantidades]);

  const totalACobrar = useMemo(() => {
    return aCobrar.reduce((sum, item) => sum + (Number(item.monto) || 0), 0);
  }, [aCobrar]);

  const totalProyectado = saldoActual + totalACobrar;

  const cambiarCantidad = (valor, delta) => {
    setCantidades((prev) => ({
      ...prev,
      [valor]: Math.max(0, (prev[valor] || 0) + delta),
    }));
  };

  const setCantidadDirecta = (valor, value) => {
    const n = parseInt(value, 10);
    setCantidades((prev) => ({
      ...prev,
      [valor]: isNaN(n) ? 0 : Math.max(0, n),
    }));
  };

  const reiniciarSaldo = () => {
    setCantidades(
      DENOMINACIONES_DEFAULT.reduce((acc, d) => ({ ...acc, [d.valor]: 0 }), {})
    );
  };

  const agregarExpectativa = () => {
    setACobrar((prev) => [
      ...prev,
      {
        id: Date.now(),
        concepto: '',
        monto: '',
        fecha: '',
      },
    ]);
  };

  const actualizarExpectativa = (id, field, value) => {
    setACobrar((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  const eliminarExpectativa = (id) => {
    setACobrar((prev) => prev.filter((item) => item.id !== id));
  };

  const billetes = DENOMINACIONES_DEFAULT.filter((d) => d.tipo === 'billete');
  const monedas = DENOMINACIONES_DEFAULT.filter((d) => d.tipo === 'moneda');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-gray-500">
          <Loader2 size={32} className="animate-spin text-emerald-600" />
          <p className="text-sm">Cargando billetera...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link
            to="/"
            className="flex items-center gap-2 text-gray-600 hover:text-indigo-600 transition-colors"
          >
            <ArrowLeft size={20} />
            <span className="font-medium">Notas</span>
          </Link>
          <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Wallet size={24} className="text-emerald-600" />
            Billetera
          </h1>
          <div className="flex items-center gap-2">
            {supabase && (
              <span className="text-xs text-gray-400">
                {saveStatus === 'saving' && (
                  <span className="flex items-center gap-1 text-amber-600">
                    <Loader2 size={12} className="animate-spin" /> Guardando...
                  </span>
                )}
                {saveStatus === 'saved' && <span className="text-emerald-600">Guardado</span>}
                {saveStatus === 'error' && <span className="text-red-600">Error al guardar</span>}
              </span>
            )}
            <button
              onClick={reiniciarSaldo}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
              title="Reiniciar saldo"
            >
              <RotateCcw size={18} />
              <span className="hidden sm:inline text-sm">Reiniciar</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-6 pb-12">
        {/* Resumen */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          <div className="bg-emerald-600 text-white rounded-xl p-4 shadow-md">
            <p className="text-emerald-100 text-xs font-medium uppercase tracking-wider">
              Dinero actual
            </p>
            <p className="text-2xl md:text-3xl font-bold tabular-nums mt-1">
              ${formatMoney(saldoActual)}
            </p>
          </div>
          <div className="bg-amber-500 text-white rounded-xl p-4 shadow-md">
            <p className="text-amber-100 text-xs font-medium uppercase tracking-wider">
              A cobrar
            </p>
            <p className="text-2xl md:text-3xl font-bold tabular-nums mt-1">
              ${formatMoney(totalACobrar)}
            </p>
          </div>
          <div className="bg-indigo-600 text-white rounded-xl p-4 shadow-md">
            <p className="text-indigo-200 text-xs font-medium uppercase tracking-wider">
              Total proyectado
            </p>
            <p className="text-2xl md:text-3xl font-bold tabular-nums mt-1">
              ${formatMoney(totalProyectado)}
            </p>
          </div>
        </div>

        {/* Dinero actual: billetes y monedas */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center gap-2">
            <DollarSign size={20} className="text-emerald-500" />
            <h2 className="font-semibold text-gray-800">Dinero en mano</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
            <div>
              <div className="px-4 py-2 bg-indigo-50/50 border-b border-gray-100 flex items-center gap-2">
                <Banknote size={16} className="text-indigo-500" />
                <span className="text-xs font-semibold text-indigo-700 uppercase">Billetes</span>
              </div>
              <div className="divide-y divide-gray-50">
                {billetes.map(({ valor, label }) => {
                  const cant = cantidades[valor] || 0;
                  const subtotal = valor * cant;
                  return (
                    <div
                      key={valor}
                      className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50/50"
                    >
                      <span className="w-16 text-sm font-medium text-gray-700">{label}</span>
                      <div className="flex items-center border border-gray-200 rounded-md overflow-hidden bg-white">
                        <button
                          type="button"
                          onClick={() => cambiarCantidad(valor, -1)}
                          className="px-2 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm font-bold"
                        >
                          −
                        </button>
                        <input
                          type="number"
                          min={0}
                          value={cant || ''}
                          onChange={(e) => setCantidadDirecta(valor, e.target.value)}
                          className="w-12 py-1.5 text-center text-sm font-semibold bg-transparent focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <button
                          type="button"
                          onClick={() => cambiarCantidad(valor, 1)}
                          className="px-2 py-1.5 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 text-sm font-bold"
                        >
                          +
                        </button>
                      </div>
                      <span className="ml-auto text-xs font-medium text-gray-500 tabular-nums">
                        ${formatMoney(subtotal)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div>
              <div className="px-4 py-2 bg-amber-50/50 border-b border-gray-100 flex items-center gap-2">
                <Coins size={16} className="text-amber-500" />
                <span className="text-xs font-semibold text-amber-700 uppercase">Monedas</span>
              </div>
              <div className="divide-y divide-gray-50">
                {monedas.map(({ valor, label }) => {
                  const cant = cantidades[valor] || 0;
                  const subtotal = valor * cant;
                  return (
                    <div
                      key={valor}
                      className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50/50"
                    >
                      <span className="w-16 text-sm font-medium text-gray-700">{label}</span>
                      <div className="flex items-center border border-gray-200 rounded-md overflow-hidden bg-white">
                        <button
                          type="button"
                          onClick={() => cambiarCantidad(valor, -1)}
                          className="px-2 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm font-bold"
                        >
                          −
                        </button>
                        <input
                          type="number"
                          min={0}
                          value={cant || ''}
                          onChange={(e) => setCantidadDirecta(valor, e.target.value)}
                          className="w-12 py-1.5 text-center text-sm font-semibold bg-transparent focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <button
                          type="button"
                          onClick={() => cambiarCantidad(valor, 1)}
                          className="px-2 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-700 text-sm font-bold"
                        >
                          +
                        </button>
                      </div>
                      <span className="ml-auto text-xs font-medium text-gray-500 tabular-nums">
                        ${formatMoney(subtotal)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* A cobrar (expectativas) */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-amber-50 px-4 py-3 border-b border-amber-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp size={20} className="text-amber-600" />
              <h2 className="font-semibold text-gray-800">A cobrar</h2>
            </div>
            <button
              type="button"
              onClick={agregarExpectativa}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 text-white text-sm font-medium hover:bg-amber-600 transition-colors"
            >
              <Plus size={16} />
              Agregar
            </button>
          </div>
          <div className="divide-y divide-gray-100">
            {aCobrar.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-400 text-sm">
                <TrendingUp size={32} className="mx-auto mb-2 text-gray-300" />
                <p>No hay expectativas de cobro.</p>
                <p className="mt-1">Agregá conceptos y montos que esperás cobrar.</p>
              </div>
            ) : (
              aCobrar.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-wrap items-center gap-2 px-4 py-3 hover:bg-gray-50/50 group"
                >
                  <input
                    type="text"
                    placeholder="Concepto (ej. Sueldo, venta)"
                    value={item.concepto}
                    onChange={(e) => actualizarExpectativa(item.id, 'concepto', e.target.value)}
                    className="flex-1 min-w-[120px] px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-300"
                  />
                  <div className="flex items-center gap-1">
                    <span className="text-gray-500 text-sm">$</span>
                    <input
                      type="number"
                      placeholder="0"
                      min={0}
                      value={item.monto}
                      onChange={(e) => actualizarExpectativa(item.id, 'monto', e.target.value)}
                      className="w-24 px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium tabular-nums focus:outline-none focus:ring-2 focus:ring-amber-200 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                  <div className="flex items-center gap-1 text-gray-500">
                    <Calendar size={14} />
                    <input
                      type="date"
                      value={item.fecha || ''}
                      onChange={(e) => actualizarExpectativa(item.id, 'fecha', e.target.value)}
                      className="px-2 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-200"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => eliminarExpectativa(item.id)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
