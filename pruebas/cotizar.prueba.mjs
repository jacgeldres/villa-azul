// Prueba de la fórmula del cotizador: node pruebas/cotizar.prueba.mjs (debe terminar en «OK comprobaciones»).
import { calcular } from '../public/js/cotizar.mjs';
const P = { rendimiento_km_gal:30, precio_galon:28, desgaste_km:0.35 };
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
if (!(h.estandar.precios.recomendado === 850 && h.premium.precios.recomendado === 1090)) { console.error("FALLA:", 'precios Huamachuco'); process.exit(1); }
for (const pl of [h.estandar, h.premium]) for (const [nv, m] of [['minimo',30],['recomendado',40],['alto',50]]) {
  const wifi = (pl.lineas.find(l=>l.clave==='wifi')||{monto:0}).monto, pr = pl.precios[nv];
  if (!((pr - pl.costo) / (pr - wifi) >= m/100 - 1e-9)) { console.error("FALLA:", 'margen '+nv); process.exit(1); } }
const t = calcular(P, casos['Trujillo días distintos']); if (!(t.estandar.lineas.find(l=>l.clave==='peajes').monto === 17.6)) { console.error("FALLA:", 'peajes x2'); process.exit(1); }
const l = calcular(P, casos['legado solo ida']); if (!(l.km === 62 && l.km_vacios === 0)) { console.error("FALLA:", 'legado'); process.exit(1); }
console.log('OK comprobaciones');
// Regla de espera que ve el cliente
import { politicaEspera } from '../public/js/cotizar.mjs';
const sinHoras = politicaEspera({}, { tipo: 'taxi' }), conHoras = politicaEspera({}, { tipo: 'taxi', horas_espera: 3 });
if (sinHoras.join(' ') !== 'Le esperamos hasta 30 minutos sin costo. Si necesita más tiempo, cada hora adicional de espera es S/ 10. Si la espera pasa de 2 horas adicionales, coordinamos un nuevo horario.') { console.error('FALLA: regla sin horas', sinHoras); process.exit(1); }
if (conHoras[0] !== 'Incluye hasta 3 horas de espera.') { console.error('FALLA: regla con horas', conHoras); process.exit(1); }
if (politicaEspera({}, { tipo: 'excursion' }).length) { console.error('FALLA: excursión sin regla'); process.exit(1); }
console.log('OK regla de espera');
