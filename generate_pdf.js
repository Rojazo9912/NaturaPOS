const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const outputPath = path.join(__dirname, 'natura_pos_workflows.pdf');
const doc = new PDFDocument({ margin: 50, size: 'A4', bufferPages: true });

// Setup Write Stream
const stream = fs.createWriteStream(outputPath);
doc.pipe(stream);

// Design Colors
const primaryColor = '#166534'; // Forest Green
const secondaryColor = '#1e293b'; // Slate Dark
const textMuted = '#64748b'; // Muted Slate
const textDark = '#0f172a'; // Deep Navy
const bgLight = '#f8fafc'; // Off-White
const dividerColor = '#cbd5e1'; // Light Gray Divider

// ==========================================
// PORTADA (COVER PAGE)
// ==========================================
doc.rect(0, 0, doc.page.width, doc.page.height).fill('#f1f5f9');

// Decorative top bar
doc.rect(0, 0, doc.page.width, 30).fill(primaryColor);

// Title Box
doc.fillColor(primaryColor)
   .font('Helvetica-Bold')
   .fontSize(36)
   .text('Natura OS', 100, 220, { align: 'center' });

doc.fillColor(secondaryColor)
   .font('Helvetica')
   .fontSize(16)
   .text('Punto de Venta e Inventario Inteligente', 100, 270, { align: 'center', characterSpacing: 1 });

doc.rect(150, 310, doc.page.width - 300, 3).fill(primaryColor);

doc.fillColor(textDark)
   .font('Helvetica-Bold')
   .fontSize(20)
   .text('MANUAL DE FLUJOS DE TRABAJO', 100, 350, { align: 'center' });

doc.fillColor(textMuted)
   .font('Helvetica')
   .fontSize(11)
   .text('Procesos Operativos, Sincronización Offline y Conciliación Dual', 100, 380, { align: 'center' });

// Decorative Bottom
doc.fillColor(primaryColor)
   .font('Helvetica-Bold')
   .fontSize(12)
   .text('🌿 NATURAL BY NUTRIT', 100, 700, { align: 'center' });

doc.fillColor(textMuted)
   .font('Helvetica')
   .fontSize(9)
   .text('Versión Enterprise • Mayo 2026', 100, 720, { align: 'center' });

doc.addPage();

// ==========================================
// HELPER FOR HEADER & FOOTER
// ==========================================
const drawHeaderFooter = (pageNum) => {
  doc.save();
  // Header
  doc.fillColor(primaryColor).rect(50, 40, doc.page.width - 100, 2).fill();
  doc.fillColor(primaryColor)
     .font('Helvetica-Bold')
     .fontSize(8)
     .text('🌿 NATURA OS  •  MANUAL DE FLUJOS OPERATIVOS', 50, 25);
     
  // Footer
  doc.fillColor(dividerColor).rect(50, doc.page.height - 45, doc.page.width - 100, 0.5).fill();
  doc.fillColor(textMuted)
     .font('Helvetica')
     .fontSize(8)
     .text('Confidencial - Propiedad de Natural by Nutrit', 50, doc.page.height - 38);
     
  doc.text(`Página ${pageNum}`, doc.page.width - 100, doc.page.height - 38, { align: 'right' });
  doc.restore();
};

let pageCounter = 1;

// ==========================================
// 1. FLUJO DE VENTA OFFLINE
// ==========================================
pageCounter++;
drawHeaderFooter(pageCounter);

doc.fillColor(primaryColor)
   .font('Helvetica-Bold')
   .fontSize(18)
   .text('1. Flujo de Venta Offline (PWA & IndexedDB)', 50, 70);

doc.fillColor(textDark)
   .font('Helvetica')
   .fontSize(10)
   .text('Garantiza que el POS opere y cobre sin interrupción alguna, incluso si la sucursal pierde el servicio de internet. Las transacciones se almacenan de forma local y se sincronizan al restaurar la señal.', 50, 100, { lineGap: 4 });

// Process Box
doc.rect(50, 160, doc.page.width - 100, 170).fill(bgLight);
doc.fillColor(primaryColor)
   .font('Helvetica-Bold')
   .fontSize(11)
   .text('SECUENCIA OPERATIVA:', 65, 175);

const flow1 = [
  'A. El POS detecta pérdida de red activa en el frontend (api.ts).',
  'B. Guarda la transacción de forma local en IndexedDB (base de datos "naturalos-offline").',
  'C. Registra una tarea de fondo (Background Sync) con el Service Worker.',
  'D. El POS actualiza reactivamente el contador de órdenes pendientes de sincronización.',
  'E. Al recuperar red, el Service Worker descarga los registros y los envía en lote al backend.'
];

let yOffset = 200;
flow1.forEach(step => {
  doc.fillColor(textDark)
     .font('Helvetica')
     .fontSize(9.5)
     .text(step, 75, yOffset);
  yOffset += 22;
});

// Technical Note
doc.rect(50, 360, doc.page.width - 100, 70).fill('#ecfdf5');
doc.fillColor('#065f46')
   .font('Helvetica-Bold')
   .fontSize(9)
   .text('BENEFICIO DE NEGOCIO:', 65, 375);
doc.fillColor('#065f46')
   .font('Helvetica')
   .fontSize(9)
   .text('Cero pérdidas de ventas en horas pico y total tranquilidad para el cajero de que su progreso y transacciones se resguardan de forma segura.', 65, 395, { width: doc.page.width - 130 });

doc.addPage();

// ==========================================
// 2. CONCILIACIÓN DUAL
// ==========================================
pageCounter++;
drawHeaderFooter(pageCounter);

doc.fillColor(primaryColor)
   .font('Helvetica-Bold')
   .fontSize(18)
   .text('2. Conciliación Dual (Corte A vs Corte B)', 50, 70);

doc.fillColor(textDark)
   .font('Helvetica')
   .fontSize(10)
   .text('Permite separar el arqueo del efectivo real del negocio (Corte A) de los ingresos bancarios directos fiscales (Corte B) al cerrar el turno operativo.', 50, 100, { lineGap: 4 });

// Table Comparison
doc.rect(50, 160, doc.page.width - 100, 180).fill(bgLight);
doc.fillColor(primaryColor)
   .font('Helvetica-Bold')
   .fontSize(11)
   .text('DIFERENCIAS EN CONCILIACIÓN:', 65, 175);

doc.fillColor(textDark)
   .font('Helvetica-Bold')
   .fontSize(10)
   .text('Corte A (Administrativo / Real)', 65, 205);
doc.font('Helvetica')
   .fontSize(9)
   .text('• Suma el 100% de los ingresos (Efectivo, Tarjetas, Puntos, Wallet).\n• Registra el faltante o sobrante de efectivo real frente al cajero.\n• Muestra el balance operativo y mermas absolutas del turno.', 65, 220, { lineGap: 3 });

doc.fillColor(textDark)
   .font('Helvetica-Bold')
   .fontSize(10)
   .text('Corte B (Fiscal / Contable)', 310, 205);
doc.font('Helvetica')
   .fontSize(9)
   .text('• Suma únicamente transacciones electrónicas (Tarjetas, Transferencia, QR).\n• Omite efectivo físico no facturado y Wallet de fidelidad interna.\n• Proporciona un desglose limpio y libre de descuadres para contabilidad.', 310, 220, { lineGap: 3 });

// Security Alert Info
doc.rect(50, 360, doc.page.width - 100, 70).fill('#fff5f5');
doc.fillColor('#991b1b')
   .font('Helvetica-Bold')
   .fontSize(9)
   .text('🚨 CONTROL ANTIFUGAS DE SEGURIDAD:', 65, 375);
doc.fillColor('#991b1b')
   .font('Helvetica')
   .fontSize(9)
   .text('Si al realizar el Corte A se detecta un faltante físico de efectivo mayor o igual a $50, el sistema NestJS gatilla una alerta de riesgo crítica visible en el panel administrativo.', 65, 395, { width: doc.page.width - 130 });

doc.addPage();

// ==========================================
// 3. NATURA IA (UPSELLING)
// ==========================================
pageCounter++;
drawHeaderFooter(pageCounter);

doc.fillColor(primaryColor)
   .font('Helvetica-Bold')
   .fontSize(18)
   .text('3. Natura IA - Venta Sugerida Predictiva', 50, 70);

doc.fillColor(textDark)
   .font('Helvetica')
   .fontSize(10)
   .text('Incrementa activamente el ticket promedio sugiriendo extras premium de manera contextual y en tiempo real durante la preparación del carrito.', 50, 100, { lineGap: 4 });

// IA Process Box
doc.rect(50, 160, doc.page.width - 100, 160).fill(bgLight);
doc.fillColor(primaryColor)
   .font('Helvetica-Bold')
   .fontSize(11)
   .text('FLUJO DE TOMA DE DECISIÓN IA:', 65, 175);

const stepsIA = [
  '1. El cajero agrega bebidas al carrito del POS.',
  '2. El Algoritmo de Afinidad evalúa semánticamente los ingredientes activos.',
  '3. Busca y sugiere "boosters" saludables que el cliente no tenga agregados.',
  '4. Muestra opciones interactivas con su precio exacto de venta.',
  '5. El cajero agrega el incremento al ticket con un solo toque [+ $Precio].'
];

let yOffsetIA = 205;
stepsIA.forEach(step => {
  doc.fillColor(textDark)
     .font('Helvetica')
     .fontSize(9.5)
     .text(step, 75, yOffsetIA);
  yOffsetIA += 22;
});

doc.rect(50, 350, doc.page.width - 100, 80).fill('#f0f9ff');
doc.fillColor('#0369a1')
   .font('Helvetica-Bold')
   .fontSize(9)
   .text('REGLAS DE AFINIDAD SALUDABLE:', 65, 365);
doc.fillColor('#0369a1')
   .font('Helvetica')
   .fontSize(9)
   .text('• Si el carrito lleva Jugos Detox ➔ Sugiere Shot de Jengibre o Clorofila.\n• Si el carrito lleva Protein Shakes ➔ Sugiere Proteína de Suero o Colágeno.\n• Si no hay insumos activos afines ➔ Sugiere Snacks Saludables o Agua Alcalina.', 65, 385, { lineGap: 3 });

doc.addPage();

// ==========================================
// 4, 5 & 6. OTRAS OPERACIONES
// ==========================================
pageCounter++;
drawHeaderFooter(pageCounter);

// 4. CLIENTE RAPIDO
doc.fillColor(primaryColor)
   .font('Helvetica-Bold')
   .fontSize(14)
   .text('4. Registro Rápido e Inline de Clientes', 50, 70);
doc.fillColor(textDark)
   .font('Helvetica')
   .fontSize(9.5)
   .text('Evita que el cajero deba abandonar el POS para registrar a un cliente de lealtad. Si el teléfono ingresado (10 dígitos) no existe, el POS abre una tarjeta integrada en el panel lateral. Al escribir el nombre y guardar, el cliente queda registrado y seleccionado automáticamente en 3 segundos.', 50, 95, { lineGap: 3 });

doc.rect(50, 160, doc.page.width - 100, 0.5).fill(dividerColor);

// 5. AJUSTE STOCK
doc.fillColor(primaryColor)
   .font('Helvetica-Bold')
   .fontSize(14)
   .text('5. Módulo de Ajuste Rápido de Stock', 50, 180);
doc.fillColor(textDark)
   .font('Helvetica')
   .fontSize(9.5)
   .text('Permite a los operadores realizar correcciones físicas inmediatas ante recargas o desperdicios. El operador busca el ingrediente, ingresa la cantidad contada y selecciona la justificación contable (Recarga de Insumos, Merma/Desperdicio, Auditoría o Caducidad). El backend ejecuta una transacción atómica actualizando el stock.', 50, 205, { lineGap: 3 });

doc.rect(50, 270, doc.page.width - 100, 0.5).fill(dividerColor);

// 6. TRANSFERENCIAS
doc.fillColor(primaryColor)
   .font('Helvetica-Bold')
   .fontSize(14)
   .text('6. Logística de Transferencias Inter-Sucursales', 50, 290);
doc.fillColor(textDark)
   .font('Helvetica')
   .fontSize(9.5)
   .text('Administra el traslado de ingredientes entre diferentes sucursales. La sucursal emisora crea la transferencia en estado PENDING y la despacha marcándola como IN_TRANSIT, lo que debita provisionalmente el stock emisor. Al llegar al destino, el receptor valida la mercancía física y la marca como RECEIVED, cargando el stock de forma automática.', 50, 315, { lineGap: 3 });

// Success Note
doc.rect(50, 385, doc.page.width - 100, 60).fill('#ecfdf5');
doc.fillColor('#065f46')
   .font('Helvetica-Bold')
   .fontSize(9.5)
   .text('✓ DISEÑO DE CERO INTERRUPCIONES (ALERT-FREE)', 65, 400);
doc.fillColor('#065f46')
   .font('Helvetica')
   .fontSize(9)
   .text('Todos los flujos descritos anteriormente han sido migrados a sistemas de confirmación pasivos e inline para erradicar popups molestos.', 65, 418);

// End of doc
doc.end();

stream.on('finish', () => {
  console.log('=== PDF CREADO CON ÉXITO ===');
  console.log('Archivo guardado en: ' + outputPath);
});
