// consultarCotizaciones.js - Controlador/Vista para consulta de cotizaciones (Firebase v8)
// Importar Firebase v8 desde CDN (ya incluido en HTML)

// =================================================================================
// ESTADO DE LA APLICACIÓN
// =================================================================================
const appState = {
    cotizaciones: [],
    filteredCotizaciones: [],
    clientes: [],
    contadores: {},
    currentUser: null,
    pagination: {
        currentPage: 1,
        itemsPerPage: 30,
        totalPages: 1
    },
    isLoading: false
};

// Constantes
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

// Firebase
let db, auth;

// =================================================================================
// FUNCIONES PRINCIPALES - CARGA INICIAL
// =================================================================================

async function initialLoad() {
    try {
        console.log('Iniciando carga de cotizaciones...');
        
        // PASO 1: Asegurarnos de que firebase-config.js se ha cargado
        // firebase-config.js ya debe estar incluido en el HTML antes de este archivo
        // Si no está cargado, lo cargamos dinámicamente
        if (typeof firebase === 'undefined' || !firebase.apps || firebase.apps.length === 0) {
            console.log('Firebase no detectado, cargando configuración...');
            await cargarConfiguracionFirebase();
        }
        
        // PASO 2: Verificar que Firebase esté inicializado
        // firebase-config.js ya debería haber inicializado Firebase
        if (typeof firebase === 'undefined') {
            console.error('❌ Firebase no está disponible');
            throw new Error('Firebase no está cargado');
        }
        
        // Verificar si hay una app de Firebase inicializada
        if (!firebase.apps || firebase.apps.length === 0) {
            console.error('❌ No hay apps de Firebase inicializadas');
            // Intentar usar las variables globales desde firebase-config.js
            if (window.db && window.auth) {
                db = window.db;
                auth = window.auth;
                console.log('✅ Usando Firebase desde variables globales');
            } else {
                throw new Error('Firebase no está inicializado');
            }
        } else {
            // Usar Firebase normalmente
            db = firebase.firestore();
            auth = firebase.auth();
            console.log('✅ Firebase v8 disponible, apps count:', firebase.apps.length);
        }
        
        await setupEventListeners();
        console.log('Event listeners configurados');
        
        // Cargar datos sin requerir autenticación
        showLoadingState(true);
        await Promise.all([
            cargarClientes(),
            cargarContadores()
        ]);
        await cargarCotizaciones();
        showLoadingState(false);
        
        console.log('Aplicación inicializada - Modo público');
        
    } catch (error) {
        console.error("Error en la carga inicial:", error);
        showError('No se pudieron cargar los datos iniciales. Verifica tu conexión.');
    }
}

// Función para cargar dinámicamente firebase-config.js si es necesario
function cargarConfiguracionFirebase() {
    return new Promise((resolve, reject) => {
        // Verificar si ya está cargado
        if (window.db && window.auth) {
            resolve();
            return;
        }
        
        // Crear y cargar el script
        const script = document.createElement('script');
        script.src = '/config/firebase-config.js';
        script.type = 'text/javascript';
        
        script.onload = () => {
            console.log('✅ firebase-config.js cargado dinámicamente');
            // Esperar un momento para que se ejecute
            setTimeout(() => {
                if (window.db && window.auth) {
                    resolve();
                } else {
                    reject(new Error('firebase-config.js no inicializó las variables'));
                }
            }, 500);
        };
        
        script.onerror = (error) => {
            console.error('❌ Error al cargar firebase-config.js:', error);
            reject(new Error('No se pudo cargar la configuración de Firebase'));
        };
        
        document.head.appendChild(script);
    });
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
            const direccionPartes = [limpiarValor(data.Calle), limpiarValor(data.Colonia), limpiarValor(data['Codigo Postal'])].filter(Boolean);
            const telefonoPartes = [limpiarValor(data.Telefono), limpiarValor(data.Movil)].filter(Boolean);
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
        showAlert('Error al cargar la lista de clientes', 'warning');
    }
}

async function cargarCotizaciones() {
    if (appState.isLoading) return;
    
    appState.isLoading = true;
    showLoadingState(true);
    
    try {
        console.log('Solicitando cotizaciones...');
        const q = db.collection('cotizacionPdf')
            .orderBy('fechaCreacion', 'desc');
        
        const querySnapshot = await q.get();
        
        appState.cotizaciones = querySnapshot.docs.map(docSnap => {
            const data = docSnap.data();
            
            // Obtener información del usuario que actualizó
            let actualizadoPorInfo = 'N/A';
            if (data.actualizadoPor) {
                actualizadoPorInfo = getActualizadoPor(data.actualizadoPor);
            }
            
            return {
                id: docSnap.id,
                ...data,
                actualizadoPorDisplay: actualizadoPorInfo
            };
        });
        
        appState.filteredCotizaciones = [...appState.cotizaciones];
        appState.pagination.currentPage = 1;
        console.log(`Se cargaron ${appState.cotizaciones.length} cotizaciones`);
        applySearchAndDisplay();
    } catch (error) {
        console.error('Error al cargar cotizaciones:', error);
        showError('No se pudieron cargar las cotizaciones. Verifica tu conexión.');
    } finally {
        appState.isLoading = false;
        showLoadingState(false);
    }
}

function showLoadingState(show) {
    const loadingSpinner = document.getElementById('loadingSpinner');
    const tbody = document.getElementById('cotizacionesTableBody');
    const mobileContainer = document.getElementById('mobileCardsContainer');
    
    if (loadingSpinner) {
        loadingSpinner.style.display = show ? 'flex' : 'none';
    }
    
    if (show) {
        const loadingHtml = `
            <tr>
                <td colspan="10" class="loading">
                    <i class="fas fa-spinner fa-spin"></i>
                    <p>Cargando cotizaciones...</p>
                </td>
            </tr>
        `;
        
        if (tbody) tbody.innerHTML = loadingHtml;
        if (mobileContainer) mobileContainer.innerHTML = `
            <div class="loading">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Cargando cotizaciones...</p>
            </div>
        `;
    }
}

// =================================================================================
// FUNCIONES DE BÚSQUEDA Y VISUALIZACIÓN
// =================================================================================

function applySearchAndDisplay() {
    const searchTerm = document.getElementById('buscarInput')?.value.toLowerCase().trim() || '';
    
    if (searchTerm) {
        appState.filteredCotizaciones = appState.cotizaciones.filter(cotizacion => 
            (cotizacion.cotizacionNumero && cotizacion.cotizacionNumero.toLowerCase().includes(searchTerm)) ||
            (cotizacion.clienteNombre && cotizacion.clienteNombre.toLowerCase().includes(searchTerm)) ||
            (cotizacion.cotizacionDescripcion && cotizacion.cotizacionDescripcion.toLowerCase().includes(searchTerm))
        );
    } else {
        appState.filteredCotizaciones = [...appState.cotizaciones];
    }
    
    displayCotizaciones();
}

async function buscarCotizacionesEnFirestore(termino) {
    try {
        showLoadingState(true);
        
        if (!termino || termino.trim() === '') {
            await cargarCotizaciones();
            return;
        }
        
        const terminoMinusculas = termino.toLowerCase().trim();
        console.log("Buscando en Firestore:", terminoMinusculas);
        
        let querySnapshot;
        try {
            querySnapshot = await db.collection('cotizacionPdf')
                .where('cotizacionNumero', '>=', terminoMinusculas)
                .where('cotizacionNumero', '<=', terminoMinusculas + '\uf8ff')
                .orderBy('cotizacionNumero')
                .limit(50)
                .get();
        } catch (error) {
            console.warn("Consulta fallida:", error);
            querySnapshot = { docs: [] };
        }
        
        let resultadosFirestore = [];
        if (querySnapshot.docs) {
            resultadosFirestore = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        }
        
        if (resultadosFirestore.length === 0) {
            console.log("No hay resultados en Firestore, buscando localmente...");
            resultadosFirestore = appState.cotizaciones.filter(coti => 
                coti.cotizacionNumero.toLowerCase().includes(terminoMinusculas) ||
                (coti.clienteNombre && coti.clienteNombre.toLowerCase().includes(terminoMinusculas)) ||
                (coti.cotizacionDescripcion && 
                 coti.cotizacionDescripcion.toLowerCase().includes(terminoMinusculas))
            );
        }
        
        resultadosFirestore.sort((a, b) => {
            const fechaA = a.fechaCreacion || a.cotizacionFecha;
            const fechaB = b.fechaCreacion || b.cotizacionFecha;
            return new Date(fechaB) - new Date(fechaA);
        });
        
        appState.filteredCotizaciones = resultadosFirestore;
        appState.pagination.currentPage = 1;
        displayCotizaciones();
        
        if (appState.filteredCotizaciones.length === 0) {
            showAlert('ℹ️ No se encontraron cotizaciones con ese criterio', 'info');
        }
        
    } catch (error) {
        console.error('Error en la búsqueda:', error);
        
        const terminoMinusculas = termino.toLowerCase().trim();
        appState.filteredCotizaciones = appState.cotizaciones.filter(coti => 
            (coti.cotizacionNumero && coti.cotizacionNumero.toLowerCase().includes(terminoMinusculas)) ||
            (coti.clienteNombre && coti.clienteNombre.toLowerCase().includes(terminoMinusculas)) ||
            (coti.cotizacionDescripcion && 
             coti.cotizacionDescripcion.toLowerCase().includes(terminoMinusculas))
        );
        appState.pagination.currentPage = 1;
        displayCotizaciones();
        
        if (appState.filteredCotizaciones.length === 0) {
            showAlert('ℹ️ No se encontraron cotizaciones', 'info');
        }
    } finally {
        showLoadingState(false);
    }
}

function displayCotizaciones() {
    const tbody = document.getElementById('cotizacionesTableBody');
    const mobileContainer = document.getElementById('mobileCardsContainer');
    const paginationContainer = document.querySelector('.pagination-container') || 
                               document.getElementById('pagination-controls');
    
    if (!tbody || !mobileContainer) return;
    
    // Calcular paginación
    const startIndex = (appState.pagination.currentPage - 1) * appState.pagination.itemsPerPage;
    const endIndex = startIndex + appState.pagination.itemsPerPage;
    const currentItems = appState.filteredCotizaciones.slice(startIndex, endIndex);
    appState.pagination.totalPages = Math.max(1, Math.ceil(appState.filteredCotizaciones.length / appState.pagination.itemsPerPage));
    
    tbody.innerHTML = '';
    mobileContainer.innerHTML = '';
    
    if (!currentItems || currentItems.length === 0) {
        const emptyMessage = `
            <tr>
                <td colspan="10" class="empty-state">
                    <i class="fas fa-inbox"></i>
                    <h3>${document.getElementById('buscarInput')?.value ? 'No se encontraron cotizaciones' : 'No hay cotizaciones'}</h3>
                    <p>${document.getElementById('buscarInput')?.value ? 'Intenta con otros términos de búsqueda' : 'Crea una nueva cotización para comenzar'}</p>
                </td>
            </tr>
        `;
        tbody.innerHTML = emptyMessage;
        mobileContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-inbox"></i>
                <h3>${document.getElementById('buscarInput')?.value ? 'No se encontraron cotizaciones' : 'No hay cotizaciones'}</h3>
                <p>${document.getElementById('buscarInput')?.value ? 'Intenta con otros términos de búsqueda' : 'Crea una nueva cotización para comenzar'}</p>
            </div>
        `;
        
        if (paginationContainer) {
            paginationContainer.innerHTML = '';
        }
        return;
    }

    // Mostrar tabla para escritorio
    const rowsHtml = currentItems.map(cotizacion => {
        const estatusInfo = {
            'vendida': { color: '#22c55e', textoBase: '✅ Vendida' },
            'en proceso': { color: '#f59e0b', textoBase: '⏳ En Proceso' },
            'rechazada': { color: '#ef4444', textoBase: '❌ Rechazada' }
        };
        
        const estatusActual = cotizacion.estatus || 'en proceso';
        const info = estatusInfo[estatusActual] || estatusInfo['en proceso'];
        let textoCompleto = info.textoBase;
        
        if (estatusActual === 'vendida') {
            textoCompleto += ` - ${cotizacion.pagoEstatus === 'pagada' ? 'Pagada' : 'Pendiente'}`;
        } else if (estatusActual === 'rechazada' && cotizacion.motivoRechazo) {
            textoCompleto += `: ${cotizacion.motivoRechazo.substring(0, 50)}${cotizacion.motivoRechazo.length > 50 ? '...' : ''}`;
        }
        
        const tieneTicketAsociado = cotizacion.ticketAsociado && cotizacion.ticketAsociado.trim() !== '';
        const ticketDisplay = tieneTicketAsociado ? 
            `<div class="ticket-asociado asociado">
                <strong>${cotizacion.ticketAsociado}</strong>
                <br>
                <a href="../verticket/verTicket.html?id=${cotizacion.ticketAsociado}" class="btn-ticket">
                    Ver Ticket
                </a>
            </div>` :
            `<div class="ticket-asociado no-asociado">
                N/A
            </div>`;
        
        const descripcionCompleta = cotizacion.cotizacionDescripcion || 'N/A';
        const descripcionCorta = descripcionCompleta.length > 30 ? 
            descripcionCompleta.substring(0, 30) + '...' : 
            descripcionCompleta;
        
        const actualizadoPor = cotizacion.actualizadoPorDisplay || getActualizadoPor(cotizacion.actualizadoPor) || 'N/A';
        
        return `
            <tr style="border-left: 5px solid ${info.color}">
                <td><strong>${cotizacion.cotizacionNumero || 'N/A'}</strong></td>
                <td>${cotizacion.clienteNombre || 'N/A'}</td>
                <td>${cotizacion.cotizacionFecha ? new Date(cotizacion.cotizacionFecha).toLocaleDateString('es-MX') : 'N/A'}</td>
                <td><strong>${formatCurrency(cotizacion.totalFinal)}</strong></td>
                <td>
                    <div class="descripcion-container">
                        <span class="descripcion-texto">${descripcionCorta}</span>
                        <div class="descripcion-tooltip">
                            ${descripcionCompleta}
                        </div>
                    </div>
                </td>
                <td><small>${cotizacion.generadoPor?.nombre || 'N/A'}</small></td>
                <td><small>${actualizadoPor}</small></td>
                <td>${ticketDisplay}</td>
                <td>
                    <div class="estatus-container" style="background-color: ${info.color}1A; border: 1px solid ${info.color}; padding: 8px; border-radius: 8px;">
                        <span style="color: ${info.color}; font-weight: bold; font-size: 0.8rem;">${textoCompleto}</span>
                        <select class="estatus-select" data-id="${cotizacion.id}" style="width:100%; margin-top: 5px;">
                            <option value="en proceso" ${estatusActual === 'en proceso' ? 'selected' : ''}>En Proceso</option>
                            <option value="vendida" ${estatusActual === 'vendida' ? 'selected' : ''}>Vendida</option>
                            <option value="rechazada" ${estatusActual === 'rechazada' ? 'selected' : ''}>Rechazada</option>
                        </select>
                        <div class="additional-status-fields ${estatusActual === 'vendida' ? 'show' : ''}">
                            <select class="pago-estatus-select" data-id="${cotizacion.id}" style="width:100%; margin-top: 5px;">
                                <option value="pendiente" ${cotizacion.pagoEstatus === 'pendiente' ? 'selected' : ''}>Pendiente</option>
                                <option value="pagada" ${cotizacion.pagoEstatus === 'pagada' ? 'selected' : ''}>Pagada</option>
                            </select>
                        </div>
                        <div class="additional-status-fields ${estatusActual === 'rechazada' ? 'show' : ''}">
                            <textarea class="motivo-rechazo-input" data-id="${cotizacion.id}" placeholder="Motivo..." style="width:100%; margin-top: 5px;">${cotizacion.motivoRechazo || ''}</textarea>
                        </div>
                    </div>
                </td>
                <td class="acciones">
                    <button class="action-btn view" data-id="${cotizacion.id}" title="Ver PDF">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="action-btn download" data-id="${cotizacion.id}" title="Descargar PDF">
                        <i class="fas fa-download"></i>
                    </button>
                    <a href="cotizacion_formulario.html?id=${cotizacion.id}" class="action-btn edit" title="Editar">
                        <i class="fas fa-edit"></i>
                    </a>
                    <button class="action-btn delete" data-id="${cotizacion.id}" title="Eliminar">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');

    tbody.innerHTML = rowsHtml;

    // Mostrar tarjetas para móvil
    const cardsHtml = currentItems.map(cotizacion => {
        const estatusInfo = {
            'vendida': { color: '#22c55e', textoBase: '✅ Vendida' },
            'en proceso': { color: '#f59e0b', textoBase: '⏳ En Proceso' },
            'rechazada': { color: '#ef4444', textoBase: '❌ Rechazada' }
        };
        
        const estatusActual = cotizacion.estatus || 'en proceso';
        const info = estatusInfo[estatusActual] || estatusInfo['en proceso'];
        let textoCompleto = info.textoBase;
        
        if (estatusActual === 'vendida') {
            textoCompleto += ` - ${cotizacion.pagoEstatus === 'pagada' ? 'Pagada' : 'Pendiente'}`;
        } else if (estatusActual === 'rechazada' && cotizacion.motivoRechazo) {
            textoCompleto += `: ${cotizacion.motivoRechazo.substring(0, 30)}${cotizacion.motivoRechazo.length > 30 ? '...' : ''}`;
        }
        
        const tieneTicketAsociado = cotizacion.ticketAsociado && cotizacion.ticketAsociado.trim() !== '';
        const actualizadoPor = cotizacion.actualizadoPorDisplay || getActualizadoPor(cotizacion.actualizadoPor) || 'N/A';
        
        return `
            <div class="cotizacion-card" style="border-left-color: ${info.color}">
                <div class="card-row">
                    <span class="card-label">Número:</span>
                    <span class="card-value"><strong>${cotizacion.cotizacionNumero || 'N/A'}</strong></span>
                </div>
                <div class="card-row">
                    <span class="card-label">Cliente:</span>
                    <span class="card-value">${cotizacion.clienteNombre || 'N/A'}</span>
                </div>
                <div class="card-row">
                    <span class="card-label">Fecha:</span>
                    <span class="card-value">${cotizacion.cotizacionFecha ? new Date(cotizacion.cotizacionFecha).toLocaleDateString('es-MX') : 'N/A'}</span>
                </div>
                <div class="card-row">
                    <span class="card-label">Total:</span>
                    <span class="card-value"><strong>${formatCurrency(cotizacion.totalFinal)}</strong></span>
                </div>
                <div class="card-row">
                    <span class="card-label">Descripción:</span>
                    <span class="card-value">${cotizacion.cotizacionDescripcion ? (cotizacion.cotizacionDescripcion.length > 30 ? cotizacion.cotizacionDescripcion.substring(0, 30) + '...' : cotizacion.cotizacionDescripcion) : 'N/A'}</span>
                </div>
                <div class="card-row">
                    <span class="card-label">Generado por:</span>
                    <span class="card-value">${cotizacion.generadoPor?.nombre || 'N/A'}</span>
                </div>
                <div class="card-row">
                    <span class="card-label">Actualizado por:</span>
                    <span class="card-value">${actualizadoPor}</span>
                </div>
                <div class="card-row">
                    <span class="card-label">Ticket:</span>
                    <span class="card-value">${tieneTicketAsociado ? cotizacion.ticketAsociado : 'N/A'}</span>
                </div>
                <div class="card-row">
                    <span class="card-label">Estatus:</span>
                    <span class="card-value" style="color: ${info.color}; font-weight: bold;">${textoCompleto}</span>
                </div>
                <div class="card-row">
                    <div class="estatus-container" style="width: 100%; background-color: ${info.color}1A; border: 1px solid ${info.color}; padding: 8px; border-radius: 8px;">
                        <select class="estatus-select" data-id="${cotizacion.id}" style="width:100%;">
                            <option value="en proceso" ${estatusActual === 'en proceso' ? 'selected' : ''}>En Proceso</option>
                            <option value="vendida" ${estatusActual === 'vendida' ? 'selected' : ''}>Vendida</option>
                            <option value="rechazada" ${estatusActual === 'rechazada' ? 'selected' : ''}>Rechazada</option>
                        </select>
                        <div class="additional-status-fields ${estatusActual === 'vendida' ? 'show' : ''}">
                            <select class="pago-estatus-select" data-id="${cotizacion.id}" style="width:100%; margin-top: 5px;">
                                <option value="pendiente" ${cotizacion.pagoEstatus === 'pendiente' ? 'selected' : ''}>Pendiente</option>
                                <option value="pagada" ${cotizacion.pagoEstatus === 'pagada' ? 'selected' : ''}>Pagada</option>
                            </select>
                        </div>
                        <div class="additional-status-fields ${estatusActual === 'rechazada' ? 'show' : ''}">
                            <textarea class="motivo-rechazo-input" data-id="${cotizacion.id}" placeholder="Motivo..." style="width:100%; margin-top: 5px; min-height: 60px;">${cotizacion.motivoRechazo || ''}</textarea>
                        </div>
                    </div>
                </div>
                <div class="card-actions">
                    <button class="action-btn view" data-id="${cotizacion.id}" title="Ver PDF">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="action-btn download" data-id="${cotizacion.id}" title="Descargar PDF">
                        <i class="fas fa-download"></i>
                    </button>
                    <a href="cotizacion_formulario.html?id=${cotizacion.id}" class="action-btn edit" title="Editar">
                        <i class="fas fa-edit"></i>
                    </a>
                    <button class="action-btn delete" data-id="${cotizacion.id}" title="Eliminar">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');

    mobileContainer.innerHTML = cardsHtml;
    
    // Configurar event listeners para los botones de acción
    setupActionButtons();
    
    // Mostrar paginación
    if (paginationContainer && appState.pagination.totalPages > 1) {
        renderPagination(paginationContainer);
    } else if (paginationContainer) {
        paginationContainer.innerHTML = '';
    }
}

function setupActionButtons() {
    // Configurar botones de ver PDF
    document.querySelectorAll('.action-btn.view').forEach(button => {
        button.addEventListener('click', (e) => {
            const cotizacionId = e.currentTarget.getAttribute('data-id');
            if (cotizacionId) {
                verPDF(cotizacionId);
            }
        });
    });
    
    // Configurar botones de descargar PDF
    document.querySelectorAll('.action-btn.download').forEach(button => {
        button.addEventListener('click', async (e) => {
            const cotizacionId = e.currentTarget.getAttribute('data-id');
            if (cotizacionId) {
                await descargarPDF(cotizacionId);
            }
        });
    });
    
    // Configurar botones de eliminar (solo para usuarios autenticados)
    document.querySelectorAll('.action-btn.delete').forEach(button => {
        button.addEventListener('click', (e) => {
            const cotizacionId = e.currentTarget.getAttribute('data-id');
            if (cotizacionId) {
                showAlert('⚠️ Para eliminar cotizaciones debes iniciar sesión', 'warning');
            }
        });
    });
    
    // Configurar cambios de estatus (solo para usuarios autenticados)
    document.querySelectorAll('.estatus-select').forEach(select => {
        select.addEventListener('change', (e) => {
            showAlert('⚠️ Para cambiar el estatus debes iniciar sesión', 'warning');
            // Restaurar el valor original
            e.target.blur();
        });
    });
    
    // Configurar estatus de pago (solo para usuarios autenticados)
    document.querySelectorAll('.pago-estatus-select').forEach(select => {
        select.addEventListener('change', (e) => {
            showAlert('⚠️ Para cambiar el estatus de pago debes iniciar sesión', 'warning');
            e.target.blur();
        });
    });
    
    // Configurar motivo de rechazo (solo para usuarios autenticados)
    document.querySelectorAll('.motivo-rechazo-input').forEach(textarea => {
        textarea.addEventListener('blur', (e) => {
            showAlert('⚠️ Para agregar motivos debes iniciar sesión', 'warning');
        });
    });
}

function renderPagination(container) {
    container.innerHTML = '';
    const { currentPage, totalPages } = appState.pagination;
    
    // Botón Anterior
    const prevButton = createPaginationButton(
        '<i class="fas fa-chevron-left"></i>', 
        'prev', 
        currentPage === 1, 
        () => changePage(currentPage - 1)
    );
    container.appendChild(prevButton);

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
        container.appendChild(pageButton);
    }
    
    // Botón Siguiente
    const nextButton = createPaginationButton(
        '<i class="fas fa-chevron-right"></i>', 
        'next', 
        currentPage >= totalPages, 
        () => changePage(currentPage + 1)
    );
    container.appendChild(nextButton);
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
// FUNCIONES DE ACCIÓN - CRUD
// =================================================================================

async function verPDF(id) {
    try {
        showLoadingState(true);
        
        const cotizacion = appState.cotizaciones.find(c => c.id === id);
        if (!cotizacion) {
            showAlert('❌ No se encontró la cotización', 'error');
            return;
        }

        const pdfBlob = await generarPDF(cotizacion);
        const pdfUrl = URL.createObjectURL(pdfBlob);
        
        const pdfViewer = document.getElementById('pdfViewer');
        const modalPDF = document.getElementById('modalPDF');
        
        if (pdfViewer) {
            pdfViewer.innerHTML = `<iframe src="${pdfUrl}" width="100%" height="100%" frameborder="0"></iframe>`;
        }
        
        if (modalPDF) {
            modalPDF.classList.add('show');
        }
        
    } catch (error) {
        console.error('Error al generar vista previa del PDF:', error);
        showError('❌ Error al generar vista previa del PDF');
    } finally {
        showLoadingState(false);
    }
}

async function descargarPDF(id) {
    const cotizacion = appState.cotizaciones.find(c => c.id === id);
    if (!cotizacion) return;
    
    showLoadingState(true);
    try {
        const pdfBlob = await generarPDF(cotizacion);
        descargarPDFLocal(pdfBlob, `cotizacion-${cotizacion.cotizacionNumero}.pdf`);
        showAlert('✅ PDF descargado correctamente', 'success');
    } catch (error) {
        console.error('Error al descargar PDF:', error);
        showError('❌ Error al descargar PDF');
    } finally {
        showLoadingState(false);
    }
}

// =================================================================================
// FUNCIONES AUXILIARES
// =================================================================================

function getActualizadoPor(usuario) {
    if (!usuario) return 'N/A';
    
    if (typeof usuario === 'object') {
        if (usuario.nombreCompleto) return usuario.nombreCompleto;
        if (usuario.nombre) return usuario.nombre;
        if (usuario.email) return usuario.email;
        if (usuario.uid) return `Usuario ${usuario.uid.substring(0, 8)}...`;
    }
    
    if (typeof usuario === 'string') {
        return usuario;
    }
    
    return 'N/A';
}

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
            console.error("Error al cargar la imagen desde la ruta:", url, e);
            reject(new Error('No se pudo cargar la imagen del logo.'));
        };
        img.src = url;
    });
}

function formatCurrency(amount) {
    const num = parseFloat(amount);
    if (isNaN(num)) return '$0.00';
    return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN',
        minimumFractionDigits: 2
    }).format(num);
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

function agruparTecnologias(items) {
    if (!items || !Array.isArray(items)) return {};
    
    const grupos = {};
    items.forEach(item => {
        const categoria = item.categoria || item.tipoTecnologia || 'OTRO';
        if (!grupos[categoria]) grupos[categoria] = [];
        grupos[categoria].push(item);
    });
    return grupos;
}

function showAlert(message, type = 'info') {
    Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        customClass: {
            popup: 'swal2-popup',
            title: 'swal2-title',
            htmlContainer: 'swal2-html-container'
        }
    }).fire({
        icon: type,
        title: message
    });
}

function showError(message) {
    Swal.fire({
        title: 'Error',
        html: `<p style="text-align: left;">${message}</p>`,
        icon: 'error',
        confirmButtonText: 'Aceptar',
        confirmButtonColor: 'var(--primary-color)',
        background: 'var(--card-bg)',
        color: 'var(--text-color)',
        width: 500
    });
}

// =================================================================================
// FUNCIÓN DE GENERACIÓN DE PDF (se mantiene igual)
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
    
    const piePagina = () => {
        pdf.setFontSize(8).setTextColor(gray).text(
            `Cotización No. ${data.cotizacionNumero} | Página ${page}`,
            pageWidth / 2,
            pageHeight - 10,
            { align: 'center' }
        );
    };
    
    const categoriaDisplayMap = {
        'CCTV': '📹 CCTV',
        'DH': '🏠 DETECTOR DE HUMO',
        'CA': '🔐 CONTROL DE ACCESOS',
        'ALARMA INTRUSION': '🚨 ALARMA INTRUSIÓN',
        'MULTIMEDIA': '📺 MULTIMEDIA',
        'REDES': '🛜 REDES TRANSPORTE DE DATOS',
        'OTRO': '📦 OTRO',
        'AI': '🚨 ALARMA INTRUSIÓN',
        'ALARMA': '🚨 ALARMA INTRUSIÓN'
    };
    
    try {
        const logoData = await getBase64ImageFromURL(LOGO_URL);
        pdf.addImage(logoData, 'PNG', pageWidth - margin - 40, margin, 40, 40);
    } catch (e) {
        console.warn('No se pudo cargar el logo desde la ruta:', e);
    }
    
    pdf.setFontSize(10).setTextColor(navy).text(data.empresaNombre || "RSI ENTERPRISE", margin, y + 5);
    pdf.setFontSize(8).setTextColor(gray).text(data.empresaDireccion || "", margin, y + 10);
    pdf.text(`RFC: ${data.empresaRFC || ''} | Tel: ${data.empresaTelefono || ''}`, margin, y + 15);
    
    y += 25;
    pdf.setFontSize(14).setTextColor(navy).text("COTIZACIÓN", pageWidth / 2, y, { align: 'center' });
    pdf.setFontSize(9).setTextColor(gray).text(
        `No. ${data.cotizacionNumero} | Fecha: ${new Date(data.cotizacionFecha).toLocaleDateString('es-MX')}`,
        pageWidth / 2,
        y + 7,
        { align: 'center' }
    );
    
    y += 20;
    
    if (data.cotizacionDescripcion && data.cotizacionDescripcion.trim().length > 0) {
        pdf.setFontSize(9).setTextColor(navy).setFont('helvetica', 'bold').text("DESCRIPCIÓN:", margin, y);
        y += 5;
        pdf.setFontSize(9).setTextColor(textColor).setFont('helvetica', 'normal');
        const descLines = pdf.splitTextToSize(data.cotizacionDescripcion.trim(), pageWidth - 2 * margin);
        descLines.forEach(line => {
            pdf.text(line, margin, y);
            y += 5;
        });
        y += 5;
    }
    
    pdf.setFontSize(9).setTextColor(textColor).text(`Cliente: ${data.clienteNombre}`, margin, y);
    y += 5;
    pdf.text(`RFC: ${data.clienteRFC || 'N/E'}`, margin, y);
    y += 5;
    pdf.text(`Dirección: ${data.clienteDireccion}`, margin, y);
    y += 10;
    
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
    
    const grupos = agruparTecnologias(data.items);
    Object.entries(grupos).forEach(([categoria, items]) => {
        const textoCompleto = categoriaDisplayMap[categoria] || categoria;
        const displayCategoria = textoCompleto.replace(/^(.*?)\s/, '').trim();
        
        if (y > pageHeight - 70) {
            piePagina();
            nuevaPagina();
        }
        
        pdf.setFillColor(navy).rect(margin, y, pageWidth - 2 * margin, 12, 'F');
        pdf.setFontSize(12).setTextColor('#FFFFFF').setFont('helvetica', 'bold').text(
            displayCategoria,
            pageWidth / 2,
            y + 8,
            { align: 'center' }
        );
        y += 14;
        
        pdf.setFillColor(navy).rect(margin, y, pageWidth - 2 * margin, 8, 'F');
        pdf.setFontSize(8).setFont('helvetica', 'normal')
            .text("DESCRIPCIÓN", colX.desc, y + 5)
            .text("UNIDAD", colX.unidad, y + 5, { align: 'center' })
            .text("CANT.", colX.cant, y + 5, { align: 'right' })
            .text("P. UNIT.", colX.precio, y + 5, { align: 'right' })
            .text("TOTAL", colX.total, y + 5, { align: 'right' });
        y += 10;
        
        items.forEach((item, index) => {
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
            descLines.forEach((line, i) => {
                pdf.text(line, colX.desc, y + 5 + (i * 5));
            });
            
            pdf.text((item.tipoTecnologia || '').slice(0, 4), colX.unidad, y + 5, { align: 'center' });
            pdf.text(item.cantidad.toString(), colX.cant, y + 5, { align: 'right' });
            pdf.text(formatearNumero(item.precio), colX.precio, y + 5, { align: 'right' });
            pdf.text(formatearNumero(item.total), colX.total, y + 5, { align: 'right' });
            pdf.setDrawColor(200, 200, 200).line(margin, y + itemHeight, pageWidth - margin, y + itemHeight);
            y += itemHeight;
        });
        y += 2;
    });
    
    const tableStartX = colX.total - 82;
    const valueColX = tableStartX + 70;
    
    pdf.setFontSize(9).setTextColor(textColor)
        .text("Subtotal:", tableStartX, y + 5, { align: 'left' })
        .text(formatearNumero(data.subtotal), valueColX, y + 5, { align: 'left' });
    y += 5;
    
    if (data.descuentoMonto > 0) {
        pdf.text(`Descuento (${data.descuento}%):`, tableStartX, y + 5, { align: 'left' })
           .text(`-${formatearNumero(data.descuentoMonto)}`, valueColX, y + 5, { align: 'left' });
        y += 5;
    }
    
    pdf.text(`IVA (${data.impuesto}%):`, tableStartX, y + 5, { align: 'left' })
       .text(formatearNumero(data.impuestoMonto), valueColX, y + 5, { align: 'left' });
    y += 7;
    
    pdf.setFont('helvetica', 'bold').setTextColor(navy)
        .text("TOTAL:", tableStartX, y + 5, { align: 'left' })
        .text(`${formatearNumero(data.totalFinal)} ${data.cotizacionMoneda}`, valueColX, y + 5, { align: 'left' });
    
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
// CONFIGURACIÓN DE EVENTOS
// =================================================================================

async function setupEventListeners() {
    // Evento de búsqueda con debouncing
    const buscarInput = document.getElementById('buscarInput');
    if (buscarInput) {
        let debounceTimer;
        buscarInput.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            
            const searchTerm = buscarInput.value.trim();
            
            if (searchTerm === '') {
                debounceTimer = setTimeout(() => {
                    appState.pagination.currentPage = 1;
                    applySearchAndDisplay();
                }, 300);
                return;
            }
            
            if (searchTerm.length < 3) {
                appState.pagination.currentPage = 1;
                applySearchAndDisplay();
                return;
            }
            
            debounceTimer = setTimeout(async () => {
                await buscarCotizacionesEnFirestore(searchTerm);
            }, 800);
        });
    }
    
    // Botón de resumen de cuentas (visible para todos)
    const resumenCuentasBtn = document.getElementById('resumenCuentasBtn');
    if (resumenCuentasBtn) {
        resumenCuentasBtn.style.display = 'inline-block';
        resumenCuentasBtn.addEventListener('click', mostrarModalResumen);
    }
    
    // Botón de descargar todas (visible para todos)
    const descargarTodasBtn = document.getElementById('descargarTodasBtn');
    if (descargarTodasBtn) {
        descargarTodasBtn.style.display = 'inline-block';
        // Puedes agregar funcionalidad aquí si lo deseas
    }
    
    // Cerrar modales
    const cerrarResumenBtn = document.getElementById('cerrarResumenBtn');
    if (cerrarResumenBtn) {
        cerrarResumenBtn.addEventListener('click', () => {
            const modalResumenCuentas = document.getElementById('modalResumenCuentas');
            if (modalResumenCuentas) {
                modalResumenCuentas.classList.remove('show');
            }
        });
    }
    
    const cerrarPdfBtn = document.getElementById('cerrarPdfBtn');
    if (cerrarPdfBtn) {
        cerrarPdfBtn.addEventListener('click', () => {
            const modalPDF = document.getElementById('modalPDF');
            const pdfViewer = document.getElementById('pdfViewer');
            if (modalPDF) {
                modalPDF.classList.remove('show');
            }
            if (pdfViewer) {
                pdfViewer.innerHTML = '';
            }
        });
    }
    
    // Configurar filtros de resumen
    const resumenFiltrosContainer = document.getElementById('resumenFiltros');
    if (resumenFiltrosContainer) {
        resumenFiltrosContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-filtro')) {
                setActiveFilter(e.target);
                const filtro = e.target.dataset.filtro;
                calcularYMostrarResumen(filtro);
            }
        });
    }
}

function setActiveFilter(activeButton) {
    document.querySelectorAll('.btn-filtro').forEach(btn => {
        btn.classList.remove('active');
    });
    activeButton.classList.add('active');
}

function mostrarModalResumen() {
    const modalResumenCuentas = document.getElementById('modalResumenCuentas');
    if (modalResumenCuentas) {
        modalResumenCuentas.classList.add('show');
        calcularYMostrarResumen('todos');
    }
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
    
    const resumenTitulo = document.getElementById('resumenTitulo');
    const resumenSumaTotal = document.getElementById('resumenSumaTotal');
    
    if (resumenTitulo) {
        resumenTitulo.textContent = titulos[filtro] || titulos.todos;
    }
    
    if (resumenSumaTotal) {
        resumenSumaTotal.textContent = formatCurrency(sumaTotal);
    }
}

// =================================================================================
// INICIALIZACIÓN
// =================================================================================
document.addEventListener('DOMContentLoaded', initialLoad);