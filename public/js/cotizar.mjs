/**
 * Villa Azul · Fórmula del cotizador (v5.3.0).
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
  viatico_dia: 30,             // alimentación del conductor por día de servicio
  hospedaje_noche: 50,         // hospedaje del conductor por noche fuera
  cochera_noche: 10,           // cochera de la van por noche fuera
  emergencia: 25,              // fondo de emergencia por servicio (parchado de llanta)
  espera_hora: 10,             // costo de cada hora de espera INCLUIDA en el precio (lleva margen; el cliente no la ve aparte)
  tolerancia_min: 30,          // minutos que se espera sin costo cuando no hay horas incluidas
  espera_extra_hora: 10,       // S/ que paga el cliente por hora adicional, pasada la tolerancia (sin margen)
  espera_tope_h: 2,            // horas adicionales máximas antes de coordinar otro horario (0 = sin tope)
  desgaste_km: 0.35,           // llantas, aceite y mantenimiento por km
  snack_pax_dia: 6,            // Premium: 1 refrigerio por pasajero por día
  wifi_pax_viaje: 10,          // Premium: WiFi por pasajero por viaje (igual si dura 1 o 4 días). Precio fijo: no lleva margen encima
  bono_desde_km: 0,            // bono automático del conductor desde estos km recorridos (0 = apagado)
  bono_por_dia: 0,             // S/ de bono por día de servicio en viajes largos
  margen_minimo: 30,           // % de margen mínimo (sobre el precio)
  margen_objetivo: 40,         // % de margen recomendado
  margen_premium: 50,          // % de margen alto
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

/** Regla de espera que ve el cliente (taxi y transporte privado). Pocas líneas, sin desglose de costos. */
export function politicaEspera(parametros, d) {
  const p = { ...PARAMETROS_BASE, ...(parametros || {}) };
  if (!d || !['taxi', 'privado'].includes(d.tipo)) return [];
  const h = n(d.horas_espera), tol = Math.round(n(p.tolerancia_min)), extra = n(p.espera_extra_hora), tope = n(p.espera_tope_h);
  const L = [];
  if (h) L.push(`Incluye hasta ${h} ${h === 1 ? 'hora' : 'horas'} de espera.`);
  else if (tol) L.push(`Le esperamos hasta ${tol} minutos sin costo.`);
  if (extra) L.push(`${h || tol ? 'Si necesita más tiempo, cada' : 'Cada'} hora adicional de espera es S/ ${extra}.`);
  if (tope) L.push(`Si la espera pasa de ${tope} ${tope === 1 ? 'hora adicional' : 'horas adicionales'}, coordinamos un nuevo horario.`);
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
  const galones = n(p.rendimiento_km_gal) ? km / n(p.rendimiento_km_gal) : 0;
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
    ['combustible', 'Combustible', r2(galones * galon), `${txtKm} ÷ ${n(p.rendimiento_km_gal)} km/gal × S/ ${galon}`],
    ['peajes', 'Peajes', peajes, txtPeajes],
    ['conductor', 'Pago del conductor', r2(n(p.conductor_km) * km), `${txtKm} × S/ ${n(p.conductor_km)} por km`],
    ['bono', 'Bono del conductor', bono, manual ? 'Escrito en esta cotización' : `Viaje largo: ${dias} día(s) × S/ ${n(p.bono_por_dia)} (desde ${n(p.bono_desde_km)} km)`],
    ['viaticos', 'Alimentación del conductor', r2(n(p.viatico_dia) * dias), `${dias} día(s) × S/ ${n(p.viatico_dia)}`],
    ['hospedaje', 'Hospedaje del conductor', r2(n(p.hospedaje_noche) * noches), `${noches} noche(s) × S/ ${n(p.hospedaje_noche)}`],
    ['cochera', 'Cochera', r2(n(p.cochera_noche) * noches), `${noches} noche(s) × S/ ${n(p.cochera_noche)}`],
    ['espera', 'Espera incluida en el precio', r2(n(p.espera_hora) * horas), `${horas} h × S/ ${n(p.espera_hora)} · el cliente no la ve aparte`],
    ['desgaste', 'Desgaste de la van', r2(n(p.desgaste_km) * km), `${txtKm} × S/ ${n(p.desgaste_km)}`],
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
  const plan = (lineas) => {
    const costo = r2(lineas.reduce((s, l) => s + l.monto, 0));
    // El WiFi se cobra tal cual (S/ por pasajero por viaje): el margen se aplica solo al resto de costos.
    const fijo = r2(lineas.filter(l => l.clave === 'wifi').reduce((s, l) => s + l.monto, 0)), resto = costo - fijo;
    const precios = { minimo: arriba10(resto / (1 - mn) + fijo), recomendado: arriba10(resto / (1 - mo) + fijo), alto: arriba10(resto / (1 - mp) + fijo) };
    const cada = (div) => div ? { minimo: r2(precios.minimo / div), recomendado: r2(precios.recomendado / div), alto: r2(precios.alto / div) } : null;
    return { lineas, costo, precios, por_pasajero: cada(pax), por_tramo: cada(pasajes) };
  };
  const estandar = plan(lim(base)), premium = plan(lim(base.concat(extra)));
  return {
    km, km_pasajeros: kmPax, km_vacios: kmVacio, pct_vacios: km ? Math.round(kmVacio / km * 100) : 0, salidas, tramos: M.tramos, modalidad: md,
    dias, noches, pasajeros: pax, galones: r2(galones), precio_galon: galon, bono, bono_sugerido: bonoSugerido,
    horas_manejo: n(p.velocidad_promedio) ? r2(km / n(p.velocidad_promedio)) : 0, horas_tramo: n(p.velocidad_promedio) ? r2(k / n(p.velocidad_promedio)) : 0,
    margenes: { minimo: Math.round(mn * 100), recomendado: Math.round(mo * 100), alto: Math.round(mp * 100) },
    estandar, premium, costo_km: km ? r2(estandar.costo / km) : 0,
    // Compatibilidad con cotizaciones anteriores (un solo servicio)
    lineas: estandar.lineas, costo: estandar.costo, precios: { minimo: estandar.precios.minimo, recomendado: estandar.precios.recomendado, premium: estandar.precios.alto }, por_pasajero: estandar.por_pasajero,
  };
}
