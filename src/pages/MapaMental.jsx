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
} from 'lucide-react';

const STORAGE_KEY = 'alenotes_mapa_mental';
const MIND_MAP_ID = 'default';

const DEPTH_COLORS = [
  'from-violet-500 to-purple-600',
  'from-indigo-500 to-blue-600',
  'from-teal-500 to-cyan-600',
  'from-emerald-500 to-green-600',
  'from-amber-500 to-orange-500',
  'from-rose-500 to-pink-600',
];

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

function createNode(text = 'Nueva idea') {
  return { id: Date.now() + Math.random(), text, children: [] };
}

function MindMapNode({ node, depth, onUpdate, onAddChild, onDelete, isRoot }) {
  const [isEditing, setIsEditing] = useState(false);
  const [localText, setLocalText] = useState(node.text);
  const colorClass = DEPTH_COLORS[Math.min(depth, DEPTH_COLORS.length - 1)];

  useEffect(() => {
    setLocalText(node.text);
  }, [node.text]);

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
        className={`group relative rounded-2xl px-4 py-3 min-w-[140px] max-w-[220px] shadow-lg border-2 border-white/30 bg-gradient-to-br ${colorClass} text-white transition-all duration-200 hover:scale-105 hover:shadow-xl ${isRoot ? 'text-lg font-bold px-6 py-4' : 'text-sm'}`}
      >
        {isEditing ? (
          <input
            type="text"
            value={localText}
            onChange={(e) => setLocalText(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={(e) => e.key === 'Enter' && (e.target.blur(), e.preventDefault())}
            className="w-full bg-white/20 rounded-lg px-2 py-1 text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/50"
            autoFocus
          />
        ) : (
          <span
            className="block cursor-pointer select-none break-words"
            onClick={() => setIsEditing(true)}
          >
            {node.text || 'Escribí algo'}
          </span>
        )}
        <div className="absolute -right-2 -top-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onAddChild(node.id); }}
            className="p-1.5 rounded-full bg-white/90 text-gray-700 hover:bg-white shadow"
            title="Agregar rama"
          >
            <Plus size={14} />
          </button>
          {!isRoot && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onDelete(node.id); }}
              className="p-1.5 rounded-full bg-red-500/90 text-white hover:bg-red-600 shadow"
              title="Eliminar"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      {hasChildren && (
        <>
          <div className="w-0.5 h-4 bg-gradient-to-b from-gray-300 to-gray-200 rounded-full" />
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 pt-2">
            {node.children.map((child) => (
              <div key={child.id} className="flex flex-col items-center">
                <div className="w-0.5 h-4 bg-gray-300 rounded-full" />
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
  const [root, setRoot] = useState(() => createNode('Centro'));
  const [isLoading, setIsLoading] = useState(!!supabase);
  const [saveStatus, setSaveStatus] = useState('saved');
  const [zoom, setZoom] = useState(1);
  const saveTimeoutRef = useRef(null);

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

  useEffect(() => {
    if (supabase) {
      (async () => {
        try {
          const { data, error } = await supabase
            .from('mind_maps')
            .select('data')
            .eq('id', MIND_MAP_ID)
            .maybeSingle();
          if (!error && data?.data?.root) {
            setRoot(data.data.root);
          }
        } catch (_) {}
        setIsLoading(false);
      })();
    } else {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.root) setRoot(parsed.root);
        }
      } catch (_) {}
      setIsLoading(false);
    }
  }, []);

  const save = useCallback(async (tree) => {
    if (supabase) {
      setSaveStatus('saving');
      try {
        const { error } = await supabase.from('mind_maps').upsert(
          { id: MIND_MAP_ID, data: { root: tree }, updated_at: new Date().toISOString() },
          { onConflict: 'id' }
        );
        if (error) throw error;
        setSaveStatus('saved');
      } catch (err) {
        console.error('Error guardando mapa mental:', err);
        setSaveStatus('error');
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify({ root: tree }));
        } catch (_) {}
      }
    } else {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ root: tree }));
      } catch (_) {}
    }
  }, []);

  useEffect(() => {
    if (isLoading) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => save(root), 1200);
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [root, isLoading, save]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-violet-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-gray-500">
          <div className="w-14 h-14 rounded-2xl bg-violet-100 flex items-center justify-center">
            <Loader2 size={28} className="animate-spin text-violet-600" />
          </div>
          <p className="text-sm font-medium">Cargando mapa...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-violet-50 flex flex-col">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-gray-200/60 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link
            to="/"
            className="flex items-center gap-2 text-gray-600 hover:text-violet-600 transition-colors font-medium"
          >
            <ArrowLeft size={20} />
            Notas
          </Link>
          <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-violet-200">
              <Brain size={22} />
            </div>
            Mapa mental
          </h1>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(0.5, z - 0.15))}
                className="p-2 rounded-md hover:bg-white text-gray-600"
                title="Alejar"
              >
                <ZoomOut size={18} />
              </button>
              <span className="text-xs font-medium text-gray-500 w-10 text-center">{Math.round(zoom * 100)}%</span>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(1.5, z + 0.15))}
                className="p-2 rounded-md hover:bg-white text-gray-600"
                title="Acercar"
              >
                <ZoomIn size={18} />
              </button>
            </div>
            {supabase && (
              <span className="text-xs">
                {saveStatus === 'saving' && <span className="text-amber-600 flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> Guardando...</span>}
                {saveStatus === 'saved' && <span className="text-emerald-600">Guardado</span>}
                {saveStatus === 'error' && <span className="text-red-600">Error</span>}
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-auto p-6 md:p-10 flex items-start justify-center min-h-0">
        <div className="inline-block py-8 transition-transform duration-200" style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}>
          <MindMapNode
            node={root}
            depth={0}
            onUpdate={updateText}
            onAddChild={addChild}
            onDelete={deleteNode}
            isRoot
          />
        </div>
      </main>
    </div>
  );
}
