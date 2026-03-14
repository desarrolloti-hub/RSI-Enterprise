// Navegador-colaboradores.js - Con selección de sub-elementos
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
    let areasData = [];
    let configuracionesNavegacion = [];
    let currentUser = null;

    // =============================================
    // FUNCIONES DE UTILIDAD
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
            console.log('⏳', mensaje);
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

    function obtenerUsuarioActual() {
        if (typeof window.menuState !== 'undefined' && window.menuState.userData) {
            const userData = window.menuState.userData;
            if (userData.nombre && userData.nombre !== 'Cargando...') {
                return {
                    nombre: userData.nombre,
                    email: userData.correoEmpresarial || userData.email,
                    id: userData.id,
                    area: userData.area,
                    colaboradorId: userData.colaboradorId
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
     * CARGA LAS ÁREAS DESDE FIRESTORE
     */
    async function cargarAreas() {
        try {
            console.log('📥 Cargando áreas desde Firebase...');
            const snapshot = await db.collection('areasRSI').orderBy('nombre').get();
            areasData = [];
            
            snapshot.forEach(doc => {
                const data = doc.data();
                
                // Procesar subáreas como objeto/mapa
                let subareasProcesadas = [];
                
                if (data.subareas) {
                    if (typeof data.subareas === 'object' && !Array.isArray(data.subareas)) {
                        Object.keys(data.subareas).forEach(key => {
                            const subareaItem = data.subareas[key];
                            if (subareaItem && typeof subareaItem === 'object') {
                                subareasProcesadas.push({
                                    id: subareaItem.id || key,
                                    nombre: subareaItem.nombre || 'Sin nombre'
                                });
                            }
                        });
                    }
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
                
                subareasProcesadas.sort((a, b) => a.nombre.localeCompare(b.nombre));
                
                areasData.push({
                    id: doc.id,
                    nombre: data.nombre,
                    subareas: subareasProcesadas
                });
            });
            
            console.log('✅ Áreas cargadas:', areasData.length);
            
        } catch (error) {
            console.error('❌ Error al cargar áreas:', error);
            cargarAreasPorDefecto();
        }
    }

    function cargarAreasPorDefecto() {
        areasData = [
            { 
                id: 'admin_area',
                nombre: 'Administración', 
                subareas: [
                    { id: 'admin_1', nombre: 'Administrativo' },
                    { id: 'admin_2', nombre: 'Auxiliar' }
                ] 
            },
            { 
                id: 'ventas_area',
                nombre: 'Ventas', 
                subareas: [
                    { id: 'ventas_1', nombre: 'Vendedor' },
                    { id: 'ventas_2', nombre: 'Ejecutivo de Ventas' }
                ] 
            },
            { 
                id: 'ti_area',
                nombre: 'TI', 
                subareas: [
                    { id: 'ti_1', nombre: 'Desarrollo' },
                    { id: 'ti_2', nombre: 'Project Manager' },
                    { id: 'ti_3', nombre: 'Supervisión de operaciones' },
                    { id: 'ti_4', nombre: 'Soporte Técnico' }
                ] 
            },
            { 
                id: 'rrhh_area',
                nombre: 'Recursos Humanos', 
                subareas: [
                    { id: 'rrhh_1', nombre: 'Reclutamiento' },
                    { id: 'rrhh_2', nombre: 'Capacitación' }
                ] 
            }
        ];
        console.log('📋 Usando áreas por defecto');
    }

    /**
     * CARGA LAS CONFIGURACIONES DESDE FIRESTORE
     */
    async function cargarConfiguracionesNavegacion() {
        try {
            console.log('📥 Cargando configuraciones de navegación...');
            const snapshot = await db.collection('Navegación-personalizada').get();
            configuracionesNavegacion = [];
            
            snapshot.forEach(doc => {
                const data = doc.data();
                configuracionesNavegacion.push({
                    id: doc.id,
                    areaNombre: data.areaNombre,
                    areaId: data.areaId,
                    subareaId: data.subareaId,
                    subareaNombre: data.subareaNombre,
                    seccionesVisibles: data.seccionesVisibles || [],
                    elementosVisibles: data.elementosVisibles || {} // NUEVO: objetos visibles por sección
                });
            });
            
            console.log('✅ Configuraciones cargadas:', configuracionesNavegacion.length);
            
        } catch (error) {
            console.error('❌ Error al cargar configuraciones:', error);
        }
    }

    /**
     * CREA LA INTERFAZ DE ADMINISTRACIÓN
     */
    function crearInterfazAdministracion() {
        console.log('🎨 Creando interfaz de administración...');
        
        const container = document.getElementById('navegacionPersonalizadaContainer');
        if (!container) {
            console.error('❌ No se encontró el contenedor');
            return;
        }

        // Limpiar el spinner
        container.innerHTML = '';

        // Crear la interfaz
        const html = `
            <div class="navegacion-personalizada-container">
                <div class="navegacion-personalizada-header">
                    <h2><i class="fas fa-compass"></i> Personalización de Navegación</h2>
                    <p>Configure qué secciones y sub-elementos del menú serán visibles para cada área y subárea</p>
                </div>

                <div class="navegacion-personalizada-selector">
                    <div class="selector-grupo">
                        <label for="selectorArea">
                            <i class="fas fa-building"></i> Seleccionar Área:
                        </label>
                        <select id="selectorArea" class="form-control selector-area">
                            <option value="">-- Seleccione un área --</option>
                        </select>
                    </div>

                    <div class="selector-grupo">
                        <label for="selectorSubarea">
                            <i class="fas fa-sitemap"></i> Seleccionar Subárea:
                        </label>
                        <select id="selectorSubarea" class="form-control selector-subarea" disabled>
                            <option value="">-- Primero seleccione un área --</option>
                        </select>
                    </div>
                </div>

                <div class="navegacion-personalizada-secciones" id="seccionesContainer" style="display: none;">
                    <h3><i class="fas fa-eye"></i> Configurar visibilidad:</h3>
                    <div class="secciones-lista" id="seccionesLista"></div>
                </div>

                <div class="navegacion-personalizada-actions" id="actionsContainer" style="display: none;">
                    <button class="btn-submit" id="guardarConfiguracionBtn">
                        <i class="fas fa-save"></i> Guardar Configuración
                    </button>
                    <button class="btn-cancel" id="cancelarConfiguracionBtn">
                        <i class="fas fa-times"></i> Cancelar
                    </button>
                </div>
            </div>
        `;

        container.innerHTML = html;

        // Agregar estilos
        agregarEstilos();

        // Cargar áreas en el selector
        cargarSelectorAreas();

        // Configurar eventos
        configurarEventos();
    }

    /**
     * ESTILOS DE LA INTERFAZ
     */
    function agregarEstilos() {
        const styleId = 'navegacion-personalizada-estilos';
        if (document.getElementById(styleId)) return;

        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            .navegacion-personalizada-container {
                padding: 30px;
                max-width: 1000px;
                margin: 20px auto;
                background: var(--card-bg, #ffffff);
                border-radius: 20px;
                box-shadow: var(--card-shadow, 0 8px 24px rgba(0,0,0,0.12));
                font-family: 'Inter', sans-serif;
            }

            .navegacion-personalizada-header {
                margin-bottom: 30px;
                text-align: center;
                padding-bottom: 20px;
                border-bottom: 2px solid var(--primary-color, #6C43E0);
            }

            .navegacion-personalizada-header h2 {
                color: var(--primary-color, #6C43E0);
                margin-bottom: 10px;
                font-size: 2rem;
            }

            .navegacion-personalizada-header p {
                color: var(--text-color, #666);
                font-size: 1rem;
            }

            .navegacion-personalizada-selector {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 20px;
                margin-bottom: 30px;
                background: rgba(108, 67, 224, 0.05);
                padding: 20px;
                border-radius: 15px;
            }

            .selector-grupo {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }

            .selector-grupo label {
                font-weight: 600;
                color: var(--primary-color, #6C43E0);
                font-size: 0.95rem;
            }

            .selector-grupo label i {
                margin-right: 8px;
            }

            .selector-area, .selector-subarea {
                padding: 12px 15px;
                border: 2px solid rgba(108, 67, 224, 0.2);
                border-radius: 10px;
                font-size: 1rem;
                background: var(--card-bg, #ffffff);
                color: var(--text-color, #333);
                cursor: pointer;
                transition: all 0.3s ease;
            }

            .selector-area:hover, .selector-subarea:hover {
                border-color: var(--primary-color, #6C43E0);
            }

            .selector-area:focus, .selector-subarea:focus {
                outline: none;
                border-color: var(--primary-color, #6C43E0);
                box-shadow: 0 0 0 3px rgba(108, 67, 224, 0.1);
            }

            .selector-subarea:disabled {
                background: #f5f5f5;
                cursor: not-allowed;
                opacity: 0.7;
            }

            .navegacion-personalizada-secciones {
                margin-bottom: 30px;
                background: rgba(108, 67, 224, 0.02);
                padding: 20px;
                border-radius: 15px;
                border: 1px solid rgba(108, 67, 224, 0.1);
            }

            .navegacion-personalizada-secciones h3 {
                color: var(--primary-color, #6C43E0);
                margin-bottom: 20px;
                font-size: 1.3rem;
                padding-bottom: 10px;
                border-bottom: 1px solid rgba(108, 67, 224, 0.2);
            }

            .secciones-lista {
                display: flex;
                flex-direction: column;
                gap: 20px;
                max-height: 500px;
                overflow-y: auto;
                padding: 10px;
            }

            .seccion-card {
                background: var(--card-bg, #ffffff);
                border: 2px solid rgba(108, 67, 224, 0.2);
                border-radius: 15px;
                padding: 15px;
                transition: all 0.3s ease;
            }

            .seccion-card:hover {
                border-color: var(--primary-color, #6C43E0);
                box-shadow: 0 4px 12px rgba(108, 67, 224, 0.1);
            }

            .seccion-header {
                display: flex;
                align-items: center;
                padding: 10px;
                background: rgba(108, 67, 224, 0.05);
                border-radius: 10px;
                margin-bottom: 15px;
            }

            .seccion-header input[type="checkbox"] {
                margin-right: 15px;
                width: 20px;
                height: 20px;
                cursor: pointer;
                accent-color: var(--primary-color, #6C43E0);
            }

            .seccion-header label {
                font-weight: 700;
                font-size: 1.2rem;
                color: var(--primary-color, #6C43E0);
                cursor: pointer;
                flex: 1;
            }

            .seccion-header i {
                margin-right: 10px;
                font-size: 1.3rem;
            }

            .sub-elementos {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
                gap: 10px;
                margin-top: 10px;
                padding-left: 35px;
            }

            .sub-elemento {
                display: flex;
                align-items: center;
                padding: 10px;
                background: rgba(108, 67, 224, 0.02);
                border-radius: 8px;
                transition: all 0.2s ease;
            }

            .sub-elemento:hover {
                background: rgba(108, 67, 224, 0.08);
            }

            .sub-elemento input[type="checkbox"] {
                margin-right: 10px;
                width: 16px;
                height: 16px;
                cursor: pointer;
                accent-color: var(--primary-color, #6C43E0);
            }

            .sub-elemento label {
                cursor: pointer;
                font-size: 0.95rem;
                color: var(--text-color, #333);
                flex: 1;
            }

            .sub-elemento i {
                margin-right: 8px;
                color: var(--primary-color, #6C43E0);
                font-size: 0.9rem;
            }

            .navegacion-personalizada-actions {
                display: flex;
                justify-content: center;
                gap: 15px;
                margin-top: 20px;
            }

            .btn-submit, .btn-cancel {
                padding: 12px 30px;
                border: none;
                border-radius: 10px;
                cursor: pointer;
                font-weight: 600;
                font-size: 1rem;
                display: flex;
                align-items: center;
                gap: 8px;
                transition: all 0.3s ease;
            }

            .btn-submit {
                background: var(--primary-color, #6C43E0);
                color: white;
            }

            .btn-submit:hover {
                background: var(--secondary-color, #5a35c7);
                transform: translateY(-2px);
            }

            .btn-cancel {
                background: #e74c3c;
                color: white;
            }

            .btn-cancel:hover {
                background: #c0392b;
                transform: translateY(-2px);
            }

            .badge {
                display: inline-block;
                padding: 3px 8px;
                border-radius: 12px;
                font-size: 0.75rem;
                font-weight: 600;
                margin-left: 10px;
            }

            .badge-primary {
                background: var(--primary-color, #6C43E0);
                color: white;
            }

            @media (max-width: 768px) {
                .navegacion-personalizada-selector {
                    grid-template-columns: 1fr;
                }
                
                .navegacion-personalizada-actions {
                    flex-direction: column;
                }
                
                .sub-elementos {
                    grid-template-columns: 1fr;
                }
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * CARGA LAS ÁREAS EN EL SELECTOR
     */
    function cargarSelectorAreas() {
        const selectorArea = document.getElementById('selectorArea');
        if (!selectorArea) return;

        selectorArea.innerHTML = '<option value="">-- Seleccione un área --</option>';
        
        areasData.forEach(area => {
            const option = document.createElement('option');
            option.value = area.nombre;
            option.textContent = area.nombre;
            option.setAttribute('data-area-id', area.id);
            selectorArea.appendChild(option);
        });
    }

    /**
     * CONFIGURA LOS EVENTOS DE LA INTERFAZ
     */
    function configurarEventos() {
        const selectorArea = document.getElementById('selectorArea');
        const selectorSubarea = document.getElementById('selectorSubarea');
        const seccionesContainer = document.getElementById('seccionesContainer');
        const actionsContainer = document.getElementById('actionsContainer');
        const guardarBtn = document.getElementById('guardarConfiguracionBtn');
        const cancelarBtn = document.getElementById('cancelarConfiguracionBtn');

        if (!selectorArea || !selectorSubarea) return;

        selectorArea.addEventListener('change', () => {
            const areaNombre = selectorArea.value;
            
            if (areaNombre) {
                cargarSubareasPorArea(areaNombre);
                selectorSubarea.disabled = false;
            } else {
                selectorSubarea.innerHTML = '<option value="">-- Primero seleccione un área --</option>';
                selectorSubarea.disabled = true;
                if (seccionesContainer) seccionesContainer.style.display = 'none';
                if (actionsContainer) actionsContainer.style.display = 'none';
            }
        });

        selectorSubarea.addEventListener('change', () => {
            cargarSeccionesConfiguracion();
            if (seccionesContainer) seccionesContainer.style.display = 'block';
            if (actionsContainer) actionsContainer.style.display = 'flex';
        });

        if (guardarBtn) {
            guardarBtn.addEventListener('click', guardarConfiguracion);
        }

        if (cancelarBtn) {
            cancelarBtn.addEventListener('click', () => {
                if (confirm('¿Está seguro de cancelar?')) {
                    selectorArea.value = '';
                    selectorSubarea.innerHTML = '<option value="">-- Primero seleccione un área --</option>';
                    selectorSubarea.disabled = true;
                    if (seccionesContainer) seccionesContainer.style.display = 'none';
                    if (actionsContainer) actionsContainer.style.display = 'none';
                }
            });
        }
    }

    /**
     * CARGA LAS SUBÁREAS DE UN ÁREA
     */
    function cargarSubareasPorArea(areaNombre) {
        const selectorSubarea = document.getElementById('selectorSubarea');
        if (!selectorSubarea) return;

        const area = areasData.find(a => a.nombre === areaNombre);
        
        if (area && area.subareas.length > 0) {
            selectorSubarea.innerHTML = '<option value="">-- Seleccione una subárea --</option>';
            area.subareas.forEach(subarea => {
                const option = document.createElement('option');
                option.value = subarea.id;
                option.textContent = subarea.nombre;
                selectorSubarea.appendChild(option);
            });
        } else {
            selectorSubarea.innerHTML = '<option value="">-- No hay subáreas disponibles --</option>';
        }
    }

    /**
     * OBTIENE LA ESTRUCTURA COMPLETA DEL MENÚ
     */
    function obtenerEstructuraMenu() {
        return [
            {
                id: 'Tickets',
                nombre: 'Tickets',
                icono: 'fa-ticket-alt',
                elementos: [
                    { id: 'gestionar-tickets-admin', nombre: 'Gestionar tickets', icono: 'fa-list-alt', ruta: '/vista/nav-mesa-admin/Tickets/gestion-tickets-admin/gestion-tickets-admin.html' },
                    { id: 'ver-mis-tickets', nombre: 'Ver mis tickets', icono: 'fa-ticket-alt', ruta: '/vista/nav-mesa-admin/Tickets/gestion-tickets/gestion-tickets.html' },
                    { id: 'ver-estadisticas', nombre: 'Ver estadísticas', icono: 'fa-chart-bar', ruta: '/vista/nav-mesa-admin/Tickets/graficas-tickets/graficas-tickets.html' }
                ]
            },
            {
                id: 'Administrativo',
                nombre: 'Administrativo',
                icono: 'fa-cogs',
                elementos: [
                    { id: 'gestion-areas', nombre: 'Áreas', icono: 'fa-map-marked-alt', ruta: '/vista/nav-mesa-admin/e-comerce/gestion-areas/gestion-areas.html' },
                    { id: 'notas', nombre: 'Notas', icono: 'fa-sticky-note', ruta: '/vista/nav-mesa-admin/notas/notas.html' },
                    { id: 'asistencias', nombre: 'Ver asistencias', icono: 'fa-calendar-check', ruta: '/vista/nav-mesa-admin/asistencias-rsi/asistencias-rsi.html' },
                    { id: 'reembolsos', nombre: 'Gestión de reembolsos', icono: 'fa-money-bill-wave', ruta: '/vista/nav-mesa-admin/Rembolsos/rembolso.html' },
                    { id: 'manuales', nombre: 'Ver manuales', icono: 'fa-file-alt', ruta: '/vista/nav-mesa-admin/manuales/manuales.html' },
                    { id: 'colaboradores', nombre: 'Colaboradores', icono: 'fa-users-cog', ruta: '/vista/nav-mesa-admin/gestion-colaboradores/gestion-colaboradores.html' },
                    { id: 'checklist', nombre: 'Checklist automoviles', icono: 'fa-car', ruta: '/vista/nav-mesa-admin/checklist-automoviles/checklist-automoviles.html' },
                    { id: 'multas', nombre: 'Multas e imprevistos', icono: 'fa-file-alt', ruta: '/vista/nav-mesa-admin/multas/multas.html' }
                ]
            },
            {
                id: 'Finanzas',
                nombre: 'Finanzas',
                icono: 'fa-chart-line',
                elementos: [
                    { id: 'cotizar', nombre: 'Cotizar', icono: 'fa-file-invoice-dollar', ruta: '/vista/nav-mesa-admin/consultar-cotizaciones/consultar-cotizaciones.html' },
                    { id: 'clientes', nombre: 'Clientes', icono: 'fa-users', ruta: '/vista/nav-mesa-admin/clientes/clientes.html' }
                ]
            },
            {
                id: 'Ecommerce',
                nombre: 'Ecommerce',
                icono: 'fa-shopping-cart',
                elementos: [
                    { id: 'carrusel', nombre: 'Carrusel', icono: 'fa-images', ruta: '/vista/nav-mesa-admin/e-comerce/carrusel/carrusel.html' },
                    { id: 'categorias', nombre: 'Categorías', icono: 'fa-th-list', ruta: '/vista/nav-mesa-admin/e-comerce/categorias/categorias.html' },
                    { id: 'contactos', nombre: 'Contactos', icono: 'fa-address-book', ruta: '/vista/nav-mesa-admin/e-comerce/contactos/contactos.html' },
                    { id: 'entregas', nombre: 'Entregas', icono: 'fa-truck-loading', ruta: '/vista/nav-mesa-admin/e-comerce/panel-entregas/panel-entregas.html' },
                    { id: 'opiniones', nombre: 'Opiniones', icono: 'fa-star', ruta: '/vista/nav-mesa-admin/e-comerce/opiniones/opiniones.html' },
                    { id: 'pedidos-finalizados', nombre: 'Pedidos Finalizados', icono: 'fa-check-double', ruta: '/vista/nav-mesa-admin/e-comerce/pedidos-finalizados/pedidos-finalizados.html' },
                    { id: 'productos', nombre: 'Productos', icono: 'fa-boxes', ruta: '/vista/nav-mesa-admin/e-comerce/productos/productos.html' },
                    { id: 'usuarios', nombre: 'Usuarios', icono: 'fa-users-cog', ruta: '/vista/nav-mesa-admin/e-comerce/gestion-usuarios/gestion-usuarios.html' },
                    { id: 'ventas', nombre: 'Ventas', icono: 'fa-chart-line', ruta: '/vista/nav-mesa-admin/e-comerce/panel-ventas/panel-ventas.html' }
                ]
            },
            {
                id: 'Configuración',
                nombre: 'Configuración',
                icono: 'fa-sliders-h',
                elementos: [
                    { id: 'personalizar-interfaz', nombre: 'Personalizar interfaz', icono: 'fa-palette', ruta: '/vista/nav-mesa-admin/personalizar-interfaz/personalizar-interfaz.html' },
                    { id: 'permisos', nombre: 'Permisos', icono: 'fa-shield-alt', ruta: '/vista/nav-mesa-admin/permisos/permisos.html' },
                    { id: 'terminar-asistencia', nombre: 'Terminar asistencia', icono: 'fa-flag-checkered', ruta: '/vista/nav-mesa-admin/fin-asistencia/fin-asistencia.html' },
                    { id: 'cerrar-sesion', nombre: 'Cerrar sesión', icono: 'fa-sign-out-alt', ruta: '#' }
                ]
            }
        ];
    }

    /**
     * CARGA LAS SECCIONES EN LA CONFIGURACIÓN
     */
    function cargarSeccionesConfiguracion() {
        const seccionesLista = document.getElementById('seccionesLista');
        if (!seccionesLista) return;

        const areaNombre = document.getElementById('selectorArea')?.value;
        const subareaId = document.getElementById('selectorSubarea')?.value;
        const subareaNombre = document.getElementById('selectorSubarea')?.selectedOptions[0]?.textContent;

        if (!areaNombre || !subareaId) return;

        // Buscar configuración existente
        const configExistente = configuracionesNavegacion.find(c => 
            c.areaNombre === areaNombre && c.subareaId === subareaId
        );

        const seccionesVisibles = configExistente?.seccionesVisibles || [];
        const elementosVisibles = configExistente?.elementosVisibles || {};

        const estructuraMenu = obtenerEstructuraMenu();

        let html = `<p style="margin-bottom: 20px; color: var(--text-color);">
            <i class="fas fa-info-circle"></i> 
            Configurando para: <strong>${areaNombre} - ${subareaNombre}</strong>
        </p>`;

        estructuraMenu.forEach(seccion => {
            const seccionChecked = seccionesVisibles.includes(seccion.id) ? 'checked' : '';
            const elementosSeccion = elementosVisibles[seccion.id] || [];
            
            html += `
                <div class="seccion-card">
                    <div class="seccion-header">
                        <input type="checkbox" 
                               id="seccion_${seccion.id}" 
                               value="${seccion.id}" 
                               class="seccion-checkbox-principal"
                               data-seccion="${seccion.id}"
                               ${seccionChecked}>
                        <label for="seccion_${seccion.id}">
                            <i class="fas ${seccion.icono}"></i> ${seccion.nombre}
                            <span class="badge badge-primary">${seccion.elementos.length} elementos</span>
                        </label>
                    </div>
                    
                    <div class="sub-elementos" id="elementos_${seccion.id}">
            `;
            
            seccion.elementos.forEach(elemento => {
                const elementoChecked = elementosSeccion.includes(elemento.id) ? 'checked' : '';
                html += `
                    <div class="sub-elemento">
                        <input type="checkbox" 
                               id="elemento_${elemento.id}" 
                               value="${elemento.id}"
                               class="elemento-checkbox"
                               data-seccion="${seccion.id}"
                               data-elemento="${elemento.id}"
                               ${elementoChecked}
                               ${!seccionChecked ? 'disabled' : ''}>
                        <label for="elemento_${elemento.id}">
                            <i class="fas ${elemento.icono}"></i> ${elemento.nombre}
                        </label>
                    </div>
                `;
            });
            
            html += `
                    </div>
                </div>
            `;
        });

        seccionesLista.innerHTML = html;

        // Agregar eventos para checkboxes principales
        document.querySelectorAll('.seccion-checkbox-principal').forEach(checkbox => {
            checkbox.addEventListener('change', function() {
                const seccionId = this.dataset.seccion;
                const elementos = document.querySelectorAll(`.elemento-checkbox[data-seccion="${seccionId}"]`);
                
                elementos.forEach(el => {
                    el.disabled = !this.checked;
                    if (!this.checked) {
                        el.checked = false;
                    }
                });
            });
        });
    }

    /**
     * GUARDA LA CONFIGURACIÓN EN FIRESTORE
     */
    async function guardarConfiguracion() {
        const selectorArea = document.getElementById('selectorArea');
        const selectorSubarea = document.getElementById('selectorSubarea');
        
        const areaNombre = selectorArea?.value;
        const subareaId = selectorSubarea?.value;
        const subareaNombre = selectorSubarea?.selectedOptions[0]?.textContent;
        const areaId = selectorArea?.selectedOptions[0]?.getAttribute('data-area-id');

        if (!areaNombre || !subareaId || !areaId || !subareaNombre) {
            mostrarError('Debe seleccionar un área y una subárea');
            return;
        }

        // Obtener secciones seleccionadas
        const seccionesCheckboxes = document.querySelectorAll('.seccion-checkbox-principal:checked');
        const seccionesVisibles = Array.from(seccionesCheckboxes).map(cb => cb.value);

        // Obtener elementos seleccionados por sección
        const elementosVisibles = {};
        
        seccionesVisibles.forEach(seccionId => {
            const elementosCheckboxes = document.querySelectorAll(`.elemento-checkbox[data-seccion="${seccionId}"]:checked`);
            elementosVisibles[seccionId] = Array.from(elementosCheckboxes).map(cb => cb.value);
        });

        try {
            mostrarLoading('Guardando configuración...');
            
            const usuarioEditor = obtenerUsuarioActual();

            // Buscar si ya existe una configuración
            const configExistente = configuracionesNavegacion.find(c => 
                c.areaNombre === areaNombre && c.subareaId === subareaId
            );

            const datosConfig = {
                areaNombre: areaNombre,
                areaId: areaId,
                subareaId: subareaId,
                subareaNombre: subareaNombre,
                seccionesVisibles: seccionesVisibles,
                elementosVisibles: elementosVisibles,
                fechaActualizacion: firebase.firestore.FieldValue.serverTimestamp(),
                actualizadoPor: usuarioEditor.nombre,
                actualizadoPorEmail: usuarioEditor.email
            };

            if (configExistente) {
                await db.collection('Navegación-personalizada').doc(configExistente.id).update(datosConfig);
                console.log('✅ Configuración actualizada');
            } else {
                datosConfig.fechaCreacion = firebase.firestore.FieldValue.serverTimestamp();
                datosConfig.creadoPor = usuarioEditor.nombre;
                datosConfig.creadoPorEmail = usuarioEditor.email;
                
                await db.collection('Navegación-personalizada').add(datosConfig);
                console.log('✅ Configuración creada');
            }

            await cargarConfiguracionesNavegacion();

            if (typeof Swal !== 'undefined') Swal.close();
            mostrarExito('¡Configuración guardada!', `Configuración para ${areaNombre} - ${subareaNombre} guardada.`);

        } catch (error) {
            console.error('❌ Error:', error);
            mostrarError('Error al guardar: ' + error.message);
        }
    }

    /**
     * APLICA LA CONFIGURACIÓN AL MENÚ DEL USUARIO ACTUAL
     */
    async function aplicarNavegacionPersonalizada() {
        console.log('🚀 Aplicando navegación personalizada...');

        try {
            const user = auth.currentUser;
            if (!user) {
                console.log('⚠️ No hay usuario autenticado');
                return;
            }

            const colaboradorQuery = await db.collection("colaboradores")
                .where("CORREO ELECTRÓNICO EMPRESARIAL", "==", user.email)
                .get();

            if (colaboradorQuery.empty) {
                console.log('⚠️ Usuario no encontrado en colaboradores');
                return;
            }

            const userData = colaboradorQuery.docs[0].data();
            const areaUsuario = userData.ÁREA || '';
            const subareaIdUsuario = userData.SUBÁREA_ID || '';

            console.log('👤 Usuario:', { area: areaUsuario, subareaId: subareaIdUsuario });

            if (!areaUsuario || !subareaIdUsuario) return;

            const configUsuario = configuracionesNavegacion.find(c => 
                c.areaNombre === areaUsuario && c.subareaId === subareaIdUsuario
            );

            if (!configUsuario) {
                console.log('ℹ️ No hay configuración específica');
                return;
            }

            const seccionesVisibles = configUsuario.seccionesVisibles || [];
            const elementosVisibles = configUsuario.elementosVisibles || {};
            
            console.log('🎨 Aplicando configuración:', { seccionesVisibles, elementosVisibles });

            // Ocultar/Mostrar secciones completas
            const secciones = document.querySelectorAll('.menu-nav-section');
            
            secciones.forEach(seccion => {
                const header = seccion.querySelector('.menu-nav-section-header');
                if (header) {
                    const span = header.querySelector('span');
                    if (span) {
                        const nombreSeccion = span.textContent.trim();
                        const esVisible = seccionesVisibles.includes(nombreSeccion);
                        
                        if (!esVisible) {
                            seccion.style.display = 'none';
                            console.log('👁️ Ocultando sección completa:', nombreSeccion);
                        } else {
                            seccion.style.display = '';
                            console.log('👁️ Mostrando sección:', nombreSeccion);
                            
                            // Aplicar visibilidad de sub-elementos dentro de la sección
                            const elementos = seccion.querySelectorAll('.menu-nav-btn');
                            elementos.forEach(elemento => {
                                const textoElemento = elemento.textContent.trim();
                                const seccionEncontrada = obtenerEstructuraMenu().find(s => s.nombre === nombreSeccion);
                                
                                if (seccionEncontrada) {
                                    const elementoConfig = seccionEncontrada.elementos.find(e => e.nombre === textoElemento);
                                    if (elementoConfig) {
                                        const elementoVisible = elementosVisibles[nombreSeccion]?.includes(elementoConfig.id) || false;
                                        elemento.style.display = elementoVisible ? '' : 'none';
                                        console.log(`  - Elemento ${textoElemento}: ${elementoVisible ? 'visible' : 'oculto'}`);
                                    }
                                }
                            });
                        }
                    }
                }
            });

        } catch (error) {
            console.error('❌ Error al aplicar navegación personalizada:', error);
        }
    }

    // =============================================
    // EXPONER FUNCIONES GLOBALES
    // =============================================

    window.navegacionPersonalizada = {
        administrar: crearInterfazAdministracion,
        aplicar: aplicarNavegacionPersonalizada,
        recargar: async () => {
            await cargarConfiguracionesNavegacion();
            await aplicarNavegacionPersonalizada();
        }
    };

    // =============================================
    // INICIALIZACIÓN
    // =============================================

    async function inicializar() {
        console.log('🚀 Inicializando Navegador-colaboradores.js');
        console.log('✅ Script cargado correctamente');
        
        await cargarAreas();
        await cargarConfiguracionesNavegacion();
        
        if (window.location.pathname.includes('Navegador-colaboradores.html')) {
            console.log('📋 Página de administración detectada');
            setTimeout(() => {
                crearInterfazAdministracion();
            }, 500);
        } else {
            console.log('📋 Aplicando configuración al menú...');
            
            const checkMenuInterval = setInterval(() => {
                if (document.querySelector('.menu-nav-section')) {
                    clearInterval(checkMenuInterval);
                    aplicarNavegacionPersonalizada();
                }
            }, 500);

            setTimeout(() => clearInterval(checkMenuInterval), 10000);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', inicializar);
    } else {
        inicializar();
    }

})();