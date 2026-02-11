// nueva-cotizacion.js - Módulo principal para formulario de cotización
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
let cotizacionTemporalId = null; // ID de la cotización temporal
let formularioGuardadoExitosamente = false;
let formularioHaSidoModificado = false; // Nueva variable para rastrear cambios
let isClosingConfirmed = false; // Control para confirmación de cierre
let tipoCotizacionBloqueado = false; // Variable para controlar si el tipo está bloqueado

// Variables para seguimiento de productos modificados
let productosModificados = new Map(); // Mapa de productos con precio modificado

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

// Obtener el nombre de la categoría por su ID
function obtenerNombreCategoria(categoriaId) {
    const categoria = categorias.find(c => c.id === categoriaId);
    return categoria ? categoria.nombre : categoriaId;
}

// === FUNCIÓN PARA BLOQUEAR EL SELECTOR DE TIPO DE COTIZACIÓN ===
function bloquearTipoCotizacion() {
    if (tipoCotizacionBloqueado) return;
    
    tipoCotizacionSelect.disabled = true;
    tipoCotizacionSelect.style.backgroundColor = '#f0f0f0';
    tipoCotizacionSelect.style.cursor = 'not-allowed';
    tipoCotizacionSelect.title = 'El tipo de cotización no puede ser cambiado una vez generado el número';
    tipoCotizacionBloqueado = true;
    
    // Agregar un mensaje informativo
    const tipoCotizacionContainer = tipoCotizacionSelect.parentElement;
    const mensajeInfo = document.createElement('small');
    mensajeInfo.className = 'form-text';
    mensajeInfo.textContent = 'Bloqueado (no editable después de generar el número)';
    mensajeInfo.style.color = '#666';
    mensajeInfo.style.display = 'block';
    mensajeInfo.style.marginTop = '2px';
    
    // Verificar si ya existe el mensaje
    if (!tipoCotizacionContainer.querySelector('.form-text:last-child')) {
        tipoCotizacionContainer.appendChild(mensajeInfo);
    } else {
        // Reemplazar el mensaje anterior
        const textoAnterior = tipoCotizacionContainer.querySelector('.form-text:last-child');
        tipoCotizacionContainer.replaceChild(mensajeInfo, textoAnterior);
    }
}

// === FUNCIÓN PARA DESBLOQUEAR EL SELECTOR DE TIPO DE COTIZACIÓN (para edición) ===
function desbloquearTipoCotizacion() {
    tipoCotizacionSelect.disabled = false;
    tipoCotizacionSelect.style.backgroundColor = '';
    tipoCotizacionSelect.style.cursor = '';
    tipoCotizacionSelect.title = '';
    tipoCotizacionBloqueado = false;
    
    // Remover el mensaje informativo
    const tipoCotizacionContainer = tipoCotizacionSelect.parentElement;
    const mensajeInfo = tipoCotizacionContainer.querySelector('.form-text:last-child');
    if (mensajeInfo && mensajeInfo.textContent.includes('Bloqueado')) {
        mensajeInfo.remove();
    }
}

// === 🚨 PROTECCIÓN CONTRA CIERRE ACCIDENTAL ===
function marcarFormularioModificado() {
    if (!formularioHaSidoModificado) {
        formularioHaSidoModificado = true;
        console.log('Formulario marcado como modificado');
        
        // Agregar el evento beforeunload cuando se modifica por primera vez
        if (!window._beforeunloadAdded) {
            window.addEventListener('beforeunload', manejarCierrePestana);
            window._beforeunloadAdded = true;
            console.log('Evento beforeunload agregado');
        }
    }
}

// Función para manejar el cierre de la pestaña
function manejarCierrePestana(e) {
    // Solo mostrar alerta si hay cambios sin guardar
    if (formularioHaSidoModificado && !formularioGuardadoExitosamente && !isClosingConfirmed) {
        // Mostrar el mensaje estándar del navegador
        e.preventDefault();
        e.returnValue = 'Tienes cambios sin guardar. ¿Estás seguro de querer salir?';
        
        // Opcional: También podemos guardar automáticamente aquí
        // pero es mejor dejar que el usuario decida
        
        return e.returnValue;
    }
}

// Función para guardar la cotización antes de salir
async function guardarCotizacionAntesDeSalir() {
    try {
        // Verificar si hay datos para guardar
        if (!formularioHaSidoModificado || !tipoCotizacionSelect.value) {
            console.log('No hay datos suficientes para guardar antes de salir');
            return false;
        }

        mostrarLoading(true);
        
        // Si no hay número de cotización, generar uno temporal
        if (!cotizacionNumeroInput.value) {
            await generarNumeroCotizacion();
        }

        // Guardar la cotización temporal
        await guardarCotizacionTemporal();
        
        mostrarAlerta('✅ Cotización guardada temporalmente', 'success');
        console.log('Cotización guardada antes de salir con ID:', cotizacionTemporalId);
        
        return true;
    } catch (error) {
        console.error('Error al guardar cotización antes de salir:', error);
        return false;
    } finally {
        mostrarLoading(false);
    }
}

// Función para mostrar SweetAlert cuando se cierra la pestaña
function mostrarAlertaCierrePestana() {
    // Esta función se llamará desde el botón de cierre personalizado
    // No se puede llamar desde beforeunload directamente
    return Swal.fire({
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

async function cargarContadores() {
    try {
        const contadoresSnapshot = await getDocs(collection(db, 'contadoresCotizaciones'));
        contadoresSnapshot.forEach((doc) => {
            contadores[doc.id] = doc.data().count || 0;
        });
    } catch (error) {
        console.error('Error al cargar contadores:', error);
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

        // Clientes específicos
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
            // Buscar solo en productos de la categoría seleccionada
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
            // Buscar en todos los productos
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

// === NUEVA FUNCIÓN PARA ACTUALIZAR PRODUCTO EN FIREBASE ===
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

// === NUEVA FUNCIÓN PARA CREAR NUEVO PRODUCTO EN FIREBASE ===
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

async function generarNumeroCotizacion() {
    try {
        const tipoCotizacion = tipoCotizacionSelect.value;
        if (!tipoCotizacion) { 
            cotizacionNumeroInput.value = ''; 
            return null; 
        }

        // Mostrar alerta informativa
        Swal.fire({
            title: 'Cotización Temporal',
            html: `
                <div style="text-align: left;">
                    <p>La cotización se almacenará temporalmente en el sistema.</p>
                    <p><strong>Recomendación:</strong> Termine de completar todos los datos para una cotización completa.</p>
                    <p>Número de cotización: <strong>Se generará automáticamente</strong></p>
                </div>
            `,
            icon: 'info',
            confirmButtonText: 'Entendido',
            confirmButtonColor: '#3085d6',
            allowOutsideClick: false
        });

        // Obtener el contador actual y actualizarlo inmediatamente
        const contadorRef = doc(db, 'contadoresCotizaciones', tipoCotizacion);
        const contadorDoc = await getDoc(contadorRef);
        let nuevoContador = contadorDoc.exists() ? contadorDoc.data().count + 1 : 1;
        
        // ACTUALIZAR EL CONTADOR EN LA BASE DE DATOS INMEDIATAMENTE
        await setDoc(contadorRef, { count: nuevoContador }, { merge: true });
        
        // Generar número de cotización
        const hoy = new Date();
        const fechaStr = `${hoy.getFullYear()}${String(hoy.getMonth() + 1).padStart(2, '0')}${String(hoy.getDate()).padStart(2, '0')}`;
        const numeroCompleto = `RSI-${fechaStr}-${tipoCotizacion.toUpperCase()}-${nuevoContador}`;
        
        cotizacionNumeroInput.value = numeroCompleto;
        contadores[tipoCotizacion] = nuevoContador;
        
        // BLOQUEAR EL SELECTOR DE TIPO DE COTIZACIÓN
        bloquearTipoCotizacion();
        
        marcarFormularioModificado();

        // Guardar cotización temporal
        await guardarCotizacionTemporal();
        
        return numeroCompleto;
    } catch (error) {
        console.error('Error al generar número de cotización:', error);
        const fecha = new Date();
        const numeroManual = `RSI-${fecha.getFullYear()}${String(fecha.getMonth() + 1).padStart(2, '0')}${String(fecha.getDate()).padStart(2, '0')}-MANUAL-1`;
        cotizacionNumeroInput.value = numeroManual;
        
        // BLOQUEAR EL SELECTOR DE TIPO DE COTIZACIÓN incluso en caso de error
        if (tipoCotizacionSelect.value) {
            bloquearTipoCotizacion();
        }
        
        return numeroManual;
    }
}

async function guardarCotizacionTemporal() {
    if (!tipoCotizacionSelect.value || !cotizacionNumeroInput.value) {
        return;
    }

    try {
        const datosFormulario = new FormData(cotizacionForm);
        const cotizacionData = Object.fromEntries(datosFormulario.entries());
        const empresaInfo = empresasDirecciones[empresaSelector.value];
        
        cotizacionData.empresaNombre = empresaInfo.nombre;
        cotizacionData.empresaDireccion = empresaInfo.direccion;
        cotizacionData.empresaTelefono = empresaInfo.telefono;
        cotizacionData.empresaRFC = empresaInfo.rfc;
        cotizacionData.tipoCotizacion = tipoCotizacionSelect.value;
        cotizacionData.esEntradaManual = isManualEntry;
        cotizacionData.estatus = 'borrador'; // Estado temporal
        
        // Obtener items actuales con nombres de categoría
        const itemsTableRows = itemsTableBody.children;
        const itemsData = Array.from(itemsTableRows).map(row => {
            const categoriaId = row.querySelector('.item-categoria').value;
            const categoriaNombre = obtenerNombreCategoria(categoriaId);
            
            return {
                categoria: categoriaId,
                categoriaNombre: categoriaNombre, // Agregar el nombre de la categoría
                tipoTecnologia: row.querySelector('.item-tipo-tecnologia').value,
                descripcion: row.querySelector('.item-descripcion').value,
                cantidad: parseFloat(row.querySelector('.item-cantidad').value) || 0,
                precio: parseFloat(row.querySelector('.item-precio').value) || 0
            };
        });
        
        cotizacionData.items = itemsData;
        cotizacionData.fechaCreacion = new Date().toISOString();
        cotizacionData.generadoPor = { 
            uid: currentUser?.uid || 'unknown', 
            email: currentUser?.email || 'unknown', 
            nombre: currentUser?.nombreCompleto || 'Usuario desconocido'
        };

        if (cotizacionTemporalId) {
            // Actualizar cotización temporal existente
            await updateDoc(doc(db, 'cotizacionPdf', cotizacionTemporalId), cotizacionData);
            console.log('Cotización temporal actualizada');
        } else {
            // Crear nueva cotización temporal
            const docRef = await addDoc(collection(db, 'cotizacionPdf'), cotizacionData);
            cotizacionTemporalId = docRef.id;
            console.log('Cotización temporal creada con ID:', cotizacionTemporalId);
        }
    } catch (error) {
        console.error('Error al guardar cotización temporal:', error);
    }
}

// === FUNCIÓN PARA VERIFICAR Y OFRECER GUARDAR NUEVO PRODUCTO ===
async function verificarNuevoProducto(row) {
    if (!row) return false;
    
    const descripcionInput = row.querySelector('.item-descripcion');
    const categoriaSelect = row.querySelector('.item-categoria');
    const precioInput = row.querySelector('.item-precio');
    
    const descripcion = descripcionInput.value.trim();
    const categoriaId = categoriaSelect.value;
    const precio = parseFloat(precioInput.value) || 0;
    
    if (descripcion && categoriaId && precio > 0) {
        // Verificar si el producto no existe en la lista de productos cargados
        const productoExistente = productos.find(p => p.nombre.toLowerCase() === descripcion.toLowerCase());
        
        if (!productoExistente) {
            // Preguntar si desea guardar como nuevo producto
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
                        // Recargar productos de la categoría para incluir el nuevo
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

// === FUNCIÓN PARA VERIFICAR EL ÚLTIMO ITEM ANTES DE AGREGAR UNO NUEVO ===
async function verificarUltimoItemAntesDeAgregar() {
    const rows = itemsTableBody.children;
    if (rows.length === 0) return;
    
    const ultimaFila = rows[rows.length - 1];
    return await verificarNuevoProducto(ultimaFila);
}

// === FUNCIÓN MEJORADA PARA AGREGAR ITEM ===
// === FUNCIÓN MEJORADA PARA AGREGAR ITEM - CON DRAG & DROP ===
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

    // Inicializar atributos de datos
    row.setAttribute('data-producto-id', '');
    row.setAttribute('data-precio-original', '0');
    row.setAttribute('data-producto-nombre', '');

    // Configurar eventos para la nueva fila
    const categoriaSelect = row.querySelector('.item-categoria');
    const tipoTecnologiaSelect = row.querySelector('.item-tipo-tecnologia');
    const descripcionInput = row.querySelector('.item-descripcion');
    const productoDropdown = row.querySelector('.producto-search-dropdown');
    const cantidadInput = row.querySelector('.item-cantidad');
    const precioInput = row.querySelector('.item-precio');
    const eliminarBtn = row.querySelector('.eliminar-item');

    // Variables para rastrear el producto seleccionado
    let productoIdSeleccionado = null;
    let precioOriginalProducto = null;
    let nombreProductoSeleccionado = null;
    
    // === FUNCIÓN PARA VERIFICAR CAMBIO DE PRECIO EN PRODUCTO DE BASE DE DATOS ===
    async function verificarCambioPrecioProducto() {
        // Solo verificar si hay un producto seleccionado de la base de datos
        if (!productoIdSeleccionado || !precioOriginalProducto) {
            return false;
        }
        
        const precioActual = parseFloat(precioInput.value) || 0;
        
        // Si el precio cambió significativamente (diferencia > 0.01)
        if (Math.abs(precioActual - precioOriginalProducto) > 0.01) {
            const result = await Swal.fire({
                title: '¿Actualizar producto?',
                html: `
                    <div style="text-align: left; margin: 15px 0;">
                        <p style="font-size: 1.1rem; margin-bottom: 10px;">
                            <strong>${nombreProductoSeleccionado || 'Producto'}</strong>
                        </p>
                        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px;">
                            <p style="margin: 5px 0;">
                                <span style="color: #6b7280;">Precio original:</span> 
                                <span style="font-weight: 600;">$${precioOriginalProducto.toFixed(2)}</span>
                            </p>
                            <p style="margin: 5px 0;">
                                <span style="color: #6b7280;">Nuevo precio:</span> 
                                <span style="font-weight: 600; color: #2563eb;">$${precioActual.toFixed(2)}</span>
                            </p>
                        </div>
                        <p style="margin-top: 15px;">¿Desea actualizar el precio en la base de datos?</p>
                    </div>
                `,
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: '✅ Sí, actualizar',
                cancelButtonText: '❌ No, mantener',
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#6b7280',
                reverseButtons: true
            });
            
            if (result.isConfirmed) {
                mostrarLoading(true);
                try {
                    const actualizado = await actualizarProductoEnFirebase(productoIdSeleccionado, precioActual);
                    if (actualizado) {
                        mostrarAlerta('✅ Producto actualizado correctamente', 'success');
                        // Actualizar el precio original al nuevo valor
                        precioOriginalProducto = precioActual;
                    }
                } catch (error) {
                    console.error('Error al actualizar producto:', error);
                    mostrarAlerta('Error al actualizar el producto', 'error');
                } finally {
                    mostrarLoading(false);
                }
            }
            return true;
        }
        return false;
    }

    // === FUNCIÓN PARA BUSCAR Y MOSTRAR PRODUCTOS DE LA CATEGORÍA SELECCIONADA ===
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

    // === MANEJO DE TECLA ENTER/TAB PARA NAVEGACIÓN ===
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

    // === ENTER EN EL ÚLTIMO CAMPO: VERIFICA CAMBIO DE PRECIO Y NUEVO PRODUCTO ===
    precioInput.addEventListener('keydown', async (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            
            // Calcular total primero
            calcularTotalItem(row);
            
            // Verificar cambio de precio en producto de base de datos
            await verificarCambioPrecioProductoEnFila(row);
            
            // Verificar si es un producto nuevo
            await verificarNuevoProducto(row);
            
            // Agregar nuevo item
            const nuevaFila = agregarItem();
            const primerCampoNuevaFila = nuevaFila.querySelector('.item-categoria');
            if (primerCampoNuevaFila) {
                primerCampoNuevaFila.focus();
            }
            marcarFormularioModificado();
        } else if (e.key === 'Tab' && !e.shiftKey) {
            e.preventDefault();
            eliminarBtn.focus();
        }
    });

    // Evento para cambio de categoría
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

    // Evento para búsqueda de productos
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

    // Evento para clic en el campo de descripción
    descripcionInput.addEventListener('click', function() {
        const categoriaId = categoriaSelect.value;
        const searchText = this.value.trim();
        
        if (categoriaId && (searchText.length >= 2 || productos.length > 0)) {
            buscarProductosCategoriaSeleccionada();
        }
    });

    // Evento para ocultar dropdown al hacer clic fuera
    document.addEventListener('click', function(e) {
        if (!descripcionInput.contains(e.target) && !productoDropdown.contains(e.target)) {
            productoDropdown.style.display = 'none';
        }
    });

    // Eventos para cálculos
    cantidadInput.addEventListener('input', () => {
        if (cantidadInput.value.includes('.')) {
            cantidadInput.value = Math.floor(parseFloat(cantidadInput.value));
        }
        calcularTotalItem(row);
        marcarFormularioModificado();
    });
    
    precioInput.addEventListener('input', function() {
        calcularTotalItem(row);
        marcarFormularioModificado();
    });
    
    // Evento para cuando el campo de precio pierde el foco - verificar cambio
    precioInput.addEventListener('blur', async function() {
        if (productoIdSeleccionado) {
            await verificarCambioPrecioProducto();
        }
    });
    
    // Prevenir entrada de decimales en cantidad
    cantidadInput.addEventListener('keypress', function(e) {
        if (e.key === '.' || e.key === ',') {
            e.preventDefault();
        }
    });
    
    eliminarBtn.addEventListener('click', () => eliminarItem(row));

    // === EVENTOS PARA DRAG AND DROP - RESTAURADOS ===
    row.addEventListener('dragstart', function(e) {
        e.dataTransfer.setData('text/plain', '');
        this.classList.add('dragging');
    });
    
    row.addEventListener('dragend', function() {
        this.classList.remove('dragging');
    });
    
    row.addEventListener('dragover', function(e) {
        e.preventDefault();
    });
    
    row.addEventListener('drop', function(e) {
        e.preventDefault();
        const draggingRow = document.querySelector('.dragging');
        if (draggingRow && draggingRow !== this) {
            const parent = this.parentNode;
            const rows = Array.from(parent.children);
            const draggingIndex = rows.indexOf(draggingRow);
            const targetIndex = rows.indexOf(this);
            
            if (draggingIndex < targetIndex) {
                parent.insertBefore(draggingRow, this.nextSibling);
            } else {
                parent.insertBefore(draggingRow, this);
            }
            
            // Recalcular totales después de reordenar
            calcularTotales();
            marcarFormularioModificado();
        }
    });

    calcularTotalItem(row);
    
    // Sobrescribir la función mostrarProductosDropdown para esta fila específica
    const originalMostrarProductosDropdown = mostrarProductosDropdown;
    window.mostrarProductosDropdown = function(dropdown, productosList, descInput, priceInput) {
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
                
                descInput.value = nombre;
                priceInput.value = precio;
                
                // Guardar información del producto seleccionado
                productoIdSeleccionado = id;
                precioOriginalProducto = precio;
                nombreProductoSeleccionado = nombre;
                descInput.setAttribute('data-producto-id', id);
                
                dropdown.style.display = 'none';
                marcarFormularioModificado();
                
                const row = descInput.closest('tr');
                calcularTotalItem(row);
                priceInput.focus();
            });
        });
    };
    
    return row;
}

// === FUNCIÓN GLOBAL PARA MOSTRAR PRODUCTOS EN DROPDOWN ===
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
            precioInput.value = precio;
            
            // Guardar información del producto seleccionado en la fila
            const row = descripcionInput.closest('tr');
            row.setAttribute('data-producto-id', id);
            row.setAttribute('data-precio-original', precio);
            row.setAttribute('data-producto-nombre', nombre);
            
            dropdown.style.display = 'none';
            marcarFormularioModificado();
            
            calcularTotalItem(row);
            precioInput.focus();
        });
    });
}

// === FUNCIÓN PARA INICIALIZAR DRAG AND DROP EN TODA LA TABLA ===
function inicializarDragDropTabla() {
    const tableBody = document.getElementById('itemsTableBody');
    
    tableBody.addEventListener('dragover', function(e) {
        e.preventDefault();
    });
    
    tableBody.addEventListener('drop', function(e) {
        e.preventDefault();
        const draggingRow = document.querySelector('.dragging');
        if (draggingRow) {
            draggingRow.classList.remove('dragging');
            calcularTotales();
            marcarFormularioModificado();
        }
    });
}

function calcularTotalItem(row) {
    const cantidad = parseFloat(row.querySelector('.item-cantidad').value) || 0;
    const precio = parseFloat(row.querySelector('.item-precio').value) || 0;
    const total = cantidad * precio;
    row.querySelector('.item-total').textContent = formatearMoneda(total);
    calcularTotales();
    
    // Guardar cambios temporales
    if (tipoCotizacionSelect.value && cotizacionNumeroInput.value) {
        guardarCotizacionTemporal();
    }
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
        // Guardar cambios temporales
        if (tipoCotizacionSelect.value && cotizacionNumeroInput.value) {
            guardarCotizacionTemporal();
        }
    } else {
        mostrarAlerta('Debe mantener al menos un item.', 'warning');
    }
}

// === NUEVA FUNCIÓN PARA MANEJAR PRODUCTOS MODIFICADOS ===
async function manejarProductosModificados() {
    if (productosModificados.size === 0) {
        return;
    }

    try {
        mostrarLoading(true);
        
        // Crear un array de promesas para actualizar productos
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
        
        // Ejecutar todas las actualizaciones
        if (actualizaciones.length > 0) {
            await Promise.all(actualizaciones);
            mostrarAlerta('✅ Productos actualizados correctamente', 'success');
        }
        
        // Limpiar el mapa de productos modificados
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
    
    // Guardar cambios temporales
    if (tipoCotizacionSelect.value && cotizacionNumeroInput.value) {
        guardarCotizacionTemporal();
    }
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
    
    // Desbloquear el tipo de cotización al resetear
    desbloquearTipoCotizacion();
    
    // Remover el evento beforeunload si existe
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
    
    // ÁREAS RESERVADAS PARA ENCABEZADO Y PIE DE PÁGINA
    const headerHeight = 70;      // Altura reservada para el encabezado (logo + info empresa)
    const footerHeight = 15;     // Altura reservada para el pie de página
    const contentStartY = headerHeight;  // Y donde comienza el contenido
    const contentMaxY = pageHeight - footerHeight - 10;  // Y máximo para contenido (reserva pie)
    
    const textColor = '#000000';
    const gray = '#6b7280';
    const navy = '#0d2c54';
    const lightGray = '#f5f5f5';
    
    const formatearNumero = (num) => new Intl.NumberFormat('es-MX', { 
        style: 'currency', 
        currency: 'MXN' 
    }).format(num).replace('MX', '').trim();
    
    const colX = { 
        desc: margin, 
        unidad: margin + 90, 
        cant: margin + 110, 
        precio: margin + 130, 
        total: margin + 160 
    };
    
    let page = 1;
    let y = contentStartY;  // Iniciar después del encabezado reservado
    
    // ============================================
    // FUNCIÓN PARA DIBUJAR ENCABEZADO EN CADA PÁGINA
    // ============================================
    const dibujarEncabezado = async () => {
        // Logo
        try {
            const logoData = await getBase64ImageFromURL(LOGO_URL);
            pdf.addImage(logoData, 'PNG', pageWidth - margin - 40, margin, 40, 40);
        } catch (e) { 
            console.warn('No se pudo cargar el logo:', e); 
        }
        
        // Información de la empresa
        pdf.setFontSize(10).setTextColor(navy)
            .text(data.empresaNombre || "RSI ENTERPRISE", margin, margin + 5);
        pdf.setFontSize(8).setTextColor(gray)
            .text(data.empresaDireccion || "", margin, margin + 10)
            .text(`RFC: ${data.empresaRFC || ''} | Tel: ${data.empresaTelefono || ''}`, margin, margin + 15);
        
        // Título de cotización
        pdf.setFontSize(14).setTextColor(navy)
            .text("COTIZACIÓN", pageWidth / 2, margin + 25, { align: 'center' });
        pdf.setFontSize(9).setTextColor(gray)
            .text(`No. ${data.cotizacionNumero} | Fecha: ${new Date(data.cotizacionFecha).toLocaleDateString('es-MX')}`, 
                  pageWidth / 2, margin + 32, { align: 'center' });
    };
    
    // ============================================
    // FUNCIÓN PARA DIBUJAR PIE DE PÁGINA EN CADA PÁGINA
    // ============================================
    const dibujarPiePagina = () => {
        pdf.setFontSize(8)
            .setTextColor(gray)
            .text(`Cotización No. ${data.cotizacionNumero} | Página ${page}`, 
                  pageWidth / 2, pageHeight - footerHeight, { align: 'center' });
        
        // Línea separadora opcional
        pdf.setDrawColor(200, 200, 200)
            .line(margin, pageHeight - footerHeight - 3, pageWidth - margin, pageHeight - footerHeight - 3);
    };
    
    // ============================================
    // FUNCIÓN PARA NUEVA PÁGINA CON ENCABEZADO Y PIE
    // ============================================
    const nuevaPagina = async () => {
        pdf.addPage();
        page++;
        y = contentStartY;  // Reiniciar Y al inicio del área de contenido
        
        await dibujarEncabezado();  // Dibujar encabezado en nueva página
        dibujarPiePagina();         // Dibujar pie de página en nueva página
    };
    
    // Dibujar encabezado y pie en la primera página
    await dibujarEncabezado();
    dibujarPiePagina();
    
    // Descripción (si existe)
    if (data.cotizacionDescripcion && data.cotizacionDescripcion.trim().length > 0) {
        // Verificar espacio disponible
        if (y + 15 > contentMaxY) {
            await nuevaPagina();
        }
        
        pdf.setFontSize(9).setTextColor(navy).setFont('helvetica', 'bold')
            .text("DESCRIPCIÓN:", margin, y); 
        y += 5;
        pdf.setFontSize(9).setTextColor(textColor).setFont('helvetica', 'normal');
        const descLines = pdf.splitTextToSize(data.cotizacionDescripcion.trim(), pageWidth - 2 * margin);
        descLines.forEach(line => { 
            // Verificar espacio antes de cada línea
            if (y + 5 > contentMaxY) {
                // No podemos esperar async aquí, necesitamos manejar de forma diferente
                // Por simplicidad, si no hay espacio, cortamos la descripción
                pdf.text(line.substring(0, 50) + "...", margin, y);
                y += 5;
            } else {
                pdf.text(line, margin, y); 
                y += 5;
            }
        });
        y += 5;
    }
    
    // Información del cliente
    if (y + 30 > contentMaxY) {
        await nuevaPagina();
    }
    
    pdf.setFontSize(9).setTextColor(textColor)
        .text(`Cliente: ${data.clienteNombre}`, margin, y); 
    y += 5;
    pdf.text(`RFC: ${data.clienteRFC || 'N/E'}`, margin, y); 
    y += 5; 
    pdf.text(`Dirección: ${data.clienteDireccion}`, margin, y); 
    y += 10;
    
    // Información de la cotización
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
    
    // Mapa de nombres de categoría para mostrar en el PDF
    const categoriaDisplayMap = {
        'CCTV': '📹 CCTV', 
        'DETECTOR DE HUMO': '🏠 DETECTOR DE HUMO',
        'DH': '🏠 DETECTOR DE HUMO',
        'CONTROL DE ACCESOS': '🔐 CONTROL DE ACCESOS',
        'CA': '🔐 CONTROL DE ACCESOS',
        'ALARMA INTRUSION': '🚨 ALARMA INTRUSIÓN', 
        'ALARMA INTRUSIÓN': '🚨 ALARMA INTRUSIÓN',
        'ALARMA': '🚨 ALARMA INTRUSIÓN',
        'MULTIMEDIA': '📺 MULTIMEDIA', 
        'REDES': '🛜 REDES TRANSPORTE DE DATOS', 
        'OTRO': '📦 OTRO',
        'AI': '🚨 ALARMA INTRUSIÓN',
        'SIN CATEGORÍA': '📦 OTRO'
    };
    
    // Items agrupados por categoría
    const grupos = agruparTecnologias(data.items); 
    
    for (const [categoriaNombre, items] of Object.entries(grupos)) {
        // Verificar espacio para el encabezado de categoría
        if (y + 25 > contentMaxY) {
            await nuevaPagina();
        }
        
        // Usar el mapa de categorías o el nombre directamente
        const textoCompleto = categoriaDisplayMap[categoriaNombre] || categoriaNombre;
        const displayCategoria = textoCompleto.replace(/^(.*?)\s/, '').trim();
        
        // Encabezado de categoría
        pdf.setFillColor(navy).rect(margin, y - 2, pageWidth - 2 * margin, 12, 'F');
        pdf.setFontSize(12).setTextColor('#FFFFFF').setFont('helvetica', 'bold')
            .text(displayCategoria, pageWidth / 2, y + 6, { align: 'center' });
        y += 14;
        
        // Encabezado de tabla
        pdf.setFillColor(navy).rect(margin, y - 2, pageWidth - 2 * margin, 8, 'F');
        pdf.setFontSize(8).setFont('helvetica', 'normal').setTextColor('#FFFFFF')
            .text("DESCRIPCIÓN", colX.desc, y + 3)
            .text("UNIDAD", colX.unidad, y + 3, { align: 'center' })
            .text("CANT.", colX.cant, y + 3, { align: 'right' })
            .text("P. UNIT.", colX.precio, y + 3, { align: 'right' })
            .text("TOTAL", colX.total, y + 3, { align: 'right' });
        y += 10;
        
        // Items de la categoría
        for (const item of items) {
            // Asegurar que tenemos el nombre completo de la categoría en el item
            if (!item.categoriaNombre && item.categoria) {
                item.categoriaNombre = obtenerNombreCategoria(item.categoria);
            }
            
            const descLines = pdf.splitTextToSize(item.descripcion, colX.unidad - colX.desc - 5);
            const itemHeight = Math.max(descLines.length * 5, 10) + 4;
            
            // Verificar si hay espacio para el item completo
            if (y + itemHeight + 5 > contentMaxY) {
                await nuevaPagina();
                // Redibujar encabezado de categoría en la nueva página si es necesario
                pdf.setFillColor(navy).rect(margin, y - 2, pageWidth - 2 * margin, 12, 'F');
                pdf.setFontSize(12).setTextColor('#FFFFFF').setFont('helvetica', 'bold')
                    .text(displayCategoria, pageWidth / 2, y + 6, { align: 'center' });
                y += 14;
                
                // Redibujar encabezado de tabla
                pdf.setFillColor(navy).rect(margin, y - 2, pageWidth - 2 * margin, 8, 'F');
                pdf.setFontSize(8).setFont('helvetica', 'normal').setTextColor('#FFFFFF')
                    .text("DESCRIPCIÓN", colX.desc, y + 3)
                    .text("UNIDAD", colX.unidad, y + 3, { align: 'center' })
                    .text("CANT.", colX.cant, y + 3, { align: 'right' })
                    .text("P. UNIT.", colX.precio, y + 3, { align: 'right' })
                    .text("TOTAL", colX.total, y + 3, { align: 'right' });
                y += 10;
            }
            
            // Dibujar fondo alternado
            if (items.indexOf(item) % 2 === 0) {
                pdf.setFillColor(lightGray).rect(margin, y - 2, pageWidth - 2 * margin, itemHeight, 'F');
            }
            
            pdf.setTextColor(textColor);
            // Descripción
            descLines.forEach((line, i) => {
                if (y + 3 + (i * 5) < contentMaxY) {
                    pdf.text(line, colX.desc, y + 3 + (i * 5));
                }
            });
            
            // Unidad, cantidad, precio, total
            pdf.text(item.tipoTecnologia ? item.tipoTecnologia.slice(0, 4) : '', colX.unidad, y + 3, { align: 'center' });
            pdf.text(item.cantidad ? item.cantidad.toString() : '0', colX.cant, y + 3, { align: 'right' });
            pdf.text(formatearNumero(item.precio || 0), colX.precio, y + 3, { align: 'right' });
            pdf.text(formatearNumero(item.total || 0), colX.total, y + 3, { align: 'right' });
            
            // Línea separadora
            pdf.setDrawColor(200, 200, 200).line(margin, y + itemHeight - 2, pageWidth - margin, y + itemHeight - 2);
            y += itemHeight;
        }
        
        y += 4;
    }
    
    // Totales
    if (y + 40 > contentMaxY) {
        await nuevaPagina();
    }
    
    const tableStartX = colX.total - 82;
    const valueColX = tableStartX + 70;
    
    pdf.setFontSize(9).setTextColor(textColor)
        .text("Subtotal:", tableStartX, y, { align: 'left' })
        .text(formatearNumero(data.subtotal || 0), valueColX, y, { align: 'left' });
    y += 6;
    
    if (data.descuentoMonto > 0) { 
        pdf.text(`Descuento (${data.descuento || 0}%):`, tableStartX, y, { align: 'left' })
            .text(`-${formatearNumero(data.descuentoMonto || 0)}`, valueColX, y, { align: 'left' });
        y += 6; 
    }
    
    pdf.text(`IVA (${data.impuesto || 16}%):`, tableStartX, y, { align: 'left' })
        .text(formatearNumero(data.impuestoMonto || 0), valueColX, y, { align: 'left' });
    y += 8;
    
    pdf.setFont('helvetica', 'bold').setTextColor(navy)
        .text("TOTAL:", tableStartX, y, { align: 'left' })
        .text(`${formatearNumero(data.totalFinal || 0)} ${data.cotizacionMoneda || 'MXN'}`, valueColX, y, { align: 'left' });
    y += 15;
    
    // Términos y condiciones
    if (data.terminos) {
        if (y + 15 > contentMaxY) {
            await nuevaPagina();
        }
        
        pdf.setFontSize(9).setTextColor(navy).setFont('helvetica', 'normal')
            .text("TÉRMINOS Y CONDICIONES", margin, y); 
        y += 5;
        pdf.setTextColor(textColor);
        
        const terminosLines = data.terminos.split('\n');
        for (const term of terminosLines) {
            if (term.trim()) {
                const lines = pdf.splitTextToSize(term, pageWidth - 2 * margin);
                for (const line of lines) {
                    if (y + 5 > contentMaxY) {
                        await nuevaPagina();
                    }
                    pdf.text(line, margin, y); 
                    y += 5;
                }
            }
        }
    }
    
    // Asegurar que el pie de página esté en la última página
    dibujarPiePagina();
    
    return pdf.output('blob');
}

// === LÓGICA DE INICIALIZACIÓN Y EDICIÓN ===
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
        await cargarContadores();
        
        handleEmpresaChange();
        handleTipoCreditoChange();
        establecerFechaActual();
        
        // Verificar si estamos editando
        const params = new URLSearchParams(window.location.search);
        const idCoti = params.get('id');
        
        if (idCoti) {
            await cargarCotizacionParaEdicion(idCoti);
        } else {
            resetearFormulario();
            
            // Configurar evento para generar número de cotización
            tipoCotizacionSelect.addEventListener('change', async function() {
                if (this.value && !tipoCotizacionBloqueado) {
                    await generarNumeroCotizacion();
                }
            });
        }
    });
}

async function cargarCotizacionParaEdicion(id) {
    mostrarLoading(true);
    try {
        const docSnap = await getDoc(doc(db, 'cotizacionPdf', id));
        if (docSnap.exists()) {
            const cotizacion = docSnap.data();
            
            isEditing = true;
            editingId = id;
            modalTitle.textContent = '✏️ Editar Cotización';
            document.getElementById('pageTitle').textContent = '✏️ Editar Cotización';
            cotizacionForm.querySelector('button[type="submit"]').innerHTML = '<span>💾</span> Actualizar Cotización PDF';

            // Llenar campos
            document.getElementById('cotizacionNumero').value = cotizacion.cotizacionNumero || '';
            document.getElementById('cotizacionVigencia').value = cotizacion.cotizacionVigencia || 30;
            document.getElementById('cotizacionMoneda').value = cotizacion.cotizacionMoneda || 'MXN';
            document.getElementById('cotizacionFecha').value = cotizacion.cotizacionFecha || '';
            document.getElementById('tipoCotizacion').value = cotizacion.tipoCotizacion || '';
            document.getElementById('descuento').value = cotizacion.descuento || 0;
            document.getElementById('impuesto').value = cotizacion.impuesto || 16;
            document.getElementById('terminos').value = cotizacion.terminos || '';
            document.getElementById('cotizacionDescripcion').value = cotizacion.cotizacionDescripcion || '';

            // Datos de la Empresa 
            empresaSelector.value = cotizacion.empresaNombre?.includes('NEZA') ? 'RSI NEZA' : 'RSI IXT';
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
                    
                    // Restaurar información del producto si existe
                    if (item.productoId) {
                        lastRow.setAttribute('data-producto-id', item.productoId);
                        lastRow.setAttribute('data-precio-original', item.precio);
                        lastRow.setAttribute('data-producto-nombre', item.descripcion);
                    }
                    
                    calcularTotalItem(lastRow);
                });
            } else {
                agregarItem();
            }
            
            calcularTotales();
            
            // Si ya hay un número de cotización, bloquear el tipo
            if (cotizacion.cotizacionNumero) {
                bloquearTipoCotizacion();
            }
            
            // Marcar como modificado
            formularioHaSidoModificado = true;
            marcarFormularioModificado(); // Esto agregará el evento beforeunload

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
    
    const tipoCotizacion = tipoCotizacionSelect.value;
    if (!tipoCotizacion) { 
        mostrarAlerta('Debe seleccionar un tipo de cotización', 'error'); 
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
                categoriaNombre: categoriaNombre, // Agregar el nombre de la categoría
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
        cotizacionData.tipoCotizacion = tipoCotizacion;
        
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
        
        // No es necesario actualizar el contador aquí porque ya se actualizó cuando se generó el número
        
        // Actualizar o crear la cotización
        if (isEditing && editingId) {
            // Mantener datos existentes
            const cotizacionOriginal = (await getDoc(doc(db, 'cotizacionPdf', editingId))).data();
            cotizacionData.generadoPor = cotizacionOriginal.generadoPor;
            cotizacionData.fechaCreacion = cotizacionOriginal.fechaCreacion;
            cotizacionData.estatus = 'completada';
            
            await updateDoc(doc(db, 'cotizacionPdf', editingId), cotizacionData);
            mostrarAlerta('✅ Cotización actualizada y completada', 'success');
        } else if (cotizacionTemporalId) {
            // Actualizar cotización temporal existente
            cotizacionData.estatus = 'completada';
            cotizacionData.generadoPor = { 
                uid: currentUser.uid, 
                email: currentUser.email, 
                nombre: currentUser.nombreCompleto, 
                fechaGeneracion: new Date().toISOString() 
            };
            cotizacionData.fechaCreacion = new Date().toISOString();
            
            await updateDoc(doc(db, 'cotizacionPdf', cotizacionTemporalId), cotizacionData);
            mostrarAlerta('✅ Cotización completada', 'success');
        } else {
            // Crear nueva cotización
            cotizacionData.fechaCreacion = new Date().toISOString();
            cotizacionData.estatus = 'completada';
            cotizacionData.generadoPor = { 
                uid: currentUser.uid, 
                email: currentUser.email, 
                nombre: currentUser.nombreCompleto, 
                fechaGeneracion: new Date().toISOString() 
            };
            
            await addDoc(collection(db, 'cotizacionPdf'), cotizacionData);
            mostrarAlerta('✅ Cotización creada', 'success');
        }
        
        // Generar y descargar PDF
        const pdfBlob = await generarPDF(cotizacionData);
        descargarPDFLocal(pdfBlob, `cotizacion-${cotizacionData.cotizacionNumero}.pdf`);
        
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
        console.error('Error al guardar cotización:', error);
        mostrarAlerta('❌ Error al guardar: ' + error.message, 'error');
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
    
    const result = await mostrarAlertaCierrePestana();

    if (result.isConfirmed) {
        // Guardar y salir
        const guardadoExitoso = await guardarCotizacionAntesDeSalir();
        if (guardadoExitoso) {
            formularioGuardadoExitosamente = true;
            isClosingConfirmed = true;
            window.location.href = '../consultar-cotizaciones/consultar-cotizaciones.html';
        } else {
            mostrarAlerta('No se pudo guardar la cotización', 'error');
        }
    } else if (result.isDenied) {
        // Salir sin guardar
        isClosingConfirmed = true;
        window.location.href = '../consultar-cotizaciones/consultar-cotizaciones.html';
    } else {
        // Cancelar - quedarse en la página
        // No hacer nada
    }
}

// === NUEVA FUNCIÓN PARA CONFIGURAR NAVEGACIÓN CON ENTER/TAB ===
function configurarNavegacionFormulario() {
    // Obtener todos los campos del formulario en orden
    const camposFormulario = [
        // Datos de la Empresa
        empresaSelector,
        empresaRFC,
        empresaTelefono,
        
        // Búsqueda de Cliente
        clienteSearch,
        
        // Si es entrada manual, incluir estos campos
        // (se agregarán dinámicamente si es necesario)
    ];
    
    // Agregar listener para navegación en cada campo
    camposFormulario.forEach((campo, index) => {
        if (campo && campo.addEventListener) {
            campo.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === 'Tab') {
                    e.preventDefault();
                    const siguienteIndex = index + 1;
                    if (siguienteIndex < camposFormulario.length && camposFormulario[siguienteIndex]) {
                        camposFormulario[siguienteIndex].focus();
                        if (camposFormulario[siguienteIndex].select) {
                            camposFormulario[siguienteIndex].select();
                        }
                    }
                }
            });
        }
    });
    
    // Campos del cliente (solo si es entrada manual)
    const camposCliente = [clienteNombre, clienteRFC, clienteDireccion, clienteTelefono];
    camposCliente.forEach((campo, index) => {
        if (campo && campo.addEventListener) {
            campo.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === 'Tab') {
                    e.preventDefault();
                    const siguienteIndex = index + 1;
                    if (siguienteIndex < camposCliente.length && camposCliente[siguienteIndex]) {
                        camposCliente[siguienteIndex].focus();
                        if (camposCliente[siguienteIndex].select) {
                            camposCliente[siguienteIndex].select();
                        }
                    } else {
                        // Ir al siguiente campo principal
                        tipoCotizacionSelect.focus();
                    }
                }
            });
        }
    });
    
    // Campos de Información de Cotización
    const camposCotizacion = [
        tipoCotizacionSelect,
        document.getElementById('cotizacionFecha'),
        document.getElementById('cotizacionVigencia'),
        document.getElementById('cotizacionMoneda'),
        tipoCredito,
        diasCredito,
        document.getElementById('cotizacionDescripcion')
    ];
    
    camposCotizacion.forEach((campo, index) => {
        if (campo && campo.addEventListener) {
            campo.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === 'Tab') {
                    e.preventDefault();
                    const siguienteIndex = index + 1;
                    if (siguienteIndex < camposCotizacion.length && camposCotizacion[siguienteIndex]) {
                        camposCotizacion[siguienteIndex].focus();
                        if (camposCotizacion[siguienteIndex].select) {
                            camposCotizacion[siguienteIndex].select();
                        }
                    } else {
                        // Ir al primer item de la tabla
                        const primeraCategoria = document.querySelector('.item-categoria');
                        if (primeraCategoria) {
                            primeraCategoria.focus();
                        }
                    }
                }
            });
        }
    });
}
// =================================================================================
// CONSTANTES Y CONFIGURACIÓN
// =================================================================================
const LOGO_URL = '../../css/img/Logo-RSI-OFICIAL.png';
let logoBase64Cache = null;
// =================================================================================
// FUNCIONES DE UTILIDAD
// =================================================================================

async function getBase64ImageFromURL(url) {
    if (logoBase64Cache) return logoBase64Cache;
    
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous'; 
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            const dataURL = canvas.toDataURL('image/png');
            logoBase64Cache = dataURL; 
            resolve(dataURL);
        };
        img.onerror = (e) => {
            console.error("Error al cargar la imagen:", e);
            reject(new Error('No se pudo cargar la imagen del logo.'));
        };
        img.src = url;
    });
}

// === NUEVA FUNCIÓN PARA VERIFICAR CAMBIO DE PRECIO EN UNA FILA ESPECÍFICA ===
async function verificarCambioPrecioProductoEnFila(row) {
    if (!row) return false;
    
    const productoId = row.getAttribute('data-producto-id');
    const nombreProducto = row.getAttribute('data-producto-nombre');
    const precioOriginal = parseFloat(row.getAttribute('data-precio-original')) || 0;
    const precioInput = row.querySelector('.item-precio');
    const precioActual = parseFloat(precioInput.value) || 0;
    
    // Solo verificar si hay un producto seleccionado de la base de datos y el precio cambió
    if (!productoId || !precioOriginal || Math.abs(precioActual - precioOriginal) <= 0.01) {
        return false;
    }
    
    const result = await Swal.fire({
        title: '¿Actualizar producto?',
        html: `
            <div style="text-align: left; margin: 15px 0;">
                <p style="font-size: 1.1rem; margin-bottom: 10px;">
                    <strong>${nombreProducto || 'Producto'}</strong>
                </p>
                <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px;">
                    <p style="margin: 5px 0;">
                        <span style="color: #6b7280;">Precio original:</span> 
                        <span style="font-weight: 600;">$${precioOriginal.toFixed(2)}</span>
                    </p>
                    <p style="margin: 5px 0;">
                        <span style="color: #6b7280;">Nuevo precio:</span> 
                        <span style="font-weight: 600; color: #2563eb;">$${precioActual.toFixed(2)}</span>
                    </p>
                </div>
                <p style="margin-top: 15px;">¿Desea actualizar el precio en la base de datos?</p>
            </div>
        `,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: '✅ Sí, actualizar',
        cancelButtonText: '❌ No, mantener',
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#6b7280',
        reverseButtons: true
    });
    
    if (result.isConfirmed) {
        mostrarLoading(true);
        try {
            const actualizado = await actualizarProductoEnFirebase(productoId, precioActual);
            if (actualizado) {
                mostrarAlerta('✅ Producto actualizado correctamente', 'success');
                // Actualizar el precio original en la fila
                row.setAttribute('data-precio-original', precioActual);
            }
        } catch (error) {
            console.error('Error al actualizar producto:', error);
            mostrarAlerta('Error al actualizar el producto', 'error');
        } finally {
            mostrarLoading(false);
        }
        return true;
    }
    return false;
}
// === EVENT LISTENERS PRINCIPALES ===
document.addEventListener('DOMContentLoaded', () => {
    inicializarFormulario();
    inicializarDragDropTabla(); // Agregar esta línea
    // Configurar navegación después de inicializar
    setTimeout(configurarNavegacionFormulario, 500);
});

cotizacionForm.addEventListener('submit', manejarSubmitFormulario);

// === MODIFICACIÓN PRINCIPAL: EL EVENT LISTENER DEL BOTÓN "AGREGAR ITEM" ===
// === MODIFICACIÓN PRINCIPAL: EL EVENT LISTENER DEL BOTÓN "AGREGAR ITEM" ===
agregarItemBtn.addEventListener('click', async () => {
    // Verificar si hay items en la tabla
    const rows = itemsTableBody.children;
    if (rows.length > 0) {
        const ultimaFila = rows[rows.length - 1];
        
        // Verificar cambio de precio en el último item
        const categoriaSelect = ultimaFila.querySelector('.item-categoria');
        const descripcionInput = ultimaFila.querySelector('.item-descripcion');
        const precioInput = ultimaFila.querySelector('.item-precio');
        const productoId = ultimaFila.getAttribute('data-producto-id');
        const precioOriginal = parseFloat(ultimaFila.getAttribute('data-precio-original')) || 0;
        const precioActual = parseFloat(precioInput.value) || 0;
        
        // Si tiene producto seleccionado y el precio cambió
        if (productoId && precioOriginal > 0 && Math.abs(precioActual - precioOriginal) > 0.01) {
            await verificarCambioPrecioProductoEnFila(ultimaFila);
        }
        
        // Luego verificar si es un producto nuevo
        await verificarNuevoProducto(ultimaFila);
    }
    
    // Luego agregar el nuevo item
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

// Agregar listeners para marcar el formulario como modificado en todos los campos
document.querySelectorAll('input, select, textarea').forEach(element => {
    if (!element.id.includes('Search') && element.id !== 'cerrarModalBtn' && element.id !== 'cancelarBtn') {
        element.addEventListener('change', marcarFormularioModificado);
        element.addEventListener('input', marcarFormularioModificado);
    }
});