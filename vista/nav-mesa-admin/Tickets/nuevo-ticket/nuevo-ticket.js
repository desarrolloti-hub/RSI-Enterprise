
    // Configuración de Firebase - SOLO UNA VEZ
    const firebaseConfig = {
        apiKey: "AIzaSyBJy992gkvsT77-_fMp_O_z99wtjZiK77Y",
        authDomain: "rsienterprise.firebaseapp.com",
        projectId: "rsienterprise",
        storageBucket: "rsienterprise.appspot.com",
        messagingSenderId: "1063117165770",
        appId: "1:1063117165770:web:8555f26b25ae80bc42d033"
    };

    // Inicializar Firebase solo si no está inicializado
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    const auth = firebase.auth();
    const db = firebase.firestore();

    const appState = {
        currentUser: null,
        colaboradores: [],
        clientes: [],
        currentTicketType: 'operativo',
        cotizacionesVendidas: [],
        //Para sistema de reportes
        origenReporteId: null
    };

    // Variables de control para el estado del guardado
    let isSaving = false;

    async function initializeFCM() {
        try {
            console.log('🔧 Inicializando FCM...');
            
            if (typeof fcmManager !== 'undefined') {
                const success = await fcmManager.initialize();
                
                if (success) {
                    console.log('✅ FCM inicializado correctamente');
                    setTimeout(() => {
                        fcmManager.testNotification();
                    }, 3000);
                }
                
                return success;
            } else {
                console.warn('❌ fcmManager no está disponible');
                return false;
            }
            
        } catch (error) {
            console.warn('⚠️ FCM no pudo inicializarse:', error);
            return false;
        }
    }

    // =================================================================================
    // FUNCIONES PRINCIPALES
    // =================================================================================

    async function initialLoad() {
        try {
            await loadUserProfile();
            await loadClientes();
            await loadCollaborators();
            setupEventListeners();
            setupSelect2();

            //Sistema reportes
            checkPendingReportData();


        } catch (error) {
            console.error("Error en la carga inicial:", error);
            showError('No se pudieron cargar los datos iniciales.');
        }
    }

    async function loadUserProfile() {
        const user = auth.currentUser;
        if (!user) {
            window.location.href = '../nav-visitantes/inicio-de-sesion.html';
            return;
        }
        
        try {
            const savedUser = localStorage.getItem('currentUser');
            if (savedUser) {
                appState.currentUser = JSON.parse(savedUser);
                console.log('Usuario cargado desde localStorage:', appState.currentUser);
            } else {
                const querySnapshot = await db.collection("colaboradores")
                    .where("CORREO ELECTRÓNICO EMPRESARIAL", "==", user.email)
                    .get();
                
                if (!querySnapshot.empty) {
                    const doc = querySnapshot.docs[0];
                    const userData = doc.data();
                    appState.currentUser = {
                        id: doc.id,
                        nombre: userData.NOMBRE,
                        area: userData.ÁREA,
                        imagen: userData.imagen || '../css/img/Logo-RSI-OFICIAL.png'
                    };
                    localStorage.setItem('currentUser', JSON.stringify(appState.currentUser));
                } else {
                    appState.currentUser = {
                        id: user.uid,
                        nombre: user.email,
                        area: 'Usuario no registrado',
                        imagen: '../css/img/Logo-RSI-OFICIAL.png'
                    };
                }
            }
        } catch (error) {
            console.error("Error al cargar perfil:", error);
        }
    }

    async function loadClientes() {
        try {
            const snapshot = await db.collection('clientes').get();
            const selectCuenta = document.getElementById('cuenta');
            selectCuenta.innerHTML = '<option value="">Seleccione un cliente</option>';
            
            appState.clientes = snapshot.docs.map(doc => {
                const data = doc.data();
                const direccionCompleta = [data.Calle, data['No.Exterior'], data.Colonia, data['Codigo Postal'], data.Pais].filter(Boolean).join(', ');
                const option = document.createElement('option');
                option.value = doc.id;
                option.textContent = data['Nombre Comercial'] || 'Cliente sin nombre comercial';
                selectCuenta.appendChild(option);
                return {
                    id: doc.id,
                    nombreComercial: data['Nombre Comercial'] || '',
                    rfc: data.RFC || '',
                    correo: data.Correo || '',
                    contacto: data.Nombre || '',
                    direccion: direccionCompleta
                };
            });
        } catch (error) {
            console.error("Error al cargar clientes:", error);
        }
    }

    async function loadTodasLasCotizaciones() {
        try {
            console.log('🔍 Cargando TODAS las cotizaciones de cotizacionPdf...');
            
            const snapshot = await db.collection('cotizacionPdf').get();
            
            console.log('📊 Total de cotizaciones encontradas:', snapshot.docs.length);
            
            const cotizacionesSelect = document.getElementById('cotizacion');
            const infoText = document.getElementById('cotizacionInfoText');
            
            cotizacionesSelect.innerHTML = '<option value="">Seleccione una cotización</option>';
            
            if (snapshot.empty) {
                console.log('❌ No se encontraron cotizaciones en la colección cotizacionPdf');
                infoText.textContent = 'No se encontraron cotizaciones en la base de datos';
                infoText.style.color = 'red';
                
                const option = document.createElement('option');
                option.value = '';
                option.textContent = 'No hay cotizaciones en la base de datos';
                option.disabled = true;
                cotizacionesSelect.appendChild(option);
            } else {
                infoText.textContent = `Se encontraron ${snapshot.docs.length} cotizaciones. Mostrando todas.`;
                infoText.style.color = 'var(--primary-color)';
                
                snapshot.docs.forEach(doc => {
                    const data = doc.data();
                    console.log('📄 Cotización:', {
                        id: doc.id,
                        numero: data.cotizacionNumero,
                        estado: data.estado,
                        cliente: data.clienteNombre,
                        descripcion: data.cotizacionDescripcion
                    });
                    
                    const option = document.createElement('option');
                    option.value = doc.id;
                    
                    const numeroCotizacion = data.cotizacionNumero || 'Sin número';
                    const estado = data.estado || 'Sin estado';
                    const cliente = data.clienteNombre || 'Sin cliente';
                    const descripcion = data.cotizacionDescripcion || 'Sin descripción';
                    
                    option.textContent = `${numeroCotizacion} - ${estado} - ${cliente}`;
                    option.title = `Descripción: ${descripcion}`;
                    
                    cotizacionesSelect.appendChild(option);
                });
            }
            
            $('#cotizacion').trigger('change');
            
        } catch (error) {
            console.error("❌ Error al cargar cotizaciones:", error);
            const infoText = document.getElementById('cotizacionInfoText');
            infoText.textContent = 'Error al cargar cotizaciones: ' + error.message;
            infoText.style.color = 'red';
        }
    }

    async function loadCollaborators() {
        try {
            const snapshot = await db.collection('colaboradores').get();
            appState.colaboradores = snapshot.docs.map(doc => ({
                id: doc.id,
                nombre: doc.data().NOMBRE,
                area: doc.data().ÁREA
            }));

            $('#colaboradores').select2({
                data: appState.colaboradores.map(col => ({ id: col.id, text: col.nombre })),
                placeholder: 'Seleccione colaboradores',
                width: '100%'
            });

            $('#rsiColaboradores').select2({
                data: appState.colaboradores.map(col => ({ id: col.id, text: col.nombre })),
                placeholder: 'Seleccione responsable y copias',
                width: '100%'
            });
        } catch (error) {
            console.error("Error al cargar colaboradores:", error);
        }
    }

    function setupSelect2() {
        $('#cuenta').select2({
            placeholder: 'Seleccione un cliente',
            width: '100%'
        });

        $('#cotizacion').select2({
            placeholder: 'Seleccione una cotización',
            width: '100%'
        });
    }

    function setupEventListeners() {
        document.querySelectorAll('.ticket-type-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const type = this.getAttribute('data-type');
                changeTicketType(type);
            });
        });

        $('#colaboradores').on('change', function() {
            actualizarAreas('#colaboradores', 'area');
        });

        $('#rsiColaboradores').on('change', function() {
            actualizarAreas('#rsiColaboradores', 'rsiArea');
        });

        document.getElementById('cuenta').addEventListener('change', function(e) {
            loadClientData(e.target.value);
        });
    }

    function loadClientData(clientId) {
        const cliente = appState.clientes.find(c => c.id === clientId);
        if (cliente) {
            document.getElementById('direccionFiscal').value = cliente.direccion || '';
            document.getElementById('rfc').value = cliente.rfc || '';
            document.getElementById('atencionA').value = cliente.contacto || '';
            document.getElementById('correo').value = cliente.correo || '';
            
            loadTodasLasCotizaciones();
        } else {
            document.getElementById('direccionFiscal').value = '';
            document.getElementById('rfc').value = '';
            document.getElementById('atencionA').value = '';
            document.getElementById('correo').value = '';
            
            clearCotizacionesSelect();
        }
    }

    async function loadCotizacionData(cotizacionId) {
        const cotizacionInfo = document.getElementById('cotizacionInfo');
        
        if (!cotizacionId) {
            cotizacionInfo.style.display = 'none';
            return;
        }
        
        try {
            const doc = await db.collection('cotizacionPdf').doc(cotizacionId).get();
            if (doc.exists) {
                const data = doc.data();
                console.log('📋 Datos completos de cotización cargados:', data);
                
                document.getElementById('cotizacionNumero').value = data.cotizacionNumero || '';
                document.getElementById('cotizacionDescripcion').value = data.cotizacionDescripcion || '';
                document.getElementById('cotizacionFecha').value = data.cotizacionFecha || '';
                document.getElementById('cotizacionTotal').value = `$${data.totalFinal || '0'}`;
                document.getElementById('cotizacionEstado').value = data.estado || '';
                document.getElementById('cotizacionCliente').value = data.clienteNombre || '';
                
                cotizacionInfo.style.display = 'block';
            } else {
                cotizacionInfo.style.display = 'none';
            }
        } catch (error) {
            console.error("Error al cargar datos de cotización:", error);
            cotizacionInfo.style.display = 'none';
        }
    }

    function clearCotizacionesSelect() {
        const cotizacionesSelect = document.getElementById('cotizacion');
        cotizacionesSelect.innerHTML = '<option value="">Seleccione una cotización</option>';
        document.getElementById('cotizacionInfo').style.display = 'none';
        document.getElementById('cotizacionInfoText').textContent = 'Seleccione "Sí" para cargar cotizaciones';
        document.getElementById('cotizacionInfoText').style.color = '';
        $('#cotizacion').trigger('change');
    }

    function toggleCotizacionSelect(value) {
        const cotizacionContainer = document.getElementById('cotizacionContainer');
        if (value === 'si') {
            cotizacionContainer.style.display = 'block';
            loadTodasLasCotizaciones();
        } else {
            cotizacionContainer.style.display = 'none';
            clearCotizacionesSelect();
        }
    }

    function changeTicketType(type) {
        appState.currentTicketType = type;
        
        document.querySelectorAll('.ticket-type-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`.ticket-type-btn[data-type="${type}"]`).classList.add('active');
        
        if (type === 'operativo') {
            document.getElementById('adminFormContainer').style.display = 'none';
            document.querySelector('.form-container').style.display = 'block';
            document.getElementById('formTitle').textContent = 'Nuevo Ticket Operativo';
        } else {
            document.querySelector('.form-container').style.display = 'none';
            document.getElementById('adminFormContainer').style.display = 'block';
        }
    }

    function actualizarAreas(selectorId, inputId) {
        const selectedIds = $(selectorId).val() || [];
        if (selectedIds.length > 0) {
            const areas = new Set();
            selectedIds.forEach(id => {
                const colaborador = appState.colaboradores.find(c => c.id === id);
                if (colaborador && colaborador.area) {
                    areas.add(colaborador.area);
                }
            });
            document.getElementById(inputId).value = Array.from(areas).join(', ');
        } else {
            document.getElementById(inputId).value = '';
        }
    }

    // =================================================================================
    // FUNCIONES PARA GUARDAR TICKETS
    // =================================================================================

    async function saveTicket(event, type) {
        event.preventDefault();
        
        if (isSaving) return;
        isSaving = true;
        
        const submitButton = event.target.querySelector('button[type="submit"]');
        const originalText = submitButton.innerHTML;
        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
        
        try {
            let ticketId;
            if (type === 'operativo') {
                ticketId = await saveOperativoTicket();
            } else {
                ticketId = await saveAdminTicket();
            }
            
            await showSuccess('¡Ticket creado exitosamente!', `El ticket ${ticketId} ha sido registrado en el sistema.`);
            
            setTimeout(() => {
                window.location.href = '/vista/nav-mesa-admin/Tickets/gestion-tickets-admin/gestion-tickets-admin.html';
            }, 3000);
            
        } catch (error) {
            console.error('Error al guardar ticket:', error);
            showError('No se pudo guardar el ticket. Por favor, intente nuevamente.');
        } finally {
            isSaving = false;
            submitButton.disabled = false;
            submitButton.innerHTML = originalText;
        }
    }

    async function saveOperativoTicket() {
        if (!validateOperativoForm()) {
            throw new Error('Formulario incompleto');
        }
        
        const { nuevoContador, idTicket } = await obtenerYActualizarContador();
        
        const selectedCollaboratorsIds = $('#colaboradores').val() || [];
        const responsable = appState.colaboradores.find(c => c.id === selectedCollaboratorsIds[0]);
        
        const levantadoPor = appState.currentUser ? appState.currentUser.nombre : 'Usuario desconocido';
        
        const asociarCotizacion = document.querySelector('input[name="asociarCotizacion"]:checked').value;
        const cotizacionId = asociarCotizacion === 'si' ? document.getElementById('cotizacion').value : null;
        const cotizacionNombre = asociarCotizacion === 'si' ? $("#cotizacion option:selected").text() : null;
        const cotizacionNumero = asociarCotizacion === 'si' ? document.getElementById('cotizacionNumero').value : null;
        
        const ticketData = {
            idTicket: idTicket,
            titulo: document.getElementById('titulo').value,
            estado: document.getElementById('estado').value,
            prioridad: document.getElementById('prioridad').value,
            area: document.getElementById('area').value,
            colaboradores: selectedCollaboratorsIds,
            responsableNombre: responsable ? responsable.nombre : '',
            cuentaId: document.getElementById('cuenta').value,
            cuentaNombre: $("#cuenta option:selected").text(),
            direccionFiscal: document.getElementById('direccionFiscal').value,
            rfc: document.getElementById('rfc').value,
            atencionA: document.getElementById('atencionA').value,
            correo: document.getElementById('correo').value,
            fecha: document.getElementById('fecha').value,
            ordenServicio: document.getElementById('ordenServicio').value,
            proyecto: document.getElementById('proyecto').value,
            servicio: document.getElementById('servicio').value,
            sistemas: Array.from(document.querySelectorAll('input[name="sistemas"]:checked')).map(cb => cb.value),
            descripcionActividades: document.getElementById('descripcionActividades').value,
            fechaCreacion: firebase.firestore.FieldValue.serverTimestamp(),
            fechaActualizacion: firebase.firestore.FieldValue.serverTimestamp(),
            notificacion: false,
            conclusion: "El equipo queda instalado, configurado y operando correctamente.",
            levantadoPor: levantadoPor,
            tipo: 'operativo',
            asociarCotizacion: asociarCotizacion,
            cotizacionId: cotizacionId,
            cotizacionNombre: cotizacionNombre,
            cotizacionNumero: cotizacionNumero
        };
        
        await db.collection('ticketsmesa').doc(idTicket).set(ticketData);
        
        // NUEVO: Actualizar la cotización con el ID del ticket asociado
        if (asociarCotizacion === 'si' && cotizacionId) {
            try {
                await db.collection('cotizacionPdf').doc(cotizacionId).update({
                    ticketAsociado: idTicket,
                    fechaActualizacion: firebase.firestore.FieldValue.serverTimestamp()
                });
                console.log(`✅ Ticket ${idTicket} asociado a cotización ${cotizacionId}`);
            } catch (error) {
                console.error("❌ Error al asociar ticket a cotización:", error);
                // No lanzamos error aquí para no interrumpir el flujo principal
            }
        }
        
        if (selectedCollaboratorsIds.length > 0) {
            await sendPushNotification(selectedCollaboratorsIds, ticketData);
        }

        return idTicket;
    }

    async function sendPushNotification(colaboradorIds, ticketData) {
        try {
            console.log('📤 Enviando notificaciones...');

            if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                navigator.serviceWorker.controller.postMessage({
                    type: 'SHOW_NOTIFICATION',
                    notification: {
                        title: '🎫 Nuevo Ticket - RSI',
                        body: `Ticket: ${ticketData.titulo}`,
                        icon: '/vista/css/img/logoApp-192.png',
                        badge: '/vista/css/img/logoApp-192.png',
                        data: { 
                            ticketId: ticketData.idTicket,
                            type: 'new_ticket'
                        },
                        actions: [
                            {
                                action: 'open',
                                title: 'Abrir Ticket'
                            }
                        ]
                    }
                });
                console.log('✅ Notificación enviada al Service Worker');
            } else {
                new Notification('🎫 Nuevo Ticket', {
                    body: `Ticket ${ticketData.idTicket} creado: ${ticketData.titulo}`,
                    icon: '/vista/css/img/logoApp-192.png'
                });
            }

        } catch (error) {
            console.error('❌ Error enviando notificación:', error);
        }
    }

    async function saveAdminTicket() {
        if (!validateAdminForm()) {
            throw new Error('Formulario incompleto');
        }
        
        const { nuevoContador, idTicket } = await obtenerYActualizarContador();
        
        const selectedCollaboratorsIds = $('#rsiColaboradores').val() || [];
        const responsable = appState.colaboradores.find(c => c.id === selectedCollaboratorsIds[0]);
        
        const levantadoPor = appState.currentUser ? appState.currentUser.nombre : 'Usuario desconocido';
        
        const ticketData = {
            idTicket: idTicket,
            titulo: document.getElementById('rsiTitulo').value,
            descripcionActividades: document.getElementById('rsiDescripcionActividades').value,
            fecha: document.getElementById('rsiFecha').value,
            fechaFinalizacion: document.getElementById('rsiFechaFinalizacion').value,
            prioridad: document.getElementById('rsiPrioridad').value,
            colaboradores: selectedCollaboratorsIds,
            responsableNombre: responsable ? responsable.nombre : 'Sin asignar',
            area: document.getElementById('rsiArea').value,
            cuentaNombre: "Ticket Interno RSI",
            estado: "pendiente",
            fechaCreacion: firebase.firestore.FieldValue.serverTimestamp(),
            fechaActualizacion: firebase.firestore.FieldValue.serverTimestamp(),
            notificacion: false,
            conclusion: "Pendiente de conclusión.",
            cuentaId: null,
            direccionFiscal: '',
            rfc: '',
            atencionA: '',
            correo: '',
            ordenServicio: '',
            proyecto: 'Interno',
            servicio: 'Actividad Interna',
            sistemas: ['OTRO'],
            levantadoPor: levantadoPor,
            tipo: 'administracion'
        };
        
        
        //SISTEMA DE REPORTES
        if (appState.origenReporteId) {
            ticketData.origenReporteId = appState.origenReporteId;
        }

        await db.collection('ticketsmesa').doc(idTicket).set(ticketData);


        if (appState.origenReporteId) {
            try {
                console.log(`🔗 Vinculando Ticket ${idTicket} con Reporte ${appState.origenReporteId}`);
                
                await db.collection('reportesSistema').doc(appState.origenReporteId).update({
                    estado: 'En Proceso', // REQUERIMIENTO: Cambiar estado
                    ticketAsociado: idTicket,
                    responsableAsignado: ticketData.responsableNombre
                });
                
            } catch (error) {
                console.error("Error actualizando reporte original:", error);
                // No detenemos el flujo, el ticket ya se creó
            }
        }
        


        return idTicket;
    }

    async function obtenerYActualizarContador() {
        const contadorRef = db.collection('contadorTickets').doc('contadorTicketsMesa');
        
        let nuevoContador;
        let idTicket;
        
        try {
            await db.runTransaction(async (transaction) => {
                const doc = await transaction.get(contadorRef);
                
                if (!doc.exists) {
                    nuevoContador = 1;
                    transaction.set(contadorRef, { contador: nuevoContador });
                } else {
                    nuevoContador = doc.data().contador + 1;
                    transaction.update(contadorRef, { contador: nuevoContador });
                }
                
                idTicket = `Ticket-RSI-${nuevoContador}`;
            });
            
            return { nuevoContador, idTicket };
        } catch (error) {
            console.error("Error en transacción de contador:", error);
            throw new Error("No se pudo generar el ID del ticket");
        }
    }

    function validateOperativoForm() {
        const titulo = document.getElementById('titulo').value;
        const cuenta = document.getElementById('cuenta').value;
        const asociarCotizacion = document.querySelector('input[name="asociarCotizacion"]:checked').value;
        
        if (!titulo.trim()) {
            showError('El título del ticket es obligatorio');
            return false;
        }
        
        if (!cuenta) {
            showError('Debe seleccionar un cliente');
            return false;
        }
        
        if (asociarCotizacion === 'si') {
            const cotizacion = document.getElementById('cotizacion').value;
            if (!cotizacion) {
                showError('Debe seleccionar una cotización cuando marca la opción "Sí"');
                return false;
            }
        }
        
        return true;
    }

    function validateAdminForm() {
        const titulo = document.getElementById('rsiTitulo').value;
        
        if (!titulo.trim()) {
            showError('El título del ticket es obligatorio');
            return false;
        }
        
        return true;
    }

    function cancelTicket() {
        Swal.fire({
            title: '¿Cancelar ticket?',
            text: 'Los cambios no guardados se perderán.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, cancelar',
            cancelButtonText: 'Continuar editando',
            confirmButtonColor: '#6C43E0',
            cancelButtonColor: '#dc3545'
        }).then((result) => {
            if (result.isConfirmed) {
                window.location.href = '/vista/nav-mesa-admin/Tickets/gestion-tickets-admin/gestion-tickets-admin.html';
            }
        });
    }

    // =================================================================================
    // FUNCIONES DE UTILIDAD
    // =================================================================================

    function showError(message) {
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                title: 'Error',
                text: message,
                icon: 'error',
                confirmButtonColor: '#6C43E0'
            });
        } else {
            alert('Error: ' + message);
        }
    }

    async function showSuccess(title, text) {
        if (typeof Swal !== 'undefined') {
            await Swal.fire({
                title: title,
                text: text,
                icon: 'success',
                confirmButtonColor: '#6C43E0',
                timer: 3000,
                showConfirmButton: true
            });
        } else {
            alert(title + ': ' + text);
        }
    }

    // =================================================================================
    // INICIALIZACIÓN
    // =================================================================================
    document.addEventListener('DOMContentLoaded', function() {
        auth.onAuthStateChanged(user => {
            if (user) {
                console.log('Usuario autenticado:', user.email);
                initialLoad();
            } else {
                console.log('No hay usuario autenticado, redirigiendo...');
                window.location.href = '../nav-visitantes/inicio-de-sesion.html';
            }
        });
    });


    //funcion para sistema de reportes
    function checkPendingReportData() {
        const dataJSON = sessionStorage.getItem('ticketPrefillData');
        
        if (dataJSON) {
            console.log("📥 Datos recibidos desde Reportes:", dataJSON);
            const data = JSON.parse(dataJSON);

            // 1. Cambiar a la pestaña administrativa automáticamente
            changeTicketType('administracion');

            // 2. Rellenar campos del formulario Administrativo
            // Esperamos un poco para asegurar que el DOM (pestañas) haya cambiado
            setTimeout(() => {
                if(document.getElementById('rsiTitulo')) {
                    document.getElementById('rsiTitulo').value = data.titulo || '';
                    document.getElementById('rsiDescripcionActividades').value = data.descripcion || '';
                    document.getElementById('rsiPrioridad').value = data.prioridad || 'Media';
                    
                    // Guardar el ID del reporte original en el estado para usarlo al guardar
                    appState.origenReporteId = data.origenReporteId;

                    // Notificar visualmente
                    Swal.fire({
                        toast: true,
                        position: 'top-end',
                        icon: 'info',
                        title: 'Datos cargados desde reporte',
                        showConfirmButton: false,
                        timer: 3000
                    });
                }
            }, 500);

            // 3. Limpiar memoria para que no se vuelva a cargar al recargar la página
            sessionStorage.removeItem('ticketPrefillData');
        }
    }