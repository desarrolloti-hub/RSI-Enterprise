// finalizar-ticket.js (sin lógica de pausa, solo finalizar y redirección correcta)
(function() {
    // --- CONSTANTES DE VALIDACIÓN ---
    const MAX_IMAGES = 20;
    const MIN_IMAGES = 1;
    const MAX_DESCRIPTION_LENGTH = 10000;
    const MIN_DESCRIPTION_LENGTH = 10;
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
        selectedImages: [],
        selectedImageFiles: [],
        currentEvidenciaId: null,
        uploadedImagePaths: []
    };

    // --- FUNCIONES DE UTILIDAD ---
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

    async function uploadImageToStorage(file, ticketId, index) {
        try {
            const timestamp = Date.now();
            const extension = file.name.split('.').pop() || 'jpg';
            const fileName = `${timestamp}_${index}.${extension}`;
            const filePath = `FinTickets/${ticketId}/${fileName}`;
            const storageRef = storage.ref().child(filePath);
            await storageRef.put(file);
            const downloadUrl = await storageRef.getDownloadURL();
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

    async function deleteImageFromStorage(path) {
        try {
            if (!path) return;
            const storageRef = storage.ref().child(path);
            await storageRef.delete();
            console.log(`Imagen eliminada: ${path}`);
        } catch (error) {
            console.error("Error eliminando imagen de Storage:", error);
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
        });
    }

    function updateImagePreviews() {
        const previewContainer = document.getElementById('imagePreviewContainer');
        if (!previewContainer) return;
        previewContainer.innerHTML = '';
        
        AppState.selectedImages.forEach((img, index) => {
            const imgPreview = document.createElement('div');
            imgPreview.className = 'image-preview-item';
            let imgSrc = '';
            if (img instanceof File) {
                imgSrc = URL.createObjectURL(img);
            } else if (typeof img === 'string') {
                imgSrc = img;
            } else if (img.url) {
                imgSrc = img.url;
            }
            imgPreview.innerHTML = `
                <img src="${imgSrc}" alt="Preview" style="cursor: pointer;">
                <button class="delete-image-btn" data-index="${index}">
                    <i class="fas fa-trash"></i>
                </button>
            `;
            previewContainer.appendChild(imgPreview);
            imgPreview.querySelector('img').addEventListener('click', () => showImageInSwal(imgSrc));
            imgPreview.querySelector('.delete-image-btn').addEventListener('click', async (e) => {
                e.stopPropagation();
                const idx = parseInt(e.currentTarget.getAttribute('data-index'));
                const imageToDelete = AppState.selectedImages[idx];
                if (imageToDelete && imageToDelete.path) {
                    await deleteImageFromStorage(imageToDelete.path);
                }
                AppState.selectedImages.splice(idx, 1);
                if (AppState.selectedImageFiles) AppState.selectedImageFiles.splice(idx, 1);
                updateImagePreviews();
            });
        });
    }

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

    async function loadExistingEvidences(ticketId) {
        try {
            const evidenciasRef = db.collection('evidenciatickets');
            const q = evidenciasRef.where("ticketId", "==", ticketId).where("colaboradorId", "==", AppState.userData.colaboradorId);
            const querySnapshot = await q.get();
            if (!querySnapshot.empty) {
                const evidencia = querySnapshot.docs[0].data();
                AppState.currentEvidenciaId = querySnapshot.docs[0].id;
                document.getElementById('projectDescription').value = evidencia.descripcion || '';
                document.getElementById('charCount').textContent = evidencia.descripcion?.length || 0;
                AppState.selectedImages = evidencia.imagenes || [];
                updateImagePreviews();
                const urlParams = getUrlParams();
                if (urlParams.edit) {
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
            if (!ticketSnap.exists) throw new Error('El ticket no existe');
            const ticketData = ticketSnap.data();
            const shortId = ticketId.substring(0, 8);
            const colaboradorNames = await getColaboradorNames(ticketData.colaboradores);

            document.getElementById('ticketIdDisplay').textContent = `#${shortId.toUpperCase()}`;
            document.getElementById('ticketTitle').textContent = ticketData.titulo || 'Sin título';
            document.getElementById('ticketStatus').textContent = ticketData.estado || 'Desconocido';
            document.getElementById('ticketPriority').textContent = ticketData.prioridad || 'Media';
            document.getElementById('ticketArea').textContent = ticketData.area || 'General';
            
            const ticketInfoDiv = document.getElementById('ticketInfo');
            if (ticketInfoDiv) {
                // Eliminar elementos previos si existen
                const oldDesc = document.getElementById('ticketDescriptionDisplay');
                if (oldDesc) oldDesc.remove();
                const oldColab = document.getElementById('ticketColaboradoresDisplay');
                if (oldColab) oldColab.remove();
                
                const descriptionP = document.createElement('p');
                descriptionP.id = 'ticketDescriptionDisplay';
                descriptionP.innerHTML = `<strong>Descripción:</strong> <span style="display:block; margin-top:5px; background:var(--card-background); padding:10px; border-radius:4px; border:1px solid var(--border-color); white-space:pre-wrap;">${ticketData.descripcionActividades || 'No se proporcionó descripción.'}</span>`;
                ticketInfoDiv.appendChild(descriptionP);
                
                const colaboradoresP = document.createElement('p');
                colaboradoresP.id = 'ticketColaboradoresDisplay';
                colaboradoresP.innerHTML = `<strong>Colaboradores:</strong> <span style="font-style:italic;">${colaboradorNames}</span>`;
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
            const q = colaboradoresRef.where("CORREO ELECTRÓNICO EMPRESARIAL", "==", user.email);
            const collabSnapshot = await q.get();
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

    async function saveOrUpdateEvidence(description) {
        const finalImages = [];
        const uploadPromises = [];
        for (const img of AppState.selectedImages) {
            if (img.path) {
                finalImages.push(img);
            } else if (img instanceof File) {
                const index = uploadPromises.length;
                const promise = uploadImageToStorage(img, AppState.currentTicketId, index).then(result => finalImages.push(result));
                uploadPromises.push(promise);
            }
        }
        if (uploadPromises.length) await Promise.all(uploadPromises);
        
        const evidenciaData = {
            ticketId: AppState.currentTicketId,
            colaboradorId: AppState.userData.colaboradorId,
            colaboradorNombre: AppState.userData.NOMBRE,
            descripcion: description,
            imagenes: finalImages,
            fechaActualizacion: firebase.firestore.FieldValue.serverTimestamp(),
            estado: 'completado'
        };
        if (AppState.currentEvidenciaId) {
            await db.collection('evidenciatickets').doc(AppState.currentEvidenciaId).update(evidenciaData);
        } else {
            evidenciaData.fechaCreacion = firebase.firestore.FieldValue.serverTimestamp();
            const docRef = await db.collection('evidenciatickets').add(evidenciaData);
            AppState.currentEvidenciaId = docRef.id;
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
        const todosCompletados = colaboradores.every(id => evidenciasCompletadas.includes(id));
        const oldStatus = ticketData.estado || 'desconocido';
        const newStatus = todosCompletados ? 'finalizado' : 'en_proceso';
        const updateData = {
            evidenciasCompletadas,
            estado: newStatus,
            fechaActualizacion: firebase.firestore.FieldValue.serverTimestamp()
        };
        if (todosCompletados) updateData.fechaFinalizacion = firebase.firestore.FieldValue.serverTimestamp();
        await ticketRef.update(updateData);
        await recordHistory(AppState.currentTicketId, oldStatus, newStatus, `Ticket finalizado por colaborador. Estado: ${newStatus}`);
    }

    async function recordHistory(ticketId, oldStatus, newStatus, motivo) {
        try {
            await db.collection('historialTicket').add({
                ticketId,
                fechaCambio: firebase.firestore.FieldValue.serverTimestamp(),
                colaboradorId: AppState.userData.colaboradorId,
                colaboradorNombre: AppState.userData.NOMBRE,
                estadoAnterior: oldStatus,
                estadoNuevo: newStatus,
                motivo: motivo || `Cambio de estado de ${oldStatus} a ${newStatus}`
            });
        } catch (error) {
            console.error('Error registrando historial:', error);
        }
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
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
            hideLoading();
        }
    }

    async function handleImageUpload(files) {
        if (!files || files.length === 0) return;
        const totalImages = AppState.selectedImages.length + files.length;
        if (totalImages > MAX_IMAGES) {
            showError(`Solo puedes subir un máximo de ${MAX_IMAGES} imágenes. Ya tienes ${AppState.selectedImages.length}.`);
            return;
        }
        showLoading('Procesando imágenes...');
        const fileArray = Array.from(files);
        fileArray.forEach(file => AppState.selectedImages.push(file));
        if (!AppState.selectedImageFiles) AppState.selectedImageFiles = [];
        AppState.selectedImageFiles.push(...fileArray);
        hideLoading();
        updateImagePreviews();
    }

    function handlePaste(e) {
        const items = e.clipboardData.items;
        const imageFiles = [];
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                const file = items[i].getAsFile();
                if (file) imageFiles.push(file);
            }
        }
        if (imageFiles.length > 0) {
            e.preventDefault();
            handleImageUpload(imageFiles);
        }
    }

    function setupEventListeners() {
        const textarea = document.getElementById('projectDescription');
        const counter = document.getElementById('charCount');
        const finishForm = document.getElementById('finishTicketForm');
        const cancelBtn = document.getElementById('cancelBtn');
        const input = document.getElementById('imageUpload');
        const pauseRedirectBtn = document.getElementById('pauseRedirectBtn');
        
        textarea.addEventListener('input', function() {
            let length = Math.min(this.value.length, MAX_DESCRIPTION_LENGTH);
            counter.textContent = length;
            if (this.value.length > MAX_DESCRIPTION_LENGTH) {
                this.value = this.value.substring(0, MAX_DESCRIPTION_LENGTH);
            }
        });
        
        input.addEventListener('change', function(e) {
            handleImageUpload(e.target.files);
            e.target.value = '';
        });
        
        document.addEventListener('paste', handlePaste);
        finishForm.addEventListener('submit', handleFormSubmit);
        cancelBtn.addEventListener('click', () => window.location.href = '../gestion-tickets/gestion-tickets.html');
        
        // ---- CORRECCIÓN: Botón Pausar Ticket pasa el ticketId correctamente ----
        if (pauseRedirectBtn) {
            pauseRedirectBtn.addEventListener('click', () => {
                if (AppState.currentTicketId) {
                    const url = `../pausar-Ticket/pausar-ticket.html?ticketId=${AppState.currentTicketId}`;
                    window.location.href = url;
                } else {
                    showError('No se pudo identificar el ticket para pausar.');
                }
            });
        }
    }

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