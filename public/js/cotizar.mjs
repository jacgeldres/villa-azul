/**
 * Villa Azul · Fórmula del cotizador (v5.8.0).
 * Un solo archivo para la app (vista previa al instante) y para el servidor (cifra oficial al guardar).
 * Calcula dos servicios: Estándar y Premium (Estándar + snacks y WiFi).
 * v5.2: los km que la van hace vacía (volver a la base o ir a recoger) cuestan igual que los km con pasajeros.
 */
// shortcut: una sola base (la cochera de la van); si algún día hay otra, volverla parámetro.
export const BASE = 'Angasmarca';
/** Cómo se mueve la van. salidas = veces que sale de la base; tramos = tramos con pasajeros. */
/** ¿Es la base? Si el grupo sale de la base, no hay tramo vacío para llegar al recojo. */
export const esBase = (lugar) => String(lugar || '').trim().toLowerCase() === BASE.toLowerCase();
export const MODALIDADES = {
  ida_vuelta: { nombre: 'Ida y vuelta', corto: 'Ida y vuelta', salidas: 1, tramos: 2, ayuda: 'La van lleva al grupo, lo espera o se queda con él, y lo trae de vuelta.' },
  solo_ida: { nombre: 'Solo ida', corto: 'Solo ida', salidas: 1, tramos: 1, ayuda: 'La van deja (o recoge) al grupo y regresa vacía a la base.' },
  dos_dias: { nombre: 'Dejar y recoger otro día', corto: 'Otro día', salidas: 2, tramos: 2, ayuda: 'Día 1: deja al grupo y regresa vacía. Día del retorno: va vacía a recogerlo y lo trae.' },
};
export const PARAMETROS_BASE = {
  rendimiento_km_gal: 35,      // km por galón de la Hiace
  precio_galon: 17,            // S/ por galón de diésel
  conductor_km: 0.3226,        // S/ por km manejado: S/ 120 ÷ 372 km (Angasmarca–Trujillo ida y vuelta)
  velocidad_promedio: 31,      // km/h reales: 186 km en 6 h
  viatico_dia: 30,             // alimentación por día cuando el viaje no tiene horas (desayuno + almuerzo + cena)
  comida_desayuno: 10,         // S/ que se le paga al conductor por cada comida durante el viaje
  comida_almuerzo: 10,
  comida_cena: 10,
  hospedaje_noche: 50,         // hospedaje del conductor por noche fuera
  cochera_noche: 10,           // cochera de la van por noche fuera
  emergencia: 25,              // fondo de emergencia por servicio (parchado de llanta)
  // Ruta de sierra / trocha (v5.7, con el viaje real a Pijobamba: 124 km, ~5 gal, 3 h por tramo de 61 km).
  trocha_rendimiento_km_gal: 24, // km por galón en trocha (en asfalto se usa rendimiento_km_gal)
  trocha_velocidad: 20,        // km/h reales en trocha: 61 km en 3 h
  trocha_factor_desgaste: 1.6, // llantas, suspensión y frenos se gastan más en camino accidentado
  trocha_factor_conductor: 1.5,// el conductor cobra por km; en trocha cada km toma más tiempo
  bono_espera_hora: 5,         // S/ que recibe el conductor por cada hora de espera (sale del costo de espera)
  bono_nocturno: 20,           // S/ al conductor si llega a la base entre las 22:00 y las 05:00
  tanque_litros: 70,           // tanque de la Hiace: para calcular galones con la aguja (1/4 = 17.5 L)
  espera_hora: 10,             // costo de cada hora de espera INCLUIDA en el precio (lleva margen; el cliente no la ve aparte)
  espera_larga_desde_h: 4,     // desde esta hora la espera es «larga»: la van está parada, solo cuenta el tiempo del conductor
  espera_larga_hora: 5,        // costo de cada hora de espera larga
  tolerancia_min: 30,          // minutos que se espera sin costo cuando no hay horas incluidas
  espera_extra_hora: 10,       // S/ que paga el cliente por hora adicional, pasada la tolerancia (sin margen)
  desgaste_km: 0.35,           // llantas, aceite y mantenimiento por km
  snack_pax_dia: 6,            // Premium: 1 refrigerio por pasajero por día
  wifi_pax_viaje: 10,          // Premium: WiFi por pasajero por viaje (igual si dura 1 o 4 días). Precio fijo: no lleva margen encima
  bono_desde_km: 0,            // bono automático del conductor desde estos km recorridos (0 = apagado)
  bono_por_dia: 0,             // S/ de bono por día de servicio en viajes largos
  premium_activo: 0,           // 1 = se ofrece el servicio Premium; 0 = solo Estándar
  adelanto_pct: 50,            // % de adelanto para separar el viaje (se muestra al cliente)
  redondeo_tramo: 0.5,         // el precio por pasajero y por tramo sube a S/ 0.50 (S/ 20.50 de ida + S/ 20.50 de retorno); 0 = redondear el total a S/ 10
  margen_minimo: 30,           // % de margen mínimo (sobre el precio)
  margen_objetivo: 40,         // % de margen recomendado
  margen_premium: 45,          // % de margen alto: el «precio de lista» que deja espacio para una rebaja al recomendado
  validez_dias: 7,
};
export const SERVICIOS = {
  estandar: { nombre: 'Estándar', incluye: ['Asientos acolchados para viaje', 'Asientos reclinables', 'Paradas para fotos'] },
  premium: { nombre: 'Premium', incluye: ['Asientos acolchados para viaje', 'Asientos reclinables', 'Paradas para fotos', 'Refrigerio (snacks) 1 por día', 'WiFi a bordo'] },
};
const n = (v) => { const x = Number(String(v ?? '').replace(',', '.')); return isFinite(x) && x > 0 ? x : 0; };
const r2 = (x) => Math.round(x * 100) / 100;
const arriba10 = (x) => Math.ceil(r2(x) / 10) * 10;
const dado = (v) => v !== undefined && v !== null && v !== '';

/** Costo de las horas de espera incluidas: las primeras a tarifa normal y, en esperas largas (van parada todo el día), el resto a tarifa reducida. */
function costoEspera(p, h) { const corte = Math.max(0, n(p.espera_larga_desde_h)), larga = n(p.espera_larga_hora) || n(p.espera_hora);
  return corte && h > corte ? corte * n(p.espera_hora) + (h - corte) * larga : h * n(p.espera_hora); }
/* ═════════ Comidas del conductor ═════════
   Cuentan las comidas cuya hora (desayuno 7:00, almuerzo 13:00, cena 19:00) cae mientras el conductor está fuera de la base.
   Sin horas de salida y regreso: días × (desayuno + almuerzo + cena). */
export const COMIDAS = [['desayuno', 'Desayuno', 7], ['almuerzo', 'Almuerzo', 13], ['cena', 'Cena', 19]];
const fechaHora = (t) => { const m = String(t || '').match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/); return m ? Date.UTC(+m[1], m[2] - 1, +m[3], +m[4], +m[5]) : null; };
/** Días y comidas que se le pagan: [{dia:'2026-11-21', desayuno:false, almuerzo:true, cena:true}] */
export function comidasPorHorario(d, hTramo, dias) {
  const a = fechaHora(d.fecha_servicio), b = fechaHora(d.fecha_retorno), h = (n(hTramo) || 0) * 36e5;
  const md = d.modalidad || 'ida_vuelta', ventanas = [];
  if (a !== null && md === 'solo_ida') ventanas.push([a, a + 2 * h]);
  else if (a !== null && b !== null && md === 'dos_dias') ventanas.push([a, a + 2 * h], [b, b + 2 * h]);
  else if (a !== null && b !== null && b > a) ventanas.push([a, b + h]);
  if (!ventanas.length) {
    const ini = a !== null ? a : fechaHora(String(d.fecha_servicio || '').slice(0, 10) + 'T00:00');
    return Array.from({ length: Math.max(1, Math.round(n(dias) || 1)) }, (_, i) => ({ dia: ini !== null ? new Date(ini + i * 864e5).toISOString().slice(0, 10) : '', desayuno: true, almuerzo: true, cena: true }));
  }
  const L = {};
  ventanas.forEach(([x, y]) => { for (let t = Date.UTC(...new Date(x).toISOString().slice(0, 10).split('-').map((v, i) => i === 1 ? v - 1 : +v)); t <= y; t += 864e5) {
    const dia = new Date(t).toISOString().slice(0, 10);
    COMIDAS.forEach(([c, , hora]) => { const m = t + hora * 36e5; if (m >= x && m <= y) { L[dia] = L[dia] || { dia, desayuno: false, almuerzo: false, cena: false }; L[dia][c] = true; } });
  } });
  return Object.values(L).sort((p, q) => p.dia < q.dia ? -1 : 1);
}
/** Lo que se le paga por comidas, con su detalle. */
export function montoComidas(p, lista) {
  const q = { ...PARAMETROS_BASE, ...(p || {}) }, precio = (c) => n(q['comida_' + c]);
  let monto = 0, cuenta = 0;
  (lista || []).forEach(x => COMIDAS.forEach(([c]) => { if (x[c]) { monto += precio(c); cuenta++; } }));
  const nombres = COMIDAS.filter(([c]) => (lista || []).some(x => x[c])).map(([, t]) => t.toLowerCase());
  return { monto: r2(monto), cuenta, detalle: cuenta ? `${cuenta} comida(s): ${nombres.join(', ')}` + (COMIDAS.every(([c]) => precio(c) === precio('desayuno')) ? ` × S/ ${precio('desayuno')}` : '') : 'Ninguna comida durante el viaje' };
}
function comidasViaje(p, d, hTramo, dias) { const lista = comidasPorHorario(d, hTramo, dias); return { lista, ...montoComidas(p, lista) }; }

/** Hora (0-23, con decimales) en que la van llega a la base: regreso desde el destino + un tramo de manejo. */
function horaLlegada(d, hTramo) { const m = String(d.fecha_retorno || '').match(/T(\d{2}):(\d{2})/); if (!m) return null;
  return ((+m[1] + +m[2] / 60 + hTramo) % 24 + 24) % 24; }
/** Pago del conductor por la espera: lo recibe él y sale del costo de espera. */
export const bonoEspera = (p, h) => r2(n({ ...PARAMETROS_BASE, ...(p || {}) }.bono_espera_hora) * n(h));
function txtEspera(p, h) { const corte = Math.max(0, n(p.espera_larga_desde_h)), larga = n(p.espera_larga_hora) || n(p.espera_hora);
  return (corte && h > corte ? `${corte} h × S/ ${n(p.espera_hora)} + ${r2(h - corte)} h × S/ ${larga} (espera larga)` : `${h} h × S/ ${n(p.espera_hora)}`) + (n(p.bono_espera_hora) ? ` · de esto, S/ ${r2(n(p.bono_espera_hora) * h)} son el bono de espera del conductor` : '') + ' · el cliente no la ve aparte'; }

/** Regla de espera que ve el cliente (taxi y transporte privado). Pocas líneas, sin desglose de costos. */
export function politicaEspera(parametros, d) {
  const p = { ...PARAMETROS_BASE, ...(parametros || {}) };
  if (!d || !['taxi', 'privado'].includes(d.tipo)) return [];
  const h = n(d.horas_espera), tol = Math.round(n(p.tolerancia_min)), extra = n(p.espera_extra_hora);
  const L = [];
  if (h && d.fecha_retorno) L.push('La van los espera en destino hasta la hora de regreso, sin costo adicional.');
  else if (h) L.push(`Incluye hasta ${h} ${h === 1 ? 'hora' : 'horas'} de espera.`);
  else if (tol) L.push(`Le esperamos hasta ${tol} minutos sin costo.`);
  if (extra) L.push(h && d.fecha_retorno ? `Si el regreso se retrasa, cada hora adicional de espera es S/ ${extra}.` : `${h || tol ? 'Si necesita más tiempo, cada' : 'Cada'} hora adicional de espera es S/ ${extra}.`);
  return L;
}

/** d: { tipo, modalidad, km_ida, km_base_origen, km_destino_base, km_extra, dias, noches, horas_espera, pasajeros, peajes_ida, peajes_vuelta, otros:[{concepto,monto}] }
 *  Sin «modalidad» (cotizaciones anteriores a la v5.2) se calcula como antes: ida_vuelta sí/no y sin km vacíos. */
export function calcular(parametros, d) {
  const p = { ...PARAMETROS_BASE, ...(parametros || {}) };
  const md = MODALIDADES[d.modalidad] ? d.modalidad : null;
  const iv = md ? md !== 'solo_ida' : !!d.ida_vuelta;
  const M = MODALIDADES[md || (iv ? 'ida_vuelta' : 'solo_ida')], salidas = M.salidas;
  const k = n(d.km_ida);
  // Km vacíos: de la base al origen y del destino a la base. Si no se indican, se asume que el origen es la base.
  const b1 = n(d.km_base_origen), b2 = dado(d.km_destino_base) ? n(d.km_destino_base) : k;
  const kmPax = r2(k * M.tramos + n(d.km_extra));
  const kmVacio = !md ? 0 : r2(md === 'ida_vuelta' ? 2 * b1 : (b1 + b2) * salidas);
  const km = r2(kmPax + kmVacio);
  const dias = md === 'dos_dias' ? 2 : Math.max(1, Math.round(n(d.dias) || 1));
  const noches = md === 'dos_dias' ? 0 : Math.round(n(d.noches));
  const horas = n(d.horas_espera);
  const pax = Math.round(n(d.pasajeros));
  // Trocha: rinde menos, va más lento, se gasta más la van y el conductor trabaja más horas por km.
  const tr = !!d.trocha, rend = tr && n(p.trocha_rendimiento_km_gal) ? n(p.trocha_rendimiento_km_gal) : n(p.rendimiento_km_gal);
  const vel = tr && n(p.trocha_velocidad) ? n(p.trocha_velocidad) : n(p.velocidad_promedio);
  const fD = tr ? n(p.trocha_factor_desgaste) || 1 : 1, fC = tr ? n(p.trocha_factor_conductor) || 1 : 1;
  const galones = rend ? km / rend : 0;
  // Nocturno: el conductor llega a la base entre las 22:00 y las 05:00 (regreso desde el destino + un tramo de manejo).
  const llegada = horaLlegada(d, vel ? k / vel : 0), nocturno = llegada !== null && (llegada >= 22 || llegada < 5);
  const comi = comidasViaje(p, { ...d, modalidad: md || (iv ? 'ida_vuelta' : 'solo_ida') }, vel ? k / vel : 0, dias);
  // El precio del diésel se puede corregir en la propia cotización (el del día), sin tocar los parámetros.
  const galon = n(d.precio_galon) || n(p.precio_galon);
  // Bono del conductor: el que se escriba en la cotización; si no, el automático para viajes largos.
  const bonoSugerido = n(p.bono_desde_km) && km >= n(p.bono_desde_km) ? r2(n(p.bono_por_dia) * dias) : 0;
  const manual = d.bono !== undefined && d.bono !== null && d.bono !== '';
  const bono = manual ? r2(n(d.bono)) : bonoSugerido;
  // Peajes: se pagan en cada pasada, con o sin pasajeros. Un tramo vacío de regreso pasa por la misma caseta que la vuelta.
  // shortcut: si ni el origen ni el destino son la base, los peajes de los tramos vacíos se agregan en «Otros costos».
  const pi = n(d.peajes_ida), pv = n(d.peajes_vuelta);
  const peajes = r2(!md ? pi + (iv ? pv : 0) : md === 'solo_ida' ? pi + (kmVacio ? pv : 0) : (pi + pv) * salidas);
  const txtPeajes = !md ? (iv ? `ida S/ ${pi} + vuelta S/ ${pv}` : `ida S/ ${pi}`)
    : md === 'solo_ida' ? `ida S/ ${pi}` + (kmVacio ? ` + regreso vacío S/ ${pv}` : '') : `(ida S/ ${pi} + vuelta S/ ${pv})` + (salidas > 1 ? ` × ${salidas} salidas` : '');
  const txtKm = kmVacio ? `${km} km (${kmVacio} vacíos)` : `${km} km`;
  const base = [
    ['combustible', 'Combustible', r2(galones * galon), `${txtKm} ÷ ${rend} km/gal${tr ? ' (trocha)' : ''} × S/ ${galon}`],
    ['peajes', 'Peajes', peajes, txtPeajes],
    ['conductor', 'Pago del conductor', r2(n(p.conductor_km) * fC * km), `${txtKm} × S/ ${n(p.conductor_km)} por km` + (fC !== 1 ? ` × ${fC} (trocha)` : '')],
    ['nocturno', 'Bono nocturno del conductor', nocturno ? r2(n(p.bono_nocturno)) : 0, 'Llega a la base entre las 22:00 y las 05:00'],
    ['bono', 'Bono del conductor', bono, manual ? 'Escrito en esta cotización' : `Viaje largo: ${dias} día(s) × S/ ${n(p.bono_por_dia)} (desde ${n(p.bono_desde_km)} km)`],
    ['viaticos', 'Alimentación del conductor', comi.monto, comi.detalle],
    ['hospedaje', 'Hospedaje del conductor', r2(n(p.hospedaje_noche) * noches), `${noches} noche(s) × S/ ${n(p.hospedaje_noche)}`],
    ['cochera', 'Cochera', r2(n(p.cochera_noche) * noches), `${noches} noche(s) × S/ ${n(p.cochera_noche)}`],
    ['espera', 'Espera incluida en el precio', r2(costoEspera(p, horas)), txtEspera(p, horas)],
    ['desgaste', 'Desgaste de la van', r2(n(p.desgaste_km) * fD * km), `${txtKm} × S/ ${n(p.desgaste_km)}` + (fD !== 1 ? ` × ${fD} (trocha)` : '')],
    ['emergencia', 'Fondo de emergencia', r2(n(p.emergencia) * salidas), salidas > 1 ? `${salidas} salidas × S/ ${n(p.emergencia)} · parchado de llanta u otro imprevisto` : 'Parchado de llanta u otro imprevisto'],
  ];
  (Array.isArray(d.otros) ? d.otros : []).forEach((o, i) => { if (n(o.monto)) base.push(['otro' + i, String(o.concepto || 'Otro costo').slice(0, 60), r2(n(o.monto)), 'Agregado a mano']); });
  const extra = [
    ['snacks', 'Refrigerio (1 por día)', r2(n(p.snack_pax_dia) * pax * dias), `${pax} pasajero(s) × ${dias} día(s) × S/ ${n(p.snack_pax_dia)}`],
    ['wifi', 'WiFi a bordo', r2(n(p.wifi_pax_viaje) * pax), `${pax} pasajero(s) × S/ ${n(p.wifi_pax_viaje)} por viaje · precio fijo, sin margen`],
  ];
  const lim = (ls) => ls.filter(l => l[2] > 0).map(([clave, concepto, monto, detalle]) => ({ clave, concepto, monto, detalle }));
  // Márgenes sobre el precio: precio = costo ÷ (1 − margen). 40 % → el costo es el 60 % del precio.
  const mn = Math.min(90, n(p.margen_minimo)) / 100, mo = Math.min(90, n(p.margen_objetivo)) / 100, mp = Math.min(95, n(p.margen_premium)) / 100;
  const pasajes = pax * M.tramos;
  // El cliente mira el precio por pasajero: se redondea hacia arriba ese número y el total es por pasajero × pasajeros.
  // Se redondea el precio por pasajero y por tramo (lo que el cliente compara con un pasaje); el total es ese precio × tramos × pasajeros.
  const paso = n(p.redondeo_tramo), redondear = (x) => pasajes && paso > 0 ? r2(Math.ceil(r2(r2(x) / pasajes) / paso) * paso * pasajes) : arriba10(x);
  const plan = (lineas) => {
    const costo = r2(lineas.reduce((s, l) => s + l.monto, 0));
    // El WiFi se cobra tal cual (S/ por pasajero por viaje): el margen se aplica solo al resto de costos.
    const fijo = r2(lineas.filter(l => l.clave === 'wifi').reduce((s, l) => s + l.monto, 0)), resto = costo - fijo;
    const precios = { minimo: redondear(resto / (1 - mn) + fijo), recomendado: redondear(resto / (1 - mo) + fijo), alto: redondear(resto / (1 - mp) + fijo) };
    const cada = (div) => div ? { minimo: r2(precios.minimo / div), recomendado: r2(precios.recomendado / div), alto: r2(precios.alto / div) } : null;
    return { lineas, costo, precios, por_pasajero: cada(pax), por_tramo: cada(pasajes) };
  };
  const estandar = plan(lim(base)), premium = plan(lim(base.concat(extra)));
  return {
    km, km_pasajeros: kmPax, km_vacios: kmVacio, pct_vacios: km ? Math.round(kmVacio / km * 100) : 0, salidas, tramos: M.tramos, modalidad: md,
    dias, noches, pasajeros: pax, galones: r2(galones), precio_galon: galon, bono, bono_sugerido: bonoSugerido,
    horas_manejo: vel ? r2(km / vel) : 0, horas_tramo: vel ? r2(k / vel) : 0, trocha: tr, nocturno, rendimiento: rend, velocidad: vel, comidas: comi.lista,
    margenes: { minimo: Math.round(mn * 100), recomendado: Math.round(mo * 100), alto: Math.round(mp * 100) },
    estandar, premium, costo_km: km ? r2(estandar.costo / km) : 0,
    // Compatibilidad con cotizaciones anteriores (un solo servicio)
    lineas: estandar.lineas, costo: estandar.costo, precios: { minimo: estandar.precios.minimo, recomendado: estandar.precios.recomendado, premium: estandar.precios.alto }, por_pasajero: estandar.por_pasajero,
  };
}
