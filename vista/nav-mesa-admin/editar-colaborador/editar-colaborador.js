// editar-colaborador.js - Versión corregida para trabajar con la estructura de áreas/subáreas
(function() {
    'use strict';

    // =============================================
    // CONFIGURACIÓN DE FIREBASE
    // =============================================
    const firebaseConfig = {
        apiKey: "AIzaSyBJy992gkvsT77-_fMp_O_z99wtjZiK77Y",
        authDomain: "rsienterprise.firebaseapp.com",
        projectId: "rsienterprise",
        storageBucket: "rsienterprise.firebasestorage.app",
        messagingSenderId: "1063117165770",
        appId: "1:1063117165770:web:8555f26b25ae80bc42d033"
    };

    // Inicializar Firebase solo si no hay ninguna app
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }

    const db = firebase.firestore();
    const auth = firebase.auth();

    // =============================================
    // VARIABLES GLOBALES
    // =============================================
    let colaboradorId = null;
    let colaboradorData = null;
    let imagenBase64 = '';
    let areasData = []; // Array de áreas con sus subáreas (objetos con id y nombre)
    let currentUser = null;

    // =============================================
    // FUNCIONES DE UTILIDAD PARA MENSAJES
    // =============================================
    
    function mostrarLoading(mensaje) {
        if (typeof window.showCustomLoading === 'function') {
            window.showCustomLoading(mensaje);
        } 
        else if (typeof Swal !== 'undefined') {
            Swal.fire({
                title: mensaje || 'Cargando...',
                text: 'Por favor espere',
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });
        } 
        else {
            console.log(mensaje);
        }
    }

    function mostrarExito(titulo, mensaje) {
        if (typeof window.showCustomSuccess === 'function') {
            window.showCustomSuccess(titulo, mensaje);
        } 
        else if (typeof Swal !== 'undefined') {
            Swal.fire({
                title: titulo || 'Éxito',
                html: mensaje,
                icon: 'success',
                timer: 3000,
                showConfirmButton: true
            });
        } 
        else {
            alert(`${titulo}: ${mensaje}`);
        }
    }

    function mostrarError(mensaje) {
        if (typeof Swal !== 'undefined') {
            Swal.close();
        }
        
        if (typeof window.showCustomError === 'function') {
            window.showCustomError('Error', mensaje);
        } 
        else if (typeof Swal !== 'undefined') {
            Swal.fire({
                title: 'Error',
                text: mensaje,
                icon: 'error',
                confirmButtonText: 'OK'
            });
        } 
        else {
            alert(`❌ Error: ${mensaje}`);
        }
    }

    // =============================================
    // FUNCIONES PRINCIPALES
    // =============================================

    /**
     * Obtiene parámetros de la URL
     */
    function obtenerParametrosURL() {
        const urlParams = new URLSearchParams(window.location.search);
        colaboradorId = urlParams.get('id');
        
        if (!colaboradorId) {
            console.error('❌ No se proporcionó ID de colaborador');
            mostrarError('No se encontró el ID del colaborador');
            return false;
        }
        
        console.log('📋 ID del colaborador a editar:', colaboradorId);
        return true;
    }

    /**
     * Obtiene información del usuario actual
     */
    function obtenerUsuarioActual() {
        if (typeof window.menuState !== 'undefined' && window.menuState.userData) {
            const userData = window.menuState.userData;
            if (userData.nombre && userData.nombre !== 'Cargando...') {
                return {
                    nombre: userData.nombre,
                    email: userData.correoEmpresarial || userData.email,
                    id: userData.id
                };
            }
        }

        const user = auth.currentUser;
        if (user) {
            return {
                nombre: user.displayName || user.email?.split('@')[0] || 'Usuario',
                email: user.email || '',
                id: user.uid
            };
        }
        
        return {
            nombre: 'Usuario Desconocido',
            email: 'desconocido@rsi.com',
            id: 'unknown'
        };
    }

    /**
     * Convierte imagen a base64
     */
    function convertirImagenABase64(archivo) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(archivo);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    }

    /**
     * CARGA ÁREAS DESDE FIRESTORE
     * Maneja la estructura de subáreas como objeto/mapa
     */
    async function cargarAreas() {
        try {
            console.log('📥 Cargando áreas desde Firebase...');
            const snapshot = await db.collection('areasRSI').orderBy('nombre').get();
            areasData = [];
            
            snapshot.forEach(doc => {
                const data = doc.data();
                console.log(`📁 Área: ${data.nombre}`, data);
                
                // Procesar subáreas como objeto/mapa
                let subareasProcesadas = [];
                
                if (data.subareas) {
                    // Verificar si es un objeto (como en tu estructura)
                    if (typeof data.subareas === 'object' && !Array.isArray(data.subareas)) {
                        console.log(`🔍 Subáreas como objeto para ${data.nombre}:`, data.subareas);
                        
                        // Iterar sobre las propiedades del objeto
                        Object.keys(data.subareas).forEach(key => {
                            const subareaItem = data.subareas[key];
                            // Extraer el id y nombre del objeto
                            if (subareaItem && typeof subareaItem === 'object') {
                                subareasProcesadas.push({
                                    id: subareaItem.id || key,
                                    nombre: subareaItem.nombre || 'Sin nombre'
                                });
                                console.log(`  - Subárea encontrada: ${subareaItem.nombre} (${subareaItem.id})`);
                            }
                        });
                    }
                    // Si es un array (por si acaso)
                    else if (Array.isArray(data.subareas)) {
                        subareasProcesadas = data.subareas.map(sub => {
                            if (typeof sub === 'object' && sub !== null) {
                                return {
                                    id: sub.id || 'unknown',
                                    nombre: sub.nombre || 'Sin nombre'
                                };
                            }
                            return {
                                id: `sub_${Date.now()}`,
                                nombre: String(sub)
                            };
                        });
                    }
                }
                
                // Ordenar subáreas por nombre
                subareasProcesadas.sort((a, b) => a.nombre.localeCompare(b.nombre));
                
                areasData.push({
                    id: doc.id,
                    nombre: data.nombre,
                    subareas: subareasProcesadas
                });
            });
            
            console.log('✅ Áreas cargadas:', areasData);
            actualizarSelectAreas();
            
            // Si ya tenemos datos del colaborador, configurar área y subárea
            if (colaboradorData) {
                configurarAreaYSubarea();
            }
            
        } catch (error) {
            console.error('❌ Error al cargar áreas:', error);
            cargarAreasPorDefecto();
        }
    }

    /**
     * Áreas por defecto en caso de error
     */
    function cargarAreasPorDefecto() {
        areasData = [
            { 
                nombre: 'Administración', 
                subareas: [
                    { id: 'admin_1', nombre: 'Administrativo' },
                    { id: 'admin_2', nombre: 'Auxiliar' }
                ] 
            },
            { 
                nombre: 'Ventas', 
                subareas: [
                    { id: 'ventas_1', nombre: 'Vendedor' },
                    { id: 'ventas_2', nombre: 'Ejecutivo de Ventas' }
                ] 
            },
            { 
                nombre: 'Marketing', 
                subareas: [
                    { id: 'marketing_1', nombre: 'Community Manager' },
                    { id: 'marketing_2', nombre: 'Diseñador' }
                ] 
            },
            { 
                nombre: 'TI', 
                subareas: [
                    { id: 'ti_1', nombre: 'Desarrollo' },
                    { id: 'ti_2', nombre: 'Project Manager' },
                    { id: 'ti_3', nombre: 'Supervisión de operaciones' },
                    { id: 'ti_4', nombre: 'Soporte Técnico' }
                ] 
            },
            { 
                nombre: 'Recursos Humanos', 
                subareas: [
                    { id: 'rrhh_1', nombre: 'Reclutamiento' },
                    { id: 'rrhh_2', nombre: 'Capacitación' }
                ] 
            },
            { 
                nombre: 'Operaciones', 
                subareas: [
                    { id: 'ops_1', nombre: 'Logística' },
                    { id: 'ops_2', nombre: 'Producción' }
                ] 
            },
            { 
                nombre: 'Finanzas', 
                subareas: [
                    { id: 'fin_1', nombre: 'Contabilidad' },
                    { id: 'fin_2', nombre: 'Tesorería' }
                ] 
            }
        ];
        actualizarSelectAreas();
    }

    /**
     * Actualiza el select de áreas
     */
    function actualizarSelectAreas() {
        const areaSelect = document.getElementById('area');
        if (!areaSelect) return;
        
        areaSelect.innerHTML = '<option value="">Seleccione un área...</option>';
        
        areasData.forEach(area => {
            const option = document.createElement('option');
            option.value = area.nombre;
            option.textContent = area.nombre;
            areaSelect.appendChild(option);
        });
    }

    /**
     * Actualiza las subáreas según el área seleccionada
     */
    function actualizarSubareas(areaSeleccionada) {
        const subareaSelect = document.getElementById('subarea');
        
        if (!subareaSelect) return;
        
        // Limpiar select de subáreas
        subareaSelect.innerHTML = '<option value="">Seleccione una subárea...</option>';
        subareaSelect.disabled = false;
        
        const area = areasData.find(a => a.nombre === areaSeleccionada);
        if (area) {
            console.log(`🔍 Subáreas para ${areaSeleccionada}:`, area.subareas);
            
            if (area.subareas && area.subareas.length > 0) {
                // Agregar todas las subáreas
                area.subareas.forEach(subarea => {
                    const option = document.createElement('option');
                    option.value = subarea.id; // Guardamos el ID en el value
                    option.textContent = subarea.nombre; // Mostramos el nombre
                    option.setAttribute('data-nombre', subarea.nombre); // Guardamos el nombre como atributo
                    subareaSelect.appendChild(option);
                });
            } else {
                // No hay subáreas
                subareaSelect.disabled = true;
                const option = document.createElement('option');
                option.value = '';
                option.textContent = 'No hay subáreas disponibles';
                subareaSelect.appendChild(option);
            }
        } else {
            subareaSelect.disabled = true;
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'Seleccione un área válida';
            subareaSelect.appendChild(option);
        }
    }

    /**
     * Carga los datos del colaborador desde Firestore
     */
    async function cargarColaborador() {
        try {
            console.log('📥 Cargando datos del colaborador:', colaboradorId);
            
            const colaboradorDoc = await db.collection('colaboradores').doc(colaboradorId).get();
            
            if (!colaboradorDoc.exists) {
                throw new Error('Colaborador no encontrado');
            }
            
            colaboradorData = colaboradorDoc.data();
            console.log('✅ Datos del colaborador cargados:', colaboradorData);
            
            actualizarFormulario(colaboradorData);
            
        } catch (error) {
            console.error('❌ Error cargando colaborador:', error);
            mostrarError('No se pudo cargar la información del colaborador');
        }
    }

    /**
     * Actualiza el formulario con los datos del colaborador
     */
    function actualizarFormulario(colaborador) {
        console.log('📝 Actualizando formulario con datos:', colaborador);
        
        // Foto de perfil
        const photoPreview = document.getElementById('photoPreview');
        if (colaborador.imagen) {
            photoPreview.innerHTML = '';
            const img = document.createElement('img');
            img.src = colaborador.imagen;
            img.alt = colaborador.NOMBRE || 'Colaborador';
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.borderRadius = '50%';
            img.style.objectFit = 'cover';
            photoPreview.appendChild(img);
            imagenBase64 = colaborador.imagen;
        }

        // Información personal
        document.getElementById('nombre').value = colaborador.NOMBRE || '';
        document.getElementById('fechaNacimiento').value = colaborador['FECHA DE NACIMIENTO'] || '';
        document.getElementById('curp').value = colaborador.CURP || '';
        document.getElementById('rfc').value = colaborador.RFC || '';
        document.getElementById('estadoCivil').value = colaborador['ESTADO CIVIL'] || '';
        document.getElementById('telefonoFijo').value = colaborador['TELÉFONO FIJO'] || '';
        document.getElementById('telefonoMovil').value = colaborador['TELÉFONO MOVIL'] || '';
        document.getElementById('nss').value = colaborador.NSS || '';

        // Información laboral
        document.getElementById('tipo').value = colaborador.tipo || '';
        document.getElementById('rol').value = colaborador.rol || 'colaborador';
        document.getElementById('nit').value = colaborador.NIT || '';

        // Información de contacto (solo lectura)
        document.getElementById('correoPersonal').value = colaborador['CORREO ELECTRONICO PERSONAL'] || colaborador['CORREO ELECTRÓNICO PERSONAL'] || '';
        document.getElementById('correoEmpresarial').value = colaborador['CORREO ELECTRÓNICO EMPRESARIAL'] || '';

        // Configurar área y subárea (esto se ejecuta después de cargar las áreas)
        configurarAreaYSubarea();
    }

    /**
     * Configura el área y subárea en los selects basado en los datos existentes
     */
    function configurarAreaYSubarea() {
        if (!colaboradorData) return;
        
        const areaSelect = document.getElementById('area');
        const subareaSelect = document.getElementById('subarea');
        
        // Obtener los valores guardados
        const areaNombre = colaboradorData['ÁREA'] || ''; // Nombre del área principal
        const subareaId = colaboradorData['SUBÁREA_ID'] || ''; // ID de la subárea
        const subareaNombre = colaboradorData['SUBÁREA_NOMBRE'] || ''; // Nombre de la subárea
        
        console.log('🔍 Configurando área/subárea:', { areaNombre, subareaId, subareaNombre });
        
        if (areaNombre) {
            // Buscar el área por nombre
            const areaEncontrada = areasData.find(a => a.nombre === areaNombre);
            
            if (areaEncontrada) {
                // Seleccionar el área
                areaSelect.value = areaNombre;
                
                // Actualizar subáreas
                actualizarSubareas(areaNombre);
                
                // Esperar a que se actualicen las subáreas y seleccionar la correcta
                setTimeout(() => {
                    if (subareaId) {
                        // Intentar seleccionar por ID
                        const optionExists = Array.from(subareaSelect.options).some(opt => opt.value === subareaId);
                        if (optionExists) {
                            subareaSelect.value = subareaId;
                            console.log('✅ Subárea seleccionada por ID:', subareaId);
                        } else if (subareaNombre) {
                            // Si no se encuentra por ID, buscar por nombre
                            const optionByNombre = Array.from(subareaSelect.options).find(opt => 
                                opt.textContent === subareaNombre || opt.getAttribute('data-nombre') === subareaNombre
                            );
                            if (optionByNombre) {
                                subareaSelect.value = optionByNombre.value;
                                console.log('✅ Subárea seleccionada por nombre:', subareaNombre);
                            }
                        }
                    }
                }, 500);
            }
        }
    }

    /**
     * Valida los datos del formulario - VERSIÓN SIN CAMPOS OBLIGATORIOS
     */
    function validarFormulario(datos) {
        // No se realizan validaciones obligatorias. Esta función siempre retorna true.
        // Puedes guardar campos vacíos sin problema.
        return true;
    }

    /**
     * Actualiza los documentos en Firestore - VERSIÓN CORREGIDA (crea usuario si no existe)
     */
    async function actualizarDocumentosFirestore(datos) {
        try {
            // Obtener área y subárea seleccionadas
            const areaSelect = document.getElementById('area');
            const subareaSelect = document.getElementById('subarea');
            
            const areaNombre = areaSelect?.value || '';
            const subareaId = subareaSelect?.value || '';
            
            // Obtener el nombre de la subárea seleccionada
            const selectedOption = subareaSelect?.selectedOptions[0];
            const subareaNombre = selectedOption?.getAttribute('data-nombre') || 
                                 selectedOption?.textContent || 
                                 '';
            
            const usuarioEditor = currentUser || obtenerUsuarioActual();

            // Preparar datos para actualizar
            const updateData = {
                "NOMBRE": datos.nombre,
                "FECHA DE NACIMIENTO": datos.fechaNacimiento,
                "CURP": datos.curp,
                "RFC": datos.rfc,
                "ESTADO CIVIL": datos.estadoCivil,
                "TELÉFONO FIJO": datos.telefonoFijo,
                "TELÉFONO MOVIL": datos.telefonoMovil,
                "NSS": datos.nss,
                "tipo": datos.tipo,
                "rol": datos.rol,
                "ÁREA": areaNombre,
                "SUBÁREA_ID": subareaId,
                "SUBÁREA_NOMBRE": subareaNombre,
                "actualizadoPor": usuarioEditor.nombre,
                "actualizadoPorEmail": usuarioEditor.email,
                "fechaActualizacion": firebase.firestore.FieldValue.serverTimestamp()
            };

            // Solo agregar la imagen si se cambió
            if (imagenBase64 && imagenBase64 !== colaboradorData?.imagen) {
                updateData.imagen = imagenBase64;
            }

            console.log('📤 Actualizando colaborador con:', updateData);

            // Actualizar en colección 'colaboradores'
            await db.collection('colaboradores').doc(colaboradorId).update(updateData);
            
            // ========== MANEJO CORREGIDO PARA 'usuarios' ==========
            // Verificar si el documento existe en 'usuarios', si no, crearlo
            const userDocRef = db.collection('usuarios').doc(colaboradorId);
            const userDoc = await userDocRef.get();
            
            if (userDoc.exists) {
                // Actualizar si existe
                await userDocRef.update({
                    nombreCompleto: datos.nombre,
                    rol: datos.rol,
                    actualizadoPor: usuarioEditor.nombre,
                    actualizadoPorEmail: usuarioEditor.email,
                    fechaActualizacion: firebase.firestore.FieldValue.serverTimestamp()
                });
                console.log('📝 Usuario actualizado en colección "usuarios"');
            } else {
                // Crear el documento si no existe (con set y merge para no sobrescribir)
                await userDocRef.set({
                    nombreCompleto: datos.nombre,
                    correo: colaboradorData?.['CORREO ELECTRÓNICO EMPRESARIAL'] || '',
                    rol: datos.rol || 'colaborador',
                    uid: colaboradorId,
                    actualizadoPor: usuarioEditor.nombre,
                    actualizadoPorEmail: usuarioEditor.email,
                    fechaActualizacion: firebase.firestore.FieldValue.serverTimestamp(),
                    fechaCreacion: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true });
                console.log('✨ Usuario CREADO en colección "usuarios" (no existía previamente)');
            }
            // =======================================================

            console.log('✅ Colaborador actualizado correctamente');
            return true;
            
        } catch (error) {
            console.error('❌ Error actualizando documentos en Firestore:', error);
            throw new Error('No se pudieron guardar los cambios: ' + error.message);
        }
    }

    // =============================================
    // INICIALIZACIÓN DEL FORMULARIO
    // =============================================
    function inicializar() {
        console.log('🚀 Inicializando editar-colaborador.js');
        
        const form = document.getElementById('editarColaboradorForm');
        if (!form) {
            console.error('❌ No se encontró el formulario');
            return;
        }

        const areaSelect = document.getElementById('area');
        const subareaSelect = document.getElementById('subarea');
        const photoInput = document.getElementById('photoInput');
        const photoUploadBtn = document.getElementById('photoUploadBtn');
        const photoPreview = document.getElementById('photoPreview');
        
        if (!areaSelect || !subareaSelect || !photoInput || !photoUploadBtn || !photoPreview) {
            console.error('❌ Faltan elementos del formulario');
            return;
        }
        
        // Obtener usuario actual
        currentUser = obtenerUsuarioActual();
        
        // Verificar parámetros de URL
        if (!obtenerParametrosURL()) {
            return;
        }
        
        // PRIMERO: Cargar áreas
        cargarAreas().then(() => {
            // SEGUNDO: Cargar datos del colaborador
            cargarColaborador();
        });
        
        // Evento para subir foto
        photoUploadBtn.addEventListener('click', () => {
            photoInput.click();
        });
        
        photoInput.addEventListener('change', async (e) => {
            const archivo = e.target.files[0];
            if (archivo) {
                try {
                    if (!archivo.type.startsWith('image/')) {
                        throw new Error('Por favor selecciona un archivo de imagen');
                    }
                    
                    if (archivo.size > 5 * 1024 * 1024) {
                        throw new Error('La imagen no debe superar los 5MB');
                    }
                    
                    imagenBase64 = await convertirImagenABase64(archivo);
                    
                    photoPreview.innerHTML = '';
                    const img = document.createElement('img');
                    img.src = imagenBase64;
                    img.alt = 'Foto del colaborador';
                    img.style.width = '100%';
                    img.style.height = '100%';
                    img.style.borderRadius = '50%';
                    img.style.objectFit = 'cover';
                    photoPreview.appendChild(img);
                    
                } catch (error) {
                    console.error('Error procesando imagen:', error);
                    mostrarError(error.message);
                    
                    photoInput.value = '';
                    imagenBase64 = '';
                    photoPreview.innerHTML = `
                        <div class="photo-placeholder">
                            <i class="fas fa-user"></i>
                            <small>Sin foto</small>
                        </div>
                    `;
                }
            }
        });
        
        // Actualizar subáreas cuando cambia el área
        areaSelect.addEventListener('change', () => {
            const areaSeleccionada = areaSelect.value;
            actualizarSubareas(areaSeleccionada);
        });
        
        // Envío del formulario
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            try {
                mostrarLoading('Actualizando colaborador...');
                
                const datos = {
                    nombre: document.getElementById('nombre')?.value || '',
                    fechaNacimiento: document.getElementById('fechaNacimiento')?.value || '',
                    curp: (document.getElementById('curp')?.value || '').toUpperCase(),
                    rfc: (document.getElementById('rfc')?.value || '').toUpperCase(),
                    estadoCivil: document.getElementById('estadoCivil')?.value || '',
                    telefonoFijo: document.getElementById('telefonoFijo')?.value || '',
                    telefonoMovil: document.getElementById('telefonoMovil')?.value || '',
                    nss: document.getElementById('nss')?.value || '',
                    tipo: document.getElementById('tipo')?.value || '',
                    rol: document.getElementById('rol')?.value || ''
                };
                
                // Validar (ahora no lanza error por campos vacíos)
                validarFormulario(datos);
                
                await actualizarDocumentosFirestore(datos);
                
                if (typeof Swal !== 'undefined') {
                    Swal.close();
                }
                
                mostrarExito(
                    '¡Cambios guardados!', 
                    'La información del colaborador ha sido actualizada exitosamente.'
                );
                
                setTimeout(() => {
                    window.location.href = '../gestion-colaboradores/gestion-colaboradores.html';
                }, 3000);
                
            } catch (error) {
                console.error('Error actualizando colaborador:', error);
                
                if (typeof Swal !== 'undefined') {
                    Swal.close();
                }
                
                mostrarError(error.message);
            }
        });
        
        console.log('✅ editar-colaborador.js inicializado correctamente');
    }

    // Iniciar cuando el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', inicializar);
    } else {
        inicializar();
    }

})();