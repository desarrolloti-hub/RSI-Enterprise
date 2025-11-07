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
const auth = firebase.auth();

// Array para almacenar los vehículos desde Firestore
let vehicles = [];

        // Referencias a elementos del DOM
const vehicleGrid = document.getElementById('vehicleGrid');
const searchInput = document.getElementById('searchInput');
const sortBySelect = document.getElementById('sortBy');
const addVehicleBtn = document.getElementById('addVehicleBtn');

// Función para mostrar mensajes de retroalimentación con SweetAlert2
function showFeedback(icon, title, text) {
    Swal.fire({
        icon: icon,         // 'success', 'error', 'warning', 'info', 'question'
        title: title,       // Título principal
        text: text,         // Texto del cuerpo
        confirmButtonText: 'Aceptar',  // Botón personalizado
        allowOutsideClick: false,      // Evita que se cierre al hacer clic fuera
        allowEscapeKey: true,          // Permite cerrar con "Esc"
        backdrop: true,                // Oscurece el fondo
    });
}


// Función para cargar vehículos desde Firestore
async function loadVehicles() {
    try {
        const snapshot = await db.collection('automoviles').get();
        vehicles = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        displayVehicles(vehicles);
    } catch (error) {
        console.error('Error al cargar vehículos:', error);
        showFeedback('error', 'Error', 'No se pudieron cargar los vehículos' + error.message);
    }
}

// Función para mostrar los vehículos en la cuadrícula
function displayVehicles(vehiclesToShow) {
    vehicleGrid.innerHTML = '';

    // Agregar la tarjeta para añadir vehículo primero
    const addCard = document.createElement('div');
    addCard.className = 'vehicle-card add-vehicle-card';
    addCard.innerHTML = `
        <div class="add-icon">
            <i class="fas fa-plus-circle"></i>
        </div>
        <div class="add-text">Agregar Vehículo</div>
    `;
    addCard.addEventListener('click', showAddVehicleForm);
    vehicleGrid.appendChild(addCard);

    // Mostrar los vehículos existentes
    vehiclesToShow.forEach(vehicle => {
        const card = document.createElement('div');
        card.className = 'vehicle-card';
        card.innerHTML = `
            <div class="vehicle-image">
                <img src="${vehicle.image || 'ruta/imagen/por/defecto.jpg'}" alt="${vehicle.name}">
            </div>
            <div class="vehicle-info">
                <h3>${vehicle.name}</h3>
                <p>${vehicle.brand} ${vehicle.model}</p>
                <p>Tipo: ${vehicle.type}</p>
                <p>Placas: ${vehicle.plates}</p>
                <div class="vehicle-actions">
                    <button class="edit-btn">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="deleteVehicle('${vehicle.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;

        // Configurar el botón de edición
        const editButton = card.querySelector('.edit-btn');
        editButton.addEventListener('click', () => setupEditButton(vehicle.id, vehicle));

        vehicleGrid.appendChild(card);
    });
}

// Función para mostrar detalles y permitir edición
async function showVehicleDetails(vehicle) {
    const { value: action } = await Swal.fire({
        title: vehicle.name,
        html: `
        <div class="vehicle-details">
            <img src="${vehicle.image || 'ruta/imagen/por/defecto.jpg'}" 
                alt="${vehicle.name}" 
                style="max-width: 200px; margin-bottom: 20px;">
            
            <h3 style="text-align:center;">${vehicle.name}</h3>
            <div class="info-grid">
            <div><strong>Marca:</strong> ${vehicle.brand}</div>
            <div><strong>Modelo:</strong> ${vehicle.model}</div>
            <div><strong>Color:</strong> ${vehicle.color}</div>
            <div><strong>Placas:</strong> ${vehicle.plates}</div>
            <div><strong>Tipo:</strong> ${vehicle.type}</div>
            </div>


            <div class="detail-grid">
            <div class="detail-block">
                <h4>Documentos </h4>
                <p>${Array.isArray(vehicle.documentos) ? vehicle.documentos.join(', ') : (vehicle.documentos || 'No especificado')}</p>
            </div>
            <div class="detail-block">
                <h4>Accesorios</h4>
                <p>${Array.isArray(vehicle.accesorios) ? vehicle.accesorios.join(', ') : (vehicle.accesorios || 'No especificado')}</p>
            </div>
            <div class="detail-block">
                <h4>Seguridad</h4>
                <p>${Array.isArray(vehicle.seguridad) ? vehicle.seguridad.join(', ') : (vehicle.seguridad || 'No especificado')}</p>
            </div>
            <div class="detail-block">
                <h4>Equipamiento</h4>
                <p>${Array.isArray(vehicle.equipamiento) ? vehicle.equipamiento.join(', ') : (vehicle.equipamiento || 'No especificado')}</p>
            </div>
            </div>
        </div>
        `,
        showDenyButton: true,
        showCancelButton: true,
        confirmButtonText: 'Editar',
        denyButtonText: 'Eliminar',
        cancelButtonText: 'Cerrar',
        showCloseButton: true,        
        closeButtonHtml: '&times;',   
        allowOutsideClick: false,     
        allowEscapeKey: true,         
        backdrop: true,
    });

    if (action === true) {
        editVehicle(vehicle);
    } else if (action === false) {
        deleteVehicle(vehicle.id);
    }
}


// Función para editar un vehículo
async function showEditVehicleForm(vehicleId, vehicleData) {
    const { value: formValues } = await Swal.fire({
        title: 'Editar Vehículo',
        html: `
                      
                <div class="swal2-form">
                <div class="form-group">
                    <label for="swal-name" class="form-label">Nombre del Vehículo</label>
                    <input id="swal-name" class="swal2-input" placeholder="Ej: Toyota Corolla 2023" value="${vehicleData.name ||''}">
                </div>
                <div class="form-group">
                    <label for="swal-brand" class="form-label">Marca</label>
                    <input id="swal-brand" class="swal2-input" placeholder="Ej: Toyota" value="${vehicleData.brand || ''}">
                </div>
                
                <div class="form-group">
                    <label for="swal-model" class="form-label">Modelo</label>
                    <input id="swal-model" class="swal2-input" placeholder="Ej: Corolla" value="${vehicleData.model || ''}">
                </div>
                
                <div class="form-group">
                    <label for="swal-color" class="form-label">Color</label>
                    <input id="swal-color" class="swal2-input" placeholder="Ej: Rojo" value="${vehicleData.color || ''}">
                </div>
                
                <div class="form-group">
                    <label for="swal-plates" class="form-label">Placas</label>
                    <input id="swal-plates" class="swal2-input" placeholder="Ej: ABC-123" value="${vehicleData.plates || ''}">
                </div>
                <select id="swal-type" class="swal2-input">
                    <option value="">Selecciona un tipo</option>
                    <option value="Sedán" ${vehicleData.type === 'Sedán' ? 'selected' : ''}>Sedán</option>
                    <option value="SUV" ${vehicleData.type === 'SUV' ? 'selected' : ''}>SUV</option>
                    <option value="Camioneta" ${vehicleData.type === 'Camioneta' ? 'selected' : ''}>Camioneta</option>
                    <option value="Deportivo" ${vehicleData.type === 'Deportivo' ? 'selected' : ''}>Deportivo</option>
                    <option value="Hatchback" ${vehicleData.type === 'Hatchback' ? 'selected' : ''}>Hatchback</option>
                </select>
                <div class="image-upload-container">
                    <label for="swal-image" class="image-upload-label">
                        <i class="fas fa-cloud-upload-alt"></i>
                        <span>Seleccionar Imagen</span>
                    </label>
                    <input type="file" id="swal-image" accept="image/*" style="display: none;">
                    <div id="image-preview" class="image-preview">
                        ${vehicleData.image ? `<img src="${vehicleData.image}" alt="Vista previa">` : ''}
                    </div>
                </div>

                <div class="swal2-radio-group">
                    <h4>Documentos</h4>
                    <div class="checklist-group">
                        <div>
                            <input type="checkbox" name="documentos" id="doc-poliza" value="Póliza" ${vehicleData.documentos && vehicleData.documentos.includes('Póliza') ? 'checked' : ''}>
                            <label for="doc-poliza">Póliza</label>
                        </div>
                        <div>
                            <input type="checkbox" name="documentos" id="doc-manuales" value="Manuales" ${vehicleData.documentos && vehicleData.documentos.includes('Manuales') ? 'checked' : ''}>
                            <label for="doc-manuales">Manuales</label>
                        </div>
                        <div>
                            <input type="checkbox" name="documentos" id="doc-tarjeta" value="Tarjeta de Circulación" ${vehicleData.documentos && vehicleData.documentos.includes('Tarjeta de Circulación') ? 'checked' : ''}>
                            <label for="doc-tarjeta">Tarjeta de Circulación</label>
                        </div>
                    </div>
                </div>

                <div class="swal2-radio-group">
                    <h4>Accesorios</h4>
                    <div class="checklist-group">
                        <div>
                            <input type="checkbox" name="accesorios" id="acc-radio" value="Radio" ${vehicleData.accesorios && vehicleData.accesorios.includes('Radio') ? 'checked' : ''}>
                            <label for="acc-radio">Radio</label>
                        </div>
                        <div>
                            <input type="checkbox" name="accesorios" id="acc-antena" value="Antena" ${vehicleData.accesorios && vehicleData.accesorios.includes('Antena') ? 'checked' : ''}>
                            <label for="acc-antena">Antena</label>
                        </div>
                        <div>
                            <input type="checkbox" name="accesorios" id="acc-rotulado" value="Rotulado" ${vehicleData.accesorios && vehicleData.accesorios.includes('Rotulado') ? 'checked' : ''}>
                            <label for="acc-rotulado">Rotulado</label>
                        </div>
                        <div>
                            <input type="checkbox" name="accesorios" id="acc-tapetes" value="Tapetes" ${vehicleData.accesorios && vehicleData.accesorios.includes('Tapetes') ? 'checked' : ''}>
                            <label for="acc-tapetes">Tapetes</label>
                        </div>
                        <div>
                            <input type="checkbox" name="accesorios" id="acc-tapones" value="Tapones de Birlos" ${vehicleData.accesorios && vehicleData.accesorios.includes('Tapones de Birlos') ? 'checked' : ''}>
                            <label for="acc-tapones">Tapones de Birlos</label>
                        </div>
                         <div>
                            <input type="checkbox" name="accesorios" id="acc-corriente" value="Toma corriente" ${vehicleData.accesorios && vehicleData.accesorios.includes('Toma corriente') ? 'checked' : ''}>
                            <label for="acc-corriente">Toma corriente</label>
                        </div>
                         <div>
                            <input type="checkbox" name="accesorios" id="acc-clima" value="Clima" ${vehicleData.accesorios && vehicleData.accesorios.includes('Clima') ? 'checked' : ''}>
                            <label for="acc-clima">Clima</label>
                        </div>
                         <div>
                            <input type="checkbox" name="accesorios" id="acc-retrovisor" value="Retrovisor" ${vehicleData.accesorios && vehicleData.accesorios.includes('Retrovisor') ? 'checked' : ''}>
                            <label for="acc-retrovisor">Retrovisor</label>
                        </div>
                    </div>
                </div>

                <div class="swal2-radio-group">
                    <h4>Seguridad</h4>
                    <div class="checklist-group">
                        <div>
                            <input type="checkbox" name="seguridad" id="seg-extintor" value="Extintor" ${vehicleData.seguridad && vehicleData.seguridad.includes('Extintor') ? 'checked' : ''}>
                            <label for="seg-extintor">Extintor</label>
                        </div>
                        <div>
                            <input type="checkbox" name="seguridad" id="seg-intermitentes" value="Intermitentes" ${vehicleData.seguridad && vehicleData.seguridad.includes('Intermitentes') ? 'checked' : ''}>
                            <label for="seg-intermitentes">Intermitentes</label>
                        </div>
                        <div>
                            <input type="checkbox" name="seguridad" id="seg-tapon" value="Tapón de Gasolina" ${vehicleData.seguridad && vehicleData.seguridad.includes('Tapón de Gasolina') ? 'checked' : ''}>
                            <label for="seg-tapon">Tapón de Gasolina</label>
                        </div>
                        <div>
                            <input type="checkbox" name="seguridad" id="seg-cinturones" value="Cinturones" ${vehicleData.seguridad && vehicleData.seguridad.includes('Cinturones') ? 'checked' : ''}>
                            <label for="seg-cinturones">Cinturones</label>
                        </div>
                         <div>
                            <input type="checkbox" name="seguridad" id="seg-cuartos" value="Cuartos" ${vehicleData.seguridad && vehicleData.seguridad.includes('Cuartos') ? 'checked' : ''}>
                            <label for="seg-cuartos">Cuartos</label>
                        </div>
                         <div>
                            <input type="checkbox" name="seguridad" id="seg-cristales" value="Cristales" ${vehicleData.seguridad && vehicleData.seguridad.includes('Cristales') ? 'checked' : ''}>
                            <label for="seg-cristales">Cristales</label>
                        </div>
                    </div>
                </div>

                <div class="swal2-radio-group">
                    <h4>Equipamiento</h4>
                    <div class="checklist-group">
                        <div>
                            <input type="checkbox" name="equipamiento" id="eq-gato" value="Gato" ${vehicleData.equipamiento && vehicleData.equipamiento.includes('Gato') ? 'checked' : ''}>
                            <label for="eq-gato">Gato</label>
                        </div>
                        <div>
                            <input type="checkbox" name="equipamiento" id="eq-maneral" value="Maneral" ${vehicleData.equipamiento && vehicleData.equipamiento.includes('Maneral') ? 'checked' : ''}>
                            <label for="eq-maneral">Maneral</label>
                        </div>
                        <div>
                            <input type="checkbox" name="equipamiento" id="eq-llanta" value="Llanta de Refaccion" ${vehicleData.equipamiento && vehicleData.equipamiento.includes('Llanta de Refaccion') ? 'checked' : ''}>
                            <label for="eq-llanta">Llanta de Refaccion</label>
                        </div>
                        <div>
                            <input type="checkbox" name="equipamiento" id="eq-reflejante" value="Reflejante" ${vehicleData.equipamiento && vehicleData.equipamiento.includes('Reflejante') ? 'checked' : ''}>
                            <label for="eq-reflejante">Reflejante</label>
                        </div>
                    </div>
                </div>
            </div>
        `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'Actualizar',
        cancelButtonText: 'Cancelar',
        showCloseButton: true,        
        closeButtonHtml: '&times;',   
        allowOutsideClick: false,     
        allowEscapeKey: true,         
        backdrop: true,    
        didOpen: () => {
            const imageInput = document.getElementById('swal-image');
            const imagePreview = document.getElementById('image-preview');
            let base64Image = vehicleData.image || '';

            imageInput.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (file) {
                    const errors = await validateImageFile(file);
                    if (errors.length > 0) {
                        Swal.showValidationMessage(errors.join('<br>'));
                        imageInput.value = '';
                        return;
                    }
                    
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        base64Image = e.target.result;
                        imagePreview.innerHTML = `<img src="${base64Image}" alt="Vista previa">`;
                    };
                    reader.readAsDataURL(file);
                }
            });
        },
        preConfirm: () => {
            const formData = {
                name: document.getElementById('swal-name').value,
                brand: document.getElementById('swal-brand').value,
                model: document.getElementById('swal-model').value,
                color: document.getElementById('swal-color').value,
                plates: document.getElementById('swal-plates').value,
                type: document.getElementById('swal-type').value,
                image: document.querySelector('#image-preview img')?.src || '',
                documentos: Array.from(document.querySelectorAll('input[name="documentos"]:checked')).map(checkbox => checkbox.value) || [],
                accesorios: Array.from(document.querySelectorAll('input[name="accesorios"]:checked')).map(checkbox => checkbox.value) || [],
                seguridad: Array.from(document.querySelectorAll('input[name="seguridad"]:checked')).map(checkbox => checkbox.value) || [],
                equipamiento: Array.from(document.querySelectorAll('input[name="equipamiento"]:checked')).map(checkbox => checkbox.value) || [],
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            // Validación (la misma que en agregar)
            const requiredFields = ['name', 'brand', 'model', 'plates', 'type'];
            const emptyFields = requiredFields.filter(field => !formData[field]);
            
            if (emptyFields.length > 0) {
                Swal.showValidationMessage(`Por favor complete los campos: ${emptyFields.join(', ')}`);
                return false;
            }

            return formData;
        }
    });

    if (formValues) {
        try {
            await db.collection('automoviles').doc(vehicleId).update(formValues);
            showFeedback('success', '¡Éxito!', 'Vehículo actualizado correctamente');
            loadVehicles();
        } catch (error) {
            console.error('Error al actualizar vehículo:', error);
            showFeedback('error', 'Error', 'No se pudo actualizar el vehículo: ' + error.message);
        }
    }
}

// Y necesitas agregar esta función para manejar la edición desde tu tabla
function setupEditButton(vehicleId, vehicleData) {
    // Esta función se llamaría cuando hagas clic en "Editar" en tu tabla
    showEditVehicleForm(vehicleId, vehicleData);
}

function toggleAccordion(header) {
    const content = header.nextElementSibling;
    content.style.display = content.style.display === 'block' ? 'none' : 'block';
}

// Función para eliminar un vehículo
async function deleteVehicle(vehicleId) 
{
    const result = await Swal.fire({
        title: '¿Estás seguro?',
        text: "Esta acción no se puede deshacer.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar',
        showCloseButton: true,        
        closeButtonHtml: '&times;',   
        allowOutsideClick: false,     
        allowEscapeKey: true,         
        backdrop: true,
    });

    if(result.isConfirmed)
    {
        try
        {
             Swal.fire({
                title: 'Eliminando...',
                text: 'Por favor espere',
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });
            await db.collection('automoviles').doc(vehicleId).delete();
            Swal.close();
            showFeedback('success', '¡Eliminado!', 'El vehículo ha sido eliminado.', );
            await loadVehicles();//Recargar la lista de vehiculos
        } catch(error)
        {
            console.error('Error al eliminar vehiculo: ', error);
            Swal.close();
            showFeedback('error','Error','No se pudo eliminar el vehiculo'+ error.message);
        }
    }
}


        // Función para mostrar el formulario de nuevo vehículo
async function showAddVehicleForm() {
    const { value: formValues } = await Swal.fire({
        title: 'Agregar Nuevo Vehículo',
        html: `
            <div class="swal2-form">
                <input id="swal-name" class="swal2-input" placeholder="Nombre del Vehículo">
                <input id="swal-brand" class="swal2-input" placeholder="Marca">
                <input id="swal-model" class="swal2-input" placeholder="Modelo">
                <input id="swal-color" class="swal2-input" placeholder="Color">
                <input id="swal-plates" class="swal2-input" placeholder="Placas">
                <select id="swal-type" class="swal2-input">
                    <option value="">Selecciona un tipo</option>
                    <option value="Sedán">Sedán</option>
                    <option value="SUV">SUV</option>
                    <option value="Camioneta">Camioneta</option>
                    <option value="Deportivo">Deportivo</option>
                    <option value="Hatchback">Hatchback</option>
                </select>
                <div class="image-upload-container">
                    <label for="swal-image" class="image-upload-label">
                        <i class="fas fa-cloud-upload-alt"></i>
                        <span>Seleccionar Imagen</span>
                    </label>
                    <input type="file" id="swal-image" accept="image/*" style="display: none;">
                    <div id="image-preview" class="image-preview"></div>
                </div>

                <div class="swal2-radio-group">
                    <h4>Documentos</h4>
                    <div class="checklist-group">
                        <div>
                            <input type="checkbox" name="documentos" id="doc-poliza" value="Póliza">
                            <label for="doc-poliza">Póliza</label>
                        </div>
                        <div>
                            <input type="checkbox" name="documentos" id="doc-manuales" value="Manuales">
                            <label for="doc-manuales">Manuales</label>
                        </div>
                        <div>
                            <input type="checkbox" name="documentos" id="doc-tarjeta" value="Tarjeta de Circulación">
                            <label for="doc-tarjeta">Tarjeta de Circulación</label>
                        </div>
                        
                    </div>
                </div>

                <div class="swal2-radio-group">
                    <h4>Accesorios</h4>
                    <div class="checklist-group">
                        <div>
                            <input type="checkbox" name="accesorios" id="acc-radio" value="Radio">
                            <label for="acc-radio">Radio</label>
                        </div>
                        <div>
                            <input type="checkbox" name="accesorios" id="acc-antena" value="Antena">
                            <label for="acc-antena">Antena</label>
                        </div>
                        <div>
                            <input type="checkbox" name="accesorios" id="acc-rotulado" value="Rotulado">
                            <label for="acc-rotulado">Rotulado</label>
                        </div>
                        <div>
                            <input type="checkbox" name="accesorios" id="acc-tapetes" value="Tapetes">
                            <label for="acc-tapetes">Tapetes</label>
                        </div>
                        <div>
                            <input type="checkbox" name="accesorios" id="acc-tapones" value="Tapones de Birlos">
                            <label for="acc-tapones">Tapones de Birlos</label>
                        </div>
                         <div>
                            <input type="checkbox" name="accesorios" id="acc-corriente" value="Toma corriente">
                            <label for="acc-corriente">Toma corriente</label>
                        </div>
                         <div>
                            <input type="checkbox" name="accesorios" id="acc-clima" value="Clima">
                            <label for="acc-clima">Clima</label>
                        </div>
                         <div>
                            <input type="checkbox" name="accesorios" id="acc-retrovisor" value="Retrovisor">
                            <label for="acc-retrovisor">Retrovisor</label>
                        </div>
                    </div>
                </div>

                <div class="swal2-radio-group">
                    <h4>Seguridad</h4>
                    <div class="checklist-group">
                        <div>
                            <input type="checkbox" name="seguridad" id="seg-extintor" value="Extintor">
                            <label for="seg-extintor">Extintor</label>
                        </div>
                        <div>
                            <input type="checkbox" name="seguridad" id="seg-intermitentes" value="Intermitentes">
                            <label for="seg-intermitentes">Intermitentes</label>
                        </div>
                        <div>
                            <input type="checkbox" name="seguridad" id="seg-tapon" value="Tapón de Gasolina">
                            <label for="seg-tapon">Tapón de Gasolina</label>
                        </div>
                        <div>
                            <input type="checkbox" name="seguridad" id="seg-cinturones" value="Cinturones">
                            <label for="seg-cinturones">Cinturones</label>
                        </div>
                         <div>
                            <input type="checkbox" name="seguridad" id="seg-cuartos" value="Cuartos">
                            <label for="seg-cuartos">Cuartos</label>
                        </div>
                         <div>
                            <input type="checkbox" name="seguridad" id="seg-cristales" value="Cristales">
                            <label for="seg-cristales">Cristales</label>
                        </div>
                    </div>
                </div>

                <div class="swal2-radio-group">
                    <h4>Equipamiento</h4>
                    <div class="checklist-group">
                        <div>
                            <input type="checkbox" name="equipamiento" id="eq-gato" value="Gato">
                            <label for="eq-gato">Gato</label>
                        </div>
                        <div>
                            <input type="checkbox" name="equipamiento" id="eq-maneral" value="Maneral">
                            <label for="eq-maneral">Maneral</label>
                        </div>
                        <div>
                            <input type="checkbox" name="equipamiento" id="eq-llanta" value="Llanta de Refaccion">
                            <label for="eq-llanta">Llanta de Refaccion</label>
                        </div>
                        <div>
                            <input type="checkbox" name="equipamiento" id="eq-reflejante" value="Reflejante">
                            <label for="eq-reflejante">Reflejante</label>
                        </div>
                    </div>
                </div>
            </div>
        `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'Guardar',
        cancelButtonText: 'Cancelar',
        showCloseButton: true,        
        closeButtonHtml: '&times;',   
        allowOutsideClick: false,     
        allowEscapeKey: true,         
        backdrop: true,
        didOpen: () => {
            const imageInput = document.getElementById('swal-image');
            const imagePreview = document.getElementById('image-preview');
            let base64Image = '';

            // Configurar evento para los botones "Seleccionar Todos"
            document.querySelectorAll('.select-all-btn').forEach(button => {
                button.addEventListener('click', function() {
                    const groupName = this.getAttribute('data-group');
                    const checkboxes = document.querySelectorAll(`input[name="${groupName}"]`);
                    const allChecked = Array.from(checkboxes).every(checkbox => checkbox.checked);
                    
                    // Alternar entre seleccionar todos y deseleccionar todos
                    checkboxes.forEach(checkbox => {
                        checkbox.checked = !allChecked;
                    });
                    
                    // Actualizar texto del botón
                    this.innerHTML = allChecked 
                        ? '<i class="fas fa-check-square"></i> Seleccionar Todos'
                        : '<i class="fas fa-times-circle"></i> Deseleccionar Todos';
                });
            });

            imageInput.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (file) {
                    const errors = await validateImageFile(file);
                    if (errors.length > 0) {
                        Swal.showValidationMessage(errors.join('<br>'));
                        imageInput.value = '';
                        return;
                    }
                    
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        base64Image = e.target.result;
                        imagePreview.innerHTML = `<img src="${base64Image}" alt="Vista previa">`;
                    };
                    reader.readAsDataURL(file);
                }
            });
        },
        preConfirm: () => {
            const formData = {
                name: document.getElementById('swal-name').value,
                brand: document.getElementById('swal-brand').value,
                model: document.getElementById('swal-model').value,
                color: document.getElementById('swal-color').value,
                plates: document.getElementById('swal-plates').value,
                type: document.getElementById('swal-type').value,
                image: document.querySelector('#image-preview img')?.src || '',
                documentos: Array.from(document.querySelectorAll('input[name="documentos"]:checked')).map(checkbox => checkbox.value) || [],
                accesorios: Array.from(document.querySelectorAll('input[name="accesorios"]:checked')).map(checkbox => checkbox.value) || [],
                seguridad: Array.from(document.querySelectorAll('input[name="seguridad"]:checked')).map(checkbox => checkbox.value) || [],
                equipamiento: Array.from(document.querySelectorAll('input[name="equipamiento"]:checked')).map(checkbox => checkbox.value) || [],
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            // Validación
            const requiredFields = ['name', 'brand', 'model', 'plates', 'type'];
            const emptyFields = requiredFields.filter(field => !formData[field]);
            
            if (emptyFields.length > 0) {
                Swal.showValidationMessage(`Por favor complete los campos: ${emptyFields.join(', ')}`);
                return false;
            }

            return formData;
        }
    });

    if (formValues) {
        try {
            await db.collection('automoviles').add(formValues);
            showFeedback('success', '¡Éxito!', 'Vehículo agregado correctamente', );
            loadVehicles();
        } catch (error) {
            console.error('Error al agregar vehículo:', error);
            showFeedback('error', 'Error', 'No se pudo agregar el vehículo'+ error.message);
        }
    }
}
async function showAddVehicleForm() {
    const { value: formValues } = await Swal.fire({
        title: 'Agregar Nuevo Vehículo',
        html: `
            <div class="swal2-form">
                <div class="form-group">
                    <label for="swal-name" class="form-label">Nombre del Vehículo</label>
                    <input id="swal-name" class="swal2-input" placeholder="Ej: Toyota Corolla 2023">
                </div>
                <div class="form-group">
                    <label for="swal-brand" class="form-label">Marca</label>
                    <input id="swal-brand" class="swal2-input" placeholder="Ej: Toyota">
                </div>
                
                <div class="form-group">
                    <label for="swal-model" class="form-label">Modelo</label>
                    <input id="swal-model" class="swal2-input" placeholder="Ej: Corolla">
                </div>
                
                <div class="form-group">
                    <label for="swal-color" class="form-label">Color</label>
                    <input id="swal-color" class="swal2-input" placeholder="Ej: Rojo">
                </div>
                
                <div class="form-group">
                    <label for="swal-plates" class="form-label">Placas</label>
                    <input id="swal-plates" class="swal2-input" placeholder="Ej: ABC-123">
                </div>
                <select id="swal-type" class="swal2-input">
                    <option value="">Selecciona un tipo</option>
                    <option value="Sedán">Sedán</option>
                    <option value="SUV">SUV</option>
                    <option value="Camioneta">Camioneta</option>
                    <option value="Deportivo">Deportivo</option>
                    <option value="Hatchback">Hatchback</option>
                </select>
                <div class="image-upload-container">
                    <label for="swal-image" class="image-upload-label">
                        <i class="fas fa-cloud-upload-alt"></i>
                        <span>Seleccionar Imagen</span>
                    </label>
                    <input type="file" id="swal-image" accept="image/*" style="display: none;">
                    <div id="image-preview" class="image-preview"></div>
                </div>

                <div class="swal2-radio-group">
                    <div class="checkbox-group-header">
                        <h4>Documentos</h4>
                        <button type="button" class="select-all-btn" data-group="documentos">
                            <i class="fas fa-check-square"></i> Seleccionar Todos
                        </button>
                    </div>
                    <div class="checklist-group">
                        <div>
                            <input type="checkbox" name="documentos" id="doc-poliza" value="Póliza">
                            <label for="doc-poliza">Póliza</label>
                        </div>
                        <div>
                            <input type="checkbox" name="documentos" id="doc-manuales" value="Manuales">
                            <label for="doc-manuales">Manuales</label>
                        </div>
                        <div>
                            <input type="checkbox" name="documentos" id="doc-tarjeta" value="Tarjeta de Circulación">
                            <label for="doc-tarjeta">Tarjeta de Circulación</label>
                        </div>
                    </div>
                </div>

                <div class="swal2-radio-group">
                    <div class="checkbox-group-header">
                        <h4>Accesorios</h4>
                        <button type="button" class="select-all-btn" data-group="accesorios">
                            <i class="fas fa-check-square"></i> Seleccionar Todos
                        </button>
                    </div>
                    <div class="checklist-group">
                        <div>
                            <input type="checkbox" name="accesorios" id="acc-radio" value="Radio">
                            <label for="acc-radio">Radio</label>
                        </div>
                        <div>
                            <input type="checkbox" name="accesorios" id="acc-antena" value="Antena">
                            <label for="acc-antena">Antena</label>
                        </div>
                        <div>
                            <input type="checkbox" name="accesorios" id="acc-rotulado" value="Rotulado">
                            <label for="acc-rotulado">Rotulado</label>
                        </div>
                        <div>
                            <input type="checkbox" name="accesorios" id="acc-tapetes" value="Tapetes">
                            <label for="acc-tapetes">Tapetes</label>
                        </div>
                        <div>
                            <input type="checkbox" name="accesorios" id="acc-tapones" value="Tapones de Birlos">
                            <label for="acc-tapones">Tapones de Birlos</label>
                        </div>
                         <div>
                            <input type="checkbox" name="accesorios" id="acc-corriente" value="Toma corriente">
                            <label for="acc-corriente">Toma corriente</label>
                        </div>
                         <div>
                            <input type="checkbox" name="accesorios" id="acc-clima" value="Clima">
                            <label for="acc-clima">Clima</label>
                        </div>
                         <div>
                            <input type="checkbox" name="accesorios" id="acc-retrovisor" value="Retrovisor">
                            <label for="acc-retrovisor">Retrovisor</label>
                        </div>
                    </div>
                </div>

                <div class="swal2-radio-group">
                    <div class="checkbox-group-header">
                        <h4>Seguridad</h4>
                        <button type="button" class="select-all-btn" data-group="seguridad">
                            <i class="fas fa-check-square"></i> Seleccionar Todos
                        </button>
                    </div>
                    <div class="checklist-group">
                        <div>
                            <input type="checkbox" name="seguridad" id="seg-extintor" value="Extintor">
                            <label for="seg-extintor">Extintor</label>
                        </div>
                        <div>
                            <input type="checkbox" name="seguridad" id="seg-intermitentes" value="Intermitentes">
                            <label for="seg-intermitentes">Intermitentes</label>
                        </div>
                        <div>
                            <input type="checkbox" name="seguridad" id="seg-tapon" value="Tapón de Gasolina">
                            <label for="seg-tapon">Tapón de Gasolina</label>
                        </div>
                        <div>
                            <input type="checkbox" name="seguridad" id="seg-cinturones" value="Cinturones">
                            <label for="seg-cinturones">Cinturones</label>
                        </div>
                         <div>
                            <input type="checkbox" name="seguridad" id="seg-cuartos" value="Cuartos">
                            <label for="seg-cuartos">Cuartos</label>
                        </div>
                         <div>
                            <input type="checkbox" name="seguridad" id="seg-cristales" value="Cristales">
                            <label for="seg-cristales">Cristales</label>
                        </div>
                    </div>
                </div>

                <div class="swal2-radio-group">
                    <div class="checkbox-group-header">
                        <h4>Equipamiento</h4>
                        <button type="button" class="select-all-btn" data-group="equipamiento">
                            <i class="fas fa-check-square"></i> Seleccionar Todos
                        </button>
                    </div>
                    <div class="checklist-group">
                        <div>
                            <input type="checkbox" name="equipamiento" id="eq-gato" value="Gato">
                            <label for="eq-gato">Gato</label>
                        </div>
                        <div>
                            <input type="checkbox" name="equipamiento" id="eq-maneral" value="Maneral">
                            <label for="eq-maneral">Maneral</label>
                        </div>
                        <div>
                            <input type="checkbox" name="equipamiento" id="eq-llanta" value="Llanta de Refaccion">
                            <label for="eq-llanta">Llanta de Refaccion</label>
                        </div>
                        <div>
                            <input type="checkbox" name="equipamiento" id="eq-reflejante" value="Reflejante">
                            <label for="eq-reflejante">Reflejante</label>
                        </div>
                    </div>
                </div>
            </div>
        `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'Guardar',
        cancelButtonText: 'Cancelar',
        showCloseButton: true,
        closeButtonHtml: '&times;',
        allowOutsideClick: false,
        allowEscapeKey: true,
        backdrop: true,
        didOpen: () => {
            const imageInput = document.getElementById('swal-image');
            const imagePreview = document.getElementById('image-preview');
            let base64Image = '';

            // Configurar evento para los botones "Seleccionar Todos"
            document.querySelectorAll('.select-all-btn').forEach(button => {
                button.addEventListener('click', function() {
                    const groupName = this.getAttribute('data-group');
                    const checkboxes = document.querySelectorAll(`input[name="${groupName}"]`);
                    const allChecked = Array.from(checkboxes).every(checkbox => checkbox.checked);
                    
                    // Alternar entre seleccionar todos y deseleccionar todos
                    checkboxes.forEach(checkbox => {
                        checkbox.checked = !allChecked;
                    });
                    
                    // Actualizar texto del botón
                    this.innerHTML = allChecked 
                        ? '<i class="fas fa-check-square"></i> Seleccionar Todos'
                        : '<i class="fas fa-times-circle"></i> Deseleccionar Todos';
                });
            });

            imageInput.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (file) {
                    const errors = await validateImageFile(file);
                    if (errors.length > 0) {
                        Swal.showValidationMessage(errors.join('<br>'));
                        imageInput.value = '';
                        return;
                    }
                    
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        base64Image = e.target.result;
                        imagePreview.innerHTML = `<img src="${base64Image}" alt="Vista previa">`;
                    };
                    reader.readAsDataURL(file);
                }
            });
        },
        preConfirm: () => {
            const formData = {
                name: document.getElementById('swal-name').value,
                brand: document.getElementById('swal-brand').value,
                model: document.getElementById('swal-model').value,
                color: document.getElementById('swal-color').value,
                plates: document.getElementById('swal-plates').value,
                type: document.getElementById('swal-type').value,
                image: document.querySelector('#image-preview img')?.src || '',
                documentos: Array.from(document.querySelectorAll('input[name="documentos"]:checked')).map(checkbox => checkbox.value) || [],
                accesorios: Array.from(document.querySelectorAll('input[name="accesorios"]:checked')).map(checkbox => checkbox.value) || [],
                seguridad: Array.from(document.querySelectorAll('input[name="seguridad"]:checked')).map(checkbox => checkbox.value) || [],
                equipamiento: Array.from(document.querySelectorAll('input[name="equipamiento"]:checked')).map(checkbox => checkbox.value) || [],
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            // Validación
            const requiredFields = ['name', 'brand', 'model', 'plates', 'type'];
            const emptyFields = requiredFields.filter(field => !formData[field]);
            
            if (emptyFields.length > 0) {
                Swal.showValidationMessage(`Por favor complete los campos: ${emptyFields.join(', ')}`);
                return false;
            }

            return formData;
        }
    });

    if (formValues) {
        try {
            await db.collection('automoviles').add(formValues);
            showFeedback('success', '¡Éxito!', 'Vehículo agregado correctamente');
            loadVehicles();
        } catch (error) {
            console.error('Error al agregar vehículo:', error);
            showFeedback('error', 'Error', 'No se pudo agregar el vehículo'+ error.message);
        }
    }
}

// Agregar soporte para personalización en los botones "Seleccionar Todo"
const selectAllButtons = document.querySelectorAll('.select-all-btn');

selectAllButtons.forEach(button => {
    button.addEventListener('click', () => {
        const checkboxGroup = button.closest('.checkbox-group');
        const checkboxes = checkboxGroup.querySelectorAll('input[type="checkbox"]');
        const allChecked = Array.from(checkboxes).every(checkbox => checkbox.checked);

        checkboxes.forEach(checkbox => {
            checkbox.checked = !allChecked;
        });

        // Aplicar estilos personalizados según el estado
        button.style.backgroundColor = allChecked ? 'var(--primary-color, #3498db)' : 'var(--secondary-color, #2980b9)';
    });
});

// Event Listeners
document.addEventListener('DOMContentLoaded', async () => {
    // Cargar vehículos al inicio
    await loadVehicles();
    
   

    // Búsqueda
    document.getElementById('searchInput').addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const filteredVehicles = vehicles.filter(vehicle => 
            vehicle.name.toLowerCase().includes(searchTerm) ||
            vehicle.brand.toLowerCase().includes(searchTerm) ||
            vehicle.model.toLowerCase().includes(searchTerm) ||
            vehicle.plates.toLowerCase().includes(searchTerm)
        );
        displayVehicles(filteredVehicles);
    });

    // Ordenamiento
    document.getElementById('sortBy').addEventListener('change', (e) => {
        const sortBy = e.target.value;
        const sortedVehicles = [...vehicles].sort((a, b) => {
            if (sortBy === 'model') {
                return b[sortBy] - a[sortBy];
            }
            return a[sortBy].toLowerCase().localeCompare(b[sortBy].toLowerCase());
        });
        displayVehicles(sortedVehicles);
    });
});

function validateVehicleData(formData, isEdit = false) {
    const errors = [];

    // Validación de campos requeridos
    const requiredFields = ['name', 'brand', 'model', 'plates', 'type'];
    requiredFields.forEach(field => {
        if (!formData[field] || formData[field].trim() === '') {
            errors.push(`El campo ${field} es obligatorio`);
        }
    });

    // Validación de longitud
    if (formData.name && formData.name.length > 100) {
        errors.push('El nombre no puede exceder 100 caracteres');
    }
    
    if (formData.plates && !/^[A-Z0-9-]{1,15}$/.test(formData.plates)) {
        errors.push('Formato de placas inválido (solo letras mayúsculas, números y guiones)');
    }

    // Validación de tipo de vehículo
    const validTypes = ['Sedán', 'SUV', 'Camioneta', 'Deportivo', 'Hatchback'];
    if (formData.type && !validTypes.includes(formData.type)) {
        errors.push('Tipo de vehículo no válido');
    }

    // Validación de arrays (seguridad contra inyección)
    if (formData.documentos && !Array.isArray(formData.documentos)) {
        errors.push('Formato de documentos inválido');
    }

    // Validación de imagen (tamaño y tipo)
    if (formData.image && formData.image.startsWith('data:image')) {
        const base64Length = formData.image.length - (formData.image.indexOf(',') + 1);
        const fileSize = Math.floor((base64Length * 3) / 4);
        if (fileSize > 5 * 1024 * 1024) { // 5MB máximo
            errors.push('La imagen no puede ser mayor a 5MB');
        }
    }

    return errors;
}

function sanitizeVehicleData(formData) {
    const sanitized = { ...formData };
    
    // Sanitizar strings (eliminar espacios, prevenir XSS básico)
    const stringFields = ['name', 'brand', 'model', 'color', 'plates', 'type'];
    stringFields.forEach(field => {
        if (sanitized[field]) {
            sanitized[field] = sanitized[field]
                .trim()
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .substring(0, 100); // límite máximo
        }
    });

    // Sanitizar placas (convertir a mayúsculas)
    if (sanitized.plates) {
        sanitized.plates = sanitized.plates.toUpperCase().replace(/\s+/g, '');
    }

    // Validar y sanitizar arrays
    const arrayFields = ['documentos', 'accesorios', 'seguridad', 'equipamiento'];
    arrayFields.forEach(field => {
        if (sanitized[field]) {
            if (!Array.isArray(sanitized[field])) {
                sanitized[field] = [];
            } else {
                // Filtrar valores válidos
                const validValues = getValidValuesForField(field);
                sanitized[field] = sanitized[field].filter(value => 
                    validValues.includes(value)
                );
            }
        }
    });

    return sanitized;
}

// Lista de valores permitidos para cada campo (seguridad adicional)
function getValidValuesForField(fieldName) {
    const validValues = {
        documentos: ['Póliza', 'Manuales', 'Tarjeta de Circulación'],
        accesorios: ['Radio', 'Antena', 'Rotulado', 'Tapetes', 'Tapones de Birlos', 'Toma corriente', 'Clima', 'Retrovisor'],
        seguridad: ['Extintor', 'Intermitentes', 'Tapón de Gasolina', 'Cinturones', 'Cuartos', 'Cristales'],
        equipamiento: ['Gato', 'Maneral', 'Llanta de Refaccion', 'Reflejante']
    };
    
    return validValues[fieldName] || [];
}

function validateImageFile(file) {
    const errors = [];
    
    // Validar tipo de archivo
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
        errors.push('Solo se permiten imágenes JPEG, PNG, GIF o WebP');
    }
    
    // Validar tamaño (5MB máximo)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
        errors.push('La imagen no puede ser mayor a 5MB');
    }
    
    // Validar dimensiones
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = function() {
            if (this.width > 4000 || this.height > 4000) {
                errors.push('Las dimensiones de la imagen son demasiado grandes');
            }
            resolve(errors);
        };
        img.onerror = function() {
            errors.push('La imagen no es válida');
            resolve(errors);
        };
        img.src = URL.createObjectURL(file);
    });
}
