import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
// @ts-expect-error: pdfkit/js/pdfkit.standalone.js does not have typescript declarations
import PDFDocument from 'pdfkit/js/pdfkit.standalone.js';
import fs from 'fs';
import path from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const formatCOP = (valor: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(valor);
};


// Variables en memoria para guardar el búfer de las fuentes
let robotoRegularBuffer: Buffer | null = null;
let robotoBoldBuffer: Buffer | null = null;

// Función para descargar o leer del disco las fuentes Roboto para evitar el fallo de Turbopack
async function loadFonts() {
  const fontsDir = path.join(process.cwd(), 'public', 'fonts');
  const regularPath = path.join(fontsDir, 'Roboto-Regular.ttf');
  const boldPath = path.join(fontsDir, 'Roboto-Bold.ttf');

  // Asegurar que el directorio de fuentes exista
  if (!fs.existsSync(fontsDir)) {
    fs.mkdirSync(fontsDir, { recursive: true });
  }

  // 1. Cargar Roboto Regular
  if (fs.existsSync(regularPath)) {
    robotoRegularBuffer = fs.readFileSync(regularPath);
  } else {
    try {
      console.log('Descargando fuente Roboto-Regular para PDF...');
      const res = await fetch('https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/Roboto-Regular.ttf');
      if (!res.ok) throw new Error('Fallo de red al descargar fuente');
      const arrayBuffer = await res.arrayBuffer();
      robotoRegularBuffer = Buffer.from(arrayBuffer);
      fs.writeFileSync(regularPath, robotoRegularBuffer);
    } catch (e) {
      console.error('Error descargando Roboto-Regular, usando fallback local de Windows:', e);
      const winPath = 'C:\\Windows\\Fonts\\arial.ttf';
      if (fs.existsSync(winPath)) {
        robotoRegularBuffer = fs.readFileSync(winPath);
      } else {
        throw new Error('No se pudo cargar la fuente regular para el PDF. Detalle: ' + (e as Error).message);
      }
    }
  }

  // 2. Cargar Roboto Bold
  if (fs.existsSync(boldPath)) {
    robotoBoldBuffer = fs.readFileSync(boldPath);
  } else {
    try {
      console.log('Descargando fuente Roboto-Bold para PDF...');
      const res = await fetch('https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/Roboto-Bold.ttf');
      if (!res.ok) throw new Error('Fallo de red al descargar fuente');
      const arrayBuffer = await res.arrayBuffer();
      robotoBoldBuffer = Buffer.from(arrayBuffer);
      fs.writeFileSync(boldPath, robotoBoldBuffer);
    } catch (e) {
      console.error('Error descargando Roboto-Bold, usando fallback local de Windows:', e);
      const winPath = 'C:\\Windows\\Fonts\\arialbd.ttf';
      if (fs.existsSync(winPath)) {
        robotoBoldBuffer = fs.readFileSync(winPath);
      } else {
        throw new Error('No se pudo cargar la fuente bold para el PDF. Detalle: ' + (e as Error).message);
      }
    }
  }
}

// Helper para crear un cliente de Supabase con el token del usuario autenticado (para heredar RLS)
const getClientForToken = (token: string) => {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  });
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const eventoIdStr = searchParams.get('id');

    if (!eventoIdStr) {
      return NextResponse.json({ error: 'Se requiere el parámetro ID del evento' }, { status: 400 });
    }

    const eventoId = parseInt(eventoIdStr);

    // 1. Validar autorización (JWT del usuario en query parameter, cabecera Authorization o cookies)
    let token = searchParams.get('token') || '';
    
    if (!token) {
      const authHeader = request.headers.get('Authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
      } else {
        const cookieHeader = request.headers.get('cookie') || '';
        const tokenMatch = cookieHeader.match(/sb-[a-zA-Z0-9]+-auth-token=([^;]+)/);
        if (tokenMatch) {
          try {
            const parsed = JSON.parse(decodeURIComponent(tokenMatch[1]));
            token = parsed?.access_token || '';
          } catch (e) {}
        }
      }
    }

    if (!token) {
      return NextResponse.json({ error: 'No autorizado: Token JWT no provisto' }, { status: 401 });
    }

    const supabaseClient = getClientForToken(token);

    // 2. Obtener la sesión y comprobar validez
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado: Sesión inválida o expirada' }, { status: 401 });
    }

    // 3. Cargar las fuentes en memoria (se descargan una sola vez de forma local)
    await loadFonts();

    // 4. Consultar datos dinámicos de la empresa (emisor de la factura)
    const { data: configEmpresa } = await supabaseClient
      .from('configuracion_empresa')
      .select('*')
      .eq('id', 1)
      .maybeSingle();

    // Cargar logotipo si existe y es accesible
    let logoBuffer: Buffer | null = null;
    if (configEmpresa?.logo_url) {
      try {
        console.log('Descargando logotipo de la empresa...');
        const logoRes = await fetch(configEmpresa.logo_url);
        if (logoRes.ok) {
          logoBuffer = Buffer.from(await logoRes.arrayBuffer());
        }
      } catch (e) {
        console.error('Error al descargar el logotipo personalizado para el PDF:', e);
      }
    }

    // Definición de fallbacks por defecto para datos de la empresa
    const empNombre = configEmpresa?.nombre_empresa || 'OnProduction S.A.S.';
    const empEslogan = configEmpresa?.eslogan || 'LOGÍSTICA & ALQUILER DE EQUIPOS';
    const empNit = configEmpresa?.nit || '901.458.732-1';
    const empTelefono = configEmpresa?.telefono || '+57 (300) 123-4567';
    const empEmail = configEmpresa?.email || 'facturacion@onproduction.com';
    const empDireccion = configEmpresa?.direccion || 'Bogotá, Colombia';

    // 5. Consultar datos consolidados del evento (respeta RLS)
    const { data: evento, error: queryError } = await supabaseClient
      .from('eventos')
      .select(`
        id,
        estado,
        fecha_inicio_evento,
        fecha_fin_evento,
        direccion_evento,
        total_equipos,
        total_adicionales,
        gran_total,
        created_at,
        cliente:clientes (
          tipo_cliente,
          documento_identidad,
          nombre_razon_social,
          nombres_contacto,
          apellidos_contacto,
          email,
          telefono,
          direccion
        ),
        detalles:evento_detalles_equipos (
          id,
          tarifa_dia_congelada,
          dias_cobrados,
          subtotal,
          instancia:inventario_instancias (
            serial_tag,
            catalogo:catalogo_equipos (
              sku,
              nombre_equipo,
              categoria
            )
          )
        ),
        adicionales:evento_adicionales (
          id,
          tipo_adicional,
          descripcion,
          costo_facturado
        )
      `)
      .eq('id', eventoId)
      .is('deleted_at', null)
      .single();

    if (queryError || !evento) {
      console.error('Error al consultar evento para PDF:', queryError);
      return NextResponse.json({ error: 'Evento no encontrado o acceso denegado por RLS' }, { status: 404 });
    }

    // 6. Generar el PDF real usando pdfkit en memoria
    const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks: Buffer[] = [];
      
      doc.on('data', (chunk: any) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err: any) => reject(err));

      // Registrar fuentes personalizadas
      doc.registerFont('CustomFont', robotoRegularBuffer!);
      doc.registerFont('CustomFont-Bold', robotoBoldBuffer!);
      doc.font('CustomFont');

      // --- DISEÑO PREMIUM DEL PDF ---

      // Colores corporativos (Slate y Cian)
      const primaryColor = '#0f172a'; // Slate oscuro
      const accentColor = '#06b6d4';  // Cian
      const textColor = '#334155';    // Gris texto
      const lightGray = '#f8fafc';    // Fondo celdas
      const borderColor = '#e2e8f0';  // Bordes divisorios

      // 1. CABECERA (Logo e Información del Documento)
      // Dibujar logo: logotipo cargado (escalado proporcional) o logo vectorial de fallback
      if (logoBuffer) {
        try {
          // Ajusta de forma proporcional y natural en una caja de 45x45 pt en la misma coordenada
          doc.image(logoBuffer, 50, 45, { fit: [45, 45], align: 'center', valign: 'center' });
        } catch (e) {
          console.error('Error dibujando la imagen del logotipo en el PDF:', e);
          // Fallback manual si el buffer de la imagen estuviera dañado
          doc.save();
          doc.rect(50, 45, 45, 45).fill(accentColor);
          doc.fontSize(22).fillColor('#ffffff').font('CustomFont-Bold').text('OP', 58, 57);
          doc.restore();
        }
      } else {
        doc.save();
        doc.rect(50, 45, 45, 45).fill(accentColor);
        doc.fontSize(22).fillColor('#ffffff').font('CustomFont-Bold').text('OP', 58, 57);
        doc.restore();
      }

      // Nombre de la empresa (Izquierda - Cargados dinámicamente)
      doc.fontSize(16).fillColor(primaryColor).font('CustomFont-Bold').text(empNombre, 110, 48);
      doc.fontSize(9).fillColor(textColor).font('CustomFont-Bold').text(empEslogan);
      doc.font('CustomFont').text(`NIT: ${empNit} | Cel: ${empTelefono}`);
      doc.text(`Email: ${empEmail} | ${empDireccion}`);

      // Título del documento (Derecha - con mayor espacio vertical y límites de ancho)
      doc.fontSize(14).fillColor(primaryColor).font('CustomFont-Bold').text('ORDEN DE FACTURACIÓN', 320, 48, { align: 'right', width: 225 });
      doc.fontSize(10).fillColor(accentColor).text(`Factura / Evento ID: #${evento.id}`, 320, 68, { align: 'right', width: 225 });
      
      const fechaEmision = new Date(evento.created_at || new Date()).toLocaleDateString('es-ES');
      doc.fontSize(8).fillColor(textColor).font('CustomFont').text(`Fecha de Emisión: ${fechaEmision}`, 320, 82, { align: 'right', width: 225 });

      // Línea divisoria superior
      doc.strokeColor(borderColor).lineWidth(1).moveTo(50, 110).lineTo(545, 110).stroke();

      // 2. BLOQUES DE INFORMACIÓN (Cliente y Detalles del Evento)
      let currentY = 125;
      
      // Datos del Cliente (Izquierda)
      const cliente = (Array.isArray(evento.cliente) ? evento.cliente[0] : evento.cliente) as any;
      doc.fontSize(10).fillColor(primaryColor).font('CustomFont-Bold').text('FACTURADO A:', 50, currentY);
      doc.fontSize(11).fillColor(primaryColor).font('CustomFont-Bold').text(cliente.nombre_razon_social, 50, currentY + 15);
      doc.fontSize(9).fillColor(textColor).font('CustomFont');
      doc.text(`NIT / CC: ${cliente.documento_identidad}`, 50, currentY + 30);
      doc.text(`Contacto: ${cliente.nombres_contacto || ''} ${cliente.apellidos_contacto || ''}`, 50, currentY + 42);
      doc.text(`Email: ${cliente.email}`, 50, currentY + 54);
      doc.text(`Teléfono: ${cliente.telefono}`, 50, currentY + 66);
      doc.text(`Dirección: ${cliente.direccion || 'No registrada'}`, 50, currentY + 78, { width: 230 });

      // Detalles del Evento (Derecha)
      doc.fontSize(10).fillColor(primaryColor).font('CustomFont-Bold').text('DETALLES DEL SERVICIO:', 300, currentY);
      doc.fontSize(9).fillColor(textColor).font('CustomFont');
      
      const fInicio = new Date(evento.fecha_inicio_evento).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });
      const fFin = new Date(evento.fecha_fin_evento).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });
      
      doc.font('CustomFont-Bold').text('Período de Operación:', 300, currentY + 15).font('CustomFont').text(`${fInicio} al`, 300, currentY + 27).text(fFin, 300, currentY + 39);
      doc.font('CustomFont-Bold').text('Lugar de Montaje:', 300, currentY + 56).font('CustomFont').text(evento.direccion_evento, 300, currentY + 68, { width: 245 });
      doc.font('CustomFont-Bold').text('Estado de Cuenta:', 300, currentY + 95).font('CustomFont-Bold').fillColor(evento.estado === 'PAGADO_CERRADO' ? '#10b981' : accentColor).text(evento.estado, 395, currentY + 95);

      // Línea divisoria media
      doc.strokeColor(borderColor).lineWidth(1).moveTo(50, 245).lineTo(545, 245).stroke();

      // 3. TABLA DE EQUIPOS DETALLADOS (Redefinición de anchos de columna para evitar sobreposiciones)
      currentY = 265;
      doc.fontSize(11).fillColor(primaryColor).font('CustomFont-Bold').text('DESGLOSE DE EQUIPOS ALQUILADOS', 50, currentY);
      
      currentY += 20;
      // Dibujar cabecera de la tabla de equipos
      doc.rect(50, currentY, 495, 20).fill(primaryColor);
      doc.fontSize(8).fillColor('#ffffff').font('CustomFont-Bold');
      doc.text('Código/SKU', 60, currentY + 6);
      doc.text('Equipo / Descripción', 150, currentY + 6);
      doc.text('Serial', 335, currentY + 6);
      doc.text('Días', 410, currentY + 6, { width: 30, align: 'center' });
      doc.text('Tarifa/Día', 450, currentY + 6, { width: 45, align: 'right' });
      doc.text('Subtotal', 500, currentY + 6, { width: 40, align: 'right' });

      currentY += 20;
      doc.fontSize(8).fillColor(textColor).font('CustomFont');

      const detalles = (evento.detalles as any[]) || [];
      
      if (detalles.length === 0) {
        doc.text('No hay equipos asignados a este evento.', 60, currentY + 6);
        currentY += 20;
      } else {
        detalles.forEach((det: any, index: number) => {
          const isEven = index % 2 === 0;
          if (isEven) {
            doc.rect(50, currentY, 495, 18).fill(lightGray);
          }
          
          doc.fillColor(textColor);
          const eq = det.instancia?.catalogo;
          doc.text(eq?.sku || 'N/A', 60, currentY + 5, { width: 85, ellipsis: true });
          doc.font('CustomFont-Bold').text(eq?.nombre_equipo || 'Equipo sin nombre', 150, currentY + 5, { width: 175, height: 10, ellipsis: true }).font('CustomFont');
          doc.text(det.instancia?.serial_tag || 'N/A', 335, currentY + 5, { width: 70, ellipsis: true });
          doc.text(det.dias_cobrados.toString(), 410, currentY + 5, { width: 30, align: 'center' });
          doc.text(formatCOP(det.tarifa_dia_congelada), 450, currentY + 5, { width: 45, align: 'right' });
          doc.font('CustomFont-Bold').text(formatCOP(det.subtotal), 500, currentY + 5, { width: 40, align: 'right' }).font('CustomFont');
          
          currentY += 18;

          if (currentY > 700) {
            doc.addPage();
            doc.font('CustomFont');
            currentY = 50;
          }
        });
      }

      // 4. TABLA DE ADICIONALES / LOGÍSTICA
      currentY += 20;
      const adicionales = (evento.adicionales as any[]) || [];
      
      if (adicionales.length > 0) {
        doc.fontSize(11).fillColor(primaryColor).font('CustomFont-Bold').text('SERVICIOS ADICIONALES Y LOGÍSTICA', 50, currentY);
        currentY += 20;

        doc.rect(50, currentY, 495, 20).fill(primaryColor);
        doc.fontSize(8).fillColor('#ffffff').font('CustomFont-Bold');
        doc.text('Tipo de Servicio', 60, currentY + 6);
        doc.text('Descripción del Concepto', 160, currentY + 6);
        doc.text('Costo Facturado', 460, currentY + 6, { width: 80, align: 'right' });

        currentY += 20;
        doc.fontSize(8).fillColor(textColor).font('CustomFont');

        adicionales.forEach((ad: any, index: number) => {
          const isEven = index % 2 === 0;
          if (isEven) {
            doc.rect(50, currentY, 495, 18).fill(lightGray);
          }

          doc.fillColor(textColor);
          doc.text(ad.tipo_adicional, 60, currentY + 5, { width: 90, ellipsis: true });
          doc.text(ad.descripcion, 160, currentY + 5, { width: 290, height: 10, ellipsis: true });
          doc.font('CustomFont-Bold').text(formatCOP(ad.costo_facturado), 460, currentY + 5, { width: 80, align: 'right' }).font('CustomFont');
          
          currentY += 18;

          if (currentY > 700) {
            doc.addPage();
            doc.font('CustomFont');
            currentY = 50;
          }
        });
      }

      // 5. RESUMEN DE TOTALES Y SECCIÓN DE FIRMAS
      currentY += 25;
      if (currentY > 600) {
        doc.addPage();
        doc.font('CustomFont');
        currentY = 50;
      }

      // Caja de Totales (Derecha)
      const summaryX = 350;
      doc.rect(summaryX, currentY, 195, 75).strokeColor(borderColor).lineWidth(1).stroke();
      
      doc.fontSize(9).fillColor(textColor);
      doc.font('CustomFont').text('Subtotal Equipos:', summaryX + 10, currentY + 12);
      doc.font('CustomFont-Bold').text(formatCOP(evento.total_equipos), summaryX + 110, currentY + 12, { align: 'right', width: 75 });
      
      doc.font('CustomFont').text('Subtotal Servicios:', summaryX + 10, currentY + 28);
      doc.font('CustomFont-Bold').text(formatCOP(evento.total_adicionales), summaryX + 110, currentY + 28, { align: 'right', width: 75 });
      
      // Línea divisoria en totales
      doc.strokeColor(borderColor).lineWidth(1).moveTo(summaryX + 10, currentY + 44).lineTo(summaryX + 185, currentY + 44).stroke();
      
      doc.fontSize(11).fillColor(primaryColor);
      doc.font('CustomFont-Bold').text('TOTAL NETO (COP):', summaryX + 10, currentY + 53);
      doc.fillColor(accentColor).text(formatCOP(evento.gran_total), summaryX + 110, currentY + 53, { align: 'right', width: 75 });

      // Términos y Condiciones (Izquierda)
      doc.fontSize(8).fillColor(textColor).font('CustomFont-Bold').text('TÉRMINOS Y CONDICIONES GENERALES:', 50, currentY);
      doc.font('CustomFont')
         .text('1. El arrendatario asume total responsabilidad del cuidado físico del equipo.', 50, currentY + 15, { width: 280 })
         .moveDown(0.3)
         .text('2. Todo daño, pérdida o avería parcial será descontado del depósito de garantía.', { width: 280 })
         .moveDown(0.3)
         .text('3. Las tarifas corresponden a los días estipulados en esta orden.', { width: 280 })
         .moveDown(0.3)
         .text('4. El pago total de los servicios adicionales debe liquidarse antes del montaje.', { width: 280 });

      // 6. FIRMAS DE ACEPTACIÓN
      currentY += 120;
      doc.strokeColor(textColor).lineWidth(0.5);
      
      // Firma Recibe Arrendatario
      doc.moveTo(70, currentY).lineTo(220, currentY).stroke();
      doc.fontSize(9).fillColor(primaryColor).font('CustomFont-Bold').text('Acepto (Firma del Cliente)', 70, currentY + 8, { align: 'center', width: 150 });
      doc.fontSize(8).fillColor(textColor).font('CustomFont').text('Nombre:', 70, currentY + 20).text('CC / NIT:', 70, currentY + 32);

      // Firma Entrega OnProduction
      doc.strokeColor(textColor).lineWidth(0.5);
      doc.moveTo(370, currentY).lineTo(520, currentY).stroke();
      doc.fontSize(9).fillColor(primaryColor).font('CustomFont-Bold').text('Entregado por OnProduction', 370, currentY + 8, { align: 'center', width: 150 });
      doc.fontSize(8).fillColor(textColor).font('CustomFont').text('Despachador Bodega:', 370, currentY + 20).text('Firma Autorizada:', 370, currentY + 32);

      // 7. PIE DE PÁGINA (Paginación)
      const pageCount = doc.bufferedPageRange().count;
      for (let i = 0; i < pageCount; i++) {
        doc.switchToPage(i);
        doc.fontSize(8).fillColor(textColor).text(
          `Página ${i + 1} de ${pageCount}`, 
          50, 
          780, 
          { align: 'center', width: 495 }
        );
      }

      doc.end();
    });

    // 5. Devolver el documento binario PDF
    return new Response(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="factura_evento_${evento.id}.pdf"`
      }
    });

  } catch (err: any) {
    console.error('Error interno generando PDF de factura:', err);
    return NextResponse.json({ error: 'Error interno del servidor', details: err.message }, { status: 500 });
  }
}
