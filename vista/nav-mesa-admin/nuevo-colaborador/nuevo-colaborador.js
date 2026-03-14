// nuevo-colaborador.js - Versión que guarda IDs completos
(function() {
    'use strict';

    // =============================================
    // CONFIGURACIÓN DE FIREBASE
    // =============================================
    const firebaseConfig = {
        apiKey: "AIzaSyBJy992gkvsT77-_fMp_O_z99wtjZiK77Y",
        authDomain: "rsienterprise.firebaseapp.com",
        projectId: "rsienterprise",
        storageBucket: "rsienterprise.appspot.com",
        messagingSenderId: "1063117165770",
        appId: "1:1063117165770:web:8555f26b25ae80bc42d033"
    };

    // Inicializar Firebase (solo si no está inicializado)
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    
    const db = firebase.firestore();
    const auth = firebase.auth();

    // =============================================
    // VARIABLES GLOBALES
    // =============================================
    let imagenBase64 = '';
    let areasData = []; // Ahora guardará también los IDs de subáreas
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
                timer: 4000,
                showConfirmButton: true
            });
        } 
        else {
            alert(`${titulo}: ${mensaje}`);
        }
    }

    function mostrarError(titulo, mensaje) {
        if (typeof Swal !== 'undefined') {
            Swal.close();
        }
        
        if (typeof window.showCustomError === 'function') {
            window.showCustomError(titulo, mensaje);
        } 
        else if (typeof Swal !== 'undefined') {
            Swal.fire({
                title: titulo || 'Error',
                text: mensaje,
                icon: 'error',
                confirmButtonText: 'OK'
            });
        } 
        else {
            alert(`❌ ${titulo}: ${mensaje}`);
        }
    }

    // =============================================
    // FUNCIONES PRINCIPALES
    // =============================================

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

    function generarSugerenciaContrasena(nombre) {
        if (!nombre) return '';
        
        const partes = nombre.trim().split(' ');
        let iniciales = '';
        
        for (let i = 0; i < Math.min(partes.length, 3); i++) {
            if (partes[i]) {
                iniciales += partes[i].charAt(0).toUpperCase();
            }
        }
        
        const añoActual = new Date().getFullYear();
        return `${iniciales}_${añoActual}`;
    }

    async function generarNIT(subareaId) {
        if (!subareaId) return '';
        
        const ahora = new Date();
        const dia = String(ahora.getDate()).padStart(2, '0');
        const mes = String(ahora.getMonth() + 1).padStart(2, '0');
        const año = String(ahora.getFullYear()).slice(-2);
        const fecha = `${dia}${mes}${año}`;
        
        // Ahora contamos por SUBÁREA_ID en lugar de solo el nombre
        const snapshot = await db.collection('colaboradores')
            .where('SUBÁREA_ID', '==', subareaId)
            .get();
        
        const numeroColaboradores = snapshot.size + 1;
        
        return `RSI${fecha}${String(numeroColaboradores).padStart(3, '0')}`;
    }

    function convertirImagenABase64(archivo) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(archivo);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    }

    /**
     * Carga las áreas desde Firestore
     * Ahora guarda tanto el nombre del área como los IDs y nombres de subáreas
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
                    // Verificar si es un objeto
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
            
        } catch (error) {
            console.error('❌ Error al cargar áreas:', error);
            cargarAreasPorDefecto();
        }
    }

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
     * Ahora muestra los nombres pero guarda los IDs
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
                    // Guardamos el ID en el value, pero mostramos el nombre
                    option.value = subarea.id;
                    option.textContent = subarea.nombre;
                    // Guardamos también el nombre como atributo data
                    option.setAttribute('data-nombre', subarea.nombre);
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
        
        // Limpiar NIT cuando cambia el área
        document.getElementById('nit').value = '';
    }

    function generarNITParaSubarea(subareaId) {
        const nitInput = document.getElementById('nit');
        if (!nitInput) return;
        
        nitInput.value = 'Generando...';
        
        // Llamar a la función asíncrona sin await para no bloquear
        generarNIT(subareaId)
            .then(nit => {
                nitInput.value = nit;
            })
            .catch(error => {
                console.error('Error generando NIT:', error);
                nitInput.value = 'Error al generar';
            });
    }

    function validarFormulario(datos) {
        if (datos.contrasena !== datos.confirmarContrasena) {
            throw new Error('Las contraseñas no coinciden');
        }
        
        if (datos.contrasena.length < 6) {
            throw new Error('La contraseña debe tener al menos 6 caracteres');
        }
        
        if (datos.curp.length !== 18) {
            throw new Error('La CURP debe tener 18 caracteres');
        }
        
        if (datos.rfc.length < 12 || datos.rfc.length > 13) {
            throw new Error('El RFC debe tener entre 12 y 13 caracteres');
        }
        
        if (!datos.nit || datos.nit === 'Generando...' || datos.nit === 'Error al generar') {
            throw new Error('El NIT no se ha generado correctamente. Por favor, seleccione una subárea válida.');
        }
        
        return true;
    }

    async function crearUsuarioAuth(email, password) {
        try {
            const tempApp = firebase.initializeApp(firebaseConfig, "TempApp");
            const tempAuth = tempApp.auth();
            
            const userCredential = await tempAuth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;
            
            await user.sendEmailVerification();
            await tempAuth.signOut();
            await tempApp.delete();
            
            return user;
        } catch (error) {
            console.error('Error creando usuario en Auth:', error);
            
            try {
                const tempApp = firebase.app("TempApp");
                await tempApp.delete();
            } catch (e) {}
            
            throw new Error('No se pudo crear el usuario: ' + error.message);
        }
    }

    async function crearDocumentosFirestore(uid, datos) {
        try {
            // Obtener el área y subárea seleccionadas
            const areaSeleccionada = document.getElementById('area')?.value;
            const subareaSelect = document.getElementById('subarea');
            const subareaId = subareaSelect?.value;
            
            // Obtener el nombre de la subárea seleccionada
            const selectedOption = subareaSelect?.selectedOptions[0];
            const subareaNombre = selectedOption?.getAttribute('data-nombre') || 
                                 selectedOption?.textContent || 
                                 'Subárea desconocida';
            
            if (!areaSeleccionada) {
                throw new Error('Debe seleccionar un área');
            }
            
            if (!subareaId) {
                throw new Error('Debe seleccionar una subárea');
            }
            
            const usuarioCreador = currentUser || obtenerUsuarioActual();

            // Crear documento en colección 'usuarios'
            await db.collection('usuarios').doc(uid).set({
                email: datos.correoPersonal,
                fechaRegistro: firebase.firestore.FieldValue.serverTimestamp(),
                nombreCompleto: datos.nombre,
                rol: datos.rol,
                creadoPor: usuarioCreador.nombre,
                creadoPorEmail: usuarioCreador.email
            });
            
            // Crear documento en colección 'colaboradores'
            // Guardamos: ÁREA (nombre), SUBÁREA_ID (id), SUBÁREA_NOMBRE (nombre)
            await db.collection('colaboradores').doc(uid).set({
                "CORREO ELECTRONICO PERSONAL": datos.correoPersonal,
                "CORREO ELECTRÓNICO EMPRESARIAL": datos.correoEmpresarial,
                "CURP": datos.curp,
                "ESTADO CIVIL": datos.estadoCivil,
                "FECHA DE INGRESO": firebase.firestore.FieldValue.serverTimestamp(),
                "FECHA DE NACIMIENTO": datos.fechaNacimiento,
                "NIT": datos.nit,
                "NOMBRE": datos.nombre,
                "NSS": datos.nss,
                "RFC": datos.rfc,
                "TELÉFONO FIJO": datos.telefonoFijo,
                "TELÉFONO MOVIL": datos.telefonoMovil,
                "estado": true,
                "fecha": firebase.firestore.FieldValue.serverTimestamp(),
                "tipo": datos.tipo,
                "imagen": imagenBase64,
                // Guardamos el área principal (nombre)
                "ÁREA": areaSeleccionada,
                // Guardamos el ID completo de la subárea
                "SUBÁREA_ID": subareaId,
                // Guardamos el nombre de la subárea
                "SUBÁREA_NOMBRE": subareaNombre,
                "creadoPor": usuarioCreador.nombre,
                "creadoPorEmail": usuarioCreador.email
            });
            
            console.log('✅ Colaborador guardado con:', {
                área: areaSeleccionada,
                subárea_id: subareaId,
                subárea_nombre: subareaNombre
            });
            
            return true;
        } catch (error) {
            console.error('Error creando documentos en Firestore:', error);
            throw new Error('No se pudieron guardar los datos: ' + error.message);
        }
    }

    // =============================================
    // INICIALIZACIÓN DEL FORMULARIO
    // =============================================
    function inicializar() {
        console.log('🚀 Inicializando nuevo-colaborador.js');
        
        const form = document.getElementById('nuevoColaboradorForm');
        if (!form) {
            console.error('❌ No se encontró el formulario');
            return;
        }

        const nombreInput = document.getElementById('nombre');
        const areaSelect = document.getElementById('area');
        const subareaSelect = document.getElementById('subarea');
        const nitInput = document.getElementById('nit');
        const passwordSuggestion = document.getElementById('passwordSuggestion');
        const photoInput = document.getElementById('photoInput');
        const photoUploadBtn = document.getElementById('photoUploadBtn');
        const photoPreview = document.getElementById('photoPreview');
        
        if (!nombreInput || !areaSelect || !subareaSelect || !nitInput || 
            !passwordSuggestion || !photoInput || !photoUploadBtn || !photoPreview) {
            console.error('❌ Faltan elementos del formulario');
            return;
        }
        
        currentUser = obtenerUsuarioActual();
        
        // Cargar áreas
        cargarAreas();
        
        nitInput.setAttribute('readonly', 'true');
        
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
                    mostrarError('Error', error.message);
                    
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
        
        nombreInput.addEventListener('input', () => {
            const sugerencia = generarSugerenciaContrasena(nombreInput.value);
            passwordSuggestion.textContent = `Sugerencia: ${sugerencia}`;
            
            const contrasenaInput = document.getElementById('contrasena');
            const confirmarInput = document.getElementById('confirmarContrasena');
            
            if (contrasenaInput && confirmarInput && !contrasenaInput.value && sugerencia) {
                contrasenaInput.value = sugerencia;
                confirmarInput.value = sugerencia;
            }
        });
        
        areaSelect.addEventListener('change', () => {
            actualizarSubareas(areaSelect.value);
        });
        
        subareaSelect.addEventListener('change', () => {
            const subareaId = subareaSelect.value;
            if (subareaId && subareaId !== '') {
                generarNITParaSubarea(subareaId);
            }
        });
        
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            try {
                mostrarLoading('Creando colaborador...');
                
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
                    rol: document.getElementById('rol')?.value || '',
                    nit: document.getElementById('nit')?.value || '',
                    correoPersonal: document.getElementById('correoPersonal')?.value || '',
                    correoEmpresarial: document.getElementById('correoEmpresarial')?.value || '',
                    contrasena: document.getElementById('contrasena')?.value || '',
                    confirmarContrasena: document.getElementById('confirmarContrasena')?.value || ''
                };
                
                validarFormulario(datos);
                
                const user = await crearUsuarioAuth(datos.correoPersonal, datos.contrasena);
                await crearDocumentosFirestore(user.uid, datos);
                
                if (typeof Swal !== 'undefined') {
                    Swal.close();
                }
                
                mostrarExito(
                    '¡Colaborador creado!', 
                    'El colaborador ha sido registrado exitosamente.<br><br>' +
                    '<strong>Se ha enviado un email de verificación al correo personal.</strong>'
                );
                
                setTimeout(() => {
                    window.location.href = '../gestion-colaboradores/gestion-colaboradores.html';
                }, 4000);
                
            } catch (error) {
                console.error('Error creando colaborador:', error);
                
                if (typeof Swal !== 'undefined') {
                    Swal.close();
                }
                
                mostrarError('Error', error.message);
            }
        });
        
        console.log('✅ nuevo-colaborador.js inicializado correctamente');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', inicializar);
    } else {
        inicializar();
    }

})();