

// Variables globales
let db;
const appState = {
    currentPage: 1,
    lastVisible: null,
    filterEstado: 'todos',
    searchTerm: '',
    totalMensajes: 0,
    pendientes: 0,
    contestados: 0
};

// Esperar a que Firebase esté listo
function waitForFirebase() {
    return new Promise((resolve) => {
        if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
            db = firebase.firestore();
            resolve(true);
        } else {
            const checkInterval = setInterval(() => {
                if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
                    clearInterval(checkInterval);
                    db = firebase.firestore();
                    resolve(true);
                }
            }, 100);
            
            // Timeout de seguridad
            setTimeout(() => {
                clearInterval(checkInterval);
                console.error('Firebase no se cargó después de 10 segundos');
                resolve(false);
            }, 10000);
        }
    });
}

// Función de seguridad para HTML
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Formatear fecha
function formatFecha(timestamp) {
    if (!timestamp) return 'Fecha no disponible';
    
    try {
        let fecha;
        if (timestamp.toDate) {
            fecha = timestamp.toDate();
        } else if (timestamp.seconds) {
            fecha = new Date(timestamp.seconds * 1000);
        } else {
            fecha = new Date(timestamp);
        }
        
        return new Intl.DateTimeFormat('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(fecha);
    } catch (error) {
        console.error('Error formateando fecha:', error);
        return 'Fecha inválida';
    }
}

// Cargar estadísticas
async function cargarEstadisticas() {
    try {
        if (!db) {
            console.error('Firebase no está inicializado');
            return;
        }

        // Contar total
        const totalSnapshot = await db.collection("contactanos").get();
        appState.totalMensajes = totalSnapshot.size;
        
        // Contar pendientes
        const pendientesSnapshot = await db.collection("contactanos")
            .where("estado", "==", "Sin contestar")
            .get();
        appState.pendientes = pendientesSnapshot.size;
        
        // Contar contestados
        const contestadosSnapshot = await db.collection("contactanos")
            .where("estado", "==", "Contestado")
            .get();
        appState.contestados = contestadosSnapshot.size;
        
        // Actualizar UI
        document.getElementById('totalMensajes').textContent = appState.totalMensajes;
        document.getElementById('pendientesMensajes').textContent = appState.pendientes;
        document.getElementById('contestadosMensajes').textContent = appState.contestados;
        
    } catch (error) {
        console.error('Error cargando estadísticas:', error);
        mostrarError('Error cargando estadísticas: ' + error.message);
    }
}

// Cargar mensajes de contacto
async function cargarMensajes(direction = 'next') {
    const container = document.getElementById("mensajesContainer");
    
    if (!db) {
        container.innerHTML = `
            <div class="error-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Error de conexión</h3>
                <p>Firebase no está inicializado. Recarga la página.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = `
        <div class="loading-state">
            <i class="fas fa-spinner fa-spin"></i>
            <p>Cargando mensajes...</p>
        </div>
    `;
    
    try {
        // Construir consulta base
        let queryRef = db.collection("contactanos");
        
        // Aplicar filtro de estado si no es "todos"
        if (appState.filterEstado !== 'todos') {
            queryRef = queryRef.where("estado", "==", appState.filterEstado);
        }
        
        // Ordenar por fecha descendente
        queryRef = queryRef.orderBy('fecha', 'desc');
        
        // Aplicar paginación
        if (direction === 'next' && appState.lastVisible) {
            queryRef = queryRef.startAfter(appState.lastVisible);
        }
        
        // Limitar resultados
        queryRef = queryRef.limit(9);
        
        const querySnapshot = await queryRef.get();
        
        if (querySnapshot.empty) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-inbox"></i>
                    <h3>No hay mensajes para mostrar</h3>
                    <p>${appState.filterEstado !== 'todos' ? 
                        `No hay mensajes con estado "${appState.filterEstado}"` : 
                        'No se han recibido mensajes aún'}</p>
                </div>
            `;
            
            // Deshabilitar botón siguiente
            document.getElementById('btnPaginaSiguiente').disabled = true;
            return;
        }
        
        // Actualizar referencia para paginación
        appState.lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1];
        
        // Generar HTML de los mensajes
        let mensajesHTML = [];
        
        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const id = docSnap.id;
            const estado = data.estado || "Sin contestar";
            const estadoClass = estado.toLowerCase().replace(' ', '-');
            
            const mensajeHTML = `
                <div class="mensaje-card ${estadoClass}">
                    <div class="mensaje-header">
                        <div>
                            <h3 class="mensaje-nombre">${escapeHtml(data.nombre || 'Sin nombre')}</h3>
                            <p class="mensaje-email">${escapeHtml(data.email || 'Sin email')}</p>
                        </div>
                        <span class="estado-badge estado-${estadoClass}">
                            ${estado}
                        </span>
                    </div>
                    
                    ${data.telefono ? `
                        <div class="mensaje-telefono">
                            <i class="fas fa-phone"></i> ${escapeHtml(data.telefono)}
                        </div>
                    ` : ''}
                    
                    <div class="mensaje-contenido">
                        <p>${escapeHtml(data.mensaje || 'Sin mensaje')}</p>
                    </div>
                    
                    <div class="mensaje-footer">
                        <div class="mensaje-fecha">
                            <i class="far fa-clock"></i> ${formatFecha(data.fecha)}
                        </div>
                        <div class="mensaje-acciones">
                            <select data-id="${id}" class="estado-select">
                                <option value="Sin contestar" ${estado === 'Sin contestar' ? 'selected' : ''}>
                                    Sin contestar
                                </option>
                                <option value="Contestado" ${estado === 'Contestado' ? 'selected' : ''}>
                                    Contestado
                                </option>
                            </select>
                            <button class="btn-accion btn-eliminar" data-id="${id}">
                                <i class="fas fa-trash-alt"></i> Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            `;
            
            mensajesHTML.push(mensajeHTML);
        });
        
        container.innerHTML = mensajesHTML.join('');
        
        // Actualizar controles de paginación
        actualizarControlesPaginacion(querySnapshot.size);
        
        // Configurar eventos
        configurarEventos();
        
        // Cargar estadísticas
        await cargarEstadisticas();
        
    } catch (error) {
        console.error("Error cargando mensajes:", error);
        container.innerHTML = `
            <div class="error-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Error al cargar mensajes</h3>
                <p>${error.message}</p>
                <button onclick="cargarMensajes()" class="btn-accion" style="margin-top: 20px;">
                    <i class="fas fa-redo"></i> Reintentar
                </button>
            </div>
        `;
    }
}

// Actualizar controles de paginación
function actualizarControlesPaginacion(docsCargados) {
    const btnAnterior = document.getElementById('btnPaginaAnterior');
    const btnSiguiente = document.getElementById('btnPaginaSiguiente');
    const paginaActual = document.getElementById('paginaActual');
    
    paginaActual.textContent = `Página ${appState.currentPage}`;
    btnAnterior.disabled = appState.currentPage === 1;
    btnSiguiente.disabled = docsCargados < 9;
}

// Configurar eventos de los elementos
function configurarEventos() {
    // Evento para eliminar mensaje
    document.querySelectorAll('.btn-eliminar').forEach(button => {
        button.addEventListener('click', async (e) => {
            const id = e.currentTarget.dataset.id;
            
            const result = await Swal.fire({
                title: '¿Eliminar mensaje?',
                text: 'Esta acción no se puede deshacer. ¿Deseas continuar?',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Eliminar',
                cancelButtonText: 'Cancelar',
                background: '#2d2d2d',
                color: '#ffffff',
                confirmButtonColor: '#dc3545',
                cancelButtonColor: '#6c757d'
            });
            
            if (result.isConfirmed) {
                try {
                    await db.collection("contactanos").doc(id).delete();
                    await cargarMensajes();
                    await cargarEstadisticas();
                    
                    Swal.fire({
                        title: 'Mensaje eliminado',
                        text: 'El mensaje ha sido eliminado correctamente.',
                        icon: 'success',
                        background: '#2d2d2d',
                        color: '#ffffff'
                    });
                } catch (error) {
                    console.error("Error eliminando mensaje:", error);
                    Swal.fire({
                        title: 'Error',
                        text: 'No se pudo eliminar el mensaje. Intenta de nuevo.',
                        icon: 'error',
                        background: '#2d2d2d',
                        color: '#ffffff'
                    });
                }
            }
        });
    });
    
    // Evento para cambiar estado
    document.querySelectorAll('.estado-select').forEach(select => {
        select.addEventListener('change', async (e) => {
            const nuevoEstado = e.target.value;
            const id = e.target.dataset.id;
            
            try {
                await db.collection("contactanos").doc(id).update({
                    estado: nuevoEstado,
                    fechaActualizacion: new Date()
                });
                
                // Actualizar UI localmente
                const card = e.target.closest('.mensaje-card');
                card.className = `mensaje-card ${nuevoEstado.toLowerCase().replace(' ', '-')}`;
                
                const badge = card.querySelector('.estado-badge');
                badge.className = `estado-badge estado-${nuevoEstado.toLowerCase().replace(' ', '-')}`;
                badge.textContent = nuevoEstado;
                
                // Actualizar estadísticas
                await cargarEstadisticas();
                
                Swal.fire({
                    title: 'Estado actualizado',
                    text: `El mensaje ahora está marcado como "${nuevoEstado}".`,
                    icon: 'success',
                    background: '#2d2d2d',
                    color: '#ffffff',
                    timer: 1500,
                    showConfirmButton: false
                });
            } catch (error) {
                console.error("Error actualizando estado:", error);
                Swal.fire({
                    title: 'Error',
                    text: 'No se pudo actualizar el estado. Intenta de nuevo.',
                    icon: 'error',
                    background: '#2d2d2d',
                    color: '#ffffff'
                });
            }
        });
    });
}

// Configurar filtros
function configurarFiltros() {
    const filterEstado = document.getElementById('filterEstado');
    const searchInput = document.getElementById('searchContacto');
    
    // Filtrar por estado
    filterEstado.addEventListener('change', (e) => {
        appState.filterEstado = e.target.value;
        appState.currentPage = 1;
        appState.lastVisible = null;
        cargarMensajes();
    });
    
    // Buscar (con debounce)
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            appState.searchTerm = e.target.value.trim();
            appState.currentPage = 1;
            appState.lastVisible = null;
            // Implementar búsqueda aquí si es necesario
            console.log('Buscando:', appState.searchTerm);
        }, 500);
    });
}

// Configurar paginación
function configurarPaginacion() {
    document.getElementById('btnPaginaSiguiente').addEventListener('click', () => {
        appState.currentPage++;
        cargarMensajes('next');
    });
    
    document.getElementById('btnPaginaAnterior').addEventListener('click', () => {
        if (appState.currentPage > 1) {
            appState.currentPage--;
            appState.lastVisible = null; // Necesitamos resetear para volver atrás
            cargarMensajes();
        }
    });
}

// Mostrar error
function mostrarError(mensaje) {
    const container = document.getElementById("mensajesContainer");
    container.innerHTML = `
        <div class="error-state">
            <i class="fas fa-exclamation-triangle"></i>
            <h3>Error</h3>
            <p>${mensaje}</p>
        </div>
    `;
}

// Inicializar la aplicación
async function initApp() {
    console.log('🚀 Inicializando módulo de contactos...');
    
    // Esperar a que Firebase esté listo
    const firebaseReady = await waitForFirebase();
    
    if (!firebaseReady) {
        mostrarError('No se pudo inicializar Firebase. Verifica la conexión.');
        return;
    }
    
    console.log('✅ Firebase inicializado para contactos');
    
    // Configurar eventos
    configurarFiltros();
    configurarPaginacion();
    
    // Cargar datos iniciales
    cargarMensajes();
    
    console.log('✅ Módulo de contactos inicializado correctamente');
}

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

// Hacer funciones disponibles globalmente
window.reloadContactos = cargarMensajes;
window.getContactosStats = cargarEstadisticas;