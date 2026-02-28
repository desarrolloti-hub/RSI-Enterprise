// finalizar-ticket.js
(function() {
    // --- CONSTANTES DE VALIDACIÓN ---
    const MAX_IMAGES = 20;
    const MIN_IMAGES = 1;
    const MAX_DESCRIPTION_LENGTH = 10000;
    const MIN_DESCRIPTION_LENGTH = 10;
    const MAX_PAUSE_REASON_LENGTH = 500;
    const MIN_PAUSE_REASON_LENGTH = 10;
    // --------------------------------

    // Configuración de Firebase
    const firebaseConfig = {
        apiKey: "AIzaSyBJy992gkvsT77-_fMp_O_z99wtjZiK77Y",
        authDomain: "rsienterprise.firebaseapp.com",
        projectId: "rsienterprise",
        storageBucket: "rsienterprise.appspot.com",
        messagingSenderId: "1063117165770",
        appId: "1:1063117165770:web:8555f26b25ae80bc42d033"
    };

    // Inicializar Firebase
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    
    const db = firebase.firestore();
    const auth = firebase.auth();
    const storage = firebase.storage();

    // Estado de la aplicación
    const AppState = {
        currentUser: null,
        userData: null,
        currentTicketId: null,
        selectedImages: [], // Guarda los File objects o paths
        selectedImageFiles: [], // Guarda los archivos originales
        currentEvidenciaId: null,
        uploadedImagePaths: [] // Guarda los paths de las imágenes subidas
    };

    // --- FUNCIONES DE UTILIDAD (CRUD, ALERTAS) ---
    
    function getUrlParams() {
        const urlParams = new URLSearchParams(window.location.search);
        return {
            ticketId: urlParams.get('ticketId'),
            edit: urlParams.get('edit') === 'true'
        };
    }

    function showLoading(message = 'Cargando...') {
        Swal.fire({
            title: message,
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });
    }

    function hideLoading() {
        Swal.close();
    }

    function showError(message, title = 'Error') {
        Swal.fire({
            icon: 'error',
            title: title,
            text: message,
            confirmButtonColor: '#d33'
        });
    }

    async function showSuccess(message, title = '¡Éxito!') {
        await Swal.fire({
            icon: 'success',
            title: title,
            text: message,
            confirmButtonColor: '#3085d6'
        });
    }

    async function getColaboradorNames(colaboradorIds) {
        if (!colaboradorIds || colaboradorIds.length === 0) return 'Ninguno';
        try {
            const promises = colaboradorIds.map(async (id) => {
                const colabRef = db.collection('colaboradores').doc(id);
                const colabSnap = await colabRef.get();
                return colabSnap.exists ? colabSnap.data().NOMBRE : 'Desconocido';
            });
            const names = await Promise.all(promises);
            return names.join(', ');
        } catch (error) {
            console.error("Error obteniendo nombres de colaboradores:", error);
            return 'Error de carga';
        }
    }

    /**
     * Sube una imagen a Firebase Storage en la carpeta FinTickets
     * @param {File} file - Archivo de imagen
     * @param {string} ticketId - ID del ticket
     * @param {number} index - Índice de la imagen
     * @returns {Promise<string>} - Path del archivo en Storage
     */
    async function uploadImageToStorage(file, ticketId, index) {
        try {
            // Generar nombre único: FinTickets/ticketId/timestamp_index.extension
            const timestamp = Date.now();
            const extension = file.name.split('.').pop() || 'jpg';
            const fileName = `${timestamp}_${index}.${extension}`;
            
            // Path completo: FinTickets/TICKET_ID/archivo.jpg
            const filePath = `FinTickets/${ticketId}/${fileName}`;
            const storageRef = storage.ref().child(filePath);
            
            // Subir archivo
            await storageRef.put(file);
            
            // Obtener URL de descarga
            const downloadUrl = await storageRef.getDownloadURL();
            
            console.log(`Imagen subida exitosamente: ${filePath}`);
            
            return {
                path: filePath,
                url: downloadUrl,
                nombre: fileName
            };
        } catch (error) {
            console.error("Error subiendo imagen a Storage:", error);
            throw new Error(`Error al subir imagen: ${error.message}`);
        }
    }

    /**
     * Elimina una imagen de Firebase Storage
     * @param {string} path - Path de la imagen en Storage
     */
    async function deleteImageFromStorage(path) {
        try {
            if (!path) return;
            
            const storageRef = storage.ref().child(path);
            await storageRef.delete();
            console.log(`Imagen eliminada: ${path}`);
        } catch (error) {
            console.error("Error eliminando imagen de Storage:", error);
            // No lanzamos error para no interrumpir el flujo
        }
    }

    function showImageInSwal(imgSrc) {
        Swal.fire({
            title: 'Evidencia',
            imageUrl: imgSrc,
            imageAlt: 'Evidencia ampliada',
            showConfirmButton: true,
            confirmButtonText: 'Cerrar',
            showCloseButton: true,
            width: 'auto',
            customClass: {
                container: 'swal-dark-bg',
                popup: 'swal-dark',
                image: 'swal-image-fit' 
            }
        });
    }

    function updateImagePreviews() {
        const previewContainer = document.getElementById('imagePreviewContainer');
        if (!previewContainer) return;
        
        previewContainer.innerHTML = '';
        
        AppState.selectedImages.forEach((img, index) => {
            const imgPreview = document.createElement('div');
            imgPreview.className = 'image-preview-item';
            
            // Determinar la fuente de la imagen
            let imgSrc = '';
            if (img instanceof File) {
                imgSrc = URL.createObjectURL(img);
            } else if (typeof img === 'string') {
                imgSrc = img; // URL o base64
            } else if (img.url) {
                imgSrc = img.url; // Objeto con url
            }
            
            imgPreview.innerHTML = `
                <img src="${imgSrc}" alt="Preview" style="cursor: pointer;">
                <button class="delete-image-btn" data-index="${index}">
                    <i class="fas fa-trash"></i>
                </button>
            `;
            previewContainer.appendChild(imgPreview);
            
            imgPreview.querySelector('img').addEventListener('click', function() {
                showImageInSwal(imgSrc);
            });
            
            imgPreview.querySelector('.delete-image-btn').addEventListener('click', async function(e) {
                e.stopPropagation();
                const idx = parseInt(this.getAttribute('data-index'));
                
                // Si es una imagen ya subida (tiene path), eliminarla de Storage
                const imageToDelete = AppState.selectedImages[idx];
                if (imageToDelete && imageToDelete.path) {
                    await deleteImageFromStorage(imageToDelete.path);
                }
                
                // Eliminar del array
                AppState.selectedImages.splice(idx, 1);
                if (AppState.selectedImageFiles) {
                    AppState.selectedImageFiles.splice(idx, 1);
                }
                
                updateImagePreviews();
            });
        });
    }

    // --- FUNCIONES DE VALIDACIÓN ---

    function validateFinalizeForm(description, imageCount) {
        if (description.length < MIN_DESCRIPTION_LENGTH) {
            throw new Error(`La descripción de finalización debe tener al menos ${MIN_DESCRIPTION_LENGTH} caracteres`);
        }
        if (imageCount < MIN_IMAGES) {
            throw new Error(`Debes subir al menos ${MIN_IMAGES} imagen como evidencia`);
        }
        if (imageCount > MAX_IMAGES) {
            throw new Error(`No puedes subir más de ${MAX_IMAGES} imágenes`);
        }
        return true;
    }

    function validatePauseForm(reason) {
        if (reason.length < MIN_PAUSE_REASON_LENGTH) {
            throw new Error(`La razón de pausa debe tener al menos ${MIN_PAUSE_REASON_LENGTH} caracteres`);
        }
        if (reason.length > MAX_PAUSE_REASON_LENGTH) {
            throw new Error(`La razón de pausa no debe exceder ${MAX_PAUSE_REASON_LENGTH} caracteres`);
        }
        return true;
    }

    // --- FUNCIONES DE CARGA DE DATOS ---

    async function loadExistingEvidences(ticketId) {
        try {
            const evidenciasRef = db.collection('evidenciatickets');
            const q = evidenciasRef
                .where("ticketId", "==", ticketId)
                .where("colaboradorId", "==", AppState.userData.colaboradorId)
                .get();
            
            const querySnapshot = await q;
            
            if (!querySnapshot.empty) {
                const evidencia = querySnapshot.docs[0].data();
                AppState.currentEvidenciaId = querySnapshot.docs[0].id;
                
                document.getElementById('projectDescription').value = evidencia.descripcion || '';
                document.getElementById('charCount').textContent = evidencia.descripcion?.length || 0;
                
                const ticketRef = db.collection('ticketsmesa').doc(ticketId);
                const ticketSnap = await ticketRef.get();
                const ticketData = ticketSnap.data();

                if (document.getElementById('pauseReason')) {
                    document.getElementById('pauseReason').value = ticketData.pauseComment || '';
                }
                
                // Cargar imágenes existentes (ya tienen path y url)
                AppState.selectedImages = evidencia.imagenes || [];
                updateImagePreviews();
                
                const urlParams = getUrlParams();
                const isEditMode = urlParams.edit;
                
                if (isEditMode) {
                    document.querySelector('.confirm-btn').innerHTML = '<i class="fas fa-save"></i> Guardar Cambios';
                    document.querySelector('h1').innerHTML = '<i class="fas fa-edit"></i> Modificar Finalización';
                }
            }
        } catch (error) {
            console.error("Error cargando evidencias existentes:", error);
        }
    }

    async function loadTicketInfo(ticketId) {
        try {
            showLoading('Cargando información del ticket...');
            
            const ticketRef = db.collection('ticketsmesa').doc(ticketId);
            const ticketSnap = await ticketRef.get();
            
            if (!ticketSnap.exists) {
                throw new Error('El ticket no existe');
            }
            
            const ticketData = ticketSnap.data();
            const shortId = ticketId.substring(0, 8);
            
            const colaboradorNames = await getColaboradorNames(ticketData.colaboradores);

            // Actualizar UI básica
            document.getElementById('ticketIdDisplay').textContent = `#${shortId.toUpperCase()}`;
            document.getElementById('ticketTitle').textContent = ticketData.titulo || 'Sin título';
            document.getElementById('ticketStatus').textContent = ticketData.estado || 'Desconocido';
            document.getElementById('ticketPriority').textContent = ticketData.prioridad || 'Media';
            document.getElementById('ticketArea').textContent = ticketData.area || 'General';
            
            // Mostrar Descripción y Colaboradores
            const ticketInfoDiv = document.getElementById('ticketInfo');
            if (ticketInfoDiv) {
                document.getElementById('ticketDescriptionDisplay')?.remove();
                document.getElementById('ticketColaboradoresDisplay')?.remove();
                
                const descriptionP = document.createElement('p');
                descriptionP.id = 'ticketDescriptionDisplay';
                descriptionP.innerHTML = `
                    <strong>Descripción:</strong> 
                    <span style="display:block; margin-top: 5px; background-color: var(--card-background); padding: 10px; border-radius: 4px; border: 1px solid var(--border-color); white-space: pre-wrap; font-size: 0.9rem;">
                        ${ticketData.descripcionActividades || 'No se proporcionó descripción.'}
                    </span>
                `;
                ticketInfoDiv.appendChild(descriptionP);
                
                const colaboradoresP = document.createElement('p');
                colaboradoresP.id = 'ticketColaboradoresDisplay';
                colaboradoresP.innerHTML = `<strong>Colaboradores:</strong> <span style="font-style: italic;">${colaboradorNames}</span>`;
                ticketInfoDiv.appendChild(colaboradoresP);
            }

            await loadExistingEvidences(ticketId);
            
            hideLoading();
            
        } catch (error) {
            console.error("Error cargando información del ticket:", error);
            hideLoading();
            showError('No se pudo cargar la información del ticket');
        }
    }

    async function loadUserData(user) {
        try {
            const colaboradoresRef = db.collection('colaboradores');
            const q = colaboradoresRef.where("CORREO ELECTRÓNICO EMPRESARIAL", "==", user.email).get();
            const collabSnapshot = await q;

            if (collabSnapshot.empty) {
                showError('No se encontraron tus datos de colaborador');
                return false;
            }

            collabSnapshot.forEach(doc => {
                AppState.userData = doc.data();
                AppState.userData.colaboradorId = doc.id;
                AppState.userData.NOMBRE = doc.data().NOMBRE;
            });
            return true;
        } catch (error) {
            console.error("Error cargando datos de colaborador:", error);
            showError('Error al cargar tus datos de colaborador.');
            return false;
        }
    }

    // --- FUNCIONES DE ACCIÓN (SUBMIT, PAUSE) ---

    async function saveOrUpdateEvidence(description) {
        // Subir imágenes nuevas a Storage
        const imageUploadPromises = [];
        const finalImages = [];
        
        // Primero, mantener las imágenes existentes que ya tienen path
        for (const img of AppState.selectedImages) {
            if (img.path) {
                // Es una imagen ya existente en Storage
                finalImages.push(img);
            } else if (img instanceof File) {
                // Es una imagen nueva (File object), subir a Storage
                const index = imageUploadPromises.length;
                const uploadPromise = uploadImageToStorage(img, AppState.currentTicketId, index)
                    .then(result => {
                        finalImages.push(result);
                    });
                imageUploadPromises.push(uploadPromise);
            }
        }
        
        // Esperar a que todas las imágenes nuevas se suban
        if (imageUploadPromises.length > 0) {
            await Promise.all(imageUploadPromises);
        }
        
        const evidenciaData = {
            ticketId: AppState.currentTicketId,
            colaboradorId: AppState.userData.colaboradorId,
            colaboradorNombre: AppState.userData.NOMBRE,
            descripcion: description,
            imagenes: finalImages, // Guardar objetos con path y url
            fechaActualizacion: firebase.firestore.FieldValue.serverTimestamp(),
            estado: 'completado'
        };

        if (AppState.currentEvidenciaId) {
            // Actualizar evidencia existente
            await db.collection('evidenciatickets').doc(AppState.currentEvidenciaId).update(evidenciaData);
        } else {
            evidenciaData.fechaCreacion = firebase.firestore.FieldValue.serverTimestamp();
            const result = await db.collection('evidenciatickets').add(evidenciaData);
            AppState.currentEvidenciaId = result.id;
        }
    }

    async function updateTicketStatus() {
        const ticketRef = db.collection('ticketsmesa').doc(AppState.currentTicketId);
        const ticketSnap = await ticketRef.get();
        
        if (!ticketSnap.exists) return;
        
        const ticketData = ticketSnap.data();
        let evidenciasCompletadas = ticketData.evidenciasCompletadas || [];
        
        if (!evidenciasCompletadas.includes(AppState.userData.colaboradorId)) {
            evidenciasCompletadas.push(AppState.userData.colaboradorId);
        }
        
        const colaboradores = ticketData.colaboradores || [];
        const todosCompletados = colaboradores.every(colabId => 
            evidenciasCompletadas.includes(colabId)
        );
        
        const oldStatus = ticketData.estado || 'desconocido';
        const newStatus = todosCompletados ? 'finalizado' : 'en_proceso'; 
        
        const updateData = {
            evidenciasCompletadas,
            estado: newStatus, 
            fechaActualizacion: firebase.firestore.FieldValue.serverTimestamp(),
            pauseComment: '' // Limpiar comentario de pausa si se finaliza
        };
        
        if (todosCompletados) {
            updateData.fechaFinalizacion = firebase.firestore.FieldValue.serverTimestamp();
        }
        
        await ticketRef.update(updateData);
        
        await recordHistory(
            AppState.currentTicketId,
            oldStatus,
            newStatus,
            `Ticket finalizado por colaborador. Estado: ${newStatus}`,
            AppState.userData.colaboradorId,
            AppState.userData.NOMBRE
        );
    }

    async function handleFormSubmit(e) {
        e.preventDefault();
        
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...';
        
        try {
            const description = document.getElementById('projectDescription').value;
            
            validateFinalizeForm(description, AppState.selectedImages.length);
            
            showLoading('Guardando evidencias y finalizando...');
            
            await saveOrUpdateEvidence(description);
            await updateTicketStatus();
            
            hideLoading();
            await showSuccess('Tus evidencias han sido guardadas y el ticket marcado como completado.', 'Proceso Exitoso');
            
            window.location.href = '../gestion-tickets/gestion-tickets.html';
            
        } catch (error) {
            console.error("Error guardando evidencias:", error);
            showError(error.message || 'No se pudieron guardar las evidencias');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
            hideLoading();
        }
    }
    
    async function handlePauseTicket(reason) {
        try {
            showLoading('Pausando ticket y registrando razón...');

            const ticketRef = db.collection('ticketsmesa').doc(AppState.currentTicketId);
            const ticketSnap = await ticketRef.get();
            const oldStatus = ticketSnap.data().estado || 'desconocido';

            const updateData = {
                estado: 'en_proceso', // Estado de Pausa
                pauseComment: reason, // Razón de la pausa
                fechaActualizacion: firebase.firestore.FieldValue.serverTimestamp() 
            };

            await ticketRef.update(updateData);

            await recordHistory(
                AppState.currentTicketId,
                oldStatus,
                'en_proceso',
                `Pausado desde formulario de Finalización: ${reason}`,
                AppState.userData.colaboradorId,
                AppState.userData.NOMBRE
            );

            hideLoading();
            await showSuccess('El ticket ha sido puesto en pausa. Volverá a la lista activa en Gestión de Tickets.', 'Ticket en Pausa');
            
            window.location.href = '../gestion-tickets/gestion-tickets.html';
            
        } catch (error) {
            console.error("Error al pausar ticket:", error);
            showError(error.message || 'No se pudo pausar el ticket.');
        } finally {
            hideLoading();
        }
    }

    async function recordHistory(ticketId, oldStatus, newStatus, motivo, collaboratorId, collaboratorName) {
        try {
            const historyData = {
                ticketId: ticketId,
                fechaCambio: firebase.firestore.FieldValue.serverTimestamp(),
                colaboradorId: collaboratorId,
                colaboradorNombre: collaboratorName,
                estadoAnterior: oldStatus,
                estadoNuevo: newStatus,
                motivo: motivo || `Cambio de estado de ${oldStatus} a ${newStatus}`
            };
            
            await db.collection('historialTicket').add(historyData);
            console.log('Historial de ticket registrado exitosamente.');
        } catch (error) {
            console.error('Error registrando historial:', error);
        }
    }
    
    function handlePaste(e) {
        const items = e.clipboardData.items;
        const imageFiles = [];

        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                const file = items[i].getAsFile();
                if (file) {
                    imageFiles.push(file);
                }
            }
        }

        if (imageFiles.length > 0) {
            e.preventDefault(); 
            handleImageUpload(imageFiles);
        }
    }

    // --- MANEJO DE IMÁGENES SUBIDAS/PEGADAS ---
    async function handleImageUpload(files) {
        if (!files || files.length === 0) return;

        const totalImages = AppState.selectedImages.length + files.length;
        if (totalImages > MAX_IMAGES) {
            showError(`Solo puedes subir un máximo de ${MAX_IMAGES} imágenes. Ya tienes ${AppState.selectedImages.length} y estás intentando añadir ${files.length}.`);
            return;
        }

        showLoading('Procesando imágenes...');
        
        // Convertir FileList a array y agregar a selectedImages
        const fileArray = Array.from(files);
        
        // Crear previews inmediatamente
        fileArray.forEach(file => {
            // Crear objeto temporal con File para preview
            AppState.selectedImages.push(file);
        });
        
        // Guardar también los File objects para subirlos después
        if (!AppState.selectedImageFiles) {
            AppState.selectedImageFiles = [];
        }
        AppState.selectedImageFiles.push(...fileArray);
        
        hideLoading();
        updateImagePreviews();
    }

    // --- SETUP DE EVENTOS ---
    
    function setupEventListeners() {
        const textarea = document.getElementById('projectDescription');
        const counter = document.getElementById('charCount');
        const finishForm = document.getElementById('finishTicketForm');
        const cancelBtn = document.getElementById('cancelBtn');
        const input = document.getElementById('imageUpload');
        const pauseBtn = document.getElementById('pauseBtn');
        
        // Lógica para el botón Pausar (Ahora usa SweetAlert2)
        pauseBtn.addEventListener('click', () => {
            const swalHtml = `
                <label for="swalPauseReason" class="swal2-label" style="text-align: left; display: block; margin-bottom: 10px;">
                    <i class="fas fa-comment-dots"></i> Razón para poner en pausa (Requerido)
                </label>
                <textarea 
                    id="swalPauseReason" 
                    class="swal2-textarea" 
                    rows="4" 
                    minlength="10" 
                    maxlength="500" 
                    placeholder="Escriba la razón detallada para pausar el ticket (mínimo 10 caracteres)"
                    style="width: 100%; box-sizing: border-box;"
                ></textarea>
                <div class="char-counter" style="text-align: right; font-size: 0.8em; color: #999; margin-top: 5px;">
                    <span id="swalPauseCharCount">0</span>/${MAX_PAUSE_REASON_LENGTH} caracteres
                </div>
            `;

            Swal.fire({
                title: 'Razón para Pausar Ticket',
                html: swalHtml, 
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: '<i class="fas fa-pause"></i> Pausar Ticket',
                cancelButtonText: 'Cancelar',
                focusConfirm: false,
                didOpen: () => {
                    const swalTextarea = Swal.getHtmlContainer().querySelector('#swalPauseReason');
                    const swalCounter = Swal.getHtmlContainer().querySelector('#swalPauseCharCount');
                    
                    const initialPauseReason = document.getElementById('pauseReason').value || '';
                    swalTextarea.value = initialPauseReason;

                    swalTextarea.addEventListener('input', function() {
                        const length = Math.min(this.value.length, MAX_PAUSE_REASON_LENGTH);
                        swalCounter.textContent = `${length}/${MAX_PAUSE_REASON_LENGTH} caracteres`;
                        if (this.value.length > MAX_PAUSE_REASON_LENGTH) {
                            this.value = this.value.substring(0, MAX_PAUSE_REASON_LENGTH);
                        }
                    });
                    
                    swalCounter.textContent = `${swalTextarea.value.length}/${MAX_PAUSE_REASON_LENGTH} caracteres`;
                },
                preConfirm: () => {
                    const reasonInput = Swal.getHtmlContainer().querySelector('#swalPauseReason');
                    const reason = reasonInput.value.trim();
                    
                    try {
                         validatePauseForm(reason);
                         return reason;
                    } catch (error) {
                        Swal.showValidationMessage(error.message);
                        return false;
                    }
                }
            }).then((result) => {
                if (result.isConfirmed) {
                    document.getElementById('pauseReason').value = result.value;
                    handlePauseTicket(result.value);
                }
            });
        });

        // Contador de caracteres (Descripción Finalización)
        textarea.addEventListener('input', function() {
            const length = Math.min(this.value.length, MAX_DESCRIPTION_LENGTH);
            counter.textContent = length;
            
            if (this.value.length > MAX_DESCRIPTION_LENGTH) {
                this.value = this.value.substring(0, MAX_DESCRIPTION_LENGTH);
            }
        });
        
        // Carga de imágenes (input file)
        input.addEventListener('change', function(e) {
            handleImageUpload(e.target.files);
            e.target.value = ''; 
        });

        // Escuchador para pegar imágenes (Ctrl+V)
        document.addEventListener('paste', handlePaste);

        // Envío del formulario (Finalizar)
        finishForm.addEventListener('submit', handleFormSubmit);
        
        // Botón cancelar
        cancelBtn.addEventListener('click', function() {
            window.location.href = '../gestion-tickets/gestion-tickets.html';
        });
        
    }

    // Inicializar aplicación
    async function initApp() {
        const { ticketId } = getUrlParams();
        
        if (!ticketId) {
            showError('No se especificó un ticket');
            return;
        }
        
        AppState.currentTicketId = ticketId;
        
        auth.onAuthStateChanged(async (user) => {
            if (user) {
                AppState.currentUser = user;
                const loaded = await loadUserData(user);
                if (loaded) {
                    setupEventListeners(); 
                    await loadTicketInfo(ticketId);
                }
            } else {
                showError('Debes iniciar sesión para acceder a esta página');
                setTimeout(() => {
                    window.location.href = '/vista/nav-visitantes/inicio-de-sesion/inicio-de-sesion.html';
                }, 2000);
            }
        });
    }
    
    document.addEventListener('DOMContentLoaded', initApp);
})();
