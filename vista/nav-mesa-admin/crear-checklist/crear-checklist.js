// ==========================================
// CONFIGURACIÓN DE FIREBASE
// ==========================================
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

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const db = firebase.firestore();
const auth = firebase.auth();

// ==========================================
// VARIABLES GLOBALES
// ==========================================
let vehicles = [];
let collaborators = [];
let selectedVehicle = null;
let selectedCollaborator = null;
let currentStep = 1;
let currentPhotoType = null;
let cameraStream = null;

// Variables de Estado
let editChecklistId = null; // Si esto tiene valor, estamos en MODO EDICIÓN
let loadedChecklistData = null; // Almacena la data original traída de FB para edición

window.vehiclePhotos = {};
window.vehicleDetails = [];
window.collaboratorSignature=null;

// ==========================================
// 1. INICIALIZACIÓN Y CARGA
// ==========================================

document.addEventListener('DOMContentLoaded', async function () {
    await initialLoad();
});

async function initialLoad() {
    try {
        // 1. Cargar catálogos base
        await loadVehicles();
        await loadCollaborators();
        
        setupEventListeners();
        window.vehiclePhotos = {};

        // 2. DETECTAR MODO EDICIÓN
        const params = new URLSearchParams(window.location.search);
        editChecklistId = params.get('editId');

        if (editChecklistId) {
            console.log("✏️ MODO EDICIÓN DETECTADO. ID:", editChecklistId);
            await loadDataForEdit(editChecklistId);
        }

    } catch (error) {
        window.manejadorErrorGlobal(error);
    }
}

// --- FUNCIÓN CLAVE: CARGAR DATOS PARA EDITAR ---
async function loadDataForEdit(id) {
    try {
        // Mostrar loading
        Swal.fire({ title: 'Cargando datos...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

        const doc = await db.collection('checkList').doc(id).get();
        if (!doc.exists) throw new Error("El checklist no existe.");

        const data = doc.data();
        loadedChecklistData = data; // Guardamos referencia global

        // A. CAMBIAR TÍTULOS DE UI
        document.querySelector('h1').textContent = "Editar Checklist de Vehículo";
        const submitBtn = document.getElementById('submit-checklist');
        submitBtn.innerHTML = '<i class="fas fa-save"></i> Actualizar Checklist';

        // B. RESTAURAR PASO 1: VEHÍCULO Y FOTOS
        if (data.vehicleId) {
            const vehicleSelect = document.getElementById('vehicleSelect');
            vehicleSelect.value = data.vehicleId;
            // Forzamos el evento de cambio para cargar la UI de fotos
            await displayVehicleDetails(data.vehicleId);
        }

        // Restaurar Detalles de texto
        if (data.vehicleDetails && Array.isArray(data.vehicleDetails)) {
            window.vehicleDetails = data.vehicleDetails;
            renderDetailList();
        }

        // Restaurar Fotos (Previsualización y Estado)
        if (data.vehiclePhotos) {
            window.vehiclePhotos = data.vehiclePhotos;
            // Actualizar UI de cada foto
            for (const [type, base64] of Object.entries(data.vehiclePhotos)) {
                updatePhotoPreview(type, base64);
            }
        }

        // C. RESTAURAR PASO 2: COLABORADOR
        if (data.collaboratorId) {
            const searchInput = document.getElementById('collaboratorSearch');
            // Prellenamos el buscador con el nombre para filtrar visualmente
            searchInput.value = data.collaboratorInfo?.name || '';
            displayCollaborators(data.collaboratorInfo?.name || '');
            
            // Seleccionamos lógicamente
            selectCollaborator(data.collaboratorId);
            
            // Marcamos visualmente
            const items = document.querySelectorAll('.collaborator-item');
            items.forEach(item => {
                if (item.dataset.id === data.collaboratorId) item.classList.add('selected');
            });
        }

        // D. RESTAURAR PASO 3: DATOS DEL VIAJE
        if (data.tripInfo) {
            document.getElementById('fecha').value = data.tripInfo.fecha || '';
            document.getElementById('horaSalida').value = data.tripInfo.horaSalida || '';
            document.getElementById('origen').value = data.tripInfo.origen || '';
            document.getElementById('destino').value = data.tripInfo.destino || '';
            document.getElementById('kmSalida').value = data.tripInfo.kmSalida || '';
            
            if (data.tripInfo.gasolina) {
                const radio = document.querySelector(`input[name="gasolina"][value="${data.tripInfo.gasolina}"]`);
                if(radio) radio.checked = true;
            }
        }

        // E. RESTAURAR OBSERVACIONES (PASOS 4-7)
        // Los checkboxes se marcan dinámicamente cuando se navega a cada paso gracias a `loadedChecklistData`
        if (data.checklists) {
            if(data.checklists.documentos) document.getElementById('documentos-observaciones').value = data.checklists.documentos.obs || '';
            if(data.checklists.accesorios) document.getElementById('accesorios-observaciones').value = data.checklists.accesorios.obs || '';
            if(data.checklists.seguridad) document.getElementById('seguridad-observaciones').value = data.checklists.seguridad.obs || '';
            if(data.checklists.equipamiento) document.getElementById('equipamiento-observaciones').value = data.checklists.equipamiento.obs || '';
        }
        
        Swal.close();

    } catch (error) {
        window.manejadorErrorGlobal(error);

    }
}


// ==========================================
// 2. LÓGICA DE VEHÍCULOS Y COLABORADORES
// ==========================================

async function loadVehicles() {
    try {
        const vehicleSelect = document.getElementById('vehicleSelect');
        vehicleSelect.innerHTML = '<option value="">Cargando vehículos...</option>';

        const snapshot = await db.collection('automoviles').get();
        vehicles = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        populateVehicleSelect();
    } catch (error) {
        window.manejadorErrorGlobal(error);

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

async function loadCollaborators() {
    try {
        const snapshot = await db.collection('colaboradores').get();
        collaborators = snapshot.docs.map(doc => ({
            id: doc.id,
            name: doc.data().NOMBRE || 'Sin nombre',
            department: doc.data().ÁREA || 'Sin área',
        }));
        displayCollaborators();
    } catch (error) {
        window.manejadorErrorGlobal(error);

    }
}

function displayCollaborators(filter = '') {
    const collaboratorList = document.getElementById('collaboratorList');
    collaboratorList.innerHTML = '';

    const filtered = collaborators.filter(c => {
        const term = filter.toLowerCase();
        return c.name.toLowerCase().includes(term) || c.department.toLowerCase().includes(term);
    });

    if (filtered.length === 0) {
        collaboratorList.innerHTML = '<div class="collaborator-item">No se encontraron colaboradores</div>';
        return;
    }

    filtered.forEach(collab => {
        const item = document.createElement('div');
        item.className = 'collaborator-item';
        item.dataset.id = collab.id;
        item.innerHTML = `<div class="collaborator-name">${collab.name}</div><div class="collaborator-department">${collab.department}</div>`;
        
        item.addEventListener('click', () => {
            document.querySelectorAll('.collaborator-item.selected').forEach(i => i.classList.remove('selected'));
            item.classList.add('selected');
            selectCollaborator(collab.id);
        });
        collaboratorList.appendChild(item);
    });
}

function selectCollaborator(id) {
    selectedCollaborator = collaborators.find(c => c.id === id);
    if (selectedCollaborator) {
        document.getElementById('collaborator-name').textContent = selectedCollaborator.name;
        document.getElementById('collaborator-department').textContent = selectedCollaborator.department;
        document.getElementById('collaboratorDetails').classList.add('active');
        document.getElementById('next-to-step-3').disabled = false;
    }
}

function displayVehicleDetails(vehicleId) {
    const vehicle = vehicles.find(v => v.id === vehicleId);
    const photoSection = document.getElementById('photoEvidenceSection');
    
    if (!vehicle) {
        photoSection.style.display = 'none';
        selectedVehicle = null;
        document.getElementById('next-to-step-2').disabled = true;
        return;
    }

    photoSection.style.display = 'block';
    initSpecificPhotoSection(); // Genera los cuadros de foto
    
    // Si estamos en edición, initSpecificPhotoSection borra el HTML, así que debemos repintar las fotos
    if (window.vehiclePhotos && Object.keys(window.vehiclePhotos).length > 0) {
        for (const [type, base64] of Object.entries(window.vehiclePhotos)) {
            updatePhotoPreview(type, base64);
        }
    }

    selectedVehicle = vehicle;
    document.getElementById('next-to-step-2').disabled = false;
}

// ==========================================
// 3. LÓGICA DE FOTOS
// ==========================================

function initSpecificPhotoSection() {
    const grid = document.getElementById('specificPhotoGrid');
    const photoTypes = [
        { id: 'frontal', label: 'Vista Frontal', icon: 'fas fa-car-front' },
        { id: 'lateral-izquierdo', label: 'Lateral Izquierdo', icon: 'fas fa-arrow-left' },
        { id: 'lateral-derecho', label: 'Lateral Derecho', icon: 'fas fa-arrow-right' },
        { id: 'posterior', label: 'Vista Posterior', icon: 'fas fa-car-rear' },
        { id: 'luces', label: 'Sistema de Luces', icon: 'fas fa-lightbulb' }
    ];

    grid.innerHTML = '';
    photoTypes.forEach(pt => {
        const item = document.createElement('div');
        item.className = 'photo-evidence-item';
        item.dataset.photoType = pt.id;
        item.innerHTML = `
            <input type="file" accept="image/*" class="file-input" style="display:none" data-photo-type="${pt.id}">
            <img class="photo-preview" data-photo-type="${pt.id}">
            <div class="photo-placeholder">
                <i class="${pt.icon} photo-evidence-icon"></i>
                <div class="photo-evidence-label">${pt.label}</div>
                <small>Clic para capturar</small>
            </div>
            <button type="button" class="photo-camera-btn" data-photo-type="${pt.id}"><i class="fas fa-camera"></i></button>
            <button type="button" class="remove-photo-btn" data-photo-type="${pt.id}"><i class="fas fa-times"></i></button>
        `;
        grid.appendChild(item);
        setupPhotoItemEvents(item, pt);
    });
    
    
}

function setupPhotoItemEvents(item, pt) {
    const fileInput = item.querySelector('.file-input');
    
    item.addEventListener('click', (e) => {
        if (e.target.closest('.remove-photo-btn')) {
            e.stopPropagation();
            removePhoto(pt.id);
            return;
        }
        if (e.target.closest('.photo-camera-btn')) {
            e.stopPropagation();
            openCameraModal(pt);
            return;
        }
        // Acción principal
        const method = document.querySelector('.capture-method-btn.active').dataset.method;
        if (method === 'camera') openCameraModal(pt);
        else fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            if (!file.type.startsWith('image/'))
            {
                return Swal.fire('Error', ' Solo se permiten imagenes','error');
            }

            Swal.fire({
                title:'Procesando Imagen...',
                text:'Compriendo para optimizar espacio',
                allowOutsideClick: false,
                didOpen:() => Swal.showLoading()
            });
            const reader = new FileReader();
            reader.onload = async () => {
                try{
                    const compressedImage = await comprimirImagen(reader.result);
                    updatePhotoPreview(pt.id, compressedImage);
                    Swal.close();
                }catch (error) {
                    window.manejadorErrorGlobal(error);
                }

            };
            reader.readAsDataURL(file);
        }
    });
}

function updatePhotoPreview(photoType, imageData) {
    // Busca el elemento en el DOM. Si no se ha generado el DOM (ej. carga rápida), esto podría fallar, 
    // pero en el flujo normal ya está generado por displayVehicleDetails.
    const photoItem = document.querySelector(`[data-photo-type="${photoType}"]`);
    if (photoItem) {
        const preview = photoItem.querySelector('.photo-preview');
        preview.src = imageData;
        photoItem.classList.add('has-image');
    }
    
    window.vehiclePhotos[photoType] = imageData;
    updateStep1ButtonState();
}

function removePhoto(photoType) {
    const photoItem = document.querySelector(`[data-photo-type="${photoType}"]`);
    if (photoItem) {
        const preview = photoItem.querySelector('.photo-preview');
        const fileInput = photoItem.querySelector('.file-input');
        preview.src = '';
        photoItem.classList.remove('has-image');
        fileInput.value = '';
    }
    if (window.vehiclePhotos) delete window.vehiclePhotos[photoType];
    updateStep1ButtonState();
}

// ==========================================
// 4. CÁMARA (MODAL)
// ==========================================

async function openCameraModal(photoType) {
    const modal = document.getElementById('cameraModal');
    const video = document.getElementById('cameraVideo');
    const title = document.getElementById('cameraModalTitle');
    
    currentPhotoType = photoType;
    title.textContent = `Tomar: ${photoType.label}`;
    modal.style.display = 'flex';

    try {
        cameraStream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } 
        });
        video.srcObject = cameraStream;
        video.style.display = 'block';
        document.getElementById('cameraCanvas').style.display = 'none';
        document.getElementById('captureBtn').style.display = 'block';
        document.getElementById('retakeBtn').style.display = 'none';
        document.getElementById('usePhotoBtn').style.display = 'none';
    } catch (error) {
        window.manejadorErrorGlobal(error);
    }
}

function closeCamera() {
    const modal = document.getElementById('cameraModal');
    modal.style.display = 'none';
    if (cameraStream) {
        cameraStream.getTracks().forEach(t => t.stop());
        cameraStream = null;
    }
}

function setupCameraEvents() {
    document.querySelector('.close-camera').addEventListener('click', closeCamera);
    
    document.getElementById('captureBtn').addEventListener('click', () => {
        const video = document.getElementById('cameraVideo');
        const canvas = document.getElementById('cameraCanvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d').drawImage(video, 0, 0);
        
        video.style.display = 'none';
        canvas.style.display = 'block';
        document.getElementById('captureBtn').style.display = 'none';
        document.getElementById('retakeBtn').style.display = 'block';
        document.getElementById('usePhotoBtn').style.display = 'block';
    });

    document.getElementById('retakeBtn').addEventListener('click', () => {
        document.getElementById('cameraVideo').style.display = 'block';
        document.getElementById('cameraCanvas').style.display = 'none';
        document.getElementById('captureBtn').style.display = 'block';
        document.getElementById('retakeBtn').style.display = 'none';
        document.getElementById('usePhotoBtn').style.display = 'none';
    });

    document.getElementById('usePhotoBtn').addEventListener('click', () => {
        if (currentPhotoType) {
            const imgData = document.getElementById('cameraCanvas').toDataURL('image/jpeg', 0.8);
            updatePhotoPreview(currentPhotoType.id, imgData);
            closeCamera();
        }
    });
}

// ==========================================
// 5. NAVEGACIÓN Y CHECKLISTS
// ==========================================

function goToStep(step) {
    const prevStep = step - 1;
    if (prevStep === 1 && !validateStep1()) return showAlert('Faltan datos en Vehículo/Fotos');

    if(prevStep ===2){
        if(!selectCollaborator || !window.collaboratorSignature)
        {
            return showAlert('Debes seleccionar un colaborador y FIRMAR');
        }
    }

    if (prevStep === 3 && !validateStep3()) return showAlert('Completa los datos del día');

    // Gestión visual de pasos
    document.querySelectorAll('.form-step').forEach(fs => fs.classList.remove('active'));
    document.getElementById(`step-${step}-form`).classList.add('active');
    
    document.querySelectorAll('.step').forEach((el, idx) => {
        el.classList.remove('active', 'completed');
        if (idx + 1 < step) el.classList.add('completed');
        else if (idx + 1 === step) el.classList.add('active');
    });
    
    // Lógica específica por paso
    if (step === 3) populateStep3Data();
    if (step === 4) populateChecklistSection('documentos', 'documentos-checklist');
    if (step === 5) populateChecklistSection('accesorios', 'accesorios-checklist');
    if (step === 6) populateChecklistSection('seguridad', 'seguridad-checklist');
    if (step === 7) populateChecklistSection('equipamiento', 'equipamiento-checklist');
    if (step === 8) {
        updateSummary();
        Swal.fire({
            title: '¡Atencion!',
            html: '<p>Por favor <strong>revisa muy bien</strong> la información.</p><p style="color:red;">Una vez creado, este registro NO se podrá editar ni borrar después.</p>',
            icon: 'warning',
            confirmButtonText:'Entendido',
            confirmButtonColor: '#d33',
        });   
    }
    currentStep = step;
}

function showAlert(msg) {
    Swal.fire({ icon: 'warning', title: 'Atención', text: msg });
}

function populateStep3Data() {
    // Solo rellena fecha/hora si están vacíos (para no sobrescribir en edición)
    if (!document.getElementById('fecha').value) {
        const now = new Date();
        document.getElementById('fecha').value = now.toISOString().split('T')[0];
        document.getElementById('horaSalida').value = now.toTimeString().slice(0,5);
    }
}

function populateChecklistSection(dataKey, containerId) {
    const container = document.getElementById(containerId);
    if (!container || !selectedVehicle) return;
    
    // Si ya tiene hijos, asumimos que ya se generó (evita duplicados al ir y volver)
    if (container.children.length > 0) return; 

    const items = selectedVehicle[dataKey];
    if (!items || items.length === 0) {
        container.innerHTML = `<p class="info-text">No aplica.</p>`;
        return;
    }

    // Array de ítems previamente marcados (si estamos editando)
    let checkedItems = [];
    if (loadedChecklistData && loadedChecklistData.checklists && loadedChecklistData.checklists[dataKey]) {
        checkedItems = loadedChecklistData.checklists[dataKey].items || [];
    }

    items.forEach((item, index) => {
        const itemId = `${dataKey}-${index}`;
        // Verificar si estaba marcado
        const isChecked = checkedItems.includes(item) ? 'checked' : '';

        const html = `
            <div class="checkbox-item">
                <input type="checkbox" id="${itemId}" value="${item}" ${isChecked}>
                <label for="${itemId}">${item}</label>
            </div>`;
        container.insertAdjacentHTML('beforeend', html);
    });
}

// ==========================================
// 6. DETALLES DE VEHÍCULO (TEXTO)
// ==========================================

function renderDetailList() {
    const list = document.getElementById('detailList');
    list.innerHTML = '';
    window.vehicleDetails.forEach((d, i) => {
        list.innerHTML += `
            <li class="detail-item">
                <span>${d}</span>
                <button type="button" class="remove-detail-btn" data-index="${i}">&times;</button>
            </li>`;
    });
}

// ==========================================
// 7. GUARDAR / ACTUALIZAR
// ==========================================

async function saveChecklist() {
    try {
        // Validar fotos
        const required = ['frontal', 'lateral-izquierdo', 'lateral-derecho', 'posterior', 'luces'];
        const missing = required.filter(k => !window.vehiclePhotos[k]);
        if (missing.length > 0) return Swal.fire('Faltan fotos', `Requeridas: ${missing.join(', ')}`, 'warning');

        // Recopilar datos
        const checklistData = {
            vehicleId: selectedVehicle.id,
            vehicleInfo: {
                name: selectedVehicle.name,
                brand: selectedVehicle.brand || '',
                model: selectedVehicle.model || '',
                plates: selectedVehicle.plates || ''
            },
            collaboratorId: selectedCollaborator.id,
            collaboratorInfo: {
                name: selectedCollaborator.name,
                department: selectedCollaborator.department
            },
            signature: window.collaboratorSignature,
            tripInfo: {
                fecha: document.getElementById('fecha').value,
                horaSalida: document.getElementById('horaSalida').value,
                origen: document.getElementById('origen').value,
                destino: document.getElementById('destino').value,
                kmSalida: document.getElementById('kmSalida').value,
                gasolina: document.querySelector('input[name="gasolina"]:checked')?.value || 'No registrado'
            },
            checklists: {
                documentos: { items: getCheckedItems('documentos-checklist'), obs: document.getElementById('documentos-observaciones').value },
                accesorios: { items: getCheckedItems('accesorios-checklist'), obs: document.getElementById('accesorios-observaciones').value },
                seguridad: { items: getCheckedItems('seguridad-checklist'), obs: document.getElementById('seguridad-observaciones').value },
                equipamiento: { items: getCheckedItems('equipamiento-checklist'), obs: document.getElementById('equipamiento-observaciones').value }
            },
            vehicleDetails: window.vehicleDetails || [],
            vehiclePhotos: window.vehiclePhotos,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        // LÓGICA DUAL: ACTUALIZAR O CREAR
        if (editChecklistId) {
            // --- UPDATE ---
            await db.collection('checkList').doc(editChecklistId).update(checklistData);
            Swal.fire('¡Actualizado!', 'El checklist ha sido actualizado correctamente.', 'success')
                .then(() => window.location.href = '../checklist-automoviles/checklist-automoviles.html'); // Volver al listado
        } else {
            // --- CREATE ---
            checklistData.createdAt = firebase.firestore.FieldValue.serverTimestamp(); // Solo en creación
            await db.collection('checkList').add(checklistData);
            Swal.fire('¡Creado!', 'Checklist creado correctamente.', 'success')
                .then(() => window.location.reload());
        }

    } catch (error) {
        window.manejadorErrorGlobal(error);
    }
}

// Auxiliares
function getCheckedItems(id) {
    const container = document.getElementById(id);
    if (!container) return [];
    return Array.from(container.querySelectorAll('input:checked')).map(cb => cb.value);
}

function updateStep1ButtonState() {
    document.getElementById('next-to-step-2').disabled = !validateStep1();
}
function validateStep1() { return !!selectedVehicle && Object.keys(window.vehiclePhotos).length >= 5; }
function validateStep2() { return !!selectedCollaborator; }
function validateStep3() {
    // Validar campos de texto
    const fecha = document.getElementById('fecha').value.trim();
    const hora = document.getElementById('horaSalida').value.trim();
    const origen = document.getElementById('origen').value.trim();
    const destino = document.getElementById('destino').value.trim();
    const kmSalida = document.getElementById('kmSalida').value.trim();

    // Validar Radio Button de Gasolina
    const gasolina = document.querySelector('input[name="gasolina"]:checked');

    // Retorna true solo si todo tiene valor
    return fecha && hora && origen && destino && kmSalida && gasolina;
}

// Event Listeners Globales
function setupEventListeners() {
    document.getElementById('vehicleSelect').addEventListener('change', (e) => displayVehicleDetails(e.target.value));
    document.getElementById('collaboratorSearch').addEventListener('input', (e) => displayCollaborators(e.target.value));
    
    // Navegación Next/Prev
    document.getElementById('next-to-step-2').addEventListener('click', () => goToStep(2));
    document.getElementById('prev-to-step-1').addEventListener('click', () => goToStep(1));
    document.getElementById('next-to-step-3').addEventListener('click', () => goToStep(3));
    document.getElementById('prev-to-step-2').addEventListener('click', () => goToStep(2));
    document.getElementById('next-to-step-4').addEventListener('click', () => goToStep(4));
    document.getElementById('prev-to-step-3').addEventListener('click', () => goToStep(3));
    document.getElementById('next-to-step-5').addEventListener('click', () => goToStep(5));
    document.getElementById('prev-to-step-4').addEventListener('click', () => goToStep(4));
    document.getElementById('next-to-step-6').addEventListener('click', () => goToStep(6));
    document.getElementById('prev-to-step-5').addEventListener('click', () => goToStep(5));
    document.getElementById('next-to-step-7').addEventListener('click', () => goToStep(7));
    document.getElementById('prev-to-step-6').addEventListener('click', () => goToStep(6));
    document.getElementById('next-to-step-8').addEventListener('click', () => goToStep(8));
    document.getElementById('prev-to-step-7').addEventListener('click', () => goToStep(7));
    
    document.getElementById('submit-checklist').addEventListener('click', saveChecklist);
    //Codigo de firma
    const btnSign = document.getElementById('btnSign');
    if(btnSign) btnSign.addEventListener('click', openSignatureModal);
    
    const btnClearSign = document.getElementById('btnClearSignature');
    if(btnClearSign) btnClearSign.addEventListener('click', () => {
        window.collaboratorSignature = null;
        updateSignatureUI();
    });


    // Detalles Vehículo
    document.getElementById('addDetailBtn').addEventListener('click', () => {
        const val = document.getElementById('detailInput').value.trim();
        if (val) { window.vehicleDetails.push(val); renderDetailList(); document.getElementById('detailInput').value = ''; }
    });
    document.getElementById('detailList').addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-detail-btn')) {
            window.vehicleDetails.splice(e.target.dataset.index, 1); renderDetailList();
        }
    });
    
    // Cancelar
    document.getElementById('btn-cancelar').addEventListener('click', () => {
        Swal.fire({
            title: '¿Cancelar?', text: 'Se perderán los cambios no guardados.', icon: 'warning', showCancelButton: true,
            confirmButtonText: 'Sí, salir'
        }).then((res) => {
            if (res.isConfirmed) window.location.href = '../checklist-automoviles/checklist-automoviles.html';
        });
    });
    
    // Validación paso 3 al escribir
    const step3Inputs = document.querySelectorAll('#step-3-form input');
    step3Inputs.forEach(input => {
        input.addEventListener('input', () => {
            document.getElementById('next-to-step-4').disabled = !validateStep3();
        });
    });

    setupCameraEvents();
}

function updateSummary() {
    // Vehículo
    document.getElementById('summary-vehicle').textContent = selectedVehicle ? `${selectedVehicle.name} (${selectedVehicle.plates})` : 'N/A';
    // Colaborador
    document.getElementById('summary-collaborator').textContent = selectedCollaborator ? `${selectedCollaborator.name}` : 'N/A';
    // Datos
    const f = document.getElementById('fecha').value;
    const h = document.getElementById('horaSalida').value;
    document.getElementById('summary-fecha-hora').textContent = `${f} ${h}`;
    document.getElementById('summary-ruta').textContent = `${document.getElementById('origen').value} -> ${document.getElementById('destino').value}`;
    document.getElementById('summary-km-salida').textContent = document.getElementById('kmSalida').value;
    const gasValue = document.querySelector('input[name="gasolina"]:checked')?.value || 'N/A';
document.getElementById('summary-gasolina').textContent = gasValue;
    // Detalles
    const detDiv = document.getElementById('summary-vehicle-details');
    detDiv.innerHTML = window.vehicleDetails.length ? `<ul>${window.vehicleDetails.map(d=>`<li>${d}</li>`).join('')}</ul>` : 'Ninguno';
    
    // Listas
    document.getElementById('summary-documentos').textContent = getCheckedItems('documentos-checklist').join(', ') || 'Ninguno';
    document.getElementById('summary-accesorios').textContent = getCheckedItems('accesorios-checklist').join(', ') || 'Ninguno';
    document.getElementById('summary-seguridad').textContent = getCheckedItems('seguridad-checklist').join(', ') || 'Ninguno';
    document.getElementById('summary-equipamiento').textContent = getCheckedItems('equipamiento-checklist').join(', ') || 'Ninguno';
    
    // Fotos
    const photoGrid = document.getElementById('summary-photo-grid');
    photoGrid.innerHTML = '';
    for(const [k, v] of Object.entries(window.vehiclePhotos)) {
        const img = document.createElement('img');
        img.src = v;
        img.style.width = '60px'; img.style.height = '60px'; img.style.objectFit = 'cover'; img.style.margin = '2px';
        photoGrid.appendChild(img);
    }
    //RESUMEN DE LA FIRMA
    let signatureSummaryContainer = document.getElementById('summary-signature-container');
    
    if (!signatureSummaryContainer) {
        // Si no existe, lo agregamos al final del contenedor "summary"
        const summaryContainer = document.querySelector('.summary');
        signatureSummaryContainer = document.createElement('div');
        signatureSummaryContainer.id = 'summary-signature-container';
        signatureSummaryContainer.className = 'summary-section'; // Usamos el mismo estilo de sección
        summaryContainer.appendChild(signatureSummaryContainer);
    }

    if (window.collaboratorSignature) {
        signatureSummaryContainer.innerHTML = `
            <h3>Conformidad</h3>
            <div class="summary-item" style="display: block; text-align: center;">
                <div class="summary-label" style="margin-bottom: 10px;">Firma del Colaborador:</div>
                <img src="${window.collaboratorSignature}" alt="Firma" style="max-width: 200px; border: 1px solid #ddd; background-color: #fff; padding: 5px; border-radius: 4px;">
                <p style="font-size: 0.8rem; color: #666; margin-top: 5px;">Acepto las condiciones del vehículo.</p>
            </div>
        `;
    } else {
        signatureSummaryContainer.innerHTML = ''; // Limpiar si no hay firma (aunque la validación lo impide)
    }
}
// ==========================================
// LÓGICA DE FIRMA DIGITAL 
// ==========================================

function openSignatureModal() {
    Swal.fire({
        title: 'Firma del Colaborador',
        html: `
            <p style="font-size: 0.9rem; margin-bottom: 10px;">Por favor, firma en el recuadro grande a continuación:</p>
            <div style="border: 2px dashed #ccc; border-radius: 8px; overflow: hidden;">
                <canvas id="signatureCanvas" class="signature-canvas" style="width: 100%; height: 250px; display: block; touch-action: none;"></canvas>
            </div>
            <button id="clearCanvas" class="btn-secondary" style="margin-top:15px; padding: 8px 20px; width: 100%;">
                <i class="fas fa-eraser"></i> Borrar y firmar de nuevo
            </button>
        `,
        showCancelButton: true,
        confirmButtonText: 'Guardar Firma',
        cancelButtonText: 'Cancelar',
        allowOutsideClick: false, 
        width: '600px', // Hacemos el modal más ancho
        padding: '20px',
        didOpen: () => {
            const canvas = document.getElementById('signatureCanvas');
            const ctx = canvas.getContext('2d');
            
            // AJUSTE DE RESOLUCIÓN: Hace que el dibujo sea nítido al tamaño nuevo
            canvas.width = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;

            let drawing = false;
            ctx.lineWidth = 3; // Trazo un poco más grueso
            ctx.lineCap = 'round'; 
            ctx.strokeStyle = '#000';

            const getPos = (e) => {
                const rect = canvas.getBoundingClientRect();
                const cx = e.touches ? e.touches[0].clientX : e.clientX;
                const cy = e.touches ? e.touches[0].clientY : e.clientY;
                return { x: cx - rect.left, y: cy - rect.top };
            };

            const start = (e) => { e.preventDefault(); drawing = true; const p = getPos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); };
            const move = (e) => { e.preventDefault(); if(!drawing)return; const p = getPos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); };
            const end = () => drawing = false;

            canvas.addEventListener('mousedown', start); canvas.addEventListener('mousemove', move);
            canvas.addEventListener('mouseup', end); canvas.addEventListener('mouseleave', end);
            canvas.addEventListener('touchstart', start); canvas.addEventListener('touchmove', move);
            canvas.addEventListener('touchend', end);

            document.getElementById('clearCanvas').addEventListener('click', () => {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            });
        },
        preConfirm: () => {
            const canvas = document.getElementById('signatureCanvas');
            return canvas.toDataURL('image/png');
        }
    }).then((result) => {
        if (result.isConfirmed) {
            window.collaboratorSignature = result.value;
            updateSignatureUI();
            Swal.fire({
                icon: 'success', 
                title: 'Firma Guardada', 
                toast: true, 
                position: 'top-end', 
                showConfirmButton: false, 
                timer: 2000 
            });
        }
    });
}

function updateSignatureUI() {
    const previewDiv = document.getElementById('signature-preview');
    const img = document.getElementById('signature-image');
    const signBtn = document.getElementById('btnSign');

    if (window.collaboratorSignature) {
        previewDiv.style.display = 'block';
        img.src = window.collaboratorSignature;
        signBtn.style.display = 'none';
    } else {
        previewDiv.style.display = 'none';
        img.src = '';
        signBtn.style.display = 'inline-block';
    }
    updateStep2ButtonState();
}

function updateStep2ButtonState() {
    // Validar que haya colaborador Y firma para avanzar
    const btnNext = document.getElementById('next-to-step-3');
    if (selectedCollaborator && window.collaboratorSignature) {
        btnNext.disabled = false;
    } else {
        btnNext.disabled = true;
    }
}

// ==========================================
// 8. FUNCIÓN DE COMPRESIÓN DE IMÁGENES
// ==========================================

async function comprimirImagen(base64Str) {
    const MAX_BYTES = 1000000; // 1 MB = 1,000,000 bytes
    
    return new Promise((resolve) => {
        const img = new Image();
        img.src = base64Str;
        
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            // 1. Redimensionar si la imagen es gigante (esto ayuda mucho al peso)
            // Limitamos el lado más largo a 1280px (suficiente para evidencia)
            const MAX_SIDE = 1280; 
            if (width > height) {
                if (width > MAX_SIDE) {
                    height *= MAX_SIDE / width;
                    width = MAX_SIDE;
                }
            } else {
                if (height > MAX_SIDE) {
                    width *= MAX_SIDE / height;
                    height = MAX_SIDE;
                }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            // 2. Reducir calidad iterativamente hasta que pese menos de 1MB
            let quality = 0.9;
            let dataUrl = canvas.toDataURL('image/jpeg', quality);

            // Cálculo aproximado: (longitud del string base64 * 0.75) ~= peso en bytes
            while (dataUrl.length * 0.75 > MAX_BYTES && quality > 0.2) {
                quality -= 0.1;
                dataUrl = canvas.toDataURL('image/jpeg', quality);
                // console.log(`Comprimiendo... Calidad: ${quality.toFixed(1)}`);
            }

            resolve(dataUrl);
        };
        
        img.onerror = () => {
            // Si falla, devolvemos la original aunque sea pesada
            console.error("Error al comprimir imagen");
            resolve(base64Str);
        };
    });
}