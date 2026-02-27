// pedir-rembolsos.js
import { db, auth } from '/config/firebase-config.js';  // Solo importamos db y auth, storage se usará globalmente

document.addEventListener('DOMContentLoaded', function() {
    let allReimbursements = []; // Almacenar todos los reembolsos cargados
    let current_userData = null;

    // Elementos del DOM
    const employeeAvatar = document.getElementById('employeeAvatar');
    const employeeDetails = document.getElementById('employeeDetails');
    const reimbursementForm = document.getElementById('reimbursementForm');
    const submitBtn = document.getElementById('submitReimbursement');
    const amountInput = document.getElementById('amount');
    const descriptionInput = document.getElementById('description');
    const photoFileInput = document.getElementById('photoFile');
    const previewImage = document.getElementById('previewImage');
    const fileText = document.getElementById('fileText');
    const alertOverlay = document.getElementById('alertOverlay');
    const alertBtn = document.getElementById('alertBtn');
    const errorAlert = document.getElementById('errorAlert');
    const errorBtn = document.getElementById('errorBtn');
    const reimbursementHistory = document.getElementById('reimbursementHistory');
    const reimbursementList = document.getElementById('reimbursementList');
    const loadingHistory = document.getElementById('loadingHistory');
    const noReimbursements = document.getElementById('noReimbursements');
    const toggleHistoryBtn = document.getElementById('toggleHistoryBtn');
    const backToFormBtn = document.getElementById('backToFormBtn');
    
    // Elementos para el detalle
    const reimbursementDetail = document.getElementById('reimbursementDetail');
    const backToHistoryBtn = document.getElementById('backToHistoryBtn');
    const detailAmount = document.getElementById('detailAmount');
    const detailStatus = document.getElementById('detailStatus');
    const detailDescription = document.getElementById('detailDescription');
    const detailDate = document.getElementById('detailDate');
    const detailImage = document.getElementById('detailImage');

    // --- Funcionalidad de Alternar Vistas ---
    function toggleView(view) { // view puede ser 'form', 'history', 'detail'
        const hrDivider = document.querySelector('.attendance-container > hr');

        reimbursementForm.style.display = 'none';
        reimbursementHistory.style.display = 'none';
        reimbursementDetail.style.display = 'none';
        toggleHistoryBtn.style.display = 'none';
        hrDivider.style.display = 'none';

        if (view === 'form') {
            reimbursementForm.style.display = 'flex';
            toggleHistoryBtn.style.display = 'block';
            hrDivider.style.display = 'block';
        } else if (view === 'history') {
            reimbursementHistory.style.display = 'block';
            if (current_userData && current_userData['CORREO ELECTRÓNICO EMPRESARIAL']) {
                loadReimbursementHistory(current_userData['CORREO ELECTRÓNICO EMPRESARIAL']);
            }
        } else if (view === 'detail') {
            reimbursementDetail.style.display = 'block';
        }
    }

    // Event Listeners para alternar
    toggleHistoryBtn.addEventListener('click', () => toggleView('history'));
    backToFormBtn.addEventListener('click', () => toggleView('form'));
    backToHistoryBtn.addEventListener('click', () => toggleView('history'));

    // --- Utilidades ---
    function showAlert(type, title, message) {
        alertOverlay.classList.remove('show');
        errorAlert.classList.remove('show');
        
        const targetAlert = type === 'error' ? errorAlert : alertOverlay;
        const icon = type === 'error' ? 'fa-exclamation-circle' : 'fa-check-circle';
        const iconElement = targetAlert.querySelector('.alert-icon i');

        targetAlert.querySelector('.alert-title').textContent = title;
        targetAlert.querySelector('.alert-message').innerHTML = message;
        iconElement.className = `fas ${icon}`;
        
        targetAlert.classList.add('show');
    }

    async function getUserData(email) {
        try {
            const querySnapshot = await db.collection('colaboradores')
                .where('CORREO ELECTRÓNICO EMPRESARIAL', '==', email)
                .limit(1)
                .get();
            if (!querySnapshot.empty) {
                return { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() };
            }
            return null;
        } catch (error) {
            console.error("Error al obtener datos del usuario:", error);
            return null;
        }
    }
    
    function displayUserInfo(user) {
        employeeDetails.innerHTML = `
            <h3>${user.NOMBRE || 'Nombre no disponible'}</h3>
            <p><strong>Área:</strong> ${user['ÁREA'] || 'No especificado'}</p>
            <p><strong>ID Empleado:</strong> ${user.NIT || 'ID no disponible'}</p>
            <p><strong>Email:</strong> ${user['CORREO ELECTRÓNICO EMPRESARIAL'] || 'No disponible'}</p>
        `;
        
        if (user.imagen) {
            employeeAvatar.src = user.imagen;
        } else {
            const name = user.NOMBRE || '';
            const initials = name.split(' ').map(n => n[0]).join('').toUpperCase();
            employeeAvatar.src = `https://ui-avatars.com/api/?name=${initials}&background=c84e4e&color=fff&size=128`;
        }
    }
    
    // Función para subir archivo a Storage - VERSIÓN CORREGIDA (igual que manuales.js)
    // Función para subir archivo a Storage - CON MANEJO DE ERRORES CORS
async function uploadFileToStorage(file, userData) {
    return new Promise((resolve, reject) => {
        if (!file) {
            reject(new Error("No se proporcionó ningún archivo"));
            return;
        }

        // Validar tipo de archivo
        if (!file.type.startsWith('image/')) {
            reject(new Error("Solo se permiten archivos de imagen"));
            return;
        }

        // Validar tamaño (máximo 5MB para evitar problemas)
        if (file.size > 5 * 1024 * 1024) {
            reject(new Error("La imagen no debe superar los 5MB"));
            return;
        }

        const timestamp = Date.now();
        const fileName = `reembolsos/${userData.id}/${timestamp}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
        
        console.log('Intentando subir archivo:', fileName);
        
        try {
            const storageRef = firebase.storage().ref().child(fileName);
            
            // Intentar con metadata simplificada
            const uploadTask = storageRef.put(file, {
                contentType: file.type
            });
            
            uploadTask.on('state_changed', 
                (snapshot) => {
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    submitBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Subiendo: ${Math.round(progress)}%`;
                },
                (error) => {
                    console.error('Error detallado:', error);
                    
                    // Mensajes amigables según el error
                    if (error.code === 'storage/unauthorized') {
                        reject(new Error('No tienes permisos para subir archivos'));
                    } else if (error.code === 'storage/canceled') {
                        reject(new Error('Subida cancelada'));
                    } else if (error.code === 'storage/unknown' && error.message.includes('CORS')) {
                        reject(new Error('Error de CORS. Por favor, contacta al administrador para configurar el bucket.'));
                    } else {
                        reject(new Error(`Error al subir: ${error.message}`));
                    }
                },
                async () => {
                    try {
                        const downloadURL = await uploadTask.snapshot.ref.getDownloadURL();
                        console.log('Archivo subido exitosamente:', downloadURL);
                        resolve(downloadURL);
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

    photoFileInput.addEventListener('change', function() {
        const file = this.files[0];
        if (file) {
            fileText.textContent = `Archivo seleccionado: ${file.name}`;
            const reader = new FileReader();
            reader.onload = function(e) {
                previewImage.src = e.target.result;
                previewImage.style.display = 'block';
            };
            reader.readAsDataURL(file);
        } else {
            fileText.textContent = 'Haz clic para subir una imagen';
            previewImage.style.display = 'none';
            previewImage.src = '';
        }
    });

    // --- Lógica de Envío del Reembolso ---
    async function submitReimbursement(userData) {
        if (!userData || !userData.id) {
            throw new Error("Datos de usuario no cargados. Intenta recargar la página.");
        }
        const amount = parseFloat(amountInput.value);
        const description = descriptionInput.value.trim();
        const photoFile = photoFileInput.files[0];

        if (isNaN(amount) || amount <= 0 || !description || !photoFile) {
            throw new Error("Por favor, completa todos los campos correctamente.");
        }

        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Subiendo comprobante...';
        submitBtn.disabled = true;

        try {
            // 1. Subir la imagen a Firebase Storage
            const imageUrl = await uploadFileToStorage(photoFile, userData);
            
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando datos...';
            
            // 2. Crear el documento en Firestore con la URL de la imagen
            const now = new Date();
            const timestamp = firebase.firestore.Timestamp.fromDate(now);

            const reimbursementData = {
                userId: userData.id,
                nombre: userData.NOMBRE,
                emailEmpresarial: userData['CORREO ELECTRÓNICO EMPRESARIAL'],
                area: userData['ÁREA'],
                monto: amount,
                descripcion: description,
                imagenUrl: imageUrl,
                imagenPath: `reembolsos/${userData.id}/${Date.now()}_${photoFile.name}`,
                fechaSolicitud: timestamp,
                estado: 'Pendiente',
                detallesColaborador: {
                    nombre: userData.NOMBRE || 'N/A',
                    rfc: userData.RFC || 'N/A',
                    nit: userData.NIT || 'N/A',
                }
            };

            await db.collection('Reembolsos').add(reimbursementData);

            showAlert(
                'success',
                '¡Reembolso Enviado!',
                `Monto: $${amount.toFixed(2)}<br>Tu solicitud ha sido enviada con éxito.`
            );
            
            setTimeout(() => {
                alertOverlay.classList.remove('show');
                toggleView('history');
                submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Enviar Solicitud de Reembolso';
                submitBtn.disabled = false;
                reimbursementForm.reset();
                previewImage.style.display = 'none';
                fileText.textContent = 'Haz clic para subir una imagen';
            }, 1500);
            
        } catch (error) {
            console.error("Error al procesar el reembolso:", error);
            throw error;
        }
    }

    reimbursementForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        try {
            await submitReimbursement(current_userData);
        } catch (error) {
            console.error("Error al procesar el reembolso:", error);
            showAlert(
                'error',
                'Error al enviar',
                error.message || 'Hubo un problema desconocido. Intenta nuevamente.'
            );
            submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Enviar Solicitud de Reembolso';
            submitBtn.disabled = false;
        }
    });

    // --- Lógica de Detalle del Reembolso ---
    function showReimbursementDetail(reimbursement) {
        const date = reimbursement.fechaSolicitud && typeof reimbursement.fechaSolicitud.toDate === 'function'
            ? reimbursement.fechaSolicitud.toDate().toLocaleDateString('es-ES') + ' ' + reimbursement.fechaSolicitud.toDate().toLocaleTimeString('es-ES')
            : 'N/A';
        
        const statusTag = createStatusTag(reimbursement.estado);

        document.getElementById('detailTitle').textContent = `Reembolso por $${reimbursement.monto.toFixed(2)}`;
        detailAmount.textContent = `$${reimbursement.monto.toFixed(2)}`;
        detailStatus.innerHTML = statusTag;
        detailDescription.textContent = reimbursement.descripcion;
        detailDate.textContent = date;
        
        if (reimbursement.imagenUrl) {
            detailImage.src = reimbursement.imagenUrl;
            detailImage.style.display = 'block';
        } else {
            detailImage.style.display = 'none';
            detailImage.src = '';
        }

        toggleView('detail');
    }

    // --- Lógica de Carga y Filtrado del Historial ---
    function createStatusTag(status) {
        let statusText = status;
        let statusClass = status.replace(/\s/g, '');

        if (status === 'Pendiente') statusText = 'Pendiente';
        else if (status === 'Aprobado') statusText = 'Aprobado';
        else if (status === 'Rechazado') statusText = 'Rechazado';
        
        return `<span class="status-tag status-${statusClass}">${statusText}</span>`;
    }

    async function loadReimbursementHistory(collaboratorEmail) {
        reimbursementList.innerHTML = '';
        loadingHistory.style.display = 'block';
        noReimbursements.style.display = 'none';

        try {
            const querySnapshot = await db.collection('Reembolsos')
                .where('emailEmpresarial', '==', collaboratorEmail)
                .get();

            loadingHistory.style.display = 'none';
            allReimbursements = [];

            if (querySnapshot.empty) {
                noReimbursements.style.display = 'block';
                return;
            }

            querySnapshot.forEach(doc => {
                allReimbursements.push({ id: doc.id, ...doc.data() });
            });

            // Ordenar manualmente por fechaSolicitud (del más reciente al más antiguo)
            allReimbursements.sort((a, b) => {
                const dateA = a.fechaSolicitud ? a.fechaSolicitud.toDate().getTime() : 0;
                const dateB = b.fechaSolicitud ? b.fechaSolicitud.toDate().getTime() : 0;
                return dateB - dateA;
            });

            allReimbursements.forEach(data => {
                
                let date = 'N/A';
                let time = '';
                if (data.fechaSolicitud && typeof data.fechaSolicitud.toDate === 'function') {
                    date = data.fechaSolicitud.toDate().toLocaleDateString('es-ES');
                    time = data.fechaSolicitud.toDate().toLocaleTimeString('es-ES');
                }

                const statusTag = createStatusTag(data.estado);

                const listItem = document.createElement('li');
                listItem.classList.add('reimbursement-item');
                listItem.setAttribute('data-id', data.id);
                listItem.innerHTML = `
                    <div>
                        <strong>Monto:</strong> $${data.monto.toFixed(2)} ${statusTag}
                    </div>
                    <div>
                        <strong>Descripción:</strong> ${data.descripcion.length > 50 ? data.descripcion.substring(0, 50) + '...' : data.descripcion}
                    </div>
                    <div>
                        <strong>Fecha Solicitud:</strong> ${date} ${time ? ' a las ' + time : ''}
                    </div>
                `;
                
                listItem.addEventListener('click', function() {
                    const reimbursementId = this.getAttribute('data-id');
                    const selectedReimbursement = allReimbursements.find(r => r.id === reimbursementId);
                    if (selectedReimbursement) {
                        showReimbursementDetail(selectedReimbursement);
                    }
                });

                reimbursementList.appendChild(listItem);
            });

        } catch (error) {
            console.error("Error al cargar el historial de reembolsos:", error);
            loadingHistory.style.display = 'none';
            
            reimbursementList.innerHTML = `<li style="color:#d9534f; background:#f2dede; border-radius: 8px; padding: 15px; text-align:center;">
                ⚠️ Error al cargar el historial.
            </li>`;
        }
    }

    // --- Inicialización y Autenticación ---
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            const userData = await getUserData(user.email);
            current_userData = userData;

            if (!userData || !userData.NOMBRE) {
                showAlert('error', 'Datos no encontrados',
                    'No se encontró el nombre del usuario. Intenta recargar la página o contacta a soporte.');
                employeeDetails.innerHTML = `<h3>${user.email}</h3><p><strong>Estatus:</strong> <span>Datos incompletos</span></p>`;
                return;
            }
            
            displayUserInfo(userData);
            toggleView('form');
            
        } else {
            // El script navegacion-operador.js se encargará de la redirección
            console.log('Usuario no autenticado');
        }
    });

    // Botones de alerta
    alertBtn.addEventListener('click', function() { alertOverlay.classList.remove('show'); });
    errorBtn.addEventListener('click', function() { errorAlert.classList.remove('show'); });
});