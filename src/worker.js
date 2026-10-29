/**
 * Villa Azul · Turismo & Excursiones — API (Cloudflare Worker + D1)
 * Fase 1: plataforma. Acceso con PIN, usuarios, sincronización sin señal e importador del Excel.
 *
 * El mismo Worker sirve la app (carpeta public/) y la API (/api/*).
 * La base de datos se crea sola la primera vez que arranca: no hace falta consola.
 */

import { SQL_EXC, SQL_EXC_V5, SQL_EXC_V6, crearExcursiones } from './excursiones.js';
import { SQL_CAJA_V4, crearCaja } from './caja.js';
import { SQL_COT_V7, SQL_COT_V8, SQL_COT_V9, SQL_COT_V13, SQL_COT_V14, crearCotizador } from './cotizador.js';
import { crearPanel } from './panel.js';
import { SQL_SOL_V10, WHATSAPP_EMPRESA, crearSolicitudes } from './solicitudes.js';
import { SQL_FLOTA_V11, SQL_FLOTA_V12, crearFlota } from './flota.js';

const VERSION = '5.3.0';
const SCHEMA = 12;
const PBKDF2_ITER = 10000;          // el plan gratuito da 10 ms de CPU por petición: más vueltas no caben
const SESION_DIAS = 30;
const MAX_FALLOS = 5, BLOQUEO_SEG = 30;

/* ═════════════ Tablas que vienen del Excel ═════════════
   hoja: nombre de la pestaña · pk: clave primaria · cols: [columna_excel, columna_d1]
   num: columnas numéricas · bool: verdadero/falso. Todo lo demás se guarda como texto. */
const H = (hoja, tabla, pk, cols, num = [], bool = []) => ({ hoja, tabla, pk, cols: cols.map(c => Array.isArray(c) ? c : [c, c]), num, bool });
export const HOJAS = [
  H('Movimientos', 'movimientos', 'uuid', ['uuid','fecha','actividad','viaje_id','placa','tipo','categoria','origen','destino','zona','dni','peso_kg','galones','medio_pago','cuenta','lo_puso_operador','cantidad','monto','tarifa_sugerida','diferencia','descripcion','usuario','estado','ref_uuid','motivo','creado_en','modificado_por','modificado_en'],
    ['peso_kg','galones','cantidad','monto','tarifa_sugerida','diferencia'], ['lo_puso_operador']),
  H('Viajes', 'viajes', 'id', ['id','fecha','actividad','placa','operador','origen','destino','tipo_salida','agencia_despacho','hora_salida','hora_llegada','estado','observacion','creado_en','empresa_agencia']),
  H('Cierres', 'cierres', 'id', ['id','fecha','operador','placas','viajes','efectivo_sistema','efectivo_declarado','diferencia','digital_sistema','digital_declarado','diferencia_digital','adelanto_operador','n_movimientos','estado','observacion','cerrado_en','reabierto_por','reabierto_en','verificado_por','verificado_en','efectivo_recibido','diferencia_final'],
    ['efectivo_sistema','efectivo_declarado','diferencia','digital_sistema','digital_declarado','diferencia_digital','adelanto_operador','n_movimientos','efectivo_recibido','diferencia_final']),
  H('Traspasos', 'traspasos', 'uuid', ['uuid','fecha','cuenta_origen','cuenta_destino','monto','motivo','tipo','declarado_por','confirmado_por','confirmado_en','estado','ref','creado_en'], ['monto']),
  H('Cuentas', 'cuentas', 'clave', ['clave','nombre','dueno','tipo','transitoria','computa_empresa','saldo_inicial','fecha_corte','activo'], ['saldo_inicial'], ['transitoria','computa_empresa','activo']),
  H('Agencias', 'agencias', 'paradero', ['paradero','pct_taquilla','pct_encomienda','categoria_gasto','activo'], ['pct_taquilla','pct_encomienda'], ['activo']),
  H('Empresas_Agencia', 'empresas_agencia', 'clave', ['clave','nombre','modo_taquilla','valor_taquilla','modo_encomienda','valor_encomienda','paraderos','activo'], ['valor_taquilla','valor_encomienda'], ['activo']),
  H('Temporadas', 'temporadas', 'clave', ['clave','nombre','desde','hasta','tramos','tarifa','factor','activo'], ['tarifa','factor'], ['activo']),
  H('Alias', 'alias', 'nombre_viejo', ['nombre_viejo','nombre_oficial','activo'], [], ['activo']),
  H('Cat_Ingresos', 'cat_ingresos', 'clave', ['clave','nombre','requiere_ruta','requiere_peso','activo'], [], ['requiere_ruta','requiere_peso','activo']),
  H('Cat_Egresos', 'cat_egresos', 'clave', ['clave','nombre','activo'], [], ['activo']),
  H('Rutas', 'rutas', 'nombre', ['orden','nombre','nombre_largo','es_agencia','activo'], ['orden'], ['es_agencia','activo']),
  H('Unidades', 'unidades', 'placa', ['placa','actividad','marca_modelo','anio','capacidad','activo','observacion'], ['anio','capacidad'], ['activo']),
  H('Tarifas', 'tarifas', 'clave', ['clave','origen','destino','tarifa','techo','negociable','activo'], ['tarifa','techo'], ['negociable','activo']),
  H('Actividades', 'actividades', 'clave', ['clave','nombre','activo'], [], ['activo']),
  H('Config', 'config', 'clave', ['clave','valor']),
  H('Excursiones', 'excursiones', 'id', ['id','codigo','titulo','tipo','cliente','cliente_tel','origen','destino','via','salida','retorno','precio_asiento','monto_contrato','asientos_total','bloqueados','estado','whatsapp','instrucciones_pago','vence_horas','cierre_reservas','km_inicio','km_fin','notas','creado_por','creado_en','actualizado_en'],
    ['precio_asiento','monto_contrato','asientos_total','vence_horas','km_inicio','km_fin']),
  H('Exc_Pasajeros', 'exc_pasajeros', 'id', ['id','excursion_id','asiento','nombre','dni','celular','grupo','estado','origen_registro','precio','creado_en','vence_en','actualizado_por','actualizado_en','nota'], ['asiento','precio']),
  H('Exc_Movimientos', 'exc_movimientos', 'id', ['id','excursion_id','tipo','categoria','monto','medio','cuenta','pasajero_id','galones','km_odometro','comprobante_tipo','comprobante_num','foto_url','foto_id','descripcion','fecha','registrado_por','registrado_en','anulado','anulado_por','motivo_anulacion'], ['monto','galones','km_odometro'], ['anulado']),
  // Sin clave propia en el Excel: el id es una huella de la fila, así reimportar no duplica.
  H('Auditoria', 'auditoria', 'id', ['id','timestamp','usuario','accion','detalle']),
  H('Correcciones', 'correcciones', 'id', ['id',['pestaña','pestana'],['ubicación','ubicacion'],'campo',['valor anterior','valor_anterior'],['valor nuevo','valor_nuevo'],['por qué','por_que']]),
];
const POR_TABLA = Object.fromEntries(HOJAS.map(h => [h.tabla, h]));

/* Usuarios iniciales. Los id son los del Excel, así cada movimiento histórico conserva su autor.
   Los PIN van cifrados (PBKDF2); jamás en claro. */
const SEMILLA = [
  ['007757b0-de0c-4e23-b3ce-42fe870c56da','Superadmin','superadmin','super','c54feff44bcabbcfff99a45660d3e757','57d27a87ca17c08b2c0071dd62a60a24007f96f416e41fd91ec543b7891d7975',1],
  ['d1281f0b-472e-4585-9bf5-b3eef1cf9812','Jorge','jorge','operador','046a9d745ed062d854a5a3502208fc09','1394d5df96cc6c9422cbb108d8bfd190e72629fa0799a14de378abe732ee9fee',0],
  ['673de36b-2886-41d2-be26-8ef1b55c4f81','Marielena','myaipen','admin','7e4c997d37ceab5aae43fe421d3a9849','d1dc392f344964d63f1f51d9fa6b49d841947ead98f908e63c7217bbb6b8bd56',0],
  ['eb33c444-4d6a-4351-8dea-1bcd44cf9885','Yenner','ychavez','admin','0792c796da65ec8a1c5720be4e1d8a28','e8a3d2cc3436e4694334af4669e18680d4349d033d8ebcddf1302fe536ca4728',0],
];

function sqlEsquema() {
  const t = HOJAS.map(h => {
    const cols = h.cols.map(([, c]) => `"${c}" ${h.num.includes(c) ? 'REAL' : h.bool.includes(c) ? 'INTEGER' : 'TEXT'}${c === h.pk ? ' PRIMARY KEY' : ''}`);
    if (h.tabla === 'movimientos') cols.push('usuario_id TEXT');
    cols.push('seq INTEGER NOT NULL DEFAULT 0');
    return `CREATE TABLE IF NOT EXISTS ${h.tabla} (${cols.join(', ')})`;
  });
  return t.concat([
    'CREATE INDEX IF NOT EXISTS ix_mov_seq ON movimientos(seq)',
    'CREATE INDEX IF NOT EXISTS ix_mov_usuario ON movimientos(usuario_id, fecha)',
    'CREATE INDEX IF NOT EXISTS ix_mov_fecha ON movimientos(fecha)',
    `CREATE TABLE IF NOT EXISTS usuarios (id TEXT PRIMARY KEY, nombre TEXT NOT NULL, legado TEXT, nombre_completo TEXT, dni TEXT, telefono TEXT, licencia TEXT,
       rol TEXT NOT NULL, funcion TEXT, activo INTEGER NOT NULL DEFAULT 1, protegido INTEGER NOT NULL DEFAULT 0,
       pin_salt TEXT NOT NULL, pin_hash TEXT NOT NULL, pin_iter INTEGER NOT NULL, creado_en TEXT, actualizado_en TEXT, seq INTEGER NOT NULL DEFAULT 0)`,
    'CREATE UNIQUE INDEX IF NOT EXISTS ux_usuario_nombre ON usuarios(nombre COLLATE NOCASE)',
    'CREATE TABLE IF NOT EXISTS sesiones (token_hash TEXT PRIMARY KEY, usuario_id TEXT NOT NULL, creado_en TEXT NOT NULL, expira_en TEXT NOT NULL, agente TEXT)',
    'CREATE TABLE IF NOT EXISTS intentos (usuario_id TEXT PRIMARY KEY, fallos INTEGER NOT NULL DEFAULT 0, bloqueado_hasta INTEGER NOT NULL DEFAULT 0)',
    'CREATE TABLE IF NOT EXISTS meta (clave TEXT PRIMARY KEY, valor TEXT)',
  ], SQL_EXC);
}

let listo = false;
async function migrar(env) {
  if (listo) return;
  let v = 0;
  try { const r = await env.DB.prepare("SELECT valor FROM meta WHERE clave='schema'").first(); v = r ? Number(r.valor) : 0; } catch (e) { v = 0; }
  if (v < 2) {
    const ahora = ahoraLima();
    const st = sqlEsquema().map(s => env.DB.prepare(s));
    st.push(env.DB.prepare("INSERT OR IGNORE INTO meta (clave, valor) VALUES ('seq', '0')"));
    for (const [id, nombre, legado, rol, salt, hash, prot] of SEMILLA) {
      st.push(env.DB.prepare('INSERT OR IGNORE INTO usuarios (id,nombre,legado,rol,activo,protegido,pin_salt,pin_hash,pin_iter,creado_en,actualizado_en,seq) VALUES (?,?,?,?,1,?,?,?,?,?,?,1)')
        .bind(id, nombre, legado, rol, prot, salt, hash, PBKDF2_ITER, ahora, ahora));
    }
    st.push(env.DB.prepare("INSERT OR REPLACE INTO meta (clave, valor) VALUES ('schema', '2')"));
    await env.DB.batch(st);
  }
  if (v < 3) {
    // v2.1: tema por persona, foto en cualquier registro y revisión de comprobantes.
    for (const sql of ['ALTER TABLE usuarios ADD COLUMN tema TEXT', 'ALTER TABLE movimientos ADD COLUMN foto_id TEXT', 'ALTER TABLE movimientos ADD COLUMN foto_repetida INTEGER',
      'ALTER TABLE movimientos ADD COLUMN revisado_por TEXT', 'ALTER TABLE movimientos ADD COLUMN revisado_en TEXT', 'ALTER TABLE comprobantes ADD COLUMN huella TEXT']) {
      try { await env.DB.prepare(sql).run(); } catch (e) { if (!/duplicate column/i.test(String(e.message))) throw e; }
    }
    await env.DB.batch([
      env.DB.prepare('CREATE INDEX IF NOT EXISTS ix_comp_huella ON comprobantes(huella)'),
      env.DB.prepare("INSERT OR REPLACE INTO meta (clave, valor) VALUES ('schema', '3')"),
    ]);
  }
  if (v < 4) {
    // v3.0: caja diaria con verificación por función (efectivo / Yape).
    for (const sql of SQL_CAJA_V4) {
      try { await env.DB.prepare(sql).run(); } catch (e) { if (!/duplicate column/i.test(String(e.message))) throw e; }
    }
    const fn = [['673de36b-2886-41d2-be26-8ef1b55c4f81', 'caja'], ['eb33c444-4d6a-4351-8dea-1bcd44cf9885', 'digital'], ['007757b0-de0c-4e23-b3ce-42fe870c56da', 'caja'], ['d1281f0b-472e-4585-9bf5-b3eef1cf9812', 'operador']];
    await env.DB.batch(fn.map(([id, f]) => env.DB.prepare("UPDATE usuarios SET funcion=? WHERE id=? AND (funcion IS NULL OR funcion='')").bind(f, id))
      .concat([env.DB.prepare("INSERT OR REPLACE INTO meta (clave, valor) VALUES ('schema', '4')")]));
  }
  if (v < 5) {
    // v3.1: pago con voucher y boleto digital.
    for (const sql of SQL_EXC_V5) {
      try { await env.DB.prepare(sql).run(); } catch (e) { if (!/duplicate column/i.test(String(e.message))) throw e; }
    }
    await env.DB.prepare("INSERT OR REPLACE INTO meta (clave, valor) VALUES ('schema', '5')").run();
  }
  if (v < 6) {
    // v3.2: enlace del organizador.
    for (const sql of SQL_EXC_V6) {
      try { await env.DB.prepare(sql).run(); } catch (e) { if (!/duplicate column/i.test(String(e.message))) throw e; }
    }
    await env.DB.prepare("INSERT OR REPLACE INTO meta (clave, valor) VALUES ('schema', '6')").run();
  }
  if (v < 7) {
    // v4.0: cotizador.
    await env.DB.batch(SQL_COT_V7.map(q => env.DB.prepare(q)).concat([env.DB.prepare("INSERT OR REPLACE INTO meta (clave, valor) VALUES ('schema', '7')")]));
  }
  if (v < 8) {
    // v4.1: servicios Estándar/Premium, peajes por sentido y calculador de km.
    for (const sql of SQL_COT_V8) {
      try { await env.DB.prepare(sql).run(); } catch (e) { if (!/duplicate column/i.test(String(e.message))) throw e; }
    }
    await env.DB.prepare("INSERT OR REPLACE INTO meta (clave, valor) VALUES ('schema', '8')").run();
  }
  if (v < 9) {
    // v4.2: el operador cotiza y avisos para todo el equipo.
    for (const sql of SQL_COT_V9) {
      try { await env.DB.prepare(sql).run(); } catch (e) { if (!/duplicate column/i.test(String(e.message))) throw e; }
    }
    await env.DB.prepare("UPDATE cotizaciones SET creado_por_id = (SELECT id FROM usuarios u WHERE u.nombre = cotizaciones.creado_por) WHERE creado_por_id IS NULL").run();
    await env.DB.prepare("INSERT OR REPLACE INTO meta (clave, valor) VALUES ('schema', '9')").run();
  }
  if (v < 10) {
    // v4.3: solicitudes de viaje desde el QR y el nuevo WhatsApp de la empresa.
    for (const sql of SQL_SOL_V10) {
      try { await env.DB.prepare(sql).run(); } catch (e) { if (!/duplicate column/i.test(String(e.message))) throw e; }
    }
    await env.DB.prepare("INSERT OR REPLACE INTO config (clave, valor, seq) VALUES ('whatsapp_empresa', ?, ?)").bind(WHATSAPP_EMPRESA, await reservarSeq(env, 1)).run();
    await env.DB.prepare("INSERT OR REPLACE INTO meta (clave, valor) VALUES ('schema', '10')").run();
  }
  if (v < 11) {
    // v5.0: la unidad — checklist pre/post ruta, novedades, documentos y mantenimiento (antes en Google Sheets).
    await env.DB.batch(SQL_FLOTA_V11.map(q => env.DB.prepare(q)));
    const def = { mant_intervalo_km: 5000, mant_alerta_km: 500, mant_intervalo_dias: 180, docs_aviso_dias: 30, chk_exige_salida: 1, chk_ventana_min: 60, chk_anticipacion_min: 30, nov_escalar: 1 };
    const s0 = await reservarSeq(env, Object.keys(def).length);
    await env.DB.batch(Object.keys(def).map((k, i) => env.DB.prepare('INSERT OR IGNORE INTO config (clave, valor, seq) VALUES (?,?,?)').bind(k, String(def[k]), s0 + i))
      .concat([env.DB.prepare("INSERT OR REPLACE INTO meta (clave, valor) VALUES ('schema', '11')")]));
  }
  if (v < 12) {
    // v5.1: checklist solo de salida (hora prevista, a tiempo), plazos de novedades y lo que ya estaba en la app v7.2.
    for (const q of SQL_FLOTA_V12) { try { await env.DB.prepare(q).run(); } catch (e) { if (!/duplicate column/i.test(String(e.message || e))) throw e; } }
    const s0 = await reservarSeq(env, 3);
    await env.DB.batch([
      env.DB.prepare("INSERT OR IGNORE INTO config (clave, valor, seq) VALUES ('chk_ventana_min','60',?)").bind(s0),
      env.DB.prepare("INSERT OR IGNORE INTO config (clave, valor, seq) VALUES ('nov_escalar','1',?)").bind(s0 + 1),
      env.DB.prepare("INSERT OR IGNORE INTO config (clave, valor, seq) VALUES ('chk_anticipacion_min','30',?)").bind(s0 + 2),
      env.DB.prepare("DELETE FROM config WHERE clave = 'chk_vigencia_horas'"),
    ]);
    await FLOTA.sembrarV7(env);
    await env.DB.prepare("INSERT OR REPLACE INTO meta (clave, valor) VALUES ('schema', '12')").run();
  }
  if (v < 13) {
    // v5.2: cotizador con km vacíos y márgenes 30 / 40 / 50 %.
    const s0 = await reservarSeq(env, SQL_COT_V13.length);
    await env.DB.batch(SQL_COT_V13.map((q, i) => env.DB.prepare(q).bind(s0 + i))
      .concat([env.DB.prepare("INSERT OR REPLACE INTO meta (clave, valor) VALUES ('schema', '13')")]));
  }
  if (v < 14) {
    // v5.2.1: la hora de espera se cotiza a S/ 10.
    await env.DB.batch([env.DB.prepare(SQL_COT_V14[0]).bind(await reservarSeq(env, 1)), env.DB.prepare("INSERT OR REPLACE INTO meta (clave, valor) VALUES ('schema', '14')")]);
  }
  listo = true;
}

/* ═════════════ Utilidades ═════════════ */
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
const ok = (data) => json({ ok: true, data });
const fallo = (error, codigo = 'ERROR', status = 400) => json({ ok: false, error, codigo }, status);
class ErrorApi extends Error { constructor(m, c = 'ERROR', s = 400) { super(m); this.codigo = c; this.status = s; } }

function ahoraLima(d = new Date()) {
  // Perú no tiene horario de verano: UTC-5 fijo.
  return new Date(d.getTime() - 5 * 3600000).toISOString().replace('T', ' ').slice(0, 19);
}
const hex = (buf) => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
const deHex = (h) => new Uint8Array(h.match(/../g).map(x => parseInt(x, 16)));
async function derivar(pin, saltHex, iter = PBKDF2_ITER) {
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits']);
  return hex(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: deHex(saltHex), iterations: iter }, k, 256));
}
const azar = (n) => { const a = new Uint8Array(n); crypto.getRandomValues(a); return hex(a.buffer); };
const sha256 = async (t) => hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t)));
function iguales(a, b) { if (a.length !== b.length) return false; let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i); return r === 0; }
const esMando = (u) => u && (u.rol === 'admin' || u.rol === 'super');
const pinValido = (p) => /^\d{4}$/.test(String(p || ''));
const ROL_TXT = { operador: 'Operador', admin: 'Admin', super: 'Superadmin' };

/** Reserva un bloque de números de secuencia: lo que el teléfono pide con «desde=N». */
async function reservarSeq(env, n) {
  const r = await env.DB.prepare("UPDATE meta SET valor = CAST(valor AS INTEGER) + ? WHERE clave='seq' RETURNING valor").bind(n).first();
  return Number(r.valor) - n + 1;
}
async function auditar(env, usuario, accion, detalle) {
  const ts = ahoraLima(), id = await sha256(ts + usuario + accion + detalle + azar(4));
  const s = await reservarSeq(env, 1);
  await env.DB.prepare('INSERT INTO auditoria (id,timestamp,usuario,accion,detalle,seq) VALUES (?,?,?,?,?,?)').bind(id, ts, usuario, accion, detalle, s).run();
}
const publico = (u) => ({ id: u.id, nombre: u.nombre, rol: u.rol, funcion: u.funcion, activo: !!u.activo, protegido: !!u.protegido, legado: u.legado, tema: u.tema || 'auto' });

/* ═════════════ Sesión ═════════════ */
async function sesion(env, req) {
  const t = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!t) throw new ErrorApi('Inicia sesión', 'NO_AUTORIZADO', 401);
  const row = await env.DB.prepare(`SELECT s.expira_en, u.* FROM sesiones s JOIN usuarios u ON u.id = s.usuario_id WHERE s.token_hash = ?`).bind(await sha256(t)).first();
  if (!row || row.expira_en < ahoraLima() || !row.activo) throw new ErrorApi('Tu sesión venció. Entra de nuevo con tu PIN.', 'NO_AUTORIZADO', 401);
  return row;
}
const exigirMando = (u) => { if (!esMando(u)) throw new ErrorApi('Solo un administrador puede hacer esto.', 'SIN_PERMISO', 403); };

async function login(env, b, req) {
  const u = await env.DB.prepare('SELECT * FROM usuarios WHERE id = ?').bind(String(b.id || '')).first();
  if (!u || !u.activo) throw new ErrorApi('Usuario no disponible', 'NO_EXISTE', 404);
  const it = await env.DB.prepare('SELECT * FROM intentos WHERE usuario_id = ?').bind(u.id).first();
  const ahora = Date.now();
  if (it && it.bloqueado_hasta > ahora) throw new ErrorApi(`Demasiados intentos. Espera ${Math.ceil((it.bloqueado_hasta - ahora) / 1000)} s.`, 'BLOQUEADO', 429);
  const h = await derivar(String(b.pin || ''), u.pin_salt, u.pin_iter);
  if (!iguales(h, u.pin_hash)) {
    const fallos = (it ? it.fallos : 0) + 1;
    const bloq = fallos >= MAX_FALLOS ? ahora + BLOQUEO_SEG * 1000 : 0;
    await env.DB.prepare('INSERT OR REPLACE INTO intentos (usuario_id, fallos, bloqueado_hasta) VALUES (?,?,?)').bind(u.id, bloq ? 0 : fallos, bloq).run();
    throw new ErrorApi(bloq ? `Demasiados intentos. Espera ${BLOQUEO_SEG} s.` : 'PIN incorrecto', bloq ? 'BLOQUEADO' : 'PIN', 401);
  }
  const token = azar(32), exp = ahoraLima(new Date(ahora + SESION_DIAS * 864e5));
  await env.DB.batch([
    env.DB.prepare('DELETE FROM intentos WHERE usuario_id = ?').bind(u.id),
    env.DB.prepare('DELETE FROM sesiones WHERE expira_en < ?').bind(ahoraLima()),
    env.DB.prepare('INSERT INTO sesiones (token_hash, usuario_id, creado_en, expira_en, agente) VALUES (?,?,?,?,?)').bind(await sha256(token), u.id, ahoraLima(), exp, (req.headers.get('user-agent') || '').slice(0, 160)),
  ]);
  await auditar(env, u.nombre, 'login', 'Ingreso con PIN');
  // El verificador permite abrir la app sin señal en ESTE teléfono. Solo se entrega a quien ya probó su PIN.
  return { token, usuario: publico(u), verificador: { salt: u.pin_salt, hash: u.pin_hash, iter: u.pin_iter } };
}

/* ═════════════ Usuarios ═════════════ */
async function registrosDe(env, u) {
  const r = await env.DB.prepare('SELECT COUNT(*) n FROM movimientos WHERE usuario_id = ?').bind(u.id).first();
  return r.n;
}
async function mandosActivos(env, excepto) {
  const r = await env.DB.prepare("SELECT COUNT(*) n FROM usuarios WHERE activo = 1 AND rol IN ('admin','super') AND id <> ?").bind(excepto).first();
  return r.n;
}
async function motivoNo(env, accion, yo, u) {
  if (!esMando(yo)) return 'Solo un administrador gestiona usuarios.';
  if (accion === 'desactivar' || accion === 'eliminar') {
    if (u.id === yo.id) return `No puedes ${accion} tu propia cuenta.`;
    if (u.protegido) return 'La cuenta Superadmin está protegida.';
    if (esMando(u) && await mandosActivos(env, u.id) < 1) return 'Debe quedar al menos un administrador activo.';
  }
  if (accion === 'eliminar') { const n = await registrosDe(env, u); if (n > 0) return `Tiene ${n} registros que deben conservar su autor. Desactívalo en su lugar.`; }
  if (accion === 'rol') {
    if (u.id === yo.id) return 'No puedes cambiar tu propio rol.';
    if (u.protegido) return 'La cuenta Superadmin está protegida.';
  }
  return '';
}
async function listarUsuarios(env) {
  const r = await env.DB.prepare(`SELECT u.*, (SELECT COUNT(*) FROM movimientos m WHERE m.usuario_id = u.id) registros,
      (SELECT MAX(timestamp) FROM auditoria a WHERE a.usuario = u.nombre AND a.accion = 'login') ultimo
    FROM usuarios u ORDER BY activo DESC, CASE rol WHEN 'super' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END, nombre`).all();
  return r.results.map(u => ({ ...publico(u), nombre_completo: u.nombre_completo, registros: u.registros, ultimo: u.ultimo }));
}
async function crearUsuario(env, yo, b) {
  exigirMando(yo);
  const nombre = String(b.nombre || '').trim().replace(/\s+/g, ' ').slice(0, 30);
  if (nombre.length < 2) throw new ErrorApi('Escribe el nombre.');
  if (!['operador', 'admin', 'super'].includes(b.rol)) throw new ErrorApi('Rol no válido');
  if (!pinValido(b.pin)) throw new ErrorApi('El PIN debe tener 4 números.');
  if (await env.DB.prepare('SELECT 1 FROM usuarios WHERE nombre = ? COLLATE NOCASE').bind(nombre).first()) throw new ErrorApi('Ya existe un usuario con ese nombre.');
  const id = crypto.randomUUID(), salt = azar(16), hash = await derivar(b.pin, salt), s = await reservarSeq(env, 1), ahora = ahoraLima();
  await env.DB.prepare('INSERT INTO usuarios (id,nombre,legado,rol,funcion,activo,protegido,pin_salt,pin_hash,pin_iter,creado_en,actualizado_en,seq) VALUES (?,?,?,?,?,1,0,?,?,?,?,?,?)')
    .bind(id, nombre, nombre.toLowerCase(), b.rol, b.rol === 'operador' ? 'operador' : 'caja', salt, hash, PBKDF2_ITER, ahora, ahora, s).run();
  await auditar(env, yo.nombre, 'usuario_alta', `${nombre} (${ROL_TXT[b.rol]})`);
  return { id };
}
async function editarUsuario(env, yo, id, b) {
  exigirMando(yo);
  const u = await env.DB.prepare('SELECT * FROM usuarios WHERE id = ?').bind(id).first();
  if (!u) throw new ErrorApi('Usuario no encontrado', 'NO_EXISTE', 404);
  const cambios = {}, notas = [];
  if (b.nombre !== undefined) {
    const n = String(b.nombre).trim().replace(/\s+/g, ' ').slice(0, 30);
    if (n.length < 2) throw new ErrorApi('Escribe al menos 2 letras.');
    if (await env.DB.prepare('SELECT 1 FROM usuarios WHERE nombre = ? COLLATE NOCASE AND id <> ?').bind(n, id).first()) throw new ErrorApi('Ya existe un usuario con ese nombre.');
    cambios.nombre = n; notas.push(`renombró a ${u.nombre} como ${n}`);
  }
  if (b.rol !== undefined && b.rol !== u.rol) {
    if (!['operador', 'admin', 'super'].includes(b.rol)) throw new ErrorApi('Rol no válido');
    const no = await motivoNo(env, 'rol', yo, u); if (no) throw new ErrorApi(no, 'SIN_PERMISO', 403);
    if (esMando(u) && b.rol === 'operador' && u.activo && await mandosActivos(env, u.id) < 1) throw new ErrorApi('Debe quedar al menos un administrador activo.');
    cambios.rol = b.rol; notas.push(`cambió el rol de ${u.nombre} a ${ROL_TXT[b.rol]}`);
  }
  if (b.funcion !== undefined && b.funcion !== u.funcion) {
    if (!['operador', 'caja', 'digital'].includes(b.funcion)) throw new ErrorApi('Función no válida');
    cambios.funcion = b.funcion; notas.push(`asignó a ${u.nombre} la función ${({ operador: 'operador', caja: 'efectivo', digital: 'Yape' })[b.funcion]}`);
  }
  if (b.activo !== undefined && !!b.activo !== !!u.activo) {
    if (!b.activo) { const no = await motivoNo(env, 'desactivar', yo, u); if (no) throw new ErrorApi(no, 'SIN_PERMISO', 403); }
    cambios.activo = b.activo ? 1 : 0; notas.push(`${b.activo ? 'reactivó' : 'desactivó'} a ${u.nombre}`);
  }
  if (!notas.length) return { id };
  cambios.actualizado_en = ahoraLima(); cambios.seq = await reservarSeq(env, 1);
  const keys = Object.keys(cambios);
  const st = [env.DB.prepare(`UPDATE usuarios SET ${keys.map(k => `${k} = ?`).join(', ')} WHERE id = ?`).bind(...keys.map(k => cambios[k]), id)];
  if (cambios.activo === 0) st.push(env.DB.prepare('DELETE FROM sesiones WHERE usuario_id = ?').bind(id));   // desactivar cierra sus sesiones
  await env.DB.batch(st);
  for (const n of notas) await auditar(env, yo.nombre, 'usuario_editar', n);
  return { id };
}
async function resetPin(env, yo, id, b) {
  exigirMando(yo);
  const u = await env.DB.prepare('SELECT * FROM usuarios WHERE id = ?').bind(id).first();
  if (!u) throw new ErrorApi('Usuario no encontrado', 'NO_EXISTE', 404);
  if (!pinValido(b.pin)) throw new ErrorApi('El PIN debe tener 4 números.');
  const salt = azar(16), hash = await derivar(b.pin, salt), s = await reservarSeq(env, 1);
  await env.DB.batch([
    env.DB.prepare('UPDATE usuarios SET pin_salt=?, pin_hash=?, pin_iter=?, actualizado_en=?, seq=? WHERE id=?').bind(salt, hash, PBKDF2_ITER, ahoraLima(), s, id),
    env.DB.prepare('DELETE FROM sesiones WHERE usuario_id = ? AND usuario_id <> ?').bind(id, yo.id),
    env.DB.prepare('DELETE FROM intentos WHERE usuario_id = ?').bind(id),
  ]);
  await auditar(env, yo.nombre, 'usuario_pin', `restableció el PIN de ${u.nombre}`);
  return { id };
}
async function miPin(env, yo, b) {
  // Solo admin y superadmin cambian su propio PIN; al operador se lo cambia un administrador.
  if (!esMando(yo)) throw new ErrorApi('Tu PIN solo lo puede cambiar un administrador.', 'SIN_PERMISO', 403);
  if (!pinValido(b.nuevo)) throw new ErrorApi('El PIN nuevo debe tener 4 números.');
  if (b.nuevo === b.actual) throw new ErrorApi('El PIN nuevo debe ser distinto del actual.');
  if (!iguales(await derivar(String(b.actual || ''), yo.pin_salt, yo.pin_iter), yo.pin_hash)) throw new ErrorApi('El PIN actual no es correcto.', 'PIN');
  const salt = azar(16), hash = await derivar(b.nuevo, salt), s = await reservarSeq(env, 1);
  await env.DB.prepare('UPDATE usuarios SET pin_salt=?, pin_hash=?, pin_iter=?, actualizado_en=?, seq=? WHERE id=?').bind(salt, hash, PBKDF2_ITER, ahoraLima(), s, yo.id).run();
  await auditar(env, yo.nombre, 'usuario_pin', `${yo.nombre} cambió su PIN`);
  return { verificador: { salt, hash, iter: PBKDF2_ITER } };
}
async function eliminarUsuario(env, yo, id) {
  const u = await env.DB.prepare('SELECT * FROM usuarios WHERE id = ?').bind(id).first();
  if (!u) throw new ErrorApi('Usuario no encontrado', 'NO_EXISTE', 404);
  const no = await motivoNo(env, 'eliminar', yo, u); if (no) throw new ErrorApi(no, 'SIN_PERMISO', 403);
  await env.DB.batch([env.DB.prepare('DELETE FROM sesiones WHERE usuario_id = ?').bind(id), env.DB.prepare('DELETE FROM usuarios WHERE id = ?').bind(id)]);
  await auditar(env, yo.nombre, 'usuario_eliminar', `eliminó a ${u.nombre}`);
  return { id };
}

/* ═════════════ Comprobantes y correcciones (v2.1) ═════════════ */
/** Prepara la foto de un comprobante. La huella detecta la MISMA captura subida dos veces (antifuga). */
async function prepararFoto(env, foto) {
  if (!foto || !foto.data) return null;
  const mime = String(foto.mime || 'image/jpeg');
  if (!['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(mime)) throw new ErrorApi('Formato de archivo no admitido');
  let bin;
  try { bin = Uint8Array.from(atob(String(foto.data)), c => c.charCodeAt(0)); } catch (e) { throw new ErrorApi('La foto llegó dañada. Tómala de nuevo.'); }
  if (bin.length > 1500000) throw new ErrorApi('La foto pesa más de 1.5 MB. Tómala de nuevo.');
  const huella = hex(await crypto.subtle.digest('SHA-256', bin));
  const repetida = !!(await env.DB.prepare('SELECT 1 FROM comprobantes WHERE huella = ?').bind(huella).first());
  const id = crypto.randomUUID();
  return { id, repetida, st: env.DB.prepare('INSERT INTO comprobantes (id, mime, datos, creado_en, huella) VALUES (?,?,?,?,?)').bind(id, mime, bin, ahoraLima(), huella) };
}
async function registrarCorreccion(env, quien, uuid, campo, antes, despues, porque) {
  const s = await reservarSeq(env, 1);
  return env.DB.prepare('INSERT INTO correcciones (id, pestana, ubicacion, campo, valor_anterior, valor_nuevo, por_que, seq) VALUES (?,?,?,?,?,?,?,?)')
    .bind(crypto.randomUUID(), 'Movimientos', uuid, campo, String(antes ?? ''), String(despues ?? ''), `${porque} — ${quien} · ${ahoraLima()}`, s);
}
/** Si el día del movimiento ya tenía un cierre verificado, se avisa: nunca cambian cifras rendidas sin que alguien lo note. */
async function avisoCierre(env, fecha) {
  const c = await env.DB.prepare("SELECT operador FROM cierres WHERE substr(fecha,1,10) = ? AND estado = 'verificado' LIMIT 1").bind(String(fecha).slice(0, 10)).first();
  return c ? `El ${String(fecha).slice(0, 10)} ya tenía un cierre verificado (${c.operador}): revisa ese cierre.` : '';
}
async function movPara(env, uuid) {
  const m = await env.DB.prepare('SELECT * FROM movimientos WHERE uuid = ?').bind(uuid).first();
  if (!m) throw new ErrorApi('Movimiento no encontrado', 'NO_EXISTE', 404);
  return m;
}
async function anularMov(env, yo, uuid, b) {
  exigirMando(yo);
  const motivo = String(b.motivo || '').trim().slice(0, 200);
  if (motivo.length < 5) throw new ErrorApi('Escribe el motivo (al menos 5 letras).');
  const m = await movPara(env, uuid);
  if (m.estado !== 'activo') throw new ErrorApi('Este movimiento ya no está activo.');
  const s = await reservarSeq(env, 1);
  await env.DB.batch([
    env.DB.prepare("UPDATE movimientos SET estado='anulado', motivo=?, modificado_por=?, modificado_en=?, seq=? WHERE uuid=?").bind(motivo, yo.nombre, ahoraLima(), s, uuid),
    await registrarCorreccion(env, yo.nombre, uuid, 'estado', 'activo', 'anulado', motivo),
  ]);
  await auditar(env, yo.nombre, 'mov_anular', `${m.categoria} S/ ${m.monto} · ${motivo}`);
  return { uuid, aviso: await avisoCierre(env, m.fecha) };
}
/** Corregir no pisa el original: lo marca «corregido» y crea uno nuevo que apunta a él (como en la v3.10). */
async function corregirMov(env, yo, uuid, b) {
  exigirMando(yo);
  const motivo = String(b.motivo || '').trim().slice(0, 200);
  if (motivo.length < 5) throw new ErrorApi('Escribe el motivo de la corrección (al menos 5 letras).');
  const m = await movPara(env, uuid);
  if (m.estado !== 'activo') throw new ErrorApi('Solo se corrige un movimiento activo.');
  const c = b.cambios || {}, nuevo = { ...m };
  if (c.monto !== undefined) { const v = Math.round(Number(String(c.monto).replace(',', '.')) * 100) / 100; if (!(v > 0) || v > 100000) throw new ErrorApi('Monto no válido'); nuevo.monto = v; }
  if (c.categoria !== undefined) {
    const ok2 = await env.DB.prepare(`SELECT 1 FROM ${m.tipo === 'ingreso' ? 'cat_ingresos' : 'cat_egresos'} WHERE clave = ?`).bind(String(c.categoria)).first();
    if (!ok2) throw new ErrorApi('Concepto no válido'); nuevo.categoria = String(c.categoria);
  }
  if (c.medio_pago !== undefined) nuevo.medio_pago = c.medio_pago === 'yape' ? 'yape' : 'efectivo';
  if (c.cuenta !== undefined) {
    if (c.cuenta && !(await env.DB.prepare('SELECT 1 FROM cuentas WHERE clave = ?').bind(String(c.cuenta)).first())) throw new ErrorApi('Cuenta no válida');
    nuevo.cuenta = c.cuenta || null;
  }
  if (c.fecha !== undefined) {
    const f = String(c.fecha).replace('T', ' ');
    if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/.test(f)) throw new ErrorApi('Fecha no válida');
    if (f > ahoraLima(new Date(Date.now() + 10 * 60000))) throw new ErrorApi('La fecha está en el futuro');
    nuevo.fecha = f.length === 16 ? f + ':00' : f;
  }
  if (c.descripcion !== undefined) nuevo.descripcion = String(c.descripcion).slice(0, 200) || null;
  const campos = ['monto', 'categoria', 'medio_pago', 'cuenta', 'fecha', 'descripcion'].filter(k => String(nuevo[k] ?? '') !== String(m[k] ?? ''));
  if (!campos.length) throw new ErrorApi('No cambiaste nada.');
  const nid = crypto.randomUUID(), s = await reservarSeq(env, 2), ahora = ahoraLima();
  Object.assign(nuevo, { uuid: nid, estado: 'activo', ref_uuid: uuid, motivo, creado_en: ahora, modificado_por: yo.nombre, modificado_en: ahora, revisado_por: m.revisado_por, revisado_en: m.revisado_en, seq: s + 1 });
  const cols = Object.keys(nuevo);
  const st = [
    env.DB.prepare("UPDATE movimientos SET estado='corregido', motivo=?, modificado_por=?, modificado_en=?, seq=? WHERE uuid=?").bind(motivo, yo.nombre, ahora, s, uuid),
    env.DB.prepare(`INSERT INTO movimientos (${cols.map(k => `"${k}"`).join(',')}) VALUES (${cols.map(() => '?').join(',')})`).bind(...cols.map(k => nuevo[k] ?? null)),
  ];
  for (const k of campos) st.push(await registrarCorreccion(env, yo.nombre, uuid, k, m[k], nuevo[k], motivo));
  await env.DB.batch(st);
  await auditar(env, yo.nombre, 'mov_corregir', `${m.categoria} · ${campos.map(k => `${k}: ${m[k] ?? '—'} → ${nuevo[k] ?? '—'}`).join(' · ')} · ${motivo}`);
  const aviso = (await avisoCierre(env, m.fecha)) || (nuevo.fecha !== m.fecha ? await avisoCierre(env, nuevo.fecha) : '');
  return { uuid: nid, anterior: uuid, aviso };
}
async function revisarMov(env, yo, uuid) {
  exigirMando(yo);
  const m = await movPara(env, uuid);
  await env.DB.prepare('UPDATE movimientos SET revisado_por=?, revisado_en=?, seq=? WHERE uuid=?').bind(yo.nombre, ahoraLima(), await reservarSeq(env, 1), uuid).run();
  await auditar(env, yo.nombre, 'mov_revisar', `${m.categoria} S/ ${m.monto} · comprobante conforme`);
  return { uuid };
}
async function miTema(env, yo, b) {
  const t = ['light', 'dark', 'auto'].includes(b.tema) ? b.tema : 'auto';
  await env.DB.prepare('UPDATE usuarios SET tema=?, seq=? WHERE id=?').bind(t, await reservarSeq(env, 1), yo.id).run();
  return { tema: t };
}

/* ═════════════ Avisos para el equipo (v4.2) ═════════════
   para: 'todos' · 'mando' (admin y superadmin) · el id de una persona. Llegan con cada sincronización. */
async function avisar(env, a) {
  try {
    await env.DB.prepare('INSERT INTO avisos (id, tipo, titulo, detalle, ir, para, creado_en, seq) VALUES (?,?,?,?,?,?,?,?)')
      .bind(crypto.randomUUID(), a.tipo || 'info', String(a.titulo || '').slice(0, 160), String(a.detalle || '').slice(0, 300), a.ir || null, a.para || 'todos', ahoraLima(), await reservarSeq(env, 1)).run();
  } catch (e) { console.error('aviso', e); }
}
async function avisosDe(env, yo, limite = 40) {
  const r = (await env.DB.prepare(`SELECT a.*, (SELECT 1 FROM avisos_leidos l WHERE l.usuario_id = ? AND l.aviso_id = a.id) leido FROM avisos a
    WHERE (a.para = 'todos' OR a.para = ? OR (a.para = 'mando' AND ?)) AND a.creado_en >= ? ORDER BY a.creado_en DESC LIMIT ?`)
    .bind(yo.id, yo.id, esMando(yo) ? 1 : 0, ahoraLima(new Date(Date.now() - 30 * 864e5)), limite).all()).results;
  return r.map(x => ({ ...x, leido: !!x.leido }));
}
async function leerAvisos(env, yo, b) {
  const ids = Array.isArray(b.ids) ? b.ids.slice(0, 100) : (await avisosDe(env, yo, 100)).filter(a => !a.leido).map(a => a.id);
  if (ids.length) await env.DB.batch(ids.map(id => env.DB.prepare('INSERT OR IGNORE INTO avisos_leidos (usuario_id, aviso_id) VALUES (?,?)').bind(yo.id, String(id))));
  return { leidos: ids.length };
}

/* ═════════════ Sincronización ═════════════
   El teléfono manda operaciones con su propio id; si llegan dos veces, la segunda se ignora.
   Lo rechazado vuelve con su motivo y el teléfono NO lo borra: lo deja a la vista para decidir. */
const RE_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CATALOGOS = ['cuentas', 'cat_ingresos', 'cat_egresos', 'rutas', 'tarifas', 'unidades', 'actividades', 'config'];

async function aplicarOp(env, yo, op) {
  if (op.tipo === 'exc.mov') { exigirMando(yo); return EXC.movimiento(env, yo, op.datos || {}); }
  if (op.tipo === 'chk.crear') return FLOTA.crearInspeccion(env, yo, op.datos || {});
  if (op.tipo !== 'mov.crear') throw new ErrorApi('Operación desconocida');
  const d = op.datos || {};
  if (!RE_UUID.test(String(d.uuid || ''))) throw new ErrorApi('Identificador no válido');
  const ya = await env.DB.prepare('SELECT uuid, usuario_id FROM movimientos WHERE uuid = ?').bind(d.uuid).first();
  if (ya) return { duplicado: true };
  const tipo = d.tipo === 'ingreso' ? 'ingreso' : d.tipo === 'egreso' ? 'egreso' : null;
  if (!tipo) throw new ErrorApi('Tipo no válido');
  const cat = await env.DB.prepare(`SELECT clave FROM ${tipo === 'ingreso' ? 'cat_ingresos' : 'cat_egresos'} WHERE clave = ? AND activo = 1`).bind(String(d.categoria || '')).first();
  if (!cat) throw new ErrorApi('Ese concepto no existe o está inactivo');
  const monto = Math.round(Number(d.monto) * 100) / 100;
  if (!(monto > 0) || monto > 100000) throw new ErrorApi('Monto no válido');
  // Fallo 2 de la v3.10: una fecha inválida se guardaba vacía sin avisar. Aquí se rechaza.
  const fecha = String(d.fecha || '');
  if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/.test(fecha) || isNaN(Date.parse(fecha.replace(' ', 'T') + '-05:00'))) throw new ErrorApi('Fecha no válida');
  if (fecha > ahoraLima(new Date(Date.now() + 10 * 60000))) throw new ErrorApi('La fecha está en el futuro');
  // Regularización: un administrador puede registrar a nombre de otra persona (días atrasados).
  let autor = yo;
  if (d.a_nombre_de && d.a_nombre_de !== yo.id) {
    exigirMando(yo);
    autor = await env.DB.prepare('SELECT * FROM usuarios WHERE id = ?').bind(String(d.a_nombre_de)).first();
    if (!autor) throw new ErrorApi('La persona a cuyo nombre registras no existe.');
  }
  const legAutor = autor.legado || autor.nombre.toLowerCase();
  if (await CAJA.diaCerrado(env, legAutor, fecha)) throw new ErrorApi(`La caja del ${fecha.slice(0, 10)} de ${autor.nombre} ya está cerrada. Un administrador debe reabrirla para agregar registros.`, 'CAJA_CERRADA');
  const medio = d.medio_pago === 'yape' ? 'yape' : 'efectivo';
  const cuenta = String(d.cuenta || '');
  if (cuenta && !(await env.DB.prepare('SELECT 1 FROM cuentas WHERE clave = ? AND activo = 1').bind(cuenta).first())) throw new ErrorApi('Cuenta no válida');
  const st = [];
  const foto = await prepararFoto(env, d.foto);
  if (foto) st.push(foto.st);
  const s = await reservarSeq(env, 1);
  st.push(env.DB.prepare(`INSERT OR IGNORE INTO movimientos (uuid,fecha,actividad,placa,tipo,categoria,medio_pago,cuenta,cantidad,monto,descripcion,usuario,usuario_id,estado,creado_en,foto_id,foto_repetida,motivo,modificado_por,modificado_en,seq)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,'activo',?,?,?,?,?,?,?)`)
    .bind(d.uuid, fecha.length === 16 ? fecha + ':00' : fecha, 'hiace', String(d.placa || '').slice(0, 10) || null, tipo, cat.clave, medio, cuenta || null,
      d.cantidad ? Number(d.cantidad) : null, monto, String(d.descripcion || '').slice(0, 200) || null, legAutor, autor.id, ahoraLima(),
      foto ? foto.id : null, foto && foto.repetida ? 1 : null,
      autor.id !== yo.id ? 'Regularización registrada por ' + yo.nombre : null, autor.id !== yo.id ? yo.nombre : null, autor.id !== yo.id ? ahoraLima() : null, s));
  await env.DB.batch(st);
  return { uuid: d.uuid, foto_repetida: !!(foto && foto.repetida) };
}
async function sincronizar(env, yo, req, url) {
  let resultados = [];
  if (req.method === 'POST') {
    const b = await req.json();
    const ops = Array.isArray(b.ops) ? b.ops.slice(0, 100) : [];
    for (const op of ops) {
      try { resultados.push({ op_id: op.op_id, ok: true, ...(await aplicarOp(env, yo, op)) }); }
      catch (e) { if (!(e instanceof ErrorApi)) throw e; resultados.push({ op_id: op.op_id, ok: false, error: e.message }); }
    }
  }
  const desde = Number(url.searchParams.get('desde') || (req.method === 'POST' ? -1 : 0));
  const out = { resultados };
  if (desde >= 0) {
    const tope = Number((await env.DB.prepare("SELECT valor FROM meta WHERE clave='seq'").first()).valor);
    const movs = esMando(yo)
      ? await env.DB.prepare('SELECT * FROM movimientos WHERE seq > ? ORDER BY seq LIMIT 2000').bind(desde).all()
      : await env.DB.prepare("SELECT * FROM movimientos WHERE seq > ? AND usuario_id = ? AND fecha >= ? ORDER BY seq LIMIT 2000").bind(desde, yo.id, ahoraLima(new Date(Date.now() - 62 * 864e5))).all();
    out.movimientos = movs.results;
    const cat = {};
    for (const t of CATALOGOS) {
      const cambio = await env.DB.prepare(`SELECT MAX(seq) m FROM ${t}`).first();
      if (desde === 0 || (cambio.m || 0) > desde) cat[t] = (await env.DB.prepare(`SELECT * FROM ${t}`).all()).results;
    }
    out.catalogos = cat;
    out.usuarios = (await env.DB.prepare('SELECT * FROM usuarios WHERE activo = 1').all()).results.map(publico);
    out.yo = publico(await env.DB.prepare('SELECT * FROM usuarios WHERE id = ?').bind(yo.id).first());
    // Si había más de 2000, el teléfono vuelve a pedir desde el último que recibió.
    out.seq = movs.results.length === 2000 ? movs.results[movs.results.length - 1].seq : tope;
    out.mas = movs.results.length === 2000;
  }
  out.avisos = (await avisosDe(env, yo, 10)).filter(a => !a.leido);
  return out;
}

/* ═════════════ Importador del Excel ═════════════
   El navegador lee el .xlsx y manda cada pestaña en lotes. Reimportar es seguro: misma clave, misma fila. */
function valor(h, c, v) {
  if (v === undefined || v === null || v === '') return null;
  if (h.bool.includes(c)) return (v === true || v === 1 || /^(true|verdadero|1|s[ií])$/i.test(String(v))) ? 1 : 0;
  if (h.num.includes(c)) { const n = Number(String(v).replace(',', '.')); return isFinite(n) ? n : null; }
  return String(v);
}
async function importar(env, yo, b) {
  exigirMando(yo);
  if (b.tabla === 'usuarios') return importarPerfiles(env, yo, b.filas || []);
  const h = POR_TABLA[b.tabla];
  if (!h) throw new ErrorApi('Pestaña no reconocida: ' + b.tabla);
  const filas = Array.isArray(b.filas) ? b.filas.slice(0, 200) : [];
  if (!filas.length) return { insertadas: 0 };
  let legado = {};
  if (h.tabla === 'movimientos') (await env.DB.prepare('SELECT id, legado FROM usuarios').all()).results.forEach(u => { legado[u.legado] = u.id; });
  const cols = h.cols.map(([, c]) => c), extra = h.tabla === 'movimientos' ? ['usuario_id'] : [];
  const todas = cols.concat(extra, ['seq']);
  const s0 = await reservarSeq(env, filas.length);
  // Reimportar solo AGREGA lo que falta: nunca deshace una corrección, anulación, foto o revisión hecha en la app.
  const sql = `INSERT INTO ${h.tabla} (${todas.map(c => `"${c}"`).join(',')}) VALUES (${todas.map(() => '?').join(',')}) ON CONFLICT("${h.pk}") DO NOTHING`;
  const st = [];
  for (let i = 0; i < filas.length; i++) {
    const f = filas[i];
    if (f[h.pk] === undefined || f[h.pk] === null || f[h.pk] === '') continue;
    const vals = h.cols.map(([x, c]) => valor(h, c, f[x] !== undefined ? f[x] : f[c]));
    if (h.tabla === 'movimientos') vals.push(legado[String(f.usuario || '').toLowerCase()] || null);
    vals.push(s0 + i);
    st.push(env.DB.prepare(sql).bind(...vals));
  }
  for (let i = 0; i < st.length; i += 50) await env.DB.batch(st.slice(i, i + 50));
  return { insertadas: st.length };
}
/* De la pestaña Usuarios solo se toman los datos de la persona. El PIN NO se importa: valen los nuevos. */
async function importarPerfiles(env, yo, filas) {
  let n = 0;
  for (const f of filas) {
    const r = await env.DB.prepare('UPDATE usuarios SET nombre_completo=?, dni=?, telefono=?, licencia=?, funcion=COALESCE(?, funcion) WHERE id=? OR legado=?')
      .bind(f.nombre_completo || null, f.dni ? String(f.dni) : null, f.telefono ? String(f.telefono) : null, f.licencia || null, f.funcion || null, String(f.id || ''), String(f.nombre || '').toLowerCase()).run();
    n += r.meta.changes || 0;
  }
  await auditar(env, yo.nombre, 'importar', `perfiles de usuario: ${n}`);
  return { insertadas: n };
}
async function resumenImport(env) {
  const out = {};
  for (const h of HOJAS) out[h.tabla] = (await env.DB.prepare(`SELECT COUNT(*) n FROM ${h.tabla}`).first()).n;
  const m = (await env.DB.prepare("SELECT tipo, ROUND(SUM(monto),2) total, COUNT(*) n FROM movimientos WHERE estado = 'activo' GROUP BY tipo").all()).results;
  out.sumas = Object.fromEntries(m.map(r => [r.tipo, r.total]));
  out.usuarios = (await env.DB.prepare('SELECT COUNT(*) n FROM usuarios').first()).n;
  out.sin_autor = (await env.DB.prepare('SELECT COUNT(*) n FROM movimientos WHERE usuario_id IS NULL').first()).n;
  return out;
}

const EXC = crearExcursiones({ ErrorApi, ahoraLima, reservarSeq, auditar, exigirMando, prepararFoto, avisar });
const CAJA = crearCaja({ ErrorApi, ahoraLima, reservarSeq, auditar, exigirMando, esMando });
const SOL = crearSolicitudes({ ErrorApi, ahoraLima, reservarSeq, auditar, exigirMando, avisar });
const COT = crearCotizador({ ErrorApi, ahoraLima, reservarSeq, auditar, exigirMando, avisar, sol: SOL });
const PANEL = crearPanel({ ErrorApi, ahoraLima, exigirMando, saldosCuentas: CAJA.saldosCuentas });
const FLOTA = crearFlota({ ErrorApi, ahoraLima, reservarSeq, auditar, exigirMando, esMando, prepararFoto, avisar });
const responder = (r) => r instanceof Response ? r : ok(r);

/* ═════════════ Rutas ═════════════ */
export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(req);
    try {
      await migrar(env);
      const p = url.pathname, m = req.method;
      const cuerpo = async () => (m === 'POST' || m === 'PATCH') ? await req.json().catch(() => ({})) : {};
      if (p === '/api/estado' && m === 'GET') {
        const u = await env.DB.prepare("SELECT id, nombre, rol FROM usuarios WHERE activo = 1 ORDER BY CASE rol WHEN 'operador' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END, nombre").all();
        const sc = await env.DB.prepare("SELECT valor FROM meta WHERE clave='schema'").first();
        return ok({ version: VERSION, esquema: sc ? Number(sc.valor) : 0, usuarios: u.results });
      }
      if (p === '/api/login' && m === 'POST') return ok(await login(env, await cuerpo(), req));
      const pub = await EXC.publicas(env, req, url); if (pub !== undefined) return responder(pub);
      const psol = await SOL.publicas(env, req, url); if (psol !== undefined) return responder(psol);
      const mcot = p.match(/^\/api\/publico\/cotizacion\/([a-f0-9]+)$/i);
      if (mcot && m === 'GET') return ok(await COT.publica(env, mcot[1]));
      const mel = p.match(/^\/api\/publico\/cotizacion\/([a-f0-9]+)\/elegir$/i);
      if (mel && m === 'POST') return ok(await COT.elegir(env, mel[1], await cuerpo()));
      const yo = await sesion(env, req);
      // v5.0: una excursión pasa a «en ruta» solo con un checklist pre-ruta reciente y apto (un administrador puede salir igual dejando el motivo).
      const mkm = m === 'POST' && p.match(/^\/api\/excursiones\/([\w-]+)\/km$/);
      let preSalida = null;
      if (mkm && esMando(yo)) { const b = await req.clone().json().catch(() => ({})); if (b.km_inicio !== undefined && b.km_inicio !== '') preSalida = await FLOTA.exigirSalida(env, yo, mkm[1], b); }
      const pr = await EXC.privadas(env, yo, req, url);
      if (pr !== undefined) { if (preSalida && preSalida.id) await FLOTA.enlazar(env, preSalida.id, mkm[1]); return responder(pr); }
      const cr = await CAJA.rutas(env, yo, req, url); if (cr !== undefined) return responder(cr);
      const co = await COT.rutas(env, yo, req, url, EXC.crear); if (co !== undefined) return responder(co);
      const so = await SOL.rutas(env, yo, req, url); if (so !== undefined) return responder(so);
      const pa = await PANEL.rutas(env, yo, req, url); if (pa !== undefined) return responder(pa);
      const fl = await FLOTA.rutas(env, yo, req, url); if (fl !== undefined) return responder(fl);
      if (p === '/api/logout' && m === 'POST') {
        await env.DB.prepare('DELETE FROM sesiones WHERE token_hash = ?').bind(await sha256(req.headers.get('authorization').replace(/^Bearer\s+/i, ''))).run();
        return ok({});
      }
      if (p === '/api/sync') return ok(await sincronizar(env, yo, req, url));
      if (p === '/api/mi-pin' && m === 'POST') return ok(await miPin(env, yo, await cuerpo()));
      if (p === '/api/mi-tema' && m === 'POST') return ok(await miTema(env, yo, await cuerpo()));
      if (p === '/api/avisos' && m === 'GET') return ok({ avisos: await avisosDe(env, yo) });
      if (p === '/api/avisos/leer' && m === 'POST') return ok(await leerAvisos(env, yo, await cuerpo()));
      const mm = p.match(/^\/api\/movimientos\/([\w-]+)\/(anular|corregir|revisar)$/);
      if (mm && m === 'POST') { const b = await cuerpo(); return ok(await ({ anular: anularMov, corregir: corregirMov, revisar: revisarMov })[mm[2]](env, yo, mm[1], b)); }
      if (p === '/api/usuarios' && m === 'GET') { exigirMando(yo); return ok({ usuarios: await listarUsuarios(env), historial: (await env.DB.prepare("SELECT timestamp, usuario, detalle FROM auditoria WHERE accion LIKE 'usuario_%' ORDER BY timestamp DESC LIMIT 15").all()).results }); }
      if (p === '/api/usuarios' && m === 'POST') return ok(await crearUsuario(env, yo, await cuerpo()));
      const mu = p.match(/^\/api\/usuarios\/([\w-]+)(\/pin)?$/);
      if (mu && m === 'PATCH' && !mu[2]) return ok(await editarUsuario(env, yo, mu[1], await cuerpo()));
      if (mu && m === 'POST' && mu[2]) return ok(await resetPin(env, yo, mu[1], await cuerpo()));
      if (mu && m === 'DELETE' && !mu[2]) { exigirMando(yo); return ok(await eliminarUsuario(env, yo, mu[1])); }
      if (p === '/api/importar' && m === 'POST') return ok(await importar(env, yo, await cuerpo()));
      if (p === '/api/importar/resumen' && m === 'GET') { exigirMando(yo); return ok(await resumenImport(env)); }
      return fallo('Ruta no encontrada', 'NO_EXISTE', 404);
    } catch (e) {
      if (e instanceof ErrorApi) return json({ ok: false, error: e.message, codigo: e.codigo, data: e.datos || null }, e.status);
      console.error(e);
      return fallo('Error interno: ' + (e.message || e), 'INTERNO', 500);
    }
  },
  // Cada 15 minutos (cron en wrangler.jsonc): avisos de la hora del checklist de salida, documentos, mantenimiento y novedades por regularizar, aunque nadie abra la app.
  async scheduled(evento, env, ctx) {
    ctx.waitUntil((async () => { await migrar(env); await FLOTA.revisarAlertas(env); })());
  }
};
