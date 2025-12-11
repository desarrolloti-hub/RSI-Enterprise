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
    let currentUserName = 'Anónimo'; 

    let isAutoReport = false;

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

            if(!isAutoReport){
                Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'info',
                title: 'Captura de pantalla adjuntada',
                showConfirmButton: false,
                timer: 3000
            });
            }
            
        }
    };

    // NOTA: Se eliminó la función 'uploadScreenshotToStorage' porque no tienes permisos.

    const fetchUserData = async (email) => {
        try {
            const db = firebase.firestore();
            const snapshot = await db.collection('colaboradores')
                .where('CORREO ELECTRÓNICO EMPRESARIAL', '==', email)
                .limit(1)
                .get();

            if (!snapshot.empty) {
                const data = snapshot.docs[0].data();
                currentUserName = data.NOMBRE || data.nombre || data.nombreCompleto || email;
                console.log("👤 Nombre encontrado en BD:", currentUserName);
            } else {
                console.warn("⚠️ Usuario no encontrado en colección colaboradores");
                currentUserName = email; 
            }
        } catch (error) {
            console.error("Error buscando usuario:", error);
        }
    };

    // ==========================================
    // INICIALIZACIÓN
    // ==========================================
    document.addEventListener('DOMContentLoaded', () => {
        
        // --- CORRECCIÓN 3: Detectar el reporte automático PRIMERO ---
        const autoErrorData = sessionStorage.getItem('autoErrorReportData');
        if (autoErrorData) {
            isAutoReport = true; // Activamos la bandera para bloquear otras alertas
            try {
                const errorInfo = JSON.parse(autoErrorData);
                console.log("🚨 Cargando reporte automático:", errorInfo);

                // Rellenar campos automáticamente
                if(document.getElementById('tipo')) document.getElementById('tipo').value = 'Bug';
                if(document.getElementById('prioridad')) document.getElementById('prioridad').value = 'Alta';
                
                const descField = document.getElementById('descripcion');
                if(descField) {
                    descField.value = `[REPORTE AUTOMÁTICO DE SISTEMA]\n\n` +
                                      `🛑 Mensaje: ${errorInfo.mensaje}\n` +
                                      `📍 Origen: ${errorInfo.origen}\n` +
                                      `⏰ Fecha: ${new Date(errorInfo.fecha).toLocaleString()}\n\n` +
                                      `--- Detalles Técnicos (Stack) ---\n${errorInfo.stack}`;
                    descField.style.backgroundColor = '#fff0f0';
                }

                if(document.getElementById('modulo')) {
                    document.getElementById('modulo').value = errorInfo.origen || 'Sistema';
                }

                // Mostrar alerta IMPORTANTE (Esta es la que se cerraba)
                Swal.fire({
                    icon: 'error',
                    title: '¡Ups! Algo salió mal',
                    text: 'El sistema detectó un error y ha preparado este reporte automáticamente. Por favor, revísalo y dale "Enviar".',
                    confirmButtonColor: '#d33',
                    // allowOutsideClick: false // Opcional: Obligar a dar OK
                });

                sessionStorage.removeItem('autoErrorReportData');

            } catch (e) {
                console.error("Error al procesar reporte automático:", e);
            }
        }
        

        firebase.auth().onAuthStateChanged(async (user) => {
            if (user) {
                currentUser = user;
                if(userDisplay) {
                    userDisplay.textContent = user.email;
                    userDisplay.classList.add('logged-in');
                }
                await fetchUserData(user.email);
            } else {
                if(userDisplay) userDisplay.textContent = 'Usuario Anónimo';
            }
            
            checkPendingScreenshot();
        });

        if(btnRemoveScreenshot){
            btnRemoveScreenshot.addEventListener('click', () => {
                screenshotDataField.value = '';
                screenshotArea.style.display = 'none';
                imgPreview.src = '';
            });
        }

        // Detectar Origen URL
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

        const descripcion = document.getElementById('descripcion').value;
        const tipo = document.getElementById('tipo').value;
        const screenshotBase64 = screenshotDataField.value; // IMAGEN EN TEXTO

        // 1. Validaciones
        const dataToValidate = {
            description: descripcion,
            type: tipo,
            module: document.getElementById('modulo').value,
            // Validación simulada basada en el tamaño del texto base64
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
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';

            const db = firebase.firestore();

            // ⚠️ YA NO INTENTAMOS SUBIR A STORAGE (Opción 1 aplicada)
            // Pasamos directamente a guardar en Firestore

            const reportePayload = {
                tipo: tipo,
                prioridad: document.getElementById('prioridad').value,
                moduloUsuario: document.getElementById('modulo').value,
                descripcion: descripcion,
                origenDetectado: document.getElementById('origenUrl').value,
                
                // === CAMBIO CRÍTICO PARA OPCIÓN 1 ===
                // Guardamos la cadena base64 directamente en la BD
                capturaPantallaBase64: screenshotBase64 || null, 
                
                // ====================================

                estado: 'Pendiente',
                origenReporte: 'manual_web',
                
                creadoPor: currentUser ? {
                    uid: currentUser.uid,
                    email: currentUser.email,
                    displayName: currentUserName 
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

            // Verificamos tamaño antes de enviar (Firestore límite 1MB)
            const payloadSize = new Blob([JSON.stringify(reportePayload)]).size;
            console.log(`📦 Tamaño del reporte: ${(payloadSize / 1024).toFixed(2)} KB`);

            if (payloadSize > 1000000) {
                throw new Error("La imagen es demasiado pesada para guardar sin Storage. Intenta una pantalla con menos detalles.");
            }

            await db.collection('reportesSistema').add(reportePayload);

            Swal.fire({
                icon: 'success',
                title: '¡Recibido!',
                text: 'Reporte guardado correctamente.',
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
                title: 'Error al guardar',
                text: error.message, 
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