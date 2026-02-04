// editar-cotizacion.js - Módulo para edición de cotización
import { 
    initializeApp 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { 
    getFirestore, collection, addDoc, doc, updateDoc, 
    getDocs, query, orderBy, setDoc, getDoc, where 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { 
    getAuth, onAuthStateChanged 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

// === CONFIGURACIÓN Y ESTADO ===
const firebaseConfig = {
    apiKey: "AIzaSyBJy992gkvsT77-_fMp_O_z99wtjZiK77Y",
    authDomain: "rsienterprise.firebaseapp.com",
    projectId: "rsienterprise",
    storageBucket: "rsienterprise.appspot.com",
    messagingSenderId: "1063117165770",
    appId: "1:1063117165770:web:8555f26b25ae80bc42d033"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Variables de estado
let isEditing = false;
let editingId = null;
let clientes = [];
let contadores = {};
let currentUser = null;
let isManualEntry = false;
let categorias = [];
let productos = [];
let cotizacionTemporalId = null;
let formularioGuardadoExitosamente = false;
let formularioHaSidoModificado = false;
let isClosingConfirmed = false;
let productosModificados = new Map();

// Constantes
const empresasDirecciones = { 
    'RSI IXT': { 
        nombre: 'RSI ENTERPRISE IXTAPALUCA', 
        direccion: 'Av. Morelos 10, Pueblo San Francisco Acuautla, 56587 Ixtapaluca, Méx.', 
        telefono: '+52 1 55 7690 8248', 
        rfc: 'RSI1810319G0' 
    },
    'RSI NEZA': { 
        nombre: 'RSI ENTERPRISE NEZAHUALCÓYOTL', 
        direccion: '31 MZ102 LT20 EL SOL 57200', 
        telefono: '+52 1 55 7690 8248', 
        rfc: 'RSI1810319G0' 
    }
};

// Elementos del DOM
const modalTitle = document.getElementById('modalTitle');
const cotizacionForm = document.getElementById('cotizacionForm');
const itemsTableBody = document.getElementById('itemsTableBody');
const clienteSearch = document.getElementById('clienteSearch');
const clienteDropdown = document.getElementById('clienteDropdown');
const clienteNombre = document.getElementById('clienteNombre');
const clienteRFC = document.getElementById('clienteRFC');
const clienteDireccion = document.getElementById('clienteDireccion');
const clienteTelefono = document.getElementById('clienteTelefono');
const empresaSelector = document.getElementById('empresaSelector');
const empresaDireccion = document.getElementById('empresaDireccion');
const empresaRFC = document.getElementById('empresaRFC');
const empresaTelefono = document.getElementById('empresaTelefono');
const tipoCredito = document.getElementById('tipoCredito');
const creditOptions = document.getElementById('creditOptions');
const diasCredito = document.getElementById('diasCredito');
const loadingSpinner = document.getElementById('loadingSpinner');
const tipoCotizacionSelect = document.getElementById('tipoCotizacion');
const tipoCotizacionHidden = document.getElementById('tipoCotizacionHidden');
const cotizacionNumeroInput = document.getElementById('cotizacionNumero');
const agregarItemBtn = document.getElementById('agregarItemBtn');

// === UTILIDADES ===
function mostrarLoading(mostrar) { 
    loadingSpinner.style.display = mostrar ? 'flex' : 'none'; 
}

function mostrarAlerta(mensaje, tipo = 'info') { 
    Swal.mixin({ 
        toast: true, 
        position: 'top-end', 
        showConfirmButton: false, 
        timer: 3000, 
        timerProgressBar: true 
    }).fire({ icon: tipo, title: mensaje });
}

function formatearMoneda(cantidad) {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(cantidad);
}

function descargarPDFLocal(pdfBlob, nombreArchivo) {
    const url = URL.createObjectURL(pdfBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombreArchivo;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function agruparTecnologias(items) {
    const grupos = {};
    items.forEach(item => {
        const categoria = item.categoriaNombre || item.categoria || 'OTRO';
        if (!grupos[categoria]) grupos[categoria] = [];
        grupos[categoria].push(item);
    });
    return grupos;
}

function obtenerNombreCategoria(categoriaId) {
    const categoria = categorias.find(c => c.id === categoriaId);
    return categoria ? categoria.nombre : categoriaId;
}

// === PROTECCIÓN CONTRA CIERRE ACCIDENTAL ===
function marcarFormularioModificado() {
    if (!formularioHaSidoModificado) {
        formularioHaSidoModificado = true;
        console.log('Formulario marcado como modificado');
        
        if (!window._beforeunloadAdded) {
            window.addEventListener('beforeunload', manejarCierrePestana);
            window._beforeunloadAdded = true;
            console.log('Evento beforeunload agregado');
        }
    }
}

function manejarCierrePestana(e) {
    if (formularioHaSidoModificado && !formularioGuardadoExitosamente && !isClosingConfirmed) {
        e.preventDefault();
        e.returnValue = 'Tienes cambios sin guardar. ¿Estás seguro de querer salir?';
        return e.returnValue;
    }
}

// === FUNCIONES DE DATOS Y FIREBASE ===
async function cargarInformacionUsuario(email) {
    try {
        const q = query(collection(db, 'colaboradores'), where("CORREO ELECTRÓNICO EMPRESARIAL", "==", email));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            const doc = querySnapshot.docs[0];
            currentUser.nombreCompleto = doc.data().NOMBRE || email;
        } else {
            currentUser.nombreCompleto = email;
        }
    } catch (error) {
        console.error('Error al cargar información del usuario:', error);
        currentUser.nombreCompleto = email;
    }
}

async function cargarClientes() { 
    try {
        const querySnapshot = await getDocs(collection(db, 'clientes'));
        clientes = [];
        querySnapshot.forEach((doc) => {
            const clienteData = doc.data();
            const limpiarValor = (valor) => (!valor || ['N/A', 'undefined', 'null'].includes(valor)) ? '' : String(valor).trim();
            const direccionPartes = [limpiarValor(clienteData.Calle), limpiarValor(clienteData.Colonia), limpiarValor(clienteData['Codigo Postal'])].filter(Boolean);
            const telefonoPartes = [limpiarValor(clienteData.Telefono), limpiarValor(clienteData.Movil)].filter(Boolean);
            clientes.push({
                id: doc.id,
                nombre: limpiarValor(clienteData.Nombre) || 'Cliente sin nombre',
                nombreComercial: limpiarValor(clienteData['Nombre Comercial']),
                rfc: limpiarValor(clienteData.RFC),
                contacto1: direccionPartes.length > 0 ? direccionPartes.join(', ') : 'Dirección no disponible',
                telefono1: telefonoPartes.length > 0 ? telefonoPartes.join(' / ') : 'Teléfono no disponible'
            });
        });

        const clientesEspecificos = [
            { nombre: 'LATAMGYM S.A.P.I. DE C.V.', rfc: 'LAT110824BJ4', contacto1: 'AV PASEO DE LA REFORMA 296 PISO 16 CUAUHTÉMOC, C.D.MX. CP: 06600' },
            { nombre: 'TIENDAS CHEDRAUI S.A.B. DE C.V.', rfc: 'TCH850701RM1', contacto1: 'AV. CONSTITUYENTES 1150 MIGUEL HIDALGO, C.D.MX. CP: 11950' },
            { nombre: 'GRUPO ZORRO ABARROTERO', rfc: 'GZA9104307K6', contacto1: 'AV. CENTENARIO 2188 GUSTAVO A. MADERO, C.D. MX. CP: 07420' },
            { nombre: 'MILANO OPERADORA', rfc: 'DIS880803JW8', contacto1: 'PUEBLA 329 CUAUHTÉMOC, C.D.MX. CP: 06700' },
            { nombre: 'LILIA ALAVEZ MALDONADO', rfc: 'AAML7804101K1', contacto1: 'RANCHO EL ENCANTO 35 CUAUTITLÁN IZCALLI, EDO. MÉX. CP: 54725' },
            { nombre: 'LOGISTICA DE COMERCIO EXTERIOR SHEKINAH', rfc: 'LCE140605TJ2', contacto1: 'CALLE 3 194 NEZAHUALCÓYOTL, EDO. MÉX. CP: 57200' },
            { nombre: 'FLECHA ABARROTERA', rfc: 'FAB990222BG4', contacto1: 'CARRETERA XOCHIMILCO TULYEHUALCO 3024 XOCHIMILCO, C.D.MX. CP: 16429' },
            { nombre: 'EL CAZADOR COMERCIAL ABARROTERO', rfc: 'CCA910626QT9', contacto1: 'AV. ZONA 4 SECTOR 4 CP: 09040' },
            { nombre: 'CONSULTORIA INTEGRAL BETANZOS', rfc: 'CIB220427H25', contacto1: 'MEXICA 523-16C CHIMALHUACÁN, EDO. MÉX. CP: 56366' },
            { nombre: 'LEVADURAS Y AVIOS AZTECA', rfc: 'LAA080513DE1', contacto1: 'CALLE 4 184 IZTAPALAPA, C.D.MX. CP: 09070' }
        ];

        clientesEspecificos.forEach(clienteEspecifico => {
            if (!clientes.some(c => c.nombre.toLowerCase() === clienteEspecifico.nombre.toLowerCase())) {
                clientes.unshift({ 
                    id: `temp-${Date.now()}-${Math.random()}`, 
                    telefono1: '', 
                    nombreComercial: clienteEspecifico.nombre, 
                    ...clienteEspecifico 
                });
            }
        });
    } catch (error) {
        console.error('Error al cargar clientes:', error);
        mostrarAlerta('Error al cargar clientes de Firebase.', 'warning');
    }
}

async function cargarCategorias() {
    try {
        const querySnapshot = await getDocs(collection(db, 'categoriasProductoServicio'));
        categorias = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            categorias.push({
                id: doc.id,
                nombre: data.nombreCategoria || 'Sin nombre',
                imagen: data.imagen || null
            });
        });
        console.log(`Categorías cargadas: ${categorias.length}`);
    } catch (error) {
        console.error('Error al cargar categorías:', error);
        mostrarAlerta('Error al cargar categorías', 'warning');
    }
}

async function cargarProductosPorCategoria(categoriaId) {
    try {
        const q = query(
            collection(db, 'productosServiciosCotizaciones'),
            where('categoriaId', '==', categoriaId)
        );
        const querySnapshot = await getDocs(q);
        productos = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            productos.push({
                id: doc.id,
                nombre: data.nombre || 'Sin nombre',
                precioUnitario: data.precioUnitario || 0,
                categoriaId: data.categoriaId,
                imagen: data.imagen || null
            });
        });
        return productos;
    } catch (error) {
        console.error('Error al cargar productos:', error);
        mostrarAlerta('Error al cargar productos', 'warning');
        return [];
    }
}

async function buscarProductosPorTexto(texto, categoriaId = null) {
    try {
        let productosFiltrados = [];
        
        if (categoriaId) {
            const q = query(
                collection(db, 'productosServiciosCotizaciones'),
                where('categoriaId', '==', categoriaId)
            );
            const querySnapshot = await getDocs(q);
            
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                const nombre = data.nombre || '';
                if (nombre.toLowerCase().includes(texto.toLowerCase())) {
                    productosFiltrados.push({
                        id: doc.id,
                        nombre: nombre,
                        precioUnitario: data.precioUnitario || 0,
                        categoriaId: data.categoriaId,
                        imagen: data.imagen || null
                    });
                }
            });
        } else {
            const allProductsQuery = await getDocs(collection(db, 'productosServiciosCotizaciones'));
            
            allProductsQuery.forEach((doc) => {
                const data = doc.data();
                const nombre = data.nombre || '';
                if (nombre.toLowerCase().includes(texto.toLowerCase())) {
                    productosFiltrados.push({
                        id: doc.id,
                        nombre: nombre,
                        precioUnitario: data.precioUnitario || 0,
                        categoriaId: data.categoriaId,
                        imagen: data.imagen || null
                    });
                }
            });
        }
        
        return productosFiltrados;
    } catch (error) {
        console.error('Error al buscar productos:', error);
        return [];
    }
}

async function actualizarProductoEnFirebase(productoId, nuevoPrecio) {
    try {
        const productoRef = doc(db, 'productosServiciosCotizaciones', productoId);
        await updateDoc(productoRef, {
            precioUnitario: nuevoPrecio,
            fechaActualizacion: new Date().toISOString(),
            actualizadoPor: {
                uid: currentUser?.uid || 'unknown',
                email: currentUser?.email || 'unknown',
                nombre: currentUser?.nombreCompleto || 'Usuario desconocido'
            }
        });
        console.log(`Producto ${productoId} actualizado con precio ${nuevoPrecio}`);
        return true;
    } catch (error) {
        console.error('Error al actualizar producto en Firebase:', error);
        return false;
    }
}

async function crearNuevoProductoEnFirebase(categoriaId, nombreProducto, precio) {
    try {
        const nuevoProducto = {
            nombre: nombreProducto,
            precioUnitario: parseFloat(precio),
            categoriaId: categoriaId,
            fechaCreacion: new Date().toISOString(),
            creadoPor: {
                uid: currentUser?.uid || 'unknown',
                email: currentUser?.email || 'unknown',
                nombre: currentUser?.nombreCompleto || 'Usuario desconocido'
            },
            activo: true
        };

        const docRef = await addDoc(collection(db, 'productosServiciosCotizaciones'), nuevoProducto);
        console.log('Nuevo producto creado con ID:', docRef.id);
        return docRef.id;
    } catch (error) {
        console.error('Error al crear nuevo producto en Firebase:', error);
        return null;
    }
}

// === FUNCIONES DE LÓGICA DEL FORMULARIO ===
function handleEmpresaChange() {
    const empresaSeleccionada = empresaSelector.value;
    const empresaData = empresasDirecciones[empresaSeleccionada];
    empresaDireccion.value = empresaData.direccion;
    empresaRFC.value = empresaData.rfc;
    empresaTelefono.value = empresaData.telefono;
    marcarFormularioModificado();
}

function handleTipoCreditoChange() {
    const tipo = tipoCredito.value;
    if (tipo === 'credito' || tipo === 'debido') {
        creditOptions.style.display = 'block';
    } else {
        creditOptions.style.display = 'none';
        diasCredito.value = '';
    }
    marcarFormularioModificado();
}

function establecerFechaActual() { 
    document.getElementById('cotizacionFecha').value = new Date().toISOString().split('T')[0]; 
}

// === FUNCIÓN PARA AGREGAR ITEM ===
function agregarItem() {
    const row = document.createElement('tr');
    row.draggable = true;
    row.innerHTML = `
        <td><span class="drag-handle" title="Arrastrar para reordenar">⠿</span></td>
        <td>
            <select class="item-categoria" required>
                <option value="">Seleccionar categoría...</option>
                ${categorias.map(cat => `<option value="${cat.id}">${cat.nombre}</option>`).join('')}
            </select>
        </td>
        <td>
            <select class="item-tipo-tecnologia" required>
                <option value="">Seleccionar...</option>
                <option value="servicio">🔧 Servicio</option>
                <option value="pieza">⚙️ Pieza</option>
                <option value="kit">📦 Kit</option>
                <option value="par">👥 Par</option>
                <option value="cm">🐛 Centimetro</option>
                <option value="m">🚇 Metro</option>
            </select>
        </td>
        <td>
            <input type="text" class="item-descripcion" 
                   placeholder="Escriba para buscar productos..." 
                   minlength="3" maxlength="500" required>
            <div class="producto-search-dropdown" style="display: none;"></div>
        </td>
        <td><input type="number" class="item-cantidad" min="1" value="1" step="1" required></td>
        <td><input type="number" class="item-precio" min="0" step="0.01" placeholder="0.00" required></td>
        <td class="item-total">$0.00</td>
        <td><button type="button" class="btn btn-danger btn-small eliminar-item"><span>🗑️</span></button></td>
    `;
    
    itemsTableBody.appendChild(row);

    const categoriaSelect = row.querySelector('.item-categoria');
    const tipoTecnologiaSelect = row.querySelector('.item-tipo-tecnologia');
    const descripcionInput = row.querySelector('.item-descripcion');
    const productoDropdown = row.querySelector('.producto-search-dropdown');
    const cantidadInput = row.querySelector('.item-cantidad');
    const precioInput = row.querySelector('.item-precio');
    const eliminarBtn = row.querySelector('.eliminar-item');

    async function buscarProductosCategoriaSeleccionada() {
        const categoriaId = categoriaSelect.value;
        const searchText = descripcionInput.value.trim();
        
        if (categoriaId && searchText.length >= 2) {
            const productosFiltrados = await buscarProductosPorTexto(searchText, categoriaId);
            mostrarProductosDropdown(productoDropdown, productosFiltrados, descripcionInput, precioInput);
        } else {
            productoDropdown.style.display = 'none';
        }
    }

    categoriaSelect.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === 'Tab') {
            e.preventDefault();
            tipoTecnologiaSelect.focus();
        }
    });

    tipoTecnologiaSelect.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === 'Tab') {
            e.preventDefault();
            descripcionInput.focus();
        }
    });

    descripcionInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === 'Tab') {
            e.preventDefault();
            cantidadInput.focus();
        }
    });

    cantidadInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === 'Tab') {
            e.preventDefault();
            precioInput.focus();
        }
    });

    precioInput.addEventListener('keydown', async (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            calcularTotalItem(row);
            await verificarNuevoProducto(row);
            agregarItem().querySelector('.item-categoria').focus();
            marcarFormularioModificado();
        } else if (e.key === 'Tab') {
            e.preventDefault();
            eliminarBtn.focus();
        }
    });

    categoriaSelect.addEventListener('change', async function() {
        const categoriaId = this.value;
        if (categoriaId) {
            await cargarProductosPorCategoria(categoriaId);
            if (descripcionInput.value.trim().length >= 2) {
                buscarProductosCategoriaSeleccionada();
            }
        }
        marcarFormularioModificado();
    });

    let searchTimeout;
    descripcionInput.addEventListener('input', function() {
        clearTimeout(searchTimeout);
        const searchText = this.value.trim();
        
        searchTimeout = setTimeout(async () => {
            const categoriaId = categoriaSelect.value;
            if (categoriaId && searchText.length >= 2) {
                const productosFiltrados = await buscarProductosPorTexto(searchText, categoriaId);
                mostrarProductosDropdown(productoDropdown, productosFiltrados, descripcionInput, precioInput);
            } else {
                productoDropdown.style.display = 'none';
            }
        }, 300);
        
        marcarFormularioModificado();
    });

    descripcionInput.addEventListener('click', function() {
        const categoriaId = categoriaSelect.value;
        const searchText = this.value.trim();
        
        if (categoriaId && (searchText.length >= 2 || productos.length > 0)) {
            buscarProductosCategoriaSeleccionada();
        }
    });

    document.addEventListener('click', function(e) {
        if (!descripcionInput.contains(e.target) && !productoDropdown.contains(e.target)) {
            productoDropdown.style.display = 'none';
        }
    });

    cantidadInput.addEventListener('input', () => {
        if (cantidadInput.value.includes('.')) {
            cantidadInput.value = Math.floor(parseFloat(cantidadInput.value));
        }
        calcularTotalItem(row);
        marcarFormularioModificado();
    });
    
    precioInput.addEventListener('input', function() {
        const descripcion = descripcionInput.value.trim();
        const precioOriginal = productos.find(p => p.nombre === descripcion)?.precioUnitario;
        const precioActual = parseFloat(this.value);
        
        if (precioOriginal && precioActual !== precioOriginal) {
            const producto = productos.find(p => p.nombre === descripcion);
            if (producto && !productosModificados.has(producto.id)) {
                productosModificados.set(producto.id, {
                    productoId: producto.id,
                    productoNombre: producto.nombre,
                    precioOriginal: precioOriginal,
                    precioModificado: precioActual
                });
            }
        }
        
        calcularTotalItem(row);
        marcarFormularioModificado();
    });
    
    cantidadInput.addEventListener('keypress', function(e) {
        if (e.key === '.' || e.key === ',') {
            e.preventDefault();
        }
    });
    
    eliminarBtn.addEventListener('click', () => eliminarItem(row));

    row.addEventListener('dragstart', () => { 
        setTimeout(() => row.classList.add('dragging'), 0); 
    });
    row.addEventListener('dragend', () => row.classList.remove('dragging'));

    calcularTotalItem(row);
    return row;
}

function mostrarProductosDropdown(dropdown, productosList, descripcionInput, precioInput) {
    if (productosList.length === 0) {
        dropdown.style.display = 'none';
        return;
    }

    dropdown.innerHTML = productosList.map(producto => `
        <div class="producto-option" 
             data-id="${producto.id}"
             data-nombre="${producto.nombre}" 
             data-precio="${producto.precioUnitario}">
            ${producto.nombre} - $${producto.precioUnitario.toFixed(2)}
        </div>
    `).join('');

    dropdown.style.display = 'block';

    dropdown.querySelectorAll('.producto-option').forEach(option => {
        option.addEventListener('click', function() {
            const id = this.getAttribute('data-id');
            const nombre = this.getAttribute('data-nombre');
            const precio = parseFloat(this.getAttribute('data-precio'));
            
            descripcionInput.value = nombre;
            descripcionInput.setAttribute('data-producto-id', id);
            precioInput.value = precio;
            dropdown.style.display = 'none';
            marcarFormularioModificado();
            
            const row = descripcionInput.closest('tr');
            calcularTotalItem(row);
            
            precioInput.focus();
        });
    });
}

function calcularTotalItem(row) {
    const cantidad = parseFloat(row.querySelector('.item-cantidad').value) || 0;
    const precio = parseFloat(row.querySelector('.item-precio').value) || 0;
    const total = cantidad * precio;
    row.querySelector('.item-total').textContent = formatearMoneda(total);
    calcularTotales();
}

function calcularTotales() {
    let subtotal = 0;
    Array.from(itemsTableBody.children).forEach(row => {
        const cantidad = parseFloat(row.querySelector('.item-cantidad').value) || 0;
        const precio = parseFloat(row.querySelector('.item-precio').value) || 0;
        subtotal += cantidad * precio;
    });
    
    const descuentoPorcentaje = parseFloat(document.getElementById('descuento').value) || 0;
    const impuestoPorcentaje = parseFloat(document.getElementById('impuesto').value) || 0;
    const descuentoMonto = subtotal * (descuentoPorcentaje / 100);
    const subtotalConDescuento = subtotal - descuentoMonto;
    const impuestoMonto = subtotalConDescuento * (impuestoPorcentaje / 100);
    const total = subtotalConDescuento + impuestoMonto;
    
    document.getElementById('subtotal').textContent = formatearMoneda(subtotal);
    document.getElementById('total').textContent = formatearMoneda(total);
}

function eliminarItem(row) { 
    if (itemsTableBody.children.length > 1) {
        row.remove();
        calcularTotales();
        marcarFormularioModificado();
    } else {
        mostrarAlerta('Debe mantener al menos un item.', 'warning');
    }
}

// === FUNCIONES PARA VERIFICACIÓN Y MANEJO DE PRODUCTOS ===
async function verificarNuevoProducto(row) {
    if (!row) return false;
    
    const descripcionInput = row.querySelector('.item-descripcion');
    const categoriaSelect = row.querySelector('.item-categoria');
    const precioInput = row.querySelector('.item-precio');
    
    const descripcion = descripcionInput.value.trim();
    const categoriaId = categoriaSelect.value;
    const precio = parseFloat(precioInput.value) || 0;
    
    if (descripcion && categoriaId && precio > 0) {
        const productoExistente = productos.find(p => p.nombre.toLowerCase() === descripcion.toLowerCase());
        
        if (!productoExistente) {
            const result = await Swal.fire({
                title: '¿Guardar como nuevo producto?',
                html: `
                    <div style="text-align: left;">
                        <p><strong>${descripcion}</strong></p>
                        <p>Categoría: ${categoriaSelect.options[categoriaSelect.selectedIndex].text}</p>
                        <p>Precio: $${precio.toFixed(2)}</p>
                        <p>¿Desea guardar este producto para futuras cotizaciones?</p>
                    </div>
                `,
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: 'Sí, guardar',
                cancelButtonText: 'No, solo agregar',
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#6b7280',
                allowOutsideClick: false
            });
            
            if (result.isConfirmed) {
                mostrarLoading(true);
                try {
                    const nuevoProductoId = await crearNuevoProductoEnFirebase(
                        categoriaId, 
                        descripcion, 
                        precio
                    );
                    
                    if (nuevoProductoId) {
                        mostrarAlerta('✅ Producto guardado correctamente', 'success');
                        await cargarProductosPorCategoria(categoriaId);
                        return true;
                    }
                } catch (error) {
                    console.error('Error al guardar producto:', error);
                    mostrarAlerta('Error al guardar producto', 'error');
                } finally {
                    mostrarLoading(false);
                }
            }
        }
    }
    return false;
}

async function verificarUltimoItemAntesDeAgregar() {
    const rows = itemsTableBody.children;
    if (rows.length === 0) return;
    
    const ultimaFila = rows[rows.length - 1];
    return await verificarNuevoProducto(ultimaFila);
}

async function manejarProductosModificados() {
    if (productosModificados.size === 0) {
        return;
    }

    try {
        mostrarLoading(true);
        
        const actualizaciones = [];
        
        for (const [productoId, datos] of productosModificados) {
            const result = await Swal.fire({
                title: '¿Actualizar producto?',
                html: `
                    <div style="text-align: left;">
                        <p><strong>${datos.productoNombre}</strong></p>
                        <p>Precio original: $${datos.precioOriginal.toFixed(2)}</p>
                        <p>Precio modificado: $${datos.precioModificado.toFixed(2)}</p>
                        <p>¿Desea actualizar el precio del producto en la base de datos?</p>
                    </div>
                `,
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: 'Sí, actualizar',
                cancelButtonText: 'No, mantener',
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#6b7280'
            });
            
            if (result.isConfirmed) {
                actualizaciones.push(
                    actualizarProductoEnFirebase(productoId, datos.precioModificado)
                );
            }
        }
        
        if (actualizaciones.length > 0) {
            await Promise.all(actualizaciones);
            mostrarAlerta('✅ Productos actualizados correctamente', 'success');
        }
        
        productosModificados.clear();
        
    } catch (error) {
        console.error('Error al manejar productos modificados:', error);
        mostrarAlerta('Error al actualizar productos', 'error');
    } finally {
        mostrarLoading(false);
    }
}

// === FUNCIONES PARA EL DROPDOWN DE CLIENTES ===
function buscarClientes() {
    const termino = clienteSearch.value.toLowerCase().trim();
    if (termino.length === 0) { 
        mostrarDropdown(); 
        return; 
    }
    const clientesFiltrados = clientes.filter(c => 
        (c.nombre && c.nombre.toLowerCase().includes(termino)) ||
        (c.rfc && c.rfc.toLowerCase().includes(termino)) ||
        (c.nombreComercial && c.nombreComercial.toLowerCase().includes(termino))
    );
    mostrarOpcionesClientes(clientesFiltrados, termino);
}

function mostrarDropdown() { 
    clienteDropdown.style.display = 'block';
    mostrarOpcionesClientes(clientes.slice(0, 10)); 
}

function ocultarDropdown() { 
    clienteDropdown.style.display = 'none'; 
}

function mostrarOpcionesClientes(clientesFiltrados, termino = '') {
    clienteDropdown.innerHTML = '';
    clientesFiltrados.forEach(cliente => {
        const option = document.createElement('div');
        option.className = 'search-option';
        option.innerHTML = `
            <div><strong>${cliente.nombre}</strong></div>
            <div class="cliente-info">${cliente.rfc ? 'RFC: ' + cliente.rfc : 'Sin RFC'}</div>
        `;
        option.addEventListener('click', () => seleccionarCliente(cliente));
        clienteDropdown.appendChild(option);
    });
    
    const manualOption = document.createElement('div');
    manualOption.className = 'search-option manual';
    manualOption.innerHTML = `
        <div><strong>✏️ Entrada Manual</strong></div>
        <div class="cliente-info">Escribir datos del cliente manualmente</div>
    `;
    manualOption.addEventListener('click', activarEntradaManual);
    clienteDropdown.appendChild(manualOption);
    
    if (clientesFiltrados.length === 0 && termino) {
        const noResultsOption = document.createElement('div');
        noResultsOption.className = 'search-option';
        noResultsOption.innerHTML = `<div style="color: #6b7280; font-style: italic;">No se encontraron clientes con "${termino}"</div>`;
        clienteDropdown.insertBefore(noResultsOption, manualOption);
    }
    clienteDropdown.style.display = 'block';
}

function seleccionarCliente(cliente) {
    isManualEntry = false;
    clienteSearch.value = cliente.nombre;
    clienteNombre.value = cliente.nombre;
    clienteRFC.value = cliente.rfc;
    clienteDireccion.value = cliente.contacto1;
    clienteTelefono.value = cliente.telefono1;
    [clienteNombre, clienteRFC, clienteDireccion, clienteTelefono].forEach(field => {
        field.readOnly = true;
        field.style.backgroundColor = '#f0f9ff';
    });
    ocultarDropdown();
    marcarFormularioModificado();
}

function activarEntradaManual() {
    isManualEntry = true;
    clienteSearch.value = '';
    [clienteNombre, clienteRFC, clienteDireccion, clienteTelefono].forEach(field => {
        field.value = '';
        field.readOnly = false;
        field.style.backgroundColor = 'white';
    });
    ocultarDropdown();
    clienteNombre.focus();
}

function resetearFormulario() { 
    cotizacionForm.reset();
    itemsTableBody.innerHTML = '';
    tipoCotizacionSelect.value = '';
    tipoCotizacionHidden.value = '';
    cotizacionNumeroInput.value = '';
    handleEmpresaChange();
    establecerFechaActual();
    agregarItem();
    clienteSearch.value = '';
    activarEntradaManual();
    creditOptions.style.display = 'none';
    tipoCredito.value = '';
    diasCredito.value = '';
    cotizacionTemporalId = null;
    formularioHaSidoModificado = false;
    productosModificados.clear();
    
    if (window._beforeunloadAdded) {
        window.removeEventListener('beforeunload', manejarCierrePestana);
        window._beforeunloadAdded = false;
    }
}

// === GENERACIÓN DE PDF ===
async function generarPDF(data) {
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF();
    
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 15;
    const textColor = '#000000';
    const gray = '#6b7280';
    const navy = '#0d2c54';
    const lightGray = '#f5f5f5';
    
    const formatearNumero = (num) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(num).replace('MX', '').trim();
    const colX = { 
        desc: margin, 
        unidad: margin + 90, 
        cant: margin + 110, 
        precio: margin + 130, 
        total: margin + 160 
    };
    
    let page = 1;
    let y = 20;
    
    const nuevaPagina = () => { 
        pdf.addPage(); 
        page++; 
        y = 20; 
    };
    
    const piePagina = () => {
        pdf.setFontSize(8)
           .setTextColor(gray)
           .text(`Cotización No. ${data.cotizacionNumero} | Página ${page}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
    };
    
    const categoriaDisplayMap = {
        'CCTV': '📹 CCTV', 
        'DH': '🏠 DETECTOR DE HUMO', 
        'CA': '🔐 CONTROL DE ACCESOS',
        'ALARMA INTRUSION': '🚨 ALARMA INTRUSIÓN', 
        'ALARMA': '🚨 ALARMA INTRUSIÓN',
        'MULTIMEDIA': '📺 MULTIMEDIA', 
        'REDES': '🛜 REDES TRANSPORTE DE DATOS', 
        'OTRO': '📦 OTRO',
        'AI': '🚨 ALARMA INTRUSIÓN'
    };
    
    try { 
        pdf.addImage('../../css/img/Logo-RSI-OFICIAL.png', 'PNG', pageWidth - margin - 40, margin, 40, 40);
    } catch (e) { 
        console.warn('No se pudo cargar el logo.'); 
    }
    
    pdf.setFontSize(10)
       .setTextColor(navy)
       .text(data.empresaNombre || "RSI ENTERPRISE", margin, y + 5);
    
    pdf.setFontSize(8)
       .setTextColor(gray)
       .text(data.empresaDireccion || "", margin, y + 10)
       .text(`RFC: ${data.empresaRFC || ''} | Tel: ${data.empresaTelefono || ''}`, margin, y + 15);
    
    y += 25;
    
    pdf.setFontSize(14)
       .setTextColor(navy)
       .text("COTIZACIÓN", pageWidth / 2, y, { align: 'center' });
    
    pdf.setFontSize(9)
       .setTextColor(gray)
       .text(`No. ${data.cotizacionNumero} | Fecha: ${new Date(data.cotizacionFecha).toLocaleDateString('es-MX')}`, pageWidth / 2, y + 7, { align: 'center' });
    
    y += 20;
    
    if (data.cotizacionDescripcion && data.cotizacionDescripcion.trim().length > 0) {
        pdf.setFontSize(9)
           .setTextColor(navy)
           .setFont('helvetica', 'bold')
           .text("DESCRIPCIÓN:", margin, y); 
        y += 5;
        
        pdf.setFontSize(9)
           .setTextColor(textColor)
           .setFont('helvetica', 'normal');
        
        const descLines = pdf.splitTextToSize(data.cotizacionDescripcion.trim(), pageWidth - 2 * margin);
        descLines.forEach(line => { 
            pdf.text(line, margin, y); 
            y += 5; 
        });
        y += 5;
    }
    
    pdf.setFontSize(9)
       .setTextColor(textColor)
       .text(`Cliente: ${data.clienteNombre}`, margin, y); 
    y += 5;
    
    pdf.text(`RFC: ${data.clienteRFC || 'N/E'}`, margin, y); 
    y += 5; 
    
    pdf.text(`Dirección: ${data.clienteDireccion}`, margin, y); 
    y += 10;
    
    const tipoCotizacionMap = { 
        'implementacion': 'Implementación', 
        'proyecto': 'Proyecto', 
        'servicio': 'Servicio' 
    };
    
    let infoPago = `Pago: ${data.tipoCredito || 'N/E'}`;
    if (data.tipoCredito === 'credito' && data.diasCredito) {
        infoPago += ` (${data.diasCredito} días)`;
    }
    
    const info = [
        `Tipo: ${tipoCotizacionMap[data.tipoCotizacion] || 'N/E'}`,
        `Vigencia: ${data.cotizacionVigencia} días`,
        `Moneda: ${data.cotizacionMoneda}`,
        infoPago
    ].join(" | ");
    
    pdf.text(info, margin, y); 
    y += 10;
    
    const grupos = agruparTecnologias(data.items);
    Object.entries(grupos).forEach(([categoria, items]) => {
        const nombreCategoria = categoriaDisplayMap[categoria] || categoria;
        const displayCategoria = nombreCategoria.replace(/^(.*?)\s/, '').trim();
        
        if (y > pageHeight - 70) { 
            piePagina(); 
            nuevaPagina(); 
        }
        
        pdf.setFillColor(navy)
           .rect(margin, y, pageWidth - 2 * margin, 12, 'F');
        
        pdf.setFontSize(12)
           .setTextColor('#FFFFFF')
           .setFont('helvetica', 'bold')
           .text(displayCategoria, pageWidth / 2, y + 8, { align: 'center' });
        
        y += 14;
        
        pdf.setFillColor(navy)
           .rect(margin, y, pageWidth - 2 * margin, 8, 'F');
        
        pdf.setFontSize(8)
           .setFont('helvetica', 'normal')
           .text("DESCRIPCIÓN", colX.desc, y + 5)
           .text("UNIDAD", colX.unidad, y + 5, { align: 'center' })
           .text("CANT.", colX.cant, y + 5, { align: 'right' })
           .text("P. UNIT.", colX.precio, y + 5, { align: 'right' })
           .text("TOTAL", colX.total, y + 5, { align: 'right' });
        
        y += 10;
        
        items.forEach((item, index) => {
            const descLines = pdf.splitTextToSize(item.descripcion, colX.unidad - colX.desc - 5);
            const itemHeight = Math.max(descLines.length * 5, 10) + 2;
            
            if (y + itemHeight > pageHeight - 20) { 
                piePagina(); 
                nuevaPagina(); 
            }
            
            if (index % 2 === 0) {
                pdf.setFillColor(lightGray)
                   .rect(margin, y, pageWidth - 2 * margin, itemHeight, 'F');
            }
            
            pdf.setTextColor(textColor);
            descLines.forEach((line, i) => {
                pdf.text(line, colX.desc, y + 5 + (i * 5));
            });
            
            pdf.text(item.tipoTecnologia.slice(0, 4), colX.unidad, y + 5, { align: 'center' });
            pdf.text(item.cantidad.toString(), colX.cant, y + 5, { align: 'right' });
            pdf.text(formatearNumero(item.precio), colX.precio, y + 5, { align: 'right' });
            pdf.text(formatearNumero(item.total), colX.total, y + 5, { align: 'right' });
            
            pdf.setDrawColor(200, 200, 200)
               .line(margin, y + itemHeight, pageWidth - margin, y + itemHeight);
            
            y += itemHeight;
        });
        y += 2;
    });
    
    const tableStartX = colX.total - 82;
    const valueColX = tableStartX + 70;
    
    pdf.setFontSize(9)
       .setTextColor(textColor)
       .text("Subtotal:", tableStartX, y + 5, { align: 'left' })
       .text(formatearNumero(data.subtotal), valueColX, y + 5, { align: 'left' }); 
    y += 5;
    
    if (data.descuentoMonto > 0) { 
        pdf.text(`Descuento (${data.descuento}%):`, tableStartX, y + 5, { align: 'left' })
           .text(`-${formatearMoneda(data.descuentoMonto)}`, valueColX, y + 5, { align: 'left' }); 
        y += 5; 
    }
    
    pdf.text(`IVA (${data.impuesto}%):`, tableStartX, y + 5, { align: 'left' })
       .text(formatearNumero(data.impuestoMonto), valueColX, y + 5, { align: 'left' }); 
    y += 7;
    
    pdf.setFont('helvetica', 'bold')
       .setTextColor(navy)
       .text("TOTAL:", tableStartX, y + 5, { align: 'left' })
       .text(`${formatearNumero(data.totalFinal)} ${data.cotizacionMoneda}`, valueColX, y + 5, { align: 'left' });
    
    if (data.terminos) {
        y += 20;
        if (y > pageHeight - 50) { 
            piePagina(); 
            nuevaPagina(); 
        }
        
        pdf.setFontSize(9)
           .setTextColor(navy)
           .setFont('helvetica', 'normal')
           .text("TÉRMINOS Y CONDICIONES", margin, y); 
        y += 5;
        
        pdf.setTextColor(textColor);
        data.terminos.split('\n').forEach(term => {
            if (term.trim()) {
                pdf.splitTextToSize(term, pageWidth - 2 * margin).forEach(line => {
                    if (y > pageHeight - 20) { 
                        piePagina(); 
                        nuevaPagina(); 
                    }
                    pdf.text(line, margin, y); 
                    y += 5;
                });
            }
        });
    }
    
    piePagina();
    return pdf.output('blob');
}

// === CARGA DE COTIZACIÓN PARA EDICIÓN ===
async function cargarCotizacionParaEdicion(id) {
    mostrarLoading(true);
    try {
        const docSnap = await getDoc(doc(db, 'cotizacionPdf', id));
        if (docSnap.exists()) {
            const cotizacion = docSnap.data();
            
            isEditing = true;
            editingId = id;
            modalTitle.textContent = '✏️ Editar Cotización';
            cotizacionForm.querySelector('button[type="submit"]').innerHTML = '<i class="fas fa-save"></i> Actualizar Cotización PDF';

            // Llenar campos
            document.getElementById('cotizacionNumero').value = cotizacion.cotizacionNumero || '';
            document.getElementById('cotizacionVigencia').value = cotizacion.cotizacionVigencia || 30;
            document.getElementById('cotizacionMoneda').value = cotizacion.cotizacionMoneda || 'MXN';
            document.getElementById('cotizacionFecha').value = cotizacion.cotizacionFecha || '';
            
            // Tipo de cotización - BLOQUEADO pero visible
            const tipoCotizacionValor = cotizacion.tipoCotizacion || '';
            tipoCotizacionSelect.value = tipoCotizacionValor;
            tipoCotizacionSelect.disabled = true;
            tipoCotizacionSelect.style.backgroundColor = '#f5f5f5';
            tipoCotizacionSelect.style.cursor = 'not-allowed';
            tipoCotizacionHidden.value = tipoCotizacionValor;
            
            document.getElementById('descuento').value = cotizacion.descuento || 0;
            document.getElementById('impuesto').value = cotizacion.impuesto || 16;
            document.getElementById('terminos').value = cotizacion.terminos || '';
            document.getElementById('cotizacionDescripcion').value = cotizacion.cotizacionDescripcion || '';
            
            // Actualizar contador de caracteres
            if (document.getElementById('contadorCaracteres')) {
                document.getElementById('contadorCaracteres').textContent = 
                    `${cotizacion.cotizacionDescripcion?.length || 0}/500 caracteres`;
            }

            // Datos de la Empresa 
            const empresaNombre = cotizacion.empresaNombre || '';
            empresaSelector.value = empresaNombre.includes('NEZA') ? 'RSI NEZA' : 'RSI IXT';
            handleEmpresaChange();

            // Datos del Cliente
            if (cotizacion.esEntradaManual) {
                activarEntradaManual();
            } else {
                [clienteNombre, clienteRFC, clienteDireccion, clienteTelefono].forEach(field => {
                    field.readOnly = true;
                    field.style.backgroundColor = '#f0f9ff';
                });
            }
            clienteNombre.value = cotizacion.clienteNombre || '';
            clienteRFC.value = cotizacion.clienteRFC || '';
            clienteDireccion.value = cotizacion.clienteDireccion || '';
            clienteTelefono.value = cotizacion.clienteTelefono || '';
            clienteSearch.value = cotizacion.clienteNombre || '';

            // Tipo de Pago y Crédito
            tipoCredito.value = cotizacion.tipoCredito || '';
            diasCredito.value = cotizacion.diasCredito || '';
            handleTipoCreditoChange();

            // Llenar Items de la tabla
            itemsTableBody.innerHTML = '';
            if (cotizacion.items?.length > 0) {
                cotizacion.items.forEach(item => {
                    agregarItem();
                    const lastRow = itemsTableBody.lastElementChild;
                    lastRow.querySelector('.item-categoria').value = item.categoria || '';
                    lastRow.querySelector('.item-tipo-tecnologia').value = item.tipoTecnologia || '';
                    lastRow.querySelector('.item-descripcion').value = item.descripcion;
                    lastRow.querySelector('.item-cantidad').value = item.cantidad;
                    lastRow.querySelector('.item-precio').value = item.precio;
                    calcularTotalItem(lastRow);
                });
            } else {
                agregarItem();
            }
            
            calcularTotales();
            
            // Marcar como modificado
            formularioHaSidoModificado = true;
            marcarFormularioModificado();

        } else {
            mostrarAlerta('Cotización no encontrada. Redirigiendo al listado.', 'error');
            setTimeout(() => window.location.href = '../consultar-cotizaciones/consultar-cotizaciones.html', 2000);
        }
    } catch (error) {
        console.error("Error al cargar cotización para edición:", error);
        mostrarAlerta('Error al cargar cotización: ' + error.message, 'error');
    } finally {
        mostrarLoading(false);
    }
}

// === MANEJO DEL SUBMIT DEL FORMULARIO ===
async function manejarSubmitFormulario(e) {
    e.preventDefault();
    
    if (!currentUser) {
        Swal.fire({ title: 'Acceso no autorizado', text: 'Debes iniciar sesión', icon: 'warning' });
        return;
    }
    
    const tipoCotizacion = tipoCotizacionHidden.value || tipoCotizacionSelect.value;
    if (!tipoCotizacion) { 
        mostrarAlerta('El tipo de cotización es requerido', 'error'); 
        return; 
    }
    
    // Primero manejar productos modificados
    if (productosModificados.size > 0) {
        await manejarProductosModificados();
    }
    
    mostrarLoading(true);
    
    try {
        const datosFormulario = new FormData(cotizacionForm);
        const cotizacionData = Object.fromEntries(datosFormulario.entries());
        const empresaInfo = empresasDirecciones[empresaSelector.value];
        
        // Usar el valor del campo oculto para tipo de cotización
        cotizacionData.tipoCotizacion = tipoCotizacionHidden.value || tipoCotizacionSelect.value;
        
        cotizacionData.empresaNombre = empresaInfo.nombre;
        cotizacionData.empresaDireccion = empresaInfo.direccion;
        cotizacionData.empresaTelefono = empresaInfo.telefono;
        cotizacionData.empresaRFC = empresaInfo.rfc;
        
        const itemsTableRows = itemsTableBody.children;
        const itemsData = Array.from(itemsTableRows).map(row => {
            const categoriaId = row.querySelector('.item-categoria').value;
            const categoriaNombre = obtenerNombreCategoria(categoriaId);
            
            return {
                categoria: categoriaId,
                categoriaNombre: categoriaNombre,
                tipoTecnologia: row.querySelector('.item-tipo-tecnologia').value,
                descripcion: row.querySelector('.item-descripcion').value,
                cantidad: parseFloat(row.querySelector('.item-cantidad').value),
                precio: parseFloat(row.querySelector('.item-precio').value),
                total: (parseFloat(row.querySelector('.item-cantidad').value) || 0) * (parseFloat(row.querySelector('.item-precio').value) || 0)
            };
        });
        
        if (itemsData.some(item => !item.descripcion || isNaN(item.cantidad) || isNaN(item.precio) || item.categoria === '')) {
            mostrarAlerta('Todos los items deben tener datos válidos y Categoría seleccionada.', 'error');
            mostrarLoading(false);
            return;
        }
        
        cotizacionData.items = itemsData;
        cotizacionData.esEntradaManual = isManualEntry;
        
        const subtotal = itemsData.reduce((sum, item) => sum + item.total, 0);
        const descuentoPorcentaje = parseFloat(cotizacionData.descuento) || 0;
        const impuestoPorcentaje = parseFloat(cotizacionData.impuesto) || 0;
        const descuentoMonto = subtotal * (descuentoPorcentaje / 100);
        const subtotalConDescuento = subtotal - descuentoMonto;
        const impuestoMonto = subtotalConDescuento * (impuestoPorcentaje / 100);
        
        cotizacionData.subtotal = subtotal;
        cotizacionData.descuentoMonto = descuentoMonto;
        cotizacionData.impuestoMonto = impuestoMonto;
        cotizacionData.totalFinal = subtotalConDescuento + impuestoMonto;
        
        // Actualizar la cotización
        const cotizacionOriginal = (await getDoc(doc(db, 'cotizacionPdf', editingId))).data();
        cotizacionData.generadoPor = cotizacionOriginal.generadoPor;
        cotizacionData.fechaCreacion = cotizacionOriginal.fechaCreacion;
        cotizacionData.fechaActualizacion = new Date().toISOString();
        cotizacionData.actualizadoPor = {
            uid: currentUser.uid,
            email: currentUser.email,
            nombre: currentUser.nombreCompleto
        };
        cotizacionData.estatus = 'actualizada';
        
        await updateDoc(doc(db, 'cotizacionPdf', editingId), cotizacionData);
        mostrarAlerta('✅ Cotización actualizada correctamente', 'success');
        
        // Generar y descargar PDF
        const pdfBlob = await generarPDF(cotizacionData);
        descargarPDFLocal(pdfBlob, `cotizacion-${cotizacionData.cotizacionNumero}-actualizada.pdf`);
        
        // Permitir cierre
        formularioGuardadoExitosamente = true;
        formularioHaSidoModificado = false;
        
        // Remover el evento beforeunload
        if (window._beforeunloadAdded) {
            window.removeEventListener('beforeunload', manejarCierrePestana);
            window._beforeunloadAdded = false;
        }
        
        // Redirigir al listado de cotizaciones
        setTimeout(() => {
            window.location.href = '../consultar-cotizaciones/consultar-cotizaciones.html';
        }, 1500);
        
    } catch (error) {
        console.error('Error al actualizar cotización:', error);
        mostrarAlerta('❌ Error al actualizar: ' + error.message, 'error');
    } finally {
        mostrarLoading(false);
    }
}

// === CONFIRMAR CIERRE MANUAL ===
async function confirmarCierre() {
    // Si no hay cambios, salir directamente
    if (!formularioHaSidoModificado) {
        window.location.href = '../consultar-cotizaciones/consultar-cotizaciones.html';
        return;
    }
    
    const result = await Swal.fire({
        title: '¿Estás seguro de salir?',
        html: `
            <div style="text-align: left; margin: 15px 0;">
                <p>Tienes cambios sin guardar en la cotización.</p>
                <p><strong>¿Qué deseas hacer?</strong></p>
            </div>
        `,
        icon: 'warning',
        showCancelButton: true,
        showDenyButton: true,
        confirmButtonText: 'Guardar y salir',
        denyButtonText: 'Salir sin guardar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#3085d6',
        denyButtonColor: '#d33',
        cancelButtonColor: '#6b7280',
        reverseButtons: true,
        allowOutsideClick: false,
        backdrop: true
    });

    if (result.isConfirmed) {
        // Guardar y salir - usando el submit del formulario
        await manejarSubmitFormulario(new Event('submit'));
    } else if (result.isDenied) {
        // Salir sin guardar
        isClosingConfirmed = true;
        window.location.href = '../consultar-cotizaciones/consultar-cotizaciones.html';
    }
    // Si cancela, no hacer nada
}

// === INICIALIZACIÓN ===
async function inicializarFormulario() {
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            Swal.fire({ 
                title: 'Acceso no autorizado', 
                text: 'Debes iniciar sesión para acceder a esta función', 
                icon: 'warning', 
                confirmButtonText: 'Iniciar sesión' 
            }).then(() => {
                window.location.href = '../nav-visitantes/inicio-de-sesion.html';
            });
            return;
        }
        
        currentUser = user;
        await cargarInformacionUsuario(user.email);
        await cargarClientes();
        await cargarCategorias();
        
        handleEmpresaChange();
        handleTipoCreditoChange();
        establecerFechaActual();
        
        // Obtener el ID de la cotización a editar
        const params = new URLSearchParams(window.location.search);
        const idCoti = params.get('id');
        
        if (idCoti) {
            await cargarCotizacionParaEdicion(idCoti);
        } else {
            // Si no hay ID, redirigir al listado
            mostrarAlerta('No se especificó una cotización para editar', 'error');
            setTimeout(() => {
                window.location.href = '../consultar-cotizaciones/consultar-cotizaciones.html';
            }, 2000);
        }
    });
}

// === EVENT LISTENERS PRINCIPALES ===
document.addEventListener('DOMContentLoaded', () => {
    inicializarFormulario();
});

cotizacionForm.addEventListener('submit', manejarSubmitFormulario);

agregarItemBtn.addEventListener('click', async () => {
    await verificarUltimoItemAntesDeAgregar();
    const nuevaFila = agregarItem();
    nuevaFila.querySelector('.item-categoria').focus();
    marcarFormularioModificado();
});

document.getElementById('cerrarModalBtn').addEventListener('click', confirmarCierre);
document.getElementById('cancelarBtn').addEventListener('click', confirmarCierre);

// Event listeners para cálculos
document.getElementById('descuento').addEventListener('input', () => {
    calcularTotales();
    marcarFormularioModificado();
});
document.getElementById('impuesto').addEventListener('input', () => {
    calcularTotales();
    marcarFormularioModificado();
});

// Event listeners para clientes
clienteSearch.addEventListener('input', buscarClientes);
clienteSearch.addEventListener('focus', mostrarDropdown);
document.addEventListener('click', function(e) {
    if (!e.target.closest('.cliente-search-container')) {
        ocultarDropdown();
    }
});

// Otros listeners
empresaSelector.addEventListener('change', handleEmpresaChange);
tipoCredito.addEventListener('change', handleTipoCreditoChange);

// Event listener para contador de caracteres
document.getElementById('cotizacionDescripcion').addEventListener('input', function() {
    const contador = document.getElementById('contadorCaracteres');
    contador.textContent = `${this.value.length}/500 caracteres`;
    marcarFormularioModificado();
});

// Agregar listeners para marcar el formulario como modificado
document.querySelectorAll('input, select, textarea').forEach(element => {
    if (!element.id.includes('Search') && element.id !== 'cerrarModalBtn' && element.id !== 'cancelarBtn') {
        element.addEventListener('change', marcarFormularioModificado);
        element.addEventListener('input', marcarFormularioModificado);
    }
});