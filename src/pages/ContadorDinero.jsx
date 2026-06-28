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
} from 'lucide-react';

const STORAGE_KEY = 'alenotes_billetera';
const SECTIONS_STORAGE_KEY = 'alenotes_billetera_sections';
const DEFAULT_SECTIONS_OPEN = {
  gastos: true,
  deudas: true,
  deudores: true,
  actual: true,
  aCobrar: true,
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
}) {
  const ring = focusRing === 'slate' ? 'focus:ring-slate-200' : focusRing === 'teal' ? 'focus:ring-teal-200' : 'focus:ring-emerald-200';
  const ringBorder = focusRing === 'slate' ? 'focus:border-slate-300' : focusRing === 'teal' ? 'focus:border-teal-300' : 'focus:border-emerald-300';
  const extraInputClass = `flex-1 min-w-[120px] max-w-[200px] px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 ${ring} ${ringBorder}`;

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
              className={`flex-1 min-w-[100px] px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 ${ring} ${ringBorder}`}
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

function ListaDeudas({ items, onAdd, onUpdate, onDelete, onDuplicateNextMonth }) {
  const mesActual = getMesActual();
  const [filtroMes, setFiltroMes] = useState('todos');
  const [filtroEtiqueta, setFiltroEtiqueta] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('pendientes');
  const [busqueda, setBusqueda] = useState('');

  const mesesDisponibles = useMemo(() => {
    const set = new Set([mesActual]);
    items.forEach((it) => {
      if (it.enCuotas && it.mes) set.add(it.mes);
    });
    return [...set].sort((a, b) => b.localeCompare(a));
  }, [items, mesActual]);

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
        if (key !== mesActual) return false;
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
  }, [items, filtroEstado, filtroEtiqueta, filtroMes, busqueda, mesActual]);

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
      if (a === mesActual) return -1;
      if (b === mesActual) return 1;
      return b.localeCompare(a);
    });
    return keys.map((key) => ({ key, label: formatMesLabel(key), items: map.get(key) }));
  }, [itemsFiltrados, mesActual]);

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
            onClick={() => onUpdate(item.id, 'pagado', !item.pagado)}
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
                value={item.mes || mesActual}
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
                {key === mesActual && (
                  <span className="ml-2 normal-case font-medium text-emerald-600">· mes actual</span>
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
  const [metaAhorro, setMetaAhorro] = useState(null);
  const cantidadesRef = useRef({});
  const [isLoading, setIsLoading] = useState(!!supabase);
  const [saveStatus, setSaveStatus] = useState('saved');
  const [saveError, setSaveError] = useState(null);
  const saveTimeoutRef = useRef(null);
  const [sectionsOpen, setSectionsOpen] = useState(loadSectionsOpen);

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
    () => aCobrar.reduce((sum, it) => sum + (Number(it.monto) || 0), 0),
    [aCobrar]
  );
  const totalProyectado = totalActual + totalACobrar;
  const metaNum = metaAhorro != null && metaAhorro !== '' ? Number(metaAhorro) : null;
  const progresoMeta = metaNum != null && metaNum > 0 ? Math.min(100, (totalActual / metaNum) * 100) : null;
  const totalGastos = useMemo(
    () => gastos.reduce((sum, it) => sum + (Number(it.monto) || 0), 0),
    [gastos]
  );
  const mesActualDeudas = getMesActual();
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
            .select('dinero_actual, a_cobrar, cantidades, gastos, deudas, deudores')
            .eq('id', BILLETERA_ID)
            .maybeSingle();
          if (!error && data) {
            if (data.cantidades && typeof data.cantidades === 'object') {
              cantidadesRef.current = data.cantidades;
              const meta = data.cantidades.meta;
              setMetaAhorro(meta != null && meta !== '' ? (typeof meta === 'number' ? meta : Number(meta)) : null);
            }
            if (Array.isArray(data.dinero_actual) && data.dinero_actual.length > 0) {
              setDineroActual(data.dinero_actual.map((it) => ({ ...it, id: it.id ?? Date.now() + Math.random() })));
            }
            if (Array.isArray(data.a_cobrar)) {
              setACobrar(data.a_cobrar.map((it) => ({ ...it, id: it.id ?? Date.now() + Math.random() })));
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
          if (Array.isArray(data.aCobrar)) setACobrar(data.aCobrar);
          if (Array.isArray(data.gastos)) setGastos(data.gastos);
          if (Array.isArray(data.deudas)) setDeudas(data.deudas);
          if (Array.isArray(data.deudores)) setDeudores(data.deudores);
          if (data.metaAhorro != null) setMetaAhorro(data.metaAhorro);
        }
      } catch (_) {}
      setIsLoading(false);
    }
  }, []);

  const saveToBackend = useCallback(async (dineroActualData, aCobrarData, gastosData, deudasData, deudoresData) => {
    if (supabase) {
      setSaveStatus('saving');
      setSaveError(null);
      try {
        const cantidades = { ...cantidadesRef.current, meta: metaAhorro };
        const { error } = await supabase.from('billetera').upsert(
          {
            id: BILLETERA_ID,
            cantidades,
            dinero_actual: dineroActualData,
            a_cobrar: aCobrarData,
            gastos: gastosData,
            deudas: deudasData,
            deudores: deudoresData,
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
          localStorage.setItem(STORAGE_KEY, JSON.stringify({ dineroActual: dineroActualData, aCobrar: aCobrarData, gastos: gastosData, deudas: deudasData, deudores: deudoresData, metaAhorro }));
        } catch (_) {}
      }
    } else {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ dineroActual: dineroActualData, aCobrar: aCobrarData, gastos: gastosData, deudas: deudasData, deudores: deudoresData, metaAhorro }));
      } catch (_) {}
    }
  }, [metaAhorro]);

  useEffect(() => {
    if (isLoading) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => saveToBackend(dineroActual, aCobrar, gastos, deudas, deudores), 1000);
    return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); };
  }, [dineroActual, aCobrar, gastos, deudas, deudores, isLoading, saveToBackend]);

  const addEntrada = (setter, withCat = false) => {
    setter((prev) => [...prev, { id: Date.now(), concepto: '', monto: '', fecha: '', ...(withCat ? { categoria: '' } : {}) }]);
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
  const deleteEntrada = (setter, id) => {
    setter((prev) => prev.filter((it) => it.id !== id));
  };

  const addGasto = () => {
    setGastos((prev) => [...prev, { id: Date.now(), fecha: new Date().toISOString().slice(0, 10), concepto: '', monto: '', categoria: 'Otro' }]);
  };
  const updateGasto = (id, field, value) => {
    setGastos((prev) => prev.map((it) => (it.id === id ? { ...it, [field]: value } : it)));
  };
  const deleteGasto = (id) => {
    setGastos((prev) => prev.filter((it) => it.id !== id));
  };

  const gastosOrdenados = useMemo(() => {
    return [...gastos].sort((a, b) => {
      const fa = a.fecha || '';
      const fb = b.fecha || '';
      if (fa !== fb) return fb.localeCompare(fa);
      return (b.id || 0) - (a.id || 0);
    });
  }, [gastos]);

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
                <p className="text-xs text-gray-500">Registrá lo que gastás para llevar el control</p>
              </div>
            </>
          }
          right={
            <span className="text-lg font-bold text-rose-600 tabular-nums">Total: ${formatMoney(totalGastos)}</span>
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
                      No hay gastos registrados. Agregá una fila con el botón de abajo.
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
                    <td colSpan={3} className="py-3 px-2 text-right">Total</td>
                    <td className="py-3 pr-2 text-right tabular-nums text-rose-700">${formatMoney(totalGastos)}</td>
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
            <span className="text-lg font-bold text-amber-600 tabular-nums">${formatMoney(totalACobrar)}</span>
          }
        >
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
        </BilleteraSection>
      </main>
    </div>
  );
}
