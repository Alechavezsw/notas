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
  Receipt,
  CreditCard,
  UserCircle,
  Copy,
  Check,
  Search,
  AlertTriangle,
  ChevronDown,
  ShoppingBag,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

const STORAGE_KEY = 'alenotes_billetera';
const SECTIONS_STORAGE_KEY = 'alenotes_billetera_sections';
const DEFAULT_SECTIONS_OPEN = {
  gastos: true,
  deudas: true,
  deudores: true,
  actual: true,
  aCobrar: true,
  objetivos: true,
};

function loadSectionsOpen() {
  try {
    const raw = localStorage.getItem(SECTIONS_STORAGE_KEY);
    if (raw) return { ...DEFAULT_SECTIONS_OPEN, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return { ...DEFAULT_SECTIONS_OPEN };
}

function parseMesVista(raw, mesActual) {
  if (typeof raw === 'string' && /^\d{4}-\d{2}$/.test(raw)) {
    return raw > mesActual ? mesActual : raw;
  }
  return mesActual;
}

function mergeMesesHistorial(stored, gastos, deudas, aCobrar) {
  const fromData = collectMesesHistorial(gastos, deudas, aCobrar);
  const extra = Array.isArray(stored) ? stored.filter((m) => typeof m === 'string') : [];
  return [...new Set([...fromData, ...extra])].sort((a, b) => b.localeCompare(a));
}

function getMesAnterior(mesKey) {
  if (!mesKey) return getMesActual();
  const [y, m] = mesKey.split('-').map(Number);
  const d = new Date(y, m - 2, 1);
  return d.toISOString().slice(0, 7);
}

function collectMesesHistorial(gastos, deudas, aCobrar) {
  const set = new Set([getMesActual()]);
  gastos.forEach((g) => {
    if (g.fecha) set.add(g.fecha.slice(0, 7));
  });
  deudas.forEach((d) => {
    if (d.enCuotas && d.mes) set.add(d.mes);
    if (d.fechaPago) set.add(d.fechaPago.slice(0, 7));
    if (d.fecha) set.add(d.fecha.slice(0, 7));
  });
  aCobrar.forEach((a) => {
    if (a.fecha) set.add(a.fecha.slice(0, 7));
    if (a.fechaCobro) set.add(a.fechaCobro.slice(0, 7));
  });
  return [...set].sort((a, b) => b.localeCompare(a));
}

function perteneceAlMes(fecha, mesKey) {
  return !!fecha && fecha.slice(0, 7) === mesKey;
}
const BILLETERA_ID = 'default';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

const COLORS = { actual: '#059669', aCobrar: '#d97706', total: '#4f46e5' };
const CATEGORIAS = ['Efectivo', 'Banco', 'Inversión', 'Otro'];
const GASTOS_CATEGORIAS = ['Comida', 'Transporte', 'Servicios', 'Ocio', 'Salud', 'Compras', 'Otro'];
const DEUDAS_ETIQUETAS = [
  'Empleados',
  'Servicios',
  'Servicios Cosecha Creativa',
  'Impuestos',
  'Monotributo / AFIP',
  'Tarjetas',
  'Préstamos',
  'Alquiler',
  'Proveedores',
  'Banco',
  'Seguros',
  'Personal',
  'Inversión',
  'Otro',
];
const DEUDAS_PRIORIDAD = ['Alta', 'Media', 'Baja'];

function getMesActual() {
  return new Date().toISOString().slice(0, 7);
}

function getMesSiguiente(mesKey) {
  if (!mesKey) return getMesActual();
  const [y, m] = mesKey.split('-').map(Number);
  const d = new Date(y, m - 1, 1);
  d.setMonth(d.getMonth() + 1);
  return d.toISOString().slice(0, 7);
}

function diasHastaVencimiento(vencimiento) {
  if (!vencimiento) return null;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const v = new Date(`${vencimiento}T12:00:00`);
  return Math.ceil((v - hoy) / (1000 * 60 * 60 * 24));
}

function formatMesLabel(mesKey) {
  if (!mesKey || mesKey === '_unico') return 'Pago único';
  const [y, m] = mesKey.split('-');
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
}

function sumMontos(items) {
  return items.reduce((sum, it) => sum + (Number(it.monto) || 0), 0);
}

function deudasMesCorriente(items, mesActual) {
  return items.filter((item) => {
    const key = item.enCuotas && item.mes ? item.mes : '_unico';
    return key === mesActual || key === '_unico';
  });
}

function labelDeuda(item) {
  const parts = [item.acreedor, item.concepto].filter(Boolean);
  return parts.length ? parts.join(' — ') : 'Deuda';
}

function descontarDeCuenta(prev, monto, label) {
  const amount = Number(monto) || 0;
  if (amount <= 0) return prev;
  let remaining = amount;
  const next = prev.map((it) => ({ ...it }));
  const order = [...next.keys()].sort(
    (a, b) => (Number(next[b].monto) || 0) - (Number(next[a].monto) || 0)
  );
  for (const i of order) {
    const cur = Number(next[i].monto) || 0;
    if (cur <= 0) continue;
    const take = Math.min(cur, remaining);
    const resto = cur - take;
    next[i] = { ...next[i], monto: resto === 0 ? '' : String(resto) };
    remaining -= take;
    if (remaining <= 0) break;
  }
  if (remaining > 0) {
    next.push({
      id: Date.now(),
      concepto: `Déficit pago deuda: ${label}`,
      monto: String(-remaining),
      fecha: new Date().toISOString().slice(0, 10),
      categoria: 'Otro',
    });
  }
  return next;
}

function reintegrarCuenta(prev, monto, label) {
  const amount = Number(monto) || 0;
  if (amount <= 0) return prev;
  return [
    ...prev,
    {
      id: Date.now(),
      concepto: `Reintegro deuda: ${label}`,
      monto: String(amount),
      fecha: new Date().toISOString().slice(0, 10),
      categoria: 'Otro',
    },
  ];
}

function aCobrarMesCorriente(items, mesActual) {
  return items.filter((item) => {
    if (!item.fecha) return true;
    return item.fecha.slice(0, 7) === mesActual;
  });
}

function labelACobrar(item) {
  return item.concepto?.trim() || 'Cobro';
}

function acreditarEnCuenta(prev, monto, label) {
  const amount = Number(monto) || 0;
  if (amount <= 0) return prev;
  return [
    ...prev,
    {
      id: Date.now(),
      concepto: `Cobro: ${label}`,
      monto: String(amount),
      fecha: new Date().toISOString().slice(0, 10),
      categoria: 'Otro',
    },
  ];
}

function formatMoney(num) {
  return new Intl.NumberFormat('es-AR', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

function EntradaLista({
  items,
  onAdd,
  onUpdate,
  onDelete,
  emptyMessage,
  addLabel,
  withDate = false,
  withCategory = false,
  extraField = null,
  extraFieldFirst = false,
  withVencimiento = false,
  focusRing = 'emerald',
  onToggleCobrado = null,
}) {
  const ring = focusRing === 'slate'
    ? 'focus:ring-slate-200'
    : focusRing === 'teal'
      ? 'focus:ring-teal-200'
      : focusRing === 'amber'
        ? 'focus:ring-amber-200'
        : 'focus:ring-emerald-200';
  const ringBorder = focusRing === 'slate'
    ? 'focus:border-slate-300'
    : focusRing === 'teal'
      ? 'focus:border-teal-300'
      : focusRing === 'amber'
        ? 'focus:border-amber-300'
        : 'focus:border-emerald-300';
  const extraInputClass = `flex-1 min-w-[120px] max-w-[200px] px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 ${ring} ${ringBorder}`;

  return (
    <div className="space-y-2">
      {items.length === 0 ? (
        <p className="text-sm text-gray-400 py-4 text-center">{emptyMessage}</p>
      ) : (
        items.map((item) => (
          <div
            key={item.id}
            className={`flex flex-wrap items-center gap-2 p-3 rounded-xl border transition-all ${
              item.cobrado
                ? 'opacity-60 bg-gray-50/80 border-gray-100'
                : 'bg-white/80 hover:bg-white border-gray-100'
            }`}
          >
            {onToggleCobrado && (
              <button
                type="button"
                onClick={() => onToggleCobrado(item.id, !item.cobrado)}
                className={`p-2 rounded-lg border transition-colors shrink-0 ${
                  item.cobrado
                    ? 'bg-amber-100 border-amber-300 text-amber-700'
                    : 'border-gray-200 text-gray-400 hover:border-amber-300 hover:text-amber-600 hover:bg-amber-50'
                }`}
                title={item.cobrado ? 'Marcar pendiente' : 'Marcar cobrado'}
              >
                <Check size={16} />
              </button>
            )}
            {withCategory && (
              <select
                value={item.categoria || ''}
                onChange={(e) => onUpdate(item.id, 'categoria', e.target.value)}
                className="px-2 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 w-28"
              >
                <option value="">Categoría</option>
                {CATEGORIAS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            )}
            {extraField && extraFieldFirst && (
              <input
                type="text"
                placeholder={extraField.placeholder}
                value={item[extraField.key] || ''}
                onChange={(e) => onUpdate(item.id, extraField.key, e.target.value)}
                className={extraInputClass}
              />
            )}
            <input
              type="text"
              placeholder="Concepto"
              value={item.concepto || ''}
              onChange={(e) => onUpdate(item.id, 'concepto', e.target.value)}
              className={`flex-1 min-w-[100px] px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 ${ring} ${ringBorder} ${
                item.cobrado ? 'line-through text-gray-500' : ''
              }`}
            />
            {extraField && !extraFieldFirst && (
              <input
                type="text"
                placeholder={extraField.placeholder}
                value={item[extraField.key] || ''}
                onChange={(e) => onUpdate(item.id, extraField.key, e.target.value)}
                className={extraInputClass}
              />
            )}
            <div className="flex items-center gap-1">
              <span className="text-gray-500 text-sm">$</span>
              <input
                type="number"
                placeholder="0"
                min={0}
                value={item.monto ?? ''}
                onChange={(e) => onUpdate(item.id, 'monto', e.target.value)}
                className={`w-24 px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium tabular-nums focus:outline-none focus:ring-2 ${ring} [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
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
            {withVencimiento && (
              <div className="flex items-center gap-1" title="Vencimiento">
                <span className="text-[10px] text-gray-400 uppercase whitespace-nowrap">Vence</span>
                <input
                  type="date"
                  value={item.vencimiento || ''}
                  onChange={(e) => onUpdate(item.id, 'vencimiento', e.target.value)}
                  className="px-2 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
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

function ChecklistCobradoMesCorriente({ items, mesReferencia, onToggleCobrado }) {
  const delMes = useMemo(() => aCobrarMesCorriente(items, mesReferencia), [items, mesReferencia]);
  const esMesActual = mesReferencia === getMesActual();
  const pendientes = delMes.filter((it) => !it.cobrado);
  const cobrados = delMes.filter((it) => it.cobrado);
  const totalPendiente = sumMontos(pendientes);
  const totalCobrado = sumMontos(cobrados);

  if (delMes.length === 0) return null;

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4 space-y-3 mb-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-amber-900">
            {esMesActual ? 'Cobrado mes corriente' : `Cobrado · ${formatMesLabel(mesReferencia)}`}
          </h3>
          <p className="text-xs text-amber-700/80">
            {formatMesLabel(mesReferencia)} · al marcar cobrado se suma a Dinero actual
          </p>
        </div>
        <div className="text-right text-xs tabular-nums">
          <p className="font-bold text-amber-800">
            {cobrados.length}/{delMes.length} cobrados
          </p>
          {totalPendiente > 0 && (
            <p className="text-amber-700 font-medium">Pendiente: ${formatMoney(totalPendiente)}</p>
          )}
          {totalCobrado > 0 && (
            <p className="text-emerald-600">Cobrado: ${formatMoney(totalCobrado)}</p>
          )}
        </div>
      </div>
      <div className="space-y-1.5 max-h-64 overflow-y-auto">
        {delMes.map((item) => {
          const monto = Number(item.monto) || 0;
          return (
            <label
              key={item.id}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors ${
                item.cobrado
                  ? 'bg-white/60 border-amber-200 opacity-75'
                  : 'bg-white border-gray-200 hover:border-amber-300 hover:bg-white'
              }`}
            >
              <input
                type="checkbox"
                checked={!!item.cobrado}
                onChange={(e) => onToggleCobrado(item.id, e.target.checked)}
                className="rounded border-gray-300 text-amber-600 focus:ring-amber-400 w-4 h-4 shrink-0"
              />
              <span className={`flex-1 min-w-0 text-sm ${item.cobrado ? 'line-through text-gray-500' : 'text-gray-800'}`}>
                {labelACobrar(item)}
                {item.fecha && (
                  <span className="text-gray-400 ml-2 text-xs">
                    {new Date(`${item.fecha}T12:00:00`).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
                  </span>
                )}
              </span>
              <span className={`text-sm font-bold tabular-nums shrink-0 ${item.cobrado ? 'text-gray-400' : 'text-amber-700'}`}>
                ${formatMoney(monto)}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

function ListaACobrar({ items, onAdd, onUpdate, onDelete, onToggleCobrado, mesVista }) {
  const mesReferencia = mesVista || getMesActual();
  return (
    <div className="space-y-4">
      {onToggleCobrado && (
        <ChecklistCobradoMesCorriente
          items={items}
          mesReferencia={mesReferencia}
          onToggleCobrado={onToggleCobrado}
        />
      )}
      <EntradaLista
        items={items}
        onAdd={onAdd}
        onUpdate={onUpdate}
        onDelete={onDelete}
        onToggleCobrado={onToggleCobrado}
        emptyMessage="No hay expectativas de cobro. Agregá conceptos y montos que esperás cobrar."
        addLabel="Agregar expectativa"
        withDate={true}
        focusRing="amber"
      />
    </div>
  );
}

function BilleteraSection({ open, onToggle, headerClassName, sectionClassName = 'mb-6', left, right, children }) {
  return (
    <section className={`rounded-2xl bg-white/90 backdrop-blur border border-gray-200/60 shadow-lg shadow-gray-100 overflow-hidden ${sectionClassName}`}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className={`w-full ${headerClassName} px-5 py-4 flex flex-wrap items-center justify-between gap-3 text-left hover:brightness-[0.98] transition-all`}
      >
        <div className="flex items-center gap-2 min-w-0">{left}</div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
          {right}
          <ChevronDown
            size={20}
            className={`text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
            aria-hidden
          />
        </div>
      </button>
      {open && children}
    </section>
  );
}

function ChecklistMesCorriente({ items, mesReferencia, onTogglePagado }) {
  const delMes = useMemo(() => deudasMesCorriente(items, mesReferencia), [items, mesReferencia]);
  const esMesActual = mesReferencia === getMesActual();
  const pendientes = delMes.filter((it) => !it.pagado);
  const pagadas = delMes.filter((it) => it.pagado);
  const totalPendiente = sumMontos(pendientes);
  const totalPagado = sumMontos(pagadas);

  if (delMes.length === 0) return null;

  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-emerald-900">
            {esMesActual ? 'Pagado mes corriente' : `Pagado · ${formatMesLabel(mesReferencia)}`}
          </h3>
          <p className="text-xs text-emerald-700/80">
            {formatMesLabel(mesReferencia)} · al marcar pagada se descuenta de Dinero actual
          </p>
        </div>
        <div className="text-right text-xs tabular-nums">
          <p className="font-bold text-emerald-800">
            {pagadas.length}/{delMes.length} pagadas
          </p>
          {totalPendiente > 0 && (
            <p className="text-amber-700 font-medium">Pendiente: ${formatMoney(totalPendiente)}</p>
          )}
          {totalPagado > 0 && (
            <p className="text-emerald-600">Pagado: ${formatMoney(totalPagado)}</p>
          )}
        </div>
      </div>
      <div className="space-y-1.5 max-h-64 overflow-y-auto">
        {delMes.map((item) => {
          const monto = Number(item.monto) || 0;
          return (
            <label
              key={item.id}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors ${
                item.pagado
                  ? 'bg-white/60 border-emerald-200 opacity-75'
                  : 'bg-white border-gray-200 hover:border-emerald-300 hover:bg-white'
              }`}
            >
              <input
                type="checkbox"
                checked={!!item.pagado}
                onChange={(e) => onTogglePagado(item.id, e.target.checked)}
                className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-400 w-4 h-4 shrink-0"
              />
              <span className={`flex-1 min-w-0 text-sm ${item.pagado ? 'line-through text-gray-500' : 'text-gray-800'}`}>
                {item.etiqueta && (
                  <span className="text-[10px] font-medium uppercase tracking-wide text-slate-500 mr-2">
                    {item.etiqueta}
                  </span>
                )}
                {labelDeuda(item)}
                {item.enCuotas && item.cuotaNum && item.cuotasTotal && (
                  <span className="text-gray-400 ml-1">
                    (cuota {item.cuotaNum}/{item.cuotasTotal})
                  </span>
                )}
              </span>
              <span className={`text-sm font-bold tabular-nums shrink-0 ${item.pagado ? 'text-gray-400' : 'text-slate-700'}`}>
                ${formatMoney(monto)}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

function SelectorMesBilletera({ mesVista, mesActual, mesesHistorial, onChangeMes }) {
  const [historialAbierto, setHistorialAbierto] = useState(false);
  const ref = useRef(null);
  const esMesActual = mesVista === mesActual;

  useEffect(() => {
    const onDocClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setHistorialAbierto(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  return (
    <div className="flex flex-wrap items-center justify-center gap-2 py-2 border-t border-gray-100/80">
      <button
        type="button"
        onClick={() => onChangeMes(getMesAnterior(mesVista))}
        className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-emerald-600 transition-colors"
        title="Mes anterior"
      >
        <ChevronLeft size={18} />
      </button>
      <div className="relative" ref={ref}>
        <button
          type="button"
          onClick={() => setHistorialAbierto((o) => !o)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-semibold transition-colors ${
            esMesActual
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100'
              : 'bg-amber-50 border-amber-200 text-amber-900 hover:bg-amber-100'
          }`}
        >
          <Calendar size={16} className="shrink-0" />
          <span className="capitalize">{formatMesLabel(mesVista)}</span>
          {!esMesActual && (
            <span className="text-[10px] font-medium uppercase tracking-wide bg-amber-200/80 text-amber-900 px-1.5 py-0.5 rounded">
              histórico
            </span>
          )}
        </button>
        {historialAbierto && (
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 z-20 min-w-[200px] max-h-64 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg py-1">
            <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
              Historial de meses
            </p>
            {mesesHistorial.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  onChangeMes(m);
                  setHistorialAbierto(false);
                }}
                className={`w-full text-left px-3 py-2 text-sm capitalize transition-colors ${
                  m === mesVista
                    ? 'bg-emerald-50 text-emerald-800 font-medium'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                {formatMesLabel(m)}
                {m === mesActual && (
                  <span className="ml-2 text-[10px] normal-case text-emerald-600">(actual)</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={() => onChangeMes(getMesSiguiente(mesVista))}
        disabled={mesVista >= mesActual}
        className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-emerald-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        title="Mes siguiente"
      >
        <ChevronRight size={18} />
      </button>
      {!esMesActual && (
        <button
          type="button"
          onClick={() => onChangeMes(mesActual)}
          className="text-xs font-medium text-emerald-600 hover:text-emerald-700 px-2 py-1 rounded-lg hover:bg-emerald-50 transition-colors"
        >
          Ir al mes actual
        </button>
      )}
    </div>
  );
}

function ListaDeudas({ items, onAdd, onUpdate, onDelete, onDuplicateNextMonth, onTogglePagado, mesVista }) {
  const mesActualReal = getMesActual();
  const mesReferencia = mesVista || mesActualReal;
  const [filtroMes, setFiltroMes] = useState(() =>
    (mesVista || mesActualReal) === mesActualReal ? 'mes_actual' : mesVista
  );
  const [filtroEtiqueta, setFiltroEtiqueta] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('pendientes');
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => {
    setFiltroMes(mesReferencia === mesActualReal ? 'mes_actual' : mesReferencia);
  }, [mesReferencia, mesActualReal]);

  const mesesDisponibles = useMemo(() => {
    const set = new Set([mesActualReal, mesReferencia]);
    items.forEach((it) => {
      if (it.enCuotas && it.mes) set.add(it.mes);
    });
    return [...set].sort((a, b) => b.localeCompare(a));
  }, [items, mesActualReal, mesReferencia]);

  const itemsFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return items.filter((item) => {
      if (filtroEstado === 'pendientes' && item.pagado) return false;
      if (filtroEstado === 'pagadas' && !item.pagado) return false;
      if (filtroEtiqueta === '__sin__') {
        if (item.etiqueta) return false;
      } else if (filtroEtiqueta && item.etiqueta !== filtroEtiqueta) return false;
      if (filtroMes === 'mes_actual') {
        const key = item.enCuotas && item.mes ? item.mes : '_unico';
        if (key !== mesReferencia) return false;
      } else if (filtroMes !== 'todos') {
        const key = item.enCuotas && item.mes ? item.mes : '_unico';
        if (key !== filtroMes) return false;
      }
      if (q) {
        const hay = [item.acreedor, item.concepto, item.notas, item.etiqueta].some((v) =>
          String(v || '').toLowerCase().includes(q)
        );
        if (!hay) return false;
      }
      return true;
    });
  }, [items, filtroEstado, filtroEtiqueta, filtroMes, busqueda, mesReferencia]);

  const resumenEtiquetas = useMemo(() => {
    const map = new Map();
    itemsFiltrados
      .filter((it) => !it.pagado)
      .forEach((it) => {
        const e = it.etiqueta || 'Sin etiqueta';
        map.set(e, (map.get(e) || 0) + (Number(it.monto) || 0));
      });
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [itemsFiltrados]);

  const grupos = useMemo(() => {
    const map = new Map();
    itemsFiltrados.forEach((item) => {
      const key = item.enCuotas && item.mes ? item.mes : '_unico';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(item);
    });
    const keys = [...map.keys()].sort((a, b) => {
      if (a === '_unico') return 1;
      if (b === '_unico') return -1;
      if (a === mesReferencia) return -1;
      if (b === mesReferencia) return 1;
      return b.localeCompare(a);
    });
    return keys.map((key) => ({ key, label: formatMesLabel(key), items: map.get(key) }));
  }, [itemsFiltrados, mesReferencia]);

  const renderFila = (item) => {
    const dias = diasHastaVencimiento(item.vencimiento);
    const vencida = !item.pagado && dias != null && dias < 0;
    const proxima = !item.pagado && dias != null && dias >= 0 && dias <= 7;
    const rowClass = item.pagado
      ? 'opacity-60 bg-gray-50/80 border-gray-100'
      : vencida
        ? 'bg-red-50/40 border-red-200'
        : proxima
          ? 'bg-amber-50/40 border-amber-200'
          : 'bg-white/80 border-gray-100';

    return (
      <div key={item.id} className={`rounded-xl border transition-all hover:bg-white ${rowClass}`}>
        <div className="flex flex-wrap items-center gap-2 p-3">
          <button
            type="button"
            onClick={() => (onTogglePagado ? onTogglePagado(item.id, !item.pagado) : onUpdate(item.id, 'pagado', !item.pagado))}
            className={`p-2 rounded-lg border transition-colors shrink-0 ${
              item.pagado
                ? 'bg-emerald-100 border-emerald-300 text-emerald-700'
                : 'border-gray-200 text-gray-400 hover:border-emerald-300 hover:text-emerald-600 hover:bg-emerald-50'
            }`}
            title={item.pagado ? 'Marcar pendiente' : 'Marcar pagada'}
          >
            <Check size={16} />
          </button>
          <select
            value={item.etiqueta || ''}
            onChange={(e) => onUpdate(item.id, 'etiqueta', e.target.value)}
            className="px-2 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200 w-[11rem] shrink-0"
            title="Etiqueta"
          >
            <option value="">Etiqueta</option>
            {DEUDAS_ETIQUETAS.map((e) => (
              <option key={e} value={e}>{e}</option>
            ))}
          </select>
          <select
            value={item.prioridad || ''}
            onChange={(e) => onUpdate(item.id, 'prioridad', e.target.value)}
            className={`px-2 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-slate-200 w-20 shrink-0 ${
              item.prioridad === 'Alta'
                ? 'border-red-200 bg-red-50 text-red-700'
                : item.prioridad === 'Media'
                  ? 'border-amber-200 bg-amber-50 text-amber-800'
                  : 'border-gray-200'
            }`}
            title="Prioridad"
          >
            <option value="">Prio.</option>
            {DEUDAS_PRIORIDAD.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Acreedor / a quién debés"
            value={item.acreedor || ''}
            onChange={(e) => onUpdate(item.id, 'acreedor', e.target.value)}
            className="flex-1 min-w-[120px] max-w-[200px] px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-300"
          />
          <input
            type="text"
            placeholder="Concepto"
            value={item.concepto || ''}
            onChange={(e) => onUpdate(item.id, 'concepto', e.target.value)}
            className="flex-1 min-w-[100px] px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-300"
          />
          <div className="flex items-center gap-1">
            <span className="text-gray-500 text-sm">$</span>
            <input
              type="number"
              placeholder="0"
              min={0}
              value={item.monto ?? ''}
              onChange={(e) => onUpdate(item.id, 'monto', e.target.value)}
              className="w-24 px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium tabular-nums focus:outline-none focus:ring-2 focus:ring-slate-200 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>
          <label className="flex items-center gap-1.5 px-2 py-2 rounded-lg border border-gray-200 text-xs text-gray-600 cursor-pointer hover:bg-slate-50 whitespace-nowrap">
            <input
              type="checkbox"
              checked={!!item.enCuotas}
              onChange={(e) => onUpdate(item.id, 'enCuotas', e.target.checked)}
              className="rounded border-gray-300 text-slate-600 focus:ring-slate-300"
            />
            Cuotas
          </label>
          {item.enCuotas && (
            <>
              <input
                type="month"
                value={item.mes || mesReferencia}
                onChange={(e) => onUpdate(item.id, 'mes', e.target.value)}
                className="px-2 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                title="Mes de la cuota"
              />
              <div className="flex items-center gap-1 text-sm text-gray-500">
                <input
                  type="number"
                  min={1}
                  placeholder="Nº"
                  value={item.cuotaNum ?? ''}
                  onChange={(e) => onUpdate(item.id, 'cuotaNum', e.target.value)}
                  className="w-12 px-2 py-2 rounded-lg border border-gray-200 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-slate-200 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  title="Cuota actual"
                />
                <span>/</span>
                <input
                  type="number"
                  min={1}
                  placeholder="Total"
                  value={item.cuotasTotal ?? ''}
                  onChange={(e) => onUpdate(item.id, 'cuotasTotal', e.target.value)}
                  className="w-12 px-2 py-2 rounded-lg border border-gray-200 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-slate-200 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  title="Total de cuotas"
                />
              </div>
            </>
          )}
          <div className="flex items-center gap-1">
            <Calendar size={14} className="text-gray-400" />
            <input
              type="date"
              value={item.fecha || ''}
              onChange={(e) => onUpdate(item.id, 'fecha', e.target.value)}
              className="px-2 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-200"
            />
          </div>
          <div className="flex items-center gap-1" title="Vencimiento">
            <span className="text-[10px] text-gray-400 uppercase whitespace-nowrap">Vence</span>
            <input
              type="date"
              value={item.vencimiento || ''}
              onChange={(e) => onUpdate(item.id, 'vencimiento', e.target.value)}
              className={`px-2 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-slate-200 ${
                vencida ? 'border-red-300 bg-red-50' : proxima ? 'border-amber-300 bg-amber-50' : 'border-gray-200'
              }`}
            />
            {vencida && (
              <span className="flex items-center gap-0.5 text-[10px] text-red-600 font-medium whitespace-nowrap">
                <AlertTriangle size={12} />
                Vencida
              </span>
            )}
            {proxima && (
              <span className="text-[10px] text-amber-700 font-medium whitespace-nowrap">
                {dias === 0 ? 'Hoy' : `${dias}d`}
              </span>
            )}
          </div>
          {item.enCuotas && onDuplicateNextMonth && (
            <button
              type="button"
              onClick={() => onDuplicateNextMonth(item.id)}
              className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
              title="Crear cuota del mes siguiente"
            >
              <Copy size={16} />
            </button>
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
        <div className="px-3 pb-3">
          <input
            type="text"
            placeholder="Notas (opcional): CBU, referencia, observaciones…"
            value={item.notas || ''}
            onChange={(e) => onUpdate(item.id, 'notas', e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-100 bg-gray-50/50 text-xs text-gray-600 focus:outline-none focus:ring-2 focus:ring-slate-200 focus:bg-white"
          />
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 p-3 rounded-xl bg-slate-50/80 border border-slate-100">
        <div className="relative flex-1 min-w-[140px]">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar acreedor, concepto…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-8 pr-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
          />
        </div>
        <select
          value={filtroMes}
          onChange={(e) => setFiltroMes(e.target.value)}
          className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
        >
          <option value="todos">Todos los meses</option>
          <option value="mes_actual">Mes actual</option>
          {mesesDisponibles.map((m) => (
            <option key={m} value={m}>{formatMesLabel(m)}</option>
          ))}
          <option value="_unico">Solo pago único</option>
        </select>
        <select
          value={filtroEtiqueta}
          onChange={(e) => setFiltroEtiqueta(e.target.value)}
          className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200 max-w-[11rem]"
        >
          <option value="">Todas las etiquetas</option>
          {DEUDAS_ETIQUETAS.map((e) => (
            <option key={e} value={e}>{e}</option>
          ))}
        </select>
        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
          className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
        >
          <option value="pendientes">Pendientes</option>
          <option value="todas">Todas</option>
          <option value="pagadas">Pagadas</option>
        </select>
      </div>

      {onTogglePagado && (
        <ChecklistMesCorriente
          items={items}
          mesReferencia={mesReferencia}
          onTogglePagado={onTogglePagado}
        />
      )}

      {resumenEtiquetas.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {resumenEtiquetas.map(([etiqueta, total]) => {
            const filtroVal = etiqueta === 'Sin etiqueta' ? '__sin__' : etiqueta;
            const activo = filtroEtiqueta === filtroVal;
            return (
            <button
              key={etiqueta}
              type="button"
              onClick={() => setFiltroEtiqueta(activo ? '' : filtroVal)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                activo
                  ? 'bg-slate-700 text-white border-slate-700'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400'
              }`}
            >
              {etiqueta}: ${formatMoney(total)}
            </button>
            );
          })}
        </div>
      )}

      {itemsFiltrados.length === 0 ? (
        <p className="text-sm text-gray-400 py-4 text-center">
          {items.length === 0
            ? 'No registraste deudas. Agregá etiqueta, acreedor, concepto y monto.'
            : 'Ninguna deuda coincide con los filtros.'}
        </p>
      ) : (
        grupos.map(({ key, label, items: grupoItems }) => (
          <div key={key}>
            <div className="flex items-center justify-between mb-2 px-1">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                {label}
                {key === mesReferencia && (
                  <span className="ml-2 normal-case font-medium text-emerald-600">
                    · {mesReferencia === mesActualReal ? 'mes actual' : formatMesLabel(mesReferencia)}
                  </span>
                )}
              </h3>
              <span className="text-xs font-bold text-slate-700 tabular-nums">
                ${formatMoney(sumMontos(grupoItems.filter((it) => !it.pagado)))}
                {grupoItems.some((it) => it.pagado) && (
                  <span className="text-gray-400 font-normal ml-1">
                    (pagado ${formatMoney(sumMontos(grupoItems.filter((it) => it.pagado)))})
                  </span>
                )}
              </span>
            </div>
            <div className="space-y-2">{grupoItems.map(renderFila)}</div>
          </div>
        ))
      )}
      <button
        type="button"
        onClick={onAdd}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-gray-200 text-gray-500 hover:border-slate-300 hover:text-slate-600 hover:bg-slate-50/50 transition-all text-sm font-medium"
      >
        <Plus size={18} />
        Agregar deuda
      </button>
    </div>
  );
}

export default function ContadorDinero() {
  const [dineroActual, setDineroActual] = useState([]);
  const [aCobrar, setACobrar] = useState([]);
  const [gastos, setGastos] = useState([]);
  const [deudas, setDeudas] = useState([]);
  const [deudores, setDeudores] = useState([]);
  const [objetivosCompra, setObjetivosCompra] = useState([]);
  const [metaAhorro, setMetaAhorro] = useState(null);
  const cantidadesRef = useRef({});
  const [isLoading, setIsLoading] = useState(!!supabase);
  const [saveStatus, setSaveStatus] = useState('saved');
  const [saveError, setSaveError] = useState(null);
  const saveTimeoutRef = useRef(null);
  const [sectionsOpen, setSectionsOpen] = useState(loadSectionsOpen);
  const [mesVista, setMesVista] = useState(getMesActual);
  const [mesesHistorialBd, setMesesHistorialBd] = useState([]);
  const mesActualReal = getMesActual();

  const setMesVistaPersist = useCallback((mes) => {
    const capped = mes > mesActualReal ? mesActualReal : mes;
    setMesVista(capped);
    cantidadesRef.current = { ...cantidadesRef.current, mes_vista: capped };
  }, [mesActualReal]);

  const mesesHistorial = useMemo(
    () => mergeMesesHistorial(mesesHistorialBd, gastos, deudas, aCobrar),
    [mesesHistorialBd, gastos, deudas, aCobrar]
  );

  const toggleSection = useCallback((key) => {
    setSectionsOpen((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      try {
        localStorage.setItem(SECTIONS_STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const totalActual = useMemo(
    () => dineroActual.reduce((sum, it) => sum + (Number(it.monto) || 0), 0),
    [dineroActual]
  );
  const totalACobrar = useMemo(
    () => sumMontos(aCobrar.filter((it) => !it.cobrado)),
    [aCobrar]
  );
  const totalACobrarCobrado = useMemo(
    () => sumMontos(aCobrar.filter((it) => it.cobrado)),
    [aCobrar]
  );
  const totalProyectado = totalActual + totalACobrar;
  const metaNum = metaAhorro != null && metaAhorro !== '' ? Number(metaAhorro) : null;
  const progresoMeta = metaNum != null && metaNum > 0 ? Math.min(100, (totalActual / metaNum) * 100) : null;
  const totalGastos = useMemo(
    () => gastos.reduce((sum, it) => sum + (Number(it.monto) || 0), 0),
    [gastos]
  );
  const gastosDelMes = useMemo(
    () => gastos.filter((g) => perteneceAlMes(g.fecha, mesVista)),
    [gastos, mesVista]
  );
  const totalGastosMes = useMemo(() => sumMontos(gastosDelMes), [gastosDelMes]);
  const mesActualDeudas = mesVista;
  const deudasPendientes = useMemo(() => deudas.filter((d) => !d.pagado), [deudas]);
  const totalDeudas = useMemo(() => sumMontos(deudasPendientes), [deudasPendientes]);
  const totalDeudasPagadas = useMemo(
    () => sumMontos(deudas.filter((d) => d.pagado)),
    [deudas]
  );
  const totalDeudasMes = useMemo(
    () => sumMontos(deudasPendientes.filter((it) => it.enCuotas && it.mes === mesActualDeudas)),
    [deudasPendientes, mesActualDeudas]
  );
  const deudasVencidas = useMemo(
    () =>
      deudasPendientes.filter((d) => {
        const dias = diasHastaVencimiento(d.vencimiento);
        return dias != null && dias < 0;
      }).length,
    [deudasPendientes]
  );
  const totalDeudores = useMemo(
    () => deudores.reduce((sum, it) => sum + (Number(it.monto) || 0), 0),
    [deudores]
  );
  const objetivosPendientes = useMemo(
    () => objetivosCompra.filter((o) => !o.comprado),
    [objetivosCompra]
  );
  const totalObjetivosMeta = useMemo(
    () => sumMontos(objetivosPendientes),
    [objetivosPendientes]
  );
  const totalObjetivosAhorrado = useMemo(
    () => objetivosPendientes.reduce((sum, it) => sum + (Number(it.ahorrado) || 0), 0),
    [objetivosPendientes]
  );
  const totalObjetivosFaltante = useMemo(
    () =>
      objetivosPendientes.reduce((sum, it) => {
        const meta = Number(it.monto) || 0;
        const ahorrado = Number(it.ahorrado) || 0;
        return sum + Math.max(0, meta - ahorrado);
      }, 0),
    [objetivosPendientes]
  );

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
      ...aCobrar.filter((it) => !it.cobrado && Number(it.monto) > 0).map((it) => ({ nombre: it.concepto || 'Sin concepto', monto: Number(it.monto), tipo: 'aCobrar' })),
    ];
    return items.slice(0, 10);
  }, [dineroActual, aCobrar]);

  useEffect(() => {
    if (supabase) {
      (async () => {
        try {
          const { data, error } = await supabase
            .from('billetera')
            .select('dinero_actual, a_cobrar, cantidades, gastos, deudas, deudores, objetivos_compra')
            .eq('id', BILLETERA_ID)
            .maybeSingle();
          if (!error && data) {
            if (data.cantidades && typeof data.cantidades === 'object') {
              cantidadesRef.current = data.cantidades;
              const meta = data.cantidades.meta;
              setMetaAhorro(meta != null && meta !== '' ? (typeof meta === 'number' ? meta : Number(meta)) : null);
              setMesVista(parseMesVista(data.cantidades.mes_vista, getMesActual()));
              if (Array.isArray(data.cantidades.meses_historial)) {
                setMesesHistorialBd(data.cantidades.meses_historial);
              }
            }
            if (Array.isArray(data.dinero_actual) && data.dinero_actual.length > 0) {
              setDineroActual(data.dinero_actual.map((it) => ({ ...it, id: it.id ?? Date.now() + Math.random() })));
            }
            if (Array.isArray(data.a_cobrar)) {
              setACobrar(data.a_cobrar.map((it) => ({ ...it, id: it.id ?? Date.now() + Math.random(), cobrado: !!it.cobrado })));
            }
            if (Array.isArray(data.gastos)) {
              setGastos(data.gastos.map((it) => ({ ...it, id: it.id ?? Date.now() + Math.random() })));
            }
            if (Array.isArray(data.deudas)) {
              setDeudas(data.deudas.map((it) => ({ ...it, id: it.id ?? Date.now() + Math.random() })));
            }
            if (Array.isArray(data.deudores)) {
              setDeudores(data.deudores.map((it) => ({ ...it, id: it.id ?? Date.now() + Math.random() })));
            }
            if (Array.isArray(data.objetivos_compra)) {
              setObjetivosCompra(
                data.objetivos_compra.map((it) => ({
                  ...it,
                  id: it.id ?? Date.now() + Math.random(),
                  comprado: !!it.comprado,
                }))
              );
            }
            if (Array.isArray(data.dinero_actual) && data.dinero_actual.length === 0 && data.cantidades && typeof data.cantidades === 'object') {
              const total = Object.entries(data.cantidades).reduce((s, [v, c]) => s + Number(v) * (Number(c) || 0), 0);
              if (total > 0) {
                setDineroActual([{ id: Date.now(), concepto: 'Efectivo (migrado)', monto: total }]);
              }
            }
          } else if (error) {
            console.error('Error cargando billetera desde Supabase:', error.message || error);
            setSaveError(error.message || 'Error al cargar. ¿Ejecutaste supabase-setup.sql?');
            setSaveStatus('error');
          }
        } catch (e) {
          console.error('Error cargando billetera:', e);
          setSaveError(e?.message || 'Error al cargar');
          setSaveStatus('error');
        }
        setIsLoading(false);
      })();
    } else {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const data = JSON.parse(raw);
          if (Array.isArray(data.dineroActual)) setDineroActual(data.dineroActual);
          if (Array.isArray(data.aCobrar)) {
            setACobrar(data.aCobrar.map((it) => ({ ...it, cobrado: !!it.cobrado })));
          }
          if (Array.isArray(data.gastos)) setGastos(data.gastos);
          if (Array.isArray(data.deudas)) setDeudas(data.deudas);
          if (Array.isArray(data.deudores)) setDeudores(data.deudores);
          if (Array.isArray(data.objetivosCompra)) {
            setObjetivosCompra(data.objetivosCompra.map((it) => ({ ...it, comprado: !!it.comprado })));
          }
          if (data.metaAhorro != null) setMetaAhorro(data.metaAhorro);
          if (data.mesVista) setMesVista(parseMesVista(data.mesVista, getMesActual()));
          if (Array.isArray(data.mesesHistorial)) setMesesHistorialBd(data.mesesHistorial);
        }
      } catch (_) {}
      setIsLoading(false);
    }
  }, []);

  const saveToBackend = useCallback(async (dineroActualData, aCobrarData, gastosData, deudasData, deudoresData, objetivosCompraData, mesVistaData) => {
    const mesesHistorialSave = mergeMesesHistorial(mesesHistorialBd, gastosData, deudasData, aCobrarData);
    const cantidades = {
      ...cantidadesRef.current,
      meta: metaAhorro,
      mes_vista: mesVistaData,
      meses_historial: mesesHistorialSave,
    };
    cantidadesRef.current = cantidades;
    setMesesHistorialBd(mesesHistorialSave);

    if (supabase) {
      setSaveStatus('saving');
      setSaveError(null);
      try {
        const { error } = await supabase.from('billetera').upsert(
          {
            id: BILLETERA_ID,
            cantidades,
            dinero_actual: dineroActualData,
            a_cobrar: aCobrarData,
            gastos: gastosData,
            deudas: deudasData,
            deudores: deudoresData,
            objetivos_compra: objetivosCompraData,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        );
        if (error) throw error;
        setSaveStatus('saved');
      } catch (err) {
        const msg = err?.message || err?.error_description || String(err);
        console.error('Error guardando billetera:', err);
        setSaveStatus('error');
        setSaveError(msg);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify({
            dineroActual: dineroActualData,
            aCobrar: aCobrarData,
            gastos: gastosData,
            deudas: deudasData,
            deudores: deudoresData,
            objetivosCompra: objetivosCompraData,
            metaAhorro,
            mesVista: mesVistaData,
            mesesHistorial: mesesHistorialSave,
          }));
        } catch (_) {}
      }
    } else {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          dineroActual: dineroActualData,
          aCobrar: aCobrarData,
          gastos: gastosData,
          deudas: deudasData,
          deudores: deudoresData,
          objetivosCompra: objetivosCompraData,
          metaAhorro,
          mesVista: mesVistaData,
          mesesHistorial: mesesHistorialSave,
        }));
      } catch (_) {}
    }
  }, [metaAhorro, mesesHistorialBd]);

  useEffect(() => {
    if (isLoading) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(
      () => saveToBackend(dineroActual, aCobrar, gastos, deudas, deudores, objetivosCompra, mesVista),
      1000
    );
    return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); };
  }, [dineroActual, aCobrar, gastos, deudas, deudores, objetivosCompra, mesVista, isLoading, saveToBackend]);

  const addEntrada = (setter, withCat = false) => {
    setter((prev) => [...prev, { id: Date.now(), concepto: '', monto: '', fecha: '', ...(withCat ? { categoria: '' } : {}) }]);
  };
  const addACobrar = () => {
    setACobrar((prev) => [
      ...prev,
      { id: Date.now(), concepto: '', monto: '', fecha: '', cobrado: false },
    ]);
  };
  const addDeuda = () => {
    setDeudas((prev) => [
      ...prev,
      {
        id: Date.now(),
        etiqueta: '',
        acreedor: '',
        concepto: '',
        monto: '',
        fecha: '',
        vencimiento: '',
        enCuotas: false,
        mes: '',
        cuotaNum: '',
        cuotasTotal: '',
        pagado: false,
        prioridad: '',
        notas: '',
      },
    ]);
  };
  const duplicateDeudaMesSiguiente = (id) => {
    setDeudas((prev) => {
      const item = prev.find((it) => it.id === id);
      if (!item || !item.enCuotas) return prev;
      const nextMes = getMesSiguiente(item.mes || getMesActual());
      const nextCuota = item.cuotaNum ? Number(item.cuotaNum) + 1 : '';
      return [
        ...prev,
        {
          ...item,
          id: Date.now(),
          mes: nextMes,
          cuotaNum: nextCuota !== '' && !Number.isNaN(nextCuota) ? String(nextCuota) : '',
          pagado: false,
          vencimiento: '',
        },
      ];
    });
  };
  const addDeudor = () => {
    setDeudores((prev) => [...prev, { id: Date.now(), nombre: '', concepto: '', monto: '', fecha: '' }]);
  };
  const updateEntrada = (setter, id, field, value) => {
    setter((prev) => prev.map((it) => (it.id === id ? { ...it, [field]: value } : it)));
  };
  const updateDeuda = (id, field, value) => {
    if (field === 'enCuotas') {
      setDeudas((prev) =>
        prev.map((it) => {
          if (it.id !== id) return it;
          const enCuotas = !!value;
          return {
            ...it,
            enCuotas,
            mes: enCuotas && !it.mes ? getMesActual() : it.mes,
          };
        })
      );
      return;
    }
    updateEntrada(setDeudas, id, field, value);
  };
  const toggleDeudaPagada = useCallback((id, pagado) => {
    setDeudas((prev) => {
      const item = prev.find((d) => d.id === id);
      if (!item || !!item.pagado === pagado) return prev;

      const label = labelDeuda(item);
      if (pagado) {
        const monto = Number(item.monto) || 0;
        setDineroActual((dinero) => descontarDeCuenta(dinero, monto, label));
        return prev.map((d) =>
          d.id === id
            ? {
                ...d,
                pagado: true,
                montoDeducido: monto,
                fechaPago: new Date().toISOString().slice(0, 10),
              }
            : d
        );
      }

      const montoRestaurar = Number(item.montoDeducido) || Number(item.monto) || 0;
      setDineroActual((dinero) => reintegrarCuenta(dinero, montoRestaurar, label));
      return prev.map((d) =>
        d.id === id
          ? { ...d, pagado: false, montoDeducido: undefined, fechaPago: '' }
          : d
      );
    });
  }, []);
  const toggleACobrarCobrado = useCallback((id, cobrado) => {
    setACobrar((prev) => {
      const item = prev.find((it) => it.id === id);
      if (!item || !!item.cobrado === cobrado) return prev;

      const label = labelACobrar(item);
      if (cobrado) {
        const monto = Number(item.monto) || 0;
        setDineroActual((dinero) => acreditarEnCuenta(dinero, monto, label));
        return prev.map((it) =>
          it.id === id
            ? {
                ...it,
                cobrado: true,
                montoAcreditado: monto,
                fechaCobro: new Date().toISOString().slice(0, 10),
              }
            : it
        );
      }

      const montoRevertir = Number(item.montoAcreditado) || Number(item.monto) || 0;
      setDineroActual((dinero) => descontarDeCuenta(dinero, montoRevertir, `reversión cobro: ${label}`));
      return prev.map((it) =>
        it.id === id
          ? { ...it, cobrado: false, montoAcreditado: undefined, fechaCobro: '' }
          : it
      );
    });
  }, []);
  const deleteEntrada = (setter, id) => {
    setter((prev) => prev.filter((it) => it.id !== id));
  };

  const addGasto = () => {
    const hoy = new Date().toISOString().slice(0, 10);
    const fecha = mesVista === mesActualReal ? hoy : `${mesVista}-01`;
    setGastos((prev) => [
      ...prev,
      { id: Date.now(), fecha, concepto: '', monto: '', categoria: 'Otro' },
    ]);
  };
  const updateGasto = (id, field, value) => {
    setGastos((prev) => prev.map((it) => (it.id === id ? { ...it, [field]: value } : it)));
  };
  const deleteGasto = (id) => {
    setGastos((prev) => prev.filter((it) => it.id !== id));
  };

  const addObjetivoCompra = () => {
    setObjetivosCompra((prev) => [
      ...prev,
      {
        id: Date.now(),
        objetivo: '',
        monto: '',
        ahorrado: '',
        prioridad: '',
        fechaObjetivo: '',
        comprado: false,
        notas: '',
      },
    ]);
  };
  const updateObjetivoCompra = (id, field, value) => {
    setObjetivosCompra((prev) =>
      prev.map((it) => {
        if (it.id !== id) return it;
        const next = { ...it, [field]: value };
        if (field === 'comprado' && value) {
          const meta = Number(it.monto) || 0;
          if (meta > 0 && (Number(it.ahorrado) || 0) < meta) {
            next.ahorrado = String(meta);
          }
        }
        return next;
      })
    );
  };
  const deleteObjetivoCompra = (id) => {
    setObjetivosCompra((prev) => prev.filter((it) => it.id !== id));
  };

  const objetivosOrdenados = useMemo(() => {
    const prioOrder = { Alta: 0, Media: 1, Baja: 2 };
    return [...objetivosCompra].sort((a, b) => {
      if (!!a.comprado !== !!b.comprado) return a.comprado ? 1 : -1;
      const pa = prioOrder[a.prioridad] ?? 3;
      const pb = prioOrder[b.prioridad] ?? 3;
      if (pa !== pb) return pa - pb;
      return (a.fechaObjetivo || '').localeCompare(b.fechaObjetivo || '');
    });
  }, [objetivosCompra]);

  const gastosOrdenados = useMemo(() => {
    return [...gastosDelMes].sort((a, b) => {
      const fa = a.fecha || '';
      const fb = b.fecha || '';
      if (fa !== fb) return fb.localeCompare(fa);
      return (b.id || 0) - (a.id || 0);
    });
  }, [gastosDelMes]);

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
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {!supabase && (
              <span className="text-xs text-amber-600" title="Crea un archivo .env con VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY para guardar en la nube">
                Solo local
              </span>
            )}
            {supabase && (
              <span className="text-xs">
                {saveStatus === 'saving' && <span className="flex items-center gap-1 text-amber-600"><Loader2 size={12} className="animate-spin" /> Guardando...</span>}
                {saveStatus === 'saved' && <span className="text-emerald-600">Guardado</span>}
                {saveStatus === 'error' && (
                  <span className="text-red-600" title={saveError || 'Error al guardar'}>
                    Error{saveError ? `: ${saveError}` : ''}
                  </span>
                )}
              </span>
            )}
          </div>
        </div>
        <SelectorMesBilletera
          mesVista={mesVista}
          mesActual={mesActualReal}
          mesesHistorial={mesesHistorial}
          onChangeMes={setMesVistaPersist}
        />
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 pb-16">
        {mesVista !== mesActualReal && (
          <div className="mb-4 px-4 py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-900 flex flex-wrap items-center justify-between gap-2">
            <span>
              Viendo <strong className="capitalize">{formatMesLabel(mesVista)}</strong> — gastos y checklists filtrados por este mes
            </span>
            <button
              type="button"
              onClick={() => setMesVistaPersist(mesActualReal)}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 px-2 py-1 rounded-lg hover:bg-emerald-50"
            >
              Volver al mes actual
            </button>
          </div>
        )}
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <div className="rounded-2xl bg-gradient-to-br from-slate-600 to-slate-700 p-5 text-white shadow-xl shadow-slate-200/40">
            <div className="flex items-center gap-2 mb-1">
              <CreditCard size={18} className="opacity-90" />
              <span className="text-slate-200 text-xs font-semibold uppercase tracking-wider">Deudas (debés)</span>
            </div>
            <p className="text-2xl md:text-3xl font-bold tabular-nums">${formatMoney(totalDeudas)}</p>
            <p className="text-xs text-slate-300 mt-1">Total que debés a terceros</p>
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 p-5 text-white shadow-xl shadow-teal-200/50">
            <div className="flex items-center gap-2 mb-1">
              <UserCircle size={18} className="opacity-90" />
              <span className="text-teal-100 text-xs font-semibold uppercase tracking-wider">Deudores (te deben)</span>
            </div>
            <p className="text-2xl md:text-3xl font-bold tabular-nums">${formatMoney(totalDeudores)}</p>
            <p className="text-xs text-teal-100/90 mt-1">Total que te deben otras personas</p>
          </div>
        </div>

        {/* Meta de ahorro */}
        <section className="rounded-2xl bg-white/90 backdrop-blur border border-gray-200/60 shadow-lg shadow-gray-100 p-5 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-700">Meta de ahorro:</span>
              <div className="flex items-center gap-1">
                <span className="text-gray-500 text-sm">$</span>
                <input
                  type="number"
                  placeholder="Ej. 100000"
                  min={0}
                  value={metaAhorro ?? ''}
                  onChange={(e) => setMetaAhorro(e.target.value === '' ? null : e.target.value)}
                  className="w-28 px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
            </div>
            {metaNum != null && metaNum > 0 && (
              <div className="flex-1 min-w-[120px]">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>${formatMoney(totalActual)} / ${formatMoney(metaNum)}</span>
                  <span>{progresoMeta != null ? Math.round(progresoMeta) : 0}%</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full transition-all duration-300" style={{ width: `${progresoMeta ?? 0}%` }} />
                </div>
                {totalActual >= metaNum && <p className="text-xs text-emerald-600 font-medium mt-1">¡Meta alcanzada!</p>}
              </div>
            )}
          </div>
        </section>

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

        {/* Tabla de gastos */}
        <BilleteraSection
          open={sectionsOpen.gastos}
          onToggle={() => toggleSection('gastos')}
          sectionClassName="mb-8"
          headerClassName="bg-gradient-to-r from-rose-500/10 to-orange-500/5 border-b border-rose-100"
          left={
            <>
              <div className="w-9 h-9 rounded-xl bg-rose-100 flex items-center justify-center">
                <Receipt size={18} className="text-rose-600" />
              </div>
              <div>
                <h2 className="font-semibold text-gray-800">Tabla de gastos</h2>
                <p className="text-xs text-gray-500 capitalize">
                  {formatMesLabel(mesVista)} · registrá lo que gastás
                </p>
              </div>
            </>
          }
          right={
            <div className="text-right">
              <span className="text-lg font-bold text-rose-600 tabular-nums">
                ${formatMoney(totalGastosMes)}
              </span>
              {mesVista !== mesActualReal && totalGastos !== totalGastosMes && (
                <p className="text-xs text-gray-400">Total histórico: ${formatMoney(totalGastos)}</p>
              )}
            </div>
          }
        >
          <div className="p-4 overflow-x-auto">
            <table className="w-full text-sm border-collapse min-w-[640px]">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <th className="py-3 pr-3 w-[120px]">Fecha</th>
                  <th className="py-3 pr-3">Concepto</th>
                  <th className="py-3 pr-3 w-[140px]">Categoría</th>
                  <th className="py-3 pr-3 w-[120px] text-right">Monto</th>
                  <th className="py-3 w-12" />
                </tr>
              </thead>
              <tbody>
                {gastosOrdenados.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-gray-400">
                      {gastos.length === 0
                        ? 'No hay gastos registrados. Agregá una fila con el botón de abajo.'
                        : `No hay gastos en ${formatMesLabel(mesVista)}.`}
                    </td>
                  </tr>
                ) : (
                  gastosOrdenados.map((row) => (
                    <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50/80 align-middle">
                      <td className="py-2 pr-2">
                        <input
                          type="date"
                          value={row.fecha || ''}
                          onChange={(e) => updateGasto(row.id, 'fecha', e.target.value)}
                          className="w-full px-2 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-200"
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <input
                          type="text"
                          placeholder="Ej. Supermercado"
                          value={row.concepto || ''}
                          onChange={(e) => updateGasto(row.id, 'concepto', e.target.value)}
                          className="w-full min-w-[140px] px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-200"
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <select
                          value={row.categoria || 'Otro'}
                          onChange={(e) => updateGasto(row.id, 'categoria', e.target.value)}
                          className="w-full px-2 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-200"
                        >
                          {GASTOS_CATEGORIAS.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2 pr-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <span className="text-gray-500">$</span>
                          <input
                            type="number"
                            min={0}
                            placeholder="0"
                            value={row.monto ?? ''}
                            onChange={(e) => updateGasto(row.id, 'monto', e.target.value)}
                            className="w-24 px-2 py-2 rounded-lg border border-gray-200 text-sm font-medium tabular-nums text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                        </div>
                      </td>
                      <td className="py-2 text-center">
                        <button
                          type="button"
                          onClick={() => deleteGasto(row.id)}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Eliminar fila"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {gastosOrdenados.length > 0 && (
                <tfoot>
                  <tr className="bg-rose-50/50 font-semibold text-gray-800">
                    <td colSpan={3} className="py-3 px-2 text-right capitalize">Total {formatMesLabel(mesVista)}</td>
                    <td className="py-3 pr-2 text-right tabular-nums text-rose-700">${formatMoney(totalGastosMes)}</td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
            <button
              type="button"
              onClick={addGasto}
              className="mt-4 w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-gray-200 text-gray-500 hover:border-rose-300 hover:text-rose-600 hover:bg-rose-50/50 transition-all text-sm font-medium"
            >
              <Plus size={18} />
              Agregar gasto
            </button>
          </div>
        </BilleteraSection>

        {/* Deudas: lo que debés */}
        <BilleteraSection
          open={sectionsOpen.deudas}
          onToggle={() => toggleSection('deudas')}
          headerClassName="bg-gradient-to-r from-slate-600/10 to-slate-500/5 border-b border-slate-200"
          left={
            <>
              <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center">
                <CreditCard size={18} className="text-slate-600" />
              </div>
              <div>
                <h2 className="font-semibold text-gray-800">Deudas</h2>
                <p className="text-xs text-gray-500">Préstamos, tarjetas, cuotas que debés pagar</p>
              </div>
            </>
          }
          right={
            <div className="text-right">
              <span className="text-lg font-bold text-slate-700 tabular-nums">${formatMoney(totalDeudas)}</span>
              <p className="text-xs text-slate-500 mt-0.5">Pendientes</p>
              {totalDeudasMes > 0 && (
                <p className="text-xs text-slate-500">
                  Cuotas {formatMesLabel(mesActualDeudas)}: ${formatMoney(totalDeudasMes)}
                </p>
              )}
              {totalDeudasPagadas > 0 && (
                <p className="text-xs text-emerald-600">
                  Pagadas: ${formatMoney(totalDeudasPagadas)}
                </p>
              )}
              {deudasVencidas > 0 && (
                <p className="text-xs text-red-600 font-medium flex items-center justify-end gap-1">
                  <AlertTriangle size={12} />
                  {deudasVencidas} vencida{deudasVencidas !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          }
        >
          <div className="p-4">
            <ListaDeudas
              items={deudas}
              onAdd={addDeuda}
              onUpdate={updateDeuda}
              onDelete={(id) => deleteEntrada(setDeudas, id)}
              onDuplicateNextMonth={duplicateDeudaMesSiguiente}
              onTogglePagado={toggleDeudaPagada}
              mesVista={mesVista}
            />
          </div>
        </BilleteraSection>

        {/* Deudores: quienes te deben */}
        <BilleteraSection
          open={sectionsOpen.deudores}
          onToggle={() => toggleSection('deudores')}
          headerClassName="bg-gradient-to-r from-teal-500/10 to-cyan-500/5 border-b border-teal-100"
          left={
            <>
              <div className="w-9 h-9 rounded-xl bg-teal-100 flex items-center justify-center">
                <UserCircle size={18} className="text-teal-600" />
              </div>
              <div>
                <h2 className="font-semibold text-gray-800">Deudores</h2>
                <p className="text-xs text-gray-500">Personas que te deben dinero</p>
              </div>
            </>
          }
          right={
            <span className="text-lg font-bold text-teal-600 tabular-nums">${formatMoney(totalDeudores)}</span>
          }
        >
          <div className="p-4">
            <EntradaLista
              items={deudores}
              onAdd={addDeudor}
              onUpdate={(id, field, value) => updateEntrada(setDeudores, id, field, value)}
              onDelete={(id) => deleteEntrada(setDeudores, id)}
              emptyMessage="No hay deudores. Agregá quién te debe y el monto."
              addLabel="Agregar deudor"
              withDate
              extraField={{ key: 'nombre', placeholder: 'Quién te debe' }}
              extraFieldFirst
              focusRing="teal"
            />
          </div>
        </BilleteraSection>

        {/* Dinero actual - misma UI que A cobrar */}
        <BilleteraSection
          open={sectionsOpen.actual}
          onToggle={() => toggleSection('actual')}
          headerClassName="bg-gradient-to-r from-emerald-500/10 to-emerald-600/5 border-b border-emerald-100"
          left={
            <>
              <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center">
                <PiggyBank size={18} className="text-emerald-600" />
              </div>
              <h2 className="font-semibold text-gray-800">Dinero actual</h2>
            </>
          }
          right={
            <span className="text-lg font-bold text-emerald-600 tabular-nums">${formatMoney(totalActual)}</span>
          }
        >
          <div className="p-4">
            <EntradaLista
              items={dineroActual}
              onAdd={() => addEntrada(setDineroActual, true)}
              onUpdate={(id, field, value) => updateEntrada(setDineroActual, id, field, value)}
              onDelete={(id) => deleteEntrada(setDineroActual, id)}
              emptyMessage="No hay entradas. Agregá billetes o montos que tenés en mano."
              addLabel="Agregar billete / monto"
              withDate={true}
              withCategory={true}
            />
          </div>
        </BilleteraSection>

        {/* A cobrar */}
        <BilleteraSection
          open={sectionsOpen.aCobrar}
          onToggle={() => toggleSection('aCobrar')}
          sectionClassName=""
          headerClassName="bg-gradient-to-r from-amber-500/10 to-amber-600/5 border-b border-amber-100"
          left={
            <>
              <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center">
                <TrendingUp size={18} className="text-amber-600" />
              </div>
              <h2 className="font-semibold text-gray-800">A cobrar</h2>
            </>
          }
          right={
            <div className="text-right">
              <span className="text-lg font-bold text-amber-600 tabular-nums">${formatMoney(totalACobrar)}</span>
              <p className="text-xs text-amber-600/80 mt-0.5">Pendiente</p>
              {totalACobrarCobrado > 0 && (
                <p className="text-xs text-emerald-600">
                  Cobrado: ${formatMoney(totalACobrarCobrado)}
                </p>
              )}
            </div>
          }
        >
          <div className="p-4">
            <ListaACobrar
              items={aCobrar}
              onAdd={addACobrar}
              onUpdate={(id, field, value) => updateEntrada(setACobrar, id, field, value)}
              onDelete={(id) => deleteEntrada(setACobrar, id)}
              onToggleCobrado={toggleACobrarCobrado}
              mesVista={mesVista}
            />
          </div>
        </BilleteraSection>

        {/* Objetivos de compra */}
        <BilleteraSection
          open={sectionsOpen.objetivos}
          onToggle={() => toggleSection('objetivos')}
          sectionClassName="mt-6"
          headerClassName="bg-gradient-to-r from-violet-500/10 to-purple-500/5 border-b border-violet-100"
          left={
            <>
              <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center">
                <ShoppingBag size={18} className="text-violet-600" />
              </div>
              <div>
                <h2 className="font-semibold text-gray-800">Objetivos de compra</h2>
                <p className="text-xs text-gray-500">Metas de ahorro para lo que querés comprar</p>
              </div>
            </>
          }
          right={
            <div className="text-right">
              <span className="text-lg font-bold text-violet-700 tabular-nums">
                Faltan ${formatMoney(totalObjetivosFaltante)}
              </span>
              <p className="text-xs text-violet-600/80 mt-0.5">
                Meta pendiente: ${formatMoney(totalObjetivosMeta)}
              </p>
              {totalObjetivosAhorrado > 0 && (
                <p className="text-xs text-emerald-600">
                  Ahorrado: ${formatMoney(totalObjetivosAhorrado)}
                </p>
              )}
            </div>
          }
        >
          <div className="p-4 overflow-x-auto">
            <table className="w-full text-sm border-collapse min-w-[760px]">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <th className="py-3 pr-2 w-10" />
                  <th className="py-3 pr-3">Objetivo</th>
                  <th className="py-3 pr-3 w-[110px] text-right">Precio</th>
                  <th className="py-3 pr-3 w-[110px] text-right">Ahorrado</th>
                  <th className="py-3 pr-3 min-w-[120px]">Progreso</th>
                  <th className="py-3 pr-3 w-[90px]">Prioridad</th>
                  <th className="py-3 pr-3 w-[120px]">Fecha meta</th>
                  <th className="py-3 w-12" />
                </tr>
              </thead>
              <tbody>
                {objetivosOrdenados.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-gray-400">
                      No hay objetivos. Agregá qué querés comprar y cuánto cuesta.
                    </td>
                  </tr>
                ) : (
                  objetivosOrdenados.map((row) => {
                    const meta = Number(row.monto) || 0;
                    const ahorrado = Number(row.ahorrado) || 0;
                    const pct = meta > 0 ? Math.min(100, (ahorrado / meta) * 100) : 0;
                    const listo = row.comprado || (meta > 0 && ahorrado >= meta);
                    return (
                      <React.Fragment key={row.id}>
                        <tr
                          className={`border-b border-gray-100 align-middle ${
                            listo ? 'opacity-60 bg-gray-50/50' : 'hover:bg-gray-50/80'
                          }`}
                        >
                          <td className="py-2 pr-1 text-center">
                            <input
                              type="checkbox"
                              checked={!!row.comprado}
                              onChange={(e) => updateObjetivoCompra(row.id, 'comprado', e.target.checked)}
                              className="rounded border-gray-300 text-violet-600 focus:ring-violet-400 w-4 h-4"
                              title="Marcar como comprado"
                            />
                          </td>
                          <td className="py-2 pr-2">
                            <input
                              type="text"
                              placeholder="Ej. Notebook, sillón…"
                              value={row.objetivo || ''}
                              onChange={(e) => updateObjetivoCompra(row.id, 'objetivo', e.target.value)}
                              className={`w-full min-w-[140px] px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-200 ${
                                row.comprado ? 'line-through text-gray-500' : ''
                              }`}
                            />
                          </td>
                          <td className="py-2 pr-2 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <span className="text-gray-500">$</span>
                              <input
                                type="number"
                                min={0}
                                placeholder="0"
                                value={row.monto ?? ''}
                                onChange={(e) => updateObjetivoCompra(row.id, 'monto', e.target.value)}
                                className="w-24 px-2 py-2 rounded-lg border border-gray-200 text-sm font-medium tabular-nums text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none focus:outline-none focus:ring-2 focus:ring-violet-200"
                              />
                            </div>
                          </td>
                          <td className="py-2 pr-2 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <span className="text-gray-500">$</span>
                              <input
                                type="number"
                                min={0}
                                placeholder="0"
                                value={row.ahorrado ?? ''}
                                onChange={(e) => updateObjetivoCompra(row.id, 'ahorrado', e.target.value)}
                                className="w-24 px-2 py-2 rounded-lg border border-gray-200 text-sm font-medium tabular-nums text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none focus:outline-none focus:ring-2 focus:ring-violet-200"
                              />
                            </div>
                          </td>
                          <td className="py-2 pr-2">
                            <div className="flex items-center gap-2 min-w-[100px]">
                              <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    listo ? 'bg-emerald-500' : 'bg-violet-500'
                                  }`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="text-[10px] text-gray-500 tabular-nums w-8 text-right">
                                {Math.round(pct)}%
                              </span>
                            </div>
                          </td>
                          <td className="py-2 pr-2">
                            <select
                              value={row.prioridad || ''}
                              onChange={(e) => updateObjetivoCompra(row.id, 'prioridad', e.target.value)}
                              className={`w-full px-2 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-violet-200 ${
                                row.prioridad === 'Alta'
                                  ? 'border-red-200 bg-red-50 text-red-700'
                                  : row.prioridad === 'Media'
                                    ? 'border-amber-200 bg-amber-50 text-amber-800'
                                    : 'border-gray-200'
                              }`}
                            >
                              <option value="">—</option>
                              {DEUDAS_PRIORIDAD.map((p) => (
                                <option key={p} value={p}>{p}</option>
                              ))}
                            </select>
                          </td>
                          <td className="py-2 pr-2">
                            <input
                              type="date"
                              value={row.fechaObjetivo || ''}
                              onChange={(e) => updateObjetivoCompra(row.id, 'fechaObjetivo', e.target.value)}
                              className="w-full px-2 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-200"
                            />
                          </td>
                          <td className="py-2 text-center">
                            <button
                              type="button"
                              onClick={() => deleteObjetivoCompra(row.id)}
                              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              title="Eliminar"
                            >
                              <Trash2 size={18} />
                            </button>
                          </td>
                        </tr>
                        <tr className={listo ? 'opacity-60' : ''}>
                          <td colSpan={8} className="pb-2 px-1">
                            <input
                              type="text"
                              placeholder="Notas (opcional): link, tienda, observaciones…"
                              value={row.notas || ''}
                              onChange={(e) => updateObjetivoCompra(row.id, 'notas', e.target.value)}
                              className="w-full px-3 py-1.5 rounded-lg border border-gray-100 bg-gray-50/50 text-xs text-gray-600 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:bg-white"
                            />
                          </td>
                        </tr>
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
              {objetivosOrdenados.length > 0 && (
                <tfoot>
                  <tr className="bg-violet-50/50 font-semibold text-gray-800">
                    <td colSpan={2} className="py-3 px-2 text-right">Pendientes</td>
                    <td className="py-3 pr-2 text-right tabular-nums text-violet-700">
                      ${formatMoney(totalObjetivosMeta)}
                    </td>
                    <td className="py-3 pr-2 text-right tabular-nums text-emerald-700">
                      ${formatMoney(totalObjetivosAhorrado)}
                    </td>
                    <td colSpan={4} className="py-3 pr-2 text-right tabular-nums text-violet-800">
                      Faltan ${formatMoney(totalObjetivosFaltante)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
            <button
              type="button"
              onClick={addObjetivoCompra}
              className="mt-4 w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-gray-200 text-gray-500 hover:border-violet-300 hover:text-violet-600 hover:bg-violet-50/50 transition-all text-sm font-medium"
            >
              <Plus size={18} />
              Agregar objetivo
            </button>
          </div>
        </BilleteraSection>
      </main>
    </div>
  );
}
