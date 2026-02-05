// nuevo-producto.js - VERSIÓN SIMPLIFICADA QUE FUNCIONA

// Variables globales
let db, storage;
const appState = {
    productoId: null,
    esNuevoProducto: true,
    productoData: null,
    categorias: [],
    imagenesCargadas: [],
    estaIndexado: false,
    estaCargando: false
};

// Inicializar Firebase
function inicializarFirebase() {
    return new Promise((resolve) => {
        if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
            db = firebase.firestore();
            storage = firebase.storage();
            console.log('✅ Firebase inicializado');
            resolve(true);
        } else {
            const check = setInterval(() => {
                if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
                    clearInterval(check);
                    db = firebase.firestore();
                    storage = firebase.storage();
                    console.log('✅ Firebase inicializado (retardado)');
                    resolve(true);
                }
            }, 100);
            
            setTimeout(() => {
                clearInterval(check);
                console.error('❌ Firebase no se cargó');
                mostrarError('Firebase no se pudo inicializar.');
                resolve(false);
            }, 10000);
        }
    });
}

// Obtener parámetros de la URL
function obtenerParametrosURL() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    return { id };
}

// Mostrar/ocultar estado
function mostrarEstado(tipo, mensaje) {
    const estado = document.getElementById('estadoOperacion');
    const icono = document.getElementById('estadoIcono');
    const texto = document.getElementById('estadoMensaje');
    
    if (!estado || !icono || !texto) return;
    
    estado.className = `estado-operacion ${tipo}`;
    texto.textContent = mensaje;
    
    switch(tipo) {
        case 'loading':
            icono.className = 'fas fa-spinner fa-spin';
            break;
        case 'success':
            icono.className = 'fas fa-check-circle';
            break;
        case 'error':
            icono.className = 'fas fa-exclamation-triangle';
            break;
    }
    
    estado.classList.add('visible');
}

function ocultarEstado() {
    const estado = document.getElementById('estadoOperacion');
    if (estado) estado.classList.remove('visible');
}

// Cargar categorías
async function cargarCategorias() {
    try {
        const snapshot = await db.collection("categorias").orderBy("nombre").get();
        appState.categorias = snapshot.docs.map(doc => doc.data().nombre);
        
        const selects = [
            document.getElementById('categoria'),
            document.getElementById('selectedCategory')
        ];
        
        selects.forEach(select => {
            if (select) {
                select.innerHTML = `
                    <option value="">Seleccionar categoría...</option>
                    ${appState.categorias.map(cat => 
                        `<option value="${cat}">${cat}</option>`
                    ).join('')}
                `;
            }
        });
        
        return true;
    } catch (error) {
        console.error("Error cargando categorías:", error);
        return false;
    }
}

// Cargar producto por ID
async function cargarProducto(id) {
    try {
        mostrarEstado('loading', 'Cargando producto...');
        
        const doc = await db.collection("Productos").doc(id).get();
        
        if (!doc.exists) {
            throw new Error('Producto no encontrado');
        }
        
        appState.productoData = { 
            id: doc.id, 
            ...doc.data(),
            Imagenes: doc.data().Imagenes || []
        };
        appState.productoId = id;
        appState.esNuevoProducto = false;
        
        // Verificar indexación
        try {
            const indexDoc = await db.collection("indexproductos").doc(id).get();
            appState.estaIndexado = indexDoc.exists;
        } catch (e) {
            appState.estaIndexado = false;
        }
        
        // Llenar formulario
        llenarFormulario();
        
        // Mostrar UI
        document.getElementById('accionesRapidas').style.display = 'flex';
        document.getElementById('vistasPrevia').style.display = 'block';
        document.getElementById('tituloModulo').innerHTML = `
            <i class="fas fa-edit"></i>
            <span>Editar Producto</span>
        `;
        document.getElementById('subtituloModulo').textContent = 'Modifica los campos necesarios';
        document.getElementById('btnGuardarTexto').textContent = 'Actualizar Producto';
        
        ocultarEstado();
        
    } catch (error) {
        console.error("Error cargando producto:", error);
        mostrarError(`Error: ${error.message}`);
        setTimeout(() => {
            window.location.href = '/vista/nav-mesa-admin/e-comerce/products/productos.html';
        }, 3000);
    }
}

// Llenar formulario
function llenarFormulario() {
    const data = appState.productoData;
    
    document.getElementById('productoId').value = data.id;
    document.getElementById('nombre').value = data["Nombre Producto"] || '';
    document.getElementById('sku').value = data.SKU || '';
    document.getElementById('categoria').value = data.Categoria || '';
    document.getElementById('marca').value = data.Marca || '';
    document.getElementById('modelo').value = data.Modelo || '';
    document.getElementById('tipo').value = data.Tipo || '';
    document.getElementById('precio').value = data["Precio MXN"] || 0;
    document.getElementById('descuento').value = data.Descuento || 0;
    document.getElementById('estructura').value = data.Estructura || '';
    document.getElementById('resolucion').value = data.Resolucion || '';
    document.getElementById('conectividad').value = data.Conectividad || '';
    document.getElementById('link').value = data.Link || '';
    document.getElementById('especificaciones').value = data.Especificaciones || '';
    
    // Mostrar ID
    const idDisplay = document.getElementById('productoIdDisplay');
    if (idDisplay) {
        idDisplay.innerHTML = `<i class="fas fa-fingerprint id-icon"></i> ID: ${data.id}`;
    }
    
    // Actualizar botón de index
    const btnIndex = document.getElementById('btnToggleIndex');
    if (btnIndex) {
        if (appState.estaIndexado) {
            btnIndex.innerHTML = '<i class="fas fa-star"></i> <span>Quitar del índice</span>';
            btnIndex.className = 'btn-action btn-index active';
        } else {
            btnIndex.innerHTML = '<i class="far fa-star"></i> <span>Agregar al índice</span>';
            btnIndex.className = 'btn-action btn-index';
        }
        btnIndex.disabled = false;
    }
    
    // Habilitar botón eliminar
    const btnEliminar = document.getElementById('btnEliminar');
    if (btnEliminar) btnEliminar.disabled = false;
    
    calcularPrecioFinal();
}

// Calcular precio final
function calcularPrecioFinal() {
    const precio = parseFloat(document.getElementById("precio").value) || 0;
    const descuento = parseFloat(document.getElementById("descuento").value) || 0;
    
    if (descuento < 0) document.getElementById("descuento").value = 0;
    if (descuento > 100) document.getElementById("descuento").value = 100;
    
    const precioFinal = precio * (1 - descuento/100);
    document.getElementById("precioFinalDisplay").textContent = `$${precioFinal.toFixed(2)} MXN`;
}

// ============================================
// FUNCIÓN PRINCIPAL DE GUARDADO - SIMPLIFICADA
// ============================================
async function guardarProducto(event) {
    event.preventDefault();
    
    if (appState.estaCargando) return;
    
    try {
        appState.estaCargando = true;
        mostrarEstado('loading', 'Guardando producto...');
        
        // Validar formulario básico
        const nombre = document.getElementById('nombre').value.trim();
        const sku = document.getElementById('sku').value.trim();
        const categoria = document.getElementById('categoria').value;
        const precio = parseFloat(document.getElementById('precio').value);
        
        if (!nombre || !sku || !categoria || precio <= 0) {
            throw new Error('Por favor completa todos los campos requeridos');
        }
        
        // Preparar datos del producto
        const datosProducto = {
            "Nombre Producto": nombre,
            "SKU": sku,
            "Categoria": categoria,
            "Precio MXN": precio,
            "Descuento": parseFloat(document.getElementById('descuento').value) || 0,
            "Precio Final": precio * (1 - (parseFloat(document.getElementById('descuento').value) || 0)/100),
            "Marca": document.getElementById('marca').value.trim(),
            "Modelo": document.getElementById('modelo').value.trim(),
            "Tipo": document.getElementById('tipo').value.trim(),
            "Estructura": document.getElementById('estructura').value.trim(),
            "Resolucion": document.getElementById('resolucion').value.trim(),
            "Conectividad": document.getElementById('conectividad').value.trim(),
            "Link": document.getElementById('link').value.trim(),
            "Especificaciones": document.getElementById('especificaciones').value.trim(),
            "Fecha Actualizacion": firebase.firestore.FieldValue.serverTimestamp()
        };
        
        console.log('📦 Datos a guardar:', datosProducto);
        
        // Guardar en Firestore
        let productoId;
        
        if (appState.esNuevoProducto) {
            // Crear nuevo producto
            datosProducto.FechaCreacion = firebase.firestore.FieldValue.serverTimestamp();
            datosProducto.Imagenes = []; // Array vacío por ahora
            
            const docRef = await db.collection("Productos").add(datosProducto);
            productoId = docRef.id;
            appState.productoId = productoId;
            
            console.log('✅ Producto creado con ID:', productoId);
            
            // Mostrar ID
            const idDisplay = document.getElementById('productoIdDisplay');
            if (idDisplay) {
                idDisplay.innerHTML = `<i class="fas fa-fingerprint id-icon"></i> ID: ${productoId}`;
            }
            
            // Mostrar acciones rápidas
            document.getElementById('accionesRapidas').style.display = 'flex';
            
        } else {
            // Actualizar producto existente
            await db.collection("Productos").doc(appState.productoId).update(datosProducto);
            productoId = appState.productoId;
            console.log('✅ Producto actualizado:', productoId);
        }
        
        // Mostrar éxito
        mostrarEstado('success', appState.esNuevoProducto ? 
            '✅ Producto creado exitosamente!' : '✅ Producto actualizado exitosamente!');
        
        // Si es nuevo, cambiar UI
        if (appState.esNuevoProducto) {
            appState.esNuevoProducto = false;
            document.getElementById('btnGuardarTexto').textContent = 'Actualizar Producto';
            
            // Preguntar si quiere indexar
            setTimeout(() => {
                Swal.fire({
                    title: '¡Éxito!',
                    html: `
                        <p>Producto guardado correctamente.</p>
                        <p><strong>ID:</strong> ${productoId}</p>
                        <p>¿Deseas agregarlo al índice?</p>
                    `,
                    icon: 'success',
                    showCancelButton: true,
                    confirmButtonText: 'Sí, indexar',
                    cancelButtonText: 'No, gracias',
                    confirmButtonColor: '#ffd700'
                }).then((result) => {
                    if (result.isConfirmed) {
                        toggleIndexacion();
                    }
                });
            }, 1000);
        }
        
        // Redirigir después de 3 segundos
        setTimeout(() => {
            window.location.href = '/vista/nav-mesa-admin/e-comerce/products/productos.html';
        }, 3000);
        
    } catch (error) {
        console.error("❌ Error guardando producto:", error);
        mostrarEstado('error', `Error: ${error.message}`);
        appState.estaCargando = false;
        
        Swal.fire({
            title: 'Error',
            text: error.message,
            icon: 'error',
            confirmButtonColor: '#6C43E0'
        });
    }
}

// Toggle indexación
async function toggleIndexacion() {
    if (!appState.productoId) {
        mostrarError('Primero guarda el producto');
        return;
    }
    
    try {
        const productoNombre = document.getElementById('nombre').value.trim();
        const categoria = document.getElementById('categoria').value;
        const precio = parseFloat(document.getElementById('precio').value) || 0;
        const descuento = parseFloat(document.getElementById('descuento').value) || 0;
        const marca = document.getElementById('marca').value.trim();
        
        if (appState.estaIndexado) {
            // Quitar del índice
            await db.collection("indexproductos").doc(appState.productoId).delete();
            appState.estaIndexado = false;
            
            Swal.fire({
                title: 'Índice actualizado',
                text: 'Producto quitado del índice',
                icon: 'success',
                confirmButtonColor: '#6C43E0',
                timer: 2000
            });
            
            // Actualizar botón
            const btnIndex = document.getElementById('btnToggleIndex');
            if (btnIndex) {
                btnIndex.innerHTML = '<i class="far fa-star"></i> <span>Agregar al índice</span>';
                btnIndex.className = 'btn-action btn-index';
            }
            
        } else {
            // Agregar al índice
            await db.collection("indexproductos").doc(appState.productoId).set({
                productId: appState.productoId,
                productoNombre: productoNombre,
                categoria: categoria,
                precio: precio,
                descuento: descuento,
                marca: marca,
                fechaIndexacion: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            appState.estaIndexado = true;
            
            Swal.fire({
                title: '¡Indexado!',
                html: `
                    <p>Producto agregado al índice</p>
                    <p><strong>ID:</strong> ${appState.productoId}</p>
                `,
                icon: 'success',
                confirmButtonColor: '#ffd700',
                timer: 3000
            });
            
            // Actualizar botón
            const btnIndex = document.getElementById('btnToggleIndex');
            if (btnIndex) {
                btnIndex.innerHTML = '<i class="fas fa-star"></i> <span>Quitar del índice</span>';
                btnIndex.className = 'btn-action btn-index active';
            }
        }
        
    } catch (error) {
        console.error("Error en indexación:", error);
        mostrarError(`Error: ${error.message}`);
    }
}

// Eliminar producto
async function eliminarProductoConfirmado() {
    if (!appState.productoId) return;
    
    try {
        mostrarEstado('loading', 'Eliminando producto...');
        
        // 1. Eliminar del índice si está indexado
        if (appState.estaIndexado) {
            await db.collection("indexproductos").doc(appState.productoId).delete();
        }
        
        // 2. Eliminar el producto
        await db.collection("Productos").doc(appState.productoId).delete();
        
        mostrarEstado('success', '✅ Producto eliminado');
        
        setTimeout(() => {
            window.location.href = '/vista/nav-mesa-admin/e-comerce/products/productos.html';
        }, 2000);
        
    } catch (error) {
        console.error("Error eliminando:", error);
        mostrarEstado('error', `Error: ${error.message}`);
    }
}

// Confirmar eliminación
function confirmarEliminacion() {
    const nombre = document.getElementById('nombre').value.trim() || 'este producto';
    
    Swal.fire({
        title: '¿Eliminar producto?',
        html: `
            <p>¿Estás seguro de eliminar <strong>"${nombre}"</strong>?</p>
            <p>Esta acción no se puede deshacer.</p>
        `,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#dc3545',
        cancelButtonColor: '#6C43E0'
    }).then((result) => {
        if (result.isConfirmed) {
            eliminarProductoConfirmado();
        }
    });
}

// Mostrar ID completo
function mostrarIdCompleto() {
    const id = appState.productoId;
    
    if (!id) {
        mostrarError('No hay ID disponible');
        return;
    }
    
    Swal.fire({
        title: 'ID del Producto',
        html: `
            <div style="text-align: left;">
                <p><strong>ID completo:</strong></p>
                <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 10px 0; word-break: break-all; font-family: monospace;">
                    ${id}
                </div>
            </div>
        `,
        icon: 'info',
        confirmButtonText: 'Cerrar',
        confirmButtonColor: '#6C43E0'
    });
}

// Copiar ID
function copiarIdAlPortapapeles() {
    const id = appState.productoId;
    
    if (!id) return;
    
    navigator.clipboard.writeText(id).then(() => {
        Swal.fire({
            title: '¡Copiado!',
            text: 'ID copiado al portapapeles',
            icon: 'success',
            timer: 1500
        });
    });
}

// Cancelar edición
function cancelarEdicion() {
    Swal.fire({
        title: '¿Cancelar?',
        text: 'Los cambios no guardados se perderán.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, cancelar',
        cancelButtonText: 'Continuar',
        confirmButtonColor: '#dc3545',
        cancelButtonColor: '#6C43E0'
    }).then((result) => {
        if (result.isConfirmed) {
            window.location.href = '/vista/nav-mesa-admin/e-comerce/products/productos.html';
        }
    });
}

// Mostrar error
function mostrarError(mensaje) {
    Swal.fire({
        title: 'Error',
        text: mensaje,
        icon: 'error',
        confirmButtonColor: '#6C43E0'
    });
}

// Manejar imágenes (simplificado)
function manejarImagenes(input) {
    if (!input.files) return;
    
    const archivos = Array.from(input.files);
    
    // Validar cantidad
    if (archivos.length > 3) {
        mostrarError('Máximo 3 imágenes');
        input.value = '';
        return;
    }
    
    // Mostrar previsualizaciones
    const contenedor = document.getElementById('imagePreviews');
    if (contenedor) {
        contenedor.innerHTML = '';
        
        archivos.forEach(archivo => {
            const reader = new FileReader();
            reader.onload = function(e) {
                const previewId = 'preview-' + Date.now();
                contenedor.innerHTML += `
                    <div class="image-preview-item" id="${previewId}">
                        <img src="${e.target.result}" class="preview-image" alt="Previsualización">
                        <button type="button" class="delete-image-btn" onclick="this.parentElement.remove()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                `;
            };
            reader.readAsDataURL(archivo);
        });
    }
    
    // Actualizar contador
    const uploadInfo = document.getElementById('uploadInfo');
    if (uploadInfo) {
        uploadInfo.textContent = `${archivos.length}/3 imágenes`;
    }
}

// Inicializar aplicación
async function inicializarApp() {
    console.log('🚀 Inicializando módulo de productos...');
    
    // Inicializar Firebase
    const firebaseListo = await inicializarFirebase();
    if (!firebaseListo) return;
    
    // Cargar categorías
    await cargarCategorias();
    
    // Obtener parámetros
    const { id } = obtenerParametrosURL();
    
    if (id) {
        // Modo edición
        await cargarProducto(id);
    } else {
        // Modo nuevo producto
        appState.esNuevoProducto = true;
        
        // Configurar eventos
        document.getElementById('precio').addEventListener('input', calcularPrecioFinal);
        document.getElementById('descuento').addEventListener('input', calcularPrecioFinal);
        
        // Mostrar vistas previas
        document.getElementById('vistasPrevia').style.display = 'block';
        
        console.log('✅ Listo para crear nuevo producto');
    }
}

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inicializarApp);
} else {
    inicializarApp();
}

// Hacer funciones disponibles globalmente
window.calcularPrecioFinal = calcularPrecioFinal;
window.manejarImagenes = manejarImagenes;
window.toggleIndexacion = toggleIndexacion;
window.mostrarIdCompleto = mostrarIdCompleto;
window.copiarIdAlPortapapeles = copiarIdAlPortapapeles;
window.confirmarEliminacion = confirmarEliminacion;
window.cancelarEdicion = cancelarEdicion;