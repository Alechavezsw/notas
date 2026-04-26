import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Sparkles, Send, X, Loader2, User, Bot, RotateCcw, Copy, Check } from 'lucide-react';
import { buildAssistantContext } from '../lib/assistantContext';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const ai = GEMINI_API_KEY ? new GoogleGenAI({ apiKey: GEMINI_API_KEY }) : null;
const GEMINI_API_PATH = '/api/gemini';
const HAS_SUPABASE = Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);

const SYSTEM_PROMPT = `Sos el asistente personal de Ale Chavez dentro de "Ale Notes". Conocé bien la app y orientalo con precisión.

## Datos del usuario
Cuando en el mismo mensaje de sistema recibas una sección **"Datos actuales de Ale"** (billetera, gastos, proyectos, notas recientes, salud, mapas, Opportunity, Mis empresas), usala como **única fuente factual** para montos, fechas, títulos y listas. No inventes cifras: si algo no figura ahí, decilo y sugerí dónde verlo en la app. Si esa sección no viene o está vacía, explicá cómo usar el módulo y que puede volver a preguntar después de guardar datos.

## Módulos de la app
- **Notas**: bloques (texto enriquecido, checklist, columnas, tabla, Kanban por nota, plan de proyecto, listas especiales, imágenes). Categorías por proyecto, etiquetas, búsqueda global, exportar .md, galería global de imágenes, tema claro/oscuro.
- **Proyectos** (/proyectos): tablero Kanban por proyecto con etapas y tareas (descripción larga, fecha límite, mover entre etapas), vista calendario, **descripción del proyecto**, **objetivos** con check y **progreso** (tareas + objetivos).
- **Calendario** (/calendario): todas las tareas con fecha de todos los proyectos.
- **Billetera** (/dinero): dinero actual y a cobrar, meta de ahorro, **tabla de gastos**, **deudas** (lo que debés) y **deudores** (quienes te deben), gráficos.
- **Salud** (/salud): pasos (hígado, colesterol, corazón, peso, dentadura, acné, vista, estrés, otros), peso, agua, sueño, ánimo y gráficos.
- **Mapa mental** (/mapa-mental): varios mapas y plantillas.
- **Opportunity** (/opportunity): oportunidades de trabajo y negocio (tipo, etapa, notas, enlace, valor estimado, próximos pasos con check).
- **Mis empresas** (/mis-empresas): fichas ampliadas por empresa (datos legales/fiscales, web, personas, enlaces, KPIs, notas por área general/legal/operaciones, objetivos y próximos pasos).

## Estilo
Respondé en **español** (Argentina si encaja natural). Sé claro, útil y amable; podés usar emojis con moderación. Si no sabés, decilo y orientá a la sección correcta.`;

function buildFullSystemForClient(contextSnapshot) {
  const snap = contextSnapshot && String(contextSnapshot).trim();
  if (!snap) return SYSTEM_PROMPT;
  return `${SYSTEM_PROMPT}\n\n## Datos actuales de Ale en Ale Notes (referencia factual; no inventes cifras fuera de esto)\n${snap}`.slice(0, 100000);
}

const MODEL = 'gemini-2.5-flash';

const SUGERENCIAS = [
  '¿Cómo organizo mejor mis notas?',
  'Ideas para usar Proyectos y el calendario',
  'Resumime qué puedo hacer en Billetera',
];

function formatMessageText(text) {
  if (!text) return '';
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  const withBold = escaped.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold text-gray-900 dark:text-white">$1</strong>');
  return withBold.split('\n').join('<br />');
}

export default function AsistenteAI() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  /** 'idle' | 'context' | 'thinking' */
  const [loadingPhase, setLoadingPhase] = useState('idle');
  const [error, setError] = useState(null);
  const [copiedIdx, setCopiedIdx] = useState(null);
  const listEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const nuevaConversacion = useCallback(() => {
    setMessages([]);
    setError(null);
    setInput('');
    inputRef.current?.focus();
  }, []);

  const copyMessage = useCallback((text, idx) => {
    navigator.clipboard?.writeText(text).then(() => {
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 2000);
    });
  }, []);

  const sendMessage = async (textOverride) => {
    const text = (textOverride ?? input).trim();
    if (!text) return;

    setInput('');
    setError(null);
    const userMessage = { role: 'user', text };
    setMessages((prev) => [...prev, userMessage]);
    setMessages((prev) => [...prev, { role: 'model', text: '' }]);
    setLoading(true);
    setLoadingPhase('context');

    const history = [...messages, userMessage];
    const historyPayload = history.map((m) => ({ role: m.role, text: m.text }));

    let contextSnapshot = '';
    try {
      contextSnapshot = await buildAssistantContext();
    } catch (ctxErr) {
      console.warn('buildAssistantContext:', ctxErr);
    }
    setLoadingPhase('thinking');

    const applyResponse = (fullText) => {
      setMessages((prev) => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (last.role === 'model') next[next.length - 1] = { ...last, text: fullText || 'No pude generar una respuesta. Probá de nuevo.' };
        return next;
      });
    };

    const setErrorResponse = (msg) => {
      setMessages((prev) => {
        const next = [...prev];
        if (next.length && next[next.length - 1].role === 'model' && next[next.length - 1].text === '') {
          next[next.length - 1] = { role: 'model', text: msg };
        } else {
          next.push({ role: 'model', text: msg });
        }
        return next;
      });
    };

    try {
      const proxyRes = await fetch(GEMINI_API_PATH, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: historyPayload,
          systemInstruction: SYSTEM_PROMPT,
          contextSnapshot,
        }),
      });

      const raw = await proxyRes.text();
      let data = {};
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        data = {};
      }

      if (proxyRes.ok && data.text != null) {
        applyResponse(String(data.text).trim());
        setError(null);
        setLoading(false);
        setLoadingPhase('idle');
        return;
      }

      if (!proxyRes.ok) {
        const apiErr = data.error || data.message || `Servidor (${proxyRes.status})`;
        if (proxyRes.status === 503) {
          setError(apiErr);
        } else {
          setError(apiErr);
        }
      }
    } catch (netErr) {
      setError(netErr?.message || 'Error de red');
    }

    if (ai) {
      try {
        const contents = history.map((m) => ({
          role: m.role === 'model' ? 'model' : 'user',
          parts: [{ text: m.text }],
        }));
        const res = await ai.models.generateContent({
          model: MODEL,
          config: { systemInstruction: buildFullSystemForClient(contextSnapshot), temperature: 0.7 },
          contents,
        });
        applyResponse((res?.text ?? '').trim());
        setError(null);
      } catch (err) {
        console.error('Gemini error:', err);
        const msg = err?.message || 'Revisá tu conexión o la API key.';
        setError(msg);
        setErrorResponse(`No pude conectar con Gemini: ${msg}`);
      }
    } else if (!GEMINI_API_KEY) {
      setErrorResponse(
        'No hay API key configurada. En **Vercel**: variable `GEMINI_API_KEY`. En local: `VITE_GEMINI_API_KEY` en `.env`.'
      );
    }
    setLoading(false);
    setLoadingPhase('idle');
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-500/40 hover:shadow-xl hover:scale-105 transition-all flex items-center justify-center"
        title="Asistente de Ale Notes"
        aria-label="Abrir asistente"
      >
        <Sparkles size={26} />
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Cerrar"
            className="fixed inset-0 z-[45] bg-black/35 dark:bg-black/55 backdrop-blur-[2px]"
            onClick={() => setOpen(false)}
          />
          <div className="fixed inset-0 z-[48] flex items-end justify-end p-4 pb-20 md:p-6 md:pb-24 pointer-events-none">
            <div className="pointer-events-auto w-full max-w-md h-[min(88vh,640px)] rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-2xl flex flex-col overflow-hidden ring-1 ring-black/5 dark:ring-white/10">
              <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-violet-500 to-purple-600 text-white shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                    <Bot size={20} />
                  </div>
                  <div className="min-w-0">
                    <h2 className="font-semibold truncate">Asistente IA</h2>
                    <p className="text-xs text-white/80 truncate">
                      Ale Notes · Gemini · {HAS_SUPABASE ? 'Contexto: nube + local' : 'Contexto: local'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    type="button"
                    onClick={nuevaConversacion}
                    className="p-2 rounded-lg hover:bg-white/20 transition-colors"
                    title="Nueva conversación"
                    aria-label="Nueva conversación"
                  >
                    <RotateCcw size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="p-2 rounded-lg hover:bg-white/20 transition-colors"
                    aria-label="Cerrar"
                  >
                    <X size={22} />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/80 dark:bg-gray-900/60 min-h-0">
                {messages.length === 0 && (
                  <div className="text-center py-4 text-gray-500 dark:text-gray-400 text-sm space-y-4">
                    <p className="font-medium text-gray-700 dark:text-gray-200 text-base">Hola, Ale 👋</p>
                    <p>Preguntame sobre la app, ideas de organización o lo que necesites.</p>
                    <div className="flex flex-col gap-2 text-left max-w-sm mx-auto">
                      {SUGERENCIAS.map((s) => (
                        <button
                          key={s}
                          type="button"
                          disabled={loading}
                          onClick={() => sendMessage(s)}
                          className="text-left px-3 py-2.5 rounded-xl text-xs bg-white dark:bg-gray-800 border border-violet-200 dark:border-violet-900/50 text-violet-800 dark:text-violet-200 hover:bg-violet-50 dark:hover:bg-violet-900/30 transition-colors disabled:opacity-50"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {messages.map((m, i) => (
                  <div
                    key={`${i}-${m.role}`}
                    className={`flex gap-2 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {m.role === 'model' && (
                      <div className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Bot size={16} className="text-violet-600 dark:text-violet-400" />
                      </div>
                    )}
                    <div
                      className={`max-w-[88%] rounded-2xl px-4 py-2.5 text-sm ${
                        m.role === 'user'
                          ? 'bg-violet-600 text-white'
                          : 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-600 shadow-sm'
                      }`}
                    >
                      {m.role === 'model' && m.text === '' && loading ? (
                        <span className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                          <Loader2 size={16} className="animate-spin" />
                          {loadingPhase === 'context' ? 'Leyendo tus datos…' : 'Pensando…'}
                        </span>
                      ) : m.role === 'model' ? (
                        <div className="space-y-2">
                          <div
                            className="text-sm leading-relaxed break-words [&_strong]:font-semibold [&_br]:block"
                            dangerouslySetInnerHTML={{ __html: formatMessageText(m.text) }}
                          />
                          {m.text && !loading && (
                            <button
                              type="button"
                              onClick={() => copyMessage(m.text, i)}
                              className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-violet-600 dark:hover:text-violet-400"
                            >
                              {copiedIdx === i ? <Check size={12} /> : <Copy size={12} />}
                              {copiedIdx === i ? 'Copiado' : 'Copiar'}
                            </button>
                          )}
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap break-words">{m.text}</p>
                      )}
                    </div>
                    {m.role === 'user' && (
                      <div className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-gray-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <User size={16} className="text-gray-600 dark:text-gray-300" />
                      </div>
                    )}
                  </div>
                ))}
                {error && messages.length === 0 && (
                  <p className="text-xs text-red-500 dark:text-red-400 px-2 text-center">{error}</p>
                )}
                <div ref={listEndRef} />
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  sendMessage();
                }}
                className="p-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shrink-0"
              >
                <div className="flex gap-2 items-end">
                  <textarea
                    ref={inputRef}
                    rows={2}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    placeholder="Escribí tu mensaje… (Shift+Enter para salto de línea)"
                    className="flex-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-400 dark:focus:ring-violet-500 text-sm resize-none max-h-32"
                    disabled={loading}
                  />
                  <button
                    type="submit"
                    disabled={loading || !input.trim()}
                    className="p-3 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-colors self-end"
                    title="Enviar"
                  >
                    {loading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}
    </>
  );
}
