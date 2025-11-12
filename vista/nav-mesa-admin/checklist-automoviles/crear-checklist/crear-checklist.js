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

  async function initialLoad() {
    try {
      await loadVehicles();
      await loadCollaborators();
      initializeImageGrid();
      setupEventListeners();
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
  // Configurar la cuadrícula de imágenes
        function initializeImageGrid() {
            const imageGrid = document.getElementById('imageGrid');
            imageGrid.innerHTML = '';

            for (let i = 0; i < 5; i++) {
                const imageItem = document.createElement('div');
                imageItem.className = 'image-upload-item';
                imageItem.innerHTML = `
                    <input type="file" accept="image/*" id="imageInput${i}" data-index="${i}">
                    <img class="image-preview" id="imagePreview${i}">
                    <div class="image-placeholder">
                        <i class="fas fa-camera"></i>
                        <span>Imagen ${i + 1}</span>
                    </div>
                    <button type="button" class="remove-image" data-index="${i}">
                        <i class="fas fa-times"></i>
                    </button>
                `;
                imageGrid.appendChild(imageItem);
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
        email: doc.data().EMAIL || 'Sin email',
        department: doc.data().ÁREA || 'Sin área',
        position: doc.data().PUESTO || 'Sin puesto'
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
        collaborator.email.toLowerCase().includes(searchTerm) ||
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
        <div class="collaborator-email">${collaborator.email}</div>
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
      document.getElementById('collaborator-email').textContent = selectedCollaborator.email;
      document.getElementById('collaborator-department').textContent = selectedCollaborator.department;
      document.getElementById('collaborator-position').textContent = selectedCollaborator.position;

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

    document.getElementById('next-to-step-2').addEventListener('click', () => goToStep(2));
    document.getElementById('next-to-step-3').addEventListener('click', () => goToStep(3));
    document.getElementById('prev-to-step-1').addEventListener('click', () => goToStep(1));
    document.getElementById('prev-to-step-2').addEventListener('click', () => goToStep(2));
    document.getElementById('submit-checklist').addEventListener('click', saveChecklist);
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

    // Actualizar variable de paso actual
    currentStep = step;

    // Si vamos al paso 3, actualizar el resumen
    if (step === 3) {
      updateSummary();
    }
  }

  // 🚀 MOSTRAR DETALLES VEHÍCULO
  function displayVehicleDetails(vehicleId) {
    const vehicle = vehicles.find(v => v.id === vehicleId);
    const vehicleDetails = document.getElementById('vehicleDetails');

    if (!vehicle) {
      vehicleDetails.classList.remove('active');
      selectedVehicle = null;
      document.getElementById('next-to-step-2').disabled = true;
      return;
    }

    document.getElementById('detail-brand').textContent = vehicle.brand || 'No especificado';
    document.getElementById('detail-model').textContent = vehicle.model || 'No especificado';
    document.getElementById('detail-plates').textContent = vehicle.plates || 'No especificado';
    document.getElementById('detail-color').textContent = vehicle.color || 'No especificado';

    const imageContainer = document.getElementById('detail-image-container');
    const imageElement = document.getElementById('detail-image');
    if (vehicle.image) {
      imageElement.src = vehicle.image;
      imageContainer.style.display = 'block';
    } else {
      imageContainer.style.display = 'none';
    }

    vehicleDetails.classList.add('active');
    selectedVehicle = vehicle;
    document.getElementById('next-to-step-2').disabled = false;
  }

  // 🧾 GUARDAR CHECKLIST
  async function saveChecklist() {
    try {
      const checklistData = {
        vehicleId: selectedVehicle.id,
        vehicleName: selectedVehicle.name,
        vehiclePlates: selectedVehicle.plates,
        collaboratorId: selectedCollaborator.id,
        collaboratorName: selectedCollaborator.name,
        collaboratorEmail: selectedCollaborator.email,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        status: 'pending'
      };

      const docRef = await db.collection('checklist-automoviles').add(checklistData);

      Swal.fire({
        icon: 'success',
        title: 'Checklist creado',
        text: `El checklist se ha creado correctamente con ID: ${docRef.id}`,
        confirmButtonText: 'Aceptar'
      }).then(() => window.location.reload());
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

  document.addEventListener('DOMContentLoaded', () => {
    if (window.updateMenuStyles) {
      // Llama a la función global para aplicar los estilos personalizados del menú
      window.updateMenuStyles();
    } else {
      console.warn('La función updateMenuStyles no está disponible.');
    }
  });


