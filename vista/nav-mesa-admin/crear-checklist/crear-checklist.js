// Configuración de Firebase
  const firebaseConfig = {
    apiKey: "AIzaSyBJy992gkvsT77-_fMp_O_z99wtjZiK77Y",
    authDomain: "rsienterprise.firebaseapp.com",
    databaseURL: "https://rsienterprise-default-rtdb.firebaseio.com",
    projectId: "rsienterprise",
    storageBucket: "rsienterprise.appspot.com",
    messagingSenderId: "1063117165770",
    appId: "1:1063117165770:web:8555f26b25ae80bc42d033",
    measurementId: "G-38F2DBG9HE"
  };

  // Inicializar Firebase
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }

  const db = firebase.firestore();
  //const auth = firebase.auth();

  // Variables globales
  let vehicles = [];
  let collaborators = [];
  let selectedVehicle = null;
  let selectedCollaborator = null;
  let currentStep = 1;

  let currentPhotoType = null;
  let cameraStream = null;

  window.vehiclePhotos = {};
  window.vehicleDetails = [];

  // 🧭 CARGA INICIAL TRAS LOGIN
  document.addEventListener('DOMContentLoaded', function () {
    //auth.onAuthStateChanged(user => {
     // if (user) {
       // console.log('Usuario autenticado:', user.email);
        initialLoad();
        
      //} else {
        //console.log('No hay usuario autenticado, redirigiendo...');
        //window.location.href = '../nav-visitantes/inicio-de-sesion.html';
      //}
    //});
  });
  
  // 📷 CERRAR CÁMARA Y LIMPIAR RECURSOS
function closeCamera() {
    const cameraModal = document.getElementById('cameraModal');
    const cameraVideo = document.getElementById('cameraVideo');
    const cameraCanvas = document.getElementById('cameraCanvas');
    const captureBtn = document.getElementById('captureBtn');
    const retakeBtn = document.getElementById('retakeBtn');
    const usePhotoBtn = document.getElementById('usePhotoBtn');
    
    // Ocultar modal
    cameraModal.style.display = 'none';
    
    // Detener stream de cámara
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
    }
    
    // Resetear controles de cámara
    if (cameraVideo) {
        cameraVideo.style.display = 'block';
        cameraVideo.srcObject = null;
    }
    
    if (cameraCanvas) {
        cameraCanvas.style.display = 'none';
    }
    
    if (captureBtn) captureBtn.style.display = 'block';
    if (retakeBtn) retakeBtn.style.display = 'none';
    if (usePhotoBtn) usePhotoBtn.style.display = 'none';
    
    // Limpiar tipo de foto actual
    currentPhotoType = null;
    
    console.log('📷 Cámara cerrada correctamente');
}


 // 📷 ABRIR MODAL DE CÁMARA (VERSIÓN MEJORADA)
async function openCameraModal(photoType) {
    const cameraModal = document.getElementById('cameraModal');
    const cameraModalTitle = document.getElementById('cameraModalTitle');
    const cameraVideo = document.getElementById('cameraVideo');
    
    if (!cameraModal || !cameraModalTitle || !cameraVideo) {
        console.error('❌ Elementos del modal de cámara no encontrados');
        return;
    }

    currentPhotoType = photoType;
    
    // Actualizar título del modal
    cameraModalTitle.textContent = `Tomar Foto - ${photoType.label}`;
    
    try {
        console.log('📷 Iniciando cámara para:', photoType.label);
        
        cameraModal.style.display = 'flex';
        cameraStream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                facingMode: 'environment',
                width: { ideal: 1280 },
                height: { ideal: 720 }
            } 
        });
        
        cameraVideo.srcObject = cameraStream;
        
        // Resetear controles
        cameraVideo.style.display = 'block';
        document.getElementById('cameraCanvas').style.display = 'none';
        document.getElementById('captureBtn').style.display = 'block';
        document.getElementById('retakeBtn').style.display = 'none';
        document.getElementById('usePhotoBtn').style.display = 'none';
        
        console.log('✅ Cámara iniciada correctamente');
        
    } catch (error) {
        console.error('❌ Error al acceder a la cámara:', error);
        
        // Cerrar modal en caso de error
        closeCamera();
        
        let errorMessage = 'No se pudo acceder a la cámara. ';
        
        if (error.name === 'NotAllowedError') {
            errorMessage += 'Permiso denegado. Por favor permite el acceso a la cámara en tu navegador.';
        } else if (error.name === 'NotFoundError') {
            errorMessage += 'No se encontró ninguna cámara disponible.';
        } else if (error.name === 'NotSupportedError') {
            errorMessage += 'Tu navegador no soporta esta funcionalidad.';
        } else {
            errorMessage += error.message;
        }
        
        Swal.fire({
            icon: 'error',
            title: 'Error de Cámara',
            text: errorMessage,
            confirmButtonText: 'Aceptar'
        });
    }
}

  async function initialLoad() {
    try {
      await loadVehicles();
      await loadCollaborators();
      setupEventListeners();

      window.vehiclePhotos = {};
    } catch (error) {
      console.error("Error en la carga inicial:", error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudieron cargar los datos iniciales: ' + error.message,
        confirmButtonText: 'Aceptar'
      });
    }
  }

  // 🚗 CARGAR VEHÍCULOS
  async function loadVehicles() {
    try {
      const vehicleSelect = document.getElementById('vehicleSelect');
      vehicleSelect.innerHTML = '<option value="">Cargando vehículos...</option>';

      const snapshot = await db.collection('automoviles').get();
      vehicles = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      populateVehicleSelect();
    } catch (error) {
      console.error('Error al cargar vehículos:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudieron cargar los vehículos: ' + error.message,
        confirmButtonText: 'Aceptar'
      });
    }
  }


  function populateVehicleSelect() {
    const vehicleSelect = document.getElementById('vehicleSelect');
    vehicleSelect.innerHTML = '';

    const emptyOption = document.createElement('option');
    emptyOption.value = "";
    emptyOption.textContent = "Selecciona un vehículo";
    vehicleSelect.appendChild(emptyOption);

    vehicles.forEach(vehicle => {
      const option = document.createElement('option');
      option.value = vehicle.id;
      let displayText = vehicle.name || 'Sin nombre';
      if (vehicle.plates) displayText += ` (${vehicle.plates})`;
      option.textContent = displayText;
      vehicleSelect.appendChild(option);
    });
  }

  // 👤 CARGAR COLABORADORES (IGUAL QUE EN TU OTRO SCRIPT)
  async function loadCollaborators() {
    try {
      const collaboratorList = document.getElementById('collaboratorList');
      collaboratorList.innerHTML = '<div class="collaborator-item">Cargando colaboradores...</div>';

      const snapshot = await db.collection('colaboradores').get();
      collaborators = snapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().NOMBRE || 'Sin nombre',
        
        department: doc.data().ÁREA || 'Sin área',
        
      }));

      displayCollaborators();
    } catch (error) {
      console.error('Error al cargar colaboradores:', error);
      const collaboratorList = document.getElementById('collaboratorList');
      collaboratorList.innerHTML = '<div class="collaborator-item">Error al cargar colaboradores</div>';

      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudieron cargar los colaboradores: ' + error.message,
        confirmButtonText: 'Aceptar'
      });
    }
  }

  function displayCollaborators(filter = '') {
    const collaboratorList = document.getElementById('collaboratorList');
    collaboratorList.innerHTML = '';

    const filteredCollaborators = collaborators.filter(collaborator => {
      const searchTerm = filter.toLowerCase();
      return (
        collaborator.name.toLowerCase().includes(searchTerm) ||
        collaborator.department.toLowerCase().includes(searchTerm)
      );
    });

    if (filteredCollaborators.length === 0) {
      collaboratorList.innerHTML = '<div class="collaborator-item">No se encontraron colaboradores</div>';
      return;
    }

    filteredCollaborators.forEach(collaborator => {
      const collaboratorItem = document.createElement('div');
      collaboratorItem.className = 'collaborator-item';
      collaboratorItem.dataset.id = collaborator.id;

      collaboratorItem.innerHTML = `
        <div class="collaborator-name">${collaborator.name}</div>
         <div class="collaborator-department">${collaborator.department}</div>
      `;

      collaboratorItem.addEventListener('click', () => {
        document.querySelectorAll('.collaborator-item.selected').forEach(item => {
          item.classList.remove('selected');
        });

        collaboratorItem.classList.add('selected');
        selectCollaborator(collaborator.id);
      });

      collaboratorList.appendChild(collaboratorItem);
    });
  }

  function selectCollaborator(collaboratorId) {
    selectedCollaborator = collaborators.find(c => c.id === collaboratorId);

    if (selectedCollaborator) {
      document.getElementById('collaborator-name').textContent = selectedCollaborator.name;
      document.getElementById('collaborator-department').textContent = selectedCollaborator.department;

      document.getElementById('collaboratorDetails').classList.add('active');
      document.getElementById('next-to-step-3').disabled = false;
    }
  }

  // 🔁 CONFIGURAR EVENTOS
  function setupEventListeners() {
    const vehicleSelect = document.getElementById('vehicleSelect');
    vehicleSelect.addEventListener('change', function () {
        displayVehicleDetails(this.value);
    });

    const collaboratorSearch = document.getElementById('collaboratorSearch');
    collaboratorSearch.addEventListener('input', function () {
        displayCollaborators(this.value);
    });

    // Navegación entre pasos
    // Paso 1 -> 2
    document.getElementById('next-to-step-2').addEventListener('click', () => goToStep(2));

    // Paso 2 -> 1 | 2 -> 3
    document.getElementById('prev-to-step-1').addEventListener('click', () => goToStep(1));
    document.getElementById('next-to-step-3').addEventListener('click', () => goToStep(3));
    
    // Paso 3 -> 2 | 3 -> 4
    document.getElementById('prev-to-step-2').addEventListener('click', () => goToStep(2));
    document.getElementById('next-to-step-4').addEventListener('click', () => goToStep(4));

    // Paso 4 -> 3 | 4 -> 5
    document.getElementById('prev-to-step-3').addEventListener('click', () => goToStep(3));
    document.getElementById('next-to-step-5').addEventListener('click', () => goToStep(5));

    // Paso 5 -> 4 | 5 -> 6
    document.getElementById('prev-to-step-4').addEventListener('click', () => goToStep(4));
    document.getElementById('next-to-step-6').addEventListener('click', () => goToStep(6));

    // Paso 6 -> 5 | 6 -> 7
    document.getElementById('prev-to-step-5').addEventListener('click', () => goToStep(5));
    document.getElementById('next-to-step-7').addEventListener('click', () => goToStep(7));

    // Paso 7 -> 6 | 7 -> 8
    document.getElementById('prev-to-step-6').addEventListener('click', () => goToStep(6));
    document.getElementById('next-to-step-8').addEventListener('click', () => goToStep(8));

    // Paso 8 -> 7 | 8 -> Submit
    document.getElementById('prev-to-step-7').addEventListener('click', () => goToStep(7));
    document.getElementById('submit-checklist').addEventListener('click', saveChecklist);
    
    const addDetailBtn = document.getElementById('addDetailBtn');
    const detailInput = document.getElementById('detailInput');
    const detailList = document.getElementById('detailList');

    if (addDetailBtn) {
        addDetailBtn.addEventListener('click', () => {
            const detailText = detailInput.value.trim();
            if (detailText) {
                window.vehicleDetails.push(detailText);
                renderDetailList(); // Actualizar la UI
                detailInput.value = ''; // Limpiar input
            }
        });
    }

    if (detailList) {
        // Event delegation para los botones de eliminar
        detailList.addEventListener('click', (e) => {
            if (e.target.classList.contains('remove-detail-btn')) {
                const index = parseInt(e.target.dataset.index, 10);
                window.vehicleDetails.splice(index, 1); // Quitar del array
                renderDetailList(); // Actualizar la UI
            }
        });
    }
    
    
    // CONFIGURAR EVENTOS DE CÁMARA
    setupCameraEvents();
}

  // Función para cambiar de paso
  function goToStep(step) {
    // Ocultar todos los pasos
    document.querySelectorAll('.form-step').forEach(formStep => {
      formStep.classList.remove('active');
    });

    // Mostrar el paso actual
    document.getElementById(`step-${step}-form`).classList.add('active');

    // Actualizar barra de progreso
    document.querySelectorAll('.step').forEach(stepElement => {
      stepElement.classList.remove('active', 'completed');
    });

    for (let i = 1; i <= step; i++) {
      if (i < step) {
        document.getElementById(`step-${i}`).classList.add('completed');
      } else {
        document.getElementById(`step-${i}`).classList.add('active');
      }
    }

    // Actualizar la barra de progreso visual
    const progressBar = document.querySelector('.progress-bar');
    const progressPercentage = ((step - 1) / 2) * 100;
    progressBar.style.setProperty('--progress-width', `${progressPercentage}%`);
    
    if(step === 3)
    {
      populateStep3Data();
    }

    if (step === 4) {
        // La 'key' en Firebase, el 'id' del div en HTML
        populateChecklistSection('documentos', 'documentos-checklist');
    }
    if (step === 5) {
        populateChecklistSection('accesorios', 'accesorios-checklist');
    }
    if (step === 6) {
        populateChecklistSection('seguridad', 'seguridad-checklist');
    }
    if (step === 7) {
        populateChecklistSection('equipamiento', 'equipamiento-checklist');
    }
    
    if (step === 8) {
      updateSummary();
    }
    // Actualizar variable de paso actual
    currentStep = step;

    // Si vamos al paso 8, actualizar el resumen
   
  }

  // 🚀 MOSTRAR DETALLES VEHÍCULO
  function displayVehicleDetails(vehicleId) {
    console.log('ID del vehículo seleccionado:', vehicleId);
    console.log('Lista de vehículos cargados:', vehicles);

    const vehicle = vehicles.find(v => v.id === vehicleId);
    console.log('Vehículo encontrado:', vehicle);

    const photoEvidenceSection = document.getElementById('photoEvidenceSection');
    const vehicleDetails = document.getElementById('vehicleDetails');

    if (!vehicle) {
        console.warn('No se encontró el vehículo con el ID proporcionado.');
        photoEvidenceSection.style.display = 'none';
        if (vehicleDetails) vehicleDetails.style.display = 'none';
        selectedVehicle = null;
        document.getElementById('next-to-step-2').disabled = true;
        return;
    }

    // OCULTAR DETALLES DEL VEHÍCULO (según tu solicitud)
    if (vehicleDetails) {
        vehicleDetails.style.display = 'none';
    }

    // MOSTRAR SECCIÓN DE FOTOS ESPECÍFICAS
    photoEvidenceSection.style.display = 'block';
    
    // INICIALIZAR LA SECCIÓN DE FOTOS ESPECÍFICAS
    initSpecificPhotoSection();
    
    selectedVehicle = vehicle;
    document.getElementById('next-to-step-2').disabled = false;
}
// 📸 INICIALIZAR SECCIÓN DE FOTOS ESPECÍFICAS
function initSpecificPhotoSection() {
    const specificPhotoGrid = document.getElementById('specificPhotoGrid');
    const methodButtons = document.querySelectorAll('.capture-method-btn');
    
    // Definir las 5 fotos específicas requeridas
    const photoTypes = [
        {
            id: 'frontal',
            label: 'Vista Frontal',
            description: 'Foto completa del frente del vehículo',
            icon: 'fas fa-car-front'
        },
        {
            id: 'lateral-izquierdo',
            label: 'Lateral Izquierdo',
            description: 'Foto del lado izquierdo completo',
            icon: 'fas fa-arrow-left'
        },
        {
            id: 'lateral-derecho',
            label: 'Lateral Derecho',
            description: 'Foto del lado derecho completo',
            icon: 'fas fa-arrow-right'
        },
        {
            id: 'posterior',
            label: 'Vista Posterior',
            description: 'Foto completa de la parte trasera',
            icon: 'fas fa-car-rear'
        },
        {
            id: 'luces',
            label: 'Sistema de Luces',
            description: 'Foto que muestre el estado de las luces',
            icon: 'fas fa-lightbulb'
        }
    ];

    // Generar los 5 slots específicos
    specificPhotoGrid.innerHTML = '';
    photoTypes.forEach((photoType, index) => {
        const photoItem = document.createElement('div');
        photoItem.className = 'photo-evidence-item';
        photoItem.dataset.photoType = photoType.id;
        photoItem.innerHTML = `
            <input type="file" accept="image/*" class="file-input" data-photo-type="${photoType.id}">
            <img class="photo-preview" data-photo-type="${photoType.id}">
            <div class="photo-placeholder">
                <i class="${photoType.icon} photo-evidence-icon"></i>
                <div class="photo-evidence-label">${photoType.label}</div>
                <div class="photo-evidence-description">${photoType.description}</div>
                <small>Haz clic para ${document.querySelector('.capture-method-btn.active').dataset.method === 'camera' ? 'tomar foto' : 'subir imagen'}</small>
            </div>
            <button type="button" class="photo-camera-btn" data-photo-type="${photoType.id}">
                <i class="fas fa-camera"></i>
            </button>
            <button type="button" class="remove-photo-btn" data-photo-type="${photoType.id}">
                <i class="fas fa-times"></i>
            </button>
        `;
        specificPhotoGrid.appendChild(photoItem);

        // Configurar eventos para este item
        setupPhotoItemEvents(photoItem, photoType);
    });

    // Configurar método de captura
    let selectedMethod = 'camera';
    methodButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            methodButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedMethod = btn.dataset.method;
            
            // Actualizar textos de ayuda
            document.querySelectorAll('.photo-evidence-item').forEach(item => {
                const helpText = item.querySelector('small');
                if (helpText) {
                    helpText.textContent = `Haz clic para ${selectedMethod === 'camera' ? 'tomar foto' : 'subir imagen'}`;
                }
            });
        });
    });

    console.log('✅ Sección de fotos específicas inicializada');
}

// ⚙️ CONFIGURAR EVENTOS PARA CADA ITEM DE FOTO
function setupPhotoItemEvents(photoItem, photoType) {
    const fileInput = photoItem.querySelector('.file-input');
    const cameraBtn = photoItem.querySelector('.photo-camera-btn');
    const removeBtn = photoItem.querySelector('.remove-photo-btn');
    const preview = photoItem.querySelector('.photo-preview');

    // Click en el item principal
    photoItem.addEventListener('click', (e) => {
        if (!e.target.classList.contains('photo-camera-btn') && 
            !e.target.classList.contains('remove-photo-btn')) {
            const method = document.querySelector('.capture-method-btn.active').dataset.method;
            if (method === 'camera') {
                openCameraModal(photoType);
            } else {
                fileInput.click();
            }
        }
    });

    // Subida de archivo
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        if (!file.type.startsWith('image/')) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Por favor selecciona solo archivos de imagen',
                confirmButtonText: 'Aceptar'
            });
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'La imagen no puede ser mayor a 5MB',
                confirmButtonText: 'Aceptar'
            });
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            updatePhotoPreview(photoType.id, reader.result);
        };
        reader.readAsDataURL(file);
    });

    // Botón de cámara
    cameraBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openCameraModal(photoType);
    });

    // Botón de eliminar
    removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        removePhoto(photoType.id);
    });
}

// CONFIGURAR EVENTOS DE LA CÁMARA
function setupCameraEvents() {
    const closeCameraBtn = document.querySelector('.close-camera');
    const captureBtn = document.getElementById('captureBtn');
    const retakeBtn = document.getElementById('retakeBtn');
    const usePhotoBtn = document.getElementById('usePhotoBtn');
    const cameraVideo = document.getElementById('cameraVideo');
    const cameraCanvas = document.getElementById('cameraCanvas');
    const cameraModal = document.getElementById('cameraModal');

    if(!closeCameraBtn || !captureBtn)
    {
      console.warn('Elementos de cámara no encontrados en el DOM');
      return;
    }

    // Cerrar cámara
    closeCameraBtn.addEventListener('click', closeCamera);

    // Capturar foto
    captureBtn.addEventListener('click', () => {
      try {
        const ctx = cameraCanvas.getContext('2d');
        cameraCanvas.width = cameraVideo.videoWidth;
        cameraCanvas.height = cameraVideo.videoHeight;
        ctx.drawImage(cameraVideo, 0, 0);
        
        cameraVideo.style.display = 'none';
        cameraCanvas.style.display = 'block';
        captureBtn.style.display = 'none';
        retakeBtn.style.display = 'block';
        usePhotoBtn.style.display = 'block';
        console.log('📸 Foto capturada');
      } catch (error) {
        console.error('Error al capturar foto:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No se pudo capturar la foto',
                confirmButtonText: 'Aceptar'
            });
        }
    });

    // Volver a tomar
    retakeBtn.addEventListener('click', () => {
        cameraVideo.style.display = 'block';
        cameraCanvas.style.display = 'none';
        captureBtn.style.display = 'block';
        retakeBtn.style.display = 'none';
        usePhotoBtn.style.display = 'none';
    });

    // Usar foto
     usePhotoBtn.addEventListener('click', () => {
        try {
            if (!currentPhotoType) {
                console.error('No hay tipo de foto seleccionado');
                return;
            }
            const photoId = currentPhotoType.id;
            const imageData = cameraCanvas.toDataURL('image/jpeg', 0.8);
            updatePhotoPreview(photoId, imageData);
            closeCamera();
            console.log('✅ Foto utilizada para:', photoId);
        } catch (error) {
            console.error('Error al usar foto:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No se pudo guardar la foto',
                confirmButtonText: 'Aceptar'
            });
        }
    });

    cameraModal.addEventListener('click', (e) => {
        if (e.target === cameraModal) {
            closeCamera();
        }
    });
}



  // 🧾 GUARDAR CHECKLIST
  async function saveChecklist() {
    try {
        // Validar que se hayan subido todas las fotos requeridas
        const requiredPhotos = ['frontal', 'lateral-izquierdo', 'lateral-derecho', 'posterior', 'luces'];
        const missingPhotos = requiredPhotos.filter(photoType => !window.vehiclePhotos || !window.vehiclePhotos[photoType]);
        
        if (missingPhotos.length > 0) {
            Swal.fire({
                icon: 'warning',
                title: 'Fotos requeridas',
                text: `Debes capturar las siguientes fotos: ${missingPhotos.join(', ')}`,
                confirmButtonText: 'Aceptar'
            });
            return;
        }
        //2. Recolectar datos del viaje (del paso 3)

        const tripData = {
          fecha: document.getElementById('fecha').value,
          horaSalida: document.getElementById('horaSalida').value,
          origen: document.getElementById('origen').value,
          destino: document.getElementById('destino').value,
          kmSalida: document.getElementById('kmSalida').value
        };
        //3. Recolectar checklists de los pasos 4-7
        const checklists = {
          documentos: {
                  items: getCheckedItems('documentos-checklist'),
                  obs: document.getElementById('documentos-observaciones').value
              },
            accesorios: {
                  items: getCheckedItems('accesorios-checklist'),
                  obs: document.getElementById('accesorios-observaciones').value
              },
            seguridad: {
                  items: getCheckedItems('seguridad-checklist'),
                  obs: document.getElementById('seguridad-observaciones').value
              },
            equipamiento: {
                  items: getCheckedItems('equipamiento-checklist'),
                  obs: document.getElementById('equipamiento-observaciones').value
              }
        }; 

        //4. Construir el objeto completo del checklist
        const checklistData = {
            vehicleId: selectedVehicle.id,
            vehicleInfo: {
                name: selectedVehicle.name,
                brand: selectedVehicle.brand,
                model: selectedVehicle.model,
                plates: selectedVehicle.plates,
                
            },
            collaboratorId: selectedCollaborator.id,
            collaboratorInfo: {
                name: selectedCollaborator.name,
                department: selectedCollaborator.department,
                
            },
            tripInfo : tripData, // Datos del paso 3
            checklists: checklists, // Checklists de los pasos 4-7
            vehicleDetails: window.vehicleDetails || [],
            // INCLUIR LAS FOTOS ESPECÍFICAS
            vehiclePhotos: window.vehiclePhotos,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            status: 'pending'
        };

        console.log('Datos del checklist a guardar:', checklistData);
        const docRef = await db.collection('checkList').add(checklistData);

        Swal.fire({
            icon: 'success',
            title: 'Checklist creado',
            text: `El checklist se ha creado correctamente`,
            confirmButtonText: 'Aceptar'
        }).then(() => {
            // Limpiar fotos después de guardar
            window.vehiclePhotos = {};
            window.location.reload();
        });
    } catch (error) {
        console.error('Error al guardar el checklist:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudo guardar el checklist: ' + error.message,
            confirmButtonText: 'Aceptar'
        });
    }
}

function getCheckedItems(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return [];
    
    // Buscar todos los inputs 'checked' dentro del contenedor
    const checkedBoxes = container.querySelectorAll('input[type="checkbox"]:checked');
    
    // Convertir la lista de elementos a un array de sus valores (texto)
    return Array.from(checkedBoxes).map(cb => cb.value);
}

// 📸 ACTUALIZAR VISTA PREVIA DE FOTO
function updatePhotoPreview(photoType, imageData) {
 const photoItem = document.querySelector(`[data-photo-type="${photoType}"]`);
 const preview = photoItem.querySelector('.photo-preview');
 
  preview.src = imageData;
  photoItem.classList.add('has-image');
  
  // Guardar en variable global
  if (!window.vehiclePhotos) window.vehiclePhotos = {};
  window.vehiclePhotos[photoType] = imageData;
  
  console.log(`✅ Foto ${photoType} actualizada`);
}

// 🗑️ ELIMINAR FOTO
function removePhoto(photoType) {
    const photoItem = document.querySelector(`[data-photo-type="${photoType}"]`);
    const preview = photoItem.querySelector('.photo-preview');
    const fileInput = photoItem.querySelector('.file-input');
    
    preview.src = '';
    photoItem.classList.remove('has-image');
    fileInput.value = '';
    
    // Eliminar de variable global
    if (window.vehiclePhotos) {
     delete window.vehiclePhotos[photoType];
    }
    
    console.log(`🗑️ Foto ${photoType} eliminada`);
}

// 📋 ACTUALIZAR RESUMEN (PASO 8)
function updateSummary() {
    // Paso 1: Vehículo
    if (selectedVehicle) {
        document.getElementById('summary-vehicle').textContent = 
            `${selectedVehicle.name} (${selectedVehicle.plates || 'Sin placas'})`;
    } else {
        document.getElementById('summary-vehicle').textContent = 'No seleccionado';
    }

    // Paso 2: Colaborador
    if (selectedCollaborator) {
        document.getElementById('summary-collaborator').textContent = 
            `${selectedCollaborator.name} (${selectedCollaborator.department})`;
    } else {
        document.getElementById('summary-collaborator').textContent = 'No seleccionado';
    }

    // Paso 3: Datos del Día
    const fecha = document.getElementById('fecha').value || '[Sin Fecha]';
    const hora = document.getElementById('horaSalida').value || '[Sin Hora]';
    document.getElementById('summary-fecha-hora').textContent = `${fecha}, ${hora}`;
    
    const origen = document.getElementById('origen').value || '[Sin Origen]';
    const destino = document.getElementById('destino').value || '[Sin Destino]';
    document.getElementById('summary-ruta').textContent = `${origen} -> ${destino}`;
    
    const kmSalida = document.getElementById('kmSalida').value || '0';
    document.getElementById('summary-km-salida').textContent = `${kmSalida} KM`;

    const detailsContainer = document.getElementById('summary-vehicle-details');
    detailsContainer.innerHTML = '';
    if(window.vehicleDetails && window.vehicleDetails.length > 0) { 
      const ul = document.createElement('ul');
      ul.style.paddingLeft = '20px';
      window.vehicleDetails.forEach(detail => {
          const li = document.createElement('li');
          li.textContent = detail;
          ul.appendChild(li);
      });
      detailsContainer.appendChild(ul);
    }
    else
    {
      detailsContainer.textContent = 'No se agregaron detalles del vehículo.';
    }
    // Paso 4-7: Checklists
    const docsCount = getCheckedItems('documentos-checklist').length;
    document.getElementById('summary-documentos').textContent = `${docsCount} ítems verificados`;
    const accCount = getCheckedItems('accesorios-checklist').length;
    document.getElementById('summary-accesorios').textContent = `${accCount} ítems verificados`;
    const segCount = getCheckedItems('seguridad-checklist').length;
    document.getElementById('summary-seguridad').textContent = `${segCount} ítems verificados`;
    const equipCount = getCheckedItems('equipamiento-checklist').length;
    document.getElementById('summary-equipamiento').textContent = `${equipCount} ítems verificados`;

    //Fotos
    // --- Evidencia Fotográfica ---
    const photoGrid = document.getElementById('summary-photo-grid');
    photoGrid.innerHTML = ''; // Limpiar la cuadrícula por si se actualiza

    const photoTypes = ['frontal', 'lateral-izquierdo', 'lateral-derecho', 'posterior', 'luces'];

    if (window.vehiclePhotos && Object.keys(window.vehiclePhotos).length > 0) {
        
        photoTypes.forEach(key => {
            const imgData = window.vehiclePhotos[key];
            if (imgData) {
                const img = document.createElement('img');
                img.src = imgData;
                img.alt = `Foto ${key}`;
                photoGrid.appendChild(img);
            }
        });

    } else {
        photoGrid.textContent = "No se han capturado imágenes.";
    }
}

//Rellenar datos del paso 3
function populateStep3Data() {
  const fechaInput = document.getElementById('fecha');
  const horaInput = document.getElementById('horaSalida');
  const now = new Date();

  //Debug
  console.log('Hora del sistema:', now.toString());

  // Formatear fecha como YYYY-MM-DD
  if(!fechaInput.value){
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    fechaInput.value = `${year}-${month}-${day}`;
  }

  //if(!horaInput.value){
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    horaInput.value = `${hours}:${minutes}`;
  //}

  getOriginLocation();
}


// Obtener ubicación de origen
function getOriginLocation() {
 const origenInput = document.getElementById('origen');

 // Verificar si el navegador soporta geolocalización
 if(origenInput.value|| !navigator.geolocation) {
   return;
 }

 origenInput.placeholder="Obteniendo ubicación...";
 navigator.geolocation.getCurrentPosition(
  (position) =>{// Éxito
    const lat = position.coords.latitude;
    const lon = position.coords.longitude;

    // Usar una API de geocodificación inversa para obtener la dirección
    fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`)
      .then(response => response.json())
      .then(data => {
        if(data && data.display_name){
          origenInput.value = data.display_name;
        } 
        else
        {
          origenInput.value = 'Coordenadas: '+lat.toFixed(4)+', '+lon.toFixed(4);
        }
        origenInput.placeholder="Lugar de Salida";
      })
      .catch(err =>{
        console.error('Error en geocodificación inversa:', err);
        origenInput.placeholder = "Lugar de Salida";
        origenInput.value = 'Coordenadas: '+lat.toFixed(4)+', '+lon.toFixed(4);
      });
  },
  (error) =>{// Error
    console.warn(`Error de geolocalización (${error.code}): ${error.message}`);
    if(error.code === 1)
    {
      origenInput.placeholder = "Permiso de ubicación denegado";
    }
    else
    {
      origenInput.placeholder = "No se pudo obtener ubicación";
    }
  }
  );
}

function populateChecklistSection(dataKey, containerId) {
  const container = document.getElementById(containerId);

  //1 validar que el contenedor exista
  if(!container) return;

  if(!selectedVehicle)
  {
    container.innerHTML = '<div class="checklist-item">Selecciona un vehículo para cargar el checklist.</div>';
    return;
  }

  //2. Obtener La lista de items del checklist desde Firestore
  const items = selectedVehicle[dataKey];
  if(!items || items.length === 0)
  {
    container.innerHTML = `<p class="info-text">No se encontraron ítems de '${dataKey}' para este vehículo.</p>`;
    return;
  }

  //3 Solo poblar si hay items
  if(container.children.length > 0)
  {
    return;
  }

  //4. Generar HTML para cada ítem
  items.forEach((item, index) => {
    const itemId = `${dataKey}-item-`+index;
    
    const itemHTML = `
     <div class= "checkbox-item" >
<input type="checkbox" id="${itemId}" name="${itemId}" value="${item}">       <label for="${itemId}">${item}</label>
     </div>
    `;
    container.insertAdjacentHTML('beforeend', itemHTML);
  });
}

// 🚗 RENDERIZA LA LISTA DE DETALLES EN EL PASO 1
function renderDetailList() {
    const listElement = document.getElementById('detailList');
    if (!listElement) return;
    
    listElement.innerHTML = ''; // Limpiar lista
    
    if (window.vehicleDetails.length === 0) {
        listElement.innerHTML = '<li class="info-text">No se han añadido detalles.</li>';
        return;
    }
    
    window.vehicleDetails.forEach((detail, index) => {
        const item = document.createElement('li');
        item.className = 'detail-item';
        item.innerHTML = `
            <span>${detail}</span>
            <button type="button" class="remove-detail-btn" data-index="${index}">
              &times;
            </button>
        `;
        listElement.appendChild(item);
    });
}

// Agregar detalle
document.getElementById('addDetailBtn').addEventListener('click', () => {
  const detailInput = document.getElementById('detailInput');
  const detail = detailInput.value.trim();
  if (detail) {
    window.vehicleDetails.push(detail);
    renderDetailList();
    detailInput.value = '';
  }
});

// Eliminar detalle
document.getElementById('detailList').addEventListener('click', (event) => {
  if (event.target.classList.contains('remove-detail-btn')) {
    const index = event.target.getAttribute('data-index');
    if (index !== null) {
      window.vehicleDetails.splice(index, 1);
      renderDetailList();
    }
  }
});