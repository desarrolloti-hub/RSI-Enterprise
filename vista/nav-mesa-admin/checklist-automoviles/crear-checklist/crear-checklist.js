        // Configuración de Firebase (la misma que en tu archivo original)
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
        let vehicles = []; // Array para almacenar los vehículos

        // Función para cargar vehículos desde Firestore
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
                const vehicleSelect = document.getElementById('vehicleSelect');
                vehicleSelect.innerHTML = '<option value="">Error al cargar vehículos</option>';
                
                // Mostrar error con SweetAlert2
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'No se pudieron cargar los vehículos: ' + error.message,
                    confirmButtonText: 'Aceptar'
                });
            }
        }

        // Función para poblar el select con los vehículos
        function populateVehicleSelect() {
            const vehicleSelect = document.getElementById('vehicleSelect');
            
            // Limpiar el select
            vehicleSelect.innerHTML = '';
            
            // Agregar opción vacía
            const emptyOption = document.createElement('option');
            emptyOption.value = "";
            emptyOption.textContent = "Selecciona un vehículo";
            vehicleSelect.appendChild(emptyOption);
            
            // Agregar opciones para cada vehículo
            vehicles.forEach(vehicle => {
                const option = document.createElement('option');
                option.value = vehicle.id;
                
                // Texto que se mostrará en el select
                let displayText = vehicle.name || 'Sin nombre';
                if (vehicle.plates) {
                    displayText += ` (${vehicle.plates})`;
                }
                
                option.textContent = displayText;
                
                // Agregar datos adicionales como atributos personalizados
                option.dataset.brand = vehicle.brand || '';
                option.dataset.model = vehicle.model || '';
                option.dataset.color = vehicle.color || '';
                option.dataset.plates = vehicle.plates || '';
                option.dataset.type = vehicle.type || '';
                option.dataset.image = vehicle.image || '';
                
                vehicleSelect.appendChild(option);
            });
        }

        // Función para mostrar detalles del vehículo seleccionado
        function displayVehicleDetails(vehicleId) {
            const vehicle = vehicles.find(v => v.id === vehicleId);
            const vehicleDetails = document.getElementById('vehicleDetails');
            
            if (!vehicle) {
                vehicleDetails.style.display = 'none';
                return;
            }
            
            // Actualizar los detalles
            document.getElementById('detail-brand').textContent = vehicle.brand || 'No especificado';
            document.getElementById('detail-plates').textContent = vehicle.plates || 'No especificado';
        
            // Mostrar la sección de detallesS
            vehicleDetails.style.display = 'block';
        }

        // Event listener cuando el DOM esté cargado
        document.addEventListener('DOMContentLoaded', function() {
            // Cargar vehículos al iniciar
            loadVehicles();
            
            // Agregar evento al select
            const vehicleSelect = document.getElementById('vehicleSelect');
            vehicleSelect.addEventListener('change', function() {
                const selectedVehicleId = this.value;
                
                if (selectedVehicleId) {
                    displayVehicleDetails(selectedVehicleId);
                } else {
                    document.getElementById('vehicleDetails').style.display = 'none';
                }
            });
        });