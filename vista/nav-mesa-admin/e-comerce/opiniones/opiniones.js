// Sistema de gestión de opiniones - Versión responsive
// opiniones.js

// Variables globales
let db;
const appState = {
    currentPage: 1,
    lastVisible: null,
    filterCalificacion: 'todas',
    searchTerm: '',
    totalOpiniones: 0,
    calificacionPromedio: 0,
    opinionesHoy: 0,
    distribucion: {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
};

// Esperar a que Firebase esté listo
function waitForFirebase() {
    return new Promise((resolve) => {
        if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
            db = firebase.firestore();
            console.log('✅ Firebase inicializado para opiniones');
            resolve(true);
        } else {
            const checkInterval = setInterval(() => {
                if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
                    clearInterval(checkInterval);
                    db = firebase.firestore();
                    console.log('✅ Firebase inicializado para opiniones (retardado)');
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

// Función de seguridad para HTML
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Formatear fecha
function formatearFecha(timestamp) {
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
        return 'Fecha inválida';
    }
}

// Generar estrellas HTML
function generarEstrellas(calificacion) {
    let estrellas = '';
    for (let i = 1; i <= 5; i++) {
        if (i <= calificacion) {
            estrellas += '<i class="fas fa-star"></i>';
        } else {
            estrellas += '<i class="far fa-star"></i>';
        }
    }
    return estrellas;
}

// Cargar estadísticas
async function cargarEstadisticas() {
    try {
        if (!db) return;

        // Obtener todas las opiniones
        const querySnapshot = await db.collection("comentarios").get();
        appState.totalOpiniones = querySnapshot.size;
        
        // Calcular estadísticas
        let totalCalificacion = 0;
        let opinionesHoy = 0;
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        
        // Resetear distribución
        appState.distribucion = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0};
        
        querySnapshot.forEach(doc => {
            const data = doc.data();
            const calificacion = data.calificacion || 0;
            
            // Sumar para promedio
            totalCalificacion += calificacion;
            
            // Contar por calificación
            if (calificacion >= 1 && calificacion <= 5) {
                appState.distribucion[calificacion]++;
            }
            
            // Contar opiniones de hoy
            if (data.fecha) {
                try {
                    const fechaOpinion = data.fecha.toDate ? data.fecha.toDate() : new Date(data.fecha);
                    if (fechaOpinion >= hoy) {
                        opinionesHoy++;
                    }
                } catch (error) {
                    console.error('Error procesando fecha:', error);
                }
            }
        });
        
        // Calcular promedio
        appState.calificacionPromedio = appState.totalOpiniones > 0 
            ? (totalCalificacion / appState.totalOpiniones).toFixed(1)
            : 0;
        
        appState.opinionesHoy = opinionesHoy;
        
        // Actualizar UI
        document.getElementById('totalOpiniones').textContent = appState.totalOpiniones;
        document.getElementById('calificacionPromedio').textContent = appState.calificacionPromedio;
        document.getElementById('opinionesHoy').textContent = opinionesHoy;
        
        // Actualizar distribución de calificaciones
        actualizarDistribucion();
        
    } catch (error) {
        console.error('Error cargando estadísticas:', error);
    }
}

// Actualizar distribución de calificaciones
function actualizarDistribucion() {
    const maxCount = Math.max(...Object.values(appState.distribucion));
    
    for (let i = 1; i <= 5; i++) {
        const count = appState.distribucion[i] || 0;
        const porcentaje = maxCount > 0 ? (count / maxCount) * 100 : 0;
        
        const bar = document.getElementById(`bar${i}`);
        const countElement = document.getElementById(`count${i}`);
        
        if (bar) {
            bar.style.width = `${porcentaje}%`;
            bar.setAttribute('data-count', count);
        }
        
        if (countElement) {
            countElement.textContent = count;
        }
    }
}

// Cargar opiniones (ambas vistas)
async function cargarOpiniones(direction = 'next') {
    const tablaContainer = document.getElementById("opiniones-lista");
    
    if (!db) {
        mostrarError('Firebase no está inicializado. Recarga la página.');
        return;
    }
    
    // Mostrar loading
    const loadingHTML = `
        <tr class="loading-state">
            <td colspan="5">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Cargando opiniones...</p>
            </td>
        </tr>
    `;
    
    tablaContainer.innerHTML = loadingHTML;
    
    try {
        // Construir consulta base
        let queryRef = db.collection("comentarios");
        
        // Aplicar filtro de calificación si no es "todas"
        if (appState.filterCalificacion !== 'todas') {
            queryRef = queryRef.where("calificacion", "==", parseInt(appState.filterCalificacion));
        }
        
        // Ordenar por fecha descendente
        queryRef = queryRef.orderBy('fecha', 'desc');
        
        // Aplicar paginación
        if (direction === 'next' && appState.lastVisible) {
            queryRef = queryRef.startAfter(appState.lastVisible);
        }
        
        // Limitar resultados
        queryRef = queryRef.limit(10);
        
        const querySnapshot = await queryRef.get();
        
        if (querySnapshot.empty) {
            const emptyHTML = `
                <tr class="empty-state">
                    <td colspan="5">
                        <i class="fas fa-comments"></i>
                        <h3>No hay opiniones</h3>
                        <p>No se han recibido opiniones todavía.</p>
                    </td>
                </tr>
            `;
            
            tablaContainer.innerHTML = emptyHTML;
            actualizarControlesPaginacion(0);
            return;
        }
        
        // Actualizar referencia para paginación
        appState.lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1];
        
        // Generar HTML para ambas vistas
        let tablaHTML = '';
        let cardsHTML = '';
        
        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const id = docSnap.id;
            const nombre = data.nombre || 'Cliente anónimo';
            const calificacion = data.calificacion || 0;
            const comentario = data.comentario || 'Sin comentario';
            const fecha = formatearFecha(data.fecha);
            
            // Obtener inicial para avatar
            const inicial = nombre.charAt(0).toUpperCase();
            
            // HTML para TABLA (desktop)
            tablaHTML += `
                <tr data-id="${id}">
                    <td>
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <div class="avatar-cliente" style="width: 40px; height: 40px; font-size: 1rem;">
                                ${inicial}
                            </div>
                            <strong>${escapeHtml(nombre)}</strong>
                        </div>
                    </td>
                    <td>
                        <div class="estrellas">
                            ${generarEstrellas(calificacion)}
                        </div>
                        <small>${calificacion} estrellas</small>
                    </td>
                    <td>
                        <div class="comentario-tabla" title="${escapeHtml(comentario)}">
                            ${escapeHtml(comentario.length > 150 ? comentario.substring(0, 150) + '...' : comentario)}
                        </div>
                    </td>
                    <td>${fecha}</td>
                    <td>
                        <button class="btn-accion btn-eliminar btn-accion-small" 
                                data-id="${id}" 
                                data-nombre="${escapeHtml(nombre)}"
                                title="Eliminar opinión">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </td>
                </tr>
            `;
            
            // HTML para TARJETAS (móvil)
            cardsHTML += `
                <div class="opinion-card" data-id="${id}">
                    <div class="card-header-opinion">
                        <div class="cliente-info">
                            <div class="avatar-cliente">
                                ${inicial}
                            </div>
                            <div>
                                <div class="cliente-nombre">${escapeHtml(nombre)}</div>
                                <div class="cliente-fecha">${fecha}</div>
                            </div>
                        </div>
                        <div class="calificacion-badge">
                            ${calificacion} <i class="fas fa-star" style="color: #ffd700;"></i>
                        </div>
                    </div>
                    
                    <div class="estrellas-card">
                        ${generarEstrellas(calificacion)}
                    </div>
                    
                    <div class="comentario-card">
                        ${escapeHtml(comentario)}
                    </div>
                    
                    <div class="card-footer-opinion">
                        <div class="card-acciones">
                            <button class="btn-accion btn-ver-mas btn-accion-small" 
                                    onclick="verOpinionCompleta('${escapeHtml(nombre)}', ${calificacion}, '${escapeHtml(comentario)}', '${fecha}')">
                                <i class="fas fa-eye"></i> Ver completo
                            </button>
                            <button class="btn-accion btn-eliminar btn-accion-small" 
                                    data-id="${id}" 
                                    data-nombre="${escapeHtml(nombre)}">
                                <i class="fas fa-trash-alt"></i> Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });
        
        // Actualizar tabla
        tablaContainer.innerHTML = tablaHTML;
        
        // Crear o actualizar contenedor de tarjetas
        crearContenedorTarjetas(cardsHTML);
        
        // Actualizar controles de paginación
        actualizarControlesPaginacion(querySnapshot.size);
        
        // Configurar eventos
        configurarEventos();
        
        // Cargar estadísticas
        await cargarEstadisticas();
        
    } catch (error) {
        console.error("Error cargando opiniones:", error);
        mostrarError('Error al cargar opiniones: ' + error.message);
    }
}

// Crear contenedor de tarjetas dinámicamente
function crearContenedorTarjetas(cardsHTML) {
    let cardsContainer = document.getElementById("opiniones-cards");
    
    if (!cardsContainer) {
        cardsContainer = document.createElement('div');
        cardsContainer.id = 'opiniones-cards';
        cardsContainer.className = 'opiniones-cards-container';
        
        const tableContainer = document.querySelector('.opiniones-table-container');
        if (tableContainer) {
            tableContainer.parentNode.insertBefore(cardsContainer, tableContainer.nextSibling);
        }
    }
    
    cardsContainer.innerHTML = cardsHTML;
}

// Configurar eventos
function configurarEventos() {
    // Evento para eliminar opinión (ambas vistas)
    document.querySelectorAll('.btn-eliminar').forEach(button => {
        button.addEventListener('click', async (e) => {
            const id = e.currentTarget.dataset.id;
            const nombre = e.currentTarget.dataset.nombre;
            
            await eliminarOpinion(id, nombre);
        });
    });
    
    // Configurar filtros
    configurarFiltros();
    
    // Configurar paginación
    configurarPaginacion();
}

// Configurar filtros
function configurarFiltros() {
    const filterCalificacion = document.getElementById('filterCalificacion');
    const searchInput = document.getElementById('searchOpinion');
    
    filterCalificacion.addEventListener('change', (e) => {
        appState.filterCalificacion = e.target.value;
        appState.currentPage = 1;
        appState.lastVisible = null;
        cargarOpiniones();
    });
    
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            appState.searchTerm = e.target.value.trim();
            appState.currentPage = 1;
            appState.lastVisible = null;
            // Nota: La búsqueda real se implementaría filtrando en Firestore
            console.log('Buscando:', appState.searchTerm);
        }, 500);
    });
}

// Configurar paginación
function configurarPaginacion() {
    document.getElementById('btnPaginaSiguiente').addEventListener('click', () => {
        appState.currentPage++;
        cargarOpiniones('next');
    });
    
    document.getElementById('btnPaginaAnterior').addEventListener('click', () => {
        if (appState.currentPage > 1) {
            appState.currentPage--;
            appState.lastVisible = null;
            cargarOpiniones();
        }
    });
}

// Actualizar controles de paginación
function actualizarControlesPaginacion(docsCargados) {
    const btnAnterior = document.getElementById('btnPaginaAnterior');
    const btnSiguiente = document.getElementById('btnPaginaSiguiente');
    const paginaActual = document.getElementById('paginaActual');
    
    paginaActual.textContent = `Página ${appState.currentPage}`;
    btnAnterior.disabled = appState.currentPage === 1;
    btnSiguiente.disabled = docsCargados < 10;
}

// Eliminar opinión
async function eliminarOpinion(id, nombre) {
    try {
        const result = await Swal.fire({
            title: '¿Eliminar opinión?',
            html: `
                <p>¿Estás seguro de que deseas eliminar la opinión de <strong>"${nombre}"</strong>?</p>
                <p><small>Esta acción no se puede deshacer.</small></p>
            `,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Eliminar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#dc3545',
            cancelButtonColor: '#6c757d',
            background: '#2d2d2d',
            color: '#ffffff'
        });
        
        if (result.isConfirmed) {
            await db.collection("comentarios").doc(id).delete();
            
            Swal.fire({
                title: 'Opinión eliminada',
                text: `La opinión de "${nombre}" ha sido eliminada.`,
                icon: 'success',
                background: '#2d2d2d',
                color: '#ffffff',
                timer: 2000,
                showConfirmButton: false
            });
            
            // Recargar opiniones
            cargarOpiniones();
        }
        
    } catch (error) {
        console.error("Error eliminando opinión:", error);
        Swal.fire({
            title: 'Error',
            text: 'No se pudo eliminar la opinión.',
            icon: 'error',
            background: '#2d2d2d',
            color: '#ffffff'
        });
    }
}

// Ver opinión completa (modal)
function verOpinionCompleta(nombre, calificacion, comentario, fecha) {
    Swal.fire({
        title: `Opinión de ${nombre}`,
        html: `
            <div style="text-align: left;">
                <div style="color: #ffd700; font-size: 1.5rem; margin-bottom: 15px;">
                    ${generarEstrellas(calificacion)}
                    <span style="color: #333; font-size: 1rem; margin-left: 10px;">
                        (${calificacion} estrellas)
                    </span>
                </div>
                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 15px 0;">
                    <p style="color: #333; line-height: 1.6;">${comentario}</p>
                </div>
                <div style="color: #666; font-size: 0.9rem; margin-top: 20px;">
                    <i class="fas fa-calendar-alt"></i> ${fecha}
                </div>
            </div>
        `,
        showCloseButton: true,
        showConfirmButton: false,
        width: '600px',
        background: '#ffffff',
        color: '#333333'
    });
}

// Mostrar error
function mostrarError(mensaje) {
    const tablaContainer = document.getElementById("opiniones-lista");
    const cardsContainer = document.getElementById("opiniones-cards");
    
    const errorHTML = `
        <tr class="error-state">
            <td colspan="5">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Error</h3>
                <p>${mensaje}</p>
                <button onclick="cargarOpiniones()" class="btn-accion" style="margin-top: 15px;">
                    <i class="fas fa-redo"></i> Reintentar
                </button>
            </td>
        </tr>
    `;
    
    tablaContainer.innerHTML = errorHTML;
    
    if (cardsContainer) {
        cardsContainer.innerHTML = `
            <div class="error-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Error</h3>
                <p>${mensaje}</p>
                <button onclick="cargarOpiniones()" class="btn-accion" style="margin-top: 15px;">
                    <i class="fas fa-redo"></i> Reintentar
                </button>
            </div>
        `;
    }
}

// Inicializar la aplicación
async function initApp() {
    console.log('🚀 Inicializando módulo de opiniones...');
    
    const firebaseReady = await waitForFirebase();
    
    if (!firebaseReady) {
        return;
    }
    
    cargarOpiniones();
    
    console.log('✅ Módulo de opiniones inicializado correctamente');
}

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

// Hacer funciones disponibles globalmente
window.reloadOpiniones = cargarOpiniones;
window.verOpinionCompleta = verOpinionCompleta;
window.eliminarOpinion = eliminarOpinion;