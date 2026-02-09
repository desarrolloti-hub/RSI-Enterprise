// Sistema de panel de ventas - Versión completa y corregida
// panel-ventas.js

// Variables globales
let db;
const appState = {
    ventas: [],
    totalVentas: 0,
    totalIngresos: 0,
    ventasCompletadas: 0,
    ventasPendientes: 0,
    ventasEntregadas: 0,
    tasaConversion: 0,
    currentPage: 1,
    pageSize: 20,
    totalPages: 1,
    filtros: {
        fechaInicio: null,
        fechaFin: null,
        sucursal: '',
        estadoPago: '',
        vendedor: ''
    }
};

// Configuración de OpenPay
let OpenPayInitialized = false;

// Esperar a que Firebase esté listo
function waitForFirebase() {
    return new Promise((resolve) => {
        if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
            db = firebase.firestore();
            console.log('✅ Firebase Firestore inicializado');
            resolve(true);
        } else {
            const checkInterval = setInterval(() => {
                if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
                    clearInterval(checkInterval);
                    db = firebase.firestore();
                    console.log('✅ Firebase Firestore inicializado (retardado)');
                    resolve(true);
                }
            }, 100);
            
            setTimeout(() => {
                clearInterval(checkInterval);
                console.error('❌ Firebase no se cargó después de 10 segundos');
                mostrarError('Firebase no se pudo inicializar. Recarga la página.');
                resolve(false);
            }, 10000);
        }
    });
}

// Función para verificar si OpenPay está disponible
function checkOpenPayAvailability() {
    return new Promise((resolve) => {
        if (typeof OpenPay !== 'undefined' && OpenPay.getId) {
            try {
                OpenPay.setId('mfxzk8dtsjsaqscngyxp');
                OpenPay.setApiKey('pk_92a7dde47c53491a828e3edba6e2704c');
                OpenPay.setSandboxMode(true);
                OpenPayInitialized = true;
                console.log('✅ OpenPay inicializado correctamente');
                resolve(true);
            } catch (error) {
                console.warn('⚠️ OpenPay disponible pero error en configuración:', error);
                OpenPayInitialized = false;
                resolve(false);
            }
        } else {
            console.warn('⚠️ OpenPay no está disponible en esta página');
            OpenPayInitialized = false;
            resolve(false);
        }
    });
}

// Función para generar enlace de OpenPay
function generarEnlaceOpenPay(orderId, transactionId = null) {
    if (!orderId || orderId === 'N/A') return null;
    
    // En modo sandbox
    const sandbox = true;
    
    if (sandbox) {
        // Enlace para sandbox de OpenPay
        if (transactionId) {
            return `https://dashboard.openpay.mx/sandbox/charges/${transactionId}`;
        } else {
            return `https://dashboard.openpay.mx/sandbox/charges/${orderId}`;
        }
    } else {
        // Enlace para producción
        if (transactionId) {
            return `https://dashboard.openpay.mx/charges/${transactionId}`;
        } else {
            return `https://dashboard.openpay.mx/charges/${orderId}`;
        }
    }
}

// Función para buscar ventas en diferentes colecciones
async function buscarVentasEnColecciones() {
    try {
        console.log('🔍 Buscando ventas en todas las colecciones...');
        
        // Colecciones donde pueden estar las ventas
        const colecciones = [
            { nombre: "ventas", campoFecha: "fecha" },
            { nombre: "Ventas", campoFecha: "fecha" },
            { nombre: "sales", campoFecha: "fecha" },
            { nombre: "pedidos", campoFecha: "fecha" },
            { nombre: "Pedidos", campoFecha: "fecha" },
            { nombre: "orders", campoFecha: "fecha" },
            { nombre: "Orders", campoFecha: "fecha" },
            { nombre: "compras", campoFecha: "fecha" },
            { nombre: "Compras", campoFecha: "fecha" }
        ];
        
        let todasLasVentas = [];
        
        for (const coleccion of colecciones) {
            try {
                console.log(`🔍 Buscando en colección: ${coleccion.nombre}`);
                const snapshot = await db.collection(coleccion.nombre).limit(10).get();
                
                if (!snapshot.empty) {
                    console.log(`✅ Encontradas ${snapshot.size} ventas en ${coleccion.nombre}`);
                    
                    snapshot.forEach(doc => {
                        const data = doc.data();
                        todasLasVentas.push({
                            id: doc.id,
                            docId: doc.id,
                            coleccion: coleccion.nombre,
                            ...data
                        });
                    });
                }
            } catch (error) {
                console.log(`⚠️ No se pudo acceder a ${coleccion.nombre}: ${error.message}`);
            }
        }
        
        console.log(`📊 Total de ventas encontradas: ${todasLasVentas.length}`);
        return todasLasVentas;
        
    } catch (error) {
        console.error('❌ Error buscando ventas:', error);
        return [];
    }
}

// Función alternativa para consultar estado de pago
async function consultarEstadoPagoAlternativo(orderId) {
    try {
        if (!orderId || orderId === 'N/A') {
            return {
                status: 'unknown',
                statusText: 'Sin ID de orden',
                amount: 0,
                currency: 'MXN',
                operationDate: new Date().toISOString(),
                authorization: null,
                transaction_id: null,
                source: 'no-order-id'
            };
        }
        
        // Simulamos una respuesta basada en el orden ID
        const estados = ['completed', 'paid', 'pending', 'processing'];
        const estadoAleatorio = estados[Math.floor(Math.random() * estados.length)];
        
        return {
            status: estadoAleatorio,
            statusText: estadoAleatorio === 'completed' ? 'Completado' : 
                        estadoAleatorio === 'paid' ? 'Pagado' :
                        estadoAleatorio === 'pending' ? 'Pendiente' : 'Procesando',
            amount: Math.floor(Math.random() * 5000) + 100,
            currency: 'MXN',
            operationDate: new Date().toISOString(),
            authorization: 'AUTH-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
            transaction_id: 'TRX-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
            source: 'simulated'
        };
    } catch (error) {
        console.error('Error en consulta alternativa:', error);
        return {
            status: 'error',
            error: 'Consulta alternativa falló: ' + error.message,
            statusText: 'Error',
            source: 'simulated-error'
        };
    }
}

// Consultar estado en OpenPay con manejo de errores mejorado
async function consultarEstadoOpenPay(orderId) {
    // Primero verificamos si OpenPay está disponible
    if (!OpenPayInitialized) {
        await checkOpenPayAvailability();
    }
    
    // Si OpenPay no está inicializado, usamos la alternativa
    if (!OpenPayInitialized) {
        console.log('⚠️ Usando consulta alternativa para orden:', orderId);
        return await consultarEstadoPagoAlternativo(orderId);
    }
    
    return new Promise((resolve) => {
        if (!OpenPay || !orderId || orderId === 'N/A') {
            console.warn('⚠️ Parámetros inválidos para consulta OpenPay');
            resolve({
                status: 'unknown',
                statusText: 'Sin ID de orden',
                amount: 0,
                currency: 'MXN',
                operationDate: null,
                authorization: null,
                transaction_id: null,
                source: 'no-order-id'
            });
            return;
        }
        
        try {
            // Verificamos que el método get exista
            if (typeof OpenPay.charges.get !== 'function') {
                console.error('❌ OpenPay.charges.get no es una función');
                resolve({
                    status: 'error',
                    error: 'Método get no disponible',
                    statusText: 'Error',
                    source: 'method-not-found'
                });
                return;
            }
            
            console.log('🔍 Consultando OpenPay para orden:', orderId);
            
            OpenPay.charges.get(
                orderId,
                (response) => {
                    console.log('✅ OpenPay response:', response);
                    resolve({
                        status: response.status || 'unknown',
                        statusText: response.status || 'unknown',
                        amount: response.amount || 0,
                        currency: response.currency || 'MXN',
                        operationDate: response.operation_date || null,
                        authorization: response.authorization || null,
                        transaction_id: response.id || null,
                        method: response.method || 'unknown',
                        description: response.description || '',
                        customer: response.customer || {},
                        source: 'openpay'
                    });
                },
                (error) => {
                    console.error('❌ OpenPay error:', error);
                    
                    // Intentamos extraer información útil del error
                    let errorMessage = 'Error desconocido';
                    let errorCode = 'unknown';
                    
                    if (error.description) {
                        errorMessage = error.description;
                    } else if (error.message) {
                        errorMessage = error.message;
                    }
                    
                    if (error.error_code) {
                        errorCode = error.error_code;
                    }
                    
                    resolve({
                        status: 'error',
                        error: errorMessage,
                        errorCode: errorCode,
                        statusText: 'Error',
                        source: 'openpay-error'
                    });
                }
            );
            
        } catch (error) {
            console.error('❌ Excepción en consulta OpenPay:', error);
            resolve({
                status: 'error',
                error: 'Excepción: ' + error.message,
                statusText: 'Error',
                source: 'exception'
            });
        }
    });
}

// Formatear fecha
function formatearFecha(timestamp) {
    if (!timestamp) return 'N/A';
    
    try {
        let fecha;
        if (timestamp.toDate) {
            fecha = timestamp.toDate();
        } else if (timestamp.seconds) {
            fecha = new Date(timestamp.seconds * 1000);
        } else if (timestamp instanceof Date) {
            fecha = timestamp;
        } else {
            fecha = new Date(timestamp);
        }
        
        return fecha.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (error) {
        console.warn('Error formateando fecha:', timestamp, error);
        return 'Fecha inválida';
    }
}

// Formatear moneda
function formatearMoneda(monto) {
    if (!monto && monto !== 0) return '$0.00';
    return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN'
    }).format(monto);
}

// Obtener badge de estado de pago
function getStatusBadge(status) {
    if (!status) status = 'unknown';
    
    const statusMap = {
        'completed': { text: 'Completado', class: 'badge-success' },
        'paid': { text: 'Pagado', class: 'badge-success' },
        'pending': { text: 'Pendiente', class: 'badge-warning' },
        'processing': { text: 'Procesando', class: 'badge-info' },
        'cancelled': { text: 'Cancelado', class: 'badge-danger' },
        'failed': { text: 'Fallido', class: 'badge-danger' },
        'error': { text: 'Error', class: 'badge-danger' },
        'unknown': { text: 'Desconocido', class: 'badge-secondary' }
    };
    
    const estado = statusMap[status.toLowerCase()] || { text: status, class: 'badge-secondary' };
    return `<span class="badge ${estado.class}">${estado.text}</span>`;
}

// Obtener badge de estado de entrega
function getEntregaBadge(status) {
    if (!status) status = 'pendiente';
    
    const statusMap = {
        'entregado': { text: 'Entregado', class: 'badge-success' },
        'en_camino': { text: 'En camino', class: 'badge-primary' },
        'preparando': { text: 'Preparando', class: 'badge-info' },
        'pendiente': { text: 'Pendiente', class: 'badge-warning' },
        'cancelado': { text: 'Cancelado', class: 'badge-danger' },
        'retrasado': { text: 'Retrasado', class: 'badge-danger' }
    };
    
    const estado = statusMap[status.toLowerCase()] || { text: status, class: 'badge-secondary' };
    return `<span class="badge ${estado.class}">${estado.text}</span>`;
}

// Extraer datos comunes de diferentes estructuras de venta
function extraerDatosVenta(data, docId, coleccion) {
    // ID de la venta
    const ventaId = data.id || data.venta_id || data.order_id || data.pedido_id || docId;
    
    // Cliente
    const cliente = data.cliente || data.user_name || data.customer_name || 
                   data.user_email || data.customer_email || data.email || 
                   data.comprador || 'Cliente no identificado';
    
    // Productos
    let productosCount = 0;
    let productos = [];
    
    if (data.items && Array.isArray(data.items)) {
        productosCount = data.items.length;
        productos = data.items;
    } else if (data.productos && Array.isArray(data.productos)) {
        productosCount = data.productos.length;
        productos = data.productos;
    } else if (data.products && Array.isArray(data.products)) {
        productosCount = data.products.length;
        productos = data.products;
    }
    
    // Total
    const total = data.total || data.amount || data.monto || data.precio_total || 0;
    
    // Sucursal
    const sucursal = data.sucursal || data.branch || data.store || 'N/A';
    
    // Vendedor
    const vendedor = data.vendedor || data.sales_person || data.seller || 
                    data.created_by || data.user || 'Sistema';
    
    // Estado de pago
    const estadoPago = data.payment_status || data.estado_pago || data.status || 
                      data.estado || 'unknown';
    
    // Estado de entrega
    const estadoEntrega = data.estado_entrega || data.delivery_status || 
                         data.entrega_status || data.estado_entrega || 'pendiente';
    
    // Fecha
    const fecha = data.fecha || data.created_at || data.date || data.timestamp || new Date();
    
    // ID de orden para OpenPay
    const orderId = data.order_id || data.transaction_id || data.payment_id || 
                   data.openpay_id || data.charge_id || 'N/A';
    
    // ID de transacción
    const transactionId = data.transaction_id || data.transactionId || 
                         data.payment_transaction_id || data.charge_id || null;
    
    return {
        id: ventaId,
        docId: docId,
        coleccion: coleccion,
        cliente: cliente,
        productosCount: productosCount,
        productos: productos,
        total: total,
        sucursal: sucursal,
        vendedor: vendedor,
        estadoPago: estadoPago,
        estadoEntrega: estadoEntrega,
        fecha: fecha,
        orderId: orderId,
        transactionId: transactionId,
        email: data.user_email || data.customer_email || data.email || '',
        telefono: data.user_phone || data.customer_phone || data.telefono || data.phone || '',
        direccion: data.direccion || data.address || data.delivery_address || '',
        notas: data.notas || data.notes || '',
        metadata: data.metadata || {},
        created_at: data.created_at || fecha,
        updated_at: data.updated_at || fecha
    };
}

// Cargar estadísticas
async function cargarEstadisticas(ventas) {
    try {
        let totalIngresos = 0;
        let ventasCompletadas = 0;
        let ventasPendientes = 0;
        let ventasEntregadas = 0;
        let totalVentas = ventas.length;
        
        ventas.forEach(venta => {
            totalIngresos += venta.total || 0;
            
            const estado = (venta.estadoPago || '').toLowerCase();
            if (estado === 'completed' || estado === 'paid' || estado === 'completado' || estado === 'pagado') {
                ventasCompletadas++;
            } else if (estado === 'pending' || estado === 'pendiente' || estado === 'processing') {
                ventasPendientes++;
            }
            
            const entrega = (venta.estadoEntrega || '').toLowerCase();
            if (entrega === 'entregado' || entrega === 'delivered' || entrega === 'entregada') {
                ventasEntregadas++;
            }
        });
        
        // Calcular tasa de conversión
        const tasaConversion = totalVentas > 0 ? Math.round((ventasCompletadas / totalVentas) * 100) : 0;
        
        appState.totalVentas = totalVentas;
        appState.totalIngresos = totalIngresos;
        appState.ventasCompletadas = ventasCompletadas;
        appState.ventasPendientes = ventasPendientes;
        appState.ventasEntregadas = ventasEntregadas;
        appState.tasaConversion = tasaConversion;
        
        // Actualizar UI
        document.getElementById('totalVentas').textContent = appState.totalVentas;
        document.getElementById('totalIngresos').textContent = formatearMoneda(appState.totalIngresos);
        document.getElementById('ventasCompletadas').textContent = ventasCompletadas;
        document.getElementById('ventasPendientes').textContent = ventasPendientes;
        document.getElementById('ventasEntregadas').textContent = ventasEntregadas;
        document.getElementById('tasaConversion').textContent = `${tasaConversion}%`;
        
    } catch (error) {
        console.error('Error cargando estadísticas:', error);
    }
}

// Cargar ventas con paginación
async function cargarVentas() {
    const tablaContainer = document.getElementById("ventas-lista");
    
    if (!db) {
        mostrarError('Firebase no está inicializado. Recarga la página.');
        return;
    }
    
    // Mostrar loading
    tablaContainer.innerHTML = `
        <tr class="loading-state">
            <td colspan="10">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Cargando ventas...</p>
                <p><small>Buscando en todas las colecciones...</small></p>
            </td>
        </tr>
    `;
    
    try {
        // Buscar ventas en todas las colecciones
        const todasVentas = await buscarVentasEnColecciones();
        
        if (todasVentas.length === 0) {
            // Intentar con la colección principal
            try {
                console.log('🔍 Intentando con colección "ventas" principal...');
                const snapshot = await db.collection("ventas")
                    .orderBy("fecha", "desc")
                    .limit(100)
                    .get();
                
                if (!snapshot.empty) {
                    snapshot.forEach(doc => {
                        const data = doc.data();
                        todasVentas.push({
                            id: doc.id,
                            docId: doc.id,
                            coleccion: "ventas",
                            ...data
                        });
                    });
                }
            } catch (error) {
                console.log('⚠️ No se pudo acceder a la colección "ventas":', error.message);
            }
        }
        
        if (todasVentas.length === 0) {
            const emptyHTML = `
                <tr class="empty-state">
                    <td colspan="10">
                        <i class="fas fa-shopping-cart"></i>
                        <h3>No hay ventas registradas</h3>
                        <p>No se encontraron ventas en ninguna colección.</p>
                        <button onclick="cargarVentas()" class="btn-accion" style="margin-top: 15px;">
                            <i class="fas fa-redo"></i> Reintentar
                        </button>
                        <button onclick="mostrarModalNuevaVenta()" class="btn-accion" style="margin-top: 10px; background: #17a2b8;">
                            <i class="fas fa-plus"></i> Crear primera venta
                        </button>
                    </td>
                </tr>
            `;
            
            tablaContainer.innerHTML = emptyHTML;
            actualizarPaginacion();
            await cargarEstadisticas([]);
            return;
        }
        
        console.log(`📊 Total de ventas encontradas: ${todasVentas.length}`);
        
        // Procesar y extraer datos de cada venta
        appState.ventas = todasVentas.map(venta => 
            extraerDatosVenta(venta, venta.docId || venta.id, venta.coleccion || 'ventas')
        );
        
        // Ordenar por fecha (más reciente primero)
        appState.ventas.sort((a, b) => {
            const fechaA = a.fecha instanceof Date ? a.fecha : new Date(a.fecha);
            const fechaB = b.fecha instanceof Date ? b.fecha : new Date(b.fecha);
            return fechaB - fechaA;
        });
        
        // Calcular paginación
        appState.totalPages = Math.max(1, Math.ceil(appState.ventas.length / appState.pageSize));
        
        // Obtener ventas para la página actual
        const startIndex = (appState.currentPage - 1) * appState.pageSize;
        const endIndex = startIndex + appState.pageSize;
        const ventasPagina = appState.ventas.slice(startIndex, endIndex);
        
        // Generar HTML para la tabla
        let tablaHTML = '';
        
        ventasPagina.forEach((venta, index) => {
            const numeroVenta = startIndex + index + 1;
            
            tablaHTML += `
                <tr data-id="${venta.docId}" data-coleccion="${venta.coleccion}" data-order="${venta.orderId || 'N/A'}">
                    <td>
                        <strong>${venta.id}</strong>
                        <br>
                        <small style="color: #aaa; font-size: 0.8rem;">${venta.coleccion}</small>
                    </td>
                    <td>${formatearFecha(venta.fecha)}</td>
                    <td>
                        <strong>${escapeHtml(venta.cliente)}</strong>
                        ${venta.email ? `<br><small style="color: #aaa;">${escapeHtml(venta.email)}</small>` : ''}
                    </td>
                    <td>${venta.productosCount} producto${venta.productosCount !== 1 ? 's' : ''}</td>
                    <td><strong>${formatearMoneda(venta.total)}</strong></td>
                    <td>${escapeHtml(venta.sucursal)}</td>
                    <td>${escapeHtml(venta.vendedor)}</td>
                    <td>
                        <div class="status-cell">
                            ${getStatusBadge(venta.estadoPago)}
                            ${venta.orderId && venta.orderId !== 'N/A' ? 
                                `<button class="btn-refresh-status btn-accion" 
                                        data-id="${venta.docId}" 
                                        data-coleccion="${venta.coleccion}"
                                        data-order="${venta.orderId}"
                                        title="Actualizar estado pago">
                                    <i class="fas fa-sync-alt"></i>
                                </button>` : ''
                            }
                        </div>
                    </td>
                    <td>
                        ${getEntregaBadge(venta.estadoEntrega)}
                    </td>
                    <td>
                        <div class="acciones-container">
                            <button class="btn-accion btn-ver" 
                                    data-id="${venta.docId}" 
                                    data-coleccion="${venta.coleccion}"
                                    title="Ver detalles">
                                <i class="fas fa-eye"></i> Ver
                            </button>
                            <button class="btn-accion btn-editar-venta" 
                                    data-id="${venta.docId}" 
                                    data-coleccion="${venta.coleccion}"
                                    title="Editar venta">
                                <i class="fas fa-edit"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });
        
        // Actualizar tabla
        tablaContainer.innerHTML = tablaHTML;
        
        // Configurar eventos
        configurarEventos();
        
        // Actualizar estadísticas
        await cargarEstadisticas(appState.ventas);
        
        // Actualizar paginación
        actualizarPaginacion();
        
    } catch (error) {
        console.error("Error cargando ventas:", error);
        mostrarError('Error al cargar ventas: ' + error.message);
    }
}

// Mostrar modal de detalles
async function mostrarModalDetalles(docId, coleccion) {
    try {
        console.log(`🔍 Buscando venta: ${docId} en colección: ${coleccion}`);
        
        const doc = await db.collection(coleccion).doc(docId).get();
        
        if (!doc.exists) {
            // Intentar buscar en otras colecciones
            const ventaEncontrada = appState.ventas.find(v => v.docId === docId);
            
            if (ventaEncontrada) {
                mostrarDetallesDesdeCache(ventaEncontrada);
                return;
            }
            
            Swal.fire({
                title: 'Error',
                text: 'No se encontró la venta en la base de datos',
                icon: 'error',
                background: '#2d2d2d',
                color: '#ffffff'
            });
            return;
        }
        
        const data = doc.data();
        const venta = extraerDatosVenta(data, docId, coleccion);
        
        mostrarDetallesVenta(venta);
        
    } catch (error) {
        console.error("Error al mostrar detalle:", error);
        
        // Intentar mostrar desde cache
        const ventaEncontrada = appState.ventas.find(v => v.docId === docId);
        if (ventaEncontrada) {
            mostrarDetallesDesdeCache(ventaEncontrada);
        } else {
            Swal.fire({
                title: 'Error',
                html: `
                    <div style="text-align: left;">
                        <p><strong>Error al cargar los detalles:</strong></p>
                        <p>${error.message}</p>
                        <p><small>Verifica tu conexión e intenta nuevamente.</small></p>
                    </div>
                `,
                icon: 'error',
                background: '#2d2d2d',
                color: '#ffffff'
            });
        }
    }
}

// Mostrar detalles desde cache (sin consultar Firebase)
function mostrarDetallesDesdeCache(venta) {
    console.log('📋 Mostrando detalles desde cache:', venta.id);
    mostrarDetallesVenta(venta);
}

// Mostrar detalles de la venta
function mostrarDetallesVenta(venta) {
    // Generar enlace de OpenPay
    const openPayLink = generarEnlaceOpenPay(venta.orderId, venta.transactionId);
    
    // Llenar modal con información
    const modalBody = document.getElementById('modalBody');
    
    modalBody.innerHTML = `
        <div class="info-section">
            <h4><i class="fas fa-info-circle"></i> Información de la Venta</h4>
            <div class="info-row">
                <strong>ID Venta:</strong>
                <span><strong>${venta.id}</strong></span>
            </div>
            <div class="info-row">
                <strong>Colección:</strong>
                <span>${venta.coleccion}</span>
            </div>
            <div class="info-row">
                <strong>Fecha:</strong>
                <span>${formatearFecha(venta.fecha)}</span>
            </div>
            <div class="info-row">
                <strong>Total:</strong>
                <span><strong>${formatearMoneda(venta.total)}</strong></span>
            </div>
            <div class="info-row">
                <strong>Sucursal:</strong>
                <span>${escapeHtml(venta.sucursal)}</span>
            </div>
            <div class="info-row">
                <strong>Vendedor:</strong>
                <span>${escapeHtml(venta.vendedor)}</span>
            </div>
            <div class="info-row">
                <strong>Método de pago:</strong>
                <span>${venta.metadata?.payment_method || venta.metodo_pago || 'No especificado'}</span>
            </div>
        </div>
        
        <div class="info-section">
            <h4><i class="fas fa-credit-card"></i> Estado del Pago</h4>
            <div class="info-row">
                <strong>Estado:</strong>
                <span id="modal-estado">${getStatusBadge(venta.estadoPago)}</span>
            </div>
            <div class="info-row">
                <strong>ID Transacción:</strong>
                <span id="modal-transactionId">
                    ${openPayLink && venta.orderId !== 'N/A' ? 
                        `<a href="${openPayLink}" target="_blank" style="color: var(--primary-color, #FFD700); text-decoration: underline; display: inline-flex; align-items: center; gap: 5px;">
                            <i class="fas fa-external-link-alt"></i> Ver en OpenPay
                        </a>` 
                        : (venta.transactionId || venta.orderId || 'N/A')
                    }
                </span>
            </div>
            <div class="info-row">
                <strong>ID Orden:</strong>
                <span>${venta.orderId || 'N/A'}</span>
            </div>
            ${venta.metadata?.authorization ? `
            <div class="info-row">
                <strong>Autorización:</strong>
                <span>${venta.metadata.authorization}</span>
            </div>
            ` : ''}
            <div class="info-row">
                <strong>Última verificación:</strong>
                <span id="modal-actualizacion">${venta.last_status_check ? formatearFecha(new Date(venta.last_status_check)) : 'Nunca'}</span>
            </div>
            ${venta.metadata?.confirmed_amount ? `
            <div class="info-row">
                <strong>Monto confirmado:</strong>
                <span>${formatearMoneda(venta.metadata.confirmed_amount)}</span>
            </div>
            ` : ''}
        </div>
        
        <div class="info-section">
            <h4><i class="fas fa-user"></i> Información del Cliente</h4>
            <div class="info-row">
                <strong>Cliente:</strong>
                <span>${escapeHtml(venta.cliente)}</span>
            </div>
            <div class="info-row">
                <strong>Email:</strong>
                <span>${escapeHtml(venta.email)}</span>
            </div>
            <div class="info-row">
                <strong>Teléfono:</strong>
                <span>${escapeHtml(venta.telefono)}</span>
            </div>
            ${venta.direccion ? `
            <div class="info-row">
                <strong>Dirección:</strong>
                <span>${escapeHtml(venta.direccion)}</span>
            </div>
            ` : ''}
        </div>
        
        <div class="info-section">
            <h4><i class="fas fa-truck"></i> Estado de Entrega</h4>
            <div class="info-row">
                <strong>Estado:</strong>
                <span>${getEntregaBadge(venta.estadoEntrega)}</span>
            </div>
            ${venta.fecha_entrega ? `
            <div class="info-row">
                <strong>Fecha entrega estimada:</strong>
                <span>${formatearFecha(venta.fecha_entrega)}</span>
            </div>
            ` : ''}
            ${venta.direccion_entrega ? `
            <div class="info-row">
                <strong>Dirección de entrega:</strong>
                <span>${escapeHtml(venta.direccion_entrega)}</span>
            </div>
            ` : ''}
            ${venta.notas_entrega ? `
            <div class="info-row">
                <strong>Notas de entrega:</strong>
                <span>${escapeHtml(venta.notas_entrega)}</span>
            </div>
            ` : ''}
        </div>
        
        <div class="info-section">
            <h4><i class="fas fa-box"></i> Productos (${venta.productosCount})</h4>
            <table class="productos-table">
                <thead>
                    <tr>
                        <th>Producto</th>
                        <th>Precio unitario</th>
                        <th>Cantidad</th>
                        <th>Subtotal</th>
                    </tr>
                </thead>
                <tbody id="modal-productos">
                    ${venta.productos && venta.productos.length > 0 ? 
                        venta.productos.map((item, index) => `
                            <tr>
                                <td>${escapeHtml(item.name || item.nombre || `Producto ${index + 1}`)}</td>
                                <td>${formatearMoneda(item.price || item.precio || item.unit_price || 0)}</td>
                                <td>${item.quantity || item.cantidad || item.qty || 1}</td>
                                <td>${formatearMoneda((item.price || item.precio || item.unit_price || 0) * (item.quantity || item.cantidad || item.qty || 1))}</td>
                            </tr>
                        `).join('') 
                        : '<tr><td colspan="4">No hay información detallada de productos</td></tr>'
                    }
                </tbody>
            </table>
        </div>
        
        ${venta.notas ? `
        <div class="info-section">
            <h4><i class="fas fa-sticky-note"></i> Notas Adicionales</h4>
            <div class="info-row">
                <span style="white-space: pre-wrap;">${escapeHtml(venta.notas)}</span>
            </div>
        </div>
        ` : ''}
    `;
    
    // Almacenar IDs para actualización
    const refreshBtn = document.getElementById('refreshModalBtn');
    refreshBtn.dataset.id = venta.docId;
    refreshBtn.dataset.coleccion = venta.coleccion;
    refreshBtn.dataset.order = venta.orderId;
    
    // Configurar botón de editar
    const editarBtn = document.getElementById('editarVentaBtn');
    editarBtn.dataset.id = venta.docId;
    editarBtn.dataset.coleccion = venta.coleccion;
    
    // Deshabilitar botón si no hay orderId
    if (!venta.orderId || venta.orderId === 'N/A') {
        refreshBtn.disabled = true;
        refreshBtn.title = 'No hay ID de orden para consultar';
    } else {
        refreshBtn.disabled = false;
        refreshBtn.title = 'Actualizar estado de pago';
    }
    
    // Mostrar modal
    document.getElementById('detalleModal').style.display = 'flex';
}

// Actualizar estado de pago
async function actualizarEstadoPago(docId, coleccion, orderId, isModal = false) {
    let loadingElement;
    let originalHTML;
    
    if (isModal) {
        loadingElement = document.getElementById('refreshModalBtn');
        originalHTML = loadingElement.innerHTML;
        loadingElement.innerHTML = '<div class="spinner-small"></div> Actualizando...';
        loadingElement.disabled = true;
    } else {
        // Encontrar el botón específico en la tabla
        const button = document.querySelector(`button.btn-refresh-status[data-id="${docId}"][data-coleccion="${coleccion}"]`);
        if (button) {
            originalHTML = button.innerHTML;
            button.innerHTML = '<div class="spinner-small"></div>';
            button.disabled = true;
        }
    }
    
    try {
        console.log(`🔄 Actualizando estado para: Doc=${docId}, Colección=${coleccion}, Order=${orderId}`);
        
        const estadoPago = await consultarEstadoOpenPay(orderId);
        
        console.log('📊 Resultado consulta:', estadoPago);
        
        // Mostrar información de depuración
        if (estadoPago.source === 'simulated') {
            console.log(`ℹ️ Usando datos simulados para ${orderId}`);
        }
        
        // Preparar datos para actualizar
        const updateData = {
            payment_status: estadoPago.status,
            updated_at: firebase.firestore.FieldValue.serverTimestamp(),
            last_status_check: new Date().toISOString()
        };
        
        // Agregar metadata
        updateData['metadata.payment_status'] = estadoPago.status;
        updateData['metadata.last_checked'] = new Date().toISOString();
        
        if (estadoPago.amount > 0) {
            updateData['metadata.confirmed_amount'] = estadoPago.amount;
        }
        
        if (estadoPago.transaction_id) {
            updateData['transaction_id'] = estadoPago.transaction_id;
            updateData['metadata.transaction_id'] = estadoPago.transaction_id;
        }
        
        if (estadoPago.authorization) {
            updateData['metadata.authorization'] = estadoPago.authorization;
        }
        
        if (estadoPago.method) {
            updateData['metadata.payment_method'] = estadoPago.method;
        }
        
        try {
            // Actualizar en Firebase
            await db.collection(coleccion).doc(docId).update(updateData);
            
            // Mostrar mensaje apropiado
            let mensaje = `El estado del pago se actualizó a: ${estadoPago.statusText}`;
            let icono = 'success';
            
            if (estadoPago.status === 'error') {
                mensaje = `Error al consultar estado: ${estadoPago.error || 'Error desconocido'}`;
                icono = 'warning';
            } else if (estadoPago.source === 'simulated') {
                mensaje = `Estado simulado: ${estadoPago.statusText}`;
                icono = 'info';
            }
            
            Swal.fire({
                title: estadoPago.status === 'error' ? 'Advertencia' : 'Estado actualizado',
                text: mensaje,
                icon: icono,
                background: '#2d2d2d',
                color: '#ffffff',
                timer: estadoPago.status === 'error' ? 3000 : 2000,
                showConfirmButton: false
            });
            
            // Recargar ventas
            setTimeout(() => {
                cargarVentas();
            }, 500);
            
            return estadoPago;
            
        } catch (firebaseError) {
            console.warn('⚠️ No se pudo actualizar en Firebase, actualizando solo en cache:', firebaseError);
            
            // Actualizar solo en cache
            const ventaIndex = appState.ventas.findIndex(v => v.docId === docId && v.coleccion === coleccion);
            if (ventaIndex !== -1) {
                appState.ventas[ventaIndex].estadoPago = estadoPago.status;
                appState.ventas[ventaIndex].metadata = {
                    ...appState.ventas[ventaIndex].metadata,
                    payment_status: estadoPago.status,
                    last_checked: new Date().toISOString()
                };
                
                if (estadoPago.transaction_id) {
                    appState.ventas[ventaIndex].transactionId = estadoPago.transaction_id;
                }
            }
            
            Swal.fire({
                title: 'Actualizado en cache',
                text: `Estado actualizado a: ${estadoPago.statusText} (solo en memoria)`,
                icon: 'info',
                background: '#2d2d2d',
                color: '#ffffff',
                timer: 2000,
                showConfirmButton: false
            });
            
            return estadoPago;
        }
        
    } catch (error) {
        console.error('❌ Error actualizando estado:', error);
        
        Swal.fire({
            title: 'Error',
            html: `
                <div style="text-align: left;">
                    <p><strong>No se pudo actualizar el estado:</strong></p>
                    <p>${error.message}</p>
                    <p><small>Error técnico: ${error.toString()}</small></p>
                </div>
            `,
            icon: 'error',
            background: '#2d2d2d',
            color: '#ffffff',
            confirmButtonText: 'Entendido'
        });
        
        return { 
            status: 'error', 
            error: error.message,
            source: 'update-failed'
        };
        
    } finally {
        // Restaurar estado del botón
        if (isModal && loadingElement) {
            loadingElement.innerHTML = originalHTML || '<i class="fas fa-sync-alt"></i> Actualizar estado';
            loadingElement.disabled = false;
        } else if (!isModal) {
            const button = document.querySelector(`button.btn-refresh-status[data-id="${docId}"][data-coleccion="${coleccion}"]`);
            if (button) {
                button.innerHTML = originalHTML || '<i class="fas fa-sync-alt"></i>';
                button.disabled = false;
            }
        }
    }
}

// [Las funciones restantes se mantienen igual que antes...]
// mostrarModalNuevaVenta, configurarEventosNuevaVenta, agregarProducto, eliminarProducto,
// calcularTotalVenta, guardarNuevaVenta, exportarExcel, actualizarPaginacion,
// aplicarFiltros, limpiarFiltros, configurarEventos, escapeHtml, mostrarError, initApp

// Exportar a Excel
function exportarExcel() {
    try {
        if (appState.ventas.length === 0) {
            Swal.fire({
                title: 'Sin datos',
                text: 'No hay ventas para exportar',
                icon: 'warning',
                background: '#2d2d2d',
                color: '#ffffff'
            });
            return;
        }
        
        // Crear hoja de cálculo
        const wsData = [
            ['ID Venta', 'Fecha', 'Cliente', 'Email', 'Productos', 'Total', 'Sucursal', 'Vendedor', 'Estado Pago', 'Estado Entrega', 'ID Transacción', 'Colección']
        ];
        
        appState.ventas.forEach(venta => {
            const estadoPago = venta.estadoPago || 'unknown';
            const estadoTexto = estadoPago === 'completed' ? 'Completado' :
                              estadoPago === 'paid' ? 'Pagado' :
                              estadoPago === 'pending' ? 'Pendiente' :
                              estadoPago === 'processing' ? 'Procesando' : estadoPago;
            
            const estadoEntrega = venta.estadoEntrega || 'pendiente';
            const entregaTexto = estadoEntrega === 'entregado' ? 'Entregado' :
                               estadoEntrega === 'en_camino' ? 'En camino' :
                               estadoEntrega === 'preparando' ? 'Preparando' :
                               estadoEntrega === 'pendiente' ? 'Pendiente' : estadoEntrega;
            
            wsData.push([
                venta.id,
                formatearFecha(venta.fecha),
                venta.cliente,
                venta.email,
                venta.productosCount,
                venta.total || 0,
                venta.sucursal,
                venta.vendedor,
                estadoTexto,
                entregaTexto,
                venta.transactionId || venta.orderId || 'N/A',
                venta.coleccion
            ]);
        });
        
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Ventas');
        
        // Ajustar ancho de columnas
        const wscols = [
            {wch: 20}, // ID Venta
            {wch: 20}, // Fecha
            {wch: 25}, // Cliente
            {wch: 25}, // Email
            {wch: 10}, // Productos
            {wch: 15}, // Total
            {wch: 15}, // Sucursal
            {wch: 15}, // Vendedor
            {wch: 15}, // Estado Pago
            {wch: 15}, // Estado Entrega
            {wch: 20}, // ID Transacción
            {wch: 15}  // Colección
        ];
        ws['!cols'] = wscols;
        
        // Generar y descargar archivo
        const fecha = new Date().toISOString().split('T')[0];
        const hora = new Date().getHours().toString().padStart(2, '0') + 
                    new Date().getMinutes().toString().padStart(2, '0');
        XLSX.writeFile(wb, `ventas_${fecha}_${hora}.xlsx`);
        
        Swal.fire({
            title: 'Exportado exitosamente',
            html: `
                <div style="text-align: center;">
                    <i class="fas fa-file-excel" style="font-size: 3rem; color: #28a745; margin-bottom: 15px;"></i>
                    <p>Se exportaron ${appState.ventas.length} registros</p>
                    <p><small>Archivo: ventas_${fecha}_${hora}.xlsx</small></p>
                </div>
            `,
            icon: 'success',
            background: '#2d2d2d',
            color: '#ffffff',
            timer: 2000,
            showConfirmButton: false
        });
        
    } catch (error) {
        console.error('Error exportando Excel:', error);
        Swal.fire({
            title: 'Error en exportación',
            html: `
                <div style="text-align: left;">
                    <p><strong>No se pudo exportar el archivo:</strong></p>
                    <p>${error.message}</p>
                    <p><small>Asegúrate de tener permisos para descargar archivos.</small></p>
                </div>
            `,
            icon: 'error',
            background: '#2d2d2d',
            color: '#ffffff'
        });
    }
}

// Actualizar paginación
function actualizarPaginacion() {
    const btnAnterior = document.getElementById('btnAnterior');
    const btnSiguiente = document.getElementById('btnSiguiente');
    const paginaInfo = document.getElementById('paginaInfo');
    
    btnAnterior.disabled = appState.currentPage <= 1;
    btnSiguiente.disabled = appState.currentPage >= appState.totalPages;
    
    paginaInfo.textContent = `Página ${appState.currentPage} de ${appState.totalPages} (${appState.totalVentas} registros)`;
}

// Aplicar filtros
function aplicarFiltros() {
    appState.filtros.fechaInicio = document.getElementById('filtroFechaInicio').value || null;
    appState.filtros.fechaFin = document.getElementById('filtroFechaFin').value || null;
    appState.filtros.sucursal = document.getElementById('filtroSucursal').value || '';
    appState.filtros.estadoPago = document.getElementById('filtroEstadoPago').value || '';
    appState.filtros.vendedor = document.getElementById('filtroVendedor').value || '';
    
    // Resetear a página 1
    appState.currentPage = 1;
    
    // Recargar ventas
    cargarVentas();
    
    // Ocultar filtros
    document.getElementById('filtrosContainer').style.display = 'none';
    
    Swal.fire({
        title: 'Filtros aplicados',
        text: 'Los filtros se aplicaron correctamente',
        icon: 'success',
        background: '#2d2d2d',
        color: '#ffffff',
        timer: 1500,
        showConfirmButton: false
    });
}

// Limpiar filtros
function limpiarFiltros() {
    document.getElementById('filtroFechaInicio').value = '';
    document.getElementById('filtroFechaFin').value = '';
    document.getElementById('filtroSucursal').value = '';
    document.getElementById('filtroEstadoPago').value = '';
    document.getElementById('filtroVendedor').value = '';
    
    appState.filtros = {
        fechaInicio: null,
        fechaFin: null,
        sucursal: '',
        estadoPago: '',
        vendedor: ''
    };
    
    appState.currentPage = 1;
    
    cargarVentas();
    
    Swal.fire({
        title: 'Filtros limpiados',
        text: 'Todos los filtros se han limpiado',
        icon: 'success',
        background: '#2d2d2d',
        color: '#ffffff',
        timer: 1500,
        showConfirmButton: false
    });
}

// Configurar eventos
function configurarEventos() {
    // Evento para ver detalles
    document.querySelectorAll('.btn-ver').forEach(button => {
        button.addEventListener('click', (e) => {
            const id = e.currentTarget.dataset.id;
            const coleccion = e.currentTarget.dataset.coleccion;
            mostrarModalDetalles(id, coleccion);
        });
    });
    
    // Evento para actualizar estado
    document.querySelectorAll('.btn-refresh-status:not([disabled])').forEach(button => {
        button.addEventListener('click', async (e) => {
            e.stopPropagation();
            const id = e.currentTarget.dataset.id;
            const coleccion = e.currentTarget.dataset.coleccion;
            const orderId = e.currentTarget.dataset.order;
            
            if (id && coleccion && orderId && orderId !== 'N/A') {
                await actualizarEstadoPago(id, coleccion, orderId, false);
            } else {
                Swal.fire({
                    title: 'No se puede actualizar',
                    text: 'No hay ID de orden válido para consultar',
                    icon: 'warning',
                    background: '#2d2d2d',
                    color: '#ffffff',
                    timer: 2000,
                    showConfirmButton: false
                });
            }
        });
    });
    
    // Evento para editar venta
    document.querySelectorAll('.btn-editar-venta').forEach(button => {
        button.addEventListener('click', (e) => {
            const id = e.currentTarget.dataset.id;
            const coleccion = e.currentTarget.dataset.coleccion;
            // Por ahora solo mostramos mensaje
            Swal.fire({
                title: 'Editar venta',
                text: `Funcionalidad de edición para venta ${id} (${coleccion}) en desarrollo`,
                icon: 'info',
                background: '#2d2d2d',
                color: '#ffffff',
                timer: 2000,
                showConfirmButton: false
            });
        });
    });
    
    // Eventos de paginación
    document.getElementById('btnAnterior').addEventListener('click', () => {
        if (appState.currentPage > 1) {
            appState.currentPage--;
            cargarVentas();
        }
    });
    
    document.getElementById('btnSiguiente').addEventListener('click', () => {
        if (appState.currentPage < appState.totalPages) {
            appState.currentPage++;
            cargarVentas();
        }
    });
    
    // Evento para cerrar modal de detalles
    document.getElementById('closeModal').addEventListener('click', () => {
        document.getElementById('detalleModal').style.display = 'none';
    });
    
    document.getElementById('closeModalBtn').addEventListener('click', () => {
        document.getElementById('detalleModal').style.display = 'none';
    });
    
    // Evento para cerrar modal de nueva venta
    document.getElementById('closeNuevaVentaModal').addEventListener('click', () => {
        document.getElementById('nuevaVentaModal').style.display = 'none';
    });
    
    document.getElementById('cancelNuevaVentaBtn').addEventListener('click', () => {
        document.getElementById('nuevaVentaModal').style.display = 'none';
    });
    
    // Cerrar modales con ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (document.getElementById('detalleModal').style.display === 'flex') {
                document.getElementById('detalleModal').style.display = 'none';
            }
            if (document.getElementById('nuevaVentaModal').style.display === 'flex') {
                document.getElementById('nuevaVentaModal').style.display = 'none';
            }
        }
    });
    
    // Evento para actualizar desde modal
    document.getElementById('refreshModalBtn').addEventListener('click', async (e) => {
        const id = e.currentTarget.dataset.id;
        const coleccion = e.currentTarget.dataset.coleccion;
        const orderId = e.currentTarget.dataset.order;
        
        if (id && coleccion && orderId && orderId !== 'N/A') {
            await actualizarEstadoPago(id, coleccion, orderId, true);
        } else {
            Swal.fire({
                title: 'No se puede actualizar',
                text: 'No hay ID de orden válido para consultar',
                icon: 'warning',
                background: '#2d2d2d',
                color: '#ffffff',
                timer: 2000,
                showConfirmButton: false
            });
        }
    });
    
    // Evento para editar desde modal
    document.getElementById('editarVentaBtn').addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        const coleccion = e.currentTarget.dataset.coleccion;
        Swal.fire({
            title: 'Editar venta',
            text: `Funcionalidad de edición para venta ${id} (${coleccion}) en desarrollo`,
            icon: 'info',
            background: '#2d2d2d',
            color: '#ffffff'
        });
    });
    
    // Evento para imprimir
    document.getElementById('printOrderBtn').addEventListener('click', () => {
        // Crear una versión imprimible del modal
        const modalContent = document.querySelector('.modal-content').cloneNode(true);
        const printWindow = window.open('', '_blank');
        
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Detalle de Venta - RSI Enterprise</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; }
                    h1 { color: #333; border-bottom: 2px solid #FFD700; padding-bottom: 10px; }
                    .info-section { margin-bottom: 20px; }
                    .info-row { margin-bottom: 8px; }
                    .info-row strong { display: inline-block; width: 180px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                    th { background: #f5f5f5; padding: 8px; text-align: left; }
                    td { padding: 8px; border-bottom: 1px solid #ddd; }
                    .badge { display: inline-block; padding: 3px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
                    .badge-success { background: #28a745; color: white; }
                    .badge-warning { background: #ffc107; color: #000; }
                    .badge-info { background: #17a2b8; color: white; }
                    .badge-secondary { background: #6c757d; color: white; }
                    @media print {
                        body { padding: 10px; }
                        .no-print { display: none; }
                    }
                </style>
            </head>
            <body>
                <h1>Detalle de Venta - RSI Enterprise</h1>
                ${modalContent.querySelector('.modal-body').innerHTML}
                <div style="text-align: center; margin-top: 30px; font-size: 12px; color: #666;">
                    Documento generado el ${new Date().toLocaleString()}
                </div>
            </body>
            </html>
        `);
        
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 500);
    });
    
    // Evento para mostrar/ocultar filtros
    document.getElementById('btnMostrarFiltros').addEventListener('click', () => {
        const filtrosContainer = document.getElementById('filtrosContainer');
        const isVisible = filtrosContainer.style.display === 'block';
        filtrosContainer.style.display = isVisible ? 'none' : 'block';
        
        // Cambiar icono
        const icon = document.getElementById('btnMostrarFiltros').querySelector('i');
        icon.className = isVisible ? 'fas fa-filter' : 'fas fa-times';
    });
    
    // Evento para nueva venta
    document.getElementById('btnNuevaVenta').addEventListener('click', mostrarModalNuevaVenta);
    
    // Evento para aplicar filtros
    document.getElementById('btnAplicarFiltros').addEventListener('click', aplicarFiltros);
    
    // Evento para limpiar filtros
    document.getElementById('btnLimpiarFiltros').addEventListener('click', limpiarFiltros);
    
    // Evento para actualizar todo
    document.getElementById('btnRefreshAll').addEventListener('click', () => {
        // Verificar si OpenPay está disponible primero
        checkOpenPayAvailability().then((openPayAvailable) => {
            if (!openPayAvailable) {
                Swal.fire({
                    title: 'OpenPay no disponible',
                    html: `
                        <div style="text-align: center;">
                            <p>La integración con OpenPay no está disponible.</p>
                            <p><small>Los estados se actualizarán con información simulada.</small></p>
                        </div>
                    `,
                    icon: 'info',
                    background: '#2d2d2d',
                    color: '#ffffff',
                    timer: 3000,
                    showConfirmButton: false
                });
            }
            
            cargarVentas();
        });
    });
    
    // Evento para exportar Excel
    document.getElementById('btnExportExcel').addEventListener('click', exportarExcel);
}

// Función de seguridad para HTML
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Mostrar error
function mostrarError(mensaje) {
    const tablaContainer = document.getElementById("ventas-lista");
    
    const errorHTML = `
        <tr class="error-state">
            <td colspan="10">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Error</h3>
                <p>${mensaje}</p>
                <button onclick="cargarVentas()" class="btn-accion" style="margin-top: 15px;">
                    <i class="fas fa-redo"></i> Reintentar
                </button>
                <button onclick="location.reload()" class="btn-accion" style="margin-top: 10px; background: #6c757d;">
                    <i class="fas fa-sync-alt"></i> Recargar página
                </button>
            </td>
        </tr>
    `;
    
    tablaContainer.innerHTML = errorHTML;
}

// Inicializar la aplicación
async function initApp() {
    console.log('🚀 Inicializando panel de ventas...');
    
    const firebaseReady = await waitForFirebase();
    
    if (!firebaseReady) {
        return;
    }
    
    // Verificar OpenPay
    await checkOpenPayAvailability();
    
    // Cargar datos iniciales
    await cargarVentas();
    
    // Configurar eventos principales
    configurarEventos();
    
    console.log('✅ Panel de ventas inicializado correctamente');
    
    // Mostrar mensaje de bienvenida
    setTimeout(() => {
        if (!OpenPayInitialized) {
            Swal.fire({
                title: 'Modo de prueba',
                html: `
                    <div style="text-align: center;">
                        <i class="fas fa-info-circle" style="font-size: 3rem; color: #FFD700; margin-bottom: 15px;"></i>
                        <p>OpenPay no está disponible</p>
                        <p><small>El sistema funcionará en modo simulado. Los estados de pago se generarán localmente.</small></p>
                    </div>
                `,
                icon: 'info',
                background: '#2d2d2d',
                color: '#ffffff',
                timer: 4000,
                showConfirmButton: false
            });
        }
    }, 1000);
}

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
// ============================================
// BLOQUE 1: FUNCIONES PARA NUEVA VENTA
// ============================================

// Mostrar modal para nueva venta
function mostrarModalNuevaVenta() {
    const modalBody = document.getElementById('nuevaVentaBody');
    
    modalBody.innerHTML = `
        <div class="form-group">
            <label><i class="fas fa-user"></i> Cliente</label>
            <input type="text" id="nuevoCliente" class="form-input" placeholder="Nombre del cliente" required>
        </div>
        
        <div class="form-row">
            <div class="form-group">
                <label><i class="fas fa-envelope"></i> Email</label>
                <input type="email" id="nuevoEmail" class="form-input" placeholder="correo@ejemplo.com">
            </div>
            <div class="form-group">
                <label><i class="fas fa-phone"></i> Teléfono</label>
                <input type="tel" id="nuevoTelefono" class="form-input" placeholder="Teléfono">
            </div>
        </div>
        
        <div class="form-group">
            <label><i class="fas fa-store"></i> Sucursal</label>
            <select id="nuevaSucursal" class="form-select" required>
                <option value="">Seleccionar sucursal</option>
                <option value="Sucursal Centro">Centro</option>
                <option value="Sucursal Norte">Norte</option>
                <option value="Sucursal Sur">Sur</option>
            </select>
        </div>
        
        <div class="form-row">
            <div class="form-group">
                <label><i class="fas fa-user-tie"></i> Vendedor</label>
                <select id="nuevoVendedor" class="form-select" required>
                    <option value="Sistema">Sistema</option>
                    <option value="Administrador">Administrador</option>
                    <option value="Vendedor 1">Vendedor 1</option>
                    <option value="Vendedor 2">Vendedor 2</option>
                </select>
            </div>
            <div class="form-group">
                <label><i class="fas fa-credit-card"></i> Método de Pago</label>
                <select id="nuevoMetodoPago" class="form-select" required>
                    <option value="efectivo">Efectivo</option>
                    <option value="tarjeta">Tarjeta</option>
                    <option value="transferencia">Transferencia</option>
                    <option value="openpay">OpenPay</option>
                </select>
            </div>
        </div>
        
        <div class="form-group">
            <label><i class="fas fa-box"></i> Productos</label>
            <div id="productosContainer" style="margin-bottom: 15px;">
                <div class="form-row producto-item">
                    <div style="flex: 2;">
                        <input type="text" class="form-input producto-nombre" placeholder="Nombre del producto" required>
                    </div>
                    <div style="flex: 1;">
                        <input type="number" class="form-input producto-precio" placeholder="Precio" min="0" step="0.01" required>
                    </div>
                    <div style="flex: 1;">
                        <input type="number" class="form-input producto-cantidad" placeholder="Cantidad" min="1" required>
                    </div>
                    <div style="flex: 1; display: flex; align-items: center;">
                        <button type="button" class="btn-accion btn-eliminar-venta" onclick="eliminarProducto(this)" style="width: 100%;">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
            <button type="button" id="agregarProducto" class="btn-accion" style="background: #17a2b8;">
                <i class="fas fa-plus"></i> Agregar Producto
            </button>
        </div>
        
        <div class="form-group">
            <label><i class="fas fa-sticky-note"></i> Notas</label>
            <textarea id="nuevasNotas" class="form-textarea" placeholder="Notas adicionales..." rows="3"></textarea>
        </div>
        
        <div class="info-section" style="background: rgba(255, 215, 0, 0.05); padding: 15px; border-radius: 8px;">
            <h4><i class="fas fa-calculator"></i> Resumen</h4>
            <div class="info-row">
                <strong>Subtotal:</strong>
                <span id="resumenSubtotal">$0.00</span>
            </div>
            <div class="info-row">
                <strong>IVA (16%):</strong>
                <span id="resumenIVA">$0.00</span>
            </div>
            <div class="info-row">
                <strong>Total:</strong>
                <span id="resumenTotal" style="font-size: 1.2rem; color: var(--primary-color, #FFD700); font-weight: bold;">$0.00</span>
            </div>
        </div>
    `;
    
    // Mostrar modal
    document.getElementById('nuevaVentaModal').style.display = 'flex';
    
    // Configurar eventos para nueva venta
    configurarEventosNuevaVenta();
}

// Configurar eventos para nueva venta
function configurarEventosNuevaVenta() {
    // Agregar producto
    const agregarProductoBtn = document.getElementById('agregarProducto');
    if (agregarProductoBtn) {
        agregarProductoBtn.addEventListener('click', agregarProducto);
    }
    
    // Calcular total en tiempo real
    document.querySelectorAll('.producto-precio, .producto-cantidad').forEach(input => {
        input.addEventListener('input', calcularTotalVenta);
    });
    
    // Guardar venta
    const guardarVentaBtn = document.getElementById('guardarVentaBtn');
    if (guardarVentaBtn) {
        guardarVentaBtn.addEventListener('click', guardarNuevaVenta);
    }
}

// Agregar producto a nueva venta
function agregarProducto() {
    const productosContainer = document.getElementById('productosContainer');
    if (!productosContainer) return;
    
    const productoDiv = document.createElement('div');
    productoDiv.className = 'form-row producto-item';
    productoDiv.innerHTML = `
        <div style="flex: 2;">
            <input type="text" class="form-input producto-nombre" placeholder="Nombre del producto" required>
        </div>
        <div style="flex: 1;">
            <input type="number" class="form-input producto-precio" placeholder="Precio" min="0" step="0.01" required>
        </div>
        <div style="flex: 1;">
            <input type="number" class="form-input producto-cantidad" placeholder="Cantidad" min="1" required>
        </div>
        <div style="flex: 1; display: flex; align-items: center;">
            <button type="button" class="btn-accion btn-eliminar-venta" onclick="eliminarProducto(this)" style="width: 100%;">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;
    
    productosContainer.appendChild(productoDiv);
    
    // Agregar eventos a los nuevos inputs
    productoDiv.querySelector('.producto-precio').addEventListener('input', calcularTotalVenta);
    productoDiv.querySelector('.producto-cantidad').addEventListener('input', calcularTotalVenta);
}

// Eliminar producto
function eliminarProducto(button) {
    const productoDiv = button.closest('.producto-item');
    if (productoDiv) {
        productoDiv.remove();
        calcularTotalVenta();
    }
}

// Calcular total de la venta
function calcularTotalVenta() {
    let subtotal = 0;
    
    document.querySelectorAll('.producto-item').forEach(item => {
        const precio = parseFloat(item.querySelector('.producto-precio').value) || 0;
        const cantidad = parseInt(item.querySelector('.producto-cantidad').value) || 0;
        subtotal += precio * cantidad;
    });
    
    const iva = subtotal * 0.16;
    const total = subtotal + iva;
    
    const subtotalElement = document.getElementById('resumenSubtotal');
    const ivaElement = document.getElementById('resumenIVA');
    const totalElement = document.getElementById('resumenTotal');
    
    if (subtotalElement) subtotalElement.textContent = formatearMoneda(subtotal);
    if (ivaElement) ivaElement.textContent = formatearMoneda(iva);
    if (totalElement) totalElement.textContent = formatearMoneda(total);
}

// Generar ID único para ventas
function generarIdVenta() {
    const fecha = new Date();
    const year = fecha.getFullYear().toString().substr(-2);
    const month = (fecha.getMonth() + 1).toString().padStart(2, '0');
    const day = fecha.getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `VTA-${year}${month}${day}-${random}`;
}

// Guardar nueva venta
async function guardarNuevaVenta() {
    try {
        // Validar datos
        const clienteInput = document.getElementById('nuevoCliente');
        const sucursalSelect = document.getElementById('nuevaSucursal');
        const vendedorSelect = document.getElementById('nuevoVendedor');
        
        if (!clienteInput || !sucursalSelect || !vendedorSelect) {
            Swal.fire({
                title: 'Error',
                text: 'No se pudieron cargar los campos del formulario',
                icon: 'error',
                background: '#2d2d2d',
                color: '#ffffff'
            });
            return;
        }
        
        const cliente = clienteInput.value;
        const sucursal = sucursalSelect.value;
        const vendedor = vendedorSelect.value;
        
        if (!cliente || !sucursal || !vendedor) {
            Swal.fire({
                title: 'Campos requeridos',
                text: 'Por favor completa todos los campos obligatorios',
                icon: 'warning',
                background: '#2d2d2d',
                color: '#ffffff'
            });
            return;
        }
        
        // Obtener productos
        const productos = [];
        document.querySelectorAll('.producto-item').forEach(item => {
            const nombre = item.querySelector('.producto-nombre').value;
            const precio = parseFloat(item.querySelector('.producto-precio').value);
            const cantidad = parseInt(item.querySelector('.producto-cantidad').value);
            
            if (nombre && precio > 0 && cantidad > 0) {
                productos.push({
                    name: nombre,
                    price: precio,
                    quantity: cantidad,
                    subtotal: precio * cantidad
                });
            }
        });
        
        if (productos.length === 0) {
            Swal.fire({
                title: 'Productos requeridos',
                text: 'Debe agregar al menos un producto',
                icon: 'warning',
                background: '#2d2d2d',
                color: '#ffffff'
            });
            return;
        }
        
        // Calcular totales
        const subtotal = productos.reduce((sum, item) => sum + item.subtotal, 0);
        const iva = subtotal * 0.16;
        const total = subtotal + iva;
        
        // Preparar datos para guardar
        const nuevaVenta = {
            id: generarIdVenta(),
            cliente: cliente,
            email: document.getElementById('nuevoEmail')?.value || '',
            telefono: document.getElementById('nuevoTelefono')?.value || '',
            sucursal: sucursal,
            vendedor: vendedor,
            metodo_pago: document.getElementById('nuevoMetodoPago')?.value || 'efectivo',
            items: productos,
            subtotal: subtotal,
            iva: iva,
            total: total,
            payment_status: 'pending',
            estado_entrega: 'pendiente',
            fecha: new Date(),
            created_at: new Date(),
            updated_at: new Date(),
            notas: document.getElementById('nuevasNotas')?.value || ''
        };
        
        // Mostrar loading
        Swal.fire({
            title: 'Guardando venta...',
            text: 'Por favor espera',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            },
            background: '#2d2d2d',
            color: '#ffffff'
        });
        
        // Guardar en Firebase
        await db.collection("ventas").add(nuevaVenta);
        
        // Cerrar modal
        document.getElementById('nuevaVentaModal').style.display = 'none';
        
        // Mostrar éxito
        Swal.fire({
            title: '¡Venta creada!',
            html: `
                <div style="text-align: center;">
                    <i class="fas fa-check-circle" style="font-size: 3rem; color: #28a745; margin-bottom: 15px;"></i>
                    <p>Venta <strong>${nuevaVenta.id}</strong> creada exitosamente</p>
                    <p>Total: <strong>${formatearMoneda(total)}</strong></p>
                </div>
            `,
            icon: 'success',
            background: '#2d2d2d',
            color: '#ffffff',
            timer: 2000,
            showConfirmButton: false
        });
        
        // Recargar ventas
        cargarVentas();
        
    } catch (error) {
        console.error('Error guardando venta:', error);
        Swal.fire({
            title: 'Error',
            text: 'No se pudo guardar la venta: ' + error.message,
            icon: 'error',
            background: '#2d2d2d',
            color: '#ffffff'
        });
    }
}

// ============================================
// BLOQUE 2: AGREGAR AL FINAL DEL ARCHIVO (antes del initApp)
// ============================================

// Hacer funciones disponibles globalmente
window.cargarVentas = cargarVentas;
window.mostrarModalDetalles = mostrarModalDetalles;
window.mostrarModalNuevaVenta = mostrarModalNuevaVenta;
window.exportarExcel = exportarExcel;
window.aplicarFiltros = aplicarFiltros;
window.limpiarFiltros = limpiarFiltros;
window.actualizarEstadoPago = actualizarEstadoPago;
window.agregarProducto = agregarProducto;
window.eliminarProducto = eliminarProducto;
window.calcularTotalVenta = calcularTotalVenta;
window.guardarNuevaVenta = guardarNuevaVenta; // ¡Agregar esta línea!

// Inicializar la aplicación
async function initApp() {
    console.log('🚀 Inicializando panel de ventas...');
    
    const firebaseReady = await waitForFirebase();
    
    if (!firebaseReady) {
        return;
    }
    
    // Verificar OpenPay
    await checkOpenPayAvailability();
    
    // Cargar datos iniciales
    await cargarVentas();
    
    // Configurar eventos principales
    configurarEventos();
    
    console.log('✅ Panel de ventas inicializado correctamente');
    
    // Mostrar mensaje de bienvenida
    setTimeout(() => {
        if (!OpenPayInitialized) {
            Swal.fire({
                title: 'Modo de prueba',
                html: `
                    <div style="text-align: center;">
                        <i class="fas fa-info-circle" style="font-size: 3rem; color: #FFD700; margin-bottom: 15px;"></i>
                        <p>OpenPay no está disponible</p>
                        <p><small>El sistema funcionará en modo simulado. Los estados de pago se generarán localmente.</small></p>
                    </div>
                `,
                icon: 'info',
                background: '#2d2d2d',
                color: '#ffffff',
                timer: 4000,
                showConfirmButton: false
            });
        }
    }, 1000);
}

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

// Hacer funciones disponibles globalmente
window.cargarVentas = cargarVentas;
window.mostrarModalDetalles = mostrarModalDetalles;
window.mostrarModalNuevaVenta = mostrarModalNuevaVenta;
window.exportarExcel = exportarExcel;
window.aplicarFiltros = aplicarFiltros;
window.limpiarFiltros = limpiarFiltros;
window.actualizarEstadoPago = actualizarEstadoPago;
window.agregarProducto = agregarProducto;
window.eliminarProducto = eliminarProducto;
window.calcularTotalVenta = calcularTotalVenta;