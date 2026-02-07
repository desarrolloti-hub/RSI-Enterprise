// Sistema de gestión de categorías - Versión responsive
// categorias.js - VERSIÓN CORREGIDA CON IMÁGENES VISIBLES

// Variables globales
let db;
const appState = {
    categorias: [],
    totalCategorias: 0,
    totalProductos: 0,
    totalPapelera: 0
};

// Tamaño máximo para imágenes en Base64 (aproximadamente 500KB)
const MAX_IMAGE_SIZE = 500 * 1024; // 500KB en bytes

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
                        <button id="btnCrearPrimeraCategoria" class="btn-nueva-categoria" style="margin-top: 15px;">
                            <i class="fas fa-plus"></i> Crear primera categoría
                        </button>
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
                        <button id="btnCrearPrimeraCategoria" class="btn-nueva-categoria" style="margin-top: 15px;">
                            <i class="fas fa-plus"></i> Crear primera categoría
                        </button>
                    </div>
                `;
            }
            
            // Configurar evento para el botón
            document.getElementById('btnCrearPrimeraCategoria')?.addEventListener('click', mostrarModalNuevaCategoria);
            return;
        }
        
        // Generar HTML para la tabla (desktop) y tarjetas (móvil)
        let tablaHTML = '';
        let cardsHTML = '';
        appState.categorias = [];
        
        // Primero, procesar todas las categorías
        const categoriasPromesas = [];
        
        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const id = docSnap.id;
            
            appState.categorias.push({ id, ...data });
            
            // Obtener imagen
            let imagenSrc = data.imagen || '';
            const tieneImagen = imagenSrc && imagenSrc.trim() !== '';
            
            // HTML SIMPLE Y DIRECTO para TABLA - ESTO SÍ MUESTRA LAS IMÁGENES
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
                                     class="imagen-tabla" 
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
                    <td class="col-acciones">
                        <div class="acciones-container">
                            <button class="btn-accion btn-editar" 
                                    data-id="${id}" 
                                    data-nombre="${escapeHtml(data.nombre)}" 
                                    data-imagen="${imagenSrc}" 
                                    title="Editar categoría">
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
                            <button class="btn-accion btn-accion-small btn-editar" 
                                    data-id="${id}" 
                                    data-nombre="${escapeHtml(data.nombre)}" 
                                    data-imagen="${imagenSrc}" 
                                    title="Editar">
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
                                <span>Creada: ${formatearFecha(data.fechaCreacion)}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="card-footer">
                        <span class="card-estado">
                            <i class="fas fa-circle" style="color: #28a745;"></i>
                            Activa
                        </span>
                    </div>
                </div>
            `;
        });
        
        // Actualizar ambos contenedores
        tablaContainer.innerHTML = tablaHTML;
        
        if (cardsContainer) {
            cardsContainer.innerHTML = cardsHTML;
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

// Mostrar modal para nueva categoría
async function mostrarModalNuevaCategoria() {
    let imagenBase64 = '';
    let imagenFile = null;
    
    // Crear input file oculto
    const inputFile = document.createElement('input');
    inputFile.type = 'file';
    inputFile.accept = 'image/*';
    inputFile.id = 'imagenUpload';
    inputFile.style.display = 'none';
    document.body.appendChild(inputFile);
    
    const { value: formValues } = await Swal.fire({
        title: 'Nueva Categoría',
        html: `
            <div style="text-align: left;">
                <div class="form-group" style="margin-bottom: 20px;">
                    <label for="nombre" style="display: block; margin-bottom: 8px; font-weight: 600; color: var(--text-color, #fff);">
                        <i class="fas fa-tag"></i> Nombre de la categoría *
                    </label>
                    <input type="text" id="nombre" class="swal2-input" 
                           placeholder="Colca la categoria" 
                           style="background: #3d3d3d; color: #fff; border: 1px solid #555;"
                           required>
                </div>
                
                <div class="form-group" style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 8px; font-weight: 600; color: var(--text-color, #fff);">
                        <i class="fas fa-image"></i> Imagen de la categoría
                    </label>
                    <div style="text-align: center;">
                        <div id="imagenPreview" style="margin-bottom: 15px;">
                            <div class="sin-imagen" style="display: inline-block; padding: 20px; background: rgba(108, 67, 224, 0.1); border-radius: 8px;">
                                <i class="fas fa-image" style="font-size: 2rem; color: #8B5FEB;"></i>
                                <p style="margin-top: 10px; color: #aaa;">No hay imagen seleccionada</p>
                            </div>
                        </div>
                        <div style="display: flex; gap: 10px; justify-content: center;">
                            <button type="button" id="btnSeleccionarImagen" class="btn-accion" 
                                    style="background: var(--accent-color, #8B5FEB); color: white; padding: 10px 20px;">
                                <i class="fas fa-upload"></i> Seleccionar Imagen
                            </button>
                            <button type="button" id="btnEliminarImagen" class="btn-accion" 
                                    style="background: #dc3545; color: white; padding: 10px 20px; display: none;">
                                <i class="fas fa-trash"></i> Quitar
                            </button>
                        </div>
                        <p style="margin-top: 10px; font-size: 0.85rem; color: #aaa;">
                            <i class="fas fa-info-circle"></i> Tamaño máximo: 500KB (Recomendado: 200x200px)
                        </p>
                    </div>
                </div>
            </div>
        `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'Guardar Categoría',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#6C43E0',
        cancelButtonColor: '#6c757d',
        width: '500px',
        background: '#2d2d2d',
        color: '#ffffff',
        customClass: {
            popup: 'modal-categoria',
            title: 'modal-title',
            htmlContainer: 'modal-content'
        },
        preConfirm: () => {
            const nombre = document.getElementById('nombre').value;
            
            if (!nombre.trim()) {
                Swal.showValidationMessage('El nombre de la categoría es obligatorio');
                return false;
            }
            
            return { nombre: nombre.trim(), imagenBase64, imagenFile };
        },
        didOpen: () => {
            // Configurar evento para seleccionar imagen
            document.getElementById('btnSeleccionarImagen').addEventListener('click', () => {
                inputFile.click();
            });
            
            // Configurar evento para eliminar imagen
            document.getElementById('btnEliminarImagen').addEventListener('click', () => {
                imagenBase64 = '';
                imagenFile = null;
                document.getElementById('imagenPreview').innerHTML = `
                    <div class="sin-imagen" style="display: inline-block; padding: 20px; background: rgba(108, 67, 224, 0.1); border-radius: 8px;">
                        <i class="fas fa-image" style="font-size: 2rem; color: #8B5FEB;"></i>
                        <p style="margin-top: 10px; color: #aaa;">No hay imagen seleccionada</p>
                    </div>
                `;
                document.getElementById('btnEliminarImagen').style.display = 'none';
                document.getElementById('btnSeleccionarImagen').style.display = 'flex';
            });
            
            // Configurar input file
            inputFile.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (file) {
                    if (!file.type.startsWith('image/')) {
                        Swal.showValidationMessage('Por favor selecciona una imagen válida (JPEG, PNG, etc.)');
                        return;
                    }
                    
                    if (file.size > MAX_IMAGE_SIZE) {
                        Swal.showValidationMessage(`La imagen es demasiado grande (${(file.size/1024).toFixed(0)}KB). Máximo permitido: 500KB`);
                        return;
                    }
                    
                    imagenFile = file;
                    
                    // Mostrar preview y convertir a Base64
                    const reader = new FileReader();
                    reader.onload = async (e) => {
                        const base64String = e.target.result;
                        
                        // Optimizar imagen si es muy grande
                        let imagenOptimizada = await optimizarImagenBase64(base64String, 200, 200);
                        imagenBase64 = imagenOptimizada;
                        
                        document.getElementById('imagenPreview').innerHTML = `
                            <div style="position: relative; display: inline-block;">
                                <img src="${imagenOptimizada}" 
                                     style="max-width: 200px; max-height: 200px; border-radius: 8px; border: 2px solid var(--primary-color, #6C43E0);">
                                <div style="position: absolute; top: 5px; right: 5px; background: rgba(0,0,0,0.7); border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; cursor: pointer;"
                                     onclick="document.getElementById('btnEliminarImagen').click()">
                                    <i class="fas fa-times" style="color: white; font-size: 14px;"></i>
                                </div>
                            </div>
                        `;
                        document.getElementById('btnEliminarImagen').style.display = 'flex';
                        document.getElementById('btnSeleccionarImagen').style.display = 'none';
                    };
                    reader.readAsDataURL(file);
                }
            });
        },
        willClose: () => {
            // Limpiar input file
            if (inputFile.parentNode) {
                inputFile.parentNode.removeChild(inputFile);
            }
        }
    });
    
    if (formValues) {
        await guardarNuevaCategoria(formValues);
    }
}

// Mostrar modal para editar categoría
async function mostrarModalEditarCategoria(categoriaId, nombre, imagenBase64) {
    let nuevaImagenBase64 = imagenBase64 || '';
    let imagenFile = null;
    
    // Crear input file oculto
    const inputFile = document.createElement('input');
    inputFile.type = 'file';
    inputFile.accept = 'image/*';
    inputFile.id = 'imagenUpload';
    inputFile.style.display = 'none';
    document.body.appendChild(inputFile);
    
    // Crear thumbnail para preview si es Base64 grande
    let imagenPreview = nuevaImagenBase64;
    
    const { value: formValues } = await Swal.fire({
        title: 'Editar Categoría',
        html: `
            <div style="text-align: left;">
                <div class="form-group" style="margin-bottom: 20px;">
                    <label for="editNombre" style="display: block; margin-bottom: 8px; font-weight: 600; color: var(--text-color, #fff);">
                        <i class="fas fa-tag"></i> Nombre de la categoría *
                    </label>
                    <input type="text" id="editNombre" class="swal2-input" 
                           value="${escapeHtml(nombre)}"
                           style="background: #3d3d3d; color: #fff; border: 1px solid #555;"
                           required>
                </div>
                
                <div class="form-group" style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 8px; font-weight: 600; color: var(--text-color, #fff);">
                        <i class="fas fa-image"></i> Imagen de la categoría
                    </label>
                    <div style="text-align: center;">
                        <div id="editImagenPreview" style="margin-bottom: 15px;">
                            ${nuevaImagenBase64 ? `
                                <div style="position: relative; display: inline-block;">
                                    <img src="${nuevaImagenBase64}" 
                                         style="max-width: 200px; max-height: 200px; border-radius: 8px; border: 2px solid var(--primary-color, #6C43E0);">
                                    <div style="position: absolute; top: 5px; right: 5px; background: rgba(0,0,0,0.7); border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; cursor: pointer;"
                                         onclick="document.getElementById('btnEditEliminarImagen').click()">
                                        <i class="fas fa-times" style="color: white; font-size: 14px;"></i>
                                    </div>
                                </div>
                            ` : `
                                <div class="sin-imagen" style="display: inline-block; padding: 20px; background: rgba(108, 67, 224, 0.1); border-radius: 8px;">
                                    <i class="fas fa-image" style="font-size: 2rem; color: #8B5FEB;"></i>
                                    <p style="margin-top: 10px; color: #aaa;">No hay imagen seleccionada</p>
                                </div>
                            `}
                        </div>
                        <div style="display: flex; gap: 10px; justify-content: center;">
                            <button type="button" id="btnEditSeleccionarImagen" class="btn-accion" 
                                    style="background: var(--accent-color, #8B5FEB); color: white; padding: 10px 20px;">
                                <i class="fas fa-upload"></i> ${nuevaImagenBase64 ? 'Cambiar Imagen' : 'Seleccionar Imagen'}
                            </button>
                            ${nuevaImagenBase64 ? `
                                <button type="button" id="btnEditEliminarImagen" class="btn-accion" 
                                        style="background: #dc3545; color: white; padding: 10px 20px;">
                                    <i class="fas fa-trash"></i> Quitar
                                </button>
                            ` : ''}
                        </div>
                        <p style="margin-top: 10px; font-size: 0.85rem; color: #aaa;">
                            <i class="fas fa-info-circle"></i> Tamaño máximo: 500KB (Recomendado: 200x200px)
                        </p>
                    </div>
                </div>
            </div>
        `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'Actualizar Categoría',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#6C43E0',
        cancelButtonColor: '#6c757d',
        width: '500px',
        background: '#2d2d2d',
        color: '#ffffff',
        customClass: {
            popup: 'modal-categoria',
            title: 'modal-title',
            htmlContainer: 'modal-content'
        },
        preConfirm: () => {
            const nombre = document.getElementById('editNombre').value;
            
            if (!nombre.trim()) {
                Swal.showValidationMessage('El nombre de la categoría es obligatorio');
                return false;
            }
            
            return { nombre: nombre.trim(), nuevaImagenBase64, imagenFile };
        },
        didOpen: () => {
            // Configurar evento para seleccionar imagen
            document.getElementById('btnEditSeleccionarImagen').addEventListener('click', () => {
                inputFile.click();
            });
            
            // Configurar evento para eliminar imagen
            if (nuevaImagenBase64) {
                document.getElementById('btnEditEliminarImagen').addEventListener('click', () => {
                    nuevaImagenBase64 = '';
                    imagenFile = null;
                    document.getElementById('editImagenPreview').innerHTML = `
                        <div class="sin-imagen" style="display: inline-block; padding: 20px; background: rgba(108, 67, 224, 0.1); border-radius: 8px;">
                            <i class="fas fa-image" style="font-size: 2rem; color: #8B5FEB;"></i>
                            <p style="margin-top: 10px; color: #aaa;">No hay imagen seleccionada</p>
                        </div>
                    `;
                    if (document.getElementById('btnEditEliminarImagen')) {
                        document.getElementById('btnEditEliminarImagen').style.display = 'none';
                    }
                    document.getElementById('btnEditSeleccionarImagen').textContent = 'Seleccionar Imagen';
                });
            }
            
            // Configurar input file
            inputFile.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (file) {
                    if (!file.type.startsWith('image/')) {
                        Swal.showValidationMessage('Por favor selecciona una imagen válida (JPEG, PNG, etc.)');
                        return;
                    }
                    
                    if (file.size > MAX_IMAGE_SIZE) {
                        Swal.showValidationMessage(`La imagen es demasiado grande (${(file.size/1024).toFixed(0)}KB). Máximo permitido: 500KB`);
                        return;
                    }
                    
                    imagenFile = file;
                    
                    // Mostrar preview y convertir a Base64
                    const reader = new FileReader();
                    reader.onload = async (e) => {
                        const base64String = e.target.result;
                        
                        // Optimizar imagen
                        let imagenOptimizada = await optimizarImagenBase64(base64String, 200, 200);
                        nuevaImagenBase64 = imagenOptimizada;
                        
                        document.getElementById('editImagenPreview').innerHTML = `
                            <div style="position: relative; display: inline-block;">
                                <img src="${imagenOptimizada}" 
                                     style="max-width: 200px; max-height: 200px; border-radius: 8px; border: 2px solid var(--primary-color, #6C43E0);">
                                <div style="position: absolute; top: 5px; right: 5px; background: rgba(0,0,0,0.7); border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; cursor: pointer;"
                                     onclick="document.getElementById('btnEditEliminarImagen').click()">
                                    <i class="fas fa-times" style="color: white; font-size: 14px;"></i>
                                </div>
                            </div>
                        `;
                        if (document.getElementById('btnEditEliminarImagen')) {
                            document.getElementById('btnEditEliminarImagen').style.display = 'flex';
                        }
                        document.getElementById('btnEditSeleccionarImagen').textContent = 'Cambiar Imagen';
                    };
                    reader.readAsDataURL(file);
                }
            });
        },
        willClose: () => {
            // Limpiar input file
            if (inputFile.parentNode) {
                inputFile.parentNode.removeChild(inputFile);
            }
        }
    });
    
    if (formValues) {
        await actualizarCategoria(categoriaId, formValues);
    }
}

// Guardar nueva categoría CON IMAGEN EN BASE64
async function guardarNuevaCategoria(data) {
    try {
        Swal.fire({
            title: 'Creando categoría...',
            text: 'Por favor espera',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            },
            background: '#2d2d2d',
            color: '#ffffff'
        });
        
        // Preparar datos para guardar
        const nuevaCategoria = {
            nombre: data.nombre,
            fechaCreacion: new Date(),
            activa: true
        };
        
        // Agregar imagen Base64 si existe
        if (data.imagenBase64) {
            // Optimizar aún más la imagen antes de guardar
            const imagenOptimizada = await optimizarImagenBase64(data.imagenBase64, 300, 300);
            nuevaCategoria.imagen = imagenOptimizada;
            nuevaCategoria.tieneImagen = true;
            nuevaCategoria.formatoImagen = 'base64';
        } else {
            nuevaCategoria.imagen = '';
            nuevaCategoria.tieneImagen = false;
        }
        
        // Guardar en Firestore
        await db.collection("categorias").add(nuevaCategoria);
        
        Swal.fire({
            title: '¡Categoría creada!',
            text: `"${data.nombre}" ha sido creada exitosamente`,
            icon: 'success',
            background: '#2d2d2d',
            color: '#ffffff',
            timer: 1500,
            showConfirmButton: false
        });
        
        // Recargar categorías
        await cargarCategorias();
        
    } catch (error) {
        console.error('Error guardando categoría:', error);
        Swal.fire({
            title: 'Error',
            text: 'No se pudo crear la categoría: ' + error.message,
            icon: 'error',
            background: '#2d2d2d',
            color: '#ffffff'
        });
    }
}

// Actualizar categoría existente CON IMAGEN EN BASE64
async function actualizarCategoria(categoriaId, data) {
    try {
        Swal.fire({
            title: 'Actualizando categoría...',
            text: 'Por favor espera',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            },
            background: '#2d2d2d',
            color: '#ffffff'
        });
        
        // Preparar datos para actualizar
        const categoriaActualizada = {
            nombre: data.nombre,
            fechaActualizacion: new Date()
        };
        
        // Agregar imagen Base64 si existe o eliminarla
        if (data.nuevaImagenBase64) {
            // Optimizar imagen antes de guardar
            const imagenOptimizada = await optimizarImagenBase64(data.nuevaImagenBase64, 300, 300);
            categoriaActualizada.imagen = imagenOptimizada;
            categoriaActualizada.tieneImagen = true;
            categoriaActualizada.formatoImagen = 'base64';
        } else if (data.nuevaImagenBase64 === '') {
            // Eliminar imagen
            categoriaActualizada.imagen = '';
            categoriaActualizada.tieneImagen = false;
        }
        
        // Actualizar en Firestore
        await db.collection("categorias").doc(categoriaId).update(categoriaActualizada);
        
        Swal.fire({
            title: '¡Categoría actualizada!',
            text: `"${data.nombre}" ha sido actualizada exitosamente`,
            icon: 'success',
            background: '#2d2d2d',
            color: '#ffffff',
            timer: 1500,
            showConfirmButton: false
        });
        
        // Recargar categorías
        await cargarCategorias();
        
    } catch (error) {
        console.error('Error actualizando categoría:', error);
        Swal.fire({
            title: 'Error',
            text: 'No se pudo actualizar la categoría: ' + error.message,
            icon: 'error',
            background: '#2d2d2d',
            color: '#ffffff'
        });
    }
}

// Optimizar imagen Base64 (reducir tamaño y dimensiones)
function optimizarImagenBase64(base64String, maxWidth = 300, maxHeight = 300) {
    return new Promise((resolve) => {
        // Si la imagen ya es pequeña, devolverla tal cual
        if (!base64String || base64String.length < 20000) {
            resolve(base64String);
            return;
        }
        
        const img = new Image();
        img.src = base64String;
        
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            
            // Calcular nuevas dimensiones manteniendo proporción
            if (width > height) {
                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }
            } else {
                if (height > maxHeight) {
                    width = Math.round((width * maxHeight) / height);
                    height = maxHeight;
                }
            }
            
            canvas.width = width;
            canvas.height = height;
            
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            
            // Comprimir a JPEG con 80% de calidad
            const optimizedBase64 = canvas.toDataURL('image/jpeg', 0.8);
            resolve(optimizedBase64);
        };
        
        img.onerror = () => {
            // Si falla la optimización, devolver la original
            console.warn('Error al optimizar imagen, usando original');
            resolve(base64String);
        };
    });
}

// Crear thumbnail de imagen Base64 (para tabla)
function crearThumbnailBase64(base64String) {
    return new Promise((resolve) => {
        if (!base64String || base64String.length < 50000) {
            resolve(base64String);
            return;
        }
        
        try {
            const img = new Image();
            img.src = base64String;
            
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                
                // Thumbnail para tabla: 60x60 máximo
                const maxSize = 60;
                
                if (width > height) {
                    if (width > maxSize) {
                        height = Math.round((height * maxSize) / width);
                        width = maxSize;
                    }
                } else {
                    if (height > maxSize) {
                        width = Math.round((width * maxSize) / height);
                        height = maxSize;
                    }
                }
                
                canvas.width = width;
                canvas.height = height;
                
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                const thumbnailBase64 = canvas.toDataURL('image/jpeg', 0.7);
                resolve(thumbnailBase64);
            };
            
            img.onerror = () => {
                resolve(base64String);
            };
        } catch (error) {
            resolve(base64String);
        }
    });
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
    // Evento para nueva categoría (botón principal)
    document.getElementById('btnNuevaCategoria')?.addEventListener('click', mostrarModalNuevaCategoria);
    
    // Eventos para editar (tabla y tarjetas)
    document.querySelectorAll('.btn-editar').forEach(button => {
        button.addEventListener('click', (e) => {
            const id = e.currentTarget.dataset.id;
            const nombre = e.currentTarget.dataset.nombre;
            const imagen = e.currentTarget.dataset.imagen;
            
            mostrarModalEditarCategoria(id, nombre, imagen);
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
window.mostrarModalNuevaCategoria = mostrarModalNuevaCategoria;
window.mostrarModalEditarCategoria = mostrarModalEditarCategoria;