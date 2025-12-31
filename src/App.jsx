import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

import { 
  Plus, Trash2, Search, Layout, Columns, Type, Table, Menu, X,
  FileText, Trello, CheckSquare, ChevronLeft, ChevronRight, Calendar,
  User, Image as ImageIcon, UploadCloud, Grid, Layers, Tag,
  Link as LinkIcon, ExternalLink, Book, Tv, Plane, Dumbbell, Wrench,
  ShoppingCart, Heart, Map, AlertCircle, ListTodo, Loader2,
  Bold, Underline, Italic, Strikethrough, List, Pin, PinOff
} from 'lucide-react';

// --- CONFIGURACIÓN SUPABASE ---
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

// Log de configuración (solo en desarrollo)
if (import.meta.env.DEV) {
  if (supabase) {
    console.log('✓ Supabase configurado correctamente');
  } else {
    console.log('ℹ️ Supabase no configurado, usando LocalStorage');
  }
}

// --- Configuración de Colores ---
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

const SPECIAL_LIST_TYPES = {
  books: { id: 'books', label: 'Libros', icon: Book, color: 'blue' },
  series: { id: 'series', label: 'Series', icon: Tv, color: 'purple' },
  travel: { id: 'travel', label: 'Viajes', icon: Plane, color: 'teal' },
  sports: { id: 'sports', label: 'Deportes', icon: Dumbbell, color: 'orange' },
  fix: { id: 'fix', label: 'Arreglar si o si', icon: Wrench, color: 'gray' },
  shopping: { id: 'shopping', label: 'Compras', icon: ShoppingCart, color: 'emerald' },
  namis: { id: 'namis', label: 'Namis', icon: Heart, color: 'pink', showBigCounter: true },
  adventures: { id: 'adventures', label: 'Aventuras', icon: Map, color: 'yellow' },
  must_do: { id: 'must_do', label: 'Cosas que hacer si o si', icon: AlertCircle, color: 'red' },
};

// --- UI Components ---

const Button = ({ onClick, children, variant = 'primary', className = '', icon: Icon }) => {
  const baseStyle = "flex items-center justify-center px-4 py-2 rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 select-none active:scale-95 touch-manipulation";
  const variants = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500 shadow-md hover:shadow-lg",
    secondary: "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 hover:border-gray-300 focus:ring-gray-200",
    ghost: "text-gray-500 hover:bg-gray-100 hover:text-gray-900",
    danger: "text-red-500 hover:bg-red-50 hover:text-red-700",
    icon: "p-2 rounded-full hover:bg-gray-100 text-gray-500"
  };
  return (
    <button onClick={onClick} className={`${baseStyle} ${variants[variant]} ${className}`}>
      {Icon && <Icon size={18} className={children ? "mr-2" : ""} />}
      {children}
    </button>
  );
};

const Badge = ({ children, colorKey = 'gray', active, onClick }) => {
  const theme = COLOR_PALETTE[colorKey] || COLOR_PALETTE.gray;
  return (
    <span onClick={onClick} className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors cursor-pointer border select-none touch-manipulation ${active ? `${theme.bg} ${theme.text} ${theme.border} ring-1 ring-offset-1 ring-${colorKey}-300` : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
      {active && <span className={`w-1.5 h-1.5 rounded-full mr-2 ${theme.dot}`}></span>}
      {children}
    </span>
  );
};

const NoteBadge = ({ children, colorKey = 'gray' }) => {
  const theme = COLOR_PALETTE[colorKey] || COLOR_PALETTE.gray;
  return (<span className={`text-[10px] px-1.5 py-0.5 rounded-md truncate max-w-[80px] ${theme.bg} ${theme.text} border ${theme.border}`}>{children}</span>);
}

// --- Blocks ---
const TextBlock = ({ content, onChange, placeholder = "Escribe algo aquí..." }) => {
  const editorRef = React.useRef(null);
  const [showFormatBar, setShowFormatBar] = React.useState(false);
  const [isComposing, setIsComposing] = React.useState(false);

  // Sincronizar contenido cuando cambia externamente
  React.useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== content) {
      editorRef.current.innerHTML = content || '';
    }
  }, [content]);

  const handleInput = (e) => {
    if (!isComposing) {
      const html = e.target.innerHTML;
      onChange(html);
    }
    // Auto-resize
    e.target.style.height = 'auto';
    e.target.style.height = e.target.scrollHeight + 'px';
  };

  const handleCompositionStart = () => {
    setIsComposing(true);
  };

  const handleCompositionEnd = (e) => {
    setIsComposing(false);
    const html = e.target.innerHTML;
    onChange(html);
  };

  const applyFormat = (command, value = null) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      onChange(html);
    }
  };

  const handleFocus = () => {
    setShowFormatBar(true);
    // Asegurar dirección correcta al enfocar
    if (editorRef.current) {
      editorRef.current.setAttribute('dir', 'ltr');
      editorRef.current.style.direction = 'ltr';
      editorRef.current.style.textAlign = 'left';
    }
  };

  const handleBlur = () => {
    // Delay para permitir clicks en los botones
    setTimeout(() => setShowFormatBar(false), 200);
  };

  return (
    <div className="group relative">
      {showFormatBar && (
        <div className="absolute -top-10 left-0 z-10 flex items-center gap-1 bg-white border border-gray-200 rounded-lg shadow-lg p-1">
          <button
            onClick={() => applyFormat('bold')}
            className="p-2 hover:bg-gray-100 rounded transition-colors"
            title="Negrita (Ctrl+B)"
          >
            <Bold size={16} className="text-gray-700" />
          </button>
          <button
            onClick={() => applyFormat('italic')}
            className="p-2 hover:bg-gray-100 rounded transition-colors"
            title="Cursiva (Ctrl+I)"
          >
            <Italic size={16} className="text-gray-700" />
          </button>
          <button
            onClick={() => applyFormat('underline')}
            className="p-2 hover:bg-gray-100 rounded transition-colors"
            title="Subrayado (Ctrl+U)"
          >
            <Underline size={16} className="text-gray-700" />
          </button>
          <button
            onClick={() => applyFormat('strikeThrough')}
            className="p-2 hover:bg-gray-100 rounded transition-colors"
            title="Tachado"
          >
            <Strikethrough size={16} className="text-gray-700" />
          </button>
          <div className="w-px h-6 bg-gray-200 mx-1"></div>
          <button
            onClick={() => applyFormat('insertUnorderedList')}
            className="p-2 hover:bg-gray-100 rounded transition-colors"
            title="Lista con viñetas"
          >
            <List size={16} className="text-gray-700" />
          </button>
          <button
            onClick={() => applyFormat('insertOrderedList')}
            className="p-2 hover:bg-gray-100 rounded transition-colors"
            title="Lista numerada"
          >
            <List size={16} className="text-gray-700 rotate-90" />
          </button>
          <div className="w-px h-6 bg-gray-200 mx-1"></div>
          <button
            onClick={() => {
              const url = prompt('Ingresa la URL:');
              if (url) {
                applyFormat('createLink', url);
              }
            }}
            className="p-2 hover:bg-gray-100 rounded transition-colors"
            title="Insertar enlace"
          >
            <LinkIcon size={16} className="text-gray-700" />
          </button>
        </div>
      )}
      <div
        ref={editorRef}
        contentEditable
        dir="ltr"
        onInput={handleInput}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onCompositionStart={handleCompositionStart}
        onCompositionEnd={handleCompositionEnd}
        suppressContentEditableWarning={true}
        className="w-full bg-transparent resize-none focus:outline-none text-gray-700 leading-relaxed p-2 rounded hover:bg-gray-50 focus:bg-white transition-colors text-base md:text-sm min-h-[3rem]"
        style={{ 
          minHeight: '3rem',
          direction: 'ltr',
          textAlign: 'left'
        }}
        data-placeholder={placeholder}
      />
      <style>{`
        [contenteditable][data-placeholder]:empty:before {
          content: attr(data-placeholder);
          color: #9ca3af;
          pointer-events: none;
        }
        [contenteditable] {
          direction: ltr !important;
          text-align: left !important;
        }
        [contenteditable] * {
          direction: ltr !important;
          text-align: left !important;
        }
      `}</style>
    </div>
  );
};

const ImageBlock = ({ src, caption, onChange }) => {
  const fileInputRef = React.useRef(null);
  const [isDragging, setIsDragging] = React.useState(false);

  const handleImageUpload = (file) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => { onChange({ src: reader.result, caption }); };
      reader.readAsDataURL(file);
    }
  };

  const handleFileInput = (e) => {
    const file = e.target.files[0];
    if (file) handleImageUpload(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleImageUpload(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  if (!src) return (
    <div 
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      className={`my-6 p-6 md:p-8 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-gray-400 transition-all cursor-pointer relative group touch-manipulation ${
        isDragging 
          ? 'border-indigo-500 bg-indigo-50 text-indigo-500 scale-105' 
          : 'border-gray-300 bg-gray-50 hover:bg-indigo-50 hover:border-indigo-400 hover:text-indigo-500'
      }`}
      onClick={() => fileInputRef.current?.click()}
    >
      <input 
        ref={fileInputRef}
        type="file" 
        accept="image/*" 
        onChange={handleFileInput} 
        className="hidden" 
      />
      <div className="bg-white p-4 rounded-full shadow-sm mb-3 group-hover:scale-110 transition-transform">
        <UploadCloud size={32} />
      </div>
      <span className="text-sm font-medium text-center">
        {isDragging ? 'Suelta la imagen aquí' : 'Arrastra una imagen o toca para subir'}
      </span>
      <span className="text-xs text-gray-400 mt-1">PNG, JPG, GIF hasta 10MB</span>
    </div>
  );
  return (
    <div className="my-6 group relative">
      <div className="relative rounded-xl overflow-hidden shadow-md border border-gray-200 bg-gray-50 hover:shadow-lg transition-shadow">
        <img src={src} alt={caption || "Imagen"} className="w-full max-h-[600px] object-contain mx-auto" />
        <div className="absolute top-3 right-3 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
          <label className="cursor-pointer bg-white/95 backdrop-blur text-gray-700 hover:text-indigo-600 px-3 py-1.5 rounded-full text-xs font-bold shadow-md border border-gray-200 flex items-center gap-1 transition-colors touch-manipulation">
            <UploadCloud size={12} /> Cambiar <input type="file" accept="image/*" onChange={handleFileInput} className="hidden" />
          </label>
          <button
            onClick={() => onChange({ src: null, caption: '' })}
            className="bg-white/95 backdrop-blur text-red-600 hover:text-red-700 px-3 py-1.5 rounded-full text-xs font-bold shadow-md border border-gray-200 flex items-center gap-1 transition-colors"
          >
            <X size={12} /> Eliminar
          </button>
        </div>
      </div>
      <input 
        type="text" 
        value={caption || ''} 
        onChange={(e) => onChange({ src, caption: e.target.value })} 
        placeholder="Agrega una leyenda..." 
        className="w-full text-center mt-3 text-base md:text-sm text-gray-600 bg-transparent focus:outline-none focus:text-gray-900 placeholder-gray-400 border-b-2 border-transparent focus:border-indigo-300 transition-colors" 
      />
    </div>
  );
};

const ColumnsBlock = ({ leftContent, rightContent, onLeftChange, onRightChange }) => (
  <div className="my-6 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
    <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-gray-200">
      <div className="flex-1 p-4 md:p-6">
        <div className="text-xs font-semibold text-indigo-600 mb-3 uppercase tracking-wider flex items-center gap-2">
          <div className="w-1 h-4 bg-indigo-500 rounded"></div>
          Columna Izquierda
        </div>
        <TextBlock content={leftContent} onChange={onLeftChange} placeholder="Escribe en la columna izquierda..." />
      </div>
      <div className="flex-1 p-4 md:p-6 bg-gray-50/50">
        <div className="text-xs font-semibold text-emerald-600 mb-3 uppercase tracking-wider flex items-center gap-2">
          <div className="w-1 h-4 bg-emerald-500 rounded"></div>
          Columna Derecha
        </div>
        <TextBlock content={rightContent} onChange={onRightChange} placeholder="Escribe en la columna derecha..." />
      </div>
    </div>
  </div>
);

const TableBlock = ({ data, headers, onChange }) => {
  const currentHeaders = headers || data[0].map((_, i) => `Columna ${i + 1}`);
  const updateHeader = (index, value) => { const newHeaders = [...currentHeaders]; newHeaders[index] = value; onChange(data, newHeaders); };
  const addRow = () => { const newRow = new Array(data[0].length).fill(''); onChange([...data, newRow], currentHeaders); };
  const addCol = () => { const newData = data.map(row => [...row, '']); const newHeaders = [...currentHeaders, `Columna ${currentHeaders.length + 1}`]; onChange(newData, newHeaders); };
  const updateCell = (rowIndex, colIndex, value) => { const newData = [...data]; newData[rowIndex][colIndex] = value; onChange(newData, currentHeaders); };
  const removeRow = (index) => { if (data.length <= 1) return; const newData = data.filter((_, i) => i !== index); onChange(newData, currentHeaders); };
  return (
    <div className="my-6 overflow-x-auto bg-white border border-gray-200 rounded-xl shadow-sm scrollbar-thin scrollbar-thumb-gray-200">
      <table className="w-full min-w-[500px]">
        <thead>
          <tr>{currentHeaders.map((header, i) => (<th key={i} className="p-0 bg-gray-50 border-b border-gray-200 w-1/3"><input type="text" value={header} onChange={(e) => updateHeader(i, e.target.value)} className="w-full p-2 bg-transparent font-bold text-xs text-gray-500 uppercase tracking-wider focus:outline-none focus:bg-indigo-50 focus:text-indigo-700" placeholder="TITULO" /></th>))}<th className="p-2 bg-gray-50 border-b border-gray-200 w-10"></th></tr>
        </thead>
        <tbody className="divide-y divide-gray-100">{data.map((row, rowIndex) => (<tr key={rowIndex} className="group hover:bg-gray-50">{row.map((cell, colIndex) => (<td key={colIndex} className="p-1 border-r border-transparent group-hover:border-gray-200"><input type="text" value={cell} onChange={(e) => updateCell(rowIndex, colIndex, e.target.value)} className="w-full p-2 bg-transparent focus:outline-none focus:bg-white rounded text-base md:text-sm text-gray-700" placeholder="-" /></td>))}<td className="p-1 text-center"><button onClick={() => removeRow(rowIndex)} className="text-gray-300 hover:text-red-500 transition-colors opacity-100 md:opacity-0 md:group-hover:opacity-100 touch-manipulation"><X size={14} /></button></td></tr>))}</tbody>
      </table>
      <div className="flex border-t border-gray-200 divide-x divide-gray-200"><button onClick={addRow} className="flex-1 py-3 md:py-2 text-xs font-medium text-gray-500 hover:bg-gray-50 hover:text-indigo-600 transition-colors touch-manipulation">+ Fila</button><button onClick={addCol} className="flex-1 py-3 md:py-2 text-xs font-medium text-gray-500 hover:bg-gray-50 hover:text-indigo-600 transition-colors touch-manipulation">+ Columna</button></div>
    </div>
  );
};

const KanbanBlock = ({ columns, onChange }) => {
  const addCard = (colId) => { const newColumns = columns.map(col => { if (col.id === colId) return { ...col, cards: [...col.cards, { id: Date.now(), content: '' }] }; return col; }); onChange(newColumns); };
  const updateCard = (colId, cardId, content) => { const newColumns = columns.map(col => { if (col.id === colId) return { ...col, cards: col.cards.map(c => c.id === cardId ? { ...c, content } : c) }; return col; }); onChange(newColumns); };
  const deleteCard = (colId, cardId) => { const newColumns = columns.map(col => { if (col.id === colId) return { ...col, cards: col.cards.filter(c => c.id !== cardId) }; return col; }); onChange(newColumns); };
  const moveCard = (fromColIndex, cardId, direction) => { const toColIndex = fromColIndex + direction; if (toColIndex < 0 || toColIndex >= columns.length) return; let cardToMove = null; const newColumns = columns.map((col, idx) => { if (idx === fromColIndex) { cardToMove = col.cards.find(c => c.id === cardId); return { ...col, cards: col.cards.filter(c => c.id !== cardId) }; } return col; }); if (cardToMove) { newColumns[toColIndex].cards.push(cardToMove); onChange(newColumns); } };
  return (
    <div className="my-6 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-gray-200"><div className="flex gap-4 min-w-[600px] md:min-w-0">{columns.map((col, colIndex) => (<div key={col.id} className="flex-1 bg-gray-100 rounded-xl p-3 min-w-[240px] md:min-w-[200px]"><div className="font-semibold text-gray-600 mb-3 px-1 text-sm uppercase tracking-wide flex justify-between">{col.title}<span className="bg-gray-200 text-gray-500 text-xs px-2 py-0.5 rounded-full">{col.cards.length}</span></div><div className="space-y-2">{col.cards.map(card => (<div key={card.id} className="bg-white p-3 rounded-lg shadow-sm border border-gray-200 group relative"><textarea value={card.content} onChange={(e) => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; updateCard(col.id, card.id, e.target.value); }} placeholder="Tarea..." className="w-full text-base md:text-sm bg-transparent resize-none focus:outline-none mb-2" rows={1} /><div className="flex justify-between items-center opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"><button onClick={() => moveCard(colIndex, card.id, -1)} disabled={colIndex === 0} className="p-1 hover:bg-gray-100 rounded disabled:opacity-0 touch-manipulation"><ChevronLeft size={16} className="text-gray-400" /></button><button onClick={() => deleteCard(col.id, card.id)} className="text-red-400 hover:text-red-600 p-1 touch-manipulation"><Trash2 size={14} /></button><button onClick={() => moveCard(colIndex, card.id, 1)} disabled={colIndex === columns.length - 1} className="p-1 hover:bg-gray-100 rounded disabled:opacity-0 touch-manipulation"><ChevronRight size={16} className="text-gray-400" /></button></div></div>))}</div><button onClick={() => addCard(col.id)} className="w-full mt-3 py-2 text-sm text-gray-500 hover:bg-gray-200 rounded-lg border border-dashed border-gray-300 hover:border-transparent transition-all touch-manipulation">+ Tarjeta</button></div>))}</div></div>
  );
};

const ProjectPlanBlock = ({ tasks, onChange }) => {
  const addTask = () => { onChange([...tasks, { id: Date.now(), text: '', date: '', assignee: '', done: false }]); };
  const updateTask = (id, field, value) => { onChange(tasks.map(t => t.id === id ? { ...t, [field]: value } : t)); };
  const deleteTask = (id) => { onChange(tasks.filter(t => t.id !== id)); };
  return (
    <div className="my-6 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
      <div className="bg-indigo-50 px-4 py-3 border-b border-indigo-100 flex items-center justify-between"><h4 className="text-sm font-bold text-indigo-800 uppercase tracking-wide flex items-center gap-2"><CheckSquare size={16} /> Plan</h4></div>
      <div className="divide-y divide-gray-100">{tasks.map(task => (<div key={task.id} className="flex flex-col md:flex-row md:items-center p-3 gap-3 group hover:bg-gray-50"><div className="flex items-start gap-3 w-full"><input type="checkbox" checked={task.done} onChange={(e) => updateTask(task.id, 'done', e.target.checked)} className="w-5 h-5 mt-0.5 text-indigo-600 rounded focus:ring-indigo-500 border-gray-300 flex-shrink-0" /><input type="text" value={task.text} onChange={(e) => updateTask(task.id, 'text', e.target.value)} placeholder="Nombre de la tarea" className={`w-full bg-transparent focus:outline-none text-base md:text-sm ${task.done ? 'text-gray-400 line-through' : 'text-gray-700 font-medium'}`} /></div><div className="flex items-center gap-2 pl-8 md:pl-0 w-full md:w-auto"><div className="flex items-center text-gray-400 bg-gray-50 md:bg-transparent rounded px-2 py-1 md:p-0 flex-1 md:flex-none"><Calendar size={14} className="mr-2" /><input type="date" value={task.date} onChange={(e) => updateTask(task.id, 'date', e.target.value)} className="bg-transparent focus:outline-none text-xs w-full" /></div><div className="flex items-center text-gray-400 bg-gray-50 md:bg-transparent rounded px-2 py-1 md:p-0 flex-1 md:flex-none"><User size={14} className="mr-2" /><input type="text" value={task.assignee} onChange={(e) => updateTask(task.id, 'assignee', e.target.value)} placeholder="Resp." className="bg-transparent focus:outline-none text-xs w-full md:w-auto md:text-right" /></div><button onClick={() => deleteTask(task.id)} className="text-gray-300 hover:text-red-500 p-1 md:opacity-0 md:group-hover:opacity-100"><Trash2 size={16} /></button></div></div>))}</div>
      <button onClick={addTask} className="w-full py-3 md:py-2 text-xs font-medium text-gray-500 hover:bg-gray-50 hover:text-indigo-600 border-t border-gray-100 touch-manipulation">+ Añadir Tarea</button>
    </div>
  );
};

const SpecialListBlock = ({ listType, items, onChange, onTypeChange }) => {
  const config = SPECIAL_LIST_TYPES[listType] || SPECIAL_LIST_TYPES.books;
  const theme = COLOR_PALETTE[config.color] || COLOR_PALETTE.gray;
  const Icon = config.icon;
  const addItem = (e) => { if (e.key === 'Enter' && e.target.value.trim() !== '') { onChange([...items, { id: Date.now(), text: e.target.value, checked: false }]); e.target.value = ''; } };
  const toggleItem = (id) => { onChange(items.map(item => item.id === id ? { ...item, checked: !item.checked } : item)); };
  const deleteItem = (id) => { onChange(items.filter(item => item.id !== id)); };
  const checkedCount = items.filter(i => i.checked).length;
  return (
    <div className={`my-6 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm transition-all duration-300`}>
      <div className={`${theme.bg} px-4 py-3 border-b ${theme.border} flex items-center justify-between`}>
        <div className="flex items-center gap-2 group relative"><Icon size={20} className={theme.text} /><div className="relative"><select value={listType} onChange={(e) => onTypeChange(e.target.value)} className={`appearance-none bg-transparent font-bold ${theme.text} uppercase tracking-wide text-sm focus:outline-none pr-8 cursor-pointer py-1`}>{Object.entries(SPECIAL_LIST_TYPES).map(([key, val]) => (<option key={key} value={key}>{val.label}</option>))}</select><div className={`absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none ${theme.text}`}><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg></div></div></div>
        <span className={`text-xs font-bold ${theme.text} bg-white/50 px-2 py-0.5 rounded-full`}>{checkedCount}/{items.length}</span>
      </div>
      {config.showBigCounter && (<div className="bg-pink-50 p-6 flex flex-col items-center justify-center border-b border-pink-100"><div className="text-6xl font-black text-pink-500 drop-shadow-sm transition-all scale-100">{checkedCount}</div><div className="text-xs font-medium text-pink-400 uppercase tracking-widest mt-2">Namis Completados</div></div>)}
      <div className="p-2 space-y-1">{items.map(item => (<div key={item.id} className="flex items-center group p-2 rounded-lg hover:bg-gray-50 transition-colors"><button onClick={() => toggleItem(item.id)} className={`w-6 h-6 flex-shrink-0 flex items-center justify-center rounded border mr-3 transition-colors touch-manipulation ${item.checked ? `bg-${config.color}-500 border-${config.color}-500 text-white` : 'border-gray-300 text-transparent hover:border-gray-400'}`}><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg></button><span className={`flex-1 text-base md:text-sm ${item.checked ? 'text-gray-400 line-through decoration-gray-300' : 'text-gray-700'}`}>{item.text}</span><button onClick={() => deleteItem(item.id)} className="opacity-100 md:opacity-0 md:group-hover:opacity-100 text-gray-300 hover:text-red-400 p-2 touch-manipulation"><Trash2 size={16} /></button></div>))}<div className="px-2 py-2"><input type="text" placeholder="+ Añadir elemento..." onKeyDown={addItem} className="w-full text-base md:text-sm bg-transparent placeholder-gray-400 text-gray-700 focus:outline-none p-1" /></div></div>
    </div>
  );
};

const GlobalGallery = ({ notes }) => {
  const allImages = useMemo(() => { const images = []; notes.forEach(note => { note.blocks.forEach(block => { if (block.type === 'image' && block.src) { images.push({ id: block.id || Math.random(), src: block.src, caption: block.caption, noteTitle: note.title, noteDate: note.updatedAt }); } }); }); return images; }, [notes]);
  if (allImages.length === 0) return (<div className="flex flex-col items-center justify-center h-full text-gray-400 p-8"><ImageIcon size={64} className="mb-4 text-gray-200" /><p className="text-lg font-medium text-gray-500">Galería vacía</p><p className="text-sm">Añade imágenes a tus notas para verlas aquí.</p></div>);
  return (<div className="p-4 md:p-8 overflow-y-auto h-full pb-20"><h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center"><Grid size={24} className="mr-2 text-indigo-600" /> Galería de Fotos</h2><div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">{allImages.map((img, idx) => (<div key={idx} className="break-inside-avoid group relative rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow bg-white border border-gray-100"><div className="bg-gray-50 overflow-hidden cursor-pointer"><img src={img.src} alt={img.caption} className="w-full h-auto object-cover" /></div><div className="p-3"><p className="text-xs font-bold text-gray-700 truncate">{img.caption || "Sin descripción"}</p><p className="text-[10px] text-gray-400 flex items-center mt-1"><FileText size={10} className="mr-1" /> {img.noteTitle}</p></div><div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors pointer-events-none"></div></div>))}</div></div>);
};

// --- APP ---

export default function App() {
  const [notes, setNotes] = useState([]);
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState('saved'); // 'saved', 'saving', 'error'
  const [deletedNoteIds, setDeletedNoteIds] = useState([]);
  const [deletedProjectNames, setDeletedProjectNames] = useState([]);
  const saveTimeoutRef = useRef(null);
  const notesRef = useRef([]);
  const projectsRef = useRef([]);

  // Sincronizar refs con state (usando useLayoutEffect para que se ejecute antes del guardado)
  React.useLayoutEffect(() => {
    notesRef.current = notes;
  }, [notes]);
  
  React.useLayoutEffect(() => {
    projectsRef.current = projects;
  }, [projects]);

  // Cargar datos al inicio (desde Supabase o LocalStorage fallback si no hay key)
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      if (supabase) {
        try {
          const { data: notesData, error: notesError } = await supabase.from('notes').select('*').order('updated_at', { ascending: false });
          const { data: projectsData, error: projectsError } = await supabase.from('projects').select('*');

          if (!notesError && notesData) {
            const formattedNotes = notesData.map(n => ({
              ...n, 
              id: Number(n.id),
              pinned: n.pinned || false,
              updatedAt: n.updated_at || n.updatedAt || new Date().toISOString()
            }));
            setNotes(formattedNotes);
          }
          if (!projectsError && projectsData) {
            const formattedProjects = projectsData.map(p => ({
              ...p,
              tags: p.tags || []
            }));
            setProjects(formattedProjects);
          }
        } catch (error) {
          console.error('Error loading data:', error);
        }
      } else {
        // Fallback LocalStorage (para demo)
        const localNotes = JSON.parse(localStorage.getItem('alenotes_data_v2') || '[]');
        const localProjects = JSON.parse(localStorage.getItem('alenotes_projects_v2') || '[]');
        
        if (localNotes.length === 0) {
           setNotes([{ id: 1, title: 'Bienvenido a Ale Notes 🚀', category: 'General', updatedAt: new Date().toISOString(), blocks: [{ type: 'text', content: 'Tus notas ahora en la nube ☁️ (Listo para conectar Supabase)' }] }]);
           setProjects([{ name: 'General', color: 'indigo', tags: [] }, { name: 'Trabajo', color: 'blue', tags: [] }, { name: 'Personal', color: 'emerald', tags: [] }]);
        } else {
           setNotes(localNotes);
           setProjects(localProjects);
        }
      }
      setIsLoading(false);
    };
    fetchData();
  }, []);


  // Guardado Automático mejorado con useRef para evitar interferencias
  const saveData = useCallback(async (notesToSave = null, projectsToSave = null) => {
    if (isLoading) return;
    
    setSaveStatus('saving');
    
    // Asegurar que los refs estén actualizados
    if (notesToSave) notesRef.current = notesToSave;
    if (projectsToSave) projectsRef.current = projectsToSave;
    
    // Usar los parámetros si se proporcionan, sino usar refs
    const currentNotes = notesToSave || notesRef.current;
    const currentProjects = projectsToSave || projectsRef.current;
    
    if (supabase) {
      try {
        // Eliminar notas que fueron borradas
        if (deletedNoteIds.length > 0) {
          const idsToDelete = [...deletedNoteIds];
          const { error: deleteError } = await supabase
            .from('notes')
            .delete()
            .in('id', idsToDelete);
          
          if (deleteError) {
            console.error('Error deleting notes:', deleteError);
          } else {
            setDeletedNoteIds([]);
          }
        }

        // Eliminar proyectos que fueron borrados
        if (deletedProjectNames.length > 0) {
          const namesToDelete = [...deletedProjectNames];
          const { error: deleteProjError } = await supabase
            .from('projects')
            .delete()
            .in('name', namesToDelete);
          
          if (deleteProjError) {
            console.error('Error deleting projects:', deleteProjError);
          } else {
            setDeletedProjectNames([]);
          }
        }

        // Preparar datos de notas asegurando que los IDs sean números
        const updates = currentNotes.map(n => ({
          id: Number(n.id), // Asegurar que sea número
          title: n.title || 'Nueva Nota',
          category: n.category || 'General',
          blocks: n.blocks || [],
          pinned: Boolean(n.pinned), // Asegurar que sea booleano
          updated_at: n.updatedAt || new Date().toISOString()
        }));
        
        const projectUpdates = currentProjects.map(p => ({ 
          name: p.name, 
          color: p.color, 
          tags: Array.isArray(p.tags) ? p.tags : [] 
        }));

        let hasError = false;

        if (updates.length > 0) {
          // Usar upsert con onConflict para manejar correctamente las inserciones y actualizaciones
          const { error: notesError } = await supabase
            .from('notes')
            .upsert(updates, { 
              onConflict: 'id',
              ignoreDuplicates: false 
            });
          
          if (notesError) {
            console.error('Error saving notes to Supabase:', notesError);
            console.error('Notes data:', updates);
            hasError = true;
          }
        }

        if (projectUpdates.length > 0) {
          const { error: projectsError } = await supabase
            .from('projects')
            .upsert(projectUpdates, { 
              onConflict: 'name',
              ignoreDuplicates: false 
            });
          
          if (projectsError) {
            console.error('Error saving projects to Supabase:', projectsError);
            hasError = true;
          }
        }
        
        if (hasError) {
          // Si hay error en Supabase, intentar guardar en localStorage como respaldo
          try {
            localStorage.setItem('alenotes_data_v2', JSON.stringify(currentNotes));
            localStorage.setItem('alenotes_projects_v2', JSON.stringify(currentProjects));
            console.log('Datos guardados en localStorage como respaldo');
          } catch (localError) {
            console.error('Error saving to localStorage:', localError);
          }
          setSaveStatus('error');
        } else {
          setSaveStatus('saved');
        }
      } catch (error) {
        console.error('Error saving data to Supabase:', error);
        // Intentar guardar en localStorage como respaldo
        try {
          localStorage.setItem('alenotes_data_v2', JSON.stringify(currentNotes));
          localStorage.setItem('alenotes_projects_v2', JSON.stringify(currentProjects));
          console.log('Datos guardados en localStorage como respaldo');
        } catch (localError) {
          console.error('Error saving to localStorage:', localError);
        }
        setSaveStatus('error');
      }
    } else {
      // Fallback LocalStorage
      try {
        localStorage.setItem('alenotes_data_v2', JSON.stringify(currentNotes));
        localStorage.setItem('alenotes_projects_v2', JSON.stringify(currentProjects));
        setSaveStatus('saved');
        console.log('Datos guardados en localStorage');
      } catch (error) {
        console.error('Error saving to localStorage:', error);
        setSaveStatus('error');
      }
    }
  }, [isLoading, deletedNoteIds, deletedProjectNames, supabase]);

  // Efecto para guardar automáticamente con debounce
  useEffect(() => {
    if (isLoading) return;
    
    // Limpiar timeout anterior
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // Crear nuevo timeout (reducido a 1 segundo para mejor responsividad)
    saveTimeoutRef.current = setTimeout(() => {
      // Pasar los datos directamente para asegurar que se usen los valores más recientes
      saveData(notes, projects).catch(error => {
        console.error('Error en saveData:', error);
        setSaveStatus('error');
      });
    }, 1000);
    
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [notes, projects, isLoading, saveData]);


  const [activeNoteId, setActiveNoteId] = useState(null);
  useEffect(() => { if (notes.length > 0 && !activeNoteId) setActiveNoteId(notes[0].id); }, [notes, activeNoteId]);

  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [selectedTags, setSelectedTags] = useState([]);
  const [editingProjectTags, setEditingProjectTags] = useState(null);
  const [newTagInput, setNewTagInput] = useState('');
  const [viewMode, setViewMode] = useState('notes');

  const activeNote = notes.find(n => n.id === activeNoteId);
  const getProjectColor = (projName) => { const proj = projects.find(p => p.name === projName); return proj ? proj.color : 'gray'; };
  const getProjectTags = (projName) => { const proj = projects.find(p => p.name === projName); return proj?.tags || []; };
  
  // Obtener todas las tags únicas de todos los proyectos
  const allTags = useMemo(() => {
    const tagSet = new Set();
    projects.forEach(proj => {
      if (proj.tags && Array.isArray(proj.tags)) {
        proj.tags.forEach(tag => tagSet.add(tag));
      }
    });
    return Array.from(tagSet).sort();
  }, [projects]);

  const filteredNotes = useMemo(() => {
    const filtered = notes.filter(n => {
      const matchesSearch = n.title?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'Todas' || n.category === selectedCategory;
      const noteProject = projects.find(p => p.name === n.category);
      const noteTags = noteProject?.tags || [];
      const matchesTags = selectedTags.length === 0 || selectedTags.some(tag => noteTags.includes(tag));
      return matchesSearch && matchesCategory && matchesTags;
    });
    // Ordenar: primero las fijadas, luego por fecha de actualización
    return filtered.sort((a, b) => {
      const aPinned = a.pinned ? 1 : 0;
      const bPinned = b.pinned ? 1 : 0;
      if (aPinned !== bPinned) return bPinned - aPinned;
      return new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0);
    });
  }, [notes, searchQuery, selectedCategory, selectedTags, projects]);

  // Handlers
  const createNote = () => {
    const newNote = { id: Date.now(), title: 'Nueva Nota', category: selectedCategory === 'Todas' ? 'General' : selectedCategory, updatedAt: new Date().toISOString(), blocks: [{ type: 'text', content: '' }], pinned: false };
    setNotes([newNote, ...notes]); setActiveNoteId(newNote.id); setViewMode('notes'); if (window.innerWidth < 768) setIsSidebarOpen(false);
  };
  
  const togglePinNote = useCallback((e, noteId) => {
    e.stopPropagation();
    setNotes(prev => {
      const updated = prev.map(n => n.id === noteId ? { ...n, pinned: !n.pinned } : n);
      notesRef.current = updated;
      return updated;
    });
  }, []);
  const addProject = () => { 
    if (newProjectName.trim()) { 
      const trimmed = newProjectName.trim(); 
      if (!projects.some(p => p.name === trimmed)) { 
        const randomColor = COLOR_KEYS[Math.floor(Math.random() * COLOR_KEYS.length)]; 
        setProjects([...projects, { name: trimmed, color: randomColor, tags: [] }]); 
        setSelectedCategory(trimmed); 
        setViewMode('notes'); 
      } 
      setNewProjectName(''); 
      setIsCreatingProject(false); 
    } 
  };
  
  const addTagToProject = useCallback((projName, tag) => {
    if (!tag.trim()) return;
    const trimmedTag = tag.trim().toLowerCase();
    setProjects(prev => {
      const updated = prev.map(p => {
        if (p.name === projName) {
          const currentTags = p.tags || [];
          if (!currentTags.includes(trimmedTag)) {
            return { ...p, tags: [...currentTags, trimmedTag] };
          }
        }
        return p;
      });
      projectsRef.current = updated;
      return updated;
    });
    setNewTagInput('');
  }, []);

  const removeTagFromProject = useCallback((projName, tagToRemove) => {
    setProjects(prev => {
      const updated = prev.map(p => {
        if (p.name === projName) {
          return { ...p, tags: (p.tags || []).filter(tag => tag !== tagToRemove) };
        }
        return p;
      });
      projectsRef.current = updated;
      return updated;
    });
  }, []);

  const toggleTagFilter = (tag) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };
  const cycleProjectColor = (e, projName) => { 
    e.stopPropagation(); 
    setProjects(prev => prev.map(p => { 
      if (p.name === projName) { 
        const nextIdx = (COLOR_KEYS.indexOf(p.color) + 1) % COLOR_KEYS.length; 
        return { ...p, color: COLOR_KEYS[nextIdx] }; 
      } 
      return p; 
    })); 
  };
  const deleteNote = async (e, id) => { 
    e.stopPropagation(); 
    const noteToDelete = notes.find(n => n.id === id);
    if (!noteToDelete) return;
    
    // Eliminar inmediatamente de la UI
    const newNotes = notes.filter(n => n.id !== id); 
    setNotes(newNotes); 
    
    // Si era la nota activa, cambiar a otra
    if (activeNoteId === id) {
      setActiveNoteId(newNotes[0]?.id || null);
    }
    
    // Si estamos usando Supabase, marcar para eliminación
    if (supabase) {
      setDeletedNoteIds(prev => [...prev, id]);
      // Eliminar inmediatamente de Supabase
      try {
        await supabase.from('notes').delete().eq('id', id);
      } catch (error) {
        console.error('Error deleting note:', error);
      }
    }
  };
  const updateNoteTitle = useCallback((val) => { 
    setNotes(prev => {
      const updated = prev.map(n => n.id === activeNoteId ? { ...n, title: val, updatedAt: new Date().toISOString() } : n);
      notesRef.current = updated;
      return updated;
    });
  }, [activeNoteId]);
  
  const updateNoteCategory = useCallback((val) => { 
    setNotes(prev => {
      const updated = prev.map(n => n.id === activeNoteId ? { ...n, category: val, updatedAt: new Date().toISOString() } : n);
      notesRef.current = updated;
      return updated;
    });
  }, [activeNoteId]);
  
  // Blocks helpers
  const updateBlocks = useCallback((newBlocks) => { 
    setNotes(prev => {
      const updated = prev.map(n => n.id === activeNoteId ? { ...n, blocks: newBlocks, updatedAt: new Date().toISOString() } : n);
      notesRef.current = updated;
      return updated;
    });
  }, [activeNoteId]);
  const addBlock = (type) => { 
     if (!activeNoteId) return; 
     let blk;
     if (type === 'table') blk = { type, data: [['', '', ''], ['', '', '']], headers: ['Col 1', 'Col 2', 'Col 3'] };
     else if (type === 'columns') blk = { type, left: '', right: '' };
     else if (type === 'kanban') blk = { type, columns: [{ id: 'todo', title: 'POR HACER', cards: [] }, { id: 'progress', title: 'EN CURSO', cards: [] }, { id: 'done', title: 'HECHO', cards: [] }] };
     else if (type === 'project') blk = { type, tasks: [{ id: Date.now(), text: '', date: '', assignee: '', done: false }] };
     else if (type === 'special_list') blk = { type, listType: 'books', items: [] };
     else if (type === 'image') blk = { type, src: null, caption: '' };
     else blk = { type, content: '' };
     setNotes(prev => {
       const note = prev.find(n => n.id === activeNoteId);
       if (!note) return prev;
       const updated = prev.map(n => n.id === activeNoteId ? { ...n, blocks: [...note.blocks, blk], updatedAt: new Date().toISOString() } : n);
       notesRef.current = updated;
       return updated;
     });
  };
  const updateBlock = useCallback((idx, data) => {
    setNotes(prev => {
      const note = prev.find(n => n.id === activeNoteId);
      if (!note) return prev;
      const bs = [...note.blocks];
      bs[idx] = { ...bs[idx], ...data };
      const updated = prev.map(n => n.id === activeNoteId ? { ...n, blocks: bs, updatedAt: new Date().toISOString() } : n);
      notesRef.current = updated;
      return updated;
    });
  }, [activeNoteId]);
  const deleteBlock = useCallback((idx) => {
    setNotes(prev => {
      const note = prev.find(n => n.id === activeNoteId);
      if (!note) return prev;
      const updated = prev.map(n => n.id === activeNoteId ? { ...n, blocks: note.blocks.filter((_, i) => i !== idx), updatedAt: new Date().toISOString() } : n);
      notesRef.current = updated;
      return updated;
    });
  }, [activeNoteId]);

  return (
    <div className="flex h-screen bg-gray-100 text-gray-800 font-sans overflow-hidden">
      {/* Indicador de estado de guardado */}
      <div className="fixed top-4 right-4 z-50 pointer-events-none">
         {saveStatus === 'saving' && <div className="bg-white/90 backdrop-blur shadow-sm px-3 py-1.5 rounded-full text-xs font-medium text-indigo-600 flex items-center border border-indigo-100 animate-pulse"><Loader2 size={12} className="animate-spin mr-2"/> Guardando...</div>}
         {saveStatus === 'error' && <div className="bg-red-100 px-3 py-1.5 rounded-full text-xs font-medium text-red-600 border border-red-200 animate-pulse">⚠️ Error al guardar</div>}
         {saveStatus === 'saved' && !isLoading && <div className="bg-green-100 px-3 py-1.5 rounded-full text-xs font-medium text-green-600 border border-green-200 opacity-100 transition-opacity duration-300">✓ Guardado</div>}
      </div>

      {isSidebarOpen && <div className="fixed inset-0 bg-black/20 z-20 md:hidden" onClick={() => setIsSidebarOpen(false)} />}
      <aside className={`fixed inset-y-0 left-0 z-30 w-72 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out flex flex-col ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0`}>
        <div className="p-5 border-b border-gray-100 flex items-center justify-between"><div className="flex items-center space-x-2 text-indigo-600"><Layout className="w-6 h-6" /><h1 className="font-bold text-xl tracking-tight">Ale Notes</h1></div><button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-gray-400"><X size={20} /></button></div>
        <div className="p-4"><Button onClick={createNote} icon={Plus} className="w-full shadow-indigo-200">Nueva Nota</Button></div>
        <div className="px-4 py-2 space-y-1">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-2">Biblioteca</div>
          <button onClick={() => { setViewMode('gallery'); if(window.innerWidth < 768) setIsSidebarOpen(false); }} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors text-sm font-medium ${viewMode === 'gallery' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'}`}><Grid size={18} className={viewMode === 'gallery' ? 'text-indigo-500' : 'text-gray-400'} /><span>Galería Global</span></button>
          <button onClick={() => { setSelectedCategory('Todas'); setViewMode('notes'); }} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors text-sm font-medium ${viewMode === 'notes' && selectedCategory === 'Todas' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'}`}><Layers size={18} className={viewMode === 'notes' && selectedCategory === 'Todas' ? 'text-indigo-500' : 'text-gray-400'} /><span>Todas las notas</span></button>
          <a href="https://ale.cosechacreativa.com.ar/" target="_blank" rel="noopener noreferrer" className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-indigo-600 group"><LinkIcon size={18} className="text-gray-400 group-hover:text-indigo-500" /><span>Herramientas</span><ExternalLink size={12} className="opacity-0 group-hover:opacity-100 ml-auto" /></a>
          <div className="flex items-center justify-between mt-6 mb-2 px-2"><div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Proyectos</div><button onClick={() => setIsCreatingProject(true)} className="text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded p-1 transition-colors"><Plus size={14} /></button></div>
          {isCreatingProject && (<div className="px-2 mb-2"><div className="flex items-center gap-2 bg-gray-50 p-1 rounded-lg border border-indigo-200"><input autoFocus type="text" placeholder="Nombre..." value={newProjectName} onChange={(e) => setNewProjectName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') addProject(); if (e.key === 'Escape') setIsCreatingProject(false); }} className="w-full bg-transparent text-sm px-2 focus:outline-none" /><button onClick={addProject} className="text-indigo-600 hover:bg-indigo-100 rounded p-1"><CheckSquare size={14} /></button></div></div>)}
          <div className="max-h-48 overflow-y-auto space-y-1">{projects.map(proj => { 
            const theme = COLOR_PALETTE[proj.color] || COLOR_PALETTE.gray; 
            const projTags = proj.tags || [];
            return (
              <div key={proj.name} className="group">
                <button onClick={() => { setSelectedCategory(proj.name); setViewMode('notes'); }} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors text-sm font-medium ${viewMode === 'notes' && selectedCategory === proj.name ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'}`}>
                  <div onClick={(e) => { e.stopPropagation(); cycleProjectColor(e, proj.name); }} className={`w-3 h-3 rounded-full flex-shrink-0 cursor-pointer hover:scale-125 transition-transform ${theme.dot}`}></div>
                  <span className="truncate flex-1 text-left">{proj.name}</span>
                  <button onClick={(e) => { e.stopPropagation(); setEditingProjectTags(editingProjectTags === proj.name ? null : proj.name); }} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-indigo-600 p-1 transition-opacity"><Tag size={14} /></button>
                </button>
                {editingProjectTags === proj.name && (
                  <div className="px-3 py-2 bg-gray-50 border-l-2 border-indigo-200 ml-3 mb-1 rounded-r">
                    <div className="flex flex-wrap gap-1 mb-2">
                      {projTags.map(tag => (
                        <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 bg-white text-xs rounded-full border border-gray-200">
                          {tag}
                          <button onClick={() => removeTagFromProject(proj.name, tag)} className="text-gray-400 hover:text-red-500"><X size={12} /></button>
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-1">
                      <input type="text" placeholder="Añadir etiqueta..." value={newTagInput} onChange={(e) => setNewTagInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { addTagToProject(proj.name, newTagInput); } }} className="flex-1 text-xs px-2 py-1 bg-white border border-gray-200 rounded focus:outline-none focus:border-indigo-300" />
                      <button onClick={() => addTagToProject(proj.name, newTagInput)} className="px-2 py-1 bg-indigo-100 text-indigo-600 rounded hover:bg-indigo-200 text-xs"><Plus size={12} /></button>
                    </div>
                  </div>
                )}
                {projTags.length > 0 && editingProjectTags !== proj.name && (
                  <div className="px-3 py-1 flex flex-wrap gap-1">
                    {projTags.slice(0, 2).map(tag => (
                      <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded truncate max-w-[60px]">{tag}</span>
                    ))}
                    {projTags.length > 2 && <span className="text-[10px] text-gray-400">+{projTags.length - 2}</span>}
                  </div>
                )}
              </div>
            );
          })}</div>
          {allTags.length > 0 && (
            <div className="px-4 pt-4 pb-2 border-t border-gray-100 mt-4">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Filtrar por etiquetas</div>
              <div className="flex flex-wrap gap-1">
                {allTags.map(tag => (
                  <button key={tag} onClick={() => toggleTagFilter(tag)} className={`px-2 py-1 text-xs rounded-full transition-colors ${selectedTags.includes(tag) ? 'bg-indigo-100 text-indigo-700 border border-indigo-300' : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'}`}>
                    {tag}
                  </button>
                ))}
                {selectedTags.length > 0 && (
                  <button onClick={() => setSelectedTags([])} className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-600 border border-red-200 hover:bg-red-200">
                    Limpiar
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
        {viewMode === 'notes' && (<><div className="px-4 pt-4 pb-2 border-t border-gray-100 mt-2"><div className="relative"><Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} /><input type="text" placeholder="Buscar..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition-all" /></div></div><div className="flex-1 overflow-y-auto px-2 space-y-1 py-2">{filteredNotes.length === 0 ? (<div className="text-center py-10 text-gray-400 text-sm">{searchQuery ? 'Sin resultados' : 'Vacío'}</div>) : (filteredNotes.map(note => (<div key={note.id} onClick={() => { setActiveNoteId(note.id); if(window.innerWidth < 768) setIsSidebarOpen(false); }} className={`group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all duration-200 border ${note.pinned ? 'border-yellow-200 bg-yellow-50/50' : 'border-transparent'} ${activeNoteId === note.id ? 'bg-indigo-50 border-indigo-100' : 'hover:bg-gray-50'}`}><div className="overflow-hidden flex-1 mr-2 flex items-start gap-2"><button onClick={(e) => togglePinNote(e, note.id)} className={`mt-0.5 flex-shrink-0 ${note.pinned ? 'text-yellow-500' : 'text-gray-300 hover:text-yellow-500'} transition-colors`}><Pin size={14} className={note.pinned ? '' : 'opacity-50'} /></button><div className="flex-1 min-w-0"><h3 className={`font-medium truncate flex items-center gap-2 ${activeNoteId === note.id ? 'text-indigo-900' : 'text-gray-700'}`}>{note.title || 'Sin título'}</h3><div className="flex items-center gap-2 mt-1"><NoteBadge colorKey={getProjectColor(note.category)}>{note.category}</NoteBadge><p className="text-xs text-gray-400 truncate">{new Date(note.updatedAt).toLocaleDateString()}</p></div></div></div><button onClick={(e) => deleteNote(e, note.id)} className={`p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors ${activeNoteId === note.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}><Trash2 size={14} /></button></div>)))}</div></>)}
      </aside>
      <main className="flex-1 flex flex-col h-full w-full bg-white md:bg-gray-50/50 relative overflow-hidden">
        <header className="md:hidden h-14 bg-white border-b border-gray-200 flex items-center px-4 justify-between sticky top-0 z-10 flex-shrink-0"><button onClick={() => setIsSidebarOpen(true)} className="text-gray-600"><Menu size={24} /></button><span className="font-semibold text-gray-700 truncate max-w-[200px]">{viewMode === 'gallery' ? 'Galería Global' : activeNote?.title}</span><div className="w-6"></div></header>
        {viewMode === 'gallery' ? (<GlobalGallery notes={notes} />) : activeNote ? (<div className="flex-1 overflow-y-auto"><div className="max-w-4xl mx-auto px-4 md:px-6 py-6 md:py-12 min-h-full bg-white shadow-sm md:my-6 md:rounded-xl border-gray-100 md:border pb-32"><div className="flex items-center gap-2 mb-4 overflow-hidden"><Tag size={14} className="text-gray-400 flex-shrink-0" /><div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">{projects.map(proj => (<Badge key={proj.name} colorKey={proj.color} active={activeNote.category === proj.name} onClick={() => updateNoteCategory(proj.name)}>{proj.name}</Badge>))}</div></div><input type="text" value={activeNote.title} onChange={(e) => updateNoteTitle(e.target.value)} placeholder="Título de la nota" className="w-full text-2xl md:text-4xl font-bold text-gray-900 placeholder-gray-300 border-none focus:outline-none bg-transparent mb-6 md:mb-8" /><div className="space-y-4">{activeNote.blocks.map((block, index) => (<div key={index} className="group relative pl-2 hover:pl-0 transition-all duration-200"><div className="absolute -left-8 top-2 opacity-0 group-hover:opacity-100 flex flex-col items-center space-y-1 transition-opacity z-10"><button onClick={() => deleteBlock(index)} className="p-1 text-gray-300 hover:text-red-500 transition-colors bg-white rounded-full shadow-sm border border-gray-100"><Trash2 size={14} /></button></div><div className="min-h-[2rem]">{block.type === 'text' && (<TextBlock content={block.content || ''} onChange={(val) => updateBlock(index, { content: val })} />)}{block.type === 'checklist' && (<div className="my-4 space-y-2">{block.items?.map((item, idx) => (<div key={item.id || idx} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 group"><input type="checkbox" checked={item.checked || false} onChange={(e) => { const newItems = [...(block.items || [])]; newItems[idx] = { ...newItems[idx], checked: e.target.checked }; updateBlock(index, { items: newItems }); }} className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500 border-gray-300" /><input type="text" value={item.text || ''} onChange={(e) => { const newItems = [...(block.items || [])]; newItems[idx] = { ...newItems[idx], text: e.target.value }; updateBlock(index, { items: newItems }); }} placeholder="Elemento de lista..." className={`flex-1 bg-transparent focus:outline-none text-base md:text-sm ${item.checked ? 'text-gray-400 line-through' : 'text-gray-700'}`} /><button onClick={() => { const newItems = block.items.filter((_, i) => i !== idx); updateBlock(index, { items: newItems.length > 0 ? newItems : [{ id: Date.now(), text: '', checked: false }] }); }} className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-opacity"><X size={16} /></button></div>))}<button onClick={() => { const newItems = [...(block.items || []), { id: Date.now(), text: '', checked: false }]; updateBlock(index, { items: newItems }); }} className="mt-2 text-sm text-gray-500 hover:text-indigo-600 flex items-center gap-2"><Plus size={16} /> Añadir elemento</button></div>)}{block.type === 'columns' && (<ColumnsBlock leftContent={block.left} rightContent={block.right} onLeftChange={(val) => updateBlock(index, { left: val })} onRightChange={(val) => updateBlock(index, { right: val })} />)}{block.type === 'table' && (<TableBlock data={block.data} headers={block.headers} onChange={(data, headers) => updateBlock(index, { data, headers })} />)}{block.type === 'kanban' && (<KanbanBlock columns={block.columns} onChange={(columns) => updateBlock(index, { columns })} />)}{block.type === 'project' && (<ProjectPlanBlock tasks={block.tasks} onChange={(tasks) => updateBlock(index, { tasks })} />)}{block.type === 'special_list' && (<SpecialListBlock listType={block.listType} items={block.items} onChange={(items) => updateBlock(index, { items })} onTypeChange={(listType) => updateBlock(index, { listType })} />)}{block.type === 'image' && (<ImageBlock src={block.src} caption={block.caption} onChange={(data) => updateBlock(index, data)} />)}</div></div>))}</div><div className="h-32 cursor-text" onClick={() => { const lastBlock = activeNote.blocks[activeNote.blocks.length - 1]; if (!lastBlock || lastBlock.type !== 'text' || lastBlock.content !== '') { addBlock('text'); } }}></div></div></div>) : (<div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8"><FileText size={64} className="mb-4 text-gray-200" /><p className="text-lg font-medium text-gray-500">Selecciona o crea una nota</p><Button onClick={createNote} variant="primary" className="mt-6">Crear primera nota</Button></div>)}
        {viewMode === 'notes' && activeNote && (<div className="fixed bottom-6 left-0 right-0 flex justify-center px-4 z-20 pointer-events-none"><div className="bg-white/95 backdrop-blur-md shadow-2xl border border-gray-200/50 rounded-full p-2 flex items-center space-x-1 sm:space-x-2 pointer-events-auto overflow-x-auto max-w-full scrollbar-hide"><button onClick={() => addBlock('text')} title="Texto" className="btn-icon flex-shrink-0 flex items-center space-x-2 px-3 py-3 rounded-full hover:bg-gray-100 text-gray-700 transition-colors"><Type size={20} className="text-indigo-500" /></button><div className="w-px h-6 bg-gray-200 flex-shrink-0"></div><button onClick={() => addBlock('checklist')} title="Checklist" className="btn-icon flex-shrink-0 flex items-center space-x-2 px-3 py-3 rounded-full hover:bg-gray-100 text-gray-700 transition-colors"><CheckSquare size={20} className="text-green-500" /></button><div className="w-px h-6 bg-gray-200 flex-shrink-0"></div><button onClick={() => addBlock('columns')} title="Columnas" className="btn-icon flex-shrink-0 flex items-center space-x-2 px-3 py-3 rounded-full hover:bg-gray-100 text-gray-700 transition-colors"><Columns size={20} className="text-emerald-500" /></button><div className="w-px h-6 bg-gray-200 flex-shrink-0"></div><button onClick={() => addBlock('table')} title="Tabla" className="btn-icon flex-shrink-0 flex items-center space-x-2 px-3 py-3 rounded-full hover:bg-gray-100 text-gray-700 transition-colors"><Table size={20} className="text-orange-500" /></button><div className="w-px h-6 bg-gray-200 flex-shrink-0"></div><button onClick={() => addBlock('kanban')} title="Tablero Kanban" className="btn-icon flex-shrink-0 flex items-center space-x-2 px-3 py-3 rounded-full hover:bg-gray-100 text-gray-700 transition-colors"><Trello size={20} className="text-blue-500" /></button><div className="w-px h-6 bg-gray-200 flex-shrink-0"></div><button onClick={() => addBlock('project')} title="Plan de Proyecto" className="btn-icon flex-shrink-0 flex items-center space-x-2 px-3 py-3 rounded-full hover:bg-gray-100 text-gray-700 transition-colors"><CheckSquare size={20} className="text-pink-500" /></button><div className="w-px h-6 bg-gray-200 flex-shrink-0"></div><button onClick={() => addBlock('special_list')} title="Checklist Especial" className="btn-icon flex-shrink-0 flex items-center space-x-2 px-3 py-3 rounded-full hover:bg-gray-100 text-gray-700 transition-colors"><ListTodo size={20} className="text-teal-500" /></button><div className="w-px h-6 bg-gray-200 flex-shrink-0"></div><button onClick={() => addBlock('image')} title="Imagen" className="btn-icon flex-shrink-0 flex items-center space-x-2 px-3 py-3 rounded-full hover:bg-gray-100 text-gray-700 transition-colors"><ImageIcon size={20} className="text-purple-500" /></button></div></div>)}
      </main>
    </div>
  );
}


