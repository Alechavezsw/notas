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
} from 'lucide-react';

const STORAGE_KEY = 'alenotes_projects_v2';

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

export default function Proyectos() {
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(!!supabase);
  const [saveStatus, setSaveStatus] = useState('saved');
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
            setProjects(data.map((p) => ({ ...p, tags: p.tags || [] })));
          }
        } catch (_) {}
        setIsLoading(false);
      })();
    } else {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        setProjects(raw ? JSON.parse(raw) : []);
      } catch (_) {}
      setIsLoading(false);
    }
  }, []);

  const saveToBackend = useCallback(async (list) => {
    if (supabase) {
      setSaveStatus('saving');
      try {
        const payload = list.map((p) => ({ name: p.name, color: p.color, tags: p.tags || [] }));
        const { error } = await supabase.from('projects').upsert(payload, { onConflict: 'name' });
        if (error) throw error;
        setSaveStatus('saved');
      } catch (err) {
        console.error('Error guardando proyectos:', err);
        setSaveStatus('error');
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

  const addProject = () => {
    const trimmed = newName.trim();
    if (!trimmed || projects.some((p) => p.name === trimmed)) return;
    const color = COLOR_KEYS[Math.floor(Math.random() * COLOR_KEYS.length)];
    setProjects((prev) => [...prev, { name: trimmed, color, tags: [] }]);
    setNewName('');
  };

  const removeProject = (name) => {
    if (!confirm(`¿Eliminar el proyecto "${name}"? Las notas de este proyecto quedarán en "General" si las movés después.`)) return;
    setProjects((prev) => prev.filter((p) => p.name !== name));
  };

  const setProjectColor = (name, color) => {
    const idx = COLOR_KEYS.indexOf(projects.find((p) => p.name === name)?.color || 'gray');
    const next = COLOR_KEYS[(idx + 1) % COLOR_KEYS.length];
    setProjects((prev) => prev.map((p) => (p.name === name ? { ...p, color: next } : p)));
  };

  const setProjectName = (oldName, newNameTrimmed) => {
    if (!newNameTrimmed || newNameTrimmed === oldName) return;
    if (projects.some((p) => p.name === newNameTrimmed)) return;
    setProjects((prev) => prev.map((p) => (p.name === oldName ? { ...p, name: newNameTrimmed } : p)));
  };

  const addTag = (projName, tag) => {
    const t = tag.trim().toLowerCase();
    if (!t) return;
    setProjects((prev) =>
      prev.map((p) => {
        if (p.name !== projName) return p;
        const tags = p.tags || [];
        return tags.includes(t) ? p : { ...p, tags: [...tags, t] };
      })
    );
    setNewTag('');
  };

  const removeTag = (projName, tag) => {
    setProjects((prev) =>
      prev.map((p) =>
        p.name === projName ? { ...p, tags: (p.tags || []).filter((t) => t !== tag) } : p
      )
    );
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50/80 via-white to-indigo-50/80">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-gray-200/60 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link
            to="/"
            className="flex items-center gap-2 text-gray-600 hover:text-indigo-600 transition-colors font-medium"
          >
            <ArrowLeft size={20} />
            Notas
          </Link>
          <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-indigo-200">
              <Folder size={22} />
            </div>
            Proyectos
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

      <main className="max-w-3xl mx-auto px-4 py-6 pb-16">
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
            <button
              type="button"
              onClick={addProject}
              className="px-4 py-3 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2"
            >
              <FolderPlus size={20} />
              Agregar
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {projects.length === 0 ? (
            <div className="rounded-2xl bg-white/90 border border-gray-200/60 shadow-sm p-12 text-center text-gray-500">
              <Folder size={48} className="mx-auto mb-3 text-gray-300" />
              <p className="font-medium">No hay proyectos</p>
              <p className="text-sm mt-1">Creá uno arriba; después podés usarlo como categoría en las notas.</p>
            </div>
          ) : (
            projects.map((proj) => {
              const theme = COLOR_PALETTE[proj.color] || COLOR_PALETTE.gray;
              const tags = proj.tags || [];
              const isEditingTags = editingTags === proj.name;
              return (
                <div
                  key={proj.name}
                  className={`rounded-2xl border shadow-lg overflow-hidden transition-all ${theme.bg} ${theme.border} border`}
                >
                  <div className="p-4 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setProjectColor(proj.name, proj.color)}
                      className={`w-10 h-10 rounded-xl ${theme.dot} flex-shrink-0 hover:opacity-90 transition-opacity`}
                      title="Cambiar color"
                    />
                    <input
                      type="text"
                      defaultValue={proj.name}
                      onBlur={(e) => setProjectName(proj.name, e.target.value.trim())}
                      onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
                      className={`flex-1 font-semibold bg-transparent focus:outline-none focus:ring-0 border-b border-transparent focus:border-gray-400 ${theme.text}`}
                    />
                    <button
                      type="button"
                      onClick={() => setEditingTags(isEditingTags ? null : proj.name)}
                      className="p-2 rounded-lg text-gray-500 hover:bg-white/50 transition-colors"
                      title="Etiquetas"
                    >
                      <Tag size={18} />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeProject(proj.name)}
                      className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                  {isEditingTags && (
                    <div className="px-4 pb-4 pt-0">
                      <div className="flex flex-wrap gap-2 mb-2">
                        {tags.map((t) => (
                          <span
                            key={t}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white/80 text-sm border border-gray-200"
                          >
                            {t}
                            <button type="button" onClick={() => removeTag(proj.name, t)} className="text-gray-400 hover:text-red-500">
                              <X size={14} />
                            </button>
                          </span>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Nueva etiqueta..."
                          value={newTag}
                          onChange={(e) => setNewTag(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag(proj.name, newTag))}
                          className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                        />
                        <button
                          type="button"
                          onClick={() => addTag(proj.name, newTag)}
                          className="px-3 py-2 rounded-lg bg-indigo-100 text-indigo-700 text-sm font-medium hover:bg-indigo-200"
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
}
