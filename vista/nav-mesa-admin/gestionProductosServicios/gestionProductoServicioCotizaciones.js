// gestionProductoServicioCotizaciones.js - Controlador/Vista SIN CLASE
import { db } from '/config/firebase-config.js';

// =================================================================================
// ESTADO DE LA APLICACIÓN
// =================================================================================
const appState = {
    productos: [],
    filteredProductos: [],
    categorias: [],
    editingProductoId: null,
    pagination: {
        currentPage: 1,
        itemsPerPage: 10,
        totalPages: 1
    },
    isLoading: false
};

// =================================================================================
// FUNCIONES DE VALIDACIÓN
// =================================================================================

function validateProducto(nombre, precioUnitario, categoriaId, imagen) {
    if (!nombre || nombre.trim() === '') {
        throw new Error('El nombre del producto/servicio es requerido');
    }
    
    if (nombre.length > 100) {
        throw new Error('El nombre del producto/servicio no puede exceder los 100 caracteres');
    }
    
    if (precioUnitario === undefined || precioUnitario === null) {
        throw new Error('El precio unitario es requerido');
    }
    
    if (typeof precioUnitario !== 'number' || isNaN(precioUnitario)) {
        throw new Error('El precio unitario debe ser un número válido');
    }
    
    if (precioUnitario < 0) {
        throw new Error('El precio unitario no puede ser negativo');
    }
    
    if (precioUnitario > 1000000000) {
        throw new Error('El precio unitario es demasiado alto');
    }
    
    if (!categoriaId || categoriaId.trim() === '') {
        throw new Error('La categoría es requerida');
    }
    
    if (imagen && imagen.length > 5000000) {
        throw new Error('La imagen es demasiado grande (máximo 5MB)');
    }
    
    return true;
}

// =================================================================================
// FUNCIONES DE FIREBASE (CRUD)
// =================================================================================

// Función para obtener nombres de categorías (reutilizable)
async function getCategoriaNombre(categoriaId) {
    try {
        const docRef = db.collection("categoriasProductoServicio").doc(categoriaId);
        const docSnap = await docRef.get();
        
        if (docSnap.exists) {
            return docSnap.data().nombreCategoria || 'Sin categoría';
        } else {
            return 'Sin categoría';
        }
    } catch (error) {
        console.error('Error al obtener nombre de categoría:', error);
        return 'Sin categoría';
    }
}

// Función para obtener todas las categorías
async function getAllCategorias() {
    try {
        const querySnapshot = await db.collection("categoriasProductoServicio")
            .orderBy("fechaCreacion", "desc")
            .get();
        
        const categories = [];
        querySnapshot.forEach((doc) => {
            categories.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        return {
            success: true,
            data: categories,
            message: 'Categorías obtenidas exitosamente',
            count: categories.length
        };
    } catch (error) {
        console.error('Error al obtener categorías:', error);
        return {
            success: false,
            error: error.message || 'Error al obtener las categorías',
            data: [],
            count: 0
        };
    }
}

// CREATE: Crear un nuevo producto/servicio
async function createProducto(nombre, precioUnitario, imagen = '', categoriaId) {
    try {
        validateProducto(nombre, precioUnitario, categoriaId, imagen);
        
        // Verificar que la categoría exista
        const categoriaRef = db.collection("categoriasProductoServicio").doc(categoriaId);
        const categoriaSnap = await categoriaRef.get();
        if (!categoriaSnap.exists) {
            throw new Error('La categoría seleccionada no existe');
        }
        
        const productData = {
            nombre: nombre.trim(),
            precioUnitario: Number(precioUnitario),
            imagen: imagen || null,
            categoriaId: categoriaId,
            fechaCreacion: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        const docRef = await db.collection("productosServiciosCotizaciones").add(productData);
        return {
            success: true,
            id: docRef.id,
            message: 'Producto/Servicio creado exitosamente'
        };
    } catch (error) {
        console.error('Error al crear producto/servicio:', error);
        return {
            success: false,
            error: error.message || 'Error al crear el producto/servicio'
        };
    }
}

// READ: Obtener todos los productos/servicios con nombres de categoría
async function getAllProductos() {
    try {
        // Obtener productos
        const querySnapshot = await db.collection("productosServiciosCotizaciones").get();
        
        const products = [];
        
        // Obtener todos los productos primero
        for (const doc of querySnapshot.docs) {
            const data = doc.data();
            const categoriaId = data.categoriaId || '';
            
            // Obtener nombre de la categoría
            const categoriaNombre = categoriaId ? await getCategoriaNombre(categoriaId) : 'Sin categoría';
            
            products.push({
                id: doc.id,
                ...data,
                precioUnitario: data.precioUnitario || 0,
                categoriaId: categoriaId,
                categoriaNombre: categoriaNombre
            });
        }
        
        // Ordenar por fecha de creación (manualmente)
        products.sort((a, b) => {
            const dateA = a.fechaCreacion ? (a.fechaCreacion.toDate ? a.fechaCreacion.toDate() : new Date(a.fechaCreacion)) : new Date(0);
            const dateB = b.fechaCreacion ? (b.fechaCreacion.toDate ? b.fechaCreacion.toDate() : new Date(b.fechaCreacion)) : new Date(0);
            return dateB - dateA; // Orden descendente
        });
        
        return {
            success: true,
            data: products,
            message: 'Productos/Servicios obtenidos exitosamente',
            count: products.length
        };
    } catch (error) {
        console.error('Error al obtener productos/servicios:', error);
        return {
            success: false,
            error: error.message || 'Error al obtener los productos/servicios',
            data: [],
            count: 0
        };
    }
}

// READ: Obtener un producto/servicio por ID con nombre de categoría
async function getProductoById(id) {
    try {
        const docRef = db.collection("productosServiciosCotizaciones").doc(id);
        const docSnap = await docRef.get();
        
        if (docSnap.exists) {
            const data = docSnap.data();
            const categoriaId = data.categoriaId || '';
            let categoriaNombre = 'Sin categoría';
            
            // Obtener nombre de la categoría
            if (categoriaId) {
                categoriaNombre = await getCategoriaNombre(categoriaId);
            }
            
            return {
                success: true,
                data: {
                    id: docSnap.id,
                    ...data,
                    precioUnitario: data.precioUnitario || 0,
                    categoriaId: categoriaId,
                    categoriaNombre: categoriaNombre
                },
                message: 'Producto/Servicio obtenido exitosamente'
            };
        } else {
            return {
                success: false,
                error: 'Producto/Servicio no encontrado'
            };
        }
    } catch (error) {
        console.error('Error al obtener producto/servicio:', error);
        return {
            success: false,
            error: error.message || 'Error al obtener el producto/servicio'
        };
    }
}

// UPDATE: Actualizar un producto/servicio existente
async function updateProducto(id, updatedData) {
    try {
        // Validar datos si se están actualizando
        if (updatedData.nombre !== undefined) {
            if (updatedData.nombre.trim() === '') {
                throw new Error('El nombre del producto/servicio es requerido');
            }
            
            if (updatedData.nombre.length > 1000) {
                throw new Error('El nombre del producto/servicio no puede exceder los 100 caracteres');
            }
        }
        
        if (updatedData.precioUnitario !== undefined) {
            const precio = Number(updatedData.precioUnitario);
            if (isNaN(precio)) {
                throw new Error('El precio unitario debe ser un número válido');
            }
            
            if (precio < 0) {
                throw new Error('El precio unitario no puede ser negativo');
            }
            
            if (precio > 1000000000) {
                throw new Error('El precio unitario es demasiado alto');
            }
            
            updatedData.precioUnitario = precio;
        }
        
        if (updatedData.categoriaId !== undefined) {
            if (updatedData.categoriaId.trim() === '') {
                throw new Error('La categoría es requerida');
            }
            
            // Verificar que la categoría exista
            const categoriaRef = db.collection("categoriasProductoServicio").doc(updatedData.categoriaId);
            const categoriaSnap = await categoriaRef.get();
            if (!categoriaSnap.exists) {
                throw new Error('La categoría seleccionada no existe');
            }
        }
        
        const productRef = db.collection("productosServiciosCotizaciones").doc(id);
        const dataToUpdate = {
            ...updatedData,
            fechaActualizacion: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        await productRef.update(dataToUpdate);
        
        return {
            success: true,
            message: 'Producto/Servicio actualizado exitosamente'
        };
    } catch (error) {
        console.error('Error al actualizar producto/servicio:', error);
        return {
            success: false,
            error: error.message || 'Error al actualizar el producto/servicio'
        };
    }
}

// DELETE: Eliminar un producto/servicio
async function deleteProductoById(id) {
    try {
        await db.collection("productosServiciosCotizaciones").doc(id).delete();
        
        return {
            success: true,
            message: 'Producto/Servicio eliminado exitosamente'
        };
    } catch (error) {
        console.error('Error al eliminar producto/servicio:', error);
        return {
            success: false,
            error: error.message || 'Error al eliminar el producto/servicio'
        };
    }
}

// Método para obtener productos por categoría
async function getProductosByCategoriaId(categoriaId) {
    try {
        const querySnapshot = await db.collection("productosServiciosCotizaciones")
            .where("categoriaId", "==", categoriaId)
            .get();
        
        const products = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            products.push({
                id: doc.id,
                ...data,
                precioUnitario: data.precioUnitario || 0
            });
        });
        
        return {
            success: true,
            data: products,
            message: 'Productos/Servicios obtenidos exitosamente',
            count: products.length
        };
    } catch (error) {
        console.error('Error al obtener productos por categoría:', error);
        return {
            success: false,
            error: error.message || 'Error al obtener productos por categoría',
            data: [],
            count: 0
        };
    }
}

// =================================================================================
// FUNCIONES PRINCIPALES DE LA INTERFAZ
// =================================================================================

async function initialLoad() {
    try {
        console.log('Iniciando carga de gestión de productos/servicios...');
        setupEventListeners();
        console.log('Event listeners configurados');
        await loadCategorias();
        await loadProductos();
        console.log('Productos/Servicios cargados');
    } catch (error) {
        console.error("Error en la carga inicial:", error);
        showError('No se pudieron cargar los datos iniciales. Verifica tu conexión o permisos.');
    }
}

async function loadCategorias() {
    try {
        const result = await getAllCategorias();
        
        if (result.success) {
            appState.categorias = result.data || [];
            console.log(`Se cargaron ${appState.categorias.length} categorías`);
        } else {
            console.warn('No se pudieron cargar las categorías:', result.error);
        }
    } catch (error) {
        console.error('Error al cargar categorías:', error);
    }
}

async function loadProductos() {
    if (appState.isLoading) return;
    
    appState.isLoading = true;
    showLoadingState(true);
    
    try {
        console.log('Solicitando productos/servicios...');
        const result = await getAllProductos();
        console.log('Respuesta recibida:', result);
        
        if (result.success) {
            appState.productos = result.data || [];
            appState.filteredProductos = [...appState.productos];
            console.log(`Se cargaron ${appState.productos.length} productos/servicios`);
            applySearchAndDisplay();
        } else {
            console.error('Error del servidor:', result.error);
            showError(result.error || 'Error al cargar productos/servicios');
        }
    } catch (error) {
        console.error('Error al cargar productos/servicios:', error);
        showError('No se pudieron cargar los productos/servicios. Verifica tu conexión.');
    } finally {
        appState.isLoading = false;
        showLoadingState(false);
    }
}

function showLoadingState(show) {
    const tbody = document.getElementById('productosTableBody');
    const mobileContainer = document.getElementById('mobileCardsContainer');
    
    if (show) {
        const loadingHtml = `
            <tr>
                <td colspan="6" class="loading">
                    <i class="fas fa-spinner fa-spin"></i>
                    <p>Cargando productos/servicios...</p>
                </td>
            </tr>
        `;
        
        if (tbody) tbody.innerHTML = loadingHtml;
        if (mobileContainer) mobileContainer.innerHTML = `
            <div class="loading">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Cargando productos/servicios...</p>
            </div>
        `;
    }
}

function applySearchAndDisplay() {
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase().trim() || '';
    
    if (searchTerm) {
        appState.filteredProductos = appState.productos.filter(producto => 
            producto.nombre && producto.nombre.toLowerCase().includes(searchTerm) ||
            producto.categoriaNombre && producto.categoriaNombre.toLowerCase().includes(searchTerm)
        );
    } else {
        appState.filteredProductos = [...appState.productos];
    }
    
    displayProductos();
}

function displayProductos() {
    const tbody = document.getElementById('productosTableBody');
    const mobileContainer = document.getElementById('mobileCardsContainer');
    const paginationContainer = document.querySelector('.pagination-container');
    
    if (!tbody || !mobileContainer) return;
    
    // Calcular paginación
    const startIndex = (appState.pagination.currentPage - 1) * appState.pagination.itemsPerPage;
    const endIndex = startIndex + appState.pagination.itemsPerPage;
    const currentItems = appState.filteredProductos.slice(startIndex, endIndex);
    appState.pagination.totalPages = Math.max(1, Math.ceil(appState.filteredProductos.length / appState.pagination.itemsPerPage));
    
    tbody.innerHTML = '';
    mobileContainer.innerHTML = '';
    
    if (!currentItems || currentItems.length === 0) {
        const emptyMessage = `
            <tr>
                <td colspan="6" class="empty-state">
                    <i class="fas fa-inbox"></i>
                    <h3>No hay productos/servicios para mostrar</h3>
                    <p>${document.getElementById('searchInput')?.value ? 
                        'Intenta ajustar los filtros de búsqueda' : 
                        'No se encontraron productos/servicios en el sistema'}</p>
                </td>
            </tr>
        `;
        tbody.innerHTML = emptyMessage;
        mobileContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-inbox"></i>
                <h3>No hay productos/servicios para mostrar</h3>
                <p>${document.getElementById('searchInput')?.value ? 
                    'Intenta ajustar los filtros de búsqueda' : 
                    'No se encontraron productos/servicios en el sistema'}</p>
            </div>
        `;
        
        if (paginationContainer) {
            paginationContainer.innerHTML = '';
        }
        return;
    }

    // Mostrar tabla para escritorio
    const rowsHtml = currentItems.map(producto => {
        const precio = producto.precioUnitario || 0;
        const nombre = producto.nombre || 'Sin nombre';
        const imagen = producto.imagen || '';
        const fecha = producto.fechaCreacion;
        const categoriaNombre = producto.categoriaNombre || 'Sin categoría';
        
        return `
            <tr>
                <td>
                    ${imagen ? 
                        `<img src="${imagen}" alt="${nombre}" 
                              class="table-image" onerror="this.src='../css/img/Logo-RSI-OFICIAL.png'">` : 
                        '<div class="table-image"><i class="fas fa-image"></i></div>'}
                </td>
                <td><strong>${nombre}</strong></td>
                <td class="price-value">$${formatCurrency(precio)}</td>
                <td><span class="category-badge">${categoriaNombre}</span></td>
                <td>${formatDate(fecha)}</td>
                <td>
                    <button class="action-btn edit" data-id="${producto.id}" title="Editar Producto/Servicio">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn delete" data-id="${producto.id}" title="Eliminar Producto/Servicio">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');

    tbody.innerHTML = rowsHtml;

    // Mostrar tarjetas para móvil
    const cardsHtml = currentItems.map(producto => {
        const precio = producto.precioUnitario || 0;
        const nombre = producto.nombre || 'Sin nombre';
        const imagen = producto.imagen || '';
        const fecha = producto.fechaCreacion;
        const categoriaNombre = producto.categoriaNombre || 'Sin categoría';
        
        return `
            <div class="producto-card">
                <div class="card-row">
                    <span class="card-label">Imagen:</span>
                    <span class="card-value">
                        ${imagen ? 
                            `<img src="${imagen}" alt="${nombre}" 
                                  class="card-image" onerror="this.src='../css/img/Logo-RSI-OFICIAL.png'">` : 
                            '<div class="card-image"><i class="fas fa-image"></i></div>'}
                    </span>
                </div>
                <div class="card-row">
                    <span class="card-label">Nombre:</span>
                    <span class="card-value"><strong>${nombre}</strong></span>
                </div>
                <div class="card-row">
                    <span class="card-label">Precio Unitario:</span>
                    <span class="card-value price-value">$${formatCurrency(precio)}</span>
                </div>
                <div class="card-row">
                    <span class="card-label">Categoría:</span>
                    <span class="card-value"><span class="category-badge">${categoriaNombre}</span></span>
                </div>
                <div class="card-row">
                    <span class="card-label">Fecha de Creación:</span>
                    <span class="card-value">${formatDate(fecha)}</span>
                </div>
                <div class="card-actions">
                    <button class="action-btn edit" data-id="${producto.id}" title="Editar Producto/Servicio">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn delete" data-id="${producto.id}" title="Eliminar Producto/Servicio">
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
        renderPagination();
    } else if (paginationContainer) {
        paginationContainer.innerHTML = '';
    }
}

function setupActionButtons() {
    // Configurar botones de editar
    document.querySelectorAll('.action-btn.edit').forEach(button => {
        button.addEventListener('click', (e) => {
            const productoId = e.currentTarget.getAttribute('data-id');
            if (productoId) {
                editProducto(productoId);
            }
        });
    });
    
    // Configurar botones de eliminar
    document.querySelectorAll('.action-btn.delete').forEach(button => {
        button.addEventListener('click', (e) => {
            const productoId = e.currentTarget.getAttribute('data-id');
            if (productoId) {
                deleteProducto(productoId);
            }
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
    displayProductos();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// =================================================================================
// FUNCIONES DE ACCIÓN - CRUD (CON SWEETALERT2)
// =================================================================================

async function openModalForNew() {
    appState.editingProductoId = null;
    await showProductoModal();
}

async function editProducto(productoId) {
    try {
        const result = await getProductoById(productoId);
        
        if (result.success) {
            const producto = result.data;
            appState.editingProductoId = productoId;
            await showProductoModal(producto);
        } else {
            showError(result.error || 'Error al cargar el producto/servicio');
        }
    } catch (error) {
        console.error('Error al cargar producto/servicio para editar:', error);
        showError('No se pudo cargar el producto/servicio para editar.');
    }
}

async function showProductoModal(producto = null) {
    const isEditing = !!producto;
    const title = isEditing ? 'Editar Producto/Servicio' : 'Nuevo Producto/Servicio';
    const productoId = producto?.id || '';
    const categoriaIdActual = producto?.categoriaId || '';
    
    // Generar opciones para el select de categorías
    let categoriasOptions = '<option value="">Seleccionar categoría</option>';
    if (appState.categorias.length > 0) {
        categoriasOptions += appState.categorias.map(cat => 
            `<option value="${cat.id}" ${cat.id === categoriaIdActual ? 'selected' : ''}>
                ${cat.nombreCategoria}
            </option>`
        ).join('');
    } else {
        categoriasOptions = '<option value="">No hay categorías disponibles</option>';
    }
    
    // Crear el formulario HTML para SweetAlert2
    const formHtml = `
        <form id="productoFormSwal" class="producto-form-swal">
            <input type="hidden" id="productoId" value="${productoId}">
            
            <div class="form-group-swal">
                <label for="nombre" class="form-label-swal">
                    <i class="fas fa-cube"></i> Nombre del Producto/Servicio *
                </label>
                <input type="text" id="nombre" class="form-input-swal" 
                       value="${producto?.nombre || ''}" required 
                       placeholder="Ej: Laptop Dell, Servicio de Mantenimiento, etc.">
            </div>
            
            <div class="form-group-swal">
                <label for="precioUnitario" class="form-label-swal">
                    <i class="fas fa-dollar-sign"></i> Precio Unitario *
                </label>
                <div class="price-input-swal">
                    <input type="number" id="precioUnitario" class="form-input-swal" 
                           value="${producto?.precioUnitario || ''}" required 
                           placeholder="0.00" min="0" max="1000000000" step="0.01">
                </div>
            </div>
            
            <div class="form-group-swal">
                <label for="categoriaId" class="form-label-swal">
                    <i class="fas fa-tag"></i> Categoría *
                </label>
                <select id="categoriaId" class="form-input-swal" required>
                    ${categoriasOptions}
                </select>
                <div style="margin-top: 5px; font-size: 0.85rem; color: var(--muted-text);">
                    <i class="fas fa-info-circle"></i> Selecciona una categoría existente
                    ${appState.categorias.length === 0 ? 
                        '<br><strong style="color: var(--warning-color);">No hay categorías. Primero crea una categoría.</strong>' : ''}
                </div>
            </div>
            
            <div class="form-group-swal">
                <label class="form-label-swal">
                    <i class="fas fa-image"></i> Imagen del Producto/Servicio
                </label>
                <div class="image-upload-container-swal">
                    <div class="image-preview-swal" id="imagePreviewSwal">
                        ${producto?.imagen ? 
                            `<img src="${producto.imagen}" alt="Vista previa" style="max-width: 100%; max-height: 150px; border-radius: 8px;">` : 
                            '<i class="fas fa-image" style="font-size: 3rem; color: var(--primary-color); opacity: 0.7;"></i><br><span style="color: var(--text-color);">Vista previa de la imagen</span>'}
                    </div>
                    <div class="image-upload-controls-swal" style="display: flex; gap: 10px; margin-top: 10px;">
                        <button type="button" class="btn-small-swal" id="openImageUploadBtn" style="flex: 1;">
                            <i class="fas fa-upload"></i> Subir Imagen
                        </button>
                        ${producto?.imagen ? 
                            '<button type="button" class="btn-small-swal btn-danger-swal" id="clearImageBtnSwal" style="flex: 1;">' +
                            '<i class="fas fa-trash"></i> Eliminar Imagen</button>' : 
                            '<button type="button" class="btn-small-swal btn-danger-swal" id="clearImageBtnSwal" style="flex: 1; display: none;">' +
                            '<i class="fas fa-trash"></i> Eliminar Imagen</button>'}
                    </div>
                    <input type="file" id="imagenInputSwal" accept="image/*" style="display: none;">
                    <textarea id="imagenBase64Swal" style="display: none;">${producto?.imagen || ''}</textarea>
                </div>
            </div>
        </form>
    `;

    const swalResult = await Swal.fire({
        title: `<h3 style="color: var(--primary-color); margin-bottom: 20px;">${title}</h3>`,
        html: formHtml,
        showCancelButton: true,
        confirmButtonText: isEditing ? 'Actualizar' : 'Crear',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: 'var(--primary-color)',
        cancelButtonColor: 'var(--danger-color)',
        width: 600,
        padding: '2em',
        customClass: {
            container: 'producto-swal-container',
            popup: 'producto-swal-popup',
            title: 'producto-swal-title',
            htmlContainer: 'producto-swal-html',
            confirmButton: 'producto-swal-confirm',
            cancelButton: 'producto-swal-cancel'
        },
        didOpen: () => {
            // Configurar eventos para el formulario dentro de SweetAlert
            const form = document.getElementById('productoFormSwal');
            const nombreInput = document.getElementById('nombre');
            const precioInput = document.getElementById('precioUnitario');
            const categoriaSelect = document.getElementById('categoriaId');
            const imagenInput = document.getElementById('imagenInputSwal');
            const imagenBase64 = document.getElementById('imagenBase64Swal');
            const imagePreview = document.getElementById('imagePreviewSwal');
            const openImageBtn = document.getElementById('openImageUploadBtn');
            const clearImageBtn = document.getElementById('clearImageBtnSwal');
            
            // Enfocar el input del nombre
            if (nombreInput) {
                nombreInput.focus();
            }
            
            // Evento para subir imagen
            if (openImageBtn) {
                openImageBtn.addEventListener('click', () => {
                    imagenInput.click();
                });
            }
            
            // Evento para cambiar imagen
            if (imagenInput) {
                imagenInput.addEventListener('change', handleImageUploadSwal);
            }
            
            // Evento para limpiar imagen
            if (clearImageBtn) {
                clearImageBtn.addEventListener('click', () => clearImageSwal());
            }
            
            // Evento para el formulario
            if (form) {
                form.addEventListener('submit', (e) => e.preventDefault());
            }
            
            // Si no hay categorías, deshabilitar el botón de crear
            if (appState.categorias.length === 0) {
                const confirmBtn = document.querySelector('.swal2-confirm');
                if (confirmBtn) {
                    confirmBtn.disabled = true;
                    confirmBtn.style.opacity = '0.5';
                    confirmBtn.title = 'Primero debe crear una categoría';
                }
            }
            
            // Función para manejar subida de imagen en SweetAlert
            function handleImageUploadSwal(event) {
                const file = event.target.files[0];
                if (!file) return;
                
                if (!file.type.startsWith('image/')) {
                    showError('Por favor, selecciona un archivo de imagen válido.');
                    return;
                }
                
                if (file.size > 5 * 1024 * 1024) {
                    showError('La imagen es demasiado grande. El tamaño máximo es 5MB.');
                    return;
                }
                
                const reader = new FileReader();
                
                reader.onload = function(e) {
                    const base64Image = e.target.result;
                    imagenBase64.value = base64Image;
                    
                    imagePreview.innerHTML = `<img src="${base64Image}" alt="Vista previa" style="max-width: 100%; max-height: 150px; border-radius: 8px;">`;
                    clearImageBtn.style.display = 'block';
                };
                
                reader.readAsDataURL(file);
            }
            
            // Función para limpiar imagen en SweetAlert
            function clearImageSwal() {
                Swal.fire({
                    title: '¿Eliminar imagen?',
                    text: 'Esta acción no se puede deshacer.',
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
                        imagenBase64.value = '';
                        imagenInput.value = '';
                        imagePreview.innerHTML = '<i class="fas fa-image" style="font-size: 3rem; color: var(--primary-color); opacity: 0.7;"></i><br><span style="color: var(--text-color);">Vista previa de la imagen</span>';
                        clearImageBtn.style.display = 'none';
                    }
                });
            }
        },
        preConfirm: async () => {
            const nombre = document.getElementById('nombre')?.value.trim();
            const precioUnitario = document.getElementById('precioUnitario')?.value;
            const categoriaId = document.getElementById('categoriaId')?.value;
            const imagen = document.getElementById('imagenBase64Swal')?.value.trim();
            const productoIdInput = document.getElementById('productoId')?.value;
            
            if (!nombre) {
                Swal.showValidationMessage('El nombre del producto/servicio es requerido');
                return false;
            }
            
            if (!precioUnitario || isNaN(precioUnitario) || Number(precioUnitario) < 0) {
                Swal.showValidationMessage('El precio unitario debe ser un número válido y no negativo');
                return false;
            }
            
            if (!categoriaId) {
                Swal.showValidationMessage('Debes seleccionar una categoría');
                return false;
            }
            
            try {
                // Validar datos
                validateProducto(nombre, Number(precioUnitario), categoriaId, imagen);
                
                const productoData = {
                    nombre: nombre,
                    precioUnitario: Number(precioUnitario),
                    imagen: imagen || null,
                    categoriaId: categoriaId
                };
                
                if (productoIdInput) {
                    // Actualizar producto/servicio existente
                    const result = await updateProducto(productoIdInput, productoData);
                    
                    if (result.success) {
                        return { success: true, message: 'Producto/Servicio actualizado exitosamente' };
                    } else {
                        Swal.showValidationMessage(result.error || 'Error al actualizar el producto/servicio');
                        return false;
                    }
                } else {
                    // Crear nuevo producto/servicio
                    const result = await createProducto(nombre, Number(precioUnitario), imagen, categoriaId);
                    
                    if (result.success) {
                        return { success: true, message: 'Producto/Servicio creado exitosamente' };
                    } else {
                        Swal.showValidationMessage(result.error || 'Error al crear el producto/servicio');
                        return false;
                    }
                }
            } catch (error) {
                console.error('Error al guardar producto/servicio:', error);
                Swal.showValidationMessage('No se pudo guardar el producto/servicio: ' + error.message);
                return false;
            }
        }
    });

    if (swalResult.isConfirmed && swalResult.value?.success) {
        await Swal.fire({
            title: '¡Éxito!',
            text: swalResult.value.message,
            icon: 'success',
            confirmButtonText: 'Aceptar',
            confirmButtonColor: 'var(--primary-color)',
            background: 'var(--card-bg)',
            color: 'var(--text-color)'
        });
        
        await loadProductos();
    }
}

async function deleteProducto(productoId) {
    try {
        const producto = appState.productos.find(p => p.id === productoId);
        if (!producto) return;
        
        const result = await Swal.fire({
            title: '¿Eliminar producto/servicio?',
            html: `¿Estás seguro de que deseas eliminar el producto/servicio<br><strong>"${producto.nombre}"</strong>?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: 'var(--primary-color)',
            cancelButtonColor: 'var(--danger-color)',
            background: 'var(--card-bg)',
            color: 'var(--text-color)',
            reverseButtons: true
        });

        if (result.isConfirmed) {
            const deleteResult = await deleteProductoById(productoId);
            
            if (deleteResult.success) {
                await Swal.fire({
                    title: '¡Eliminado!',
                    text: 'El producto/servicio ha sido eliminado exitosamente.',
                    icon: 'success',
                    confirmButtonText: 'Aceptar',
                    confirmButtonColor: 'var(--primary-color)',
                    background: 'var(--card-bg)',
                    color: 'var(--text-color)'
                });
                
                await loadProductos();
            } else {
                showError(deleteResult.error || 'Error al eliminar el producto/servicio');
            }
        }
    } catch (error) {
        console.error('Error al eliminar producto/servicio:', error);
        showError('No se pudo eliminar el producto/servicio.');
    }
}

// =================================================================================
// FUNCIONES AUXILIARES
// =================================================================================

const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    try {
        if (timestamp.toDate) {
            return timestamp.toDate().toLocaleDateString('es-MX', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        }
        if (typeof timestamp === 'string') {
            return new Date(timestamp).toLocaleDateString('es-MX', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        }
        if (timestamp instanceof Date) {
            return timestamp.toLocaleDateString('es-MX', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        }
        return 'Fecha inválida';
    } catch (error) {
        console.error('Error al formatear fecha:', error);
        return 'Fecha inválida';
    }
};

function formatCurrency(amount) {
    const num = parseFloat(amount);
    if (isNaN(num)) return '0.00';
    return num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
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
// CONFIGURACIÓN DE EVENTOS
// =================================================================================

function setupEventListeners() {
    // Evento de búsqueda
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            appState.pagination.currentPage = 1;
            applySearchAndDisplay();
        });
    }

    // Botón nuevo producto/servicio
    const btnNuevoProducto = document.getElementById('btnNuevoProducto');
    if (btnNuevoProducto) {
        btnNuevoProducto.addEventListener('click', openModalForNew);
    }

    // Botón para ir a gestión de categorías si no hay
    if (appState.categorias.length === 0) {
        setTimeout(() => {
            const buttonsRow = document.querySelector('.buttons-row');
            if (buttonsRow) {
                const btnCategorias = document.createElement('button');
                btnCategorias.className = 'btn btn-info';
                btnCategorias.innerHTML = '<i class="fas fa-tags"></i> Ir a Categorías';
                btnCategorias.addEventListener('click', () => {
                    window.location.href = '../gestionCategoriasCotizaciones/gestionCategoriasCotizaciones.html';
                });
                buttonsRow.appendChild(btnCategorias);
            }
        }, 1000);
    }
}

// =================================================================================
// INICIALIZACIÓN
// =================================================================================
document.addEventListener('DOMContentLoaded', initialLoad);