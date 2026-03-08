import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Sparkles, Send, X, Loader2, User, Bot } from 'lucide-react';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const ai = GEMINI_API_KEY ? new GoogleGenAI({ apiKey: GEMINI_API_KEY }) : null;
const GEMINI_API_PATH = '/api/gemini';

const SYSTEM_PROMPT = `Sos el asistente personal de Ale Chavez dentro de su aplicación "Ale Notes". La app incluye:
- **Notas**: notas con bloques (texto, listas, tablas, columnas, imágenes, Kanban, mapas mentales por nota).
- **Galería global**: fotos de todas las notas.
- **Billetera**: dinero actual, a cobrar, categorías (Efectivo, Banco, etc.) y meta de ahorro.
- **Salud**: registro de peso, vasos de agua, horas de sueño y ánimo; con gráficos.
- **Proyectos**: proyectos con etapas tipo Kanban y tareas con fecha límite; vista calendario.
- **Mapa mental**: varios mapas con plantillas (lluvia de ideas, proyecto, estudio, etc.).

Ayudá a Ale con la app y con su día a día: ideas, organización, recordatorios, resúmenes. Respondé en español, de forma clara, atractiva e inteligente. Sé conciso pero útil. Si no sabés algo específico de la app, sugerí que lo revise en la sección correspondiente.`;

const MODEL = 'gemini-2.5-flash';

export default function AsistenteAI() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const listEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text) return;

    setInput('');
    setError(null);
    const userMessage = { role: 'user', text };
    setMessages((prev) => [...prev, userMessage]);
    setMessages((prev) => [...prev, { role: 'model', text: '' }]);
    setLoading(true);

    const history = [...messages, userMessage];
    const historyPayload = history.map((m) => ({ role: m.role, text: m.text }));

    const applyResponse = (fullText) => {
      setMessages((prev) => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (last.role === 'model') next[next.length - 1] = { ...last, text: fullText || 'No pude generar una respuesta. Probá de nuevo.' };
        return next;
      });
    };

    const setErrorResponse = (msg) => {
      setMessages((prev) => prev.slice(0, -1));
      setMessages((prev) => [...prev, { role: 'model', text: msg }]);
    };

    try {
      const proxyRes = await fetch(GEMINI_API_PATH, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: historyPayload, systemInstruction: SYSTEM_PROMPT }),
      });

      if (proxyRes.ok) {
        const data = await proxyRes.json();
        applyResponse((data?.text ?? '').trim());
        setLoading(false);
        return;
      }
    } catch (_) {}

    if (ai) {
      try {
        const contents = history.map((m) => ({
          role: m.role === 'model' ? 'model' : 'user',
          parts: [{ text: m.text }],
        }));
        const res = await ai.models.generateContent({
          model: MODEL,
          config: { systemInstruction: SYSTEM_PROMPT, temperature: 0.7 },
          contents,
        });
        applyResponse((res?.text ?? '').trim());
      } catch (err) {
        console.error('Gemini error:', err);
        setError(err?.message || 'Error al conectar.');
        setErrorResponse(`Error: ${err?.message || 'Revisá tu conexión o la API key.'}`);
      }
    } else {
      setErrorResponse('Configurá la API key: en Vercel (Settings > Environment Variables) agregá GEMINI_API_KEY, o en local agregá VITE_GEMINI_API_KEY en .env');
    }
    setLoading(false);
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
        <div className="fixed inset-0 z-50 flex items-end justify-end p-4 pb-20 md:p-6 md:pb-24 pointer-events-none">
          <div className="pointer-events-auto w-full max-w-md h-[min(85vh,600px)] rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-violet-500 to-purple-600 text-white">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                  <Bot size={20} />
                </div>
                <div>
                  <h2 className="font-semibold">Asistente</h2>
                  <p className="text-xs text-white/80">Ale Notes · Gemini</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-2 rounded-lg hover:bg-white/20 transition-colors"
                aria-label="Cerrar"
              >
                <X size={22} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50 dark:bg-gray-900/50">
              {messages.length === 0 && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
                  <p className="font-medium text-gray-700 dark:text-gray-300 mb-1">Hola, Ale 👋</p>
                  <p>Preguntame lo que quieras sobre la app, tu día o lo que necesites organizar.</p>
                </div>
              )}
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {m.role === 'model' && (
                    <div className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center flex-shrink-0">
                      <Bot size={16} className="text-violet-600 dark:text-violet-400" />
                    </div>
                  )}
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                      m.role === 'user'
                        ? 'bg-violet-600 text-white'
                        : 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-600'
                    }`}
                  >
                    {m.role === 'model' && m.text === '' && loading ? (
                      <span className="flex items-center gap-2 text-gray-500">
                        <Loader2 size={16} className="animate-spin" />
                        Pensando...
                      </span>
                    ) : (
                      <p className="whitespace-pre-wrap">{m.text || '...'}</p>
                    )}
                  </div>
                  {m.role === 'user' && (
                    <div className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-gray-600 flex items-center justify-center flex-shrink-0">
                      <User size={16} className="text-gray-600 dark:text-gray-300" />
                    </div>
                  )}
                </div>
              ))}
              {error && (
                <p className="text-xs text-red-500 dark:text-red-400 px-2">{error}</p>
              )}
              <div ref={listEndRef} />
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage();
              }}
              className="p-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
            >
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Escribí tu mensaje..."
                  className="flex-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-400 dark:focus:ring-violet-500 text-sm"
                  disabled={loading}
                />
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  className="p-3 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-colors"
                  title="Enviar"
                >
                  {loading ? (
                    <Loader2 size={20} className="animate-spin" />
                  ) : (
                    <Send size={20} />
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {open && (
        <button
          type="button"
          aria-label="Cerrar overlay"
          className="fixed inset-0 z-40 bg-black/30 dark:bg-black/50 pointer-events-auto"
          onClick={() => setOpen(false)}
        />
      )}
    </>
  );
}
