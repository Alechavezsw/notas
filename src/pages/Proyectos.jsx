import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import {
  ArrowLeft,
  Folder,
  Plus,
  Trash2,
  Tag,
  X,
  Loader2,
  FolderPlus,
  ChevronRight,
  Calendar,
  LayoutGrid,
  Target,
  AlignLeft,
  Activity,
} from 'lucide-react';

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

const COLOR_KEYS = Object.keys(COLOR_PALETTE);

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

function normalizeStages(stages) {
  if (!Array.isArray(stages) || stages.length === 0)
    return DEFAULT_STAGES.map((s, i) => ({
      ...s,
      id: s.id || `s${i}`,
      order: i,
      tasks: (s.tasks || []).map((t, ti) => ({
        id: t.id != null && t.id !== '' ? t.id : `task-${s.id || `s${i}`}-${ti}`,
        text: t.text ?? '',
        done: !!t.done,
        dueDate: t.dueDate || null,
      })),
    }));
  return stages
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((s, i) => ({
      id: s.id || `stage-${i}`,
      name: s.name || `Etapa ${i + 1}`,
      order: i,
      tasks: (s.tasks || []).map((t, ti) => ({
        id: t.id != null && t.id !== '' ? t.id : `task-${s.id || 's'}-${ti}`,
        text: t.text ?? '',
        done: !!t.done,
        dueDate: t.dueDate || null,
      })),
    }));
}

function countTasks(project) {
  const stages = project.stages || [];
  return stages.reduce((sum, s) => sum + (s.tasks || []).length, 0);
}

function normalizeObjectives(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.map((o, i) => ({
    id: o.id != null && o.id !== '' ? o.id : `obj-${i}`,
    text: typeof o.text === 'string' ? o.text : '',
    done: !!o.done,
  }));
}

function computeTaskProgress(project) {
  const stages = project.stages || [];
  let done = 0;
  let total = 0;
  stages.forEach((s) => {
    (s.tasks || []).forEach((t) => {
      total += 1;
      if (t.done) done += 1;
    });
  });
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return { done, total, pct };
}

function computeObjectivesProgress(objectives) {
  const list = Array.isArray(objectives) ? objectives : [];
  if (list.length === 0) return { done: 0, total: 0, pct: 0 };
  const done = list.filter((o) => o.done).length;
  return { done, total: list.length, pct: Math.round((done / list.length) * 100) };
}

function newObjectiveId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `obj-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export default function Proyectos() {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [isLoading, setIsLoading] = useState(!!supabase);
  const [saveStatus, setSaveStatus] = useState('saved');
  const [saveError, setSaveError] = useState(null);
  const [newName, setNewName] = useState('');
  const [editingTags, setEditingTags] = useState(null);
  const [newTag, setNewTag] = useState('');
  const [viewMode, setViewMode] = useState('kanban');
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const saveTimeoutRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    if (supabase) {
      const timeoutId = setTimeout(() => {
        if (cancelled) return;
        try {
          const raw = localStorage.getItem(STORAGE_KEY);
          const parsed = raw ? JSON.parse(raw) : [];
          setProjects(
            parsed.map((p) => ({
              ...p,
              tags: p.tags || [],
              description: p.description ?? '',
              objectives: normalizeObjectives(p.objectives),
              stages: normalizeStages(p.stages),
            }))
          );
        } catch (_) {}
        setIsLoading(false);
      }, 10000);
      (async () => {
        try {
          const { data, error } = await supabase.from('projects').select('*');
          if (cancelled) return;
          if (!error && Array.isArray(data)) {
            setProjects(
              data.map((p) => ({
                ...p,
                name: p.name || '',
                color: p.color || 'gray',
                tags: p.tags || [],
                description: p.description ?? '',
                objectives: normalizeObjectives(p.objectives),
                stages: normalizeStages(p.stages),
              }))
            );
          } else if (error) {
            try {
              const raw = localStorage.getItem(STORAGE_KEY);
              const parsed = raw ? JSON.parse(raw) : [];
              setProjects(
              parsed.map((p) => ({
                ...p,
                tags: p.tags || [],
                description: p.description ?? '',
                objectives: normalizeObjectives(p.objectives),
                stages: normalizeStages(p.stages),
              }))
            );
            } catch (_) {}
          }
        } catch (_) {
          if (!cancelled) {
            try {
              const raw = localStorage.getItem(STORAGE_KEY);
              const parsed = raw ? JSON.parse(raw) : [];
              setProjects(
                parsed.map((p) => ({
                  ...p,
                  tags: p.tags || [],
                  description: p.description ?? '',
                  objectives: normalizeObjectives(p.objectives),
                  stages: normalizeStages(p.stages),
                }))
              );
            } catch (_) {}
          }
        } finally {
          if (!cancelled) {
            clearTimeout(timeoutId);
            setIsLoading(false);
          }
        }
      })();
      return () => {
        cancelled = true;
        clearTimeout(timeoutId);
      };
    } else {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        setProjects(
          parsed.map((p) => ({
            ...p,
            tags: p.tags || [],
            description: p.description ?? '',
            objectives: normalizeObjectives(p.objectives),
            stages: normalizeStages(p.stages),
          }))
        );
      } catch (_) {}
      setIsLoading(false);
    }
  }, []);

  const saveToBackend = useCallback(async (list) => {
    if (supabase) {
      setSaveStatus('saving');
      setSaveError(null);
      try {
        const payload = list.map((p) => ({
          name: p.name,
          color: p.color,
          tags: p.tags || [],
          stages: p.stages || [],
          description: p.description ?? '',
          objectives: p.objectives || [],
        }));
        const { error } = await supabase.from('projects').upsert(payload, { onConflict: 'name' });
        if (error) throw error;
        setSaveStatus('saved');
      } catch (err) {
        const msg = err?.message || err?.error_description || String(err);
        console.error('Error guardando proyectos:', err);
        setSaveStatus('error');
        setSaveError(msg);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
        } catch (_) {}
      }
    } else {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      } catch (_) {}
    }
  }, []);

  useEffect(() => {
    if (isLoading) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => saveToBackend(projects), 1000);
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [projects, isLoading, saveToBackend]);

  const getProject = (name) => projects.find((p) => p.name === name);
  const updateProject = (name, updater) => {
    setProjects((prev) => prev.map((p) => (p.name === name ? updater(p) : p)));
  };

  const addProject = () => {
    const trimmed = newName.trim();
    if (!trimmed || projects.some((p) => p.name === trimmed)) return;
    const color = COLOR_KEYS[Math.floor(Math.random() * COLOR_KEYS.length)];
    setProjects((prev) => [
      ...prev,
      { name: trimmed, color, tags: [], description: '', objectives: [], stages: normalizeStages([]) },
    ]);
    setNewName('');
  };

  const removeProject = async (name) => {
    if (!confirm(`¿Eliminar el proyecto "${name}"? Esta acción no se puede deshacer.`)) return;
    if (supabase) {
      setSaveStatus('saving');
      setSaveError(null);
      const { error } = await supabase.from('projects').delete().eq('name', name);
      if (error) {
        setSaveError(error.message || String(error));
        setSaveStatus('error');
        return;
      }
      setSaveStatus('saved');
    }
    setProjects((prev) => prev.filter((p) => p.name !== name));
    if (selectedProject === name) setSelectedProject(null);
  };

  const setProjectColor = (name) => {
    const proj = getProject(name);
    if (!proj) return;
    const idx = COLOR_KEYS.indexOf(proj.color || 'gray');
    const next = COLOR_KEYS[(idx + 1) % COLOR_KEYS.length];
    updateProject(name, (p) => ({ ...p, color: next }));
  };

  const setProjectName = (oldName, newNameTrimmed) => {
    if (!newNameTrimmed || newNameTrimmed === oldName) return;
    if (projects.some((p) => p.name === newNameTrimmed)) return;
    setProjects((prev) => prev.map((p) => (p.name === oldName ? { ...p, name: newNameTrimmed } : p)));
    if (selectedProject === oldName) setSelectedProject(newNameTrimmed);
  };

  const addTag = (projName, tag) => {
    const t = tag.trim().toLowerCase();
    if (!t) return;
    updateProject(projName, (p) => {
      const tags = p.tags || [];
      return tags.includes(t) ? p : { ...p, tags: [...tags, t] };
    });
    setNewTag('');
  };

  const removeTag = (projName, tag) => {
    updateProject(projName, (p) => ({ ...p, tags: (p.tags || []).filter((t) => t !== tag) }));
  };

  const updateProjectDescription = (projName, description) => {
    updateProject(projName, (p) => ({ ...p, description }));
  };

  const addObjective = (projName) => {
    updateProject(projName, (p) => ({
      ...p,
      objectives: [...(p.objectives || []), { id: newObjectiveId(), text: '', done: false }],
    }));
  };

  const updateObjective = (projName, objId, field, value) => {
    updateProject(projName, (p) => ({
      ...p,
      objectives: (p.objectives || []).map((o) => (String(o.id) === String(objId) ? { ...o, [field]: value } : o)),
    }));
  };

  const removeObjective = (projName, objId) => {
    updateProject(projName, (p) => ({
      ...p,
      objectives: (p.objectives || []).filter((o) => String(o.id) !== String(objId)),
    }));
  };

  const addStage = (projName) => {
    updateProject(projName, (p) => {
      const stages = p.stages || [];
      const newStage = { id: `stage-${Date.now()}`, name: 'Nueva etapa', order: stages.length, tasks: [] };
      return { ...p, stages: [...stages, newStage] };
    });
  };

  const updateStageName = (projName, stageId, name) => {
    updateProject(projName, (p) => ({
      ...p,
      stages: (p.stages || []).map((s) => (s.id === stageId ? { ...s, name: name || s.name } : s)),
    }));
  };

  const removeStage = (projName, stageId) => {
    updateProject(projName, (p) => ({ ...p, stages: (p.stages || []).filter((s) => s.id !== stageId) }));
  };

  const addTask = (projName, stageId) => {
    updateProject(projName, (p) => ({
      ...p,
      stages: (p.stages || []).map((s) => {
        if (s.id !== stageId) return s;
        const tasks = s.tasks || [];
        return {
          ...s,
          tasks: [
            ...tasks,
            {
              id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `task-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
              text: '',
              done: false,
              dueDate: null,
            },
          ],
        };
      }),
    }));
  };

  const updateTask = (projName, stageId, taskId, field, value) => {
    updateProject(projName, (p) => ({
      ...p,
      stages: (p.stages || []).map((s) => {
        if (s.id !== stageId) return s;
        return {
          ...s,
          tasks: (s.tasks || []).map((t) => (String(t.id) === String(taskId) ? { ...t, [field]: value } : t)),
        };
      }),
    }));
  };

  const removeTask = (projName, stageId, taskId) => {
    updateProject(projName, (p) => ({
      ...p,
      stages: (p.stages || []).map((s) => {
        if (s.id !== stageId) return s;
        return { ...s, tasks: (s.tasks || []).filter((t) => String(t.id) !== String(taskId)) };
      }),
    }));
  };

  const moveTask = (projName, fromStageId, toStageId, taskId) => {
    if (fromStageId === toStageId) return;
    setProjects((prev) => {
      const p = prev.find((x) => x.name === projName);
      if (!p) return prev;
      let task = null;
      const stages = (p.stages || []).map((s) => {
        if (s.id === fromStageId) {
          task = (s.tasks || []).find((t) => String(t.id) === String(taskId));
          return { ...s, tasks: (s.tasks || []).filter((t) => String(t.id) !== String(taskId)) };
        }
        return s;
      });
      if (!task) return prev;
      const newStages = stages.map((s) =>
        s.id === toStageId ? { ...s, tasks: [...(s.tasks || []), task] } : s
      );
      return prev.map((x) => (x.name === projName ? { ...x, stages: newStages } : x));
    });
  };

  const current = selectedProject ? getProject(selectedProject) : null;

  const tasksByDate = React.useMemo(() => {
    if (!current?.stages) return {};
    const map = {};
    current.stages.forEach((stage) => {
      (stage.tasks || []).forEach((task) => {
        if (task.dueDate) {
          if (!map[task.dueDate]) map[task.dueDate] = [];
          map[task.dueDate].push({ ...task, stageName: stage.name });
        }
      });
    });
    return map;
  }, [current]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50/80 via-white to-indigo-50/80 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-gray-500">
          <div className="w-14 h-14 rounded-2xl bg-indigo-100 flex items-center justify-center">
            <Loader2 size={28} className="animate-spin text-indigo-600" />
          </div>
          <p className="text-sm font-medium">Cargando proyectos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50/80 via-white to-indigo-50/80">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-gray-200/60 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {current ? (
              <button
                type="button"
                onClick={() => setSelectedProject(null)}
                className="flex items-center gap-2 text-gray-600 hover:text-indigo-600 transition-colors font-medium"
              >
                <ArrowLeft size={20} />
                Volver
              </button>
            ) : (
              <Link to="/" className="flex items-center gap-2 text-gray-600 hover:text-indigo-600 transition-colors font-medium">
                <ArrowLeft size={20} />
                Notas
              </Link>
            )}
          </div>
          <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-indigo-200 flex-shrink-0">
              <Folder size={22} />
            </div>
            <span className="truncate">{current ? current.name : 'Proyectos'}</span>
            {current && (
              <button
                type="button"
                title="Eliminar este proyecto"
                aria-label={`Eliminar proyecto ${current.name}`}
                onClick={() => removeProject(current.name)}
                className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 transition-colors flex-shrink-0"
              >
                <Trash2 size={20} />
              </button>
            )}
          </h1>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {!supabase && <span className="text-xs text-amber-600" title="Configura .env con VITE_SUPABASE_*">Solo local</span>}
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

      <main className="max-w-6xl mx-auto px-4 py-6 pb-16">
        {!current ? (
          <>
            <div className="rounded-2xl bg-white/90 backdrop-blur border border-gray-200/60 shadow-lg shadow-gray-100 p-4 mb-6">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Nuevo proyecto..."
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addProject()}
                  className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300"
                />
                <button type="button" onClick={addProject} className="px-4 py-3 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2">
                  <FolderPlus size={20} />
                  Agregar
                </button>
              </div>
            </div>

            {projects.length === 0 ? (
              <div className="rounded-2xl bg-white/90 border border-gray-200/60 shadow-sm p-12 text-center text-gray-500">
                <Folder size={48} className="mx-auto mb-3 text-gray-300" />
                <p className="font-medium">No hay proyectos</p>
                <p className="text-sm mt-1">Creá uno para gestionar etapas y tareas.</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {projects.map((proj) => {
                  const theme = COLOR_PALETTE[proj.color] || COLOR_PALETTE.gray;
                  const totalTasks = countTasks(proj);
                  const stagesCount = (proj.stages || []).length;
                  const tp = computeTaskProgress(proj);
                  const op = computeObjectivesProgress(proj.objectives);
                  return (
                    <div
                      key={proj.name}
                      className={`rounded-2xl border-2 ${theme.border} ${theme.bg} shadow-lg overflow-hidden transition-all hover:shadow-xl cursor-pointer`}
                      onClick={() => setSelectedProject(proj.name)}
                    >
                      <div className="p-4 flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl ${theme.dot} flex-shrink-0`} />
                        <div className="flex-1 min-w-0">
                          <h2 className={`font-semibold truncate ${theme.text}`}>{proj.name}</h2>
                          <p className="text-xs text-gray-500">{stagesCount} etapas · {totalTasks} tareas</p>
                          {totalTasks > 0 && (
                            <div className="mt-2">
                              <div className="flex justify-between text-[10px] text-gray-500 mb-0.5">
                                <span>Progreso tareas</span>
                                <span>{tp.pct}%</span>
                              </div>
                              <div className="h-1.5 bg-white/60 rounded-full overflow-hidden border border-gray-200/50">
                                <div className={`h-full rounded-full ${theme.dot} transition-all`} style={{ width: `${tp.pct}%` }} />
                              </div>
                            </div>
                          )}
                          {op.total > 0 && (
                            <p className="text-[10px] text-gray-500 mt-1">Objetivos: {op.pct}%</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            type="button"
                            title="Eliminar proyecto"
                            aria-label={`Eliminar proyecto ${proj.name}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              removeProject(proj.name);
                            }}
                            className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-white/80 border border-transparent hover:border-red-200 transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                          <ChevronRight size={20} className="text-gray-400" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          <>
            <ProjectOverviewPanel
              project={current}
              theme={COLOR_PALETTE[current.color] || COLOR_PALETTE.gray}
              onDescriptionChange={(v) => updateProjectDescription(current.name, v)}
              onAddObjective={() => addObjective(current.name)}
              onUpdateObjective={(id, field, value) => updateObjective(current.name, id, field, value)}
              onRemoveObjective={(id) => removeObjective(current.name, id)}
            />
            <div className="flex items-center gap-2 mb-4">
              <span className="text-sm text-gray-500">Vista:</span>
              <button type="button" onClick={() => setViewMode('kanban')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${viewMode === 'kanban' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'}`}><LayoutGrid size={16} /> Kanban</button>
              <button type="button" onClick={() => setViewMode('calendar')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${viewMode === 'calendar' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'}`}><Calendar size={16} /> Calendario</button>
            </div>
            {viewMode === 'kanban' ? (
              <ProjectBoard
                project={current}
                theme={COLOR_PALETTE[current.color] || COLOR_PALETTE.gray}
                onSetColor={() => setProjectColor(current.name)}
                onAddStage={() => addStage(current.name)}
                onUpdateStageName={(stageId, name) => updateStageName(current.name, stageId, name)}
                onRemoveStage={(stageId) => removeStage(current.name, stageId)}
                onAddTask={(stageId) => addTask(current.name, stageId)}
                onUpdateTask={(stageId, taskId, field, value) => updateTask(current.name, stageId, taskId, field, value)}
                onRemoveTask={(stageId, taskId) => removeTask(current.name, stageId, taskId)}
                onMoveTask={(fromId, toId, taskId) => moveTask(current.name, fromId, toId, taskId)}
                onAddTag={(tag) => addTag(current.name, tag)}
                onRemoveTag={(tag) => removeTag(current.name, tag)}
                stages={current.stages || []}
              />
            ) : (
              <CalendarView tasksByDate={tasksByDate} month={calendarMonth} setMonth={setCalendarMonth} theme={COLOR_PALETTE[current.color] || COLOR_PALETTE.gray} />
            )}
          </>
        )}
      </main>
    </div>
  );
}

function ProgressBar({ label, done, total, pct, barClass }) {
  return (
    <div>
      <div className="flex justify-between text-xs text-gray-600 mb-1">
        <span className="font-medium">{label}</span>
        <span className="tabular-nums text-gray-500">
          {total > 0 ? `${done}/${total} · ${pct}%` : 'Sin ítems'}
        </span>
      </div>
      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden border border-gray-200/80">
        <div
          className={`h-full rounded-full transition-all duration-300 ${barClass || 'bg-indigo-500'}`}
          style={{ width: `${total > 0 ? pct : 0}%` }}
        />
      </div>
    </div>
  );
}

function ProjectOverviewPanel({
  project,
  theme,
  onDescriptionChange,
  onAddObjective,
  onUpdateObjective,
  onRemoveObjective,
}) {
  const taskP = computeTaskProgress(project);
  const objP = computeObjectivesProgress(project.objectives);
  const objectives = project.objectives || [];
  const description = project.description ?? '';

  return (
    <section className={`rounded-2xl bg-white/90 backdrop-blur border ${theme.border} shadow-lg shadow-gray-100 overflow-hidden mb-6`}>
      <div className={`px-5 py-4 border-b ${theme.bg} ${theme.border}`}>
        <div className="flex items-center gap-2 mb-1">
          <Activity size={20} className={theme.text} />
          <h2 className={`font-semibold text-lg ${theme.text}`}>Resumen del proyecto</h2>
        </div>
        <p className="text-xs text-gray-500">Descripción, objetivos y progreso general</p>
      </div>
      <div className="p-5 space-y-6">
        <div>
          <div className="flex items-center gap-2 mb-2 text-sm font-semibold text-gray-700">
            <AlignLeft size={16} className="text-gray-500" />
            Descripción
          </div>
          <textarea
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            placeholder="Contá de qué trata el proyecto, contexto, notas importantes…"
            rows={4}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 resize-y min-h-[100px]"
          />
        </div>

        <div className={`rounded-xl ${theme.bg} ${theme.border} border p-4 space-y-4`}>
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
            <Activity size={16} className="text-indigo-600" />
            Progreso
          </div>
          <ProgressBar
            label="Tareas del tablero"
            done={taskP.done}
            total={taskP.total}
            pct={taskP.pct}
            barClass={theme.dot || 'bg-indigo-500'}
          />
          <div className="pt-1">
            <ProgressBar
              label="Objetivos del proyecto"
              done={objP.done}
              total={objP.total}
              pct={objP.pct}
              barClass="bg-violet-500"
            />
          </div>
          {taskP.total === 0 && objP.total === 0 && (
            <p className="text-xs text-gray-500">Agregá tareas en el Kanban u objetivos abajo para ver el progreso.</p>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <Target size={16} className="text-violet-600" />
              Objetivos
            </div>
            <button
              type="button"
              onClick={onAddObjective}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-violet-100 text-violet-800 hover:bg-violet-200 border border-violet-200 transition-colors"
            >
              <Plus size={14} />
              Agregar objetivo
            </button>
          </div>
          {objectives.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center border border-dashed border-gray-200 rounded-xl">
              Definí hitos o metas; marcálos al cumplirlos para ver el progreso.
            </p>
          ) : (
            <ul className="space-y-2">
              {objectives.map((o) => (
                <li
                  key={o.id}
                  className="flex items-start gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50/80 hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    checked={!!o.done}
                    onChange={(e) => onUpdateObjective(o.id, 'done', e.target.checked)}
                    className="mt-1 w-4 h-4 rounded text-violet-600 border-gray-300 focus:ring-violet-500"
                  />
                  <input
                    type="text"
                    value={o.text ?? ''}
                    onChange={(e) => onUpdateObjective(o.id, 'text', e.target.value)}
                    placeholder="Ej. Lanzar MVP, cerrar presupuesto…"
                    className="flex-1 min-w-0 bg-transparent text-sm focus:outline-none focus:ring-0 text-gray-800"
                  />
                  <button
                    type="button"
                    onClick={() => onRemoveObjective(o.id)}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                    title="Quitar objetivo"
                  >
                    <Trash2 size={16} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

function CalendarView({ tasksByDate, month, setMonth, theme }) {
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
  const prevMonth = () => setMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1));
  const nextMonth = () => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1));

  const getDateKey = (dayNum) => `${year}-${String(monthIdx + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;

  return (
    <div className="rounded-2xl bg-white/90 backdrop-blur border border-gray-200/60 shadow-lg overflow-hidden">
      <div className={`px-4 py-3 border-b ${theme.bg} ${theme.border} flex items-center justify-between`}>
        <button type="button" onClick={prevMonth} className="p-2 rounded-lg hover:bg-white/50 text-gray-600"><ChevronRight size={20} className="rotate-180" /></button>
        <h2 className="font-semibold text-gray-800 capitalize">{month.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })}</h2>
        <button type="button" onClick={nextMonth} className="p-2 rounded-lg hover:bg-white/50 text-gray-600"><ChevronRight size={20} /></button>
      </div>
      <div className="p-4">
        <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-gray-500 mb-2">
          {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((d) => (
            <div key={d}>{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {weeks.flat().map((d, i) => {
            const dateKey = d != null ? getDateKey(d) : null;
            const tasks = dateKey ? (tasksByDate[dateKey] || []) : [];
            return (
              <div key={d != null ? dateKey : `e-${i}`} className="min-h-[80px] rounded-lg border border-gray-100 bg-gray-50/50 p-1.5">
                {d != null && <span className="text-sm font-medium text-gray-700">{d}</span>}
                {tasks.length > 0 && (
                  <div className="mt-1 space-y-1">
                    {tasks.slice(0, 3).map((t) => (
                      <div key={t.id} className="text-left text-xs truncate px-1.5 py-0.5 rounded bg-white border border-gray-200" title={t.text}>{t.done ? '✓ ' : ''}{t.text || 'Sin título'}</div>
                    ))}
                    {tasks.length > 3 && <div className="text-xs text-gray-500">+{tasks.length - 3}</div>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function TaskDescriptionField({ task, stageId, done, onUpdateTask }) {
  const ref = React.useRef(null);
  const adjustHeight = () => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(200, Math.max(40, el.scrollHeight))}px`;
  };
  React.useEffect(() => {
    adjustHeight();
  }, [task.text]);
  return (
    <textarea
      ref={ref}
      rows={1}
      value={task.text ?? ''}
      onChange={(e) => {
        onUpdateTask(stageId, task.id, 'text', e.target.value);
        e.target.style.height = 'auto';
        e.target.style.height = `${Math.min(200, Math.max(40, e.target.scrollHeight))}px`;
      }}
      placeholder="Describí la tarea…"
      className={`w-full min-h-[2.5rem] px-2 py-1.5 rounded-lg border border-transparent hover:border-gray-200 focus:border-indigo-300 focus:ring-1 focus:ring-indigo-200 bg-white/80 text-sm leading-snug resize-none focus:outline-none ${done ? 'line-through text-gray-400' : 'text-gray-800'}`}
    />
  );
}

function ProjectBoard({
  project,
  theme,
  onSetColor,
  onAddStage,
  onUpdateStageName,
  onRemoveStage,
  onAddTask,
  onUpdateTask,
  onRemoveTask,
  onMoveTask,
  onAddTag,
  onRemoveTag,
  stages,
}) {
  const [newTag, setNewTag] = useState('');
  const tags = project.tags || [];

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <button type="button" onClick={onSetColor} className={`w-8 h-8 rounded-lg ${theme.dot} hover:opacity-90`} title="Cambiar color" />
        {tags.map((t) => (
          <span key={t} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white/80 text-xs border border-gray-200">
            {t}
            <button type="button" onClick={() => onRemoveTag(t)} className="text-gray-400 hover:text-red-500"><X size={12} /></button>
          </span>
        ))}
        <input
          type="text"
          placeholder="+ Etiqueta"
          value={newTag}
          onChange={(e) => setNewTag(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), newTag.trim() && (onAddTag(newTag.trim()), setNewTag('')))}
          className="w-24 px-2 py-1 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-200"
        />
        <button type="button" onClick={() => newTag.trim() && (onAddTag(newTag.trim()), setNewTag(''))} className="p-1 rounded text-indigo-600 hover:bg-indigo-50"><Plus size={14} /></button>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4 min-h-[420px]">
        {stages.map((stage) => (
          <div
            key={stage.id}
            className="flex-shrink-0 w-80 max-w-[min(100vw-2rem,20rem)] rounded-xl bg-white/90 border border-gray-200 shadow-lg overflow-hidden flex flex-col"
          >
            <div className={`px-4 py-3 border-b ${theme.bg} ${theme.border} flex items-center justify-between`}>
              <input
                type="text"
                value={stage.name}
                onChange={(e) => onUpdateStageName(stage.id, e.target.value)}
                className={`flex-1 font-semibold bg-transparent focus:outline-none focus:ring-0 ${theme.text}`}
              />
              <button
                type="button"
                onClick={() => (stage.tasks || []).length === 0 && confirm('¿Eliminar esta etapa?') && onRemoveStage(stage.id)}
                className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 disabled:opacity-0"
                title="Eliminar etapa"
                disabled={(stage.tasks || []).length > 0}
              >
                <Trash2 size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[120px]">
              {(stage.tasks || []).map((task) => (
                <div
                  key={task.id}
                  className="group rounded-lg bg-gray-50 hover:bg-gray-100 border border-gray-100 p-2 space-y-2"
                >
                  <div className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      checked={!!task.done}
                      onChange={(e) => onUpdateTask(stage.id, task.id, 'done', e.target.checked)}
                      className="mt-2 w-4 h-4 rounded text-indigo-600 border-gray-300 focus:ring-indigo-500 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <TaskDescriptionField task={task} stageId={stage.id} done={!!task.done} onUpdateTask={onUpdateTask} />
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 pl-6 sm:pl-8 border-t border-gray-200/80 pt-2">
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Calendar size={12} className="text-gray-400" />
                      <span className="hidden sm:inline">Límite</span>
                      <input
                        type="date"
                        value={task.dueDate || ''}
                        onChange={(e) => onUpdateTask(stage.id, task.id, 'dueDate', e.target.value || null)}
                        className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white"
                        title="Fecha límite"
                      />
                    </div>
                    <select
                      className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white max-w-[140px]"
                      value=""
                      aria-label="Mover tarea"
                      onChange={(e) => {
                        const toId = e.target.value;
                        if (toId) onMoveTask(stage.id, toId, task.id);
                        e.target.value = '';
                      }}
                    >
                      <option value="">Mover a…</option>
                      {stages.filter((s) => s.id !== stage.id).map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => onRemoveTask(stage.id, task.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg ml-auto"
                      title="Eliminar tarea"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => onAddTask(stage.id)}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border-2 border-dashed border-gray-200 text-gray-500 hover:border-indigo-300 hover:text-indigo-600 text-sm font-medium transition-colors"
              >
                <Plus size={16} />
                Agregar tarea
              </button>
            </div>
          </div>
        ))}
        <div className="flex-shrink-0 w-48 flex items-center justify-center">
          <button
            type="button"
            onClick={onAddStage}
            className="w-full h-32 rounded-xl border-2 border-dashed border-gray-200 text-gray-400 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50/50 flex flex-col items-center justify-center gap-2 transition-colors"
          >
            <Plus size={28} />
            <span className="text-sm font-medium">Nueva etapa</span>
          </button>
        </div>
      </div>
    </>
  );
}
