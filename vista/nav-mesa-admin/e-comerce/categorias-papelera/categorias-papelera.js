// Sistema de gestión de papelera de categorías - Versión responsive
// categorias-papelera.js

// Variables globales
let db;
const appState = {
    categoriasPapelera: [],
    totalPapelera: 0,
    diasPromedio: 0,
    espacioOcupado: 0
};

// Esperar a que Firebase esté listo
function waitForFirebase() {
    return new Promise((resolve) => {
        if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
            db = firebase.firestore();
            console.log('✅ Firebase Firestore inicializado para papelera');
            resolve(true);
        } else {
            const checkInterval = setInterval(() => {
                if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
                    clearInterval(checkInterval);
                    db = firebase.firestore();
                    console.log('✅ Firebase Firestore inicializado (retardado) para papelera');
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

// Calcular estadísticas
function calcularEstadisticas(categorias) {
    if (!categorias || categorias.length === 0) {
        appState.totalPapelera = 0;
        appState.diasPromedio = 0;
        appState.espacioOcupado = 0;
        return;
    }
    
    appState.totalPapelera = categorias.length;
    
    // Calcular días promedio en papelera
    const ahora = new Date();
    let totalDias = 0;
    let totalEspacio = 0;
    
    categorias.forEach(categoria => {
        if (categoria.eliminado) {
            const fechaEliminacion = new Date(categoria.eliminado);
            const dias = Math.floor((ahora - fechaEliminacion) / (1000 * 60 * 60 * 24));
            totalDias += dias;
        }
        
        // Estimar espacio de imagen Base64 (aproximadamente 1KB por cada 1.37 caracteres Base64)
        if (categoria.imagen && categoria.imagen.length > 0) {
            totalEspacio += Math.round(categoria.imagen.length / 1.37); // en bytes
        }
    });
    
    appState.diasPromedio = Math.round(totalDias / categorias.length);
    appState.espacioOcupado = formatBytes(totalEspacio);
    
    // Actualizar UI
    document.getElementById('totalPapelera').textContent = appState.totalPapelera;
    document.getElementById('tiempoPromedio').textContent = appState.diasPromedio;
    document.getElementById('espacioOcupado').textContent = appState.espacioOcupado;
    
    // Mostrar/ocultar botones de acción masiva
    const btnVaciar = document.getElementById('btnVaciarPapelera');
    const btnEliminarTodo = document.getElementById('btnEliminarTodo');
    
    if (appState.totalPapelera > 0) {
        btnVaciar.style.display = 'flex';
        btnEliminarTodo.style.display = 'flex';
    } else {
        btnVaciar.style.display = 'none';
        btnEliminarTodo.style.display = 'none';
    }
}

// Formatear bytes a tamaño legible
function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Cargar papelera
async function cargarPapelera() {
    const tablaContainer = document.getElementById("papelera-lista");
    const cardsContainer = document.getElementById("papelera-cards");
    
    if (!db) {
        mostrarError('Firebase no está inicializado. Recarga la página.');
        return;
    }
    
    // Mostrar loading
    const loadingHTML = `
        <tr class="loading-state">
            <td colspan="5">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Cargando papelera...</p>
            </td>
        </tr>
    `;
    
    tablaContainer.innerHTML = loadingHTML;
    
    if (cardsContainer) {
        cardsContainer.innerHTML = `
            <div class="loading-state">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Cargando papelera...</p>
            </div>
        `;
    }
    
    try {
        const querySnapshot = await db.collection("categoriasPapelera").orderBy("eliminado", "desc").get();
        
        if (querySnapshot.empty) {
            const emptyHTML = `
                <tr class="empty-state">
                    <td colspan="5">
                        <i class="fas fa-trash-alt"></i>
                        <h3>Papelera vacía</h3>
                        <p>No hay categorías en la papelera.</p>
                        <a href="/vista/nav-mesa-admin/e-comerce/categorias/categorias.html" class="btn-volver" style="margin-top: 15px;">
                            <i class="fas fa-arrow-left"></i> Volver a Categorías
                        </a>
                    </td>
                </tr>
            `;
            
            tablaContainer.innerHTML = emptyHTML;
            
            if (cardsContainer) {
                cardsContainer.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-trash-alt"></i>
                        <h3>Papelera vacía</h3>
                        <p>No hay categorías en la papelera.</p>
                        <a href="/vista/nav-mesa-admin/e-comerce/categorias/categorias.html" class="btn-volver" style="margin-top: 15px;">
                            <i class="fas fa-arrow-left"></i> Volver a Categorías
                        </a>
                    </div>
                `;
            }
            
            calcularEstadisticas([]);
            return;
        }
        
        // Generar HTML
        let tablaHTML = '';
        let cardsHTML = '';
        appState.categoriasPapelera = [];
        
        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const id = docSnap.id;
            
            appState.categoriasPapelera.push({ id, ...data });
            
            // Obtener imagen
            let imagenSrc = data.imagen || '';
            const tieneImagen = imagenSrc && imagenSrc.trim() !== '';
            
            // Formatear fecha de eliminación
            const fechaEliminacion = data.eliminado ? new Date(data.eliminado) : null;
            const fechaFormateada = fechaEliminacion ? 
                fechaEliminacion.toLocaleDateString('es-ES', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                }) : 'Fecha desconocida';
            
            // Calcular días en papelera
            const diasEnPapelera = fechaEliminacion ? 
                Math.floor((new Date() - fechaEliminacion) / (1000 * 60 * 60 * 24)) : 0;
            
            // HTML para TABLA
            tablaHTML += `
                <tr data-id="${id}">
                    <td class="col-id">${id.substring(0, 8)}...</td>
                    <td class="col-nombre">
                        <strong>${escapeHtml(data.nombre || 'Sin nombre')}</strong>
                    </td>
                    <td class="col-imagen">
                        ${tieneImagen ? 
                            `<div class="celda-imagen">
                                <img src="${imagenSrc}" 
                                     class="imagen-papelera" 
                                     alt="${escapeHtml(data.nombre || 'Categoría')}"
                                     title="Clic para ampliar"
                                     onclick="ampliarImagen('${escapeBase64ForHtml(imagenSrc)}', '${escapeHtml(data.nombre)}', true)"
                                     onerror="this.onerror=null; this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjYwIiBoZWlnaHQ9IjYwIiByeD0iOCIgZmlsbD0iIzJEMkQyRCIvPgo8cGF0aCBkPSJNMzAgMjBDMjYuMTM0IDIwIDIzIDIzLjEzNCAyMyAyN0MyMyAzMC44NjYgMjYuMTM0IDM0IDMwIDM0QzMzLjg2NiAzNCAzNyAzMC44NjYgMzcgMjdDMzcgMjMuMTM0IDMzLjg2NiAyMCAzMCAyMFpNMzAgMzZDMjUuNTgyIDM2IDIxIDM4Ljg0IDIxIDQzVjQ1SDM5VjQzQzM5IDM4Ljg0IDM0LjQxOCAzNiAzMCAzNloiIGZpbGw9IiM2QzQzRTAiLz4KPC9zdmc+Cg=='">
                            </div>` : 
                            `<div class="celda-sin-imagen">
                                <i class="fas fa-image"></i>
                                <span>Sin imagen</span>
                            </div>`
                        }
                    </td>
                    <td class="col-fecha">
                        <div>
                            <strong>${fechaFormateada}</strong>
                            <br>
                            <small>Hace ${diasEnPapelera} días</small>
                        </div>
                    </td>
                    <td class="col-acciones">
                        <div class="acciones-container">
                            <button class="btn-accion btn-restaurar" 
                                    data-id="${id}" 
                                    data-nombre="${escapeHtml(data.nombre)}" 
                                    title="Restaurar categoría">
                                <i class="fas fa-undo"></i> Restaurar
                            </button>
                            <button class="btn-accion btn-eliminar-permanente" 
                                    data-id="${id}" 
                                    data-nombre="${escapeHtml(data.nombre)}"
                                    title="Eliminar permanentemente">
                                <i class="fas fa-trash"></i> Eliminar
                            </button>
                        </div>
                    </td>
                </tr>
            `;
            
            // HTML para TARJETAS
            cardsHTML += `
                <div class="papelera-card" data-id="${id}">
                    <div class="card-header">
                        <span class="card-id">ID: ${id.substring(0, 8)}...</span>
                        <div class="card-acciones">
                            <button class="btn-accion btn-accion-small btn-restaurar" 
                                    data-id="${id}" 
                                    data-nombre="${escapeHtml(data.nombre)}" 
                                    title="Restaurar">
                                <i class="fas fa-undo"></i>
                            </button>
                            <button class="btn-accion btn-accion-small btn-eliminar-permanente" 
                                    data-id="${id}" 
                                    data-nombre="${escapeHtml(data.nombre)}"
                                    title="Eliminar">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                    
                    <div class="card-content">
                        <div class="card-imagen-container">
                            ${tieneImagen ? 
                                `<img src="${imagenSrc}" 
                                     class="card-imagen" 
                                     alt="${escapeHtml(data.nombre || 'Categoría')}"
                                     onclick="ampliarImagen('${escapeBase64ForHtml(imagenSrc)}', '${escapeHtml(data.nombre)}', true)">` : 
                                `<div class="sin-imagen">Sin imagen</div>`
                            }
                        </div>
                        
                        <div class="card-detalles">
                            <h3 class="card-nombre">${escapeHtml(data.nombre || 'Sin nombre')}</h3>
                            
                            <div class="card-detalle">
                                <i class="fas fa-hashtag"></i>
                                <span>ID: ${id.substring(0, 8)}...</span>
                            </div>
                            
                            <div class="card-detalle">
                                <i class="fas fa-calendar-alt"></i>
                                <span>Eliminada: ${fechaFormateada}</span>
                            </div>
                            
                            <div class="card-detalle">
                                <i class="fas fa-clock"></i>
                                <span>En papelera: ${diasEnPapelera} días</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="card-footer">
                        <span class="card-estado">
                            <i class="fas fa-circle" style="color: #dc3545;"></i>
                            En papelera
                        </span>
                    </div>
                </div>
            `;
        });
        
        // Actualizar contenedores
        tablaContainer.innerHTML = tablaHTML;
        
        if (cardsContainer) {
            cardsContainer.innerHTML = cardsHTML;
        }
        
        // Configurar eventos
        configurarEventos();
        
        // Calcular estadísticas
        calcularEstadisticas(appState.categoriasPapelera);
        
    } catch (error) {
        console.error("Error cargando papelera:", error);
        mostrarError('Error al cargar la papelera: ' + error.message);
    }
}

// Configurar eventos
function configurarEventos() {
    // Evento para vaciar papelera
    document.getElementById('btnVaciarPapelera')?.addEventListener('click', restaurarTodo);
    
    // Evento para eliminar todo
    document.getElementById('btnEliminarTodo')?.addEventListener('click', eliminarTodoPermanente);
    
    // Eventos para restaurar (tabla y tarjetas)
    document.querySelectorAll('.btn-restaurar').forEach(button => {
        button.addEventListener('click', async (e) => {
            const id = e.currentTarget.dataset.id;
            const nombre = e.currentTarget.dataset.nombre;
            
            await restaurarCategoria(id, nombre);
        });
    });
    
    // Eventos para eliminar permanentemente (tabla y tarjetas)
    document.querySelectorAll('.btn-eliminar-permanente').forEach(button => {
        button.addEventListener('click', async (e) => {
            const id = e.currentTarget.dataset.id;
            const nombre = e.currentTarget.dataset.nombre;
            
            await eliminarCategoriaPermanente(id, nombre);
        });
    });
}

// Restaurar categoría
async function restaurarCategoria(id, nombre) {
    try {
        const result = await Swal.fire({
            title: '¿Restaurar categoría?',
            html: `
                <p>La categoría <strong>"${nombre}"</strong> será restaurada.</p>
                <p>Volverá a aparecer en la lista de categorías activas.</p>
            `,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sí, restaurar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#28a745',
            cancelButtonColor: '#6c757d',
            background: '#2d2d2d',
            color: '#ffffff'
        });
        
        if (result.isConfirmed) {
            Swal.fire({
                title: 'Restaurando...',
                text: 'Por favor espera',
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                },
                background: '#2d2d2d',
                color: '#ffffff'
            });
            
            const papeleraRef = db.collection("categoriasPapelera").doc(id);
            const categoriaDoc = await papeleraRef.get();
            
            if (!categoriaDoc.exists) {
                throw new Error('La categoría no existe en la papelera');
            }
            
            const categoriaData = categoriaDoc.data();
            
            // Remover metadata de eliminación
            delete categoriaData.eliminado;
            delete categoriaData.eliminadoPor;
            delete categoriaData.idOriginal;
            
            // Agregar fecha de restauración
            categoriaData.fechaRestauracion = new Date();
            categoriaData.restauradoPor = 'Sistema';
            
            // Restaurar a categorías activas
            await db.collection("categorias").doc(id).set(categoriaData);
            
            // Eliminar de papelera
            await papeleraRef.delete();
            
            Swal.fire({
                title: '¡Categoría restaurada!',
                text: `"${nombre}" ha sido restaurada exitosamente.`,
                icon: 'success',
                background: '#2d2d2d',
                color: '#ffffff',
                timer: 2000,
                showConfirmButton: false
            });
            
            // Recargar papelera
            cargarPapelera();
        }
        
    } catch (error) {
        console.error("Error restaurando categoría:", error);
        Swal.fire({
            title: 'Error',
            text: 'No se pudo restaurar la categoría.',
            icon: 'error',
            background: '#2d2d2d',
            color: '#ffffff'
        });
    }
}

// Eliminar categoría permanentemente
async function eliminarCategoriaPermanente(id, nombre) {
    try {
        const result = await Swal.fire({
            title: '¿Eliminar permanentemente?',
            html: `
                <p>La categoría <strong>"${nombre}"</strong> será eliminada permanentemente.</p>
                <p><span style="color: #dc3545; font-weight: bold;">¡Esta acción no se puede deshacer!</span></p>
            `,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, eliminar permanentemente',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#dc3545',
            cancelButtonColor: '#6c757d',
            background: '#2d2d2d',
            color: '#ffffff'
        });
        
        if (result.isConfirmed) {
            Swal.fire({
                title: 'Eliminando...',
                text: 'Por favor espera',
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                },
                background: '#2d2d2d',
                color: '#ffffff'
            });
            
            // Verificar si existe en productos
            const productosQuery = await db.collection("Productos")
                .where("Categoria", "==", nombre)
                .get();
            
            if (!productosQuery.empty) {
                throw new Error('No se puede eliminar porque hay productos asociados');
            }
            
            // Eliminar de papelera permanentemente
            await db.collection("categoriasPapelera").doc(id).delete();
            
            Swal.fire({
                title: '¡Eliminada permanentemente!',
                text: `"${nombre}" ha sido eliminada permanentemente.`,
                icon: 'success',
                background: '#2d2d2d',
                color: '#ffffff',
                timer: 2000,
                showConfirmButton: false
            });
            
            // Recargar papelera
            cargarPapelera();
        }
        
    } catch (error) {
        console.error("Error eliminando categoría:", error);
        Swal.fire({
            title: 'Error',
            text: error.message || 'No se pudo eliminar la categoría.',
            icon: 'error',
            background: '#2d2d2d',
            color: '#ffffff'
        });
    }
}

// Restaurar todas las categorías
async function restaurarTodo() {
    try {
        if (appState.categoriasPapelera.length === 0) {
            Swal.fire({
                title: 'Papelera vacía',
                text: 'No hay categorías para restaurar.',
                icon: 'info',
                background: '#2d2d2d',
                color: '#ffffff'
            });
            return;
        }
        
        const result = await Swal.fire({
            title: '¿Restaurar todo?',
            html: `
                <p>Se restaurarán <strong>${appState.categoriasPapelera.length} categorías</strong>.</p>
                <p>Todas volverán a la lista de categorías activas.</p>
            `,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sí, restaurar todo',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#28a745',
            cancelButtonColor: '#6c757d',
            background: '#2d2d2d',
            color: '#ffffff'
        });
        
        if (result.isConfirmed) {
            Swal.fire({
                title: 'Restaurando todo...',
                html: `<p>Restaurando ${appState.categoriasPapelera.length} categorías...</p>
                       <div class="progress-container" style="margin-top: 15px;">
                           <div class="progress-bar" id="restoreProgress" style="width: 0%; height: 10px; background: #28a745; border-radius: 5px;"></div>
                       </div>`,
                allowOutsideClick: false,
                showConfirmButton: false,
                background: '#2d2d2d',
                color: '#ffffff'
            });
            
            let restauradas = 0;
            const total = appState.categoriasPapelera.length;
            
            for (const categoria of appState.categoriasPapelera) {
                try {
                    const papeleraRef = db.collection("categoriasPapelera").doc(categoria.id);
                    const categoriaDoc = await papeleraRef.get();
                    
                    if (categoriaDoc.exists) {
                        const categoriaData = categoriaDoc.data();
                        
                        // Remover metadata de eliminación
                        delete categoriaData.eliminado;
                        delete categoriaData.eliminadoPor;
                        delete categoriaData.idOriginal;
                        
                        // Agregar fecha de restauración
                        categoriaData.fechaRestauracion = new Date();
                        categoriaData.restauradoPor = 'Sistema';
                        
                        // Restaurar a categorías activas
                        await db.collection("categorias").doc(categoria.id).set(categoriaData);
                        
                        // Eliminar de papelera
                        await papeleraRef.delete();
                    }
                    
                    restauradas++;
                    const porcentaje = Math.round((restauradas / total) * 100);
                    document.getElementById('restoreProgress').style.width = porcentaje + '%';
                    
                } catch (error) {
                    console.error(`Error restaurando categoría ${categoria.id}:`, error);
                }
            }
            
            Swal.fire({
                title: '¡Restauración completada!',
                html: `<p>Se restauraron <strong>${restauradas} de ${total}</strong> categorías.</p>`,
                icon: 'success',
                background: '#2d2d2d',
                color: '#ffffff',
                timer: 3000,
                showConfirmButton: false
            });
            
            // Recargar papelera
            setTimeout(() => cargarPapelera(), 1000);
        }
        
    } catch (error) {
        console.error("Error restaurando todo:", error);
        Swal.fire({
            title: 'Error',
            text: 'No se pudo restaurar todo.',
            icon: 'error',
            background: '#2d2d2d',
            color: '#ffffff'
        });
    }
}

// Eliminar todo permanentemente
async function eliminarTodoPermanente() {
    try {
        if (appState.categoriasPapelera.length === 0) {
            Swal.fire({
                title: 'Papelera vacía',
                text: 'No hay categorías para eliminar.',
                icon: 'info',
                background: '#2d2d2d',
                color: '#ffffff'
            });
            return;
        }
        
        const result = await Swal.fire({
            title: '¿Eliminar todo permanentemente?',
            html: `
                <p>Se eliminarán permanentemente <strong>${appState.categoriasPapelera.length} categorías</strong>.</p>
                <p><span style="color: #dc3545; font-weight: bold;">¡Esta acción no se puede deshacer!</span></p>
                <p>Todos los datos serán eliminados definitivamente.</p>
            `,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, eliminar todo',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#dc3545',
            cancelButtonColor: '#6c757d',
            background: '#2d2d2d',
            color: '#ffffff'
        });
        
        if (result.isConfirmed) {
            Swal.fire({
                title: 'Eliminando todo...',
                html: `<p>Eliminando ${appState.categoriasPapelera.length} categorías...</p>
                       <div class="progress-container" style="margin-top: 15px;">
                           <div class="progress-bar" id="deleteProgress" style="width: 0%; height: 10px; background: #dc3545; border-radius: 5px;"></div>
                       </div>`,
                allowOutsideClick: false,
                showConfirmButton: false,
                background: '#2d2d2d',
                color: '#ffffff'
            });
            
            let eliminadas = 0;
            const total = appState.categoriasPapelera.length;
            
            for (const categoria of appState.categoriasPapelera) {
                try {
                    // Verificar si hay productos asociados
                    const productosQuery = await db.collection("Productos")
                        .where("Categoria", "==", categoria.nombre)
                        .get();
                    
                    // Solo eliminar si no hay productos asociados
                    if (productosQuery.empty) {
                        await db.collection("categoriasPapelera").doc(categoria.id).delete();
                    }
                    
                    eliminadas++;
                    const porcentaje = Math.round((eliminadas / total) * 100);
                    document.getElementById('deleteProgress').style.width = porcentaje + '%';
                    
                } catch (error) {
                    console.error(`Error eliminando categoría ${categoria.id}:`, error);
                }
            }
            
            Swal.fire({
                title: '¡Eliminación completada!',
                html: `<p>Se eliminaron <strong>${eliminadas} de ${total}</strong> categorías.</p>`,
                icon: 'success',
                background: '#2d2d2d',
                color: '#ffffff',
                timer: 3000,
                showConfirmButton: false
            });
            
            // Recargar papelera
            setTimeout(() => cargarPapelera(), 1000);
        }
        
    } catch (error) {
        console.error("Error eliminando todo:", error);
        Swal.fire({
            title: 'Error',
            text: 'No se pudo eliminar todo.',
            icon: 'error',
            background: '#2d2d2d',
            color: '#ffffff'
        });
    }
}

// Función para ampliar imagen
function ampliarImagen(url, titulo, esBase64 = false) {
    Swal.fire({
        title: titulo,
        imageUrl: url,
        imageAlt: `Imagen de ${titulo}`,
        showCloseButton: true,
        showConfirmButton: false,
        background: '#2d2d2d',
        color: '#ffffff',
        imageWidth: esBase64 ? 400 : 'auto',
        imageHeight: esBase64 ? 400 : 'auto'
    });
}

// Función de seguridad para HTML
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Función para escapar Base64 para atributos HTML
function escapeBase64ForHtml(base64) {
    if (!base64) return '';
    return base64
        .replace(/'/g, "\\'")
        .replace(/"/g, '&quot;')
        .replace(/\n/g, '')
        .replace(/\r/g, '');
}

// Mostrar error
function mostrarError(mensaje) {
    const tablaContainer = document.getElementById("papelera-lista");
    const cardsContainer = document.getElementById("papelera-cards");
    
    const errorHTML = `
        <tr class="error-state">
            <td colspan="5">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Error</h3>
                <p>${mensaje}</p>
                <button onclick="cargarPapelera()" class="btn-accion" style="margin-top: 15px;">
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
                <button onclick="cargarPapelera()" class="btn-accion" style="margin-top: 15px;">
                    <i class="fas fa-redo"></i> Reintentar
                </button>
            </div>
        `;
    }
}

// Inicializar la aplicación
async function initApp() {
    console.log('🚀 Inicializando módulo de papelera de categorías...');
    
    const firebaseReady = await waitForFirebase();
    
    if (!firebaseReady) {
        return;
    }
    
    cargarPapelera();
    
    console.log('✅ Módulo de papelera inicializado correctamente');
}

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

// Hacer funciones disponibles globalmente
window.reloadPapelera = cargarPapelera;
window.restaurarCategoria = restaurarCategoria;
window.eliminarCategoriaPermanente = eliminarCategoriaPermanente;
window.ampliarImagen = ampliarImagen;