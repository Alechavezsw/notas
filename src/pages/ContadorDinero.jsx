import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Banknote, Coins, ArrowLeft, RotateCcw, DollarSign } from 'lucide-react';

// Denominaciones por defecto (pesos argentinos): billetes y monedas
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

export default function ContadorDinero() {
  const [cantidades, setCantidades] = useState(() =>
    DENOMINACIONES_DEFAULT.reduce((acc, d) => ({ ...acc, [d.valor]: 0 }), {})
  );

  const total = useMemo(() => {
    return Object.entries(cantidades).reduce(
      (sum, [valor, cant]) => sum + Number(valor) * (Number(cant) || 0),
      0
    );
  }, [cantidades]);

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

  const reiniciar = () => {
    setCantidades(
      DENOMINACIONES_DEFAULT.reduce((acc, d) => ({ ...acc, [d.valor]: 0 }), {})
    );
  };

  const billetes = DENOMINACIONES_DEFAULT.filter((d) => d.tipo === 'billete');
  const monedas = DENOMINACIONES_DEFAULT.filter((d) => d.tipo === 'moneda');

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
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
            <DollarSign size={24} className="text-emerald-600" />
            Contador de dinero
          </h1>
          <button
            onClick={reiniciar}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
            title="Reiniciar"
          >
            <RotateCcw size={18} />
            <span className="hidden sm:inline text-sm">Reiniciar</span>
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-6 pb-12">
        {/* Total */}
        <div className="bg-emerald-600 text-white rounded-2xl p-6 mb-6 shadow-lg">
          <p className="text-emerald-100 text-sm font-medium uppercase tracking-wider mb-1">
            Total
          </p>
          <p className="text-4xl md:text-5xl font-black tabular-nums">
            ${formatMoney(total)}
          </p>
        </div>

        {/* Billetes */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center gap-2">
            <Banknote size={20} className="text-indigo-500" />
            <h2 className="font-semibold text-gray-800">Billetes</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {billetes.map(({ valor, label }) => {
              const cant = cantidades[valor] || 0;
              const subtotal = valor * cant;
              return (
                <div
                  key={valor}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50/50 transition-colors"
                >
                  <span className="w-20 font-semibold text-gray-700">{label}</span>
                  <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden bg-white">
                    <button
                      type="button"
                      onClick={() => cambiarCantidad(valor, -1)}
                      className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold transition-colors"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min={0}
                      value={cant || ''}
                      onChange={(e) => setCantidadDirecta(valor, e.target.value)}
                      className="w-16 py-2 text-center font-semibold text-gray-800 bg-transparent focus:outline-none focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <button
                      type="button"
                      onClick={() => cambiarCantidad(valor, 1)}
                      className="px-3 py-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 font-bold transition-colors"
                    >
                      +
                    </button>
                  </div>
                  <span className="ml-auto font-medium text-gray-500 tabular-nums">
                    ${formatMoney(subtotal)}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Monedas */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center gap-2">
            <Coins size={20} className="text-amber-500" />
            <h2 className="font-semibold text-gray-800">Monedas</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {monedas.map(({ valor, label }) => {
              const cant = cantidades[valor] || 0;
              const subtotal = valor * cant;
              return (
                <div
                  key={valor}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50/50 transition-colors"
                >
                  <span className="w-20 font-semibold text-gray-700">{label}</span>
                  <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden bg-white">
                    <button
                      type="button"
                      onClick={() => cambiarCantidad(valor, -1)}
                      className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold transition-colors"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min={0}
                      value={cant || ''}
                      onChange={(e) => setCantidadDirecta(valor, e.target.value)}
                      className="w-16 py-2 text-center font-semibold text-gray-800 bg-transparent focus:outline-none focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <button
                      type="button"
                      onClick={() => cambiarCantidad(valor, 1)}
                      className="px-3 py-2 bg-amber-100 hover:bg-amber-200 text-amber-700 font-bold transition-colors"
                    >
                      +
                    </button>
                  </div>
                  <span className="ml-auto font-medium text-gray-500 tabular-nums">
                    ${formatMoney(subtotal)}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
