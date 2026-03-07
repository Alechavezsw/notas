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
  if (!Array.isArray(stages) || stages.length === 0) return DEFAULT_STAGES.map((s, i) => ({ ...s, id: s.id || `s${i}`, order: i, tasks: (s.tasks || []).map((t) => ({ id: t.id || Date.now() + i, text: t.text || '', done: !!t.done })) }));
  return stages
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((s, i) => ({
      id: s.id || `stage-${i}`,
      name: s.name || `Etapa ${i + 1}`,
      order: i,
      tasks: (s.tasks || []).map((t) => ({ id: t.id || Date.now() + Math.random(), text: t.text || '', done: !!t.done })),
    }));
}

function countTasks(project) {
  const stages = project.stages || [];
  return stages.reduce((sum, s) => sum + (s.tasks || []).length, 0);
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
  const saveTimeoutRef = useRef(null);

  useEffect(() => {
    if (supabase) {
      (async () => {
        try {
          const { data, error } = await supabase.from('projects').select('*');
          if (!error && data) {
            setProjects(
              data.map((p) => ({
                ...p,
                tags: p.tags || [],
                stages: normalizeStages(p.stages),
              }))
            );
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

  const saveToBackend = useCallback(async (list) => {
    if (supabase) {
      setSaveStatus('saving');
      setSaveError(null);
      try {
        const payload = list.map((p) => ({ name: p.name, color: p.color, tags: p.tags || [], stages: p.stages || [] }));
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
    setProjects((prev) => [...prev, { name: trimmed, color, tags: [], stages: normalizeStages([]) }]);
    setNewName('');
  };

  const removeProject = (name) => {
    if (!confirm(`¿Eliminar el proyecto "${name}"?`)) return;
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
        return { ...s, tasks: [...tasks, { id: Date.now() + Math.random(), text: '', done: false }] };
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
          tasks: (s.tasks || []).map((t) => (t.id === taskId ? { ...t, [field]: value } : t)),
        };
      }),
    }));
  };

  const removeTask = (projName, stageId, taskId) => {
    updateProject(projName, (p) => ({
      ...p,
      stages: (p.stages || []).map((s) => {
        if (s.id !== stageId) return s;
        return { ...s, tasks: (s.tasks || []).filter((t) => t.id !== taskId) };
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
          task = (s.tasks || []).find((t) => t.id === taskId);
          return { ...s, tasks: (s.tasks || []).filter((t) => t.id !== taskId) };
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

  const current = selectedProject ? getProject(selectedProject) : null;

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
          <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-indigo-200">
              <Folder size={22} />
            </div>
            {current ? current.name : 'Proyectos'}
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
                        </div>
                        <ChevronRight size={20} className="text-gray-400 flex-shrink-0" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        ) : (
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
        )}
      </main>
    </div>
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
            className="flex-shrink-0 w-72 rounded-xl bg-white/90 border border-gray-200 shadow-lg overflow-hidden flex flex-col"
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
                  className="group flex items-start gap-2 p-2 rounded-lg bg-gray-50 hover:bg-gray-100 border border-gray-100"
                >
                  <input
                    type="checkbox"
                    checked={!!task.done}
                    onChange={(e) => onUpdateTask(stage.id, task.id, 'done', e.target.checked)}
                    className="mt-1 w-4 h-4 rounded text-indigo-600 border-gray-300 focus:ring-indigo-500"
                  />
                  <input
                    type="text"
                    value={task.text}
                    onChange={(e) => onUpdateTask(stage.id, task.id, 'text', e.target.value)}
                    placeholder="Tarea..."
                    className={`flex-1 min-w-0 bg-transparent text-sm focus:outline-none focus:ring-0 ${task.done ? 'line-through text-gray-400' : 'text-gray-800'}`}
                  />
                  <select
                    className="opacity-0 group-hover:opacity-100 text-xs border border-gray-200 rounded px-1 py-0.5 bg-white"
                    value=""
                    onChange={(e) => {
                      const toId = e.target.value;
                      if (toId) onMoveTask(stage.id, toId, task.id);
                      e.target.value = '';
                    }}
                  >
                    <option value="">Mover a...</option>
                    {stages.filter((s) => s.id !== stage.id).map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => onRemoveTask(stage.id, task.id)}
                    className="p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100"
                  >
                    <X size={14} />
                  </button>
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
