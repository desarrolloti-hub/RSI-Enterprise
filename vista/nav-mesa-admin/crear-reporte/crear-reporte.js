// crear-reporte.js
(function() {
    'use strict';

    const form = document.getElementById('formReporte');
    const screenshotArea = document.getElementById('screenshotPreviewArea');
    const imgPreview = document.getElementById('imgPreview');
    const screenshotDataField = document.getElementById('screenshotDataField');
    const btnRemoveScreenshot = document.getElementById('btnRemoveScreenshot');
    const userDisplay = document.getElementById('userInfoDisplay');
    const origenInput = document.getElementById('origenUrl');
    const moduloInput = document.getElementById('modulo');
    
    let currentUser = null;
    let currentUserName = 'Anónimo'; // Variable para guardar el nombre real de la BD

    // ==========================================
    // FUNCIONES AUXILIARES
    // ==========================================
    
    // Verificar captura pendiente
    const checkPendingScreenshot = () => {
        const screenshotData = sessionStorage.getItem('tempReportScreenshot');
        const sourcePath = sessionStorage.getItem('tempReportSource');

        if (screenshotData) {
            console.log("📸 Captura encontrada en sesión, tamaño:", screenshotData.length);
            imgPreview.src = screenshotData;
            screenshotDataField.value = screenshotData;
            screenshotArea.style.display = 'block';

            if (sourcePath && origenInput) {
                origenInput.value = sourcePath;
                const cleanModule = sourcePath.split('/').pop().replace(/-/g, ' ') || 'Inicio';
                if(moduloInput) {
                    moduloInput.value = cleanModule.charAt(0).toUpperCase() + cleanModule.slice(1);
                }
            }

            // Limpiar sesión
            sessionStorage.removeItem('tempReportScreenshot');
            sessionStorage.removeItem('tempReportSource');

            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'info',
                title: 'Captura de pantalla adjuntada',
                showConfirmButton: false,
                timer: 3000
            });
        }
    };

    // Subir imagen a Storage
    const uploadScreenshotToStorage = async (base64String, userId) => {
        // Validación básica
        if (!base64String || base64String.length < 100) {
            throw new Error("La cadena base64 de la imagen está vacía o corrupta.");
        }

        const storageRef = firebase.storage().ref();
        const fileName = `reportes_screenshots/${userId || 'anon'}_${Date.now()}.jpg`;
        const imageRef = storageRef.child(fileName);

        // Convertir Base64 a Blob
        const response = await fetch(base64String);
        const blob = await response.blob();

        const snapshot = await imageRef.put(blob);
        return await snapshot.ref.getDownloadURL();
    };

    // Función para obtener datos reales del colaborador
    const fetchUserData = async (email) => {
        try {
            const db = firebase.firestore();
            const snapshot = await db.collection('colaboradores')
                .where('CORREO ELECTRÓNICO EMPRESARIAL', '==', email)
                .limit(1)
                .get();

            if (!snapshot.empty) {
                const data = snapshot.docs[0].data();
                // Ajusta 'NOMBRE' según como lo tengas en tu BD (NOMBRE, nombre, Name, etc.)
                currentUserName = data.NOMBRE || data.nombre || data.nombreCompleto || email;
                console.log("👤 Nombre encontrado en BD:", currentUserName);
            } else {
                console.warn("⚠️ Usuario no encontrado en colección colaboradores");
                currentUserName = email; // Fallback al email
            }
        } catch (error) {
            console.error("Error buscando usuario:", error);
        }
    };

    // ==========================================
    // INICIALIZACIÓN
    // ==========================================
    document.addEventListener('DOMContentLoaded', () => {
        // A. Auth Observer
        firebase.auth().onAuthStateChanged(async (user) => {
            if (user) {
                currentUser = user;
                if(userDisplay) {
                    userDisplay.textContent = user.email;
                    userDisplay.classList.add('logged-in');
                }
                // Obtener el nombre real de la base de datos
                await fetchUserData(user.email);
            } else {
                if(userDisplay) userDisplay.textContent = 'Usuario Anónimo';
            }
            
            checkPendingScreenshot();
        });

        // B. Botón eliminar captura
        if(btnRemoveScreenshot){
            btnRemoveScreenshot.addEventListener('click', () => {
                screenshotDataField.value = '';
                screenshotArea.style.display = 'none';
                imgPreview.src = '';
            });
        }

        // C. Detectar Origen URL
        const urlParams = new URLSearchParams(window.location.search);
        const sourceModule = urlParams.get('source') || urlParams.get('modulo');
        const referrer = document.referrer;

        if (sourceModule && origenInput) {
            origenInput.value = sourceModule;
            if(moduloInput) moduloInput.value = sourceModule.charAt(0).toUpperCase() + sourceModule.slice(1);
        } else if (referrer && origenInput) {
            try {
                const url = new URL(referrer);
                origenInput.value = url.pathname;
                if(moduloInput) moduloInput.value = url.pathname.replace('/', ''); 
            } catch (e) {
                origenInput.value = 'Navegación directa';
            }
        } else if (origenInput) {
            origenInput.value = 'Desconocido / Directo';
        }
    });

   // ==========================================
    // 2. FUNCIÓN DE ENVÍO
    // ==========================================
    const handleFormSubmit = async (e) => {
        e.preventDefault();

        const submitBtn = form.querySelector('.btn-submit') || form.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.innerHTML;
        let screenshotURL = null;

        const descripcion = document.getElementById('descripcion').value;
        const tipo = document.getElementById('tipo').value;
        const screenshotBase64 = screenshotDataField.value;

        // 1. Validaciones
        const dataToValidate = {
            description: descripcion,
            type: tipo,
            module: document.getElementById('modulo').value,
            attachments: screenshotBase64 ? [{ sizeBytes: Math.round(screenshotBase64.length * 0.75) }] : []
        };

        if (window.ErrorFilter) {
            const validacion = await window.ErrorFilter.validateManualReport(dataToValidate);
            if (!validacion.isValid) {
                Swal.fire({
                    icon: 'warning',
                    title: 'Falta información',
                    text: validacion.message,
                    confirmButtonColor: 'var(--primary)'
                });
                return; 
            }
        }

        try {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...';

            const db = firebase.firestore();

            // 2. Subir imagen (AHORA SI MOSTRAMOS EL ERROR SI FALLA)
            if (screenshotBase64 && screenshotBase64.length > 0) {
                try {
                    submitBtn.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> Subiendo evidencia...';
                    const userId = currentUser ? currentUser.uid : 'anonimo';
                    console.log("🚀 Iniciando subida de imagen...");
                    screenshotURL = await uploadScreenshotToStorage(screenshotBase64, userId);
                    console.log("✅ Imagen subida URL:", screenshotURL);
                } catch (uploadError) {
                    console.error("❌ Error CRÍTICO subiendo imagen:", uploadError);
                    // Lanzamos el error para detener el proceso y avisar al usuario
                    // Si prefieres que se guarde sin imagen, comenta la siguiente linea:
                    throw new Error("No se pudo subir la captura de pantalla: " + uploadError.message);
                }
            } else {
                console.log("ℹ️ No hay captura de pantalla para subir.");
            }

            // 3. Guardar en Firestore
            submitBtn.innerHTML = '<i class="fas fa-save"></i> Guardando reporte...';

            const reportePayload = {
                tipo: tipo,
                prioridad: document.getElementById('prioridad').value,
                moduloUsuario: document.getElementById('modulo').value,
                descripcion: descripcion,
                origenDetectado: document.getElementById('origenUrl').value,
                capturaPantallaUrl: screenshotURL || null, // Aquí se guarda la URL
                estado: 'Pendiente',
                origenReporte: 'manual_web',
                
                // AQUÍ ESTÁ LA CORRECCIÓN DEL NOMBRE
                creadoPor: currentUser ? {
                    uid: currentUser.uid,
                    email: currentUser.email,
                    displayName: currentUserName // Usamos la variable que llenamos desde BD
                } : 'Anónimo',
                
                fechaCreacion: firebase.firestore.FieldValue.serverTimestamp(),
                
                contextoTecnico: {
                    navegador: navigator.userAgent,
                    plataforma: navigator.platform,
                    resolucionPantalla: `${window.screen.width}x${window.screen.height}`,
                    urlActual: window.location.href,
                    online: navigator.onLine
                }
            };

            await db.collection('reportesSistema').add(reportePayload);

            Swal.fire({
                icon: 'success',
                title: '¡Recibido!',
                text: 'Gracias por ayudarnos a mejorar el sistema.',
                confirmButtonColor: '#6C43E0',
                timer: 2000,
                showConfirmButton: false
            }).then(() => {
                window.history.back();
            });

        } catch (error) {
            console.error('Error reportando:', error);
            
            Swal.fire({
                icon: 'error',
                title: 'Error al enviar',
                text: 'Hubo un problema: ' + error.message, // Mostramos el mensaje real
            });

        } finally {
            if(submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnText;
            }
        }
    };

    if (form) {
        form.addEventListener('submit', handleFormSubmit);
    }

})();