/**
 * Villa Azul · Bitácora de tanqueo y rendimiento real de la Hiace (v5.15)
 *
 * Cómo se mide: tanque lleno a tanque lleno. Cada vez que se llena hasta que la pistola corta sola,
 * se anota el odómetro y se resetea el «Tras reinicio» del tablero. En el siguiente tanque lleno:
 *   rendimiento real = km recorridos ÷ galones cargados (incluye las cargas parciales de en medio).
 * El km/L del tablero se guarda al lado para saber cuánto se equivoca la computadora de la van.
 *
 * Con 3 tanques llenos válidos (últimos 120 días), el cotizador usa el rendimiento real solo.
 */

export const KML_KMGAL = 3.785411784;      // 1 galón = 3.785 L: km/L × 3.785 = km/gal
export const CICLOS_MIN = 3;               // tanques llenos válidos para que el cotizador use el dato real
export const VENTANA_DIAS = 120;           // solo cuentan los tanques de los últimos 120 días
export const CICLOS_MAX = 6;               // y como máximo los 6 más recientes (la van cambia con el tiempo)

/** Lectura del tablero del 26-nov-2026 (foto): punto de partida y referencia hasta tener tanques medidos. */
export const REF_TABLERO = { id: 'ref-tablero-20261126', fecha: '2026-11-26 21:37:00', km: 124991, kml: 7.6, autonomia_km: 281 };

export const SQL_COMB_V18 = [
  `CREATE TABLE IF NOT EXISTS flota_tanqueos (id TEXT PRIMARY KEY, placa TEXT, tipo TEXT NOT NULL DEFAULT 'carga', fecha TEXT, km INTEGER, km_alerta TEXT,
     galones REAL, monto REAL, precio_gal REAL, lleno INTEGER NOT NULL DEFAULT 1, reseteo INTEGER, tablero_kml REAL, grifo TEXT, medio TEXT,
     mov_uuid TEXT, mov_error TEXT, excursion_id TEXT, foto_tablero TEXT, foto_boleta TEXT, nota TEXT, operador_id TEXT, operador TEXT,
     estado TEXT NOT NULL DEFAULT 'activa', anulado_por TEXT, anulado_en TEXT, motivo_anulacion TEXT, corregido TEXT, creado_en TEXT, seq INTEGER NOT NULL DEFAULT 0)`,
  'CREATE INDEX IF NOT EXISTS ix_tanq ON flota_tanqueos(placa, estado, fecha)',
];

const num = (v) => { const x = Number(String(v ?? '').replace(',', '.')); return isFinite(x) ? x : 0; };
const r1 = (n) => Math.round(n * 10) / 10, r2 = (n) => Math.round(n * 100) / 100, r3 = (n) => Math.round(n * 1000) / 1000;
const porFecha = (a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : num(a.km) - num(b.km));

/** Arma los tanques medidos (lleno → lleno). Pura: se prueba sin base de datos (pruebas/combustible.prueba.mjs). */
export function armarCiclos(filas) {
  const L = (filas || []).filter(c => c.tipo !== 'lectura' && (c.estado || 'activa') === 'activa').slice().sort(porFecha);
  const ciclos = [];
  let ini = null, gal = 0, soles = 0, n = 0;
  for (const c of L) {
    if (ini) { gal += num(c.galones); soles += num(c.monto); n++; }
    if (!num(c.lleno)) continue;
    if (ini) {
      const km = num(c.km) - num(ini.km), kmgal = gal > 0 && km > 0 ? r1(km / gal) : null;
      let motivo = '';
      if (c.km_alerta === 'salto' || ini.km_alerta === 'salto') motivo = 'Kilometraje dudoso sin validar';
      else if (km <= 0) motivo = 'El odómetro no avanzó: revisa el km anotado';
      else if (km < 30) motivo = 'Muy pocos km entre los dos tanques';
      else if (km > 2000) motivo = 'Más de 2,000 km entre tanques: ¿faltó registrar una carga?';
      else if (kmgal < 15 || kmgal > 50) motivo = 'Rendimiento imposible para la Hiace: revisa km y galones';
      // El tablero solo vale si se reseteó al llenar el tanque anterior.
      const tab = num(ini.reseteo) === 1 && num(c.tablero_kml) > 0 ? r1(num(c.tablero_kml) * KML_KMGAL) : null;
      ciclos.push({ desde_id: ini.id, hasta_id: c.id, desde: ini.fecha, hasta: c.fecha, km_ini: num(ini.km), km_fin: num(c.km), km, galones: r2(gal), soles: r2(soles), cargas: n,
        kmgal, kml: kmgal ? r2(kmgal / KML_KMGAL) : null, tablero_kmgal: tab, tablero_kml: tab ? num(c.tablero_kml) : null,
        desvio_tablero: tab && kmgal ? Math.round((tab - kmgal) / kmgal * 100) : null, soles_km: km > 0 && soles ? r3(soles / km) : null,
        excursion_id: c.excursion_id || null, valido: !motivo, motivo });
    }
    ini = c; gal = 0; soles = 0; n = 0;
  }
  return { ciclos, abierto: ini ? { id: ini.id, fecha: ini.fecha, km: num(ini.km), reseteo: num(ini.reseteo), gal_despues: r2(gal), soles_despues: r2(soles), cargas_despues: n } : null };
}

/** Promedio ponderado (km totales ÷ galones totales) de los tanques válidos recientes. */
export function resumir(ciclos, hoyYmd, dias = VENTANA_DIAS, max = CICLOS_MAX) {
  const desde = new Date(Date.parse(hoyYmd + 'T00:00:00Z') - dias * 864e5).toISOString().slice(0, 10);
  let val = (ciclos || []).filter(c => c.valido && String(c.hasta).slice(0, 10) >= desde).slice(-max);
  // Un tanque muy distinto a los demás (±35 % de la mediana) suele ser una carga que faltó anotar: no mueve el promedio.
  let atipicos = 0;
  if (val.length >= 3) {
    const ms = val.map(c => c.kmgal).sort((a, b) => a - b), med = ms[Math.floor(ms.length / 2)];
    const ok = val.filter(c => Math.abs(c.kmgal - med) / med <= 0.35); atipicos = val.length - ok.length; val = ok;
  }
  if (!val.length) return null;
  const km = val.reduce((t, c) => t + c.km, 0), gal = val.reduce((t, c) => t + c.galones, 0), soles = val.reduce((t, c) => t + c.soles, 0);
  const tab = val.filter(c => c.tablero_kmgal);
  return { n: val.length, km, galones: r2(gal), kmgal: r1(km / gal), kml: r2(km / gal / KML_KMGAL), soles_km: soles ? r3(soles / km) : null, precio_gal: soles ? r2(soles / gal) : null,
    desvio_tablero: tab.length ? Math.round(tab.reduce((t, c) => t + (c.tablero_kmgal - c.kmgal) / c.kmgal, 0) / tab.length * 100) : null, con_tablero: tab.length,
    desde: val[0].desde, hasta: val[val.length - 1].hasta, atipicos, mas_bajo: Math.min(...val.map(c => c.kmgal)), mas_alto: Math.max(...val.map(c => c.kmgal)) };
}

/** Precio del grifo: mediana de las 3 últimas cargas (últimos 30 días). */
export function precioReciente(filas, hoyYmd) {
  const desde = new Date(Date.parse(hoyYmd + 'T00:00:00Z') - 30 * 864e5).toISOString().slice(0, 10);
  const L = (filas || []).filter(c => c.tipo !== 'lectura' && (c.estado || 'activa') === 'activa' && num(c.galones) > 0 && num(c.monto) > 0 && String(c.fecha).slice(0, 10) >= desde)
    .sort(porFecha).slice(-3).map(c => ({ p: num(c.monto) / num(c.galones), f: c.fecha }));
  if (!L.length) return null;
  const ps = L.map(x => x.p).sort((a, b) => a - b);
  return { valor: r2(ps[Math.floor(ps.length / 2)]), fecha: L[L.length - 1].f, n: L.length };
}

const hoyLima = () => new Date(Date.now() - 5 * 3600000).toISOString().slice(0, 10);
async function filas(env) {
  try { return (await env.DB.prepare("SELECT * FROM flota_tanqueos WHERE estado = 'activa' ORDER BY fecha").all()).results; }
  catch (e) { return []; }   // antes de la migración v18 la tabla no existe
}
/** Lo que usa el cotizador: rendimiento real reciente y precio del grifo. null si aún no hay tanques medidos. */
export async function rendimientoReal(env) {
  const F = await filas(env), h = hoyLima();
  const { ciclos } = armarCiclos(F);
  return { resumen: resumir(ciclos, h), precio: precioReciente(F, h) };
}

/* ═════════════ API ═════════════ */
export function crearCombustible(h) {
  const { ErrorApi, ahoraLima, reservarSeq, auditar, exigirMando, esMando, prepararFoto, avisar, odometro, parametros } = h;
  const RE_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const RE_FH = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/;
  const texto = (v, n) => String(v ?? '').trim().replace(/\s+/g, ' ').slice(0, n);
  const ent = (v) => Math.round(Number(String(v ?? '').replace(/[^0-9.]/g, '')) || 0);
  const seg = (f) => (f && f.length === 16 ? f + ':00' : f);
  const msLima = (s) => Date.parse(String(s).replace(' ', 'T').slice(0, 19) + '-05:00');
  const ymdUTC = (s) => { const [y, m, d] = String(s).slice(0, 10).split('-').map(Number); return Date.UTC(y, m - 1, d); };
  const diasEntre = (a, b) => Math.round((ymdUTC(b) - ymdUTC(a)) / 864e5);
  const hoy = () => ahoraLima().slice(0, 10);
  const km$ = (n) => Number(n || 0).toLocaleString('es-PE') + ' km';

  async function siembraV18(env) {
    // La lectura de la foto del tablero: odómetro de partida (cuenta para el mantenimiento) y km/L de referencia.
    const p = await parametros(env);
    await env.DB.prepare(`INSERT OR IGNORE INTO flota_tanqueos (id, placa, tipo, fecha, km, km_alerta, galones, monto, lleno, reseteo, tablero_kml, nota, operador, estado, creado_en, seq)
      VALUES (?,?,'lectura',?,?,'',0,0,0,NULL,?,?,'Foto del tablero','activa',?,?)`)
      .bind(REF_TABLERO.id, p.placa, REF_TABLERO.fecha, REF_TABLERO.km, REF_TABLERO.kml,
        `Lectura de referencia: ${REF_TABLERO.kml} km/L «Tras reinicio», autonomía ${REF_TABLERO.autonomia_km} km. Desde aquí se resetea en cada tanque lleno.`, ahoraLima(), await reservarSeq(env, 1)).run();
  }

  async function categoriaCombustible(env, pedida) {
    const L = (await env.DB.prepare('SELECT clave, nombre FROM cat_egresos WHERE activo = 1').all()).results;
    if (pedida && L.some(c => c.clave === pedida)) return pedida;
    const c = L.find(x => /combust|di[eé]sel|petr[oó]le|gasolin/i.test(x.clave + ' ' + x.nombre));
    return c ? c.clave : null;
  }
  async function autoCotizador(env) {
    const f = await env.DB.prepare("SELECT valor FROM config WHERE clave = 'cot_rend_auto'").first();
    return !f || num(f.valor) === 1;
  }
  async function excursionEnRuta(env) {
    return env.DB.prepare("SELECT id, titulo FROM excursiones WHERE estado = 'en_ruta' ORDER BY salida DESC LIMIT 1").first().catch(() => null);
  }

  /** Lo que necesita el teléfono (también sin señal): el último tanque lleno y lo cargado después. Sin costos. */
  async function paraEstado(env) {
    const F = await filas(env), { ciclos, abierto } = armarCiclos(F);
    const ult = F.filter(c => c.tipo !== 'lectura').sort(porFecha).pop() || null;
    const ref = F.find(c => c.id === REF_TABLERO.id) || null;
    const uc = ciclos.filter(c => c.valido).pop() || null;
    return { ultimo: ult ? { id: ult.id, fecha: ult.fecha, km: ult.km, galones: ult.galones, lleno: ult.lleno, reseteo: ult.reseteo } : null, abierto,
      ultimo_ciclo: uc ? { hasta: uc.hasta, km: uc.km, galones: uc.galones, kmgal: uc.kmgal, kml: uc.kml } : null,
      referencia: ref ? { fecha: ref.fecha, km: ref.km, kml: ref.tablero_kml } : null };
  }

  /* ─────────── Registrar un tanqueo (llega por la cola sin señal) ─────────── */
  async function crear(env, yo, d) {
    d = d || {};
    if (!RE_UUID.test(String(d.id || ''))) throw new ErrorApi('Identificador no válido');
    const ya = await env.DB.prepare('SELECT id FROM flota_tanqueos WHERE id = ?').bind(d.id).first();
    if (ya) return { duplicado: true, id: ya.id };
    const p = await parametros(env), placa = p.placa, mando = esMando(yo);
    const fecha = seg(String(d.fecha || ''));
    if (!RE_FH.test(fecha) || isNaN(msLima(fecha))) throw new ErrorApi('Fecha no válida');
    if (fecha > ahoraLima(new Date(Date.now() + 10 * 60000))) throw new ErrorApi('La fecha está en el futuro: revisa la hora del teléfono.');
    if (diasEntre(fecha, hoy()) > (mando ? 120 : 20)) throw new ErrorApi('El tanqueo tiene demasiados días: pide a un administrador que lo registre.');
    const km = ent(d.km); if (!(km > 0) || km > 3000000) throw new ErrorApi('Falta el kilometraje del tablero (ODO).');
    const galones = r2(num(d.galones)); if (!(galones >= 0.5 && galones <= 30)) throw new ErrorApi('Escribe los galones de la boleta (entre 0.5 y 30).');
    const monto = r2(num(d.monto)); if (!(monto > 0 && monto <= 3000)) throw new ErrorApi('Escribe el monto de la boleta.');
    const precio = r2(monto / galones);
    if (precio < 8 || precio > 40) throw new ErrorApi(`Revisa galones y monto: sale S/ ${precio} por galón.`);
    const lleno = d.lleno === true || d.lleno === 1 || d.lleno === '1' ? 1 : 0;
    const reseteo = lleno ? (d.reseteo === true || d.reseteo === 1 || d.reseteo === '1' ? 1 : 0) : null;
    const kml = num(d.tablero_kml), tablero_kml = kml >= 2 && kml <= 30 ? r1(kml) : null;
    const medio = ['efectivo', 'yape', 'oficina'].includes(d.medio) ? d.medio : 'efectivo';
    const grifo = texto(d.grifo, 40) || null, nota = texto(d.nota, 200) || null;
    let exc = d.excursion_id ? await env.DB.prepare('SELECT id, titulo FROM excursiones WHERE id = ?').bind(String(d.excursion_id)).first() : null;
    if (!exc && diasEntre(fecha, hoy()) === 0) exc = await excursionEnRuta(env);
    // Odómetro: igual que en el checklist, un salto imposible se guarda pero no cuenta hasta que un administrador lo valide.
    const odo = await odometro(env, placa, d.id, fecha);
    const tope = odo.km + 2500 + 900 * Math.max(0, odo.fecha_ref ? diasEntre(odo.fecha_ref, fecha.slice(0, 10)) : 0);
    const km_alerta = odo.km && km < odo.km - 5 ? 'menor' : odo.km && km > tope ? 'salto' : '';
    const antes = await rendimientoReal(env);
    const st = [];
    const ft = d.foto_tablero ? await prepararFoto(env, d.foto_tablero) : null; if (ft) st.push(ft.st);
    const fb = d.foto_boleta ? await prepararFoto(env, d.foto_boleta) : null; if (fb) st.push(fb.st);
    st.push(env.DB.prepare(`INSERT INTO flota_tanqueos (id, placa, tipo, fecha, km, km_alerta, galones, monto, precio_gal, lleno, reseteo, tablero_kml, grifo, medio, excursion_id,
        foto_tablero, foto_boleta, nota, operador_id, operador, estado, creado_en, seq) VALUES (?,?,'carga',?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'activa',?,?)`)
      .bind(d.id, placa, fecha, km, km_alerta, galones, monto, precio, lleno, reseteo, tablero_kml, grifo, medio, exc ? exc.id : null,
        ft ? ft.id : null, fb ? fb.id : null, nota, yo.id, yo.nombre, ahoraLima(), await reservarSeq(env, 1)));
    await env.DB.batch(st);

    // El gasto en caja en el mismo paso: Jorge no lo registra dos veces. Si la caja del día está cerrada, el tanqueo igual queda y se avisa.
    let mov_uuid = null, mov_error = '';
    if (medio !== 'oficina' && RE_UUID.test(String(d.mov_uuid || ''))) {
      try {
        const cat = await categoriaCombustible(env, d.categoria);
        if (!cat) throw new ErrorApi('No hay un concepto de gasto «Combustible» activo.');
        await h.crearMov(env, yo, { uuid: d.mov_uuid, fecha, tipo: 'egreso', categoria: cat, monto, medio_pago: medio, cuenta: d.cuenta || '', placa,
          descripcion: `Tanqueo ${galones} gal · ${km$(km)}${lleno ? ' · tanque lleno' : ' · carga parcial'}${grifo ? ' · ' + grifo : ''}` });
        mov_uuid = d.mov_uuid;
        await env.DB.batch([
          env.DB.prepare('UPDATE movimientos SET galones = ?, foto_id = COALESCE(foto_id, ?), seq = ? WHERE uuid = ?').bind(galones, fb ? fb.id : null, await reservarSeq(env, 1), mov_uuid),
          env.DB.prepare('UPDATE flota_tanqueos SET mov_uuid = ? WHERE id = ?').bind(mov_uuid, d.id),
        ]);
      } catch (e) {
        if (!(e instanceof ErrorApi)) throw e;
        mov_error = e.message;
        await env.DB.prepare('UPDATE flota_tanqueos SET mov_error = ? WHERE id = ?').bind(mov_error, d.id).run();
        await avisar(env, { tipo: 'flota', titulo: 'Tanqueo sin gasto en caja', detalle: `${yo.nombre} · S/ ${monto} · ${galones} gal: ${mov_error} Regístralo a mano.`, ir: 'unidad:combustible', para: 'mando' });
      }
    }

    const { ciclos } = armarCiclos(await filas(env));
    const ciclo = ciclos.find(c => c.hasta_id === d.id) || null;
    const prom = antes.resumen;
    await auditar(env, yo.nombre, 'tanqueo', `${galones} gal · S/ ${monto} · ${km} km · ${lleno ? 'lleno' + (reseteo ? ', reseteado' : ', sin reset') : 'parcial'}${ciclo && ciclo.valido ? ' · ' + ciclo.kmgal + ' km/gal' : ''}${km_alerta ? ' · km ' + km_alerta : ''}`);
    await avisar(env, { tipo: 'flota', titulo: `Tanqueo · ${galones} gal · S/ ${monto.toFixed(2)}`,
      detalle: `${yo.nombre} · ${km$(km)} · ${lleno ? 'tanque lleno' : 'carga parcial'}${ciclo && ciclo.valido ? ` · rindió ${ciclo.kmgal} km/gal (${ciclo.kml} km/L)` : ''}${lleno && !reseteo ? ' · no reseteó el tablero' : ''}${exc ? ' · ' + exc.titulo : ''}`,
      ir: 'unidad:combustible', para: 'mando' });
    if (km_alerta === 'salto') await avisar(env, { tipo: 'flota', titulo: 'Kilometraje dudoso en un tanqueo', detalle: `${yo.nombre} anotó ${km$(km)}; el último confiable era ${km$(odo.km)}. Valídalo o corrígelo en Unidad → Combustible.`, ir: 'unidad:combustible', para: 'mando' });
    // Un tanque que rinde 20 % menos que el promedio: fuga, filtro, llantas bajas, carga o algo más.
    if (ciclo && ciclo.valido && prom && prom.n >= 2 && ciclo.kmgal < prom.kmgal * 0.8)
      await avisar(env, { tipo: 'flota', titulo: `Rendimiento bajo: ${ciclo.kmgal} km/gal`, detalle: `El promedio es ${prom.kmgal} km/gal. Revisa fugas, filtro de aire, presión de llantas, la carga o el manejo.`, ir: 'unidad:combustible', para: 'mando' });
    // ¿Cambió el rendimiento con que cotiza el sistema?
    if (await autoCotizador(env)) {
      const desp = (await rendimientoReal(env)).resumen;
      const antesV = prom && prom.n >= CICLOS_MIN ? prom.kmgal : null, despV = desp && desp.n >= CICLOS_MIN ? desp.kmgal : null;
      if (despV && (antesV === null || Math.abs(despV - antesV) >= 0.5)) {
        await auditar(env, 'Sistema', 'cot_rendimiento_real', `${antesV === null ? 'parámetro' : antesV} → ${despV} km/gal (${desp.n} tanques, ${desp.km} km)`);
        await avisar(env, { tipo: 'flota', titulo: `El cotizador ahora calcula con ${despV} km/gal`, detalle: `Rendimiento real de los últimos ${desp.n} tanques llenos (${km$(desp.km)})${antesV === null ? '' : '; antes ' + antesV + ' km/gal'}.`, ir: 'cotizador', para: 'mando' });
      }
    }
    return { id: d.id, km_alerta, precio_gal: precio, mov_uuid, mov_error, mov_local: mov_uuid ? null : (d.mov_uuid || null),
      ciclo: ciclo ? { km: ciclo.km, galones: ciclo.galones, kmgal: ciclo.kmgal, kml: ciclo.kml, tablero_kmgal: ciclo.tablero_kmgal, valido: ciclo.valido, motivo: ciclo.motivo } : null };
  }

  /* ─────────── Lo que ven los administradores ─────────── */
  async function panel(env, yo) {
    exigirMando(yo);
    const F = await filas(env), h0 = hoy(), { ciclos, abierto } = armarCiclos(F);
    const cfg = Object.fromEntries((await env.DB.prepare("SELECT clave, valor FROM config WHERE clave IN ('cot_rendimiento_km_gal','cot_rend_auto','cot_precio_galon','cot_trocha_rendimiento_km_gal')").all()).results.map(x => [x.clave, x.valor]));
    const res = resumir(ciclos, h0), manual = cfg.cot_rendimiento_km_gal ? num(cfg.cot_rendimiento_km_gal) : 28.8, auto = cfg.cot_rend_auto === undefined || num(cfg.cot_rend_auto) === 1;
    const aplica = auto && res && res.n >= CICLOS_MIN;
    const cargas = F.filter(c => c.tipo !== 'lectura').sort(porFecha);
    const porHasta = Object.fromEntries(ciclos.map(c => [c.hasta_id, c]));
    // Este mes: gasto, galones y proyección al cierre.
    const mes = h0.slice(0, 7), delMes = cargas.filter(c => String(c.fecha).slice(0, 7) === mes);
    const diaN = Number(h0.slice(8, 10)), [yy, mm] = mes.split('-').map(Number), diasMes = new Date(Date.UTC(yy, mm, 0)).getUTCDate();
    const solesMes = r2(delMes.reduce((t, c) => t + num(c.monto), 0)), galMes = r2(delMes.reduce((t, c) => t + num(c.galones), 0));
    // Km por día con las lecturas de los últimos 30 días (tanqueos y la lectura de referencia).
    const lect = F.filter(c => (c.km_alerta || '') !== 'salto' && String(c.fecha).slice(0, 10) >= new Date(Date.parse(h0 + 'T00:00:00Z') - 30 * 864e5).toISOString().slice(0, 10)).sort(porFecha);
    const kmDia = lect.length > 1 && diasEntre(lect[0].fecha, lect[lect.length - 1].fecha) >= 3 ? Math.round((num(lect[lect.length - 1].km) - num(lect[0].km)) / diasEntre(lect[0].fecha, lect[lect.length - 1].fecha)) : null;
    const ref = F.find(c => c.id === REF_TABLERO.id) || null;
    return {
      resumen: res, abierto, referencia: ref ? { fecha: ref.fecha, km: ref.km, kml: ref.tablero_kml, kmgal: r1(num(ref.tablero_kml) * KML_KMGAL), nota: ref.nota } : null,
      precio_reciente: precioReciente(F, h0),
      cotizador: { usa: aplica ? res.kmgal : manual, fuente: aplica ? 'real' : 'parametro', manual, auto, minimo: CICLOS_MIN, faltan: aplica ? 0 : Math.max(0, CICLOS_MIN - (res ? res.n : 0)), anterior: 35,
        trocha: cfg.cot_trocha_rendimiento_km_gal ? num(cfg.cot_trocha_rendimiento_km_gal) : 24, precio_galon: cfg.cot_precio_galon ? num(cfg.cot_precio_galon) : 17 },
      mes: { mes, soles: solesMes, galones: galMes, cargas: delMes.length, proyeccion: diaN ? r2(solesMes / diaN * diasMes) : null, dias: diaN, dias_mes: diasMes },
      km_dia: kmDia,
      ciclos: ciclos.slice(-24).map(c => ({ ...c })),
      cargas: cargas.slice(-60).reverse().map(c => ({ id: c.id, fecha: c.fecha, km: c.km, km_alerta: c.km_alerta || '', galones: c.galones, monto: c.monto, precio_gal: c.precio_gal, lleno: c.lleno, reseteo: c.reseteo,
        tablero_kml: c.tablero_kml, grifo: c.grifo, medio: c.medio, mov_uuid: c.mov_uuid, mov_error: c.mov_error, excursion_id: c.excursion_id, foto_tablero: c.foto_tablero, foto_boleta: c.foto_boleta,
        nota: c.nota, operador: c.operador, corregido: c.corregido, ciclo: porHasta[c.id] || null })),
      pendientes: { km_dudoso: cargas.filter(c => c.km_alerta === 'salto').length, sin_reset: cargas.filter(c => num(c.lleno) && !num(c.reseteo)).length, sin_gasto: cargas.filter(c => c.mov_error).length },
    };
  }

  async function corregir(env, yo, id, b) {
    exigirMando(yo);
    const x = await env.DB.prepare('SELECT * FROM flota_tanqueos WHERE id = ?').bind(id).first();
    if (!x || x.tipo === 'lectura') throw new ErrorApi('Tanqueo no encontrado', 'NO_EXISTE', 404);
    if (x.estado !== 'activa') throw new ErrorApi('Ese tanqueo está anulado.');
    const motivo = texto(b.motivo, 200); if (motivo.length < 5 && !b.km_valido) throw new ErrorApi('Escribe el motivo (al menos 5 letras).');
    const c = {}, notas = [];
    if (b.km !== undefined && b.km !== '' && ent(b.km) !== x.km) { const k = ent(b.km); if (!(k > 0)) throw new ErrorApi('Kilometraje no válido'); c.km = k; c.km_alerta = ''; notas.push(`km ${x.km} → ${k}`); }
    else if (b.km_valido && x.km_alerta) { c.km_alerta = ''; notas.push(`km ${x.km} validado`); }
    if (b.galones !== undefined && b.galones !== '' && r2(num(b.galones)) !== num(x.galones)) { const g = r2(num(b.galones)); if (!(g >= 0.5 && g <= 30)) throw new ErrorApi('Galones no válidos'); c.galones = g; notas.push(`galones ${x.galones} → ${g}`); }
    if (b.monto !== undefined && b.monto !== '' && r2(num(b.monto)) !== num(x.monto)) { const m = r2(num(b.monto)); if (!(m > 0 && m <= 3000)) throw new ErrorApi('Monto no válido'); c.monto = m; notas.push(`monto ${x.monto} → ${m}`); }
    if (b.lleno !== undefined && (b.lleno ? 1 : 0) !== num(x.lleno)) { c.lleno = b.lleno ? 1 : 0; notas.push(c.lleno ? 'ahora tanque lleno' : 'ahora carga parcial'); if (!c.lleno) c.reseteo = null; }
    if (b.reseteo !== undefined && (c.lleno ?? num(x.lleno)) && (b.reseteo ? 1 : 0) !== num(x.reseteo)) { c.reseteo = b.reseteo ? 1 : 0; notas.push(c.reseteo ? 'sí reseteó' : 'no reseteó'); }
    if (b.tablero_kml !== undefined && b.tablero_kml !== '' && r1(num(b.tablero_kml)) !== num(x.tablero_kml)) { const t = r1(num(b.tablero_kml)); if (!(t >= 2 && t <= 30)) throw new ErrorApi('km/L del tablero no válido'); c.tablero_kml = t; notas.push(`tablero ${x.tablero_kml ?? '—'} → ${t} km/L`); }
    if (!notas.length) throw new ErrorApi('No cambiaste nada.');
    const g = c.galones ?? num(x.galones), m = c.monto ?? num(x.monto), pr = r2(m / g);
    if (pr < 8 || pr > 40) throw new ErrorApi(`Con esos datos sale S/ ${pr} por galón: revisa galones y monto.`);
    c.precio_gal = pr;
    c.corregido = `${yo.nombre} · ${ahoraLima().slice(0, 16)} · ${notas.join(', ')}${motivo ? ' · ' + motivo : ''}`.slice(0, 300);
    c.seq = await reservarSeq(env, 1);
    const k = Object.keys(c), st = [env.DB.prepare(`UPDATE flota_tanqueos SET ${k.map(z => z + ' = ?').join(', ')} WHERE id = ?`).bind(...k.map(z => c[z]), id)];
    if (c.galones !== undefined && x.mov_uuid) st.push(env.DB.prepare('UPDATE movimientos SET galones = ?, seq = ? WHERE uuid = ?').bind(c.galones, await reservarSeq(env, 1), x.mov_uuid));
    await env.DB.batch(st);
    await auditar(env, yo.nombre, 'tanqueo_corregir', `${x.fecha} de ${x.operador} · ${notas.join(' · ')}${motivo ? ' · ' + motivo : ''}`);
    return { id, aviso: c.monto !== undefined && x.mov_uuid ? 'El monto del gasto en caja no cambia solo: corrígelo en Movimientos si hace falta.' : '' };
  }

  async function anular(env, yo, id, b) {
    exigirMando(yo);
    const motivo = texto(b.motivo, 200); if (motivo.length < 5) throw new ErrorApi('Escribe el motivo (al menos 5 letras).');
    const x = await env.DB.prepare('SELECT * FROM flota_tanqueos WHERE id = ?').bind(id).first();
    if (!x) throw new ErrorApi('Tanqueo no encontrado', 'NO_EXISTE', 404);
    if (x.estado !== 'activa') throw new ErrorApi('Ese registro ya está anulado.');
    await env.DB.prepare("UPDATE flota_tanqueos SET estado = 'anulada', anulado_por = ?, anulado_en = ?, motivo_anulacion = ?, seq = ? WHERE id = ?").bind(yo.nombre, ahoraLima(), motivo, await reservarSeq(env, 1), id).run();
    await auditar(env, yo.nombre, 'tanqueo_anular', `${x.fecha} · ${x.galones} gal · S/ ${x.monto} · ${motivo}`);
    const mov = x.mov_uuid ? await env.DB.prepare("SELECT uuid FROM movimientos WHERE uuid = ? AND estado = 'activo'").bind(x.mov_uuid).first() : null;
    return { id, mov_uuid: mov ? mov.uuid : null };
  }

  /** Las fotos del tablero y de la boleta: los administradores y quien registró el tanqueo. */
  async function puedeVerFoto(env, yo, fotoId) {
    return !!(await env.DB.prepare(`SELECT 1 FROM flota_tanqueos WHERE (foto_tablero = ? OR foto_boleta = ?) ${esMando(yo) ? '' : 'AND operador_id = ?'} LIMIT 1`)
      .bind(...(esMando(yo) ? [fotoId, fotoId] : [fotoId, fotoId, yo.id])).first());
  }

  async function rutas(env, yo, req, url) {
    const p = url.pathname, m = req.method, cuerpo = () => req.json().catch(() => ({}));
    if (p === '/api/flota/combustible' && m === 'GET') return panel(env, yo);
    if (p === '/api/flota/tanqueos' && m === 'POST') return crear(env, yo, await cuerpo());
    const r = p.match(/^\/api\/flota\/tanqueos\/([\w-]+)(?:\/(anular))?$/);
    if (r && !r[2] && m === 'PATCH') return corregir(env, yo, r[1], await cuerpo());
    if (r && r[2] === 'anular' && m === 'POST') return anular(env, yo, r[1], await cuerpo());
    return undefined;
  }

  return { rutas, crear, paraEstado, puedeVerFoto, siembraV18 };
}
