// consultar-cotizaciones.js - Versión corregida sin importaciones ES6
import { db, auth } from '/config/firebase-config.js';

// Verificar que la importación funcionó
console.log('Firebase importado:', !!db, !!auth);
// =================================================================================
// ESTADO DE LA APLICACIÓN
// =================================================================================
const appState = {
    cotizaciones: [],
    filteredCotizaciones: [],
    clientes: [],
    contadores: {},
    categorias: [], // ← AÑADIR ESTO
    currentUser: null,
    pagination: {
        currentPage: 1,
        itemsPerPage: 10,
        totalPages: 1
    }
};

// =================================================================================
// CONSTANTES Y CONFIGURACIÓN
// =================================================================================
const LOGO_URL = '../../css/img/Logo-RSI-OFICIAL.png';
let logoBase64Cache = null;

const empresasDirecciones = { 
    'RSI IXT': { 
        nombre: 'RSI ENTERPRISE IXTAPALUCA', 
        direccion: 'Av. Morelos 10, Pueblo San Francisco Acuautla, 56587 Ixtapaluca, Méx.', 
        telefono: '+52 1 55 7690 8248', 
        rfc: 'RSI1810319G0' 
    },
    'RSI NEZA': { 
        nombre: 'RSI ENTERPRISE NEZAHUALCÓYOTL', 
        direccion: '31 MZ102 LT20 EL SOL 57200', 
        telefono: '+52 1 55 7690 8248', 
        rfc: 'RSI1810319G0' 
    }
};

// =================================================================================
// FUNCIONES DE UTILIDAD
// =================================================================================

async function getBase64ImageFromURL(url) {
    if (logoBase64Cache) return logoBase64Cache;
    
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous'; 
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            const dataURL = canvas.toDataURL('image/png');
            logoBase64Cache = dataURL; 
            resolve(dataURL);
        };
        img.onerror = (e) => {
            console.error("Error al cargar la imagen:", e);
            reject(new Error('No se pudo cargar la imagen del logo.'));
        };
        img.src = url;
    });
}

function mostrarLoading(mostrar) {
    const loadingSpinner = document.getElementById('loadingSpinner');
    if (loadingSpinner) {
        loadingSpinner.style.display = mostrar ? 'flex' : 'none';
    }
}

function mostrarAlerta(mensaje, tipo = 'info') { 
    if (typeof Swal !== 'undefined') {
        Swal.fire({
            toast: true,
            position: 'top-end',
            title: mensaje,
            icon: tipo,
            showConfirmButton: false,
            timer: 3000,
            timerProgressBar: true,
            background: 'var(--card-bg)',
            color: 'var(--text-color)'
        });
    } else {
        console.log(`[ALERTA ${tipo}]: ${mensaje}`);
        alert(mensaje);
    }
}

function formatearMoneda(cantidad) {
    return new Intl.NumberFormat('es-MX', { 
        style: 'currency', 
        currency: 'MXN' 
    }).format(cantidad);
}

function descargarPDFLocal(pdfBlob, nombreArchivo) {
    const url = URL.createObjectURL(pdfBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombreArchivo;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Función para obtener el nombre de la categoría por su ID
function obtenerNombreCategoria(categoriaId) {
    if (!categoriaId || !appState.categorias) return categoriaId || 'OTRO';
    const categoria = appState.categorias.find(c => c.id === categoriaId);
    return categoria ? categoria.nombre : categoriaId;
}

// Modificar la función agruparTecnologias para usar nombres de categoría
function agruparTecnologias(items) {
    if (!items) return {}; 
    
    const grupos = {};
    items.forEach(item => {
        // Usar el nombre de la categoría en lugar del ID
        const categoriaNombre = obtenerNombreCategoria(item.categoria) || 'OTRO';
        if (!grupos[categoriaNombre]) grupos[categoriaNombre] = [];
        grupos[categoriaNombre].push(item);
    });
    return grupos;
}

function formatDate(timestamp) {
    if (!timestamp) return 'N/A';
    try {
        if (timestamp.toDate) {
            return timestamp.toDate().toLocaleDateString('es-MX');
        }
        if (typeof timestamp === 'string') {
            return new Date(timestamp).toLocaleDateString('es-MX');
        }
        if (timestamp instanceof Date) {
            return timestamp.toLocaleDateString('es-MX');
        }
        return 'Fecha inválida';
    } catch (error) {
        console.error('Error al formatear fecha:', error);
        return 'Fecha inválida';
    }
}

// =================================================================================
// FUNCIONES DE FIREBASE v8
// =================================================================================

async function cargarInformacionUsuario(email) {
    try {
        const q = db.collection('colaboradores')
            .where("CORREO ELECTRÓNICO EMPRESARIAL", "==", email);
        const querySnapshot = await q.get();
        
        if (!querySnapshot.empty) {
            const doc = querySnapshot.docs[0];
            appState.currentUser.nombreCompleto = doc.data().NOMBRE || email;
        } else {
            appState.currentUser.nombreCompleto = email; 
        }
    } catch (error) {
        console.error('Error al cargar información del usuario:', error);
        appState.currentUser.nombreCompleto = email;
    }
}

async function cargarContadores() { 
    try {
        const contadoresSnapshot = await db.collection('contadoresCotizaciones').get();
        
        appState.contadores = {};
        contadoresSnapshot.forEach((doc) => { 
            appState.contadores[doc.id] = doc.data().count || 0; 
        });
    } catch (error) { 
        console.error('Error al cargar contadores:', error); 
    }
}

async function cargarClientes() { 
    try {
        const querySnapshot = await db.collection('clientes').get();
        
        appState.clientes = querySnapshot.docs.map(doc => {
            const data = doc.data();
            const limpiarValor = (valor) => (!valor || ['N/A', 'undefined', 'null'].includes(valor)) ? '' : String(valor).trim();
            const direccionPartes = [
                limpiarValor(data.Calle), 
                limpiarValor(data.Colonia), 
                limpiarValor(data['Codigo Postal'])
            ].filter(Boolean);
            
            const telefonoPartes = [
                limpiarValor(data.Telefono), 
                limpiarValor(data.Movil)
            ].filter(Boolean);
            
            return {
                id: doc.id,
                nombre: limpiarValor(data.Nombre) || 'Cliente sin nombre',
                nombreComercial: limpiarValor(data['Nombre Comercial']),
                rfc: limpiarValor(data.RFC),
                contacto1: direccionPartes.length > 0 ? direccionPartes.join(', ') : 'Dirección no disponible',
                telefono1: telefonoPartes.length > 0 ? telefonoPartes.join(' / ') : 'Teléfono no disponible'
            };
        });
    } catch (error) {
        console.error('Error al cargar clientes:', error);
        appState.clientes = [];
    }
}

// Función para cargar categorías desde Firebase
async function cargarCategorias() {
    try {
        const querySnapshot = await db.collection('categoriasProductoServicio').get();
        
        appState.categorias = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                nombre: data.nombreCategoria || 'Sin nombre',
                imagen: data.imagen || null
            };
        });
        console.log(`Categorías cargadas: ${appState.categorias.length}`);
    } catch (error) {
        console.error('Error al cargar categorías:', error);
        appState.categorias = [];
    }
}

async function cargarCotizaciones() {
    try {
        mostrarLoading(true);
        
        const q = db.collection('cotizacionPdf')
            .orderBy('fechaCreacion', 'desc');
        
        const querySnapshot = await q.get();
        
        appState.cotizaciones = querySnapshot.docs.map(doc => ({ 
            id: doc.id, 
            ...doc.data() 
        }));
        
        appState.filteredCotizaciones = [...appState.cotizaciones];
        appState.pagination.currentPage = 1;
        
        displayCotizaciones();
        
        console.log(`Cargadas ${appState.cotizaciones.length} cotizaciones`);
    } catch (error) {
        console.error('Error al cargar cotizaciones:', error);
        mostrarAlerta('❌ Error al cargar cotizaciones', 'error');
    } finally {
        mostrarLoading(false);
    }
}

async function buscarCotizacionesEnFirestore(termino) {
    try {
        mostrarLoading(true);
        
        if (!termino || termino.trim() === '') {
            await cargarCotizaciones();
            return;
        }
        
        const terminoMinusculas = termino.toLowerCase().trim();
        
        let resultadosFirestore = appState.cotizaciones.filter(coti => 
            coti.cotizacionNumero.toLowerCase().includes(terminoMinusculas) ||
            coti.clienteNombre.toLowerCase().includes(terminoMinusculas) ||
            (coti.cotizacionDescripcion && 
             coti.cotizacionDescripcion.toLowerCase().includes(terminoMinusculas))
        );
        
        // Ordenar por fecha más reciente
        resultadosFirestore.sort((a, b) => {
            const fechaA = a.fechaCreacion || a.cotizacionFecha;
            const fechaB = b.fechaCreacion || b.cotizacionFecha;
            return new Date(fechaB) - new Date(fechaA);
        });
        
        appState.filteredCotizaciones = resultadosFirestore;
        appState.pagination.currentPage = 1;
        displayCotizaciones();
        
        if (appState.filteredCotizaciones.length === 0) {
            mostrarAlerta('ℹ️ No se encontraron cotizaciones con ese criterio', 'info');
        }
        
    } catch (error) {
        console.error('Error en la búsqueda:', error);
        mostrarAlerta('❌ Error en la búsqueda', 'error');
    } finally {
        mostrarLoading(false);
    }
}

function filtrarCotizaciones() {
    const searchTerm = document.getElementById('searchInput').value.trim();
    
    if (searchTerm === '') {
        appState.filteredCotizaciones = [...appState.cotizaciones];
        appState.pagination.currentPage = 1;
        displayCotizaciones();
        return;
    }
    
    buscarCotizacionesEnFirestore(searchTerm);
}

// =================================================================================
// FUNCIONES DE GENERACIÓN DE PDF
// =================================================================================

async function generarPDF(data) {
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 15;
    
    const textColor = '#000000';
    const gray = '#6b7280';
    const navy = '#0d2c54';
    const lightGray = '#f5f5f5';
    
    const formatearNumero = (num) => new Intl.NumberFormat('es-MX', { 
        style: 'currency', 
        currency: 'MXN' 
    }).format(num).replace('MX', '').trim();
    
    const colX = { 
        desc: margin, 
        unidad: margin + 90, 
        cant: margin + 110, 
        precio: margin + 130, 
        total: margin + 160 
    };
    
    let page = 1;
    let y = 20;
    
    const nuevaPagina = () => { 
        pdf.addPage(); 
        page++; 
        y = 20; 
    };
    
    const piePagina = () => pdf.setFontSize(8)
        .setTextColor(gray)
        .text(`Cotización No. ${data.cotizacionNumero} | Página ${page}`, 
              pageWidth / 2, pageHeight - 10, { align: 'center' });
    
    // Mapa de nombres de categoría para mostrar en el PDF (actualizado)
    const categoriaDisplayMap = {
        'CCTV': '📹 CCTV', 
        'DETECTOR DE HUMO': '🏠 DETECTOR DE HUMO',
        'DH': '🏠 DETECTOR DE HUMO',
        'CONTROL DE ACCESOS': '🔐 CONTROL DE ACCESOS',
        'CA': '🔐 CONTROL DE ACCESOS',
        'ALARMA INTRUSION': '🚨 ALARMA INTRUSIÓN', 
        'ALARMA INTRUSIÓN': '🚨 ALARMA INTRUSIÓN',
        'ALARMA': '🚨 ALARMA INTRUSIÓN',
        'MULTIMEDIA': '📺 MULTIMEDIA', 
        'REDES': '🛜 REDES TRANSPORTE DE DATOS', 
        'OTRO': '📦 OTRO',
        'AI': '🚨 ALARMA INTRUSIÓN',
        'SIN CATEGORÍA': '📦 OTRO'
    };
    
    try {
        const logoData = await getBase64ImageFromURL(LOGO_URL);
        pdf.addImage(logoData, 'PNG', pageWidth - margin - 40, margin, 40, 40);
    } catch (e) { 
        console.warn('No se pudo cargar el logo:', e); 
    }
    
    // Encabezado
    pdf.setFontSize(10).setTextColor(navy)
        .text(data.empresaNombre || "RSI ENTERPRISE", margin, y + 5);
    pdf.setFontSize(8).setTextColor(gray)
        .text(data.empresaDireccion || "", margin, y + 10)
        .text(`RFC: ${data.empresaRFC || ''} | Tel: ${data.empresaTelefono || ''}`, margin, y + 15);
    y += 25;
    
    // Título
    pdf.setFontSize(14).setTextColor(navy)
        .text("COTIZACIÓN", pageWidth / 2, y, { align: 'center' });
    pdf.setFontSize(9).setTextColor(gray)
        .text(`No. ${data.cotizacionNumero} | Fecha: ${new Date(data.cotizacionFecha).toLocaleDateString('es-MX')}`, 
              pageWidth / 2, y + 7, { align: 'center' });
    y += 20;
    
    // Descripción
    if (data.cotizacionDescripcion && data.cotizacionDescripcion.trim().length > 0) {
        pdf.setFontSize(9).setTextColor(navy).setFont('helvetica', 'bold')
            .text("DESCRIPCIÓN:", margin, y); 
        y += 5;
        pdf.setFontSize(9).setTextColor(textColor).setFont('helvetica', 'normal');
        const descLines = pdf.splitTextToSize(data.cotizacionDescripcion.trim(), pageWidth - 2 * margin);
        descLines.forEach(line => { 
            pdf.text(line, margin, y); 
            y += 5; 
        });
        y += 5;
    }
    
    // Información del cliente
    pdf.setFontSize(9).setTextColor(textColor)
        .text(`Cliente: ${data.clienteNombre}`, margin, y); 
    y += 5;
    pdf.text(`RFC: ${data.clienteRFC || 'N/E'}`, margin, y); 
    y += 5; 
    pdf.text(`Dirección: ${data.clienteDireccion}`, margin, y); 
    y += 10;
    
    // Información de la cotización
    const tipoCotizacionMap = { 
        'implementacion': 'Implementación', 
        'proyecto': 'Proyecto', 
        'servicio': 'Servicio' 
    };
    let infoPago = `Pago: ${data.tipoCredito || 'N/E'}`;
    if (data.tipoCredito === 'credito' && data.diasCredito) {
        infoPago += ` (${data.diasCredito} días)`;
    }
    const info = [
        `Tipo: ${tipoCotizacionMap[data.tipoCotizacion] || 'N/E'}`,
        `Vigencia: ${data.cotizacionVigencia} días`,
        `Moneda: ${data.cotizacionMoneda}`,
        infoPago
    ].join(" | ");
    pdf.text(info, margin, y); 
    y += 10;
    
    // Items agrupados por categoría (ahora con nombres de categoría)
    const grupos = agruparTecnologias(data.items); 
    Object.entries(grupos).forEach(([categoriaNombre, items]) => {
        // Usar el mapa de categorías o el nombre directamente
        const textoCompleto = categoriaDisplayMap[categoriaNombre] || categoriaNombre;
        const displayCategoria = textoCompleto.replace(/^(.*?)\s/, '').trim();
        
        if (y > pageHeight - 70) { 
            piePagina(); 
            nuevaPagina(); 
        }
        
        // Encabezado de categoría
        pdf.setFillColor(navy).rect(margin, y, pageWidth - 2 * margin, 12, 'F');
        pdf.setFontSize(12).setTextColor('#FFFFFF').setFont('helvetica', 'bold')
            .text(displayCategoria, pageWidth / 2, y + 8, { align: 'center' });
        y += 14;
        
        // Encabezado de tabla
        pdf.setFillColor(navy).rect(margin, y, pageWidth - 2 * margin, 8, 'F');
        pdf.setFontSize(8).setFont('helvetica', 'normal')
            .text("DESCRIPCIÓN", colX.desc, y + 5)
            .text("UNIDAD", colX.unidad, y + 5, { align: 'center' })
            .text("CANT.", colX.cant, y + 5, { align: 'right' })
            .text("P. UNIT.", colX.precio, y + 5, { align: 'right' })
            .text("TOTAL", colX.total, y + 5, { align: 'right' });
        y += 10;
        
        // Items de la categoría
        items.forEach((item, index) => {
            // Asegurar que tenemos el nombre completo de la categoría en el item
            if (!item.categoriaNombre && item.categoria) {
                item.categoriaNombre = obtenerNombreCategoria(item.categoria);
            }
            
            const descLines = pdf.splitTextToSize(item.descripcion, colX.unidad - colX.desc - 5);
            const itemHeight = Math.max(descLines.length * 5, 10) + 2;
            
            if (y + itemHeight > pageHeight - 20) { 
                piePagina(); 
                nuevaPagina(); 
            }
            
            if (index % 2 === 0) {
                pdf.setFillColor(lightGray).rect(margin, y, pageWidth - 2 * margin, itemHeight, 'F');
            }
            
            pdf.setTextColor(textColor);
            descLines.forEach((line, i) => pdf.text(line, colX.desc, y + 5 + (i * 5)));
            pdf.text(item.tipoTecnologia ? item.tipoTecnologia.slice(0, 4) : '', colX.unidad, y + 5, { align: 'center' });
            pdf.text(item.cantidad ? item.cantidad.toString() : '0', colX.cant, y + 5, { align: 'right' });
            pdf.text(formatearNumero(item.precio || 0), colX.precio, y + 5, { align: 'right' });
            pdf.text(formatearNumero(item.total || 0), colX.total, y + 5, { align: 'right' });
            
            pdf.setDrawColor(200, 200, 200).line(margin, y + itemHeight, pageWidth - margin, y + itemHeight);
            y += itemHeight;
        });
        
        y += 2;
    });
    
    // Totales
    const tableStartX = colX.total - 82;
    const valueColX = tableStartX + 70;
    
    pdf.setFontSize(9).setTextColor(textColor)
        .text("Subtotal:", tableStartX, y + 5, { align: 'left' })
        .text(formatearNumero(data.subtotal || 0), valueColX, y + 5, { align: 'left' });
    y += 5;
    
    if (data.descuentoMonto > 0) { 
        pdf.text(`Descuento (${data.descuento || 0}%):`, tableStartX, y + 5, { align: 'left' })
            .text(`-${formatearNumero(data.descuentoMonto || 0)}`, valueColX, y + 5, { align: 'left' });
        y += 5; 
    }
    
    pdf.text(`IVA (${data.impuesto || 16}%):`, tableStartX, y + 5, { align: 'left' })
        .text(formatearNumero(data.impuestoMonto || 0), valueColX, y + 5, { align: 'left' });
    y += 7;
    
    pdf.setFont('helvetica', 'bold').setTextColor(navy)
        .text("TOTAL:", tableStartX, y + 5, { align: 'left' })
        .text(`${formatearNumero(data.totalFinal || 0)} ${data.cotizacionMoneda || 'MXN'}`, valueColX, y + 5, { align: 'left' });
    
    // Términos y condiciones
    if (data.terminos) {
        y += 20;
        if (y > pageHeight - 50) { 
            piePagina(); 
            nuevaPagina(); 
        }
        
        pdf.setFontSize(9).setTextColor(navy).setFont('helvetica', 'normal')
            .text("TÉRMINOS Y CONDICIONES", margin, y); 
        y += 5;
        pdf.setTextColor(textColor);
        
        data.terminos.split('\n').forEach(term => {
            if (term.trim()) {
                pdf.splitTextToSize(term, pageWidth - 2 * margin).forEach(line => {
                    if (y > pageHeight - 20) { 
                        piePagina(); 
                        nuevaPagina(); 
                    }
                    pdf.text(line, margin, y); 
                    y += 5;
                });
            }
        });
    }
    
    piePagina();
    return pdf.output('blob');
}

// =================================================================================
// FUNCIONES DE INTERFAZ
// =================================================================================

function displayCotizaciones() {
    const tbody = document.getElementById('cotizacionesTableBody');
    const mobileContainer = document.getElementById('mobileCardsContainer');
    const paginationContainer = document.querySelector('.pagination-container');
    
    const startIndex = (appState.pagination.currentPage - 1) * appState.pagination.itemsPerPage;
    const endIndex = startIndex + appState.pagination.itemsPerPage;
    const currentItems = appState.filteredCotizaciones.slice(startIndex, endIndex);
    
    appState.pagination.totalPages = Math.ceil(appState.filteredCotizaciones.length / appState.pagination.itemsPerPage);
    
    tbody.innerHTML = '';
    mobileContainer.innerHTML = '';
    
    if (!currentItems || currentItems.length === 0) {
        const emptyMessage = `
            <tr>
                <td colspan="9" class="empty-state">
                    <i class="fas fa-inbox"></i>
                    <h3>No hay cotizaciones para mostrar</h3>
                    <p>${document.getElementById('searchInput').value ? 
                        'Intenta ajustar los filtros de búsqueda' : 
                        'No se encontraron cotizaciones en el sistema'}</p>
                </td>
            </tr>
        `;
        tbody.innerHTML = emptyMessage;
        mobileContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-inbox"></i>
                <h3>No hay cotizaciones para mostrar</h3>
                <p>${document.getElementById('searchInput').value ? 
                    'Intenta ajustar los filtros de búsqueda' : 
                    'No se encontraron cotizaciones en el sistema'}</p>
            </div>
        `;
        
        if (paginationContainer) {
            paginationContainer.innerHTML = '';
        }
        return;
    }

    // Mostrar tabla para escritorio
    const rowsHtml = currentItems.map(coti => {
        const estatusInfo = { 
            'vendida': { color: '#22c55e', textoBase: '✅ Vendida' }, 
            'en proceso': { color: '#f59e0b', textoBase: '⏳ En Proceso' }, 
            'rechazada': { color: '#ef4444', textoBase: '❌ Rechazada' } 
        };
        
        // Validar que el estatus sea uno de los permitidos
        const estatusActual = coti.estatus || 'en proceso';
        const estatusValido = ['vendida', 'en proceso', 'rechazada'].includes(estatusActual) 
            ? estatusActual 
            : 'en proceso';
        
        const info = estatusInfo[estatusValido];
        let textoCompleto = info ? info.textoBase : estatusInfo['en proceso'].textoBase;
        
        if (estatusValido === 'vendida') {
            textoCompleto += ` - ${coti.pagoEstatus === 'pagada' ? 'Pagada' : 'Pendiente'}`;
        } else if (estatusValido === 'rechazada' && coti.motivoRechazo) {
            textoCompleto += `: ${coti.motivoRechazo}`;
        }
        
        const tieneTicketAsociado = coti.ticketAsociado && coti.ticketAsociado.trim() !== '';
        
        const descripcionCompleta = coti.cotizacionDescripcion || 'N/A';
        const descripcionCorta = descripcionCompleta.length > 30 ? 
            descripcionCompleta.substring(0, 30) + '...' : 
            descripcionCompleta;
        
        return `
            <tr>
                <td><strong>${coti.cotizacionNumero}</strong></td>
                <td>${coti.clienteNombre}</td>
                <td>${formatDate(coti.cotizacionFecha)}</td>
                <td><strong>${formatearMoneda(coti.totalFinal)}</strong></td>
                <td>
                    <div class="descripcion-container">
                        <span class="descripcion-texto">${descripcionCorta}</span>
                        <div class="descripcion-tooltip">
                            ${descripcionCompleta}
                        </div>
                    </div>
                </td>
                <td><small>${coti.generadoPor?.nombre || 'N/A'}</small></td>
                <td>
                    ${tieneTicketAsociado ? 
                        `<div class="ticket-asociado asociado">
                            <strong>${coti.ticketAsociado}</strong>
                            <br>
                            <a href="../verticket/verTicket.html?id=${coti.ticketAsociado}" class="btn-ticket">
                                Ver Ticket
                            </a>
                        </div>` :
                        `<div class="ticket-asociado no-asociado">
                            N/A
                        </div>`}
                </td>
                <td>
                    <div style="background-color: ${info.color}1A; border: 1px solid ${info.color}; padding: 8px; border-radius: 8px;">
                        <span style="color: ${info.color}; font-weight: bold; font-size: 0.8rem;">${textoCompleto}</span>
                        <select class="estatus-select" data-id="${coti.id}" style="width:100%;">
                            <option value="en proceso" ${estatusValido === 'en proceso' ? 'selected' : ''}>En Proceso</option>
                            <option value="vendida" ${estatusValido === 'vendida' ? 'selected' : ''}>Vendida</option>
                            <option value="rechazada" ${estatusValido === 'rechazada' ? 'selected' : ''}>Rechazada</option>
                        </select>
                        <div class="additional-status-fields ${estatusValido === 'vendida' ? 'show' : ''}">
                            <select class="pago-estatus-select" data-id="${coti.id}" style="width:100%;">
                                <option value="pendiente" ${coti.pagoEstatus === 'pendiente' ? 'selected' : ''}>Pendiente</option>
                                <option value="pagada" ${coti.pagoEstatus === 'pagada' ? 'selected' : ''}>Pagada</option>
                            </select>
                        </div>
                        <div class="additional-status-fields ${estatusValido === 'rechazada' ? 'show' : ''}">
                            <textarea class="motivo-rechazo-input" data-id="${coti.id}" placeholder="Motivo..." style="width:100%;">${coti.motivoRechazo || ''}</textarea>
                        </div>
                    </div>
                </td>
                <td>
                    <button class="action-btn view" data-id="${coti.id}" title="Ver PDF">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="action-btn download" data-id="${coti.id}" title="Descargar PDF">
                        <i class="fas fa-download"></i>
                    </button>
                    <a href="../editar-cotizacion/editar-cotizacion.html?id=${coti.id}" class="action-btn edit" title="Editar">
                        <i class="fas fa-edit"></i>
                    </a>
                    <button class="action-btn delete" data-id="${coti.id}" title="Eliminar">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');

    tbody.innerHTML = rowsHtml;

    // Mostrar tarjetas para móvil
    const cardsHtml = currentItems.map(coti => {
        const estatusInfo = { 
            'vendida': { color: '#22c55e', textoBase: '✅ Vendida' }, 
            'en proceso': { color: '#f59e0b', textoBase: '⏳ En Proceso' }, 
            'rechazada': { color: '#ef4444', textoBase: '❌ Rechazada' } 
        };
        
        // Validar que el estatus sea uno de los permitidos
        const estatusActual = coti.estatus || 'en proceso';
        const estatusValido = ['vendida', 'en proceso', 'rechazada'].includes(estatusActual) 
            ? estatusActual 
            : 'en proceso';
        
        const info = estatusInfo[estatusValido] || estatusInfo['en proceso'];
        
        const tieneTicketAsociado = coti.ticketAsociado && coti.ticketAsociado.trim() !== '';
        
        return `
            <div class="cotizacion-card">
                <div class="card-row">
                    <span class="card-label">Número:</span>
                    <span class="card-value"><strong>${coti.cotizacionNumero}</strong></span>
                </div>
                <div class="card-row">
                    <span class="card-label">Cliente:</span>
                    <span class="card-value">${coti.clienteNombre}</span>
                </div>
                <div class="card-row">
                    <span class="card-label">Fecha:</span>
                    <span class="card-value">${formatDate(coti.cotizacionFecha)}</span>
                </div>
                <div class="card-row">
                    <span class="card-label">Total:</span>
                    <span class="card-value"><strong>${formatearMoneda(coti.totalFinal)}</strong></span>
                </div>
                <div class="card-row">
                    <span class="card-label">Descripción:</span>
                    <span class="card-value">${coti.cotizacionDescripcion || 'N/A'}</span>
                </div>
                <div class="card-row">
                    <span class="card-label">Generado por:</span>
                    <span class="card-value"><small>${coti.generadoPor?.nombre || 'N/A'}</small></span>
                </div>
                <div class="card-row">
                    <span class="card-label">Ticket:</span>
                    <span class="card-value">
                        ${tieneTicketAsociado ? 
                            `<div class="ticket-asociado asociado">
                                <strong>${coti.ticketAsociado}</strong>
                                <a href="../verticket/verTicket.html?id=${coti.ticketAsociado}" class="btn-ticket">
                                    Ver Ticket
                                </a>
                            </div>` :
                            `<div class="ticket-asociado no-asociado">
                                N/A
                            </div>`}
                    </span>
                </div>
                <div class="card-row">
                    <span class="card-label">Estatus:</span>
                    <span class="card-value" style="color: ${info.color}; font-weight: bold;">
                        ${estatusValido === 'vendida' ? 
                            `${coti.pagoEstatus === 'pagada' ? 'Pagada' : 'Pendiente'}` : 
                            estatusValido}
                    </span>
                </div>
                <div class="card-actions">
                    <button class="action-btn view" data-id="${coti.id}" title="Ver PDF">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="action-btn download" data-id="${coti.id}" title="Descargar PDF">
                        <i class="fas fa-download"></i>
                    </button>
                    <a href="cotizacion_formulario.html?id=${coti.id}" class="action-btn edit" title="Editar">
                        <i class="fas fa-edit"></i>
                    </a>
                    <button class="action-btn delete" data-id="${coti.id}" title="Eliminar">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');

    mobileContainer.innerHTML = cardsHtml;
    
    // Configurar eventos
    setupTableEvents();
    
    // Mostrar paginación
    if (paginationContainer && appState.pagination.totalPages > 1) {
        renderPagination();
    } else if (paginationContainer) {
        paginationContainer.innerHTML = '';
    }
}

function setupTableEvents() {
    // Eventos para botones de ver PDF
    document.querySelectorAll('.action-btn.view').forEach(btn => {
        btn.addEventListener('click', (e) => verPDF(e.currentTarget.dataset.id));
    });
    
    // Eventos para botones de descargar PDF
    document.querySelectorAll('.action-btn.download').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = e.currentTarget.dataset.id;
            const cotizacion = appState.cotizaciones.find(c => c.id === id);
            if (cotizacion) { 
                mostrarLoading(true); 
                try { 
                    const pdfBlob = await generarPDF(cotizacion); 
                    descargarPDFLocal(pdfBlob, `cotizacion-${cotizacion.cotizacionNumero}.pdf`); 
                } catch (error) { 
                    mostrarAlerta('Error al descargar PDF', 'error'); 
                } finally { 
                    mostrarLoading(false); 
                } 
            }
        });
    });
    
    // Eventos para botones de eliminar
    document.querySelectorAll('.action-btn.delete').forEach(btn => {
        btn.addEventListener('click', (e) => confirmarEliminacion(e.currentTarget.dataset.id));
    });
    
    // Eventos para selects de estatus
    document.querySelectorAll('.estatus-select').forEach(select => {
        select.addEventListener('change', (e) => {
            const id = e.target.dataset.id;
            const nuevoEstatus = e.target.value;
            const vendidaDiv = e.target.nextElementSibling;
            const rechazadaDiv = e.target.nextElementSibling.nextElementSibling;
            
            if (vendidaDiv) vendidaDiv.classList.toggle('show', nuevoEstatus === 'vendida');
            if (rechazadaDiv) rechazadaDiv.classList.toggle('show', nuevoEstatus === 'rechazada');
            
            actualizarEstatusCotizacion(id, { estatus: nuevoEstatus });
        });
    });
    
    document.querySelectorAll('.pago-estatus-select').forEach(select => {
        select.addEventListener('change', (e) => {
            actualizarEstatusCotizacion(e.target.dataset.id, { pagoEstatus: e.target.value });
        });
    });
    
    document.querySelectorAll('.motivo-rechazo-input').forEach(textarea => {
        textarea.addEventListener('blur', (e) => {
            actualizarEstatusCotizacion(e.target.dataset.id, { motivoRechazo: e.target.value });
        });
    });
}

function renderPagination() {
    const paginationContainer = document.querySelector('.pagination-container');
    if (!paginationContainer) return;
    
    paginationContainer.innerHTML = '';
    const { currentPage, totalPages } = appState.pagination;
    
    // Botón Anterior
    const prevButton = createPaginationButton(
        '<i class="fas fa-chevron-left"></i>', 
        'prev', 
        currentPage === 1, 
        () => changePage(currentPage - 1)
    );
    paginationContainer.appendChild(prevButton);
    
    // Números de página
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);
    
    for (let i = startPage; i <= endPage; i++) {
        const pageButton = createPaginationButton(
            i, 
            i === currentPage ? 'active' : '', 
            false, 
            () => changePage(i)
        );
        paginationContainer.appendChild(pageButton);
    }
    
    // Botón Siguiente
    const nextButton = createPaginationButton(
        '<i class="fas fa-chevron-right"></i>', 
        'next', 
        currentPage >= totalPages, 
        () => changePage(currentPage + 1)
    );
    paginationContainer.appendChild(nextButton);
}

function createPaginationButton(text, type, disabled, onClick) {
    const button = document.createElement('button');
    button.className = `pagination-btn ${type}`;
    button.innerHTML = text;
    button.disabled = disabled;
    button.addEventListener('click', onClick);
    return button;
}

function changePage(pageNumber) {
    if (pageNumber < 1 || pageNumber > appState.pagination.totalPages) return;
    appState.pagination.currentPage = pageNumber;
    displayCotizaciones();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// =================================================================================
// FUNCIONES DE CRUD
// =================================================================================

async function verPDF(id) {
    try {
        mostrarLoading(true);
        
        const cotizacion = appState.cotizaciones.find(c => c.id === id);
        if (!cotizacion) {
            mostrarAlerta('❌ No se encontró la cotización', 'error');
            return;
        }
        
        const pdfBlob = await generarPDF(cotizacion);
        const pdfUrl = URL.createObjectURL(pdfBlob);
        
        const pdfViewer = document.getElementById('pdfViewer');
        pdfViewer.innerHTML = `<iframe src="${pdfUrl}" width="100%" height="600" frameborder="0"></iframe>`;
        
        const modalPDF = document.getElementById('modalPDF');
        modalPDF.style.display = 'flex';
        
    } catch (error) {
        console.error('Error al generar vista previa del PDF:', error);
        mostrarAlerta('❌ Error al generar vista previa del PDF', 'error');
    } finally {
        mostrarLoading(false);
    }
}

async function actualizarEstatusCotizacion(id, dataToUpdate) {
    try {
        await db.collection('cotizacionPdf').doc(id).update(dataToUpdate);
        mostrarAlerta('✅ Estatus actualizado correctamente', 'success');
        
        const index = appState.cotizaciones.findIndex(c => c.id === id);
        if (index !== -1) {
            appState.cotizaciones[index] = { ...appState.cotizaciones[index], ...dataToUpdate };
            appState.filteredCotizaciones = [...appState.cotizaciones];
            displayCotizaciones();
        }
    } catch (error) {
        console.error('Error al actualizar estatus:', error);
        mostrarAlerta('❌ Error al actualizar estatus', 'error');
    }
}

async function eliminarCotizacion(id) {
    try {
        mostrarLoading(true);
        await db.collection('cotizacionPdf').doc(id).delete();
        mostrarAlerta('✅ Cotización eliminada correctamente', 'success');
        await cargarCotizaciones();
    } catch (error) {
        console.error('Error al eliminar cotización:', error);
        mostrarAlerta('❌ Error al eliminar cotización', 'error');
    } finally {
        mostrarLoading(false);
    }
}

function confirmarEliminacion(id) {
    const cotizacion = appState.cotizaciones.find(c => c.id === id);
    if (!cotizacion) return;
    
    Swal.fire({
        title: '¿Eliminar cotización?',
        html: `¿Estás seguro de que deseas eliminar la cotización<br><strong>${cotizacion.cotizacionNumero}</strong>?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: 'var(--primary-color)',
        cancelButtonColor: 'var(--danger-color)',
        background: 'var(--card-bg)',
        color: 'var(--text-color)',
        reverseButtons: true
    }).then((result) => {
        if (result.isConfirmed) {
            eliminarCotizacion(id);
        }
    });
}

// =================================================================================
// FUNCIONES DE RESUMEN
// =================================================================================

function mostrarModalResumen() {
    const modalResumenCuentas = document.getElementById('modalResumenCuentas');
    modalResumenCuentas.style.display = 'flex';
    calcularYMostrarResumen('todos');
}

function calcularYMostrarResumen(filtro = 'todos') {
    let cotizacionesFiltradas = appState.cotizaciones;
    
    if (filtro !== 'todos') {
        cotizacionesFiltradas = appState.cotizaciones.filter(coti => 
            coti.estatus === filtro
        );
    }
    
    const sumaTotal = cotizacionesFiltradas.reduce((total, coti) => 
        total + (parseFloat(coti.totalFinal) || 0), 0
    );
    
    const titulos = {
        'todos': 'Total de Todas las Cotizaciones',
        'en proceso': 'Total de Cotizaciones en Proceso',
        'vendida': 'Total de Cotizaciones Vendidas',
        'rechazada': 'Total de Cotizaciones Rechazadas'
    };
    
    document.getElementById('resumenTitulo').textContent = titulos[filtro] || titulos.todos;
    document.getElementById('resumenSumaTotal').textContent = formatearMoneda(sumaTotal);
}

// =================================================================================
// CONFIGURACIÓN DE EVENTOS
// =================================================================================

function setupEventListeners() {
    // Evento de búsqueda
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', filtrarCotizaciones);
    }
    
    // Botón resumen de cuentas
    const resumenCuentasBtn = document.getElementById('resumenCuentasBtn');
    if (resumenCuentasBtn) {
        resumenCuentasBtn.addEventListener('click', mostrarModalResumen);
    }
    
    // Filtros del resumen
    const resumenFiltrosContainer = document.getElementById('resumenFiltros');
    if (resumenFiltrosContainer) {
        resumenFiltrosContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-filtro')) {
                document.querySelectorAll('.btn-filtro').forEach(btn => 
                    btn.classList.remove('active')
                );
                e.target.classList.add('active');
                const filtro = e.target.dataset.filtro;
                calcularYMostrarResumen(filtro);
            }
        });
    }
    
    // Cerrar modales
    const cerrarPdfBtn = document.getElementById('cerrarPdfBtn');
    if (cerrarPdfBtn) {
        cerrarPdfBtn.addEventListener('click', () => {
            document.getElementById('modalPDF').style.display = 'none';
        });
    }
    
    const cerrarResumenBtn = document.getElementById('cerrarResumenBtn');
    if (cerrarResumenBtn) {
        cerrarResumenBtn.addEventListener('click', () => {
            document.getElementById('modalResumenCuentas').style.display = 'none';
        });
    }
    
    // Cerrar modales al hacer clic fuera
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    });
}

// =================================================================================
// INICIALIZACIÓN
// =================================================================================

async function inicializarApp() {
    try {
        console.log('Iniciando carga de gestión de cotizaciones...');
        
        // Verificar que Firebase esté disponible
        if (typeof firebase === 'undefined') {
            console.error('Firebase no está cargado. Verifica las importaciones en el HTML.');
            mostrarAlerta('Error de configuración: Firebase no está disponible', 'error');
            return;
        }
        
        // Verificar autenticación
        auth.onAuthStateChanged(async (user) => {
            if (user) {
                appState.currentUser = user;
                mostrarLoading(true);
                
                await cargarInformacionUsuario(user.email);
                
                // Mostrar botones especiales para usuarios autorizados
                const nombresAutorizados = [
                    "Sergio Rodriguez Murillo", 
                    "Tomás Ismael Rodriguez Murillo", 
                    "Emanuel Jesus Campa Ramirez"
                ];
                
                if (appState.currentUser && nombresAutorizados.includes(appState.currentUser.nombreCompleto)) {
                    const descargarBtn = document.getElementById('descargarTodasBtn');
                    const resumenBtn = document.getElementById('resumenCuentasBtn');
                    
                    if (descargarBtn) descargarBtn.style.display = 'inline-flex';
                    if (resumenBtn) resumenBtn.style.display = 'inline-flex';
                }
                
                await Promise.all([
                    cargarClientes(),
                    cargarContadores(),
                    cargarCategorias() // ← AÑADIR ESTO
                ]);
                
                await cargarCotizaciones();
                
                setupEventListeners();
                
                mostrarLoading(false);
            } else {
                Swal.fire({
                    title: 'Acceso no autorizado',
                    text: 'Debes iniciar sesión para acceder a esta función',
                    icon: 'warning',
                    confirmButtonText: 'Iniciar sesión',
                    confirmButtonColor: 'var(--primary-color)',
                    background: 'var(--card-bg)',
                    color: 'var(--text-color)'
                }).then(() => {
                    window.location.href = '../nav-visitantes/inicio-de-sesion.html';
                });
            }
        });
    } catch (error) {
        console.error("Error en la carga inicial:", error);
        mostrarAlerta('No se pudieron cargar los datos iniciales.', 'error');
    }
}

// Iniciar la aplicación cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inicializarApp);
} else {
    inicializarApp();
}