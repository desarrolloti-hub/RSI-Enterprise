// finalizar-reembolsos.js
// Configuración de Firebase
const firebaseConfig = {
    apiKey: "AIzaSyBJy992gkvsT77-_fMp_O_z99wtjZiK77Y",
    authDomain: "rsienterprise.firebaseapp.com",
    projectId: "rsienterprise",
    databaseURL: "https://rsienterprise-default-rtdb.firebaseio.com",
    storageBucket: "rsienterprise.appspot.com",
    messagingSenderId: "1063117165770",
    appId: "1:1063117165770:web:8555f26b25ae80bc42d033",
    measurementId: "G-38F2DBG9HE"
};

// Inicializar Firebase
if (firebase.apps.length === 0) {
    firebase.initializeApp(firebaseConfig);
}

const db = firebase.firestore();
const auth = firebase.auth();
const storage = firebase.storage();

let currentReimbursement = null;
let totalAmount = 0;
let currentPaidAmount = 0; 
let currentUserInfo = null;

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM cargado, inicializando Firebase...');
    
    // Verificar si hay un usuario autenticado
    auth.onAuthStateChanged((user) => {
        if (user) {
            console.log('Usuario autenticado:', user.email);
            // Obtener información adicional del usuario desde Firestore
            getUserInfo(user.uid);
        } else {
            console.log('No hay usuario autenticado');
            // Si no hay usuario autenticado, usar valores por defecto
            currentUserInfo = {
                nombre: 'Sistema/Admin',
                email: 'sistema@admin.com',
                area: 'Administración'
            };
        }
    });

    loadReimbursementData();
    setupEventListeners();
});

/**
 * Obtiene la información del usuario actual desde Firestore
 */
async function getUserInfo(userId) {
    try {
        console.log('Obteniendo información del usuario:', userId);
        const userDoc = await db.collection('colaboradores').where('uid', '==', userId).get();
        
        if (!userDoc.empty) {
            const userData = userDoc.docs[0].data();
            currentUserInfo = {
                nombre: userData.NOMBRE || userData.displayName || 'Administrador',
                email: userData['CORREO ELECTRÓNICO EMPRESARIAL'] || auth.currentUser.email,
                area: userData['ÁREA'] || userData.departamento || 'Administración'
            };
            console.log('Información del usuario obtenida:', currentUserInfo);
        } else {
            // Intentar buscar por email
            const emailQuery = await db.collection('colaboradores')
                .where('CORREO ELECTRÓNICO EMPRESARIAL', '==', auth.currentUser.email)
                .get();
                
            if (!emailQuery.empty) {
                const userData = emailQuery.docs[0].data();
                currentUserInfo = {
                    nombre: userData.NOMBRE || 'Administrador',
                    email: auth.currentUser.email,
                    area: userData['ÁREA'] || 'Administración'
                };
            } else {
                // Si no existe en la colección, usar datos básicos de auth
                currentUserInfo = {
                    nombre: auth.currentUser.displayName || 'Administrador',
                    email: auth.currentUser.email,
                    area: 'Administración'
                };
            }
            console.log('Usuario no encontrado en Firestore, usando datos básicos:', currentUserInfo);
        }
    } catch (error) {
        console.error('Error al obtener información del usuario:', error);
        // En caso de error, usar datos básicos
        currentUserInfo = {
            nombre: auth.currentUser?.displayName || 'Administrador',
            email: auth.currentUser?.email || 'sistema@admin.com',
            area: 'Administración'
        };
    }
}

/**
 * Carga los datos del reembolso desde la URL y los inicializa.
 */
function loadReimbursementData() {
    console.log('Cargando datos del reembolso desde URL...');
    const urlParams = new URLSearchParams(window.location.search);
    
    currentReimbursement = {
        id: urlParams.get('id'),
        monto: parseFloat(urlParams.get('monto')) || 0,
        nombre: urlParams.get('nombre') || 'N/A',
        area: urlParams.get('area') || 'N/A',
        descripcion: urlParams.get('descripcion') || 'Sin descripción',
        emailEmpresarial: urlParams.get('emailEmpresarial') || 'N/A',
        estado: urlParams.get('estado') || 'Pendiente',
        fechaSolicitud: urlParams.get('fechaSolicitud')
    };

    console.log('Datos del reembolso:', currentReimbursement);

    // Convertir a número entero (sin centavos)
    totalAmount = Math.round(currentReimbursement.monto);

    document.getElementById('reimbursementId').textContent = currentReimbursement.id;
    document.getElementById('employeeName').textContent = currentReimbursement.nombre;
    document.getElementById('employeeArea').textContent = currentReimbursement.area;
    document.getElementById('employeeEmail').textContent = currentReimbursement.emailEmpresarial;
    document.getElementById('reimbursementDescription').textContent = currentReimbursement.descripcion;
    document.getElementById('totalAmount').textContent = `$${totalAmount}`;
    document.getElementById('displayTotalAmount').textContent = `$${totalAmount}`;

    // Formatear fecha
    if (currentReimbursement.fechaSolicitud) {
        const date = new Date(currentReimbursement.fechaSolicitud);
        document.getElementById('requestDate').textContent = date.toLocaleDateString('es-ES') + ' ' + date.toLocaleTimeString('es-ES');
    } else {
        document.getElementById('requestDate').textContent = 'N/A';
    }

    loadAdditionalData();
}

/**
 * Carga datos adicionales (monto pagado previamente y comprobante original) desde Firebase.
 */
async function loadAdditionalData() {
    try {
        console.log('Cargando datos adicionales de Firebase...');
        const doc = await db.collection('Reembolsos').doc(currentReimbursement.id).get();
        if (doc.exists) {
            const data = doc.data();
            console.log('Datos de Firebase:', data);
            
            document.getElementById('currentStatus').textContent = data.estado || 'Pendiente';
            
            // Mostrar comprobante original si existe (ya sea URL de Storage o Base64)
            if (data.imagenUrl) {
                document.getElementById('comprobanteImage').src = data.imagenUrl;
                document.getElementById('comprobanteSection').style.display = 'block';
            } else if (data.comprobanteBase64) {
                document.getElementById('comprobanteImage').src = data.comprobanteBase64;
                document.getElementById('comprobanteSection').style.display = 'block';
            }

            // Convertir a número entero (sin centavos)
            currentPaidAmount = Math.round(parseFloat(data.montoPagado || 0));
            document.getElementById('displayPreviousPaid').textContent = `$${currentPaidAmount}`;
            
            // Dejar el campo vacío en lugar de 0
            document.getElementById('amountPaid').value = '';
            document.getElementById('amountPaid').placeholder = 'Ej: 500';

            updateCalculations();
        } else {
            console.log('No se encontró el documento en Firebase');
        }
    } catch (error) {
        console.error('Error al cargar datos adicionales:', error);
    }
}

/**
 * Configura los listeners de eventos para los campos de formulario.
 */
function setupEventListeners() {
    const amountPaidInput = document.getElementById('amountPaid');
    const paymentProofInput = document.getElementById('paymentProof');

    amountPaidInput.addEventListener('input', updateCalculations);
    paymentProofInput.addEventListener('change', handlePaymentProofUpload);
    
    console.log('Event listeners configurados');
}

/**
 * Función para subir archivo a Storage
 */
async function uploadFileToStorage(file, folder = 'comprobantes-pago') {
    return new Promise((resolve, reject) => {
        if (!file) {
            reject(new Error("No se proporcionó ningún archivo"));
            return;
        }

        // Validar tamaño (máximo 5MB)
        if (file.size > 5 * 1024 * 1024) {
            reject(new Error("El archivo no debe superar los 5MB"));
            return;
        }

        const timestamp = Date.now();
        const fileName = `${folder}/${currentReimbursement.id}/${timestamp}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
        
        console.log('Intentando subir archivo:', fileName);
        
        try {
            const storageRef = storage.ref().child(fileName);
            
            const uploadTask = storageRef.put(file, {
                contentType: file.type
            });
            
            uploadTask.on('state_changed', 
                (snapshot) => {
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    console.log(`Subiendo: ${Math.round(progress)}%`);
                },
                (error) => {
                    console.error('Error detallado:', error);
                    
                    if (error.code === 'storage/unauthorized') {
                        reject(new Error('No tienes permisos para subir archivos'));
                    } else if (error.code === 'storage/canceled') {
                        reject(new Error('Subida cancelada'));
                    } else {
                        reject(new Error(`Error al subir: ${error.message}`));
                    }
                },
                async () => {
                    try {
                        const downloadURL = await uploadTask.snapshot.ref.getDownloadURL();
                        console.log('Archivo subido exitosamente:', downloadURL);
                        resolve({
                            url: downloadURL,
                            path: fileName
                        });
                    } catch (error) {
                        console.error('Error al obtener URL:', error);
                        reject(new Error('Error al obtener la URL del archivo'));
                    }
                }
            );
        } catch (error) {
            console.error('Error al crear referencia:', error);
            reject(new Error('Error al inicializar la subida'));
        }
    });
}

/**
 * Convierte el archivo del comprobante de pago a URL de Storage o Base64 como fallback
 */
async function handlePaymentProofUpload(event) {
    const file = event.target.files[0];
    const preview = document.getElementById('paymentProofPreview');

    if (file) {
        console.log('Archivo seleccionado:', file.name, file.type, 'Tamaño:', file.size);
        
        // Validar tamaño del archivo (máximo 5MB)
        if (file.size > 5 * 1024 * 1024) {
            window.showCustomError('Archivo muy grande', 'El archivo no debe exceder 5MB.');
            event.target.value = '';
            return;
        }

        // Guardar el archivo en una variable global para subirlo después
        window.selectedPaymentFile = file;
        
        // Mostrar vista previa si es imagen
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = function(e) {
                preview.src = e.target.result;
                preview.classList.remove('hidden');
            };
            reader.readAsDataURL(file);
        } else {
            preview.classList.add('hidden');
        }
    } else {
        window.selectedPaymentFile = null;
        preview.classList.add('hidden');
        console.log('No se seleccionó archivo');
    }
}

/**
 * Actualiza los cálculos de montos y el indicador de estado.
 */
function updateCalculations() {
    const transactionAmount = parseInt(document.getElementById('amountPaid').value) || 0;
    const totalPaidAfterTransaction = currentPaidAmount + transactionAmount; 
    const remainingAmount = totalAmount - totalPaidAfterTransaction; 

    // Actualizar displays (sin decimales)
    document.getElementById('displayCurrentTransaction').textContent = `$${transactionAmount}`;
    document.getElementById('displayTotalPaid').textContent = `$${totalPaidAfterTransaction}`;
    document.getElementById('displayRemainingAmount').textContent = `$${Math.max(remainingAmount, 0)}`;

    const statusIndicator = document.getElementById('statusIndicator');
    const statusText = document.getElementById('statusText');
    const statusBadge = document.getElementById('statusBadge');

    statusIndicator.classList.remove('hidden');

    if (remainingAmount <= 0 && transactionAmount > 0) {
        statusIndicator.className = 'remaining-amount remaining-full';
        statusText.textContent = '¡Reembolso completado con este pago!';
        statusBadge.className = 'status-indicator status-pagado';
        statusBadge.textContent = 'PAGADO';
    } else if (transactionAmount > 0) {
        statusIndicator.className = 'remaining-amount remaining-partial';
        statusText.textContent = `Pago registrado - Pendiente: $${remainingAmount}`;
        statusBadge.className = 'status-indicator status-pago-parcial';
        statusBadge.textContent = 'PAGO REGISTRADO';
    } else {
        statusIndicator.className = 'remaining-amount remaining-none';
        statusText.textContent = 'Ingresa el monto a pagar';
        statusBadge.className = 'status-indicator status-pendiente';
        statusBadge.textContent = 'PENDIENTE';
    }
}

/**
 * Valida el pago y muestra la confirmación de SweetAlert.
 */
function updatePayment() {
    console.log('Iniciando proceso de pago...');
    const transactionAmount = parseInt(document.getElementById('amountPaid').value) || 0;
    const paymentNotes = document.getElementById('paymentNotes').value;
    
    // Validar que el monto sea un número válido y positivo
    if (isNaN(transactionAmount) || transactionAmount <= 0) {
        window.showCustomError(
            'Monto Inválido', 
            'Por favor, ingresa un monto válido mayor a cero para esta transacción.'
        );
        return;
    }

    const totalPaidAfterTransaction = currentPaidAmount + transactionAmount;
    const remainingAmount = totalAmount - totalPaidAfterTransaction;

    // Validar que no exceda el monto total
    if (totalPaidAfterTransaction > totalAmount) { 
        window.showCustomError('Error de Monto', 'El monto reembolsado total no puede ser mayor al monto total de la solicitud.');
        return;
    }

    // Determinar el nuevo estado
    let nuevoEstado = remainingAmount <= 0 ? 'Pagado' : 'Pago Parcial';

    window.showCustomConfirm(
        nuevoEstado === 'Pagado' ? '¡Confirmar Pago Completo!' : 'Confirmar Registro de Pago',
        `Monto de esta transacción: $${transactionAmount}\n` +
        `Monto acumulado pagado: $${totalPaidAfterTransaction}\n` +
        `Saldo pendiente: $${Math.max(remainingAmount, 0)}\n\n` +
        `El estado será: ${nuevoEstado}`,
        'Registrar Pago'
    ).then((result) => {
        if (result.isConfirmed) {
            savePaymentToFirebase(transactionAmount, totalPaidAfterTransaction, nuevoEstado, paymentNotes);
        }
    });
}

/**
 * Guarda el pago en Firebase y actualiza el estado. 
 */
async function savePaymentToFirebase(transactionAmount, totalPaid, nuevoEstado, paymentNotes) {
    try {
        console.log('Iniciando guardado en Firebase...');
        
        // Mostrar indicador de carga
        Swal.fire({
            title: 'Procesando...',
            text: 'Registrando el pago y subiendo archivos',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });
        
        // Obtener información del usuario que realiza el reembolso
        const userInfo = currentUserInfo || {
            nombre: 'Sistema/Admin',
            email: 'sistema@admin.com',
            area: 'Administración'
        };

        // Crear un ID único para esta transacción
        const transactionId = 'trans_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

        // Usar números enteros (sin decimales)
        const transactionRecord = {
            id: transactionId,
            montoTransaccion: parseInt(transactionAmount),
            fechaTransaccion: firebase.firestore.Timestamp.now(),
            fechaHora: new Date().toLocaleString('es-ES'),
            notas: String(paymentNotes || 'Transacción registrada').substring(0, 500),
            registradoPor: {
                nombre: String(userInfo.nombre).substring(0, 100),
                email: String(userInfo.email).substring(0, 100),
                area: String(userInfo.area || 'Administración').substring(0, 100)
            }
        };

        // Subir comprobante a Storage si existe
        if (window.selectedPaymentFile) {
            try {
                Swal.getHtmlContainer().innerHTML = '<p>Subiendo comprobante de pago...</p>';
                const uploadResult = await uploadFileToStorage(window.selectedPaymentFile, 'comprobantes-pago');
                transactionRecord.comprobanteUrl = uploadResult.url;
                transactionRecord.comprobantePath = uploadResult.path;
                console.log('Comprobante subido a Storage:', uploadResult.url);
            } catch (uploadError) {
                console.error('Error al subir a Storage, usando fallback Base64:', uploadError);
                // Fallback a Base64 si Storage falla
                const reader = new FileReader();
                const base64 = await new Promise((resolve) => {
                    reader.onload = (e) => resolve(e.target.result);
                    reader.readAsDataURL(window.selectedPaymentFile);
                });
                if (base64.length < 500000) {
                    transactionRecord.comprobanteBase64 = base64;
                }
            }
        }

        console.log('Registro de transacción preparado:', transactionRecord);
        
        // Primero obtener el documento actual para preservar los datos existentes
        const docRef = db.collection('Reembolsos').doc(currentReimbursement.id);
        const doc = await docRef.get();
        
        let transaccionesExistentes = [];
        if (doc.exists && doc.data().transacciones) {
            transaccionesExistentes = doc.data().transacciones;
        }
        
        // Agregar la nueva transacción al array
        transaccionesExistentes.push(transactionRecord);
        
        const updateData = {
            montoPagado: parseInt(totalPaid),
            transacciones: transaccionesExistentes,
            estado: String(nuevoEstado),
            ultimaActualizacion: firebase.firestore.Timestamp.now(),
            ultimoReembolsoPor: {
                nombre: String(userInfo.nombre).substring(0, 100),
                email: String(userInfo.email).substring(0, 100),
                area: String(userInfo.area || 'Administración').substring(0, 100),
                fechaHora: new Date().toLocaleString('es-ES')
            }
        };

        console.log('Actualizando documento...');
        await docRef.update(updateData);

        Swal.close();
        
        window.showCustomSuccess(
            'Pago Registrado',
            `El pago de $${transactionAmount} ha sido registrado exitosamente.\nEstado: ${nuevoEstado}\nRegistrado por: ${userInfo.nombre}`
        );

        // Redirigir al historial
        setTimeout(() => {
            window.location.href = 'rembolso.html'; 
        }, 1500);

    } catch (error) {
        console.error('Error completo al guardar el pago:', error);
        Swal.close();
        
        // Método alternativo: Si sigue fallando, crear un nuevo documento de transacciones
        if (error.message.includes('invalid nested entity') || error.message.includes('transacciones')) {
            console.log('Intentando método alternativo...');
            try {
                await savePaymentAlternative(transactionAmount, totalPaid, nuevoEstado, paymentNotes);
                return;
            } catch (altError) {
                console.error('Error en método alternativo:', altError);
            }
        }
        
        window.showCustomError('Error de Registro', 'Hubo un error al guardar el pago. Por favor, intenta nuevamente.');
    }
}

/**
 * Método alternativo si el array sigue fallando
 */
async function savePaymentAlternative(transactionAmount, totalPaid, nuevoEstado, paymentNotes) {
    // Obtener información del usuario que realiza el reembolso
    const userInfo = currentUserInfo || {
        nombre: 'Sistema/Admin',
        email: 'sistema@admin.com',
        area: 'Administración'
    };
    
    // Crear un ID único para esta transacción
    const transactionId = 'trans_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    
    // Crear registro de transacción
    const transactionRecord = {
        id: transactionId,
        montoTransaccion: parseInt(transactionAmount),
        fechaTransaccion: firebase.firestore.Timestamp.now(),
        fechaHora: new Date().toLocaleString('es-ES'),
        notas: String(paymentNotes || 'Transacción registrada').substring(0, 500),
        registradoPor: {
            nombre: String(userInfo.nombre).substring(0, 100),
            email: String(userInfo.email).substring(0, 100),
            area: String(userInfo.area || 'Administración').substring(0, 100)
        }
    };
    
    // Subir comprobante a Storage si existe
    if (window.selectedPaymentFile) {
        try {
            const uploadResult = await uploadFileToStorage(window.selectedPaymentFile, 'comprobantes-pago');
            transactionRecord.comprobanteUrl = uploadResult.url;
            transactionRecord.comprobantePath = uploadResult.path;
        } catch (uploadError) {
            console.error('Error al subir a Storage en método alternativo:', uploadError);
        }
    }
    
    // Primero obtener el documento actual
    const docRef = db.collection('Reembolsos').doc(currentReimbursement.id);
    const doc = await docRef.get();
    
    let transaccionesExistentes = [];
    if (doc.exists && doc.data().transacciones) {
        transaccionesExistentes = doc.data().transacciones;
    }
    
    // Agregar al historial existente
    transaccionesExistentes.push(transactionRecord);
    
    // Actualizar con el nuevo array completo
    await docRef.update({
        montoPagado: parseInt(totalPaid),
        transacciones: transaccionesExistentes,
        estado: String(nuevoEstado),
        ultimaActualizacion: firebase.firestore.Timestamp.now(),
        ultimoReembolsoPor: {
            nombre: String(userInfo.nombre).substring(0, 100),
            email: String(userInfo.email).substring(0, 100),
            area: String(userInfo.area || 'Administración').substring(0, 100),
            fechaHora: new Date().toLocaleString('es-ES')
        }
    });
    
    window.showCustomSuccess(
        'Pago Registrado',
        `El pago de $${transactionAmount} ha sido registrado exitosamente.\nEstado: ${nuevoEstado}\nRegistrado por: ${userInfo.nombre}`
    );

    setTimeout(() => {
        window.location.href = 'rembolso.html'; 
    }, 1500);
}

function goBack() {
    window.history.back();
}

// Funciones auxiliares para mostrar alertas
window.showCustomError = function(title, text) {
    Swal.fire({
        icon: 'error',
        title: title,
        text: text,
        confirmButtonColor: '#dc3545'
    });
};

window.showCustomSuccess = function(title, text) {
    Swal.fire({
        icon: 'success',
        title: title,
        text: text,
        confirmButtonColor: '#28a745'
    });
};

window.showCustomConfirm = function(title, text, confirmButtonText) {
    return Swal.fire({
        title: title,
        text: text,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: confirmButtonText,
        cancelButtonText: 'Cancelar'
    });
};