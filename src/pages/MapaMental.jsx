import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import {
  ArrowLeft,
  Brain,
  Plus,
  Trash2,
  Loader2,
  ZoomIn,
  ZoomOut,
  FileText,
  Lightbulb,
  Target,
  BookOpen,
  Plane,
  Flag,
  Sparkles,
} from 'lucide-react';

const STORAGE_KEY = 'alenotes_mapa_mental';

const NODE_STYLES = [
  { bg: 'bg-gradient-to-br from-violet-500 to-purple-600', shadow: 'shadow-violet-200/50', ring: 'ring-violet-300/40' },
  { bg: 'bg-gradient-to-br from-indigo-500 to-blue-600', shadow: 'shadow-indigo-200/50', ring: 'ring-indigo-300/40' },
  { bg: 'bg-gradient-to-br from-teal-500 to-cyan-600', shadow: 'shadow-teal-200/50', ring: 'ring-teal-300/40' },
  { bg: 'bg-gradient-to-br from-emerald-500 to-green-600', shadow: 'shadow-emerald-200/50', ring: 'ring-emerald-300/40' },
  { bg: 'bg-gradient-to-br from-amber-500 to-orange-500', shadow: 'shadow-amber-200/50', ring: 'ring-amber-300/40' },
  { bg: 'bg-gradient-to-br from-rose-500 to-pink-600', shadow: 'shadow-rose-200/50', ring: 'ring-rose-300/40' },
];

const TEMPLATES = [
  { id: 'blank', name: 'En blanco', desc: 'Empezar desde cero', icon: FileText, root: null },
  { id: 'lluvia', name: 'Lluvia de ideas', desc: 'Ideas, descartes y próximos pasos', icon: Lightbulb, root: null },
  { id: 'proyecto', name: 'Proyecto', desc: 'Objetivos, tareas y recursos', icon: Target, root: null },
  { id: 'estudio', name: 'Estudio', desc: 'Temas, resúmenes y dudas', icon: BookOpen, root: null },
  { id: 'vacaciones', name: 'Vacaciones', desc: 'Destino, actividades y checklist', icon: Plane, root: null },
  { id: 'metas', name: 'Metas', desc: 'Pasos, obstáculos y plazo', icon: Flag, root: null },
];

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

function createNode(text = 'Nueva idea', id = null) {
  return { id: id ?? Date.now() + Math.random(), text, children: [] };
}

function buildTemplateRoot(templateId) {
  const n = (t, children = []) => ({ ...createNode(t), children });
  switch (templateId) {
    case 'lluvia':
      return n('Lluvia de ideas', [
        n('Ideas'),
        n('Posibles'),
        n('Descartadas'),
        n('Próximos pasos'),
      ]);
    case 'proyecto':
      return n('Proyecto', [
        n('Objetivos'),
        n('Tareas'),
        n('Recursos'),
        n('Fechas'),
      ]);
    case 'estudio':
      return n('Materia', [
        n('Temas'),
        n('Resúmenes'),
        n('Ejercicios'),
        n('Dudas'),
      ]);
    case 'vacaciones':
      return n('Viaje', [
        n('Destino'),
        n('Actividades'),
        n('Presupuesto'),
        n('Checklist'),
      ]);
    case 'metas':
      return n('Meta', [
        n('Pasos'),
        n('Obstáculos'),
        n('Recursos'),
        n('Plazo'),
      ]);
    default:
      return createNode('Centro');
  }
}

function MindMapNode({ node, depth, onUpdate, onAddChild, onDelete, isRoot }) {
  const [isEditing, setIsEditing] = useState(false);
  const [localText, setLocalText] = useState(node.text);
  const style = NODE_STYLES[Math.min(depth, NODE_STYLES.length - 1)];

  useEffect(() => setLocalText(node.text), [node.text]);

  const handleBlur = () => {
    setIsEditing(false);
    const t = localText.trim();
    if (t && t !== node.text) onUpdate(node.id, t);
    else setLocalText(node.text);
  };

  const hasChildren = node.children && node.children.length > 0;

  return (
    <div className="flex flex-col items-center">
      <div
        className={`group relative rounded-2xl px-5 py-3.5 min-w-[160px] max-w-[240px] border-2 border-white/40 shadow-xl ${style.shadow} bg-gradient-to-br ${style.bg} text-white transition-all duration-200 hover:scale-[1.02] hover:shadow-2xl hover:ring-4 ${style.ring} ${isRoot ? 'text-lg font-bold px-6 py-4 ring-2 ring-white/30' : 'text-sm'}`}
      >
        {isEditing ? (
          <input
            type="text"
            value={localText}
            onChange={(e) => setLocalText(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={(e) => e.key === 'Enter' && (e.target.blur(), e.preventDefault())}
            className="w-full bg-white/25 rounded-xl px-3 py-1.5 text-white placeholder-white/80 focus:outline-none focus:ring-2 focus:ring-white/60 font-medium"
            autoFocus
          />
        ) : (
          <span
            className="block cursor-pointer select-none break-words"
            onClick={() => setIsEditing(true)}
          >
            {node.text || 'Clic para editar'}
          </span>
        )}
        <div className="absolute -right-2 -top-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onAddChild(node.id); }}
            className="p-1.5 rounded-full bg-white/95 text-gray-700 hover:bg-white shadow-lg"
            title="Agregar rama"
          >
            <Plus size={14} />
          </button>
          {!isRoot && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onDelete(node.id); }}
              className="p-1.5 rounded-full bg-red-500/95 text-white hover:bg-red-600 shadow-lg"
              title="Eliminar"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      {hasChildren && (
        <>
          <div className="w-0.5 h-5 bg-gradient-to-b from-white/50 to-transparent rounded-full" />
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-3 pt-3">
            {node.children.map((child) => (
              <div key={child.id} className="flex flex-col items-center">
                <div className="w-0.5 h-4 bg-white/30 rounded-full" />
                <MindMapNode
                  node={child}
                  depth={depth + 1}
                  onUpdate={onUpdate}
                  onAddChild={onAddChild}
                  onDelete={onDelete}
                  isRoot={false}
                />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function MapaMental() {
  const [maps, setMaps] = useState([]);
  const [currentId, setCurrentId] = useState(null);
  const [root, setRoot] = useState(() => createNode('Centro'));
  const [mapName, setMapName] = useState('');
  const [isLoading, setIsLoading] = useState(!!supabase);
  const [saveStatus, setSaveStatus] = useState('saved');
  const [saveError, setSaveError] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [showNewModal, setShowNewModal] = useState(false);
  const [editingNameId, setEditingNameId] = useState(null);
  const saveTimeoutRef = useRef(null);

  const currentMap = maps.find((m) => m.id === currentId);

  const updateNodeInTree = useCallback((node, id, updater) => {
    if (node.id === id) return updater(node);
    return {
      ...node,
      children: (node.children || []).map((c) => updateNodeInTree(c, id, updater)),
    };
  }, []);

  const addChild = useCallback((parentId) => {
    setRoot((r) =>
      updateNodeInTree(r, parentId, (n) => ({
        ...n,
        children: [...(n.children || []), createNode('')],
      }))
    );
  }, [updateNodeInTree]);

  const updateText = useCallback((nodeId, text) => {
    setRoot((r) => updateNodeInTree(r, nodeId, (n) => ({ ...n, text })));
  }, [updateNodeInTree]);

  const deleteNode = useCallback((nodeId) => {
    const removeFrom = (node) => {
      if (!node.children) return node;
      return {
        ...node,
        children: node.children.filter((c) => c.id !== nodeId).map(removeFrom),
      };
    };
    setRoot((r) => removeFrom(r));
  }, []);

  // Cargar lista de mapas
  useEffect(() => {
    if (supabase) {
      (async () => {
        try {
          const { data, error } = await supabase
            .from('mind_maps')
            .select('id, name, data, updated_at, created_at')
            .order('updated_at', { ascending: false });
          if (!error && Array.isArray(data)) {
            setMaps(data);
            const first = data[0];
            if (first) {
              setCurrentId(first.id);
              setRoot(first.data?.root || createNode('Centro'));
              setMapName(first.name || 'Sin título');
            } else {
              setShowNewModal(true);
            }
          }
        } catch (_) {}
        setIsLoading(false);
      })();
    } else {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : {};
        const list = Array.isArray(parsed.maps) ? parsed.maps : [];
        setMaps(list);
        if (list.length > 0) {
          const first = list[0];
          setCurrentId(first.id);
          setRoot(first.data?.root || createNode('Centro'));
          setMapName(first.name || 'Sin título');
        } else {
          setShowNewModal(true);
        }
      } catch (_) {}
      setIsLoading(false);
    }
  }, []);

  const save = useCallback(
    async (tree, nameToSave = null, idToSave = null) => {
      const id = idToSave ?? currentId;
      const name = nameToSave ?? mapName;
      if (!id) return;
      if (supabase) {
        setSaveStatus('saving');
        setSaveError(null);
        try {
          const { error } = await supabase.from('mind_maps').upsert(
            { id, name, data: { root: tree }, updated_at: new Date().toISOString() },
            { onConflict: 'id' }
          );
          if (error) throw error;
          setSaveStatus('saved');
          setMaps((prev) => {
            const updated = { id, name, data: { root: tree }, updated_at: new Date().toISOString() };
            return [updated, ...prev.filter((m) => m.id !== id)];
          });
        } catch (err) {
          const msg = err?.message || err?.error_description || String(err);
          console.error('Error guardando mapa mental:', err);
          setSaveStatus('error');
          setSaveError(msg);
        }
      } else {
        const updated = { id, name, data: { root: tree }, updated_at: new Date().toISOString() };
        setMaps((prev) => {
          const next = [updated, ...prev.filter((m) => m.id !== id)];
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ maps: next }));
          } catch (_) {}
          return next;
        });
      }
    },
    [currentId, mapName, supabase]
  );

  useEffect(() => {
    if (isLoading || !currentId) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => save(root), 1200);
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [root, currentId, isLoading, save]);

  const createMap = useCallback(
    (templateId) => {
      const id = crypto.randomUUID ? crypto.randomUUID() : `map-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const t = TEMPLATES.find((x) => x.id === templateId) || TEMPLATES[0];
      const newRoot = t.root === null ? (templateId === 'blank' ? createNode('Centro') : buildTemplateRoot(templateId)) : t.root;
      const name = t.name || 'Sin título';
      setRoot(newRoot);
      setCurrentId(id);
      setMapName(name);
      setShowNewModal(false);
      if (supabase) {
        supabase
          .from('mind_maps')
          .upsert({ id, name, data: { root: newRoot }, updated_at: new Date().toISOString() }, { onConflict: 'id' })
          .then(() => setMaps((prev) => [{ id, name, data: { root: newRoot }, updated_at: new Date().toISOString() }, ...prev]));
      } else {
        const payload = { id, name, data: { root: newRoot }, updated_at: new Date().toISOString() };
        setMaps((prev) => [payload, ...prev]);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify({ maps: [payload, ...maps] }));
        } catch (_) {}
      }
    },
    [maps]
  );

  const switchMap = useCallback((map) => {
    setCurrentId(map.id);
    setRoot(map.data?.root || createNode('Centro'));
    setMapName(map.name || 'Sin título');
    setEditingNameId(null);
  }, []);

  const deleteMap = useCallback(
    (id) => {
      if (supabase) supabase.from('mind_maps').delete().eq('id', id).then(() => {});
      setMaps((prev) => prev.filter((m) => m.id !== id));
      if (currentId === id) {
        const rest = maps.filter((m) => m.id !== id);
        if (rest.length > 0) switchMap(rest[0]);
        else setShowNewModal(true);
      }
    },
    [currentId, maps, switchMap, supabase]
  );

  const renameMap = useCallback(
    (id, newName) => {
      const trimmed = (newName || '').trim() || 'Sin título';
      setMapName(trimmed);
      setMaps((prev) => prev.map((m) => (m.id === id ? { ...m, name: trimmed } : m)));
      if (supabase && currentId === id) {
        supabase.from('mind_maps').update({ name: trimmed, updated_at: new Date().toISOString() }).eq('id', id).then(() => {});
      }
      setEditingNameId(null);
    },
    [currentId, supabase]
  );

  useEffect(() => {
    if (!currentMap) return;
    setMapName(currentMap.name || 'Sin título');
  }, [currentId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-violet-950/30 to-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-violet-200">
          <div className="w-14 h-14 rounded-2xl bg-violet-500/20 flex items-center justify-center">
            <Loader2 size={28} className="animate-spin text-violet-400" />
          </div>
          <p className="text-sm font-medium">Cargando mapas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(139,92,246,0.15),transparent)] bg-slate-900 flex">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 border-r border-slate-700/60 bg-slate-800/50 flex flex-col">
        <div className="p-3 border-b border-slate-700/60">
          <Link to="/" className="flex items-center gap-2 text-slate-400 hover:text-violet-300 text-sm font-medium transition-colors">
            <ArrowLeft size={18} />
            Notas
          </Link>
        </div>
        <div className="p-2 flex-1 overflow-y-auto">
          <button
            type="button"
            onClick={() => setShowNewModal(true)}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-violet-500/20 text-violet-300 hover:bg-violet-500/30 border border-violet-400/30 transition-colors text-sm font-medium"
          >
            <Plus size={18} />
            Nuevo mapa
          </button>
          <div className="mt-3 space-y-1">
            {maps.map((m) => (
              <div
                key={m.id}
                className={`group flex items-center gap-2 rounded-xl px-3 py-2 cursor-pointer transition-colors ${m.id === currentId ? 'bg-violet-500/25 text-violet-200 border border-violet-400/30' : 'hover:bg-slate-700/50 text-slate-300'}`}
                onClick={() => switchMap(m)}
              >
                {editingNameId === m.id ? (
                  <input
                    type="text"
                    value={mapName}
                    onChange={(e) => setMapName(e.target.value)}
                    onBlur={() => renameMap(m.id, mapName)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.target.blur(), e.preventDefault())}
                    className="flex-1 min-w-0 bg-slate-700 rounded px-2 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-violet-400"
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span className="flex-1 truncate text-sm" onDoubleClick={(e) => { e.stopPropagation(); setEditingNameId(m.id); setMapName(m.name); }}>{m.name || 'Sin título'}</span>
                )}
                <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setEditingNameId(m.id); setMapName(m.name); }}
                    className="p-1 rounded text-slate-500 hover:text-violet-400"
                    title="Renombrar"
                  >
                    <FileText size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); if (maps.length > 1) deleteMap(m.id); }}
                    className="p-1 rounded text-slate-500 hover:text-red-400"
                    title="Eliminar"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-10 bg-slate-800/80 backdrop-blur-md border-b border-slate-700/60 flex items-center justify-between px-4 py-3">
          <h1 className="text-lg font-bold text-slate-100 flex items-center gap-2 truncate">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-violet-500/25">
              <Brain size={20} />
            </div>
            {currentMap ? (currentMap.name || 'Sin título') : 'Mapa mental'}
          </h1>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-slate-700/50 rounded-lg p-1 border border-slate-600/50">
              <button type="button" onClick={() => setZoom((z) => Math.max(0.5, z - 0.15))} className="p-2 rounded-md hover:bg-slate-600/50 text-slate-300" title="Alejar">
                <ZoomOut size={18} />
              </button>
              <span className="text-xs font-medium text-slate-400 w-10 text-center">{Math.round(zoom * 100)}%</span>
              <button type="button" onClick={() => setZoom((z) => Math.min(1.5, z + 0.15))} className="p-2 rounded-md hover:bg-slate-600/50 text-slate-300" title="Acercar">
                <ZoomIn size={18} />
              </button>
            </div>
            {!supabase && <span className="text-xs text-amber-400">Solo local</span>}
            {supabase && (
              <span className="text-xs">
                {saveStatus === 'saving' && <span className="text-amber-400 flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> Guardando...</span>}
                {saveStatus === 'saved' && <span className="text-emerald-400">Guardado</span>}
                {saveStatus === 'error' && <span className="text-red-400" title={saveError}>Error{saveError ? `: ${saveError}` : ''}</span>}
              </span>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6 md:p-10 flex items-start justify-center min-h-0 bg-[radial-gradient(circle_at_50%_50%,rgba(139,92,246,0.06),transparent_50%)]">
          {currentId ? (
            <div className="inline-block py-8 transition-transform duration-200" style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}>
              <MindMapNode node={root} depth={0} onUpdate={updateText} onAddChild={addChild} onDelete={deleteNode} isRoot />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-6 text-slate-400 py-20">
              <Sparkles size={48} className="text-violet-500/60" />
              <p className="text-sm">Creá tu primer mapa para empezar</p>
              <button
                type="button"
                onClick={() => setShowNewModal(true)}
                className="px-4 py-2 rounded-xl bg-violet-500/30 text-violet-300 hover:bg-violet-500/50 border border-violet-400/40 font-medium"
              >
                Nuevo mapa
              </button>
            </div>
          )}
        </main>
      </div>

      {/* Modal plantillas */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowNewModal(false)}>
          <div className="bg-slate-800 border border-slate-600 rounded-2xl shadow-2xl max-w-lg w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-slate-100 mb-1 flex items-center gap-2">
              <Sparkles size={24} className="text-violet-400" />
              Elegí una plantilla
            </h2>
            <p className="text-sm text-slate-400 mb-6">Empezá con una estructura o en blanco</p>
            <div className="grid grid-cols-2 gap-3">
              {TEMPLATES.map((t) => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => createMap(t.id)}
                    className="flex flex-col items-start gap-2 p-4 rounded-xl border border-slate-600 bg-slate-700/50 hover:bg-slate-700 hover:border-violet-500/50 hover:shadow-lg hover:shadow-violet-500/10 text-left transition-all group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center text-violet-400 group-hover:bg-violet-500/30">
                      <Icon size={22} />
                    </div>
                    <span className="font-semibold text-slate-200 group-hover:text-white">{t.name}</span>
                    <span className="text-xs text-slate-500">{t.desc}</span>
                  </button>
                );
              })}
            </div>
            <button type="button" onClick={() => setShowNewModal(false)} className="mt-4 w-full py-2 rounded-xl border border-slate-600 text-slate-400 hover:bg-slate-700/50 text-sm">
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
