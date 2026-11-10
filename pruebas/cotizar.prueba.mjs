// Prueba de la fórmula del cotizador: node pruebas/cotizar.prueba.mjs (debe terminar en «OK comprobaciones»).
import { calcular } from '../public/js/cotizar.mjs';
const P = { rendimiento_km_gal:30, precio_galon:28, desgaste_km:0.35 };
const P10 = { ...P, redondeo_tramo: 0 };
const casos = {
  'dejar y recoger (Huamachuco)': { modalidad:'dos_dias', km_ida:62, pasajeros:8, km_destino_base:62 },
  'solo dejar': { modalidad:'solo_ida', km_ida:62, pasajeros:8 },
  'solo recoger (Huamachuco→Angasmarca)': { modalidad:'solo_ida', km_ida:62, pasajeros:8, km_base_origen:62, km_destino_base:0 },
  'ida y vuelta mismo día': { modalidad:'ida_vuelta', km_ida:62, pasajeros:8 },
  'Trujillo solo ida (peaje regreso vacío)': { modalidad:'solo_ida', km_ida:186, pasajeros:12, peajes_ida:0, peajes_vuelta:8.8 },
  'Trujillo días distintos': { modalidad:'dos_dias', km_ida:186, pasajeros:12, peajes_ida:0, peajes_vuelta:8.8 },
  'legado ida_vuelta': { ida_vuelta:true, km_ida:62, pasajeros:8 },
  'legado solo ida': { ida_vuelta:false, km_ida:62, pasajeros:8 },
};
for (const [t,d] of Object.entries(casos)) { const r = calcular(P,d);
  console.log(t.padEnd(42), `km ${r.km} (pax ${r.km_pasajeros}, vacíos ${r.km_vacios}, ${r.pct_vacios}%) sal ${r.salidas} días ${r.dias}`, '| costo Est', r.estandar.costo, r.estandar.precios, 'tramo', r.estandar.por_tramo?.recomendado, '| Prem', r.premium.costo, r.premium.precios, '| peajes', (r.estandar.lineas.find(l=>l.clave==='peajes')||{}).monto ?? 0); }
// comprobaciones
const h = calcular(P, casos['dejar y recoger (Huamachuco)']);
if (!(h.km === 248 && h.km_vacios === 124 && h.salidas === 2)) { console.error("FALLA:", 'km Huamachuco'); process.exit(1); }
if (!(h.estandar.precios.recomendado === 848 && h.premium.precios.recomendado === 1088 && h.estandar.por_pasajero.recomendado === 106)) { console.error("FALLA:", 'precios Huamachuco'); process.exit(1); }
for (const pl of [h.estandar, h.premium]) for (const [nv, m] of [['minimo',30],['recomendado',40],['alto',45]]) {
  const wifi = (pl.lineas.find(l=>l.clave==='wifi')||{monto:0}).monto, pr = pl.precios[nv];
  if (!((pr - pl.costo) / (pr - wifi) >= m/100 - 1e-9)) { console.error("FALLA:", 'margen '+nv); process.exit(1); } }
const t = calcular(P, casos['Trujillo días distintos']); if (!(t.estandar.lineas.find(l=>l.clave==='peajes').monto === 17.6)) { console.error("FALLA:", 'peajes x2'); process.exit(1); }
const l = calcular(P, casos['legado solo ida']); if (!(l.km === 62 && l.km_vacios === 0)) { console.error("FALLA:", 'legado'); process.exit(1); }
console.log('OK comprobaciones');
// Regla de espera que ve el cliente
import { politicaEspera } from '../public/js/cotizar.mjs';
const sinHoras = politicaEspera({}, { tipo: 'taxi' }), conHoras = politicaEspera({}, { tipo: 'taxi', horas_espera: 3 });
if (sinHoras.join(' ') !== 'Le esperamos hasta 30 minutos sin costo. Si necesita más tiempo, cada hora adicional de espera es S/ 10.') { console.error('FALLA: regla sin horas', sinHoras); process.exit(1); }
if (conHoras[0] !== 'Incluye hasta 3 horas de espera.') { console.error('FALLA: regla con horas', conHoras); process.exit(1); }
if (politicaEspera({}, { tipo: 'excursion' }).length) { console.error('FALLA: excursión sin regla'); process.exit(1); }
console.log('OK regla de espera');
// Espera larga: 12 h = 4 h × S/ 10 + 8 h × S/ 5 = S/ 80
const pj = calcular(P, { tipo: 'privado', modalidad: 'ida_vuelta', km_ida: 61.2, pasajeros: 12, horas_espera: 12 });
const espL = pj.estandar.lineas.find(l => l.clave === 'espera').monto;
if (espL !== 80) { console.error('FALLA: espera larga', espL); process.exit(1); }
console.log('OK espera larga', pj.estandar.costo, JSON.stringify(pj.estandar.precios));
// Sin redondeo por pasajero (0): el total sube a la decena, como antes
const h10 = calcular(P10, casos['dejar y recoger (Huamachuco)']);
if (h10.estandar.precios.recomendado !== 850) { console.error('FALLA: redondeo a 10', h10.estandar.precios); process.exit(1); }
// Pijobamba, 14 pasajeros, 13 h de espera: precio por pasajero entero
const pj14 = calcular(P, { tipo: 'privado', modalidad: 'ida_vuelta', km_ida: 61.2, pasajeros: 14, horas_espera: 13 });
if (!Number.isInteger(pj14.estandar.por_pasajero.recomendado)) { console.error('FALLA: por pasajero no entero', pj14.estandar.por_pasajero); process.exit(1); }
console.log('OK Pijobamba 14 pas.', JSON.stringify(pj14.estandar.precios), JSON.stringify(pj14.estandar.por_pasajero), 'costo', pj14.estandar.costo);
// Precio por pasajero y tramo en múltiplos de S/ 0.50; el alto deja espacio para una rebaja corta
const pt = pj14.estandar.por_tramo;
if (pt.recomendado * 2 % 1 !== 0 || pt.alto * 2 % 1 !== 0) { console.error('FALLA: tramo no redondo', pt); process.exit(1); }
console.log('OK por tramo', JSON.stringify(pt), 'alto sobre recomendado:', Math.round((pj14.estandar.precios.alto / pj14.estandar.precios.recomendado - 1) * 100) + ' %');
