import { createClient } from '@supabase/supabase-js';

const MAX_CONTEXT_CHARS = 14000;

function stripHtml(s) {
  if (!s || typeof s !== 'string') return '';
  return s.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function sumMontos(items) {
  if (!Array.isArray(items)) return 0;
  return items.reduce((acc, it) => acc + (Number(it?.monto) || 0), 0);
}

function formatBilleteraRow(row) {
  if (!row) return 'Billetera: sin datos.';
  const lines = ['### Billetera'];
  const da = Array.isArray(row.dinero_actual) ? row.dinero_actual : [];
  const ac = Array.isArray(row.a_cobrar) ? row.a_cobrar : [];
  const gastos = Array.isArray(row.gastos) ? row.gastos : [];
  const deudas = Array.isArray(row.deudas) ? row.deudas : [];
  const deudores = Array.isArray(row.deudores) ? row.deudores : [];
  const meta = row.cantidades && typeof row.cantidades === 'object' ? row.cantidades.meta : null;

  lines.push(`- Dinero actual (suma): $${Math.round(sumMontos(da))} (${da.length} ítems)`);
  lines.push(`- A cobrar (suma): $${Math.round(sumMontos(ac))}`);
  if (meta != null && meta !== '') lines.push(`- Meta de ahorro: $${meta}`);
  if (gastos.length) {
    lines.push('- Gastos registrados:');
    const sorted = [...gastos].sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
    sorted.slice(0, 40).forEach((g) => {
      lines.push(`  · ${g.fecha || 's/f'} | ${g.categoria || '-'} | ${g.concepto || 'Sin concepto'} | $${Number(g.monto) || 0}`);
    });
    if (gastos.length > 40) lines.push(`  · … y ${gastos.length - 40} gastos más`);
    lines.push(`- Total gastos (suma): $${Math.round(sumMontos(gastos))}`);
  } else {
    lines.push('- Gastos: ninguno registrado');
  }
  if (deudas.length) {
    lines.push('- Deudas (debés):');
    deudas.slice(0, 25).forEach((d) => {
      lines.push(`  · ${d.acreedor || '?'} | ${d.concepto || ''} | $${Number(d.monto) || 0} | vence ${d.vencimiento || '-'}`);
    });
    lines.push(`- Total deudas: $${Math.round(sumMontos(deudas))}`);
  }
  if (deudores.length) {
    lines.push('- Deudores (te deben):');
    deudores.slice(0, 25).forEach((d) => {
      lines.push(`  · ${d.nombre || '?'} | ${d.concepto || ''} | $${Number(d.monto) || 0}`);
    });
    lines.push(`- Total que te deben: $${Math.round(sumMontos(deudores))}`);
  }
  return lines.join('\n');
}

function taskStats(stages) {
  let done = 0;
  let total = 0;
  (stages || []).forEach((s) => {
    (s.tasks || []).forEach((t) => {
      total++;
      if (t.done) done++;
    });
  });
  return { done, total };
}

function formatProjects(list) {
  if (!Array.isArray(list) || list.length === 0) return '### Proyectos\n- Ninguno.';
  const lines = ['### Proyectos'];
  list.forEach((p) => {
    const { done, total } = taskStats(p.stages);
    const objs = Array.isArray(p.objectives) ? p.objectives : [];
    const objDone = objs.filter((o) => o.done).length;
    lines.push(`- **${p.name}** (${p.color || 'gray'})`);
    if (p.description) lines.push(`  Descripción: ${String(p.description).slice(0, 400)}${String(p.description).length > 400 ? '…' : ''}`);
    if (objs.length) lines.push(`  Objetivos: ${objDone}/${objs.length} cumplidos`);
    objs.slice(0, 8).forEach((o) => lines.push(`    · [${o.done ? 'x' : ' '}] ${(o.text || '').slice(0, 120)}`));
    lines.push(`  Tareas: ${done}/${total} hechas en el tablero`);
  });
  return lines.join('\n');
}

function noteExcerpt(blocks) {
  if (!Array.isArray(blocks)) return '';
  const t = blocks.find((b) => b.type === 'text' && b.content);
  return stripHtml(t?.content || '').slice(0, 180);
}

function formatNotes(list) {
  if (!Array.isArray(list) || list.length === 0) return '### Notas\n- Ninguna.';
  const lines = ['### Notas (recientes)'];
  list.slice(0, 30).forEach((n) => {
    const tags = Array.isArray(n.tags) ? n.tags.join(', ') : '';
    const ex = noteExcerpt(n.blocks);
    lines.push(`- **${n.title || 'Sin título'}** [${n.category || 'General'}]${tags ? ` · tags: ${tags}` : ''}`);
    if (ex) lines.push(`  ${ex}${ex.length >= 180 ? '…' : ''}`);
  });
  return lines.join('\n');
}

const PASOS_SALUD_LABELS = {
  higado: 'Hígado',
  colesterol: 'Colesterol',
  corazon: 'Corazón',
  peso: 'Peso',
  dentadura: 'Dentadura',
  acne: 'Acné',
  vista: 'Vista',
  estres: 'Estrés',
};

function formatPasosSaludLine(r) {
  if (!r || typeof r !== 'object') return '';
  const p = r.pasosSalud;
  const parts = [];
  if (p && typeof p === 'object') {
    const done = Object.keys(PASOS_SALUD_LABELS)
      .filter((k) => p[k])
      .map((k) => PASOS_SALUD_LABELS[k]);
    if (done.length) parts.push(`pasos: ${done.join(', ')}`);
  }
  const otros = typeof r.pasosSaludOtros === 'string' ? r.pasosSaludOtros.trim() : '';
  if (otros) parts.push(`otros: ${otros.length > 120 ? `${otros.slice(0, 120)}…` : otros}`);
  return parts.length ? ` · ${parts.join(' · ')}` : '';
}

function formatSalud(row) {
  if (!row?.registros || typeof row.registros !== 'object') return '### Salud\n- Sin registros.';
  const entries = Object.entries(row.registros).sort(([a], [b]) => b.localeCompare(a));
  const lines = ['### Salud (últimos días con datos)'];
  entries.slice(0, 14).forEach(([fecha, r]) => {
    if (!r || typeof r !== 'object') return;
    const base = `- ${fecha}: peso ${r.peso ?? '-'} · agua ${r.vasosAgua ?? r.vasos_agua ?? '-'} · sueño ${r.horasSueno ?? r.horas_sueno ?? '-'}h · ánimo ${r.animo ?? '-'}`;
    lines.push(`${base}${formatPasosSaludLine(r)}`);
  });
  return lines.join('\n');
}

function formatMindMaps(list) {
  if (!Array.isArray(list) || list.length === 0) return '### Mapas mentales\n- Ninguno.';
  return `### Mapas mentales\n${list.map((m) => `- ${m.name || 'Sin título'}`).join('\n')}`;
}

const OP_STAGE_LABELS = {
  idea: 'Idea',
  contacto: 'Contacto',
  propuesta: 'Propuesta',
  negociacion: 'Negociación',
  ganada: 'Ganada',
  archivada: 'Archivo',
};

const OP_KIND_LABELS = {
  trabajo: 'Trabajo',
  negocio: 'Negocio',
  freelance: 'Freelance',
  otro: 'Idea/otro',
};

function formatOpportunityItems(items) {
  if (!Array.isArray(items) || items.length === 0) return '### Opportunity\n- Ninguna oportunidad registrada.';
  const lines = ['### Opportunity (oportunidades de trabajo y negocio)'];
  items.slice(0, 25).forEach((it) => {
    const title = it.title || 'Sin título';
    const kind = OP_KIND_LABELS[it.kind] || it.kind || '-';
    const stage = OP_STAGE_LABELS[it.stage] || it.stage || '-';
    const who = it.companyOrClient ? ` · ${it.companyOrClient}` : '';
    lines.push(`- **${title}** [${kind}] · etapa: ${stage}${who}`);
    const notes = typeof it.notes === 'string' ? it.notes.replace(/\s+/g, ' ').trim() : '';
    if (notes) lines.push(`  Notas: ${notes.slice(0, 200)}${notes.length > 200 ? '…' : ''}`);
    if (it.link) lines.push(`  Enlace: ${String(it.link).slice(0, 120)}`);
    if (it.valueHint) lines.push(`  Valor/condiciones: ${String(it.valueHint).slice(0, 120)}`);
    const actions = Array.isArray(it.nextActions) ? it.nextActions : [];
    actions.slice(0, 6).forEach((a) => {
      lines.push(`  · [${a.done ? 'x' : ' '}] ${(a.text || '').slice(0, 100)}`);
    });
  });
  if (items.length > 25) lines.push(`- … y ${items.length - 25} más`);
  return lines.join('\n');
}

const EMP_STATUS_LABELS = {
  operativa: 'Operativa',
  formacion: 'En formación',
  escala: 'Escalando',
  pausada: 'Pausada',
  venta: 'En venta / salida',
  cerrada: 'Cerrada',
};

function formatMisEmpresasItems(items) {
  if (!Array.isArray(items) || items.length === 0) return '### Mis empresas\n- Ninguna empresa registrada.';
  const lines = ['### Mis empresas (fichas ampliadas)'];
  items.slice(0, 15).forEach((e) => {
    const name = e.tradeName || e.legalName || 'Sin nombre';
    const legal = e.legalName && e.legalName !== e.tradeName ? ` · ${e.legalName}` : '';
    const st = EMP_STATUS_LABELS[e.status] || e.status || '-';
    lines.push(`- **${name}**${legal} · estado: ${st}`);
    if (e.industry) lines.push(`  Rubro: ${String(e.industry).slice(0, 80)}`);
    if (e.taxId) lines.push(`  ID fiscal: ${e.taxId}`);
    if (e.tagline) lines.push(`  Línea: ${String(e.tagline).slice(0, 120)}`);
    const notes = [e.notesGeneral, e.notesLegal, e.notesOps].filter(Boolean).join(' ');
    const n = notes.replace(/\s+/g, ' ').trim();
    if (n) lines.push(`  Notas (resumen): ${n.slice(0, 220)}${n.length > 220 ? '…' : ''}`);
    const objs = Array.isArray(e.objectives) ? e.objectives : [];
    const od = objs.filter((o) => o.done).length;
    if (objs.length) lines.push(`  Objetivos: ${od}/${objs.length}`);
    const na = Array.isArray(e.nextActions) ? e.nextActions : [];
    na.slice(0, 4).forEach((a) => lines.push(`  · [${a.done ? 'x' : ' '}] ${(a.text || '').slice(0, 90)}`));
  });
  if (items.length > 15) lines.push(`- … y ${items.length - 15} empresas más`);
  return lines.join('\n');
}

function fromLocalStorage() {
  const parts = [];
  try {
    const b = localStorage.getItem('alenotes_billetera');
    if (b) {
      const j = JSON.parse(b);
      const row = {
        dinero_actual: j.dineroActual,
        a_cobrar: j.aCobrar,
        gastos: j.gastos,
        deudas: j.deudas,
        deudores: j.deudores,
        cantidades: { meta: j.metaAhorro },
      };
      parts.push(formatBilleteraRow(row));
    }
  } catch (_) {}
  try {
    const p = localStorage.getItem('alenotes_projects_v2');
    if (p) parts.push(formatProjects(JSON.parse(p)));
  } catch (_) {}
  try {
    const n = localStorage.getItem('alenotes_data_v2');
    if (n) parts.push(formatNotes(JSON.parse(n)));
  } catch (_) {}
  try {
    const s = localStorage.getItem('alenotes_salud');
    if (s) {
      const reg = JSON.parse(s);
      const registros = reg && typeof reg === 'object' && !Array.isArray(reg) ? reg : {};
      parts.push(formatSalud({ registros }));
    }
  } catch (_) {}
  try {
    const m = localStorage.getItem('alenotes_mapa_mental');
    if (m) {
      const j = JSON.parse(m);
      const maps = Array.isArray(j.maps) ? j.maps.map((x) => ({ name: x.name })) : [];
      parts.push(formatMindMaps(maps));
    }
  } catch (_) {}
  try {
    const o = localStorage.getItem('alenotes_opportunity');
    if (o) {
      const j = JSON.parse(o);
      if (j?.items && Array.isArray(j.items)) parts.push(formatOpportunityItems(j.items));
    }
  } catch (_) {}
  try {
    const me = localStorage.getItem('alenotes_mis_empresas');
    if (me) {
      const j = JSON.parse(me);
      if (j?.items && Array.isArray(j.items)) parts.push(formatMisEmpresasItems(j.items));
    }
  } catch (_) {}
  return parts.filter(Boolean).join('\n\n');
}

/**
 * Construye un texto con los datos de Ale Notes para el asistente (Supabase o localStorage).
 */
export async function buildAssistantContext() {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

  if (!supabaseUrl || !supabaseKey) {
    const text = fromLocalStorage();
    return text.length > MAX_CONTEXT_CHARS ? `${text.slice(0, MAX_CONTEXT_CHARS)}\n\n[Contexto truncado por tamaño]` : text;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const parts = [];

  try {
    const { data: bil } = await supabase.from('billetera').select('*').eq('id', 'default').maybeSingle();
    if (bil) parts.push(formatBilleteraRow(bil));
  } catch (_) {}

  try {
    const { data: proj } = await supabase.from('projects').select('*');
    if (proj?.length) parts.push(formatProjects(proj));
  } catch (_) {}

  try {
    const { data: notes } = await supabase
      .from('notes')
      .select('id, title, category, tags, blocks, updated_at')
      .order('updated_at', { ascending: false })
      .limit(30);
    if (notes?.length) parts.push(formatNotes(notes));
  } catch (_) {}

  try {
    const { data: sal } = await supabase.from('salud').select('*').eq('id', 'default').maybeSingle();
    if (sal) parts.push(formatSalud(sal));
  } catch (_) {}

  try {
    const { data: maps } = await supabase.from('mind_maps').select('id, name').limit(20);
    if (maps?.length) parts.push(formatMindMaps(maps));
  } catch (_) {}

  try {
    const { data: opp } = await supabase.from('opportunity_data').select('items').eq('id', 'default').maybeSingle();
    if (opp?.items && Array.isArray(opp.items)) parts.push(formatOpportunityItems(opp.items));
  } catch (_) {}

  try {
    const { data: emp } = await supabase.from('mis_empresas_data').select('items').eq('id', 'default').maybeSingle();
    if (emp?.items && Array.isArray(emp.items)) parts.push(formatMisEmpresasItems(emp.items));
  } catch (_) {}

  let text = parts.filter(Boolean).join('\n\n');
  if (!text.trim()) {
    text = fromLocalStorage();
  }
  if (text.length > MAX_CONTEXT_CHARS) {
    text = `${text.slice(0, MAX_CONTEXT_CHARS)}\n\n[Contexto truncado por tamaño]`;
  }
  return text;
}
