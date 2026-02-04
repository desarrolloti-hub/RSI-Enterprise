// Sistema de gestión de categorías - Versión responsive
// categorias.js

// Variables globales
let db, storage;
const appState = {
    categorias: [],
    totalCategorias: 0,
    totalProductos: 0,
    totalPapelera: 0
};

// Esperar a que Firebase esté listo
function waitForFirebase() {
    return new Promise((resolve) => {
        if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
            db = firebase.firestore();
            storage = firebase.storage();
            console.log('✅ Firebase inicializado para categorías');
            resolve(true);
        } else {
            const checkInterval = setInterval(() => {
                if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
                    clearInterval(checkInterval);
                    db = firebase.firestore();
                    storage = firebase.storage();
                    console.log('✅ Firebase inicializado para categorías (retardado)');
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

// Cargar estadísticas
async function cargarEstadisticas() {
    try {
        if (!db) return;

        const categoriasSnapshot = await db.collection("categorias").get();
        appState.totalCategorias = categoriasSnapshot.size;
        
        const productosSnapshot = await db.collection("Productos").get();
        appState.totalProductos = productosSnapshot.size;
        
        const papeleraSnapshot = await db.collection("categoriasPapelera").get();
        appState.totalPapelera = papeleraSnapshot.size;
        
        document.getElementById('totalCategorias').textContent = appState.totalCategorias;
        document.getElementById('productosAsociados').textContent = appState.totalProductos;
        document.getElementById('categoriasPapelera').textContent = appState.totalPapelera;
        
    } catch (error) {
        console.error('Error cargando estadísticas:', error);
    }
}

// Cargar categorías (ambas vistas: tabla y tarjetas)
async function cargarCategorias() {
    const tablaContainer = document.getElementById("categorias-lista");
    const cardsContainer = document.getElementById("categorias-cards");
    
    if (!db) {
        mostrarError('Firebase no está inicializado. Recarga la página.');
        return;
    }
    
    // Mostrar loading en ambos contenedores
    const loadingHTML = `
        <tr class="loading-state">
            <td colspan="4">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Cargando categorías...</p>
            </td>
        </tr>
    `;
    
    tablaContainer.innerHTML = loadingHTML;
    
    if (cardsContainer) {
        cardsContainer.innerHTML = `
            <div class="loading-state">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Cargando categorías...</p>
            </div>
        `;
    }
    
    try {
        const querySnapshot = await db.collection("categorias").orderBy("nombre").get();
        
        if (querySnapshot.empty) {
            const emptyHTML = `
                <tr class="empty-state">
                    <td colspan="4">
                        <i class="fas fa-tags"></i>
                        <h3>No hay categorías</h3>
                        <p>No se han creado categorías todavía.</p>
                        <a href="nuevaCategoria.html" class="btn-nueva-categoria" style="margin-top: 15px; display: inline-flex;">
                            <i class="fas fa-plus"></i> Crear primera categoría
                        </a>
                    </td>
                </tr>
            `;
            
            tablaContainer.innerHTML = emptyHTML;
            
            if (cardsContainer) {
                cardsContainer.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-tags"></i>
                        <h3>No hay categorías</h3>
                        <p>No se han creado categorías todavía.</p>
                        <a href="nuevaCategoria.html" class="btn-nueva-categoria" style="margin-top: 15px; display: inline-flex;">
                            <i class="fas fa-plus"></i> Crear primera categoría
                        </a>
                    </div>
                `;
            }
            return;
        }
        
        // Generar HTML para la tabla (desktop)
        let tablaHTML = '';
        let cardsHTML = '';
        appState.categorias = [];
        
        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const id = docSnap.id;
            
            appState.categorias.push({ id, ...data });
            
            // HTML para TABLA (desktop)
            tablaHTML += `
                <tr data-id="${id}">
                    <td>${id.substring(0, 8)}...</td>
                    <td>
                        <strong>${escapeHtml(data.nombre || 'Sin nombre')}</strong>
                        ${data.descripcion ? `<br><small>${escapeHtml(data.descripcion)}</small>` : ''}
                    </td>
                    <td>
                        ${data.imagen ? `
                            <img src="${data.imagen}" 
                                 class="imagen-categoria" 
                                 alt="${escapeHtml(data.nombre || 'Categoría')}"
                                 title="Clic para ampliar"
                                 onclick="ampliarImagen('${data.imagen}', '${escapeHtml(data.nombre)}')">
                        ` : '<span class="sin-imagen">Sin imagen</span>'}
                    </td>
                    <td>
                        <div class="acciones-container">
                            <button class="btn-accion btn-editar" data-id="${id}" title="Editar categoría">
                                <i class="fas fa-edit"></i> Editar
                            </button>
                            <button class="btn-accion btn-eliminar" 
                                    data-id="${id}" 
                                    data-nombre="${escapeHtml(data.nombre)}"
                                    title="Mover a papelera">
                                <i class="fas fa-trash-alt"></i> Eliminar
                            </button>
                        </div>
                    </td>
                </tr>
            `;
            
            // HTML para TARJETAS (móvil)
            cardsHTML += `
                <div class="categoria-card" data-id="${id}">
                    <div class="card-header">
                        <span class="card-id">ID: ${id.substring(0, 8)}...</span>
                        <div class="card-acciones">
                            <button class="btn-accion btn-accion-small btn-editar" data-id="${id}" title="Editar">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-accion btn-accion-small btn-eliminar" 
                                    data-id="${id}" 
                                    data-nombre="${escapeHtml(data.nombre)}"
                                    title="Eliminar">
                                <i class="fas fa-trash-alt"></i>
                            </button>
                        </div>
                    </div>
                    
                    <div class="card-content">
                        <div class="card-imagen-container">
                            ${data.imagen ? `
                                <img src="${data.imagen}" 
                                     class="card-imagen" 
                                     alt="${escapeHtml(data.nombre || 'Categoría')}"
                                     onclick="ampliarImagen('${data.imagen}', '${escapeHtml(data.nombre)}')">
                            ` : '<div class="sin-imagen">Sin imagen</div>'}
                        </div>
                        
                        <div class="card-detalles">
                            <h3 class="card-nombre">${escapeHtml(data.nombre || 'Sin nombre')}</h3>
                            
                            ${data.descripcion ? `
                                <div class="card-descripcion">
                                    <i class="fas fa-align-left"></i>
                                    <p>${escapeHtml(data.descripcion)}</p>
                                </div>
                            ` : ''}
                            
                            <div class="card-detalle">
                                <i class="fas fa-hashtag"></i>
                                <span>ID: ${id.substring(0, 8)}...</span>
                            </div>
                            
                            <div class="card-detalle">
                                <i class="fas fa-calendar-alt"></i>
                                <span>Creada: ${formatearFecha(data.fechaCreacion)}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="card-footer">
                        <span class="card-estado">
                            <i class="fas fa-circle" style="color: #28a745;"></i>
                            Activa
                        </span>
                        <div class="card-acciones-mobile">
                         
                           
                        </div>
                    </div>
                </div>
            `;
        });
        
        // Actualizar ambos contenedores
        tablaContainer.innerHTML = tablaHTML;
        
        if (cardsContainer) {
            cardsContainer.innerHTML = cardsHTML;
        } else {
            // Si no existe el contenedor de tarjetas, crearlo dinámicamente
            crearContenedorTarjetas(cardsHTML);
        }
        
        // Configurar eventos
        configurarEventos();
        
        // Cargar estadísticas
        await cargarEstadisticas();
        
    } catch (error) {
        console.error("Error cargando categorías:", error);
        mostrarError('Error al cargar categorías: ' + error.message);
    }
}

// Crear contenedor de tarjetas dinámicamente
function crearContenedorTarjetas(cardsHTML) {
    const cardsContainer = document.createElement('div');
    cardsContainer.id = 'categorias-cards';
    cardsContainer.className = 'categorias-cards-container';
    
    const tableContainer = document.querySelector('.categorias-list-container');
    if (tableContainer) {
        // Insertar después de la tabla
        tableContainer.appendChild(cardsContainer);
        cardsContainer.innerHTML = cardsHTML;
    }
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
        
        return fecha.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    } catch (error) {
        return 'Fecha inválida';
    }
}

// Configurar eventos para ambas vistas
function configurarEventos() {
    // Eventos para editar (tabla y tarjetas)
    document.querySelectorAll('.btn-editar').forEach(button => {
        button.addEventListener('click', (e) => {
            const id = e.currentTarget.dataset.id;
            window.location.href = `editarCategoria.html?id=${id}`;
        });
    });
    
    // Eventos para eliminar (tabla y tarjetas)
    document.querySelectorAll('.btn-eliminar').forEach(button => {
        button.addEventListener('click', async (e) => {
            const id = e.currentTarget.dataset.id;
            const nombre = e.currentTarget.dataset.nombre;
            
            await eliminarCategoria(id, nombre);
        });
    });
}

// Eliminar categoría (mover a papelera)
async function eliminarCategoria(id, nombre) {
    try {
        // Verificar si hay productos asociados
        const productosQuery = await db.collection("Productos")
            .where("Categoria", "==", nombre)
            .get();
        
        if (!productosQuery.empty) {
            const productosCount = productosQuery.size;
            
            Swal.fire({
                title: 'No se puede eliminar',
                html: `
                    <div style="text-align: left;">
                        <p><strong>La categoría "${nombre}" tiene productos asociados.</strong></p>
                        <p>Productos encontrados: <strong>${productosCount}</strong></p>
                        <p>Para eliminar esta categoría, primero debes:</p>
                        <ul>
                            <li>Eliminar o reasignar los productos asociados</li>
                            <li>Cambiar la categoría de los productos</li>
                        </ul>
                    </div>
                `,
                icon: 'error',
                confirmButtonText: 'Entendido',
                background: '#2d2d2d',
                color: '#ffffff'
            });
            return;
        }
        
        const result = await Swal.fire({
            title: '¿Mover a la papelera?',
            html: `
                <p>La categoría <strong>"${nombre}"</strong> será movida a la papelera.</p>
                <p><small>Podrás recuperarla desde la papelera si es necesario.</small></p>
            `,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Mover a papelera',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#dc3545',
            cancelButtonColor: '#6c757d',
            background: '#2d2d2d',
            color: '#ffffff'
        });
        
        if (result.isConfirmed) {
            const categoriaRef = db.collection("categorias").doc(id);
            const categoriaDoc = await categoriaRef.get();
            
            if (!categoriaDoc.exists) {
                throw new Error('La categoría no existe');
            }
            
            const categoriaData = categoriaDoc.data();
            
            // Agregar metadata de eliminación
            categoriaData.eliminado = new Date().toISOString();
            categoriaData.eliminadoPor = 'Sistema';
            categoriaData.idOriginal = id;
            
            // Mover a papelera
            await db.collection("categoriasPapelera").doc(id).set(categoriaData);
            
            // Eliminar de categorías activas
            await categoriaRef.delete();
            
            Swal.fire({
                title: 'Movida a papelera',
                text: `La categoría "${nombre}" ha sido movida a la papelera.`,
                icon: 'success',
                background: '#2d2d2d',
                color: '#ffffff',
                timer: 2000,
                showConfirmButton: false
            });
            
            // Recargar categorías
            cargarCategorias();
        }
        
    } catch (error) {
        console.error("Error eliminando categoría:", error);
        Swal.fire({
            title: 'Error',
            text: 'No se pudo mover la categoría a la papelera.',
            icon: 'error',
            background: '#2d2d2d',
            color: '#ffffff'
        });
    }
}

// Función para ampliar imagen
function ampliarImagen(url, titulo) {
    Swal.fire({
        title: titulo,
        imageUrl: url,
        imageAlt: `Imagen de ${titulo}`,
        showCloseButton: true,
        showConfirmButton: false,
        background: '#2d2d2d',
        color: '#ffffff'
    });
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
    const tablaContainer = document.getElementById("categorias-lista");
    const cardsContainer = document.getElementById("categorias-cards");
    
    const errorHTML = `
        <tr class="error-state">
            <td colspan="4">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Error</h3>
                <p>${mensaje}</p>
                <button onclick="cargarCategorias()" class="btn-accion" style="margin-top: 15px;">
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
                <button onclick="cargarCategorias()" class="btn-accion" style="margin-top: 15px;">
                    <i class="fas fa-redo"></i> Reintentar
                </button>
            </div>
        `;
    }
}

// Inicializar la aplicación
async function initApp() {
    console.log('🚀 Inicializando módulo de categorías...');
    
    const firebaseReady = await waitForFirebase();
    
    if (!firebaseReady) {
        return;
    }
    
    cargarCategorias();
    
    console.log('✅ Módulo de categorías inicializado correctamente');
}

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

// Hacer funciones disponibles globalmente
window.reloadCategorias = cargarCategorias;
window.getCategoriasStats = cargarEstadisticas;
window.eliminarCategoria = eliminarCategoria;
window.ampliarImagen = ampliarImagen;