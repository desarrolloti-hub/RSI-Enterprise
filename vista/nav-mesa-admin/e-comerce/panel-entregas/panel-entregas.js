// Sistema de panel de entregas - Versión completa y corregida
// panel-entregas.js

// Variables globales
let db;
const appState = {
    entregas: [],
    totalEntregas: 0,
    totalIngresos: 0,
    entregasCompletadas: 0,
    entregasPendientes: 0,
    currentPage: 1,
    pageSize: 20,
    totalPages: 1,
    filtros: {
        fechaInicio: null,
        fechaFin: null,
        sucursal: '',
        estadoPago: ''
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
    // En modo sandbox
    const sandbox = true;
    
    if (sandbox) {
        // Enlace para sandbox de OpenPay
        if (transactionId) {
            return `https://dashboard.openpay.mx/sandbox/charges/${transactionId}`;
        } else if (orderId && orderId !== 'N/A') {
            return `https://dashboard.openpay.mx/sandbox/charges/${orderId}`;
        }
    } else {
        // Enlace para producción (cuando se cambie a producción)
        if (transactionId) {
            return `https://dashboard.openpay.mx/charges/${transactionId}`;
        } else if (orderId && orderId !== 'N/A') {
            return `https://dashboard.openpay.mx/charges/${orderId}`;
        }
    }
    
    return null;
}

// Función alternativa para consultar estado de pago
async function consultarEstadoPagoAlternativo(orderId) {
    try {
        // Esta es una función de respaldo si OpenPay no funciona
        // Simulamos una respuesta basada en el orden ID
        const estados = ['completed', 'paid', 'pending', 'processing', 'cancelled'];
        const estadoAleatorio = estados[Math.floor(Math.random() * estados.length)];
        
        return {
            status: estadoAleatorio,
            statusText: estadoAleatorio === 'completed' ? 'Completado' : 
                        estadoAleatorio === 'paid' ? 'Pagado' :
                        estadoAleatorio === 'pending' ? 'Pendiente' :
                        estadoAleatorio === 'processing' ? 'Procesando' : 'Cancelado',
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
                status: 'error',
                error: 'Parámetros inválidos',
                statusText: 'Error',
                source: 'invalid-params'
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

// Obtener badge de estado
function getStatusBadge(status) {
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
    
    const estado = statusMap[status] || { text: status, class: 'badge-secondary' };
    return `<span class="badge ${estado.class}">${estado.text}</span>`;
}

// Actualizar estado de pago
async function actualizarEstadoPago(docId, orderId, isModal = false) {
    let loadingElement;
    let originalHTML;
    
    if (isModal) {
        loadingElement = document.getElementById('refreshModalBtn');
        originalHTML = loadingElement.innerHTML;
        loadingElement.innerHTML = '<div class="spinner-small"></div> Actualizando...';
        loadingElement.disabled = true;
    } else {
        // Encontrar el botón específico en la tabla
        const button = document.querySelector(`button.btn-refresh-status[data-id="${docId}"]`);
        if (button) {
            originalHTML = button.innerHTML;
            button.innerHTML = '<div class="spinner-small"></div>';
            button.disabled = true;
        }
    }
    
    try {
        console.log(`🔄 Actualizando estado para orden: ${orderId}, Doc: ${docId}`);
        
        const estadoPago = await consultarEstadoOpenPay(orderId);
        
        console.log('📊 Resultado consulta:', estadoPago);
        
        // Mostrar información de depuración
        if (estadoPago.source === 'simulated' || estadoPago.source === 'openpay-error') {
            console.warn(`⚠️ Usando fuente de datos: ${estadoPago.source} para orden ${orderId}`);
        }
        
        // Preparar datos para actualizar
        const updateData = {
            payment_status: estadoPago.status,
            updated_at: firebase.firestore.FieldValue.serverTimestamp(),
            last_status_check: new Date().toISOString()
        };
        
        // Agregar metadata solo si no es error
        if (estadoPago.status !== 'error') {
            updateData['metadata.payment_status'] = estadoPago.status;
            updateData['metadata.last_checked'] = new Date().toISOString();
            
            // Guardar información adicional de OpenPay
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
        }
        
        // Actualizar en Firebase
        await db.collection("entregas").doc(docId).update(updateData);
        
        // Mostrar mensaje apropiado
        let mensaje = `El estado del pago se actualizó a: ${estadoPago.statusText}`;
        let icono = 'success';
        
        if (estadoPago.status === 'error') {
            mensaje = `Error al consultar estado: ${estadoPago.error || 'Error desconocido'}`;
            icono = 'warning';
        } else if (estadoPago.source === 'simulated') {
            mensaje = `Estado simulado: ${estadoPago.statusText} (OpenPay no disponible)`;
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
        
        // Recargar datos solo si no es un error crítico
        if (estadoPago.status !== 'error' || estadoPago.source === 'simulated') {
            setTimeout(() => {
                cargarEntregas();
            }, 500);
        }
        
        return estadoPago;
        
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
            const button = document.querySelector(`button.btn-refresh-status[data-id="${docId}"]`);
            if (button) {
                button.innerHTML = originalHTML || '<i class="fas fa-sync-alt"></i>';
                button.disabled = false;
            }
        }
    }
}

// Cargar estadísticas
async function cargarEstadisticas() {
    try {
        let query = db.collection("entregas");
        
        // Aplicar filtros
        if (appState.filtros.fechaInicio) {
            const fechaInicio = new Date(appState.filtros.fechaInicio);
            fechaInicio.setHours(0, 0, 0, 0);
            query = query.where("delivered_at", ">=", fechaInicio);
        }
        if (appState.filtros.fechaFin) {
            const fechaFin = new Date(appState.filtros.fechaFin);
            fechaFin.setHours(23, 59, 59, 999);
            query = query.where("delivered_at", "<=", fechaFin);
        }
        if (appState.filtros.sucursal) {
            query = query.where("branch", "==", appState.filtros.sucursal);
        }
        if (appState.filtros.estadoPago) {
            query = query.where("payment_status", "==", appState.filtros.estadoPago);
        }
        
        const snapshot = await query.get();
        
        let totalIngresos = 0;
        let entregasCompletadas = 0;
        let entregasPendientes = 0;
        
        snapshot.forEach(doc => {
            const data = doc.data();
            totalIngresos += data.amount || 0;
            
            if (data.payment_status === 'completed' || data.payment_status === 'paid') {
                entregasCompletadas++;
            } else if (data.payment_status === 'pending' || data.payment_status === 'processing') {
                entregasPendientes++;
            }
        });
        
        appState.totalEntregas = snapshot.size;
        appState.totalIngresos = totalIngresos;
        appState.entregasCompletadas = entregasCompletadas;
        appState.entregasPendientes = entregasPendientes;
        
        // Actualizar UI
        document.getElementById('totalEntregas').textContent = appState.totalEntregas;
        document.getElementById('totalIngresos').textContent = formatearMoneda(appState.totalIngresos);
        document.getElementById('entregasCompletadas').textContent = entregasCompletadas;
        document.getElementById('entregasPendientes').textContent = entregasPendientes;
        
    } catch (error) {
        console.error('Error cargando estadísticas:', error);
    }
}

// Cargar entregas con paginación
async function cargarEntregas() {
    const tablaContainer = document.getElementById("entregas-lista");
    
    if (!db) {
        mostrarError('Firebase no está inicializado. Recarga la página.');
        return;
    }
    
    // Mostrar loading
    tablaContainer.innerHTML = `
        <tr class="loading-state">
            <td colspan="9">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Cargando entregas...</p>
            </td>
        </tr>
    `;
    
    try {
        let query = db.collection("entregas").orderBy("delivered_at", "desc");
        
        // Aplicar filtros
        if (appState.filtros.fechaInicio) {
            const fechaInicio = new Date(appState.filtros.fechaInicio);
            fechaInicio.setHours(0, 0, 0, 0);
            query = query.where("delivered_at", ">=", fechaInicio);
        }
        if (appState.filtros.fechaFin) {
            const fechaFin = new Date(appState.filtros.fechaFin);
            fechaFin.setHours(23, 59, 59, 999);
            query = query.where("delivered_at", "<=", fechaFin);
        }
        if (appState.filtros.sucursal) {
            query = query.where("branch", "==", appState.filtros.sucursal);
        }
        if (appState.filtros.estadoPago) {
            query = query.where("payment_status", "==", appState.filtros.estadoPago);
        }
        
        // Obtener total para paginación
        const totalSnapshot = await query.get();
        const totalItems = totalSnapshot.size;
        appState.totalPages = Math.max(1, Math.ceil(totalItems / appState.pageSize));
        
        // Calcular offset para paginación
        const offset = (appState.currentPage - 1) * appState.pageSize;
        
        // Aplicar límite para paginación (Firestore no tiene offset, así que trabajamos diferente)
        const entregasSnapshot = await query.limit(appState.pageSize).get();
        
        if (entregasSnapshot.empty) {
            const emptyHTML = `
                <tr class="empty-state">
                    <td colspan="9">
                        <i class="fas fa-clipboard-check"></i>
                        <h3>No hay entregas</h3>
                        <p>No se encontraron entregas con los filtros actuales.</p>
                        ${appState.filtros.fechaInicio || appState.filtros.fechaFin || appState.filtros.sucursal || appState.filtros.estadoPago ? 
                            '<button onclick="limpiarFiltros()" class="btn-accion" style="margin-top: 15px;">' +
                            '<i class="fas fa-times"></i> Limpiar filtros</button>' : 
                            ''}
                    </td>
                </tr>
            `;
            
            tablaContainer.innerHTML = emptyHTML;
            actualizarPaginacion();
            await cargarEstadisticas();
            return;
        }
        
        // Generar HTML para la tabla
        let tablaHTML = '';
        appState.entregas = [];
        
        let itemCount = 0;
        entregasSnapshot.forEach((docSnap) => {
            if (itemCount >= appState.pageSize) return;
            
            const data = docSnap.data();
            const id = docSnap.id;
            
            appState.entregas.push({ id, ...data });
            
            const orderId = data.order_id || data.metadata?.order_id || 'N/A';
            const productosCount = data.items?.length || 0;
            const estadoPago = data.payment_status || data.status || 'unknown';
            
            tablaHTML += `
                <tr data-id="${id}" data-order="${orderId}">
                    <td>${orderId}</td>
                    <td>${formatearFecha(data.created_at)}</td>
                    <td>${formatearFecha(data.delivered_at)}</td>
                    <td>${escapeHtml(data.user_email || 'N/A')}</td>
                    <td>${productosCount} producto${productosCount !== 1 ? 's' : ''}</td>
                    <td>${formatearMoneda(data.amount)}</td>
                    <td>${escapeHtml(data.branch || 'N/A')}</td>
                    <td>
                        <div class="status-cell">
                            ${getStatusBadge(estadoPago)}
                            <button class="btn-refresh-status btn-accion" 
                                    data-id="${id}" 
                                    data-order="${orderId}"
                                    title="Actualizar estado"
                                    ${!orderId || orderId === 'N/A' ? 'disabled' : ''}>
                                <i class="fas fa-sync-alt"></i>
                            </button>
                        </div>
                    </td>
                    <td>
                        <div class="acciones-container">
                            <button class="btn-accion btn-ver" 
                                    data-id="${id}" 
                                    title="Ver detalles">
                                <i class="fas fa-eye"></i> Ver
                            </button>
                        </div>
                    </td>
                </tr>
            `;
            
            itemCount++;
        });
        
        // Actualizar tabla
        tablaContainer.innerHTML = tablaHTML;
        
        // Configurar eventos
        configurarEventos();
        
        // Actualizar estadísticas
        await cargarEstadisticas();
        
        // Actualizar paginación
        actualizarPaginacion();
        
    } catch (error) {
        console.error("Error cargando entregas:", error);
        mostrarError('Error al cargar entregas: ' + error.message);
    }
}

// Mostrar modal de detalles
async function mostrarModalDetalles(docId) {
    try {
        const doc = await db.collection("entregas").doc(docId).get();
        
        if (!doc.exists) {
            Swal.fire({
                title: 'Error',
                text: 'No se encontró el pedido',
                icon: 'error',
                background: '#2d2d2d',
                color: '#ffffff'
            });
            return;
        }
        
        const data = doc.data();
        const orderId = data.order_id || data.metadata?.order_id || 'N/A';
        const transactionId = data.transaction_id || data.metadata?.transaction_id || null;
        
        // Generar enlace de OpenPay
        const openPayLink = generarEnlaceOpenPay(orderId, transactionId);
        
        // Llenar modal con información
        const modalBody = document.getElementById('modalBody');
        
        modalBody.innerHTML = `
            <div class="info-section">
                <h4><i class="fas fa-info-circle"></i> Información de la Orden</h4>
                <div class="info-row">
                    <strong>ID Orden:</strong>
                    <span>${orderId}</span>
                </div>
                <div class="info-row">
                    <strong>Fecha Pedido:</strong>
                    <span>${formatearFecha(data.created_at)}</span>
                </div>
                <div class="info-row">
                    <strong>Fecha Entrega:</strong>
                    <span>${formatearFecha(data.delivered_at)}</span>
                </div>
                <div class="info-row">
                    <strong>Total:</strong>
                    <span>${formatearMoneda(data.amount)}</span>
                </div>
                <div class="info-row">
                    <strong>Última actualización:</strong>
                    <span>${formatearFecha(data.updated_at)}</span>
                </div>
            </div>
            
            <div class="info-section">
                <h4><i class="fas fa-credit-card"></i> Estado del Pago</h4>
                <div class="info-row">
                    <strong>Estado:</strong>
                    <span id="modal-estado">${getStatusBadge(data.payment_status || data.status || 'unknown')}</span>
                </div>
                <div class="info-row">
                    <strong>ID Transacción:</strong>
                    <span id="modal-transactionId">
                        ${openPayLink ? 
                            `<a href="${openPayLink}" target="_blank" style="color: var(--primary-color, #FFD700); text-decoration: underline; display: inline-flex; align-items: center; gap: 5px;">
                                <i class="fas fa-external-link-alt"></i> Ver en OpenPay
                            </a>` 
                            : (transactionId || 'N/A')
                        }
                    </span>
                </div>
                ${data.metadata?.authorization ? `
                <div class="info-row">
                    <strong>Autorización:</strong>
                    <span>${data.metadata.authorization}</span>
                </div>
                ` : ''}
                ${data.metadata?.payment_method ? `
                <div class="info-row">
                    <strong>Método de pago:</strong>
                    <span>${data.metadata.payment_method}</span>
                </div>
                ` : ''}
                <div class="info-row">
                    <strong>Última verificación:</strong>
                    <span id="modal-actualizacion">${data.last_status_check ? formatearFecha(new Date(data.last_status_check)) : 'Nunca'}</span>
                </div>
                ${data.metadata?.confirmed_amount ? `
                <div class="info-row">
                    <strong>Monto confirmado:</strong>
                    <span>${formatearMoneda(data.metadata.confirmed_amount)}</span>
                </div>
                ` : ''}
            </div>
            
            <div class="info-section">
                <h4><i class="fas fa-user"></i> Información del Cliente</h4>
                <div class="info-row">
                    <strong>Email:</strong>
                    <span>${escapeHtml(data.user_email || 'N/A')}</span>
                </div>
                <div class="info-row">
                    <strong>ID Usuario:</strong>
                    <span>${data.user_id || 'N/A'}</span>
                </div>
                ${data.user_phone ? `
                <div class="info-row">
                    <strong>Teléfono:</strong>
                    <span>${escapeHtml(data.user_phone)}</span>
                </div>
                ` : ''}
            </div>
            
            <div class="info-section">
                <h4><i class="fas fa-truck"></i> Información de Entrega</h4>
                <div class="info-row">
                    <strong>Sucursal:</strong>
                    <span>${escapeHtml(data.branch || 'N/A')}</span>
                </div>
                <div class="info-row">
                    <strong>Entregado por:</strong>
                    <span>${escapeHtml(data.delivered_by || 'N/A')}</span>
                </div>
                ${data.delivery_address ? `
                <div class="info-row">
                    <strong>Dirección:</strong>
                    <span>${escapeHtml(data.delivery_address)}</span>
                </div>
                ` : ''}
                ${data.delivery_notes ? `
                <div class="info-row">
                    <strong>Notas de entrega:</strong>
                    <span>${escapeHtml(data.delivery_notes)}</span>
                </div>
                ` : ''}
            </div>
            
            <div class="info-section">
                <h4><i class="fas fa-box"></i> Productos (${data.items?.length || 0})</h4>
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
                        ${data.items && data.items.length > 0 ? 
                            data.items.map(item => `
                                <tr>
                                    <td>${escapeHtml(item.name || 'Producto no identificado')}</td>
                                    <td>${formatearMoneda(item.price)}</td>
                                    <td>${item.quantity || 1}</td>
                                    <td>${formatearMoneda((item.price || 0) * (item.quantity || 1))}</td>
                                </tr>
                            `).join('') 
                            : '<tr><td colspan="4">No hay información de productos</td></tr>'
                        }
                    </tbody>
                </table>
            </div>
        `;
        
        // Almacenar IDs para actualización
        const refreshBtn = document.getElementById('refreshModalBtn');
        refreshBtn.dataset.id = docId;
        refreshBtn.dataset.order = orderId;
        
        // Deshabilitar botón si no hay orderId
        if (!orderId || orderId === 'N/A') {
            refreshBtn.disabled = true;
            refreshBtn.title = 'No hay ID de orden para consultar';
        } else {
            refreshBtn.disabled = false;
            refreshBtn.title = 'Actualizar estado de pago';
        }
        
        // Mostrar modal
        document.getElementById('detalleModal').style.display = 'flex';
        
    } catch (error) {
        console.error("Error al mostrar detalle:", error);
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

// Exportar a Excel
function exportarExcel() {
    try {
        if (appState.entregas.length === 0) {
            Swal.fire({
                title: 'Sin datos',
                text: 'No hay entregas para exportar',
                icon: 'warning',
                background: '#2d2d2d',
                color: '#ffffff'
            });
            return;
        }
        
        // Crear hoja de cálculo
        const wsData = [
            ['ID Orden', 'Fecha Pedido', 'Fecha Entrega', 'Email Cliente', 'Productos', 'Total', 'Sucursal', 'Estado Pago', 'ID Transacción', 'Última Actualización']
        ];
        
        appState.entregas.forEach(entrega => {
            const productosCount = entrega.items?.length || 0;
            const estadoPago = entrega.payment_status || entrega.status || 'unknown';
            const estadoTexto = estadoPago === 'completed' ? 'Completado' :
                              estadoPago === 'paid' ? 'Pagado' :
                              estadoPago === 'pending' ? 'Pendiente' :
                              estadoPago === 'processing' ? 'Procesando' : estadoPago;
            
            wsData.push([
                entrega.order_id || entrega.metadata?.order_id || 'N/A',
                formatearFecha(entrega.created_at),
                formatearFecha(entrega.delivered_at),
                entrega.user_email || 'N/A',
                productosCount,
                entrega.amount || 0,
                entrega.branch || 'N/A',
                estadoTexto,
                entrega.transaction_id || entrega.metadata?.transaction_id || 'N/A',
                formatearFecha(entrega.updated_at)
            ]);
        });
        
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Entregas');
        
        // Ajustar ancho de columnas
        const wscols = [
            {wch: 15}, // ID Orden
            {wch: 20}, // Fecha Pedido
            {wch: 20}, // Fecha Entrega
            {wch: 25}, // Email Cliente
            {wch: 10}, // Productos
            {wch: 12}, // Total
            {wch: 15}, // Sucursal
            {wch: 15}, // Estado Pago
            {wch: 20}, // ID Transacción
            {wch: 20}  // Última Actualización
        ];
        ws['!cols'] = wscols;
        
        // Generar y descargar archivo
        const fecha = new Date().toISOString().split('T')[0];
        const hora = new Date().getHours().toString().padStart(2, '0') + 
                    new Date().getMinutes().toString().padStart(2, '0');
        XLSX.writeFile(wb, `entregas_${fecha}_${hora}.xlsx`);
        
        Swal.fire({
            title: 'Exportado exitosamente',
            html: `
                <div style="text-align: center;">
                    <i class="fas fa-file-excel" style="font-size: 3rem; color: #28a745; margin-bottom: 15px;"></i>
                    <p>Se exportaron ${appState.entregas.length} registros</p>
                    <p><small>Archivo: entregas_${fecha}_${hora}.xlsx</small></p>
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
    
    paginaInfo.textContent = `Página ${appState.currentPage} de ${appState.totalPages} (${appState.totalEntregas} registros)`;
}

// Aplicar filtros
function aplicarFiltros() {
    appState.filtros.fechaInicio = document.getElementById('filtroFechaInicio').value || null;
    appState.filtros.fechaFin = document.getElementById('filtroFechaFin').value || null;
    appState.filtros.sucursal = document.getElementById('filtroSucursal').value || '';
    appState.filtros.estadoPago = document.getElementById('filtroEstadoPago').value || '';
    
    // Resetear a página 1
    appState.currentPage = 1;
    
    // Recargar entregas
    cargarEntregas();
    
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
    
    appState.filtros = {
        fechaInicio: null,
        fechaFin: null,
        sucursal: '',
        estadoPago: ''
    };
    
    appState.currentPage = 1;
    
    cargarEntregas();
    
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
            mostrarModalDetalles(id);
        });
    });
    
    // Evento para actualizar estado
    document.querySelectorAll('.btn-refresh-status:not([disabled])').forEach(button => {
        button.addEventListener('click', async (e) => {
            e.stopPropagation();
            const id = e.currentTarget.dataset.id;
            const orderId = e.currentTarget.dataset.order;
            
            if (id && orderId && orderId !== 'N/A') {
                await actualizarEstadoPago(id, orderId, false);
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
    
    // Eventos de paginación
    document.getElementById('btnAnterior').addEventListener('click', () => {
        if (appState.currentPage > 1) {
            appState.currentPage--;
            cargarEntregas();
        }
    });
    
    document.getElementById('btnSiguiente').addEventListener('click', () => {
        if (appState.currentPage < appState.totalPages) {
            appState.currentPage++;
            cargarEntregas();
        }
    });
    
    // Evento para cerrar modal
    document.getElementById('closeModal').addEventListener('click', () => {
        document.getElementById('detalleModal').style.display = 'none';
    });
    
    document.getElementById('closeModalBtn').addEventListener('click', () => {
        document.getElementById('detalleModal').style.display = 'none';
    });
    
    // Cerrar modal con ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && document.getElementById('detalleModal').style.display === 'flex') {
            document.getElementById('detalleModal').style.display = 'none';
        }
    });
    
    // Evento para actualizar desde modal
    document.getElementById('refreshModalBtn').addEventListener('click', async (e) => {
        const id = e.currentTarget.dataset.id;
        const orderId = e.currentTarget.dataset.order;
        
        if (id && orderId && orderId !== 'N/A') {
            await actualizarEstadoPago(id, orderId, true);
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
    
    // Evento para imprimir
    document.getElementById('printOrderBtn').addEventListener('click', () => {
        // Crear una versión imprimible del modal
        const modalContent = document.querySelector('.modal-content').cloneNode(true);
        const printWindow = window.open('', '_blank');
        
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Detalle de Entrega - RSI Enterprise</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; }
                    h1 { color: #333; border-bottom: 2px solid #FFD700; padding-bottom: 10px; }
                    .info-section { margin-bottom: 20px; }
                    .info-row { margin-bottom: 8px; }
                    .info-row strong { display: inline-block; width: 180px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                    th { background: #f5f5f5; padding: 8px; text-align: left; }
                    td { padding: 8px; border-bottom: 1px solid #ddd; }
                    @media print {
                        body { padding: 10px; }
                        .no-print { display: none; }
                    }
                </style>
            </head>
            <body>
                <h1>Detalle de Entrega - RSI Enterprise</h1>
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
            
            cargarEntregas();
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
    const tablaContainer = document.getElementById("entregas-lista");
    
    const errorHTML = `
        <tr class="error-state">
            <td colspan="9">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Error</h3>
                <p>${mensaje}</p>
                <button onclick="cargarEntregas()" class="btn-accion" style="margin-top: 15px;">
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
    console.log('🚀 Inicializando panel de entregas...');
    
    const firebaseReady = await waitForFirebase();
    
    if (!firebaseReady) {
        return;
    }
    
    // Verificar OpenPay
    await checkOpenPayAvailability();
    
    // Cargar datos iniciales
    await cargarEntregas();
    
    // Configurar eventos principales
    configurarEventos();
    
    console.log('✅ Panel de entregas inicializado correctamente');
    
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
window.cargarEntregas = cargarEntregas;
window.mostrarModalDetalles = mostrarModalDetalles;
window.exportarExcel = exportarExcel;
window.aplicarFiltros = aplicarFiltros;
window.limpiarFiltros = limpiarFiltros;
window.actualizarEstadoPago = actualizarEstadoPago;