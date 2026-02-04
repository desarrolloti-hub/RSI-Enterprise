// Sistema de gestión de productos - Versión responsive
// productos.js

// Variables globales
let db;
const appState = {
    currentPage: 1,
    lastVisible: null,
    filterCategoria: 'todas',
    filterDescuento: 'todos',
    searchTerm: '',
    productos: [],
    categorias: [],
    currentImages: [],
    MAX_IMAGES: 3,
    itemsPerPage: 10,
    
    // Estadísticas
    totalProductos: 0,
    productosDescuento: 0,
    productosIndex: 0,
    productosConImagen: 0
};

// Esperar a que Firebase esté listo
function waitForFirebase() {
    return new Promise((resolve) => {
        if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
            db = firebase.firestore();
            console.log('✅ Firebase inicializado para productos');
            resolve(true);
        } else {
            const checkInterval = setInterval(() => {
                if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
                    clearInterval(checkInterval);
                    db = firebase.firestore();
                    console.log('✅ Firebase inicializado para productos (retardado)');
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

// Formatear precio
function formatearPrecio(precio) {
    return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN',
        minimumFractionDigits: 2
    }).format(precio || 0);
}

// Calcular precio final
function calcularPrecioFinal() {
    const precio = parseFloat(document.getElementById("precio").value) || 0;
    const descuento = parseFloat(document.getElementById("descuento").value) || 0;
    
    if (descuento < 0) {
        document.getElementById("descuento").value = 0;
        return calcularPrecioFinal();
    }
    if (descuento > 100) {
        document.getElementById("descuento").value = 100;
        return calcularPrecioFinal();
    }
    
    const precioFinal = precio * (1 - descuento/100);
    document.getElementById("precioFinal").value = precioFinal.toFixed(2);
}

// Cargar categorías
async function cargarCategorias() {
    try {
        const snapshot = await db.collection("categorias").get();
        appState.categorias = snapshot.docs.map(doc => doc.data().nombre);
        
        // Actualizar selects de categorías
        updateCategorySelects();
        
        console.log('✅ Categorías cargadas:', appState.categorias.length);
    } catch (error) {
        console.error("Error cargando categorías:", error);
        appState.categorias = ['CCTV', 'Alarma', 'Intrusión', 'Multimedia'];
        updateCategorySelects();
    }
}

// Actualizar selects de categorías
function updateCategorySelects() {
    const categorySelects = [
        document.getElementById('categoria'),
        document.getElementById('selectedCategory'),
        document.getElementById('filterCategoria')
    ];
    
    categorySelects.forEach(select => {
        if (select) {
            select.innerHTML = `
                <option value="todas">Todas las categorías</option>
                ${appState.categorias.map(categoria => 
                    `<option value="${categoria}">${categoria}</option>`
                ).join('')}
            `;
        }
    });
}

// Cargar estadísticas
async function cargarEstadisticas() {
    try {
        if (!appState.productos || appState.productos.length === 0) return;
        
        appState.totalProductos = appState.productos.length;
        appState.productosDescuento = appState.productos.filter(p => p.Descuento > 0).length;
        appState.productosConImagen = appState.productos.filter(p => 
            p.Imagenes && p.Imagenes.length > 0
        ).length;
        
        // Contar productos en índice
        try {
            const indexSnapshot = await db.collection("indexproductos").get();
            appState.productosIndex = indexSnapshot.size;
        } catch (error) {
            console.error("Error contando productos indexados:", error);
            appState.productosIndex = 0;
        }
        
        // Actualizar UI
        document.getElementById('totalProductos').textContent = appState.totalProductos;
        document.getElementById('productosDescuento').textContent = appState.productosDescuento;
        document.getElementById('productosIndex').textContent = appState.productosIndex;
        document.getElementById('productosConImagen').textContent = appState.productosConImagen;
        
    } catch (error) {
        console.error('Error cargando estadísticas:', error);
    }
}

// Cargar productos
async function cargarProductos(direction = 'next') {
    const tablaContainer = document.getElementById("productos-lista");
    
    if (!db) {
        mostrarError('Firebase no está inicializado. Recarga la página.');
        return;
    }
    
    // Mostrar loading
    const loadingHTML = `
        <tr class="loading-state">
            <td colspan="8">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Cargando productos...</p>
            </td>
        </tr>
    `;
    
    tablaContainer.innerHTML = loadingHTML;
    
    try {
        // Construir consulta base
        let queryRef = db.collection("Productos");
        
        // Aplicar filtros
        if (appState.filterCategoria !== 'todas') {
            queryRef = queryRef.where("Categoria", "==", appState.filterCategoria);
        }
        
        // Ordenar por nombre
        queryRef = queryRef.orderBy("Nombre Producto");
        
        // Aplicar paginación
        if (direction === 'next' && appState.lastVisible) {
            queryRef = queryRef.startAfter(appState.lastVisible);
        }
        
        // Limitar resultados
        queryRef = queryRef.limit(appState.itemsPerPage);
        
        const querySnapshot = await queryRef.get();
        
        if (querySnapshot.empty) {
            const emptyHTML = `
                <tr class="empty-state">
                    <td colspan="8">
                        <i class="fas fa-box"></i>
                        <h3>No hay productos</h3>
                        <p>No se han registrado productos todavía.</p>
                        <button onclick="showAddModal()" class="btn-action" style="margin-top: 15px;">
                            <i class="fas fa-plus"></i> Crear primer producto
                        </button>
                    </td>
                </tr>
            `;
            
            tablaContainer.innerHTML = emptyHTML;
            actualizarControlesPaginacion(0);
            return;
        }
        
        // Actualizar referencia para paginación
        appState.lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1];
        
        // Obtener productos indexados
        let productosIndexados = [];
        try {
            const indexSnapshot = await db.collection("indexproductos").get();
            productosIndexados = indexSnapshot.docs.map(doc => doc.data().productId);
        } catch (error) {
            console.error("Error obteniendo productos indexados:", error);
        }
        
        // Generar HTML para ambas vistas
        let tablaHTML = '';
        let cardsHTML = '';
        appState.productos = [];
        
        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const id = docSnap.id;
            
            appState.productos.push({ id, ...data });
            
            // Calcular precios
            const precioOriginal = parseFloat(data["Precio MXN"]) || 0;
            const descuento = parseFloat(data.Descuento) || 0;
            const precioFinal = descuento > 0 ? (precioOriginal * (1 - descuento/100)) : precioOriginal;
            
            // Verificar si está indexado
            const isIndexed = productosIndexados.includes(id);
            
            // HTML para TABLA (desktop)
            tablaHTML += `
                <tr data-id="${id}" class="${isIndexed ? 'indexed' : ''}">
                    <td>
                        <div class="producto-info-tabla">
                            <strong>${escapeHtml(data["Nombre Producto"] || 'Sin nombre')}</strong>
                            <br>
                            <small class="sku-tabla">SKU: ${escapeHtml(data.SKU || 'N/A')}</small>
                        </div>
                    </td>
                    <td>${escapeHtml(data.Categoria || 'Sin categoría')}</td>
                    <td class="image-indicator">
                        <span class="${data.Imagenes?.length ? 'has-images' : 'no-images'}">
                            ${data.Imagenes?.length || 0}
                        </span>
                    </td>
                    <td>
                        ${descuento > 0 ? 
                            `<span class="original-price">${formatearPrecio(precioOriginal)}</span>` : 
                            formatearPrecio(precioOriginal)
                        }
                    </td>
                    <td>
                        ${descuento > 0 ? 
                            `<span class="discount-badge">-${descuento}%</span>` : 
                            '0%'
                        }
                    </td>
                    <td class="final-price">
                        ${formatearPrecio(precioFinal)}
                    </td>
                    <td>${escapeHtml(data.Marca || 'Sin marca')}</td>
                    <td>
                        <div class="acciones-tabla">
                            <button class="btn-accion btn-accion-small btn-editar" 
                                    onclick="editarProducto('${id}')"
                                    title="Editar producto">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-accion btn-accion-small btn-eliminar" 
                                    onclick="eliminarProducto('${id}', '${escapeHtml(data["Nombre Producto"])}')"
                                    title="Eliminar producto">
                                <i class="fas fa-trash-alt"></i>
                            </button>
                            <button class="btn-accion btn-accion-small btn-index ${isIndexed ? 'indexed' : ''}" 
                                    onclick="toggleIndex('${id}', '${escapeHtml(data["Nombre Producto"])}')"
                                    title="${isIndexed ? 'Quitar del índice' : 'Agregar al índice'}">
                                <i class="fas fa-star"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
            
            // HTML para TARJETAS (móvil)
            cardsHTML += `
                <div class="producto-card ${isIndexed ? 'indexed' : ''}" data-id="${id}">
                    <div class="card-header-producto">
                        <div>
                            <h3 class="producto-nombre">${escapeHtml(data["Nombre Producto"] || 'Sin nombre')}</h3>
                            <span class="producto-sku">SKU: ${escapeHtml(data.SKU || 'N/A')}</span>
                            ${isIndexed ? '<div class="producto-index">★</div>' : ''}
                        </div>
                    </div>
                    
                    <div class="card-content-producto">
                        <div class="card-imagenes">
                            ${data.Imagenes?.length ? `
                                <div class="imagenes-slider">
                                    ${data.Imagenes.slice(0, 3).map((img, index) => `
                                        <img src="${img}" 
                                             class="imagen-miniatura" 
                                             alt="Imagen ${index + 1}"
                                             onclick="ampliarImagen('${img}', '${escapeHtml(data["Nombre Producto"])}')">
                                    `).join('')}
                                </div>
                            ` : '<div class="sin-imagenes">Sin imágenes</div>'}
                        </div>
                        
                        <div class="card-detalle">
                            <div class="detalle-item">
                                <span class="detalle-label">Categoría:</span>
                                <span class="detalle-value">${escapeHtml(data.Categoria || 'Sin categoría')}</span>
                            </div>
                            <div class="detalle-item">
                                <span class="detalle-label">Marca:</span>
                                <span class="detalle-value">${escapeHtml(data.Marca || 'Sin marca')}</span>
                            </div>
                            <div class="detalle-item">
                                <span class="detalle-label">Modelo:</span>
                                <span class="detalle-value">${escapeHtml(data.Modelo || 'Sin modelo')}</span>
                            </div>
                        </div>
                        
                        <div class="card-detalle">
                            <div class="detalle-item">
                                <span class="detalle-label">Precio:</span>
                                <span class="detalle-value">
                                    ${descuento > 0 ? 
                                        `<span style="text-decoration: line-through; color: #999; margin-right: 8px;">
                                            ${formatearPrecio(precioOriginal)}
                                        </span>` : 
                                        ''
                                    }
                                    <span class="precio-final">${formatearPrecio(precioFinal)}</span>
                                </span>
                            </div>
                            ${descuento > 0 ? `
                                <div class="detalle-item">
                                    <span class="detalle-label">Descuento:</span>
                                    <span class="detalle-value discount-badge">-${descuento}%</span>
                                </div>
                            ` : ''}
                            <div class="detalle-item">
                                <span class="detalle-label">Tipo:</span>
                                <span class="detalle-value">${escapeHtml(data.Tipo || 'Sin tipo')}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="card-footer-producto">
                        <div class="card-acciones">
                            <button class="btn-accion btn-accion-small btn-editar" 
                                    onclick="editarProducto('${id}')">
                                <i class="fas fa-edit"></i> Editar
                            </button>
                            <button class="btn-accion btn-accion-small btn-eliminar" 
                                    onclick="eliminarProducto('${id}', '${escapeHtml(data["Nombre Producto"])}')">
                                <i class="fas fa-trash-alt"></i> Eliminar
                            </button>
                            <button class="btn-accion btn-accion-small btn-index ${isIndexed ? 'indexed' : ''}" 
                                    onclick="toggleIndex('${id}', '${escapeHtml(data["Nombre Producto"])}')">
                                <i class="fas fa-star"></i> ${isIndexed ? 'En índice' : 'Indexar'}
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
        
        // Cargar estadísticas
        await cargarEstadisticas();
        
    } catch (error) {
        console.error("Error cargando productos:", error);
        mostrarError('Error al cargar productos: ' + error.message);
    }
}

// Crear contenedor de tarjetas dinámicamente
function crearContenedorTarjetas(cardsHTML) {
    let cardsContainer = document.getElementById("productos-cards");
    
    if (!cardsContainer) {
        cardsContainer = document.createElement('div');
        cardsContainer.id = 'productos-cards';
        cardsContainer.className = 'productos-cards-container';
        
        const tableContainer = document.querySelector('.productos-table-container');
        if (tableContainer) {
            tableContainer.parentNode.insertBefore(cardsContainer, tableContainer.nextSibling);
        }
    }
    
    cardsContainer.innerHTML = cardsHTML;
}

// Configurar filtros
function configurarFiltros() {
    const filterCategoria = document.getElementById('filterCategoria');
    const filterDescuento = document.getElementById('filterDescuento');
    const searchInput = document.getElementById('searchProducto');
    
    filterCategoria.addEventListener('change', (e) => {
        appState.filterCategoria = e.target.value;
        appState.currentPage = 1;
        appState.lastVisible = null;
        cargarProductos();
    });
    
    filterDescuento.addEventListener('change', (e) => {
        appState.filterDescuento = e.target.value;
        appState.currentPage = 1;
        appState.lastVisible = null;
        // La implementación real del filtro sería en el query
        console.log('Filtrar por descuento:', appState.filterDescuento);
    });
    
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            appState.searchTerm = e.target.value.trim();
            appState.currentPage = 1;
            appState.lastVisible = null;
            // La implementación real de búsqueda sería en el query
            console.log('Buscando:', appState.searchTerm);
        }, 500);
    });
}

// Configurar paginación
function configurarPaginacion() {
    document.getElementById('btnPaginaAnterior').addEventListener('click', () => {
        if (appState.currentPage > 1) {
            appState.currentPage--;
            appState.lastVisible = null;
            cargarProductos();
        }
    });
    
    document.getElementById('btnPaginaSiguiente').addEventListener('click', () => {
        appState.currentPage++;
        cargarProductos('next');
    });
}

// Actualizar controles de paginación
function actualizarControlesPaginacion(docsCargados) {
    const btnAnterior = document.getElementById('btnPaginaAnterior');
    const btnSiguiente = document.getElementById('btnPaginaSiguiente');
    const paginaActual = document.getElementById('paginaActual');
    
    paginaActual.textContent = `Página ${appState.currentPage}`;
    btnAnterior.disabled = appState.currentPage === 1;
    btnSiguiente.disabled = docsCargados < appState.itemsPerPage;
}

// Mostrar modal para nuevo producto
function showAddModal() {
    document.getElementById("productoForm").reset();
    document.getElementById("docId").value = '';
    document.getElementById("descuento").value = 0;
    document.getElementById("precioFinal").value = '';
    document.getElementById("applyDiscountTo").value = "single";
    document.getElementById("categorySelection").style.display = "none";
    appState.currentImages = [];
    updateImagePreviews();
    document.getElementById("productoModal").style.display = "block";
}

// Cerrar modal
function closeModal() {
    document.getElementById("productoModal").style.display = "none";
}

// Manejar imágenes
function handleImages(input) {
    const files = Array.from(input.files).slice(0, appState.MAX_IMAGES - appState.currentImages.length);
    
    files.forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            appState.currentImages = [...appState.currentImages, e.target.result];
            if(index === files.length - 1) updateImagePreviews();
        };
        reader.readAsDataURL(file);
    });
}

// Actualizar previsualización de imágenes
function updateImagePreviews() {
    const container = document.getElementById("imagePreviews");
    const uploadInfo = document.getElementById("uploadInfo");
    
    container.innerHTML = appState.currentImages
        .filter(img => img)
        .map((img, index) => `
            <div class="image-preview-item">
                <img src="${img}" class="preview-image">
                <button class="delete-image-btn" onclick="deleteImage(${index})">×</button>
            </div>
        `)
        .join('');
    
    uploadInfo.textContent = `${appState.currentImages.length}/${appState.MAX_IMAGES} imágenes`;
}

// Eliminar imagen
function deleteImage(index) {
    appState.currentImages = appState.currentImages.filter((_, i) => i !== index);
    updateImagePreviews();
}

// Alternar opciones de descuento
function toggleDiscountOptions() {
    const applyTo = document.getElementById("applyDiscountTo").value;
    const categorySelection = document.getElementById("categorySelection");
    
    if (applyTo === "category") {
        categorySelection.style.display = "block";
        document.getElementById('selectedCategory').value = document.getElementById('categoria').value;
    } else {
        categorySelection.style.display = "none";
    }
}

// Editar producto
async function editarProducto(id) {
    try {
        const doc = await db.collection("Productos").doc(id).get();
        if (!doc.exists) {
            Swal.fire('Error', 'El producto no existe', 'error');
            return;
        }
        
        const product = doc.data();
        
        // Llenar formulario
        document.getElementById("docId").value = id;
        document.getElementById("nombre").value = product["Nombre Producto"] || '';
        document.getElementById("precio").value = product["Precio MXN"] || '';
        document.getElementById("descuento").value = product.Descuento || 0;
        calcularPrecioFinal();
        document.getElementById("sku").value = product.SKU || '';
        document.getElementById("marca").value = product.Marca || '';
        document.getElementById("modelo").value = product.Modelo || '';
        document.getElementById("categoria").value = product.Categoria || '';
        document.getElementById("tipo").value = product.Tipo || '';
        document.getElementById("estructura").value = product.Estructura || '';
        document.getElementById("link").value = product["Link de producto"] || '';
        document.getElementById("especificaciones").value = product.Especificaciones || '';
        document.getElementById("applyDiscountTo").value = "single";
        document.getElementById("categorySelection").style.display = "none";
        
        appState.currentImages = product.Imagenes || [];
        updateImagePreviews();
        
        document.getElementById("productoModal").style.display = "block";
        
    } catch (error) {
        console.error("Error cargando producto:", error);
        Swal.fire('Error', 'No se pudo cargar el producto', 'error');
    }
}

// Guardar producto
async function saveProduct(e) {
    e.preventDefault();
    
    const applyTo = document.getElementById("applyDiscountTo").value;
    const discountValue = parseFloat(document.getElementById("descuento").value) || 0;
    const docId = document.getElementById("docId").value;
    
    // Preparar datos del producto
    const productData = {
        "Nombre Producto": document.getElementById("nombre").value,
        "Precio MXN": parseFloat(document.getElementById("precio").value),
        "Descuento": discountValue,
        "SKU": document.getElementById("sku").value,
        "Marca": document.getElementById("marca").value,
        "Modelo": document.getElementById("modelo").value,
        "Categoria": document.getElementById("categoria").value,
        "Tipo": document.getElementById("tipo").value,
        "Estructura": document.getElementById("estructura").value,
        "Link de producto": document.getElementById("link").value,
        "Especificaciones": document.getElementById("especificaciones").value,
        "Imagenes": appState.currentImages.filter(img => img),
        "timestamp": firebase.firestore.FieldValue.serverTimestamp()
    };
    
    try {
        let productRef;
        if (docId) {
            productRef = db.collection("Productos").doc(docId);
            await productRef.update(productData);
        } else {
            productRef = await db.collection("Productos").add(productData);
        }
        
        // Aplicar descuento a categoría si se seleccionó
        if (applyTo === "category" && discountValue > 0) {
            const selectedCategory = document.getElementById("selectedCategory").value;
            
            const { isConfirmed } = await Swal.fire({
                title: '¿Aplicar descuento a categoría?',
                html: `Se aplicará un descuento del ${discountValue}% a TODOS los productos de la categoría <strong>${selectedCategory}</strong>`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Aplicar',
                cancelButtonText: 'Solo este producto'
            });
            
            if (isConfirmed) {
                await Swal.fire({
                    title: 'Aplicando descuentos...',
                    html: 'Por favor espera',
                    allowOutsideClick: false,
                    didOpen: () => Swal.showLoading()
                });
                
                try {
                    // Excluir el producto actual
                    const querySnapshot = await db.collection("Productos")
                        .where("Categoria", "==", selectedCategory)
                        .where(firebase.firestore.FieldPath.documentId(), '!=', docId || productRef.id)
                        .get();
                    
                    const batch = db.batch();
                    querySnapshot.forEach(doc => {
                        batch.update(doc.ref, {
                            "Descuento": discountValue,
                            "timestamp": firebase.firestore.FieldValue.serverTimestamp()
                        });
                    });
                    
                    await batch.commit();
                    
                    Swal.close();
                    Swal.fire('Éxito', `Descuento aplicado a ${querySnapshot.size} productos`, 'success');
                } catch (error) {
                    console.error("Error aplicando descuento:", error);
                    Swal.close();
                    Swal.fire('Error', 'No se pudo aplicar el descuento a la categoría', 'error');
                }
            }
        }
        
        closeModal();
        await cargarProductos();
        
        Swal.fire('¡Guardado!', 'Producto guardado correctamente', 'success');
        
    } catch (error) {
        console.error("Error guardando producto:", error);
        Swal.fire('Error', 'No se pudo guardar el producto: ' + error.message, 'error');
    }
}

// Eliminar producto
async function eliminarProducto(id, nombre) {
    const { isConfirmed } = await Swal.fire({
        title: '¿Eliminar producto?',
        html: `¿Estás seguro de eliminar el producto <strong>"${nombre}"</strong>?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#dc3545'
    });
    
    if (isConfirmed) {
        try {
            await Swal.fire({
                title: 'Eliminando...',
                html: 'Por favor espera',
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading()
            });
            
            await db.collection("Productos").doc(id).delete();
            
            // También eliminar del índice si está ahí
            try {
                const indexQuery = await db.collection("indexproductos")
                    .where("productId", "==", id)
                    .get();
                
                const batch = db.batch();
                indexQuery.forEach(doc => {
                    batch.delete(doc.ref);
                });
                await batch.commit();
            } catch (error) {
                console.error("Error eliminando del índice:", error);
            }
            
            Swal.close();
            await cargarProductos();
            
            Swal.fire('Eliminado', 'Producto eliminado correctamente', 'success');
            
        } catch (error) {
            console.error("Error eliminando producto:", error);
            Swal.fire('Error', 'No se pudo eliminar el producto', 'error');
        }
    }
}

// Alternar producto en índice
async function toggleIndex(id, nombre) {
    try {
        // Verificar si ya está en el índice
        const indexQuery = await db.collection("indexproductos")
            .where("productId", "==", id)
            .get();
        
        const producto = appState.productos.find(p => p.id === id);
        
        if (!indexQuery.empty) {
            // Quitar del índice
            const { isConfirmed } = await Swal.fire({
                title: '¿Quitar del índice?',
                html: `¿Quitar <strong>"${nombre}"</strong> de los productos indexados?`,
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: 'Sí, quitar',
                cancelButtonText: 'Cancelar'
            });
            
            if (isConfirmed) {
                const batch = db.batch();
                indexQuery.forEach(doc => {
                    batch.delete(doc.ref);
                });
                await batch.commit();
                
                await cargarProductos();
                Swal.fire('Quitado', 'Producto quitado del índice', 'success');
            }
        } else {
            // Agregar al índice
            const { isConfirmed } = await Swal.fire({
                title: '¿Agregar al índice?',
                html: `¿Agregar <strong>"${nombre}"</strong> a los productos indexados?`,
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: 'Sí, agregar',
                cancelButtonText: 'Cancelar'
            });
            
            if (isConfirmed) {
                await db.collection("indexproductos").add({
                    productId: id,
                    nombre: producto["Nombre Producto"],
                    categoria: producto.Categoria,
                    precio: producto["Precio MXN"],
                    descuento: producto.Descuento,
                    imagenes: producto.Imagenes,
                    marca: producto.Marca,
                    modelo: producto.Modelo,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });
                
                await cargarProductos();
                Swal.fire('Agregado', 'Producto agregado al índice', 'success');
            }
        }
    } catch (error) {
        console.error("Error alternando índice:", error);
        Swal.fire('Error', 'No se pudo actualizar el índice', 'error');
    }
}

// Ampliar imagen
function ampliarImagen(url, titulo) {
    Swal.fire({
        title: titulo,
        imageUrl: url,
        imageAlt: `Imagen de ${titulo}`,
        showCloseButton: true,
        showConfirmButton: false,
        width: '80%',
        background: '#2d2d2d',
        color: '#ffffff'
    });
}

// Mostrar error
function mostrarError(mensaje) {
    const tablaContainer = document.getElementById("productos-lista");
    const cardsContainer = document.getElementById("productos-cards");
    
    const errorHTML = `
        <tr class="error-state">
            <td colspan="8">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Error</h3>
                <p>${mensaje}</p>
                <button onclick="cargarProductos()" class="btn-action" style="margin-top: 15px;">
                    <i class="fas fa-redo"></i> Reintentar
                </button>
            </td>
        </tr>
    `;
    
    if (tablaContainer) {
        tablaContainer.innerHTML = errorHTML;
    }
    
    if (cardsContainer) {
        cardsContainer.innerHTML = `
            <div class="error-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Error</h3>
                <p>${mensaje}</p>
                <button onclick="cargarProductos()" class="btn-action" style="margin-top: 15px;">
                    <i class="fas fa-redo"></i> Reintentar
                </button>
            </div>
        `;
    }
}

// Inicializar la aplicación
async function initApp() {
    console.log('🚀 Inicializando módulo de productos...');
    
    const firebaseReady = await waitForFirebase();
    
    if (!firebaseReady) {
        return;
    }
    
    // Configurar eventos
    configurarFiltros();
    configurarPaginacion();
    
    // Cargar datos
    await cargarCategorias();
    await cargarProductos();
    
    console.log('✅ Módulo de productos inicializado correctamente');
}

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

// Hacer funciones disponibles globalmente
window.showAddModal = showAddModal;
window.closeModal = closeModal;
window.calcularPrecioFinal = calcularPrecioFinal;
window.handleImages = handleImages;
window.deleteImage = deleteImage;
window.toggleDiscountOptions = toggleDiscountOptions;
window.editarProducto = editarProducto;
window.eliminarProducto = eliminarProducto;
window.toggleIndex = toggleIndex;
window.ampliarImagen = ampliarImagen;
window.cargarProductos = cargarProductos;