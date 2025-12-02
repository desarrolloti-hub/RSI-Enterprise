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

    // ==========================================
    // FUNCIONES AUXILIARES
    // ==========================================
    
    // Verificar captura pendiente
    const checkPendingScreenshot = () => {
        const screenshotData = sessionStorage.getItem('tempReportScreenshot');
        const sourcePath = sessionStorage.getItem('tempReportSource');

        if (screenshotData) {
            imgPreview.src = screenshotData;
            screenshotDataField.value = screenshotData;
            screenshotArea.style.display = 'block';

            if (sourcePath && origenInput) {
                origenInput.value = sourcePath;
                // Formatear nombre del módulo
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
        const storageRef = firebase.storage().ref();
        const fileName = `reportes_screenshots/${userId || 'anon'}_${Date.now()}.jpg`;
        const imageRef = storageRef.child(fileName);

        const response = await fetch(base64String);
        const blob = await response.blob();

        const snapshot = await imageRef.put(blob);
        return await snapshot.ref.getDownloadURL();
    };

    // ==========================================
    // INICIALIZACIÓN
    // ==========================================
    document.addEventListener('DOMContentLoaded', () => {
        // A. Auth Observer
        firebase.auth().onAuthStateChanged((user) => {
            if (user) {
                currentUser = user;
                if(userDisplay) {
                    userDisplay.textContent = user.email;
                    userDisplay.classList.add('logged-in');
                }
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
    // 2. FUNCIÓN DE ENVÍO (CON VALIDACIÓN Y SUBIDA)
    // ==========================================
    const handleFormSubmit = async (e) => {
        e.preventDefault();

        const submitBtn = form.querySelector('.btn-submit') || form.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.innerHTML;
        let screenshotURL = null;

        // 1. Recolección de datos crudos para validación
        const descripcion = document.getElementById('descripcion').value;
        const tipo = document.getElementById('tipo').value;
        const screenshotBase64 = screenshotDataField.value;

        // Preparar objeto para el validador
        const dataToValidate = {
            description: descripcion,
            type: tipo,
            module: document.getElementById('modulo').value,
            // Simulamos el attachment para el validador si hay imagen base64
            attachments: screenshotBase64 ? [{ sizeBytes: Math.round(screenshotBase64.length * 0.75) }] : []
        };

        // 2. VALIDACIÓN CON ERRORFILTER (El "filtro justo")
        if (window.ErrorFilter) {
            const validacion = await window.ErrorFilter.validateManualReport(dataToValidate);
            
            if (!validacion.isValid) {
                // Si no pasa el filtro, mostramos la advertencia y detenemos todo
                Swal.fire({
                    icon: 'warning',
                    title: 'Falta información',
                    text: validacion.message,
                    confirmButtonColor: 'var(--primary)'
                });
                return; // 🛑 DETENER ENVÍO
            }
        }

        try {
            // 3. UI Loading (Deshabilitar botón)
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...';

            const db = firebase.firestore();

            // 4. Subir imagen a Storage (Si existe)
            if (screenshotBase64) {
                try {
                    submitBtn.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> Subiendo evidencia...';
                    // Usamos el UID del usuario o 'anonimo' para la carpeta
                    const userId = currentUser ? currentUser.uid : 'anonimo';
                    screenshotURL = await uploadScreenshotToStorage(screenshotBase64, userId);
                } catch (uploadError) {
                    console.error("Error subiendo imagen:", uploadError);
                    // Decidimos continuar aunque falle la imagen, pero avisamos en consola
                    // Si prefieres que se detenga, lanza un throw aquí.
                }
            }

            // 5. Construcción del objeto final para Firestore
            submitBtn.innerHTML = '<i class="fas fa-save"></i> Guardando reporte...';

            const reportePayload = {
                // Datos del formulario
                tipo: tipo,
                prioridad: document.getElementById('prioridad').value,
                moduloUsuario: document.getElementById('modulo').value,
                descripcion: descripcion,
                origenDetectado: document.getElementById('origenUrl').value,

                // Imagen (URL de descarga o null)
                capturaPantallaUrl: screenshotURL || null,
                
                // Metadatos automáticos
                estado: 'Pendiente', // Flujo: Pendiente -> En Revisión -> Resuelto
                origenReporte: 'manual_web',
                
                // Auditoría
                creadoPor: currentUser ? {
                    uid: currentUser.uid,
                    email: currentUser.email,
                    displayName: currentUser.displayName || 'Sin nombre'
                } : 'Anónimo',
                
                fechaCreacion: firebase.firestore.FieldValue.serverTimestamp(),
                
                // Contexto Técnico (Útil para ti como dev)
                contextoTecnico: {
                    navegador: navigator.userAgent,
                    plataforma: navigator.platform,
                    resolucionPantalla: `${window.screen.width}x${window.screen.height}`,
                    urlActual: window.location.href,
                    online: navigator.onLine
                }
            };

            // 6. Guardar en Firestore (Colección 'reportesSistema')
            await db.collection('reportesSistema').add(reportePayload);

            // 7. Éxito
            Swal.fire({
                icon: 'success',
                title: '¡Recibido!',
                text: 'Gracias por ayudarnos a mejorar el sistema.',
                confirmButtonColor: '#6C43E0',
                timer: 2000,
                showConfirmButton: false
            }).then(() => {
                // Regresar a la pantalla anterior automáticamente
                window.history.back();
            });

        } catch (error) {
            // Si algo falla (red, permisos, etc.)
            console.error('Error reportando:', error);
            
            // Usamos tu manejador global si está disponible, si no, alerta normal
            if (window.manejarErrorGlobal) {
                window.manejarErrorGlobal(error);
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Error al enviar',
                    text: 'Hubo un problema técnico al guardar tu reporte. Intenta de nuevo.',
                    footer: error.message
                });
            }

        } finally {
            // Restaurar botón siempre (éxito o error)
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