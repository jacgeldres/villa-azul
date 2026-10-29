/**
 * Villa Azul · Unidad (v5.0): checklist pre y post ruta, novedades de la unidad, documentos, mantenimiento e indicadores.
 * Integra el checklist de la Hiace T7V359 (v7.2, Google Sheets) a la base D1 de Villa Azul.
 *
 * Reglas que corrigen la v7.2:
 *  · La aptitud la calcula el servidor (el teléfono solo propone): falla en ítem crítico o documento obligatorio vencido = NO APTA.
 *  · La fecha y hora se guardan en hora de Lima; los filtros comparan textos AAAA-MM-DD (sin el desfase UTC que movía las semanas).
 *  · Un kilometraje imposible (menor al último o con un salto de miles de km) se marca y NO cuenta para el mantenimiento hasta que un administrador lo valide.
 *  · Las novedades se guardan como problemas con su historia: se abren con un reporte, pasan a reparación y se cierran solas cuando una inspección posterior marca el ítem conforme.
 *  · Enviar sin señal es seguro: cada inspección lleva su propio id y llegar dos veces no la duplica.
 */
import PLANTILLA from '../public/js/plantilla-checklist.json';

const ITEMS = {};
PLANTILLA.categorias.forEach(c => c.items.forEach(([k, n, p]) => { ITEMS[k] = { cat: c.id, categoria: c.nombre, nombre: n, prioridad: p }; }));
const CLAVES = Object.keys(ITEMS);
const TOTAL = CLAVES.length;

export const DOC_TIPOS = {
  soat: { nombre: 'SOAT', bloquea: true, vence: true },
  tarjeta_circulacion: { nombre: 'Tarjeta de circulación', bloquea: true, vence: true },
  revision_tecnica: { nombre: 'Revisión técnica', bloquea: true, vence: true },
  licencia: { nombre: 'Licencia de conducir', bloquea: true, vence: true },
  seguro: { nombre: 'Seguro vehicular', bloquea: false, vence: true },
  tarjeta_propiedad: { nombre: 'Tarjeta de propiedad', bloquea: false, vence: false },
  extintor: { nombre: 'Recarga del extintor', bloquea: false, vence: true },
  otro: { nombre: 'Otro documento', bloquea: false, vence: false },
};
const PARAM_DEF = { mant_intervalo_km: 5000, mant_alerta_km: 500, mant_intervalo_dias: 180, docs_aviso_dias: 30, chk_exige_salida: 1, chk_ventana_min: 60, chk_anticipacion_min: 30, nov_escalar: 1 };
/** Plazo para regularizar una novedad según la prioridad del ítem (días). Un administrador puede fijar otra fecha de compromiso. */
const PLAZO = { C: 2, A: 7, M: 15, B: 30 };

/* v7.2 → v5: los nombres de los ítems de la app anterior, en el mismo orden que las claves nuevas. Así el historial se importa con sus novedades. */
const NOMBRES_V7 = ['Nivel de aceite motor diésel','Nivel de refrigerante / anticongelante','Correa de accesorios – Sin grietas ni desgaste','Mangueras radiador – Sin fugas ni ablandamiento','Aceite de dirección hidráulica','Líquido limpiaparabrisas','Alertas en tablero (motor, DPF, AdBlue)',
  'Del. izquierdo – 75 PSI y cocada','Del. derecho – 75 PSI y cocada','Tras. izquierdo – 75 PSI y cocada','Tras. derecho – 75 PSI y cocada','Llanta de repuesto – 75 PSI','Juego de tuercas – Seguro de rin',
  'Nivel de líquido de frenos','Pedal de freno – Firmeza y recorrido correcto','Freno de mano / estacionamiento','Sin ruidos extraños al frenar','ABS – Sin luz de alerta en tablero','Pastillas de freno Del. izquierdo – Sin desgaste','Pastillas de freno Del. derecho – Sin desgaste','Pastillas de freno Tras. izquierdo – Sin desgaste','Pastillas de freno Tras. derecho – Sin desgaste',
  'Luces altas – Funcionamiento','Luces bajas – Funcionamiento','Luces de posición delantera y trasera','Luces direccionales (izq. y der.)','Luces de freno (brake lights)','Luces de marcha atrás','Luces de emergencia / flashers','Plumillas limpiaparabrisas','Bocina / Claxon','Alarma de retroceso – Activa','Batería – Sin corrosión en bornes',
  'Parrilla de techo – Soportes y anclajes firmes','Distribución uniforme del equipaje (máx. 150 kg)','Amarre con sogas / mallas – Sin piezas sueltas','Lona protectora bien extendida y ajustada','Sin objetos sobresalientes (riesgo de impacto)','Altura total del vehículo cargado verificada',
  '16 cinturones de seguridad – Operativos','Puertas corrediza y trasera – Cierre y seguros OK','Pasillos y piso – Libre de objetos peligrosos','Aire acondicionado – Frío funcional','Calefacción – Funcional (zona altoandina)','Asientos – Fijos, sin roturas, apoyacabezas OK','Espejos retrovisores – Limpios y ajustados','Parabrisas y lunetas – Sin rajaduras','Limpieza general de la cabina',
  'Extintor PQS 6 kg – Vigente y cargado','Botiquín de primeros auxilios – Completo y vigente','Triángulos o conos de seguridad (mín. 2)','Gata hidráulica – Operativa','Llave de ruedas (cruceta) y extensión','Linterna – Con pilas cargadas','Chaleco reflectivo del conductor','Cocodrilos (pinzas de arranque)','Slinga para remolque','Kit de herramientas básicas','Inflador portátil – Operativo','Arrancador portátil – Cargado',
  'Combustible suficiente para el recorrido','Carrocería – Sin daños que afecten seguridad','Ruta habilitada – Sin bloqueos ni derrumbes','Comunicación activa (celular cargado, señal OK)','Reporte del tiempo en zona altoandina','Freno motor / Jake brake – Funcional para descensos',
  'SOAT impreso – Vigente a bordo','Tarjeta de propiedad del vehículo','Seguro a todo riesgo – Documento impreso','Licencia de conducir vigente (A-IIb)','Revisión técnica impresa (vehículos +3 años)','Tarjeta de circulación – Vigente y a bordo',
  'Cámaras Dash – Operativas y grabando','Starlink – Conectado y con señal','Equipo de sonido – Funcional','Exploradoras – Funcionamiento correcto','Neblineros externos – Funcionamiento correcto'];
const normV7 = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const MAPA_V7 = {};
NOMBRES_V7.forEach((n, i) => { MAPA_V7[normV7(n)] = CLAVES[i]; });

/* Lo que ya estaba cargado en la v7.2 (hoja Config y Mantenimientos del Excel): se siembra solo al actualizar, sin duplicar. */
const SEMILLA_V7 = {
  docs: [
    { id: 'v7-doc-soat', tipo: 'soat', numero: '594838248', entidad: 'Pacífico - Interseguro', emision: '2026-03-23', vencimiento: '2027-03-23', notas: 'Electrónico · importado de la app v7.2', datos: {} },
    { id: 'v7-doc-rt', tipo: 'revision_tecnica', numero: null, entidad: null, emision: null, vencimiento: null, notas: 'Según la app v7.2 no es exigible hasta 2028 (unidad 2025). Verifica la fecha exacta con el MTC y corrígela si cambia.', datos: { exigible_desde: '2028-01-01' } },
    { id: 'v7-doc-tc', tipo: 'tarjeta_circulacion', numero: '001-004464', entidad: 'EMPRESA DE TRANSPORTE JIMAR S.A.C.', emision: '2025-04-15', vencimiento: '2029-01-08', notas: 'Importado de la app v7.2', datos: { cert_hv: '130004897', partida: 'TEAC-043' } },
  ],
  mant: [
    { id: 'v7-mant-1783209091018', fecha: '2026-04-14', km: 105000, taller: 'AUTONORT TRUJILLO S.A.C.', responsable: 'Jorge Luis Sánchez Arenas', detalle: 'Mantenimiento preventivo' },
    { id: 'v7-mant-1783296317504', fecha: '2026-07-05', km: 110394, taller: 'José Paul Sánchez Arenas', responsable: 'Jorge Luis Sánchez Arenas', detalle: 'Mantenimiento preventivo' },
    { id: 'v7-mant-1787179557439', fecha: '2026-08-11', km: 115957, taller: 'José Paul Sánchez Arenas', responsable: 'Jorge Luis Sánchez Arenas', detalle: 'Cambio de aceite, filtro de aceite, filtro de cabina, filtro de aire, filtro de combustible' },
  ],
};

export const SQL_FLOTA_V11 = [
  `CREATE TABLE IF NOT EXISTS chk_inspecciones (id TEXT PRIMARY KEY, placa TEXT, tipo TEXT, fecha TEXT, inicio TEXT, duracion_seg INTEGER, lugar TEXT, km INTEGER, km_alerta TEXT,
     motivo TEXT, excursion_id TEXT, ref_pre TEXT, operador_id TEXT, operador TEXT, plantilla INTEGER, total INTEGER, conformes INTEGER, observaciones INTEGER, fallas INTEGER,
     criticas INTEGER, aptitud TEXT, razones TEXT, hallazgos TEXT, items TEXT, fotos TEXT, estado TEXT NOT NULL DEFAULT 'activa', revisado_por TEXT, revisado_en TEXT,
     anulado_por TEXT, anulado_en TEXT, motivo_anulacion TEXT, recibido_en TEXT, seq INTEGER NOT NULL DEFAULT 0)`,
  'CREATE INDEX IF NOT EXISTS ix_chk_fecha ON chk_inspecciones(placa, fecha)',
  'CREATE INDEX IF NOT EXISTS ix_chk_exc ON chk_inspecciones(excursion_id)',
  `CREATE TABLE IF NOT EXISTS chk_novedades (id TEXT PRIMARY KEY, placa TEXT, item TEXT, categoria TEXT, nombre TEXT, prioridad TEXT, severidad TEXT, estado TEXT NOT NULL DEFAULT 'abierta',
     abierta_en TEXT, ultima_en TEXT, veces INTEGER NOT NULL DEFAULT 1, ultima_nota TEXT, ultima_insp TEXT, foto_id TEXT, reincide_de TEXT,
     taller_nota TEXT, taller_por TEXT, taller_en TEXT, resuelta_en TEXT, resuelta_por TEXT, resuelta_como TEXT, resuelta_nota TEXT, seq INTEGER NOT NULL DEFAULT 0)`,
  'CREATE INDEX IF NOT EXISTS ix_nov_item ON chk_novedades(placa, item, estado)',
  `CREATE TABLE IF NOT EXISTS flota_docs (id TEXT PRIMARY KEY, placa TEXT, tipo TEXT, titulo TEXT, numero TEXT, entidad TEXT, emision TEXT, vencimiento TEXT, datos TEXT,
     foto_id TEXT, foto_mime TEXT, notas TEXT, vigente INTEGER NOT NULL DEFAULT 1, anulado INTEGER NOT NULL DEFAULT 0, creado_por TEXT, creado_en TEXT, actualizado_por TEXT, actualizado_en TEXT, seq INTEGER NOT NULL DEFAULT 0)`,
  'CREATE INDEX IF NOT EXISTS ix_docs ON flota_docs(placa, tipo, vigente)',
  `CREATE TABLE IF NOT EXISTS flota_mant (id TEXT PRIMARY KEY, placa TEXT, fecha TEXT, km INTEGER, tipo TEXT, taller TEXT, detalle TEXT, costo REAL, responsable TEXT, foto_id TEXT,
     novedades TEXT, anulado INTEGER NOT NULL DEFAULT 0, motivo_anulacion TEXT, creado_por TEXT, creado_en TEXT, seq INTEGER NOT NULL DEFAULT 0)`,
  'CREATE INDEX IF NOT EXISTS ix_mant ON flota_mant(placa, km)',
];
/** v5.1: checklist solo de salida (con hora prevista y si se hizo a tiempo), plazos para regularizar novedades e historial de la v7.2. */
export const SQL_FLOTA_V12 = [
  'ALTER TABLE chk_inspecciones ADD COLUMN salida_prevista TEXT', 'ALTER TABLE chk_inspecciones ADD COLUMN min_antes INTEGER',
  'ALTER TABLE chk_inspecciones ADD COLUMN a_tiempo INTEGER', 'ALTER TABLE chk_inspecciones ADD COLUMN origen TEXT', 'ALTER TABLE chk_inspecciones ADD COLUMN salida_real TEXT',
  'ALTER TABLE chk_novedades ADD COLUMN compromiso TEXT', 'ALTER TABLE chk_novedades ADD COLUMN compromiso_por TEXT',
];

export function crearFlota(h) {
  const { ErrorApi, ahoraLima, reservarSeq, auditar, exigirMando, esMando, prepararFoto, avisar } = h;
  const RE_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const RE_FH = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/;
  const RE_F = /^\d{4}-\d{2}-\d{2}$/;
  const texto = (v, n) => String(v ?? '').trim().replace(/\s+/g, ' ').slice(0, n);
  const ent = (v) => Math.round(Number(String(v ?? '').replace(/[^0-9.]/g, '')) || 0);
  const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
  const seg = (f) => (f && f.length === 16 ? f + ':00' : f);
  const msLima = (s) => Date.parse(String(s).replace(' ', 'T').slice(0, 19) + '-05:00');
  const ymdUTC = (s) => { const [y, m, d] = String(s).slice(0, 10).split('-').map(Number); return Date.UTC(y, m - 1, d); };
  const diasEntre = (a, b) => Math.round((ymdUTC(b) - ymdUTC(a)) / 864e5);   // b − a en días
  const sumarDias = (ymd, n) => new Date(ymdUTC(ymd) + n * 864e5).toISOString().slice(0, 10);
  const hoy = () => ahoraLima().slice(0, 10);
  const json = (s, def) => { try { return s ? JSON.parse(s) : def; } catch (e) { return def; } };
  const TIPO_TXT = { pre: 'Checklist de salida', post: 'Llegada (v7.2)' };

  async function parametros(env) {
    const filas = (await env.DB.prepare("SELECT clave, valor FROM config WHERE clave IN ('flota_placa','mant_intervalo_km','mant_alerta_km','mant_intervalo_dias','docs_aviso_dias','chk_exige_salida','chk_ventana_min','chk_anticipacion_min','nov_escalar')").all()).results;
    const p = { ...PARAM_DEF };
    filas.forEach(f => { if (f.clave === 'flota_placa') p.placa = f.valor; else if (f.valor !== null && f.valor !== '') p[f.clave] = Number(f.valor); });
    if (!p.placa) { const u = await env.DB.prepare('SELECT placa FROM unidades WHERE activo = 1 ORDER BY placa LIMIT 1').first().catch(() => null); p.placa = (u && u.placa) || 'T7V359'; }
    return p;
  }
  async function unidad(env, placa) {
    const u = await env.DB.prepare('SELECT placa, marca_modelo, anio, capacidad FROM unidades WHERE placa = ?').bind(placa).first().catch(() => null);
    return u || { placa, marca_modelo: 'Toyota Hiace', anio: 2025, capacidad: 15 };
  }

  /** Odómetro: la lectura más alta CONFIABLE de checklists, mantenimientos y excursiones. Un salto sin validar no cuenta. */
  async function odometro(env, placa, excepto, antes) {
    // «antes»: solo lecturas anteriores a esa fecha (para validar una inspección que llega tarde o del historial).
    const tope = antes || '9999';
    const r = await env.DB.prepare(`SELECT k, f FROM (
        SELECT km k, fecha f FROM chk_inspecciones WHERE placa = ? AND estado = 'activa' AND COALESCE(km_alerta,'') IN ('','menor') AND id <> ?
        UNION ALL SELECT km, fecha FROM flota_mant WHERE placa = ? AND anulado = 0
        UNION ALL SELECT MAX(COALESCE(km_inicio,0), COALESCE(km_fin,0)), replace(COALESCE(NULLIF(retorno,''), salida),'T',' ') FROM excursiones WHERE COALESCE(km_inicio,0) > 0 OR COALESCE(km_fin,0) > 0)
      WHERE f < ? ORDER BY k DESC LIMIT 1`).bind(placa, excepto || '', placa, tope).first();
    const u = await env.DB.prepare("SELECT km, fecha, tipo FROM chk_inspecciones WHERE placa = ? AND estado = 'activa' AND COALESCE(km_alerta,'') IN ('','menor') ORDER BY fecha DESC LIMIT 1").bind(placa).first();
    return { km: Number(r && r.k) || 0, fecha_ref: r ? String(r.f || '').slice(0, 10) : null, ultima_lectura: u ? { km: u.km, fecha: u.fecha, tipo: u.tipo } : null };
  }

  function estadoDoc(d, p, ref) {
    const t = DOC_TIPOS[d.tipo] || DOC_TIPOS.otro;
    const dat = typeof d.datos === 'string' ? json(d.datos, {}) : (d.datos || {});
    if (dat.exigible_desde && (ref || hoy()) < dat.exigible_desde) return { estado: 'no_aplica', dias: diasEntre(ref || hoy(), dat.exigible_desde), desde: dat.exigible_desde };
    if (!d.vencimiento) return { estado: t.vence ? 'sin_fecha' : 'permanente', dias: null };
    const dias = diasEntre(ref || hoy(), d.vencimiento);
    return { estado: dias < 0 ? 'vencido' : dias <= p.docs_aviso_dias ? 'por_vencer' : 'vigente', dias };
  }
  async function documentos(env, placa, p) {
    const filas = (await env.DB.prepare('SELECT * FROM flota_docs WHERE placa = ? AND vigente = 1 AND anulado = 0 ORDER BY tipo, vencimiento').bind(placa).all()).results;
    const docs = filas.map(d => {
      const t = DOC_TIPOS[d.tipo] || DOC_TIPOS.otro, e = estadoDoc(d, p);
      let total = null, usado = null;
      if (d.emision && d.vencimiento) { total = Math.max(1, diasEntre(d.emision, d.vencimiento)); usado = Math.min(100, Math.max(0, Math.round(diasEntre(d.emision, hoy()) / total * 100))); }
      return { id: d.id, tipo: d.tipo, nombre: d.tipo === 'otro' && d.titulo ? d.titulo : t.nombre, numero: d.numero, entidad: d.entidad, emision: d.emision, vencimiento: d.vencimiento,
        datos: json(d.datos, {}), notas: d.notas, foto_id: d.foto_id, foto_mime: d.foto_mime, actualizado_en: d.actualizado_en || d.creado_en, actualizado_por: d.actualizado_por || d.creado_por,
        estado: e.estado, dias: e.dias, exigible_desde: e.desde || null, bloquea: t.bloquea && e.estado !== 'no_aplica', vigencia_pct: e.estado === 'no_aplica' ? null : usado, vigencia_total: total };
    });
    const tiene = new Set(docs.map(d => d.tipo));
    const faltan = Object.keys(DOC_TIPOS).filter(k => k !== 'otro' && !tiene.has(k)).map(k => ({ tipo: k, nombre: DOC_TIPOS[k].nombre, bloquea: DOC_TIPOS[k].bloquea }));
    return { docs, faltan };
  }

  function estadoMant(ult, km, p) {
    if (!ult) return null;
    const prox = ult.km + p.mant_intervalo_km, ref = Math.max(km || 0, ult.km);
    const rec = ref - ult.km, rest = prox - ref, pct = Math.min(100, Math.max(0, Math.round(rec / p.mant_intervalo_km * 100)));
    const fechaLimite = sumarDias(ult.fecha.slice(0, 10), p.mant_intervalo_dias), diasRest = diasEntre(hoy(), fechaLimite);
    const pctT = Math.min(100, Math.max(0, Math.round((p.mant_intervalo_dias - diasRest) / p.mant_intervalo_dias * 100)));
    let estado = 'ok';
    if (ref >= prox || diasRest < 0) estado = 'vencido';
    else if (rest <= p.mant_alerta_km || diasRest <= 15) estado = 'proximo';
    else if (Math.max(pct, pctT) >= 70) estado = 'atencion';
    return { ultimo: ult, proximo_km: prox, km_ref: ref, recorridos: rec, restantes: rest, pct, fecha_limite: fechaLimite, dias_restantes: diasRest, pct_tiempo: pctT, estado,
      motivo: ref >= prox ? 'km' : diasRest < 0 ? 'tiempo' : (rest <= p.mant_alerta_km ? 'km' : diasRest <= 15 ? 'tiempo' : '') };
  }
  async function mantenimiento(env, placa, p, km, conCosto) {
    const hist = (await env.DB.prepare('SELECT * FROM flota_mant WHERE placa = ? AND anulado = 0 ORDER BY km DESC, fecha DESC LIMIT 12').bind(placa).all()).results
      .map(m => ({ id: m.id, fecha: m.fecha, km: m.km, tipo: m.tipo, taller: m.taller, detalle: m.detalle, responsable: m.responsable, foto_id: m.foto_id, costo: conCosto ? m.costo : undefined, creado_por: m.creado_por }));
    const prev = hist.filter(m => m.tipo !== 'correctivo')[0] || null;   // el intervalo lo marca el último preventivo
    return { estado: estadoMant(prev, km, p), historial: hist, intervalo_km: p.mant_intervalo_km, alerta_km: p.mant_alerta_km, intervalo_dias: p.mant_intervalo_dias };
  }

  const resumenInsp = (x) => ({ id: x.id, tipo: x.tipo, fecha: x.fecha, lugar: x.lugar, km: x.km, km_alerta: x.km_alerta || '', operador: x.operador, operador_id: x.operador_id, aptitud: x.aptitud,
    conformes: x.conformes, observaciones: x.observaciones, fallas: x.fallas, criticas: x.criticas, total: x.total, duracion_seg: x.duracion_seg, motivo: x.motivo, excursion_id: x.excursion_id,
    ref_pre: x.ref_pre, razones: json(x.razones, []), revisado_por: x.revisado_por, revisado_en: x.revisado_en, estado: x.estado, hallazgos: x.hallazgos || '', titulo_exc: x.titulo_exc,
    salida_prevista: x.salida_prevista || null, min_antes: x.min_antes, a_tiempo: x.a_tiempo, origen: x.origen || 'app' });

  /** Plazo para regularizar: compromiso fijado por un administrador o, si no, el plazo según la prioridad. */
  function plazoNov(n, p) {
    const plazo = n.compromiso || sumarDias(String(n.abierta_en).slice(0, 10), PLAZO[n.prioridad] || 15);
    const dias = diasEntre(hoy(), plazo), atrasada = n.estado !== 'resuelta' && dias < 0;
    // Una observación en un ítem CRÍTICO que pasa su plazo sin regularizar se trata como falla crítica: la unidad deja de estar apta.
    const escalada = atrasada && n.prioridad === 'C' && n.severidad === 'o' && (!p || p.nov_escalar);
    return { plazo, dias_plazo: dias, atrasada, escalada };
  }
  /** Hora de salida de una excursión y desde cuándo vale el checklist (la hora previa). Sin hora registrada no hay ventana. */
  function ventanaSalida(salida, p) {
    const t = String(salida || '').replace('T', ' ');
    if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(t)) return null;
    const ms = msLima(t.slice(0, 16));
    return { salida: t.slice(0, 16), abre: ahoraLima(new Date(ms - p.chk_ventana_min * 60000)).slice(0, 16), min: Math.round((ms - Date.now()) / 60000) };
  }
  async function novedadesAbiertas(env, placa, p) {
    return (await env.DB.prepare(`SELECT * FROM chk_novedades WHERE placa = ? AND estado <> 'resuelta'
      ORDER BY CASE WHEN severidad='f' AND prioridad='C' THEN 0 WHEN severidad='f' THEN 1 ELSE 2 END, abierta_en`).bind(placa).all()).results
      .map(n => ({ ...n, ...plazoNov(n, p), dias_abierta: diasEntre(n.abierta_en, hoy()) }));
  }
  function nivelNov(n) { return n.severidad === 'f' ? (n.prioridad === 'C' ? 'critica' : 'falla') : n.escalada ? 'critica' : 'obs'; }

  /* ═════════════ Estado de la unidad: lo que todos ven al entrar ═════════════ */
  async function estado(env, yo) {
    const p = await parametros(env), placa = p.placa, mando = esMando(yo);
    const [u, odo, docs, nov] = await Promise.all([unidad(env, placa), odometro(env, placa), documentos(env, placa, p), novedadesAbiertas(env, placa, p)]);
    const mant = await mantenimiento(env, placa, p, odo.km, mando);
    const insp = (await env.DB.prepare(`SELECT i.*, e.titulo titulo_exc FROM chk_inspecciones i LEFT JOIN excursiones e ON e.id = i.excursion_id
      WHERE i.placa = ? AND i.estado = 'activa' ${mando ? '' : 'AND i.operador_id = ?'} ORDER BY i.fecha DESC LIMIT 12`).bind(...(mando ? [placa] : [placa, yo.id])).all()).results.map(resumenInsp);
    const ultima = await env.DB.prepare("SELECT * FROM chk_inspecciones WHERE placa = ? AND estado = 'activa' ORDER BY fecha DESC LIMIT 1").bind(placa).first();
    const h0 = hoy();
    const hoyR = (await env.DB.prepare("SELECT tipo, aptitud, fecha FROM chk_inspecciones WHERE placa = ? AND estado='activa' AND tipo='pre' AND substr(fecha,1,10) = ? ORDER BY fecha").bind(placa, h0).all()).results;
    // Viajes que salen pronto (o están en ruta): para enlazar el checklist y para avisar si falta.
    const desde = ahoraLima(new Date(Date.now() - 24 * 3600e3)).slice(0, 16), hasta = ahoraLima(new Date(Date.now() + 72 * 3600e3)).slice(0, 16);
    const viajes = (await env.DB.prepare(`SELECT id, codigo, titulo, origen, destino, salida, retorno, estado, km_inicio, km_fin FROM excursiones
      WHERE estado IN ('borrador','abierta','cerrada','en_ruta') AND ((replace(salida,'T',' ') BETWEEN ? AND ?) OR estado = 'en_ruta') ORDER BY salida LIMIT 8`).bind(desde, hasta).all()).results;
    if (viajes.length) {
      const c = (await env.DB.prepare(`SELECT excursion_id, id, tipo, aptitud, fecha, a_tiempo FROM chk_inspecciones WHERE estado='activa' AND tipo='pre' AND excursion_id IN (${viajes.map(() => '?').join(',')}) ORDER BY fecha`).bind(...viajes.map(v => v.id)).all()).results;
      viajes.forEach(v => { v.pre = c.filter(x => x.excursion_id === v.id).pop() || null; const sv = ventanaSalida(v.salida, p); v.salida_hora = sv ? sv.salida : null; v.checklist_desde = sv ? sv.abre : null; v.min_para_salir = sv ? sv.min : null; });
    }
    // Veredicto actual: documentos obligatorios + problemas abiertos (no solo el último reporte).
    const docVenc = docs.docs.filter(d => d.estado === 'vencido' && d.bloquea);
    const crit = nov.filter(n => nivelNov(n) === 'critica'), fall = nov.filter(n => n.severidad === 'f'), obs = nov.filter(n => n.severidad === 'o');
    const veredicto = !ultima && !docs.docs.length ? 'sin_datos' : (docVenc.length || crit.length) ? 'no' : fall.length ? 'fallas' : obs.length ? 'obs' : 'apto';
    const zonas = {};
    PLANTILLA.categorias.forEach(c => { zonas[c.id] = 'ok'; });
    const peso = { ok: 0, obs: 1, falla: 2, critica: 3 };
    nov.forEach(n => { const cat = (ITEMS[n.item] || {}).cat; const nv = nivelNov(n); if (cat && peso[nv] > peso[zonas[cat]]) zonas[cat] = nv; });
    if (docVenc.length) zonas.doc = 'critica'; else if (docs.docs.some(d => d.estado === 'vencido' || d.estado === 'por_vencer') && peso[zonas.doc] < 1) zonas.doc = 'obs';

    const alertas = [];
    docs.docs.forEach(d => {
      if (d.estado === 'vencido') alertas.push({ nivel: d.bloquea ? 'bad' : 'warn', titulo: `${d.nombre} vencido`, detalle: `Venció hace ${-d.dias} día${d.dias === -1 ? '' : 's'}${d.bloquea ? ': la unidad no debe salir hasta renovarlo.' : '.'}`, ir: 'documentos' });
      else if (d.estado === 'por_vencer') alertas.push({ nivel: d.dias <= 7 ? 'bad' : 'warn', titulo: `${d.nombre} vence ${d.dias === 0 ? 'hoy' : d.dias === 1 ? 'mañana' : 'en ' + d.dias + ' días'}`, detalle: 'Programa la renovación.', ir: 'documentos' });
    });
    if (mant.estado) {
      const m = mant.estado;
      if (m.estado === 'vencido') alertas.push({ nivel: 'bad', titulo: 'Mantenimiento vencido', detalle: m.motivo === 'tiempo' ? `Pasó la fecha límite (${m.fecha_limite}).` : `Excedido en ${(-m.restantes).toLocaleString('es-PE')} km.`, ir: 'mantenimiento' });
      else if (m.estado === 'proximo') alertas.push({ nivel: 'warn', titulo: 'Mantenimiento próximo', detalle: m.motivo === 'tiempo' ? `Fecha límite: ${m.fecha_limite} (${m.dias_restantes} días).` : `Faltan ${m.restantes.toLocaleString('es-PE')} km (a los ${m.proximo_km.toLocaleString('es-PE')} km).`, ir: 'mantenimiento' });
    } else if (mando) alertas.push({ nivel: 'info', titulo: 'Sin mantenimientos registrados', detalle: 'Registra el último servicio para controlar el próximo.', ir: 'mantenimiento' });
    crit.forEach(n => alertas.push({ nivel: 'bad', titulo: (n.escalada ? 'Sin regularizar: ' : 'Falla crítica: ') + n.nombre,
      detalle: n.escalada ? `Observación en ítem crítico desde el ${n.abierta_en.slice(0, 10)}; el plazo venció hace ${-n.dias_plazo} día${n.dias_plazo === -1 ? '' : 's'}. La unidad no está apta hasta regularizarla o fijar un compromiso.`
        : `${n.categoria} · abierta hace ${n.dias_abierta} día${n.dias_abierta === 1 ? '' : 's'} · reportada ${n.veces} ${n.veces === 1 ? 'vez' : 'veces'}`, ir: 'novedades' }));
    const atras = nov.filter(n => n.atrasada && !n.escalada);
    if (mando && atras.length) alertas.push({ nivel: atras.some(n => n.prioridad === 'C' || n.severidad === 'f') ? 'bad' : 'warn', titulo: `${atras.length} ${atras.length === 1 ? 'novedad' : 'novedades'} por regularizar con plazo vencido`,
      detalle: atras.slice(0, 3).map(n => n.nombre).join(' · ') + (atras.length > 3 ? ` y ${atras.length - 3} más` : '') + '. Repáralas, ciérralas o fija una fecha de compromiso.', ir: 'novedades' });
    viajes.forEach(v => {
      if (v.estado === 'en_ruta' || v.pre) return;
      const sale = String(v.salida || '').replace('T', ' ');
      if (v.salida_hora) {
        if (v.min_para_salir <= p.chk_ventana_min && v.min_para_salir >= -60) alertas.push({ nivel: 'bad', titulo: `Hora del checklist de salida: ${v.titulo}`, detalle: v.min_para_salir >= 0 ? `Sale a las ${v.salida_hora.slice(11, 16)} (en ${v.min_para_salir} min). Hazlo ahora.` : `Debía salir a las ${v.salida_hora.slice(11, 16)} y no hay checklist.`, ir: 'checklist' });
        else if (v.min_para_salir > p.chk_ventana_min && sale.slice(0, 10) <= sumarDias(h0, 1)) alertas.push({ nivel: 'warn', titulo: `Checklist de salida ${sale.slice(0, 10) === h0 ? 'hoy' : 'mañana'} desde las ${v.checklist_desde.slice(11, 16)}`, detalle: `${v.titulo} sale a las ${v.salida_hora.slice(11, 16)}. El checklist se hace en la hora previa.`, ir: 'checklist' });
      } else if (sale.slice(0, 10) <= sumarDias(h0, 1) && sale.slice(0, 10) >= h0) alertas.push({ nivel: sale.slice(0, 10) === h0 ? 'bad' : 'warn', titulo: `Falta el checklist de salida: ${v.titulo}`, detalle: `Sale ${sale.slice(0, 10) === h0 ? 'hoy' : 'mañana'}. Hazlo dentro de la hora previa a la salida.`, ir: 'checklist' });
    });
    if (mando) {
      const sinRev = (await env.DB.prepare("SELECT COUNT(*) n FROM chk_inspecciones WHERE placa=? AND estado='activa' AND revisado_en IS NULL AND COALESCE(origen,'app') <> 'v7' AND (aptitud IN ('no','fallas') OR COALESCE(km_alerta,'')<>'')").bind(placa).first()).n;
      if (sinRev) alertas.push({ nivel: 'warn', titulo: `${sinRev} ${sinRev === 1 ? 'inspección' : 'inspecciones'} por revisar`, detalle: 'Con fallas o con kilometraje dudoso.', ir: 'inspecciones' });
    }
    const orden = { bad: 0, warn: 1, info: 2 }; alertas.sort((a, b) => orden[a.nivel] - orden[b.nivel]);
    return { placa, unidad: u, parametros: p, odometro: odo, veredicto, zonas, alertas, documentos: docs.docs, documentos_faltan: docs.faltan, mantenimiento: mant,
      novedades: nov.map(n => ({ id: n.id, item: n.item, categoria: n.categoria, nombre: n.nombre, prioridad: n.prioridad, severidad: n.severidad, nivel: nivelNov(n), estado: n.estado,
        abierta_en: n.abierta_en, ultima_en: n.ultima_en, veces: n.veces, ultima_nota: n.ultima_nota, foto_id: n.foto_id, dias_abierta: n.dias_abierta, reincide: !!n.reincide_de, taller_nota: n.taller_nota,
        plazo: n.plazo, dias_plazo: n.dias_plazo, atrasada: n.atrasada, escalada: n.escalada, compromiso: n.compromiso })),
      inspecciones: insp, ultima: ultima ? resumenInsp(ultima) : null, hoy: { pre: hoyR.filter(x => x.tipo === 'pre').pop() || null },
      viajes, plantilla: PLANTILLA.version, ahora: ahoraLima() };
  }

  /* ═════════════ Guardar una inspección (llega por la cola sin señal) ═════════════ */
  async function crearInspeccion(env, yo, d, op) {
    d = d || {}; op = op || {};
    const imp = !!op.importar;
    if (!RE_UUID.test(String(d.id || ''))) throw new ErrorApi('Identificador no válido');
    const ya = await env.DB.prepare('SELECT id, aptitud FROM chk_inspecciones WHERE id = ?').bind(d.id).first();
    if (ya) return { duplicado: true, id: ya.id, aptitud: ya.aptitud };
    const p = await parametros(env), placa = p.placa;
    // v5.1: el checklist es solo de SALIDA. Los post-ruta existen únicamente en el historial importado de la v7.2.
    if (d.tipo === 'post' && !imp) throw new ErrorApi('El checklist se hace solo antes de salir: actualiza la app.');
    const tipo = d.tipo === 'post' ? 'post' : 'pre';
    const fecha = seg(String(d.fecha || ''));
    if (!RE_FH.test(fecha) || isNaN(msLima(fecha))) throw new ErrorApi('Fecha no válida');
    if (fecha > ahoraLima(new Date(Date.now() + 10 * 60000))) throw new ErrorApi('La fecha está en el futuro: revisa la hora del teléfono.');
    if (!imp && diasEntre(fecha, hoy()) > 20) throw new ErrorApi('La inspección tiene más de 20 días: regístrala de nuevo con la fecha correcta.');
    const inicio = RE_FH.test(seg(String(d.inicio || ''))) ? seg(String(d.inicio)) : null;
    const dur = inicio ? Math.round((msLima(fecha) - msLima(inicio)) / 1000) : null;
    const lugar = texto(d.lugar, 60); if (lugar.length < 2) throw new ErrorApi('Falta el lugar de ' + (tipo === 'pre' ? 'salida.' : 'llegada.'));
    const km = ent(d.km); if (!(km > 0) || km > 3000000) throw new ErrorApi('Falta el kilometraje del odómetro.');
    // Todos los ítems evaluados: así los totales siempre suman lo mismo en cada indicador.
    const it = d.items || {}, items = {}, faltan = [], sinNota = [];
    let c = 0, o = 0, f = 0, cr = 0; const hall = [], razones = [];
    for (const k of CLAVES) {
      const x = it[k] || {}, e = x.e;
      if (!['c', 'o', 'f'].includes(e)) { faltan.push(k); continue; }
      const n = texto(x.n, 200) || (imp && e !== 'c' ? '(sin detalle en la v7.2)' : '');
      if (e !== 'c' && n.length < 3) sinNota.push(k);
      items[k] = n ? { e, n } : { e };
      if (e === 'c') c++; else if (e === 'o') { o++; hall.push(k + ':o'); } else { f++; hall.push(k + ':f'); if (ITEMS[k].prioridad === 'C') { cr++; razones.push('Falla crítica: ' + ITEMS[k].nombre); } }
    }
    if (faltan.length) throw new ErrorApi(`Faltan ${faltan.length} de ${TOTAL} ítems por evaluar (primero: ${ITEMS[faltan[0]].nombre}).`);
    if (sinNota.length) throw new ErrorApi(`Describe lo que viste en ${sinNota.length} ítem(s) con observación o falla (primero: ${ITEMS[sinNota[0]].nombre}).`);
    // Documentos obligatorios vencidos a la fecha de la inspección: la unidad no es apta aunque el operador marque «conforme».
    const docs = (await env.DB.prepare('SELECT tipo, titulo, vencimiento, datos FROM flota_docs WHERE placa = ? AND vigente = 1 AND anulado = 0 AND vencimiento IS NOT NULL AND vencimiento <> \'\'').bind(placa).all()).results;
    const docVenc = docs.filter(x => (DOC_TIPOS[x.tipo] || {}).bloquea && x.vencimiento < fecha.slice(0, 10) && !((json(x.datos, {}).exigible_desde || '') > fecha.slice(0, 10)));
    docVenc.forEach(x => razones.unshift(DOC_TIPOS[x.tipo].nombre + ' vencido (' + x.vencimiento + ')'));
    // Observación en ítem CRÍTICO que sigue igual después de su plazo: ya no es «observación», la unidad no es apta hasta regularizarla.
    let escaladas = 0;
    if (!imp && p.nov_escalar) {
      const viejas = (await env.DB.prepare("SELECT * FROM chk_novedades WHERE placa = ? AND estado <> 'resuelta' AND prioridad = 'C' AND severidad = 'o'").bind(placa).all()).results;
      viejas.forEach(n => { if (items[n.item] && items[n.item].e === 'o' && plazoNov(n, p).atrasada) { escaladas++; razones.push('Sin regularizar desde el ' + n.abierta_en.slice(0, 10) + ': ' + ITEMS[n.item].nombre); } });
    }
    const aptitud = (cr || docVenc.length || escaladas) ? 'no' : f ? 'fallas' : o ? 'obs' : 'apto';
    // Kilometraje imposible: se guarda, se avisa y no cuenta para el mantenimiento hasta que alguien lo valide.
    const odo = await odometro(env, placa, d.id, fecha);
    let km_alerta = '';
    // Lo posible: hasta 900 km por día desde la última lectura confiable (+2,500 de margen por errores de redondeo o lecturas atrasadas).
    const tope = odo.km + 2500 + 900 * Math.max(0, odo.fecha_ref ? diasEntre(odo.fecha_ref, fecha.slice(0, 10)) : 0);
    if (odo.km && km < odo.km - 5) km_alerta = 'menor';
    else if (odo.km && km > tope) km_alerta = 'salto';
    // Viaje: el operador lo elige; un post-ruta se enlaza solo con su pre-ruta (72 h).
    const exc = d.excursion_id ? await env.DB.prepare('SELECT id, salida FROM excursiones WHERE id = ?').bind(String(d.excursion_id)).first() : null;
    let excursion_id = exc ? exc.id : null;
    // Hora de salida: la de la excursión o la que indica el conductor. El checklist vale en la hora previa (ventana configurable).
    const vs = exc ? ventanaSalida(exc.salida, p) : null;
    const salida_prevista = vs ? vs.salida + ':00' : (RE_FH.test(seg(String(d.salida_prevista || ''))) ? seg(String(d.salida_prevista)) : null);
    // Se mide desde que EMPEZÓ el checklist (no desde que lo envió): revisar 77 ítems toma su tiempo.
    const refT = inicio && dur !== null && dur >= 0 && dur < 3 * 3600 ? inicio : fecha;
    const min_antes = salida_prevista ? Math.round((msLima(salida_prevista) - msLima(refT)) / 60000) : null;
    if (!imp && tipo === 'pre' && min_antes !== null && min_antes > p.chk_ventana_min + 10)
      throw new ErrorApi(`Todavía es temprano: el checklist se hace en la hora previa a la salida (desde las ${ahoraLima(new Date(msLima(salida_prevista) - p.chk_ventana_min * 60000)).slice(11, 16)}).`);
    // A tiempo: entre la anticipación mínima (30 min) y la ventana (60 min) antes de salir, con 5–10 min de tolerancia.
    const a_tiempo = min_antes === null || imp ? null : (min_antes >= p.chk_anticipacion_min - 5 && min_antes <= p.chk_ventana_min + 10 ? 1 : 0);
    const autor = op.operador || { id: yo.id, nombre: yo.nombre };
    let ref_pre = null;
    if (tipo === 'post') {
      const pre = await env.DB.prepare(`SELECT id, excursion_id FROM chk_inspecciones i WHERE placa = ? AND tipo='pre' AND estado='activa' AND fecha <= ? AND fecha >= ?
        AND NOT EXISTS (SELECT 1 FROM chk_inspecciones x WHERE x.ref_pre = i.id) ORDER BY fecha DESC LIMIT 1`).bind(placa, fecha, ahoraLima(new Date(msLima(fecha) - 72 * 3600e3))).first();
      if (pre) { ref_pre = pre.id; if (!excursion_id && pre.excursion_id) excursion_id = pre.excursion_id; }
    }
    const motivo = ['excursion', 'ruta', 'otro'].includes(d.motivo) ? d.motivo : (excursion_id ? 'excursion' : 'ruta');
    // Fotos de evidencia: hasta 3, solo en ítems con observación o falla.
    const st = [], fotos = {};
    const pf = d.fotos && typeof d.fotos === 'object' ? Object.keys(d.fotos).filter(k => items[k] && items[k].e !== 'c').slice(0, 3) : [];
    for (const k of pf) { const x = await prepararFoto(env, d.fotos[k]); if (x) { st.push(x.st); fotos[k] = x.id; } }
    const ahora = ahoraLima();
    // Novedades: un problema por ítem con su historia.
    const cand = (await env.DB.prepare('SELECT * FROM chk_novedades WHERE placa = ? AND (estado <> \'resuelta\' OR resuelta_en >= ?)').bind(placa, sumarDias(fecha.slice(0, 10), -30)).all()).results;
    const nuevas = [], resueltas = [];
    const ops = [];
    for (const k of CLAVES) {
      const e = items[k].e, abierta = cand.find(n => n.item === k && n.estado !== 'resuelta');
      if (e !== 'c') {
        const histo = cand.find(n => n.item === k && n.estado === 'resuelta' && n.resuelta_en > fecha && n.abierta_en <= fecha);
        if (abierta) {
          const reciente = fecha >= (abierta.ultima_en || '');
          ops.push(['UPDATE chk_novedades SET veces = veces + 1, abierta_en = MIN(abierta_en, ?), ultima_en = MAX(ultima_en, ?), severidad = ?, ultima_nota = ?, ultima_insp = ?, foto_id = COALESCE(?, foto_id), seq = ? WHERE id = ?',
            [fecha, fecha, reciente ? e : abierta.severidad, reciente ? (items[k].n || abierta.ultima_nota) : abierta.ultima_nota, reciente ? d.id : abierta.ultima_insp, fotos[k] || null, abierta.id]]);
        } else if (histo) {
          // Llegó tarde un reporte de un problema que ya se resolvió después: solo suma a su historia.
          ops.push(['UPDATE chk_novedades SET veces = veces + 1, seq = ? WHERE id = ?', [histo.id]]);
        } else {
          const prev = cand.filter(n => n.item === k && n.estado === 'resuelta' && n.resuelta_en <= fecha).sort((a, b) => b.resuelta_en.localeCompare(a.resuelta_en))[0];
          const nid = crypto.randomUUID(), I = ITEMS[k];
          nuevas.push({ id: nid, item: k, nombre: I.nombre, prioridad: I.prioridad, severidad: e, reincide: !!prev });
          ops.push([`INSERT INTO chk_novedades (id, placa, item, categoria, nombre, prioridad, severidad, estado, abierta_en, ultima_en, veces, ultima_nota, ultima_insp, foto_id, reincide_de, seq)
            VALUES (?,?,?,?,?,?,?,'abierta',?,?,1,?,?,?,?,?)`, [nid, placa, k, I.categoria, I.nombre, I.prioridad, e, fecha, fecha, items[k].n || '', d.id, fotos[k] || null, prev ? prev.id : null]]);
        }
      } else if (abierta && fecha > (abierta.ultima_en || '')) {
        resueltas.push({ id: abierta.id, nombre: abierta.nombre });
        ops.push(["UPDATE chk_novedades SET estado = 'resuelta', resuelta_en = ?, resuelta_por = ?, resuelta_como = 'inspeccion', resuelta_nota = ?, seq = ? WHERE id = ?",
          [fecha, autor.nombre, `Conforme en el checklist del ${fecha.slice(0, 16)}`, abierta.id]]);
      }
    }
    const s0 = await reservarSeq(env, ops.length + 1);
    ops.forEach(([sql, args], i) => {
      // El seq va siempre antes del id (último parámetro).
      const a = args.slice(); if (sql.startsWith('INSERT')) a.push(s0 + 1 + i); else a.splice(a.length - 1, 0, s0 + 1 + i);
      st.push(env.DB.prepare(sql).bind(...a));
    });
    st.unshift(env.DB.prepare(`INSERT INTO chk_inspecciones (id, placa, tipo, fecha, inicio, duracion_seg, lugar, km, km_alerta, motivo, excursion_id, ref_pre, operador_id, operador, plantilla, total,
      conformes, observaciones, fallas, criticas, aptitud, razones, hallazgos, items, fotos, estado, recibido_en, seq, salida_prevista, min_antes, a_tiempo, origen) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'activa',?,?,?,?,?,?)`)
      .bind(d.id, placa, tipo, fecha, inicio, dur !== null && dur >= 0 && dur < 6 * 3600 ? dur : null, lugar, km, km_alerta, motivo, excursion_id, ref_pre, autor.id, autor.nombre,
        Number(d.plantilla) || PLANTILLA.version, TOTAL, c, o, f, cr, aptitud, JSON.stringify(razones), hall.join(','), JSON.stringify(items), JSON.stringify(fotos), ahora, s0,
        salida_prevista, min_antes, a_tiempo, imp ? 'v7' : 'app'));
    await env.DB.batch(st);
    if (imp) return { id: d.id, aptitud, km_alerta, novedades_nuevas: nuevas.length, resueltas: resueltas.length };
    await auditar(env, yo.nombre, 'chk_crear', `${TIPO_TXT[tipo]} ${placa} · ${km} km · ${aptitud} · ${c}/${o}/${f}${min_antes !== null ? ' · ' + min_antes + ' min antes de salir' : ''}`);
    // Avisos: solo lo que exige actuar.
    const ir = 'unidad:insp:' + d.id;
    if (aptitud === 'no') await avisar(env, { tipo: 'flota', titulo: `Unidad NO APTA · ${TIPO_TXT[tipo]} de ${yo.nombre}`, detalle: razones.slice(0, 3).join(' · '), ir, para: 'mando' });
    else if (aptitud === 'fallas') await avisar(env, { tipo: 'flota', titulo: `${TIPO_TXT[tipo]} con ${f} falla${f === 1 ? '' : 's'} · ${placa}`, detalle: nuevas.filter(n => n.severidad === 'f').map(n => n.nombre).slice(0, 3).join(' · ') || 'Fallas ya reportadas antes', ir, para: 'mando' });
    if (km_alerta) await avisar(env, { tipo: 'flota', titulo: 'Kilometraje dudoso en el checklist', detalle: `${yo.nombre} anotó ${km.toLocaleString('es-PE')} km; el último confiable era ${odo.km.toLocaleString('es-PE')} km. Valídalo para que cuente en el mantenimiento.`, ir, para: 'mando' });
    if (a_tiempo === 0 && min_antes < -15) await avisar(env, { tipo: 'flota', titulo: 'Checklist hecho después de la hora de salida', detalle: `${yo.nombre} lo hizo ${-min_antes} min después de la salida prevista (${salida_prevista.slice(11, 16)}).`, ir, para: 'mando' });
    return { id: d.id, aptitud, razones, conformes: c, observaciones: o, fallas: f, criticas: cr, km_alerta, novedades_nuevas: nuevas.length, resueltas: resueltas.length, ref_pre, excursion_id, salida_prevista, min_antes, a_tiempo };
  }

  async function listar(env, yo, url) {
    const p = await parametros(env), q = url.searchParams, mando = esMando(yo);
    const w = ['i.placa = ?'], a = [p.placa];
    if (!mando) { w.push('i.operador_id = ?'); a.push(yo.id); }
    if (RE_F.test(q.get('desde') || '')) { w.push('substr(i.fecha,1,10) >= ?'); a.push(q.get('desde')); }
    if (RE_F.test(q.get('hasta') || '')) { w.push('substr(i.fecha,1,10) <= ?'); a.push(q.get('hasta')); }
    if (['pre', 'post'].includes(q.get('tipo'))) { w.push('i.tipo = ?'); a.push(q.get('tipo')); }
    if (['apto', 'obs', 'fallas', 'no'].includes(q.get('aptitud'))) { w.push('i.aptitud = ?'); a.push(q.get('aptitud')); }
    if (q.get('revisar') === '1') w.push("COALESCE(i.origen,'app') <> 'v7' AND i.revisado_en IS NULL AND (i.aptitud IN ('no','fallas') OR COALESCE(i.km_alerta,'') <> '')");
    if (q.get('anuladas') !== '1') w.push("i.estado = 'activa'");
    if (RE_FH.test(q.get('antes') || '')) { w.push('i.fecha < ?'); a.push(q.get('antes')); }
    const lim = Math.min(200, Math.max(10, Number(q.get('limite')) || 60));
    const filas = (await env.DB.prepare(`SELECT i.*, e.titulo titulo_exc FROM chk_inspecciones i LEFT JOIN excursiones e ON e.id = i.excursion_id WHERE ${w.join(' AND ')} ORDER BY i.fecha DESC LIMIT ?`).bind(...a, lim + 1).all()).results;
    return { inspecciones: filas.slice(0, lim).map(resumenInsp), mas: filas.length > lim };
  }
  async function detalle(env, yo, id) {
    const x = await env.DB.prepare('SELECT i.*, e.titulo titulo_exc, e.origen exc_origen, e.destino exc_destino FROM chk_inspecciones i LEFT JOIN excursiones e ON e.id = i.excursion_id WHERE i.id = ?').bind(id).first();
    if (!x) throw new ErrorApi('Inspección no encontrada', 'NO_EXISTE', 404);
    if (!esMando(yo) && x.operador_id !== yo.id) throw new ErrorApi('Solo ves tus propias inspecciones.', 'SIN_PERMISO', 403);
    const par = x.ref_pre ? await env.DB.prepare('SELECT id, fecha, km, aptitud, lugar FROM chk_inspecciones WHERE id = ?').bind(x.ref_pre).first()
      : await env.DB.prepare("SELECT id, fecha, km, aptitud, lugar FROM chk_inspecciones WHERE ref_pre = ? AND estado='activa'").bind(x.id).first();
    return { ...resumenInsp(x), items: json(x.items, {}), fotos: json(x.fotos, {}), inicio: x.inicio, recibido_en: x.recibido_en, anulado_por: x.anulado_por, motivo_anulacion: x.motivo_anulacion,
      exc_origen: x.exc_origen, exc_destino: x.exc_destino, par: par || null, km_recorrido: par && x.tipo === 'post' ? x.km - par.km : par && x.tipo === 'pre' ? par.km - x.km : null };
  }
  async function revisar(env, yo, id, b) {
    exigirMando(yo);
    const x = await env.DB.prepare('SELECT * FROM chk_inspecciones WHERE id = ?').bind(id).first();
    if (!x) throw new ErrorApi('Inspección no encontrada', 'NO_EXISTE', 404);
    const c = { revisado_por: yo.nombre, revisado_en: ahoraLima() }, notas = [];
    if (b.km_corregido !== undefined && b.km_corregido !== '') { const k = ent(b.km_corregido); if (!(k > 0)) throw new ErrorApi('Kilometraje no válido'); notas.push(`km ${x.km} → ${k}`); c.km = k; c.km_alerta = ''; }
    else if (b.km_valido) { c.km_alerta = ''; notas.push(`km ${x.km} validado`); }
    c.seq = await reservarSeq(env, 1);
    const k = Object.keys(c);
    await env.DB.prepare(`UPDATE chk_inspecciones SET ${k.map(z => z + ' = ?').join(', ')} WHERE id = ?`).bind(...k.map(z => c[z]), id).run();
    await auditar(env, yo.nombre, 'chk_revisar', `${TIPO_TXT[x.tipo]} ${x.fecha} de ${x.operador}${notas.length ? ' · ' + notas.join(' · ') : ''}${b.nota ? ' · ' + texto(b.nota, 160) : ''}`);
    return { id };
  }
  async function anular(env, yo, id, b) {
    exigirMando(yo);
    const motivo = texto(b.motivo, 200); if (motivo.length < 5) throw new ErrorApi('Escribe el motivo (al menos 5 letras).');
    const x = await env.DB.prepare('SELECT * FROM chk_inspecciones WHERE id = ?').bind(id).first();
    if (!x) throw new ErrorApi('Inspección no encontrada', 'NO_EXISTE', 404);
    if (x.estado !== 'activa') throw new ErrorApi('Esa inspección ya está anulada.');
    await env.DB.prepare("UPDATE chk_inspecciones SET estado='anulada', anulado_por=?, anulado_en=?, motivo_anulacion=?, seq=? WHERE id=?").bind(yo.nombre, ahoraLima(), motivo, await reservarSeq(env, 1), id).run();
    await auditar(env, yo.nombre, 'chk_anular', `${TIPO_TXT[x.tipo]} ${x.fecha} de ${x.operador} · ${motivo}`);
    return { id };
  }

  /* ═════════════ Novedades: abierta → en reparación → resuelta ═════════════ */
  async function novedades(env, yo, url) {
    const p = await parametros(env), e = url.searchParams.get('estado') || 'abiertas';
    const w = e === 'resueltas' ? "estado = 'resuelta'" : e === 'todas' ? '1=1' : e === 'reparacion' ? "estado = 'en_reparacion'" : "estado <> 'resuelta'";
    const filas = (await env.DB.prepare(`SELECT * FROM chk_novedades WHERE placa = ? AND ${w} ORDER BY CASE estado WHEN 'resuelta' THEN 1 ELSE 0 END,
      CASE WHEN severidad='f' AND prioridad='C' THEN 0 WHEN severidad='f' THEN 1 ELSE 2 END, COALESCE(resuelta_en, abierta_en) DESC LIMIT 150`).bind(p.placa).all()).results;
    let L = filas.map(n => { const x = { ...n, ...plazoNov(n, p) }; return { ...x, nivel: nivelNov(x), dias_abierta: diasEntre(n.abierta_en, n.resuelta_en || hoy()) }; });
    if (e === 'vencidas') L = L.filter(n => n.atrasada);
    if (e === 'abiertas' || e === 'vencidas') L.sort((a, b) => (a.nivel === 'critica' ? 0 : 1) - (b.nivel === 'critica' ? 0 : 1) || a.dias_plazo - b.dias_plazo);
    return { novedades: L };
  }
  async function accionNovedad(env, yo, id, b) {
    exigirMando(yo);
    const n = await env.DB.prepare('SELECT * FROM chk_novedades WHERE id = ?').bind(id).first();
    if (!n) throw new ErrorApi('Novedad no encontrada', 'NO_EXISTE', 404);
    if (b.accion === 'plazo') { if (n.estado === 'resuelta') throw new ErrorApi('Esa novedad ya está resuelta.'); return loteNovedades(env, yo, { ...b, ids: [id] }); }
    const nota = texto(b.nota, 200), ahora = ahoraLima(), s = await reservarSeq(env, 1);
    const comp = RE_F.test(String(b.compromiso || '')) && b.compromiso >= hoy() ? b.compromiso : null;
    if (b.accion === 'reparacion') {
      if (n.estado === 'resuelta') throw new ErrorApi('Esa novedad ya está resuelta.');
      if (nota.length < 3) throw new ErrorApi('Escribe dónde o quién la repara.');
      await env.DB.prepare("UPDATE chk_novedades SET estado='en_reparacion', taller_nota=?, taller_por=?, taller_en=?, compromiso=COALESCE(?, compromiso), compromiso_por=CASE WHEN ? IS NULL THEN compromiso_por ELSE ? END, seq=? WHERE id=?").bind(nota, yo.nombre, ahora, comp, comp, yo.nombre, s, id).run();
    } else if (b.accion === 'resolver') {
      if (n.estado === 'resuelta') throw new ErrorApi('Esa novedad ya está resuelta.');
      if (nota.length < 3) throw new ErrorApi('Escribe cómo se resolvió.');
      await env.DB.prepare("UPDATE chk_novedades SET estado='resuelta', resuelta_en=?, resuelta_por=?, resuelta_como='manual', resuelta_nota=?, seq=? WHERE id=?").bind(ahora, yo.nombre, nota, s, id).run();
    } else if (b.accion === 'reabrir') {
      if (n.estado !== 'resuelta') throw new ErrorApi('Esa novedad sigue abierta.');
      await env.DB.prepare("UPDATE chk_novedades SET estado='abierta', resuelta_en=NULL, resuelta_por=NULL, resuelta_como=NULL, resuelta_nota=NULL, ultima_nota=COALESCE(?, ultima_nota), seq=? WHERE id=?").bind(nota || null, s, id).run();
    } else throw new ErrorApi('Acción no válida');
    await auditar(env, yo.nombre, 'chk_novedad', `${n.nombre} · ${b.accion}${nota ? ' · ' + nota : ''}`);
    return { id };
  }

  /* ═════════════ Documentos de la unidad ═════════════ */
  function leerDoc(b, previo) {
    const tipo = previo ? previo.tipo : String(b.tipo || '');
    if (!DOC_TIPOS[tipo]) throw new ErrorApi('Tipo de documento no válido');
    const d = { titulo: texto(b.titulo, 60) || null, numero: texto(b.numero, 40) || null, entidad: texto(b.entidad, 60) || null, notas: texto(b.notas, 200) || null };
    for (const k of ['emision', 'vencimiento']) { const v = String(b[k] || ''); if (v && !RE_F.test(v)) throw new ErrorApi('Fecha no válida'); d[k] = v || null; }
    const exigible = /^\d{4}-\d{2}-\d{2}$/.test(String((b.datos || {}).exigible_desde || '')) && b.datos.exigible_desde > hoy();
    if (DOC_TIPOS[tipo].vence && tipo !== 'otro' && !d.vencimiento && !exigible) throw new ErrorApi('Falta la fecha de vencimiento.');
    if (d.emision && d.vencimiento && d.vencimiento < d.emision) throw new ErrorApi('El vencimiento es anterior a la emisión.');
    if (d.emision && d.emision > hoy()) throw new ErrorApi('La fecha de emisión está en el futuro.');
    if (tipo === 'otro' && !d.titulo) throw new ErrorApi('Escribe el nombre del documento.');
    const datos = {}; if (b.datos && typeof b.datos === 'object') Object.keys(b.datos).slice(0, 8).forEach(k => { const v = texto(b.datos[k], 80); if (v) datos[k.slice(0, 30)] = v; });
    d.datos = JSON.stringify(datos);
    return { tipo, d };
  }
  async function guardarDoc(env, yo, id, b) {
    exigirMando(yo);
    const p = await parametros(env), ahora = ahoraLima(), st = [];
    const previo = id ? await env.DB.prepare('SELECT * FROM flota_docs WHERE id = ?').bind(id).first() : null;
    if (id && !previo) throw new ErrorApi('Documento no encontrado', 'NO_EXISTE', 404);
    const { tipo, d } = leerDoc(b, previo);
    const foto = b.foto ? await prepararFoto(env, b.foto) : null; if (foto) { st.push(foto.st); d.foto_id = foto.id; d.foto_mime = b.foto.mime; }
    if (b.quitar_foto && !foto) { d.foto_id = null; d.foto_mime = null; }
    const s = await reservarSeq(env, 2);
    if (previo) {
      const k = Object.keys(d);
      st.push(env.DB.prepare(`UPDATE flota_docs SET ${k.map(z => z + ' = ?').join(', ')}, actualizado_por = ?, actualizado_en = ?, seq = ? WHERE id = ?`).bind(...k.map(z => d[z]), yo.nombre, ahora, s, id));
      await env.DB.batch(st);
      await auditar(env, yo.nombre, 'doc_editar', `${DOC_TIPOS[tipo].nombre} ${d.numero || ''} · vence ${d.vencimiento || '—'}`);
      return { id };
    }
    const nid = crypto.randomUUID();
    // Renovar: el anterior del mismo tipo queda en el historial (no vigente).
    if (tipo !== 'otro') st.push(env.DB.prepare('UPDATE flota_docs SET vigente = 0, seq = ? WHERE placa = ? AND tipo = ? AND vigente = 1').bind(s, p.placa, tipo));
    st.push(env.DB.prepare(`INSERT INTO flota_docs (id, placa, tipo, titulo, numero, entidad, emision, vencimiento, datos, foto_id, foto_mime, notas, vigente, anulado, creado_por, creado_en, seq)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,1,0,?,?,?)`).bind(nid, p.placa, tipo, d.titulo, d.numero, d.entidad, d.emision, d.vencimiento, d.datos, d.foto_id || null, d.foto_mime || null, d.notas, yo.nombre, ahora, s + 1));
    await env.DB.batch(st);
    await auditar(env, yo.nombre, 'doc_registrar', `${DOC_TIPOS[tipo].nombre} ${d.numero || ''} · vence ${d.vencimiento || '—'}`);
    await avisar(env, { tipo: 'flota', titulo: `Documento al día: ${tipo === 'otro' ? d.titulo : DOC_TIPOS[tipo].nombre}`, detalle: d.vencimiento ? `Vigente hasta el ${d.vencimiento}.` : 'Documento cargado.', ir: 'unidad:documentos', para: 'todos' });
    return { id: nid };
  }
  async function quitarDoc(env, yo, id) {
    exigirMando(yo);
    const x = await env.DB.prepare('SELECT * FROM flota_docs WHERE id = ?').bind(id).first();
    if (!x) throw new ErrorApi('Documento no encontrado', 'NO_EXISTE', 404);
    const s = await reservarSeq(env, 2), st = [env.DB.prepare('UPDATE flota_docs SET anulado = 1, vigente = 0, actualizado_por = ?, actualizado_en = ?, seq = ? WHERE id = ?').bind(yo.nombre, ahoraLima(), s, id)];
    if (x.vigente && x.tipo !== 'otro') {
      const ant = await env.DB.prepare('SELECT id FROM flota_docs WHERE placa = ? AND tipo = ? AND anulado = 0 AND id <> ? ORDER BY COALESCE(vencimiento, emision, creado_en) DESC LIMIT 1').bind(x.placa, x.tipo, id).first();
      if (ant) st.push(env.DB.prepare('UPDATE flota_docs SET vigente = 1, seq = ? WHERE id = ?').bind(s + 1, ant.id));
    }
    await env.DB.batch(st);
    await auditar(env, yo.nombre, 'doc_quitar', `${(DOC_TIPOS[x.tipo] || {}).nombre || x.tipo} ${x.numero || ''}`);
    return { id };
  }
  async function historialDocs(env, yo, url) {
    exigirMando(yo);
    const p = await parametros(env), t = url.searchParams.get('tipo');
    const filas = (await env.DB.prepare(`SELECT * FROM flota_docs WHERE placa = ? AND anulado = 0 ${DOC_TIPOS[t] ? 'AND tipo = ?' : ''} ORDER BY tipo, COALESCE(vencimiento, emision) DESC LIMIT 60`).bind(...(DOC_TIPOS[t] ? [p.placa, t] : [p.placa])).all()).results;
    return { documentos: filas.map(d => ({ ...d, datos: json(d.datos, {}), nombre: d.tipo === 'otro' && d.titulo ? d.titulo : (DOC_TIPOS[d.tipo] || {}).nombre })) };
  }

  /* ═════════════ Mantenimiento ═════════════ */
  async function guardarMant(env, yo, b) {
    exigirMando(yo);
    const p = await parametros(env);
    const fecha = String(b.fecha || ''); if (!RE_F.test(fecha) || fecha > hoy()) throw new ErrorApi('Fecha no válida (no puede estar en el futuro).');
    const km = ent(b.km); if (!(km > 0)) throw new ErrorApi('Escribe el kilometraje del servicio.');
    const tipo = b.tipo === 'correctivo' ? 'correctivo' : 'preventivo';
    const taller = texto(b.taller, 60); if (taller.length < 2) throw new ErrorApi('Escribe el taller.');
    const costo = b.costo !== undefined && b.costo !== '' ? r2(String(b.costo).replace(',', '.')) : null;
    if (costo !== null && (costo < 0 || costo > 100000)) throw new ErrorApi('Costo no válido');
    const ids = Array.isArray(b.novedades) ? b.novedades.map(String).slice(0, 40) : [];
    const st = [], foto = b.foto ? await prepararFoto(env, b.foto) : null; if (foto) st.push(foto.st);
    const id = crypto.randomUUID(), ahora = ahoraLima(), s = await reservarSeq(env, 1 + ids.length);
    st.push(env.DB.prepare(`INSERT INTO flota_mant (id, placa, fecha, km, tipo, taller, detalle, costo, responsable, foto_id, novedades, anulado, creado_por, creado_en, seq) VALUES (?,?,?,?,?,?,?,?,?,?,?,0,?,?,?)`)
      .bind(id, p.placa, fecha, km, tipo, taller, texto(b.detalle, 300) || null, costo, texto(b.responsable, 40) || yo.nombre, foto ? foto.id : null, ids.join(','), yo.nombre, ahora, s));
    ids.forEach((nid, i) => st.push(env.DB.prepare("UPDATE chk_novedades SET estado='resuelta', resuelta_en=?, resuelta_por=?, resuelta_como='mantenimiento', resuelta_nota=?, seq=? WHERE id=? AND estado<>'resuelta'")
      .bind(fecha + ' ' + ahora.slice(11), yo.nombre, `${tipo === 'correctivo' ? 'Reparación' : 'Mantenimiento'} en ${taller} a los ${km} km`, s + 1 + i, nid)));
    await env.DB.batch(st);
    await auditar(env, yo.nombre, 'mant_registrar', `${tipo} ${fecha} · ${km} km · ${taller}${costo !== null ? ' · S/ ' + costo : ''}${ids.length ? ' · resuelve ' + ids.length + ' novedad(es)' : ''}`);
    await avisar(env, { tipo: 'flota', titulo: `${tipo === 'correctivo' ? 'Reparación registrada' : 'Mantenimiento registrado'} · ${km.toLocaleString('es-PE')} km`,
      detalle: tipo === 'preventivo' ? `Próximo a los ${(km + p.mant_intervalo_km).toLocaleString('es-PE')} km o el ${sumarDias(fecha, p.mant_intervalo_dias)}.` : taller, ir: 'unidad:mantenimiento', para: 'todos' });
    return { id };
  }
  async function anularMant(env, yo, id, b) {
    exigirMando(yo);
    const motivo = texto(b.motivo, 200); if (motivo.length < 5) throw new ErrorApi('Escribe el motivo (al menos 5 letras).');
    const x = await env.DB.prepare('SELECT * FROM flota_mant WHERE id = ?').bind(id).first(); if (!x) throw new ErrorApi('Registro no encontrado', 'NO_EXISTE', 404);
    await env.DB.prepare('UPDATE flota_mant SET anulado = 1, motivo_anulacion = ?, seq = ? WHERE id = ?').bind(motivo, await reservarSeq(env, 1), id).run();
    await auditar(env, yo.nombre, 'mant_anular', `${x.fecha} · ${x.km} km · ${motivo}`);
    return { id };
  }
  async function guardarParametros(env, yo, b) {
    exigirMando(yo);
    const lim = { mant_intervalo_km: [500, 50000], mant_alerta_km: [50, 5000], mant_intervalo_dias: [30, 730], docs_aviso_dias: [5, 120], chk_exige_salida: [0, 1], chk_ventana_min: [30, 120], chk_anticipacion_min: [0, 60], nov_escalar: [0, 1] };
    const st = [], cambios = [];
    for (const k of Object.keys(lim)) {
      if (b[k] === undefined || b[k] === '') continue;
      const v = Math.round(Number(b[k])); if (!(v >= lim[k][0] && v <= lim[k][1])) throw new ErrorApi(`Valor fuera de rango: ${k}`);
      cambios.push(`${k}=${v}`); st.push([k, String(v)]);
    }
    if (b.placa !== undefined && texto(b.placa, 10)) { st.push(['flota_placa', texto(b.placa, 10).toUpperCase()]); cambios.push('placa=' + texto(b.placa, 10).toUpperCase()); }
    const pp = await parametros(env), vv = Number(b.chk_ventana_min || pp.chk_ventana_min), aa = Number(b.chk_anticipacion_min !== undefined && b.chk_anticipacion_min !== '' ? b.chk_anticipacion_min : pp.chk_anticipacion_min);
    if (aa >= vv) throw new ErrorApi('La anticipación mínima debe ser menor que la ventana (ej. entre 30 y 60 min).');
    if (!st.length) return { ok: true };
    const s = await reservarSeq(env, st.length);
    await env.DB.batch(st.map(([k, v], i) => env.DB.prepare('INSERT OR REPLACE INTO config (clave, valor, seq) VALUES (?,?,?)').bind(k, v, s + i)));
    await auditar(env, yo.nombre, 'flota_parametros', cambios.join(' · '));
    return { ok: true };
  }

  /* ═════════════ Excursiones: ¿la unidad puede salir? ═════════════ */
  async function checklistDe(env, excId) {
    const c = (await env.DB.prepare("SELECT * FROM chk_inspecciones WHERE excursion_id = ? AND estado='activa' ORDER BY fecha").bind(excId).all()).results.map(resumenInsp);
    return { pre: c.filter(x => x.tipo === 'pre').pop() || null, post: c.filter(x => x.tipo === 'post').pop() || null };
  }
  /** Antes de marcar «en ruta» una excursión: exige un pre-ruta reciente y apto. Un administrador puede salir igual dejando el motivo. */
  /** Antes de marcar «en ruta» una excursión: exige un checklist de salida APTO hecho en la hora previa (ventana + 30 min de tolerancia por demoras).
   *  Un administrador puede salir igual dejando el motivo: queda en auditoría y avisa al equipo. */
  async function exigirSalida(env, yo, excId, b) {
    const p = await parametros(env);
    if (!p.chk_exige_salida) return null;
    const e = await env.DB.prepare('SELECT id, titulo, km_inicio FROM excursiones WHERE id = ?').bind(excId).first();
    if (!e || e.km_inicio) return null;
    const desde = ahoraLima(new Date(Date.now() - (p.chk_ventana_min + 30) * 60000));
    const r = await env.DB.prepare(`SELECT * FROM chk_inspecciones WHERE placa = ? AND tipo='pre' AND estado='activa' AND fecha >= ? AND (excursion_id = ? OR excursion_id IS NULL)
      ORDER BY CASE WHEN excursion_id = ? THEN 0 ELSE 1 END, fecha DESC LIMIT 1`).bind(p.placa, desde, excId, excId).first();
    const pre = r ? resumenInsp(r) : null;
    const viejo = !pre ? await env.DB.prepare("SELECT fecha FROM chk_inspecciones WHERE placa = ? AND tipo='pre' AND estado='activa' ORDER BY fecha DESC LIMIT 1").bind(p.placa).first() : null;
    const forzar = b && b.forzar_checklist && texto(b.motivo_checklist, 200).length >= 5;
    if (!pre || pre.aptitud === 'no') {
      if (!forzar) {
        const hace = viejo ? Math.round((Date.now() - msLima(viejo.fecha)) / 60000) : null;
        const err = new ErrorApi(!pre
          ? (hace !== null ? `El último checklist de salida es de hace ${hace < 120 ? hace + ' min' : Math.round(hace / 60) + ' h'}: debe hacerse en la hora previa a salir. Pídele al conductor uno nuevo.` : 'Falta el checklist de salida. Pídele al conductor que lo haga antes de salir.')
          : 'El checklist de salida dejó la unidad NO APTA: ' + pre.razones.slice(0, 2).join(' · '), !pre ? 'CHECKLIST' : 'NO_APTA', 409);
        err.datos = { pre }; throw err;
      }
      await auditar(env, yo.nombre, 'chk_salida_forzada', `${e.titulo} · ${!pre ? 'sin checklist vigente' : 'unidad no apta'} · ${texto(b.motivo_checklist, 200)}`);
      await avisar(env, { tipo: 'flota', titulo: `Salida sin checklist apto: ${e.titulo}`, detalle: `${yo.nombre}: ${texto(b.motivo_checklist, 200)}`, ir: 'excursion:' + excId, para: 'mando' });
    }
    return pre;
  }
  async function enlazar(env, inspId, excId) {
    if (inspId) await env.DB.prepare('UPDATE chk_inspecciones SET excursion_id = ?, motivo = \'excursion\', salida_real = ?, seq = ? WHERE id = ?').bind(excId, ahoraLima(), await reservarSeq(env, 1), inspId).run();
  }

  /* ═════════════ Alertas automáticas: el cron las revisa cada 15 minutos (wrangler.jsonc) ═════════════ */
  async function revisarAlertas(env) {
    const r = { avisos: 0 };
    try {
      const una = async (clave) => ((await env.DB.prepare('INSERT OR IGNORE INTO meta (clave, valor) VALUES (?, ?)').bind('fa:' + clave, ahoraLima()).run()).meta.changes || 0) > 0;
      const aviso = async (clave, a) => { if (await una(clave)) { await avisar(env, { tipo: 'flota', ...a }); r.avisos++; } };
      const p = await parametros(env), h0 = hoy(), ahora = ahoraLima();
      // 1. Salidas: aviso al abrirse la ventana del checklist, urgente a 15 min y a los administradores si salió sin checklist.
      const viajes = (await env.DB.prepare(`SELECT id, titulo, salida, estado FROM excursiones WHERE estado IN ('borrador','abierta','cerrada')
        AND substr(replace(salida,'T',' '),1,10) BETWEEN ? AND ?`).bind(sumarDias(h0, -1), sumarDias(h0, 1)).all()).results;
      for (const v of viajes) {
        const vs = ventanaSalida(v.salida, p);
        const pre = await env.DB.prepare("SELECT id FROM chk_inspecciones WHERE estado='activa' AND tipo='pre' AND (excursion_id = ? OR (excursion_id IS NULL AND fecha >= ?)) LIMIT 1")
          .bind(v.id, vs ? vs.abre : h0 + ' 00:00').first();
        if (pre) continue;
        if (!vs) { if (String(v.salida).slice(0, 10) === h0) await aviso(`exc:${v.id}:hoy`, { titulo: `Hoy: checklist de salida · ${v.titulo}`, detalle: 'La excursión no tiene hora: hazlo en la hora previa a salir.', ir: 'unidad:checklist', para: 'todos' }); continue; }
        const hh = vs.salida.slice(11, 16);
        if (vs.min > p.chk_ventana_min && vs.min <= p.chk_ventana_min + 30) await aviso(`exc:${v.id}:pronto`, { titulo: `En ${vs.min - p.chk_ventana_min} min abre el checklist · ${v.titulo}`, detalle: `Sale a las ${hh}. Hazlo desde las ${vs.abre.slice(11, 16)}.`, ir: 'unidad:checklist', para: 'todos' });
        if (vs.min <= p.chk_ventana_min && vs.min > 15) await aviso(`exc:${v.id}:abre`, { titulo: `Hora del checklist de salida · ${v.titulo}`, detalle: `Sale a las ${hh}. Hazlo ahora, antes de recoger a los pasajeros.`, ir: 'unidad:checklist', para: 'todos' });
        if (vs.min <= p.chk_anticipacion_min && vs.min > -10) await aviso(`exc:${v.id}:urgente`, { titulo: `Faltan ${Math.max(0, vs.min)} min y no hay checklist · ${v.titulo}`, detalle: `Sale a las ${hh}: el checklist debía estar listo ${p.chk_anticipacion_min} min antes. Sin checklist apto la excursión no pasa a «En ruta».`, ir: 'unidad:checklist', para: 'todos' });
        if (vs.min <= -30 && vs.min > -24 * 60) await aviso(`exc:${v.id}:tarde`, { titulo: `Salida sin checklist · ${v.titulo}`, detalle: `Debía salir a las ${hh} y no hay checklist de salida.`, ir: 'excursion:' + v.id, para: 'mando' });
      }
      // 2. Documentos (30, 15, 7, 1 día y vencido)
      for (const d of (await documentos(env, p.placa, p)).docs) {
        if (d.dias === null || d.estado === 'no_aplica') continue;
        const nivel = d.dias < 0 ? 'vencido' : d.dias <= 1 ? '1' : d.dias <= 7 ? '7' : d.dias <= 15 ? '15' : d.dias <= p.docs_aviso_dias ? String(p.docs_aviso_dias) : '';
        if (nivel) await aviso(`doc:${d.id}:${nivel}`, { titulo: d.dias < 0 ? `${d.nombre} VENCIDO` : `${d.nombre} vence ${d.dias === 0 ? 'hoy' : d.dias === 1 ? 'mañana' : 'en ' + d.dias + ' días'}`,
          detalle: (d.dias < 0 && d.bloquea ? 'La unidad no debe salir hasta renovarlo. ' : '') + `Vencimiento: ${d.vencimiento}.`, ir: 'unidad:documentos', para: 'todos' });
      }
      // 3. Mantenimiento
      const odo = await odometro(env, p.placa), m = (await mantenimiento(env, p.placa, p, odo.km, false)).estado;
      if (m && (m.estado === 'proximo' || m.estado === 'vencido'))
        await aviso(`mant:${m.ultimo.id}:${m.estado}`, { titulo: m.estado === 'vencido' ? 'Mantenimiento VENCIDO' : 'Mantenimiento próximo', detalle: m.motivo === 'tiempo' ? `Fecha límite ${m.fecha_limite}.` : m.estado === 'vencido' ? `Excedido en ${(-m.restantes).toLocaleString('es-PE')} km (debió hacerse a los ${m.proximo_km.toLocaleString('es-PE')} km).` : `Faltan ${m.restantes.toLocaleString('es-PE')} km (a los ${m.proximo_km.toLocaleString('es-PE')} km).`, ir: 'unidad:mantenimiento', para: 'todos' });
      // 4. Novedades por regularizar: una alerta por cada crítica que vence su plazo y un resumen diario para los administradores (desde las 7 a. m.).
      const nov = await novedadesAbiertas(env, p.placa, p);
      for (const n of nov.filter(x => x.atrasada && (x.prioridad === 'C' || x.severidad === 'f')))
        await aviso(`nov:${n.id}:${n.plazo}`, { titulo: `Plazo vencido: ${n.nombre}`, detalle: n.escalada ? 'Observación en ítem crítico sin regularizar: la unidad pasa a NO APTA hasta resolverla o fijar un compromiso.' : `Debía regularizarse hasta el ${n.plazo}.`, ir: 'unidad:novedades', para: 'mando' });
      const atras = nov.filter(x => x.atrasada);
      if (nov.length && ahora.slice(11, 13) >= '07') await aviso(`digest:${h0}`, { titulo: `Por regularizar: ${nov.length} ${nov.length === 1 ? 'novedad' : 'novedades'}${atras.length ? ' · ' + atras.length + ' con plazo vencido' : ''}`,
        detalle: (atras.length ? atras : nov).slice(0, 4).map(x => x.nombre).join(' · ') + (nov.length > 4 ? '…' : ''), ir: 'unidad:novedades', para: 'mando' });
    } catch (e) { console.error('alertas flota', e); r.error = String(e.message || e); }
    return r;
  }

  /* ═════════════ Regularizar varias novedades a la vez (por ejemplo: «compramos el kit de emergencia») ═════════════ */
  async function loteNovedades(env, yo, b) {
    exigirMando(yo);
    const ids = Array.isArray(b.ids) ? [...new Set(b.ids.map(String))].slice(0, 60) : [];
    if (!ids.length) throw new ErrorApi('Elige al menos una novedad.');
    const nota = texto(b.nota, 200), acc = b.accion, ahora = ahoraLima();
    if (acc !== 'plazo' && nota.length < 3) throw new ErrorApi(acc === 'resolver' ? 'Escribe cómo se regularizaron.' : 'Escribe dónde o quién las repara.');
    if (acc === 'plazo' && (!RE_F.test(String(b.compromiso || '')) || b.compromiso < hoy())) throw new ErrorApi('Elige una fecha de compromiso desde hoy.');
    const s0 = await reservarSeq(env, ids.length);
    const sql = acc === 'resolver' ? "UPDATE chk_novedades SET estado='resuelta', resuelta_en=?, resuelta_por=?, resuelta_como='manual', resuelta_nota=?, seq=? WHERE id=? AND estado<>'resuelta'"
      : acc === 'reparacion' ? "UPDATE chk_novedades SET estado='en_reparacion', taller_nota=?, taller_por=?, taller_en=?, compromiso=COALESCE(?, compromiso), seq=? WHERE id=? AND estado='abierta'"
      : acc === 'plazo' ? "UPDATE chk_novedades SET compromiso=?, compromiso_por=?, seq=? WHERE id=? AND estado<>'resuelta'" : null;
    if (!sql) throw new ErrorApi('Acción no válida');
    const comp = RE_F.test(String(b.compromiso || '')) ? b.compromiso : null;
    const res = await env.DB.batch(ids.map((id, i) => env.DB.prepare(sql).bind(...(acc === 'resolver' ? [ahora, yo.nombre, nota, s0 + i, id] : acc === 'reparacion' ? [nota, yo.nombre, ahora, comp, s0 + i, id] : [comp, yo.nombre, s0 + i, id]))));
    const n = res.reduce((t, x) => t + ((x.meta && x.meta.changes) || 0), 0);
    await auditar(env, yo.nombre, 'chk_novedades_lote', `${acc} · ${n} novedad(es)${nota ? ' · ' + nota : ''}${comp ? ' · compromiso ' + comp : ''}`);
    return { cambiadas: n };
  }

  /* ═════════════ v7.2 → v5: lo cargado antes (documentos, mantenimientos) y el historial del Excel ═════════════ */
  async function sembrarV7(env) {
    const p = await parametros(env), ahora = ahoraLima(), st = [];
    const s0 = await reservarSeq(env, 8);
    let i = 0;
    for (const d of SEMILLA_V7.docs) {
      const hay = await env.DB.prepare('SELECT 1 FROM flota_docs WHERE placa = ? AND tipo = ? AND anulado = 0 LIMIT 1').bind(p.placa, d.tipo).first();
      if (!hay) st.push(env.DB.prepare(`INSERT OR IGNORE INTO flota_docs (id, placa, tipo, numero, entidad, emision, vencimiento, datos, notas, vigente, anulado, creado_por, creado_en, seq) VALUES (?,?,?,?,?,?,?,?,?,1,0,'App v7.2',?,?)`)
        .bind(d.id, p.placa, d.tipo, d.numero, d.entidad, d.emision, d.vencimiento, JSON.stringify(d.datos), d.notas, ahora, s0 + i++));
    }
    for (const m of SEMILLA_V7.mant) st.push(env.DB.prepare(`INSERT OR IGNORE INTO flota_mant (id, placa, fecha, km, tipo, taller, detalle, costo, responsable, novedades, anulado, creado_por, creado_en, seq) VALUES (?,?,?,?,'preventivo',?,?,NULL,?,'',0,'App v7.2',?,?)`)
      .bind(m.id, p.placa, m.fecha, m.km, m.taller, m.detalle, m.responsable, ahora, s0 + i++));
    if (st.length) await env.DB.batch(st);
  }
  /** Recibe hasta 4 filas de la hoja «Inspecciones» ya leídas en el teléfono y las guarda como checklists del historial (sin avisos). */
  async function importarV7(env, yo, b) {
    exigirMando(yo);
    const filas = Array.isArray(b.filas) ? b.filas.slice(0, 4) : [];
    // Hojas «Mantenimientos» y «Config» (SOAT y tarjeta de circulación): sin duplicar lo que ya está.
    const extra = { mant: 0, docs: 0 };
    if (Array.isArray(b.mant) || b.config) {
      const p = await parametros(env), ahora = ahoraLima(), st = [];
      const dmy = (t) => { const m = String(t || '').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/); return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : (RE_F.test(String(t || '')) ? t : null); };
      const ms = (b.mant || []).slice(0, 40).filter(m => RE_F.test(String(m.fecha || '')) && ent(m.km) > 0);
      const s0 = await reservarSeq(env, ms.length + 2);
      ms.forEach((m, i) => st.push(env.DB.prepare(`INSERT OR IGNORE INTO flota_mant (id, placa, fecha, km, tipo, taller, detalle, costo, responsable, novedades, anulado, creado_por, creado_en, seq) VALUES (?,?,?,?,?,?,?,NULL,?,'',0,'App v7.2',?,?)`)
        .bind('v7-mant-' + String(m.id || m.fecha + '-' + ent(m.km)).replace(/[^\w-]/g, ''), p.placa, m.fecha, ent(m.km), /correct|repar/i.test(m.obs || '') ? 'correctivo' : 'preventivo', texto(m.taller, 60) || '—', texto(m.obs, 300) || null, texto(m.operador, 40) || null, ahora, s0 + i)));
      const c = b.config || {};
      const docsV7 = [];
      if (c.soat && c.soat.vencimiento) docsV7.push({ id: 'v7-doc-soat', tipo: 'soat', numero: c.soat.poliza, entidad: c.soat.aseguradora, emision: dmy(c.soat.inicio), vencimiento: dmy(c.soat.vencimiento), notas: (c.soat.obs ? c.soat.obs + ' · ' : '') + 'Importado de la app v7.2', datos: {} });
      if (c.tc && c.tc.vencimiento) docsV7.push({ id: 'v7-doc-tc', tipo: 'tarjeta_circulacion', numero: c.tc.numero, entidad: c.tc.empresa, emision: dmy(c.tc.expedicion), vencimiento: dmy(c.tc.vencimiento), notas: 'Importado de la app v7.2', datos: { cert_hv: c.tc.cert || '', partida: c.tc.partreg || '' } });
      for (const [i, d] of docsV7.entries()) {
        if (!d.vencimiento || await env.DB.prepare('SELECT 1 FROM flota_docs WHERE placa = ? AND tipo = ? AND anulado = 0 LIMIT 1').bind(p.placa, d.tipo).first()) continue;
        st.push(env.DB.prepare(`INSERT OR IGNORE INTO flota_docs (id, placa, tipo, numero, entidad, emision, vencimiento, datos, notas, vigente, anulado, creado_por, creado_en, seq) VALUES (?,?,?,?,?,?,?,?,?,1,0,'App v7.2',?,?)`)
          .bind(d.id, p.placa, d.tipo, texto(d.numero, 40) || null, texto(d.entidad, 60) || null, d.emision, d.vencimiento, JSON.stringify(d.datos), d.notas, ahora, s0 + ms.length + i));
        extra.docs++;
      }
      if (st.length) { const r = await env.DB.batch(st); extra.mant = r.slice(0, ms.length).reduce((t, x) => t + ((x.meta && x.meta.changes) || 0), 0); }
    }
    const ops = (await env.DB.prepare("SELECT id, nombre FROM usuarios WHERE activo = 1").all()).results;
    // La revisión técnica aún no exigible no es una novedad (en la v7.2 se marcaba «Vencido» por costumbre).
    const rt = await env.DB.prepare("SELECT datos FROM flota_docs WHERE tipo = 'revision_tecnica' AND vigente = 1 AND anulado = 0 LIMIT 1").first();
    const rtDesde = rt ? (json(rt.datos, {}).exigible_desde || '') : '';
    const out = [];
    for (const f of filas) {
      try {
        const nombre = texto(f.operador, 60), primero = normV7(nombre).split(' ')[0];
        const u = ops.find(x => normV7(x.nombre).split(' ')[0] === primero);
        const items = {}; CLAVES.forEach(k => { items[k] = { e: 'c' }; });
        const sinMapa = [];
        const marca = (txt, e) => String(txt || '').split(' | ').forEach(t => {
          t = t.trim(); if (!t) return;
          let nom = t, nota = '';
          const fal = t.match(/›\s*(.+?)(?:\s*::\s*(.*))?$/);
          if (fal) { nom = fal[1]; nota = fal[2] || ''; } else { const i = t.indexOf(': '); if (i > 0) { nom = t.slice(0, i); nota = t.slice(i + 2); } }
          const k = MAPA_V7[normV7(nom)];
          if (!k) { sinMapa.push(nom); return; }
          if (e === 'o' && items[k].e === 'f') { if (nota && !items[k].n) items[k].n = nota; return; }
          items[k] = { e, n: nota || items[k].n || '' };
        });
        marca(f.fallas, 'f'); marca(f.obs, 'o');
        if (rtDesde && String(f.fecha).slice(0, 10) < rtDesde && items['doc-05'].e !== 'c') items['doc-05'] = { e: 'c' };
        const r = await crearInspeccion(env, yo, { id: f.id, tipo: f.tipo === 'post' ? 'post' : 'pre', fecha: f.fecha, lugar: texto(f.lugar, 60) || '(sin lugar en la v7.2)', km: f.km,
          motivo: 'ruta', salida_prevista: f.salida_prevista, items, plantilla: PLANTILLA.version }, { importar: true, operador: u ? { id: u.id, nombre: u.nombre } : { id: yo.id, nombre: nombre || yo.nombre } });
        out.push({ id: f.id, ok: true, duplicado: !!r.duplicado, aptitud: r.aptitud, km_alerta: r.km_alerta || '', sin_mapa: sinMapa });
      } catch (e) { out.push({ id: f.id, ok: false, error: e.message }); }
    }
    if (b.ultimo) await auditar(env, yo.nombre, 'chk_importar_v7', `Historial de la v7.2: ${b.total || out.length} filas`);
    return { resultados: out, ...extra };
  }

  /* ═════════════ Indicadores ═════════════ */
  async function indicadores(env, yo, url) {
    exigirMando(yo);
    const p = await parametros(env), placa = p.placa, dias = [7, 30, 90, 180, 365].includes(Number(url.searchParams.get('dias'))) ? Number(url.searchParams.get('dias')) : 30;
    const h0 = hoy(), desde = sumarDias(h0, -(dias - 1));
    // Indicadores sobre checklists de SALIDA (las llegadas solo existen en el historial de la v7.2; su km sí cuenta para el recorrido).
    const todas = (await env.DB.prepare("SELECT id, tipo, substr(fecha,1,10) d, fecha, aptitud, duracion_seg, km, km_alerta, ref_pre, operador, conformes, observaciones, fallas, min_antes, a_tiempo, origen FROM chk_inspecciones WHERE placa = ? AND estado='activa' AND substr(fecha,1,10) BETWEEN ? AND ? ORDER BY fecha").bind(placa, desde, h0).all()).results;
    const insp = todas.filter(x => x.tipo === 'pre');
    const n = insp.length, cnt = { apto: 0, obs: 0, fallas: 0, no: 0 };
    insp.forEach(x => { cnt[x.aptitud] = (cnt[x.aptitud] || 0) + 1; });
    const pres = insp;
    const medidos = pres.filter(x => x.a_tiempo !== null && x.a_tiempo !== undefined), aTiempo = medidos.filter(x => x.a_tiempo === 1);
    const antes = medidos.map(x => x.min_antes).sort((a, b) => a - b);
    const durs = insp.map(x => x.duracion_seg).filter(x => x > 0).sort((a, b) => a - b);
    const mediana = durs.length ? durs[Math.floor(durs.length / 2)] : null;
    const expres = insp.filter(x => x.duracion_seg && x.duracion_seg < 180).length;
    // Cumplimiento: días con actividad (ingresos del operador o salida de excursión) que tuvieron un pre-ruta.
    const act = new Set((await env.DB.prepare("SELECT DISTINCT substr(m.fecha,1,10) d FROM movimientos m JOIN usuarios u ON u.id = m.usuario_id WHERE m.estado='activo' AND m.tipo='ingreso' AND u.rol='operador' AND substr(m.fecha,1,10) BETWEEN ? AND ?").bind(desde, h0).all()).results.map(r => r.d));
    (await env.DB.prepare("SELECT DISTINCT substr(replace(salida,'T',' '),1,10) d FROM excursiones WHERE estado IN ('en_ruta','finalizada') AND substr(replace(salida,'T',' '),1,10) BETWEEN ? AND ?").bind(desde, h0).all()).results.forEach(r => act.add(r.d));
    const conPre = new Set(pres.map(x => x.d));
    const diasAct = [...act], cubiertos = diasAct.filter(d => conPre.has(d)).length;
    const sinChecklist = diasAct.filter(d => !conPre.has(d)).sort().reverse().slice(0, 10);
    // Novedades
    const nov = (await env.DB.prepare('SELECT * FROM chk_novedades WHERE placa = ? AND (estado <> \'resuelta\' OR resuelta_en >= ? OR abierta_en >= ?)').bind(placa, desde, desde).all()).results;
    const abiertas = nov.filter(x => x.estado !== 'resuelta'), nuevas = nov.filter(x => x.abierta_en.slice(0, 10) >= desde);
    const resueltasP = nov.filter(x => x.estado === 'resuelta' && x.resuelta_en.slice(0, 10) >= desde);
    const mttrH = resueltasP.length ? Math.round(resueltasP.reduce((s, x) => s + Math.max(0, msLima(x.resuelta_en) - msLima(x.abierta_en)) / 36e5, 0) / resueltasP.length) : null;
    const mttr = mttrH === null ? null : Math.round(mttrH / 24 * 10) / 10;
    const reinc = nuevas.length ? Math.round(nuevas.filter(x => x.reincide_de).length / nuevas.length * 100) : null;
    const top = (await env.DB.prepare('SELECT item, nombre, categoria, prioridad, SUM(veces) veces, COUNT(*) episodios FROM chk_novedades WHERE placa = ? AND ultima_en >= ? GROUP BY item ORDER BY veces DESC LIMIT 6').bind(placa, desde).all()).results;
    const porCat = (await env.DB.prepare('SELECT categoria, COUNT(*) n, SUM(CASE WHEN severidad=\'f\' THEN 1 ELSE 0 END) f FROM chk_novedades WHERE placa = ? AND ultima_en >= ? GROUP BY categoria ORDER BY n DESC').bind(placa, desde).all()).results;
    // Disponibilidad: días del período sin una falla crítica abierta.
    const crit = (await env.DB.prepare("SELECT abierta_en, resuelta_en FROM chk_novedades WHERE placa = ? AND severidad='f' AND prioridad='C' AND abierta_en <= ? AND (resuelta_en IS NULL OR resuelta_en >= ?)").bind(placa, h0 + ' 23:59:59', desde).all()).results;
    let diasNo = 0;
    for (let i = 0; i < dias; i++) { const d = sumarDias(desde, i); if (crit.some(c => c.abierta_en.slice(0, 10) <= d && (!c.resuelta_en || c.resuelta_en.slice(0, 10) > d))) diasNo++; }
    // Kilometraje del período y mantenimiento
    const kms = todas.filter(x => !x.km_alerta || x.km_alerta === 'menor').map(x => x.km).filter(Boolean);
    const kmPeriodo = kms.length > 1 ? Math.max(...kms) - Math.min(...kms) : 0;
    const mcost = await env.DB.prepare('SELECT COUNT(*) n, COALESCE(SUM(costo),0) s FROM flota_mant WHERE placa = ? AND anulado = 0 AND fecha BETWEEN ? AND ?').bind(placa, desde, h0).first();
    // Tendencia semanal (12 semanas): inspecciones por aptitud
    const semanas = []; const lunes = (ymd) => { const t = new Date(ymdUTC(ymd)); const w = (t.getUTCDay() + 6) % 7; return sumarDias(ymd, -w); };
    const l0 = lunes(h0);
    for (let i = 11; i >= 0; i--) semanas.push({ desde: sumarDias(l0, -7 * i), apto: 0, obs: 0, fallas: 0, no: 0, pre: 0 });
    const ins12 = (await env.DB.prepare("SELECT substr(fecha,1,10) d, aptitud, tipo FROM chk_inspecciones WHERE placa = ? AND estado='activa' AND tipo='pre' AND substr(fecha,1,10) >= ?").bind(placa, semanas[0].desde).all()).results;
    ins12.forEach(x => { const s = semanas.find((w, i) => x.d >= w.desde && (i === 11 || x.d < semanas[i + 1].desde)); if (s) { s[x.aptitud]++; if (x.tipo === 'pre') s.pre++; } });
    const porOperador = {}; insp.forEach(x => { const o = porOperador[x.operador] = porOperador[x.operador] || { operador: x.operador, n: 0, dur: [], expres: 0 }; o.n++; if (x.duracion_seg) o.dur.push(x.duracion_seg); if (x.duracion_seg && x.duracion_seg < 180) o.expres++; });
    return { dias, desde, hasta: h0, total: n, por_aptitud: cnt, pct_apto: n ? Math.round((cnt.apto + cnt.obs) / n * 100) : null, pre: pres.length, post: todas.filter(x => x.tipo === 'post').length,
      puntualidad: { medidos: medidos.length, a_tiempo: aTiempo.length, pct: medidos.length ? Math.round(aTiempo.length / medidos.length * 100) : null, mediana_min: antes.length ? antes[Math.floor(antes.length / 2)] : null,
        tarde: medidos.filter(x => x.min_antes < p.chk_anticipacion_min - 5).length, anticipacion: p.chk_anticipacion_min, temprano: medidos.filter(x => x.min_antes > p.chk_ventana_min + 10).length, ventana: p.chk_ventana_min },
      regularizar: (() => { const ab = abiertas.map(x => ({ ...x, ...plazoNov(x, p) })); const enPlazo = resueltasP.filter(x => x.resuelta_en.slice(0, 10) <= (x.compromiso || sumarDias(x.abierta_en.slice(0, 10), PLAZO[x.prioridad] || 15)));
        return { pendientes: ab.length, vencidas: ab.filter(x => x.atrasada).length, escaladas: ab.filter(x => x.escalada).length, con_compromiso: ab.filter(x => x.compromiso).length,
          pct_en_plazo: resueltasP.length ? Math.round(enPlazo.length / resueltasP.length * 100) : null, mas_antigua: ab.length ? ab.reduce((m, x) => x.dias_plazo < m.dias_plazo ? x : m) : null }; })(),
      historial_v7: todas.filter(x => x.origen === 'v7').length,
      cumplimiento: { dias_actividad: diasAct.length, cubiertos, pct: diasAct.length ? Math.round(cubiertos / diasAct.length * 100) : null, sin_checklist: sinChecklist },
      tiempo: { mediana_seg: mediana, expres }, disponibilidad: { pct: Math.round((dias - diasNo) / dias * 100), dias_no_apta: diasNo },
      novedades: { abiertas: abiertas.length, criticas: abiertas.filter(x => x.severidad === 'f' && x.prioridad === 'C').length, en_reparacion: abiertas.filter(x => x.estado === 'en_reparacion').length,
        nuevas: nuevas.length, resueltas: resueltasP.length, mttr_dias: mttr, mttr_horas: mttrH, reincidencia_pct: reinc, antiguedad_max: abiertas.length ? Math.max(...abiertas.map(x => diasEntre(x.abierta_en, h0))) : 0,
        resueltas_por: { inspeccion: resueltasP.filter(x => x.resuelta_como === 'inspeccion').length, mantenimiento: resueltasP.filter(x => x.resuelta_como === 'mantenimiento').length, manual: resueltasP.filter(x => x.resuelta_como === 'manual').length } },
      top_items: top, por_categoria: porCat, km: { periodo: kmPeriodo, por_dia: kmPeriodo ? Math.round(kmPeriodo / dias) : 0 },
      mantenimiento: { servicios: mcost.n, costo: r2(mcost.s), costo_km: kmPeriodo && mcost.s ? r2(mcost.s / kmPeriodo) : null }, semanas,
      operadores: Object.values(porOperador).map(o => ({ operador: o.operador, n: o.n, expres: o.expres, mediana_seg: o.dur.length ? o.dur.sort((a, b) => a - b)[Math.floor(o.dur.length / 2)] : null })) };
  }

  async function archivo(env, yo, id) {
    // Fotos de documentos y mantenimientos: todo el equipo (Jorge las muestra en un control). Evidencias de checklist: el autor y los administradores.
    const ok = (await env.DB.prepare('SELECT 1 FROM flota_docs WHERE foto_id = ? UNION ALL SELECT 1 FROM flota_mant WHERE foto_id = ? LIMIT 1').bind(id, id).first())
      || (await env.DB.prepare(`SELECT 1 FROM chk_inspecciones WHERE fotos LIKE ? ${esMando(yo) ? '' : 'AND operador_id = ?'} LIMIT 1`).bind(...(esMando(yo) ? ['%' + id + '%'] : ['%' + id + '%', yo.id])).first())
      || (esMando(yo) && await env.DB.prepare('SELECT 1 FROM chk_novedades WHERE foto_id = ? LIMIT 1').bind(id).first());
    if (!ok) throw new ErrorApi('Archivo no encontrado', 'NO_EXISTE', 404);
    const f = await env.DB.prepare('SELECT mime, datos FROM comprobantes WHERE id = ?').bind(id).first();
    if (!f) throw new ErrorApi('Archivo no encontrado', 'NO_EXISTE', 404);
    return new Response(new Uint8Array(f.datos), { headers: { 'content-type': f.mime, 'cache-control': 'private, max-age=604800' } });
  }

  async function rutas(env, yo, req, url) {
    const p = url.pathname, m = req.method;
    if (!p.startsWith('/api/flota')) return undefined;
    const cuerpo = () => req.json().catch(() => ({}));
    if (p === '/api/flota/estado' && m === 'GET') return estado(env, yo);
    if (p === '/api/flota/novedades/lote' && m === 'POST') return loteNovedades(env, yo, await cuerpo());
    if (p === '/api/flota/importar-v7' && m === 'POST') return importarV7(env, yo, await cuerpo());
    if (p === '/api/flota/inspecciones' && m === 'GET') return listar(env, yo, url);
    if (p === '/api/flota/inspecciones' && m === 'POST') return crearInspeccion(env, yo, await cuerpo());
    let r = p.match(/^\/api\/flota\/inspecciones\/([\w-]+)(?:\/(revisar|anular))?$/);
    if (r && !r[2] && m === 'GET') return detalle(env, yo, r[1]);
    if (r && r[2] === 'revisar' && m === 'POST') return revisar(env, yo, r[1], await cuerpo());
    if (r && r[2] === 'anular' && m === 'POST') return anular(env, yo, r[1], await cuerpo());
    if (p === '/api/flota/novedades' && m === 'GET') return novedades(env, yo, url);
    r = p.match(/^\/api\/flota\/novedades\/([\w-]+)$/);
    if (r && m === 'POST') return accionNovedad(env, yo, r[1], await cuerpo());
    if (p === '/api/flota/docs' && m === 'GET') return historialDocs(env, yo, url);
    if (p === '/api/flota/docs' && m === 'POST') return guardarDoc(env, yo, null, await cuerpo());
    r = p.match(/^\/api\/flota\/docs\/([\w-]+)$/);
    if (r && m === 'PATCH') return guardarDoc(env, yo, r[1], await cuerpo());
    if (r && m === 'DELETE') return quitarDoc(env, yo, r[1]);
    if (p === '/api/flota/mant' && m === 'POST') return guardarMant(env, yo, await cuerpo());
    r = p.match(/^\/api\/flota\/mant\/([\w-]+)\/anular$/);
    if (r && m === 'POST') return anularMant(env, yo, r[1], await cuerpo());
    if (p === '/api/flota/parametros' && m === 'POST') return guardarParametros(env, yo, await cuerpo());
    if (p === '/api/flota/indicadores' && m === 'GET') return indicadores(env, yo, url);
    r = p.match(/^\/api\/flota\/excursion\/([\w-]+)$/);
    if (r && m === 'GET') { exigirMando(yo); return checklistDe(env, r[1]); }
    r = p.match(/^\/api\/flota\/archivo\/([\w-]+)$/);
    if (r && m === 'GET') return archivo(env, yo, r[1]);
    if (p === '/api/flota/alertas' && m === 'POST') { exigirMando(yo); return revisarAlertas(env); }
    return undefined;
  }

  return { rutas, crearInspeccion, revisarAlertas, exigirSalida, enlazar, checklistDe, sembrarV7, PARAM_DEF };
}
