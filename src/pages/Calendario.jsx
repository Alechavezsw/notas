import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import { ChevronLeft, ChevronRight, Calendar, Folder } from 'lucide-react';

const STORAGE_KEY = 'alenotes_projects_v2';

const DEFAULT_STAGES = [
  { id: 's1', name: 'Por hacer', order: 0, tasks: [] },
  { id: 's2', name: 'En curso', order: 1, tasks: [] },
  { id: 's3', name: 'Hecho', order: 2, tasks: [] },
];

const COLOR_PALETTE = {
  indigo: { bg: 'bg-indigo-100', text: 'text-indigo-800', border: 'border-indigo-200', dot: 'bg-indigo-500' },
  emerald: { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  orange: { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-200', dot: 'bg-orange-500' },
  blue: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200', dot: 'bg-blue-500' },
  pink: { bg: 'bg-pink-100', text: 'text-pink-800', border: 'border-pink-200', dot: 'bg-pink-500' },
  purple: { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-200', dot: 'bg-purple-500' },
  gray: { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-200', dot: 'bg-gray-500' },
  red: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200', dot: 'bg-red-500' },
  teal: { bg: 'bg-teal-100', text: 'text-teal-800', border: 'border-teal-200', dot: 'bg-teal-500' },
  yellow: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-200', dot: 'bg-yellow-500' },
};

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

function normalizeStages(stages) {
  if (!Array.isArray(stages) || stages.length === 0) return DEFAULT_STAGES.map((s, i) => ({ ...s, id: s.id || `s${i}`, order: i, tasks: (s.tasks || []).map((t) => ({ id: t.id || Date.now() + i, text: t.text || '', done: !!t.done, dueDate: t.dueDate || null })) }));
  return stages
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((s, i) => ({
      id: s.id || `stage-${i}`,
      name: s.name || `Etapa ${i + 1}`,
      order: i,
      tasks: (s.tasks || []).map((t) => ({ id: t.id || Date.now() + Math.random(), text: t.text || '', done: !!t.done, dueDate: t.dueDate || null })),
    }));
}

export default function Calendario() {
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(!!supabase);
  const [month, setMonth] = useState(() => new Date());

  useEffect(() => {
    if (supabase) {
      (async () => {
        try {
          const { data, error } = await supabase.from('projects').select('*');
          if (!error && data) {
            setProjects(data.map((p) => ({ ...p, tags: p.tags || [], stages: normalizeStages(p.stages) })));
          }
        } catch (_) {}
        setIsLoading(false);
      })();
    } else {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        setProjects(parsed.map((p) => ({ ...p, stages: normalizeStages(p.stages) })));
      } catch (_) {}
      setIsLoading(false);
    }
  }, []);

  const tasksByDate = useMemo(() => {
    const map = {};
    projects.forEach((project) => {
      const color = project.color || 'gray';
      (project.stages || []).forEach((stage) => {
        (stage.tasks || []).forEach((task) => {
          if (task.dueDate) {
            if (!map[task.dueDate]) map[task.dueDate] = [];
            map[task.dueDate].push({
              ...task,
              stageName: stage.name,
              projectName: project.name,
              projectColor: color,
            });
          }
        });
      });
    });
    return map;
  }, [projects]);

  const year = month.getFullYear();
  const monthIdx = month.getMonth();
  const firstDay = new Date(year, monthIdx, 1);
  const lastDay = new Date(year, monthIdx + 1, 0);
  const startPad = firstDay.getDay();
  const daysInMonth = lastDay.getDate();
  const weeks = [];
  let week = [];
  for (let i = 0; i < startPad; i++) week.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    week.push(d);
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }
  if (week.length) {
    while (week.length < 7) week.push(null);
    weeks.push(week);
  }

  const getDateKey = (dayNum) => `${year}-${String(monthIdx + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
  const prevMonth = () => setMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1));
  const nextMonth = () => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1));

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50/80 via-white to-indigo-50/80 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <Link to="/" className="p-2 rounded-lg hover:bg-white/80 dark:hover:bg-gray-700/50 transition-colors text-gray-600 dark:text-gray-400">
            <ChevronLeft size={24} />
          </Link>
          <div className="flex items-center gap-2">
            <Calendar size={28} className="text-indigo-600 dark:text-indigo-400" />
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Calendario</h1>
          </div>
        </div>

        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Tareas con fecha límite de todos los proyectos. Clic en una tarea para ir al proyecto.
        </p>

        {isLoading ? (
          <div className="rounded-2xl bg-white/90 dark:bg-gray-800/90 border border-gray-200 dark:border-gray-700 shadow-lg p-12 text-center text-gray-500">
            Cargando...
          </div>
        ) : (
          <div className="rounded-2xl bg-white/90 dark:bg-gray-800/90 backdrop-blur border border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-indigo-100 dark:border-gray-700 bg-indigo-50/80 dark:bg-indigo-900/20 flex items-center justify-between">
              <button type="button" onClick={prevMonth} className="p-2 rounded-lg hover:bg-white/50 dark:hover:bg-gray-700/50 text-gray-600 dark:text-gray-300">
                <ChevronRight size={20} className="rotate-180" />
              </button>
              <h2 className="font-semibold text-gray-800 dark:text-white capitalize">
                {month.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })}
              </h2>
              <button type="button" onClick={nextMonth} className="p-2 rounded-lg hover:bg-white/50 dark:hover:bg-gray-700/50 text-gray-600 dark:text-gray-300">
                <ChevronRight size={20} />
              </button>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((d) => (
                  <div key={d}>{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {weeks.flat().map((d, i) => {
                  const dateKey = d != null ? getDateKey(d) : null;
                  const tasks = dateKey ? (tasksByDate[dateKey] || []) : [];
                  return (
                    <div
                      key={d != null ? dateKey : `e-${i}`}
                      className="min-h-[88px] rounded-lg border border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-700/30 p-1.5"
                    >
                      {d != null && <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{d}</span>}
                      {tasks.length > 0 && (
                        <div className="mt-1 space-y-1">
                          {tasks.slice(0, 4).map((t) => {
                            const theme = COLOR_PALETTE[t.projectColor] || COLOR_PALETTE.gray;
                            return (
                              <Link
                                key={t.id}
                                to="/proyectos"
                                className="block text-left text-xs truncate px-1.5 py-0.5 rounded bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 hover:ring-2 hover:ring-indigo-300 dark:hover:ring-indigo-600 transition-shadow"
                                title={`${t.text || 'Sin título'} · ${t.projectName}`}
                              >
                                <span className={t.done ? 'line-through text-gray-400' : ''}>{t.done ? '✓ ' : ''}{t.text || 'Sin título'}</span>
                                <span className={`block truncate text-[10px] ${theme.text} opacity-90`}>{t.projectName}</span>
                              </Link>
                            );
                          })}
                          {tasks.length > 4 && <div className="text-xs text-gray-500 dark:text-gray-400">+{tasks.length - 4}</div>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <Folder size={16} />
          <span>Los datos vienen de Proyectos. Edita fechas allí.</span>
          <Link to="/proyectos" className="text-indigo-600 dark:text-indigo-400 hover:underline">Ir a Proyectos</Link>
        </div>
      </div>
    </div>
  );
}
