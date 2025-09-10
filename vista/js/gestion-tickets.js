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
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// =================================================================================
// 1. MEJORA: Centralización del estado de la aplicación
// =================================================================================
const appState = {
    currentUser: null,
    currentTicketId: null,
    colaboradores: [],
    clientes: [],
    areas: [], // Nuevo: Almacenar las áreas
    tickets: [],
    pagination: {
        currentPage: 1,
        ticketsPerPage: 10,
        lastVisible: null,
        firstVisible: null,
        pages: {}
    },
    unsubscribeTickets: null
};

// Variables de control para el estado del guardado
let isSaving = false;
let submitListenerAttached = false;
let pdfGenerationData = {
    ticketData: null,
    featuredItem: null
};
let featuredItemForPdf = null;
const imageSelectionModal = document.getElementById('imageSelectionModal');

// =================================================================================
// 2. MEJORA: Carga inicial de datos en paralelo
// =================================================================================
async function initialLoad() {
    Swal.fire({ title: 'Cargando datos...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    try {
        await Promise.all([
            loadUserProfile(),
            loadClientes(),
            loadCollaborators(),
            loadAreas()
        ]);
        setupEventListeners();
        loadTicketsPage(1);
    } catch (error) {
        console.error("Error en la carga inicial:", error);
        Swal.fire('Error', 'No se pudieron cargar los datos iniciales.', 'error');
    } finally {
        Swal.close();
    }
}

async function loadUserProfile() {
    const user = auth.currentUser;
    if (!user) {
        window.location.href = '../nav-visitantes/inicio-de-sesion.html';
        return;
    }
    const querySnapshot = await db.collection("colaboradores").where("CORREO ELECTRÓNICO EMPRESARIAL", "==", user.email).get();
    if (querySnapshot.empty) {
        document.getElementById('userName').textContent = 'Usuario no registrado';
        document.getElementById('userArea').textContent = 'Sin área';
        Swal.fire('Perfil incompleto', 'Tu correo no está registrado. Contacta al administrador.', 'warning');
    } else {
        const doc = querySnapshot.docs[0];
        const userData = doc.data();
        appState.currentUser = {
            id: doc.id,
            nombre: userData.NOMBRE,
            area: userData.ÁREA,
            imagen: userData.imagen || '../css/img/Logo-RSI-OFICIAL.png'
        };
        document.getElementById('userAvatar').src = appState.currentUser.imagen;
        document.getElementById('userName').textContent = appState.currentUser.nombre;
        document.getElementById('userArea').textContent = appState.currentUser.area;
        sessionStorage.setItem('currentUser', JSON.stringify(appState.currentUser));
    }
}

async function loadClientes() {
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
}

async function loadCollaborators() {
    const snapshot = await db.collection('colaboradores').get();
    appState.colaboradores = snapshot.docs.map(doc => ({
        id: doc.id,
        nombre: doc.data().NOMBRE,
        area: doc.data().ÁREA
    }));
    $('#colaboradores').select2({
        data: appState.colaboradores.map(col => ({
            id: col.id,
            text: col.nombre
        })),
        placeholder: 'Seleccione colaboradores',
        width: '100%'
    });
    $('#rsiColaboradores').select2({
        data: appState.colaboradores.map(col => ({
            id: col.id,
            text: col.nombre
        })),
        placeholder: 'Seleccione colaboradores',
        width: '100%'
    });
}

// NUEVA FUNCIÓN: Cargar áreas únicas para los select
async function loadAreas() {
    const snapshot = await db.collection('colaboradores').get();
    const areasSet = new Set();
    snapshot.docs.forEach(doc => {
        const area = doc.data().ÁREA;
        if (area) {
            areasSet.add(area);
        }
    });
    appState.areas = Array.from(areasSet).sort();
    
    // Poblar los select de áreas
    const areaSelect = document.getElementById('area');
    const rsiAreaSelect = document.getElementById('rsiArea');
    areaSelect.innerHTML = '<option value="">Seleccione un área</option>';
    rsiAreaSelect.innerHTML = '<option value="">Seleccione un área</option>';

    appState.areas.forEach(area => {
        const option = document.createElement('option');
        option.value = area;
        option.textContent = area;
        areaSelect.appendChild(option);

        const rsiOption = document.createElement('option');
        rsiOption.value = area;
        rsiOption.textContent = area;
        rsiAreaSelect.appendChild(rsiOption);
    });
}

// =================================================================================
// 3. MEJORA: Paginación del lado del servidor (más eficiente y escalable)
// =================================================================================
function loadTicketsPage(pageNumber) {
    if (appState.unsubscribeTickets) {
        appState.unsubscribeTickets();
    }
    const stats = { total: 0, pendiente: 0, en_proceso: 0, finalizado: 0, cancelado: 0 };
    db.collection('ticketsmesa').get().then(snapshot => {
        snapshot.forEach(doc => {
            const ticket = doc.data();
            stats.total++;
            if (stats[ticket.estado] !== undefined) stats[ticket.estado]++;
        });
        updateStats(stats);
    });
    let query = db.collection('ticketsmesa').orderBy('fechaCreacion', 'desc');
    if (pageNumber > 1 && appState.pagination.pages[pageNumber - 1]) {
        query = query.startAfter(appState.pagination.pages[pageNumber - 1]);
    }
    query = query.limit(appState.pagination.ticketsPerPage);
    appState.unsubscribeTickets = query.onSnapshot(snapshot => {
        if (snapshot.empty && pageNumber > 1) return;
        appState.tickets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        appState.pagination.firstVisible = snapshot.docs[0];
        appState.pagination.lastVisible = snapshot.docs[snapshot.docs.length - 1];
        appState.pagination.pages[pageNumber] = appState.pagination.lastVisible;
        appState.pagination.currentPage = pageNumber;
        displayTickets(appState.tickets);
        setupPagination(stats.total);
    }, error => {
        console.error("Error al cargar tickets:", error);
        Swal.fire('Error', 'No se pudieron cargar los tickets.', 'error');
    });
}

function updateStats(stats) {
    document.getElementById('totalTickets').textContent = stats.total;
    document.getElementById('pendingTickets').textContent = stats.pendiente;
    document.getElementById('inProgressTickets').textContent = stats.en_proceso;
    document.getElementById('completedTickets').textContent = stats.finalizado;
    document.getElementById('canceledTickets').textContent = stats.cancelado;
}

function displayTickets(tickets) {
    const tbody = document.getElementById('ticketsTableBody');
    tbody.innerHTML = '';
    if (!tickets || tickets.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center;">No hay tickets para mostrar.</td></tr>`;
        return;
    }
    const rowsHtml = tickets.map(ticket => `
        <tr>
            <td>${ticket.responsable ? ticket.responsable.nombre : 'N/A'}</td>
            <td>${ticket.titulo}</td>
            <td class="status ${ticket.estado}">${ticket.estado}</td>
            <td class="priority ${ticket.prioridad}">${ticket.prioridad}</td>
            <td>${ticket.area || 'N/A'}</td>
            <td>${ticket.fechaCreacion ? new Date(ticket.fechaCreacion.seconds * 1000).toLocaleDateString() : 'N/A'}</td>
            <td>
                <button class="btn-action view-btn" onclick="openTicket('${ticket.id}')"><i class="fas fa-eye"></i> Ver</button>
                <button class="btn-action edit-btn" onclick="editTicket('${ticket.id}')"><i class="fas fa-edit"></i> Editar</button>
                <button class="btn-action delete-btn" onclick="deleteTicket('${ticket.id}')"><i class="fas fa-trash"></i> Eliminar</button>
                <button class="btn-action pdf-btn" onclick="openImageSelectionModal('${ticket.id}')"><i class="fas fa-file-pdf"></i> PDF</button>
            </td>
        </tr>
    `).join('');
    tbody.innerHTML = rowsHtml;
}

function setupPagination(totalTickets) {
    const container = document.querySelector('.pagination-container');
    container.innerHTML = '';
    const totalPages = Math.ceil(totalTickets / appState.pagination.ticketsPerPage);
    const currentPage = appState.pagination.currentPage;
    const createButton = (text, page, enabled) => {
        const button = document.createElement('button');
        button.className = 'pagination-btn';
        if (page) button.onclick = () => loadTicketsPage(page);
        if (!enabled) button.disabled = true;
        if (page === currentPage) button.classList.add('active');
        button.textContent = text;
        container.appendChild(button);
    };

    if (currentPage > 1) {
        createButton('Anterior', currentPage - 1, true);
    } else {
        createButton('Anterior', null, false);
    }
    createButton(currentPage, currentPage, true);
    if (currentPage < totalPages) {
        createButton('Siguiente', currentPage + 1, true);
    } else {
        createButton('Siguiente', null, false);
    }
}

// =================================================================================
// 4. MEJORA: Funcionalidad del modal
// =================================================================================
function openNewTicketModal() {
    const modal = document.getElementById('ticketModal');
    const form = document.getElementById('ticketForm');
    const modalTitle = document.getElementById('modalTitle');
    form.reset();
    document.getElementById('ticketId').value = '';
    document.getElementById('area').value = appState.currentUser.area;
    modalTitle.textContent = 'Nuevo Ticket';
    form.style.display = 'block';
    $('#colaboradores').val(null).trigger('change');
    modal.style.display = 'block';
}

function openRsiTicketModal() {
    const modal = document.getElementById('rsiTicketModal');
    const form = document.getElementById('rsiTicketForm');
    const modalTitle = document.getElementById('rsiModalTitle');
    form.reset();
    document.getElementById('rsiTicketId').value = '';
    document.getElementById('rsiArea').value = appState.currentUser.area;
    modalTitle.textContent = 'Nuevo Ticket para RSI';
    form.style.display = 'block';
    $('#rsiColaboradores').val(null).trigger('change');
    modal.style.display = 'block';
}

function closeModal() {
    document.getElementById('ticketModal').style.display = 'none';
}

function closeRsiModal() {
    document.getElementById('rsiTicketModal').style.display = 'none';
}

// Función para abrir el modal en modo de vista o edición
async function openTicket(ticketId, isEdit = false) {
    Swal.fire({
        title: 'Cargando Ticket...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
    });
    try {
        const doc = await db.collection('ticketsmesa').doc(ticketId).get();
        if (!doc.exists) {
            Swal.fire('Error', 'Ticket no encontrado.', 'error');
            return;
        }
        const ticketData = doc.data();
        appState.currentTicketId = ticketId;
        const modal = document.getElementById('ticketModal');
        const modalTitle = document.getElementById('modalTitle');
        modalTitle.textContent = 'Detalles del Ticket';
        document.getElementById('ticketId').value = ticketId;
        
        // Rellenar los campos del formulario
        document.getElementById('titulo').value = ticketData.titulo || '';
        document.getElementById('direccionFiscal').value = ticketData.direccionFiscal || '';
        document.getElementById('rfc').value = ticketData.rfc || '';
        document.getElementById('atencionA').value = ticketData.atencionA || '';
        document.getElementById('correo').value = ticketData.correo || '';
        document.getElementById('fecha').value = ticketData.fecha || '';
        document.getElementById('ordenServicio').value = ticketData.ordenServicio || '';
        document.getElementById('proyecto').value = ticketData.proyecto || '';
        document.getElementById('servicio').value = ticketData.servicio || '';
        document.getElementById('descripcionActividades').value = ticketData.descripcionActividades || '';
        document.getElementById('estado').value = ticketData.estado || 'pendiente';
        document.getElementById('prioridad').value = ticketData.prioridad || 'baja';
        
        // Cargar el cliente
        if (ticketData.clienteId) {
            document.getElementById('cuenta').value = ticketData.clienteId;
        } else {
            document.getElementById('cuenta').value = '';
        }

        // Cargar colaboradores
        const colaboradorIds = ticketData.colaboradores.map(c => c.id);
        $('#colaboradores').val(colaboradorIds).trigger('change');
        
        // Cargar el área
        document.getElementById('area').value = ticketData.area || '';

        // Cargar sistemas
        const sistemasCheckboxes = document.querySelectorAll('input[name="sistemas"]');
        sistemasCheckboxes.forEach(checkbox => {
            checkbox.checked = ticketData.sistemas && ticketData.sistemas.includes(checkbox.value);
        });

        // Habilitar o deshabilitar campos para vista o edición
        const formControls = document.querySelectorAll('#ticketForm .form-control');
        formControls.forEach(control => control.disabled = !isEdit);
        $('#colaboradores').select2('enable', isEdit);

        if (isEdit) {
            document.getElementById('ticketForm').onsubmit = saveTicket;
            document.querySelector('#ticketModal .modal-footer').style.display = 'block';
        } else {
            document.getElementById('ticketForm').onsubmit = (e) => e.preventDefault();
            document.querySelector('#ticketModal .modal-footer').style.display = 'none';
        }
        
        modal.style.display = 'block';
        Swal.close();
    } catch (error) {
        console.error("Error al abrir ticket:", error);
        Swal.fire('Error', 'No se pudo abrir el ticket. Inténtalo de nuevo.', 'error');
    }
}

function editTicket(ticketId) {
    openTicket(ticketId, true);
}

// =================================================================================
// 5. MEJORA: Lógica de guardado y manejo de formularios
// =================================================================================
async function saveTicket(event) {
    event.preventDefault();
    if (isSaving) return;
    isSaving = true;
    Swal.fire({
        title: 'Guardando Ticket...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
    });

    const ticketId = document.getElementById('ticketId').value;
    const form = document.getElementById('ticketForm');
    const formData = new FormData(form);
    
    // Obtener valores
    const colaboradoresIds = $('#colaboradores').val() || [];
    const colaboradores = colaboradoresIds.map(id => {
        const col = appState.colaboradores.find(c => c.id === id);
        return { id: col.id, nombre: col.nombre };
    });
    const responsable = colaboradores[0] || null;
    const area = document.getElementById('area').value;

    const ticketData = {
        titulo: document.getElementById('titulo').value,
        responsable: responsable,
        colaboradores: colaboradores,
        area: area,
        clienteId: document.getElementById('cuenta').value,
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
        estado: document.getElementById('estado').value,
        prioridad: document.getElementById('prioridad').value,
        fechaActualizacion: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    // Obtener datos del cliente para el PDF
    const cliente = appState.clientes.find(c => c.id === ticketData.clienteId);
    if (cliente) {
        ticketData.nombreCliente = cliente.nombreComercial;
        ticketData.direccionFiscal = cliente.direccion;
        ticketData.rfc = cliente.rfc;
    }

    try {
        if (ticketId) {
            await db.collection('ticketsmesa').doc(ticketId).update(ticketData);
            Swal.fire('¡Actualizado!', 'El ticket ha sido actualizado.', 'success');
        } else {
            ticketData.fechaCreacion = firebase.firestore.FieldValue.serverTimestamp();
            const newTicketRef = await db.collection('ticketsmesa').add(ticketData);
            Swal.fire('¡Guardado!', 'El nuevo ticket ha sido guardado.', 'success');
        }
        closeModal();
    } catch (error) {
        console.error("Error al guardar el ticket:", error);
        Swal.fire('Error', 'No se pudo guardar el ticket. Inténtalo de nuevo.', 'error');
    } finally {
        isSaving = false;
    }
}

async function saveRsiTicket(event) {
    event.preventDefault();
    if (isSaving) return;
    isSaving = true;
    Swal.fire({
        title: 'Guardando Ticket RSI...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
    });

    const ticketId = document.getElementById('rsiTicketId').value;
    const colaboradoresIds = $('#rsiColaboradores').val() || [];
    const colaboradores = colaboradoresIds.map(id => {
        const col = appState.colaboradores.find(c => c.id === id);
        return { id: col.id, nombre: col.nombre, area: col.area };
    });
    const responsable = colaboradores[0] || null;
    const area = document.getElementById('rsiArea').value;

    const rsiTicketData = {
        titulo: document.getElementById('rsiTitulo').value,
        descripcion: document.getElementById('rsiDescripcionActividades').value,
        fecha: document.getElementById('rsiFecha').value,
        fechaFinalizacion: document.getElementById('rsiFechaFinalizacion').value,
        responsable: responsable,
        colaboradores: colaboradores,
        area: area,
        prioridad: document.getElementById('rsiPrioridad').value,
        estado: 'pendiente',
        fechaCreacion: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        if (ticketId) {
            await db.collection('ticketsrsi').doc(ticketId).update(rsiTicketData);
            Swal.fire('¡Actualizado!', 'El ticket RSI ha sido actualizado.', 'success');
        } else {
            await db.collection('ticketsrsi').add(rsiTicketData);
            Swal.fire('¡Guardado!', 'El nuevo ticket RSI ha sido guardado.', 'success');
        }
        closeRsiModal();
    } catch (error) {
        console.error("Error al guardar el ticket RSI:", error);
        Swal.fire('Error', 'No se pudo guardar el ticket RSI. Inténtalo de nuevo.', 'error');
    } finally {
        isSaving = false;
    }
}

function deleteTicket(ticketId) {
    Swal.fire({
        title: '¿Estás seguro?',
        text: "¡No podrás revertir esto!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#6C43E0',
        confirmButtonText: 'Sí, ¡eliminar!',
        cancelButtonText: 'Cancelar'
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                await db.collection('ticketsmesa').doc(ticketId).delete();
                Swal.fire('¡Eliminado!', 'El ticket ha sido eliminado.', 'success');
            } catch (error) {
                console.error("Error al eliminar el ticket:", error);
                Swal.fire('Error', 'No se pudo eliminar el ticket.', 'error');
            }
        }
    });
}

// =================================================================================
// 6. MEJORA: Lógica para la generación de PDF
// =================================================================================
async function openImageSelectionModal(ticketId) {
    Swal.fire({
        title: 'Cargando evidencias...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
    });
    const ticketDoc = await db.collection('ticketsmesa').doc(ticketId).get();
    if (!ticketDoc.exists) {
        Swal.fire('Error', 'Ticket no encontrado para generar el PDF.', 'error');
        return;
    }
    pdfGenerationData.ticketData = { id: ticketDoc.id, ...ticketDoc.data() };
    const imageGrid = document.getElementById('imageSelectionGrid');
    imageGrid.innerHTML = '';
    const images = await fetchTicketImages(ticketId);
    if (images.length === 0) {
        imageGrid.innerHTML = '<p>No hay evidencias existentes para este ticket.</p>';
    }
    images.forEach(img => {
        const imgElement = document.createElement('img');
        imgElement.src = img.url;
        imgElement.dataset.id = img.id;
        imgElement.onclick = () => selectImage(imgElement, img.id, img.url);
        imageGrid.appendChild(imgElement);
    });
    document.getElementById('generatePdfBtn').onclick = generatePdf;
    imageSelectionModal.style.display = 'block';
    Swal.close();
}

function closeImageSelectionModal() {
    imageSelectionModal.style.display = 'none';
    featuredItemForPdf = null;
    const imageElements = document.querySelectorAll('#imageSelectionGrid img');
    imageElements.forEach(img => img.classList.remove('selected'));
    document.getElementById('featuredFileUpload').value = '';
}

function selectImage(imgElement, imageId, imageUrl) {
    const images = document.querySelectorAll('#imageSelectionGrid img');
    images.forEach(img => img.classList.remove('selected'));
    imgElement.classList.add('selected');
    featuredItemForPdf = { type: 'image', url: imageUrl };
}

async function generatePdf() {
    Swal.fire({
        title: 'Generando PDF...',
        text: 'Esto puede tardar unos segundos.',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
    });

    const doc = new jspdf.jsPDF();
    let y = 10;
    const ticketData = pdfGenerationData.ticketData;
    const logoUrl = 'https://firebasestorage.googleapis.com/v0/b/rsienterprise.appspot.com/o/logopdf.png?alt=media&token=e93f5451-b847-49f9-8d77-628d63a8905b';

    // Función para añadir la cabecera y el pie de página en cada página
    function addHeaderAndFooter(pdf) {
        pdf.addImage(logoUrl, 'PNG', 10, 5, 40, 15);
        pdf.setFontSize(10);
        pdf.text("RSI Enterprise", 10, pdf.internal.pageSize.height - 10);
    }

    addHeaderAndFooter(doc);

    doc.setFontSize(18);
    doc.text(ticketData.titulo, 10, y + 20);
    y += 30;

    doc.setFontSize(12);
    y = addTextToPdf(doc, y, 'Información del Cliente', 15);
    doc.autoTable({
        startY: y,
        head: [['Atributo', 'Valor']],
        body: [
            ['Cuenta', ticketData.nombreCliente || 'N/A'],
            ['Dirección Fiscal', ticketData.direccionFiscal || 'N/A'],
            ['RFC', ticketData.rfc || 'N/A'],
            ['Atención a', ticketData.atencionA || 'N/A'],
            ['Correo', ticketData.correo || 'N/A']
        ],
        theme: 'striped',
        styles: {
            font: 'helvetica',
            fontSize: 10,
            textColor: '#000000',
            fillColor: [240, 240, 240],
            halign: 'left',
            valign: 'middle'
        },
        columnStyles: {
            0: { fontStyle: 'bold', fillColor: [200, 200, 200] },
            1: { fillColor: [240, 240, 240] }
        },
        margin: { top: 20 }
    });
    y = doc.autoTable.previous.finalY + 10;

    y = addTextToPdf(doc, y, 'Información del Servicio', 15);
    doc.autoTable({
        startY: y,
        head: [['Atributo', 'Valor']],
        body: [
            ['Fecha', ticketData.fecha || 'N/A'],
            ['Orden de Servicio', ticketData.ordenServicio || 'N/A'],
            ['Proyecto', ticketData.proyecto || 'N/A'],
            ['Servicio', ticketData.servicio || 'N/A'],
            ['Sistemas', ticketData.sistemas ? ticketData.sistemas.join(', ') : 'N/A']
        ],
        theme: 'striped',
        styles: { fontSize: 10 },
        columnStyles: { 0: { fontStyle: 'bold' } }
    });
    y = doc.autoTable.previous.finalY + 10;

    y = addTextToPdf(doc, y, 'Descripción de Actividades', 15);
    y = addTextToPdf(doc, y, ticketData.descripcionActividades || 'N/A', 12, { maxWidth: 180 });

    y = addTextToPdf(doc, y, 'Asignación y Prioridad', 15);
    doc.autoTable({
        startY: y,
        head: [['Atributo', 'Valor']],
        body: [
            ['Responsable', ticketData.responsable ? ticketData.responsable.nombre : 'N/A'],
            ['Colaboradores', ticketData.colaboradores ? ticketData.colaboradores.map(c => c.nombre).join(', ') : 'N/A'],
            ['Área', ticketData.area || 'N/A'],
            ['Estado', ticketData.estado || 'N/A'],
            ['Prioridad', ticketData.prioridad || 'N/A']
        ],
        theme: 'striped',
        styles: { fontSize: 10 },
        columnStyles: { 0: { fontStyle: 'bold' } }
    });
    y = doc.autoTable.previous.finalY + 10;

    // Lógica para añadir imágenes o PDF
    const featuredFileUpload = document.getElementById('featuredFileUpload');
    let featuredItem = featuredItemForPdf;

    if (featuredFileUpload.files.length > 0) {
        featuredItem = { type: 'file', file: featuredFileUpload.files[0] };
    }

    if (featuredItem) {
        await addImagesToPdf(doc, y, [featuredItem]);
    }

    doc.save(`Reporte_Ticket_${ticketData.titulo.replace(/ /g, '_')}_${new Date().toLocaleDateString()}.pdf`);
    Swal.fire('¡PDF Generado!', 'El reporte se ha descargado correctamente.', 'success');
    closeImageSelectionModal();
}

// Funciones auxiliares para la generación del PDF
function addTextToPdf(doc, y, text, fontSize, options = {}) {
    doc.setFontSize(fontSize);
    const splitText = doc.splitTextToSize(text, options.maxWidth || 180);
    doc.text(splitText, 10, y);
    return y + (splitText.length * 7); // Mover el cursor para el siguiente elemento
}

async function fetchTicketImages(ticketId) {
    const listRef = storage.ref(`evidencias/${ticketId}`);
    const res = await listRef.listAll();
    const urls = await Promise.all(res.items.map(item => item.getDownloadURL()));
    return urls.map((url, index) => ({ id: `img_${index}`, url: url }));
}

async function addImagesToPdf(doc, startY, items) {
    for (const item of items) {
        if (item.type === 'file' && item.file.type === 'application/pdf') {
            const bytes = await item.file.arrayBuffer();
            const pdfDoc = await PDFLib.PDFDocument.load(bytes);
            const copiedPages = await doc.addPage(pdfDoc.getPages());
            doc.addPage();
            continue;
        }

        const url = item.type === 'file' ? URL.createObjectURL(item.file) : item.url;
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        await new Promise(resolve => {
            img.onload = () => resolve();
            img.src = url;
        });

        doc.addPage();
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const imgWidth = img.width;
        const imgHeight = img.height;
        const ratio = Math.min((pageWidth - 20) / imgWidth, (pageHeight - 20) / imgHeight);
        const newWidth = imgWidth * ratio;
        const newHeight = imgHeight * ratio;
        const x = (pageWidth - newWidth) / 2;
        const y = (pageHeight - newHeight) / 2;

        doc.addImage(img, x, y, newWidth, newHeight);
        if (item.type === 'file') URL.revokeObjectURL(url);
    }
}

// =================================================================================
// 7. MEJORA: Event Listeners y Carga inicial
// =================================================================================
function setupEventListeners() {
    document.getElementById('burgerMenu').addEventListener('click', () => {
        document.querySelector('.sidebar').classList.toggle('open');
        document.getElementById('sidebarOverlay').classList.toggle('active');
    });

    document.getElementById('sidebarOverlay').addEventListener('click', () => {
        document.querySelector('.sidebar').classList.remove('open');
        document.getElementById('sidebarOverlay').classList.remove('active');
    });

    document.getElementById('logoutBtn').addEventListener('click', () => {
        auth.signOut().then(() => {
            window.location.href = '../nav-visitantes/inicio-de-sesion.html';
        }).catch((error) => {
            console.error("Error al cerrar sesión:", error);
            Swal.fire('Error', 'No se pudo cerrar la sesión.', 'error');
        });
    });
}

auth.onAuthStateChanged((user) => {
    if (user) {
        initialLoad();
    } else {
        window.location.href = '../nav-visitantes/inicio-de-sesion.html';
    }
});