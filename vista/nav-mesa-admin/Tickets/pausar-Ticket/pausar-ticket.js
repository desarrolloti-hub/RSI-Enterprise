// pausar-ticket.js - Con bloqueo si ya está pausado y muestra razón existente
(function() {
    const MAX_PAUSE_REASON_LENGTH = 500;
    const MIN_PAUSE_REASON_LENGTH = 10;

    const firebaseConfig = {
        apiKey: "AIzaSyBJy992gkvsT77-_fMp_O_z99wtjZiK77Y",
        authDomain: "rsienterprise.firebaseapp.com",
        projectId: "rsienterprise",
        storageBucket: "rsienterprise.appspot.com",
        messagingSenderId: "1063117165770",
        appId: "1:1063117165770:web:8555f26b25ae80bc42d033"
    };

    if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
    const db = firebase.firestore();
    const auth = firebase.auth();

    let currentTicketId = null;
    let currentUserData = null;
    let currentTicketData = null;   // Guardar datos del ticket

    // UI helpers
    function showLoading(msg) { Swal.fire({ title: msg, allowOutsideClick: false, didOpen: () => Swal.showLoading() }); }
    function hideLoading() { Swal.close(); }
    function showError(msg, title = 'Error') { Swal.fire({ icon: 'error', title, text: msg, confirmButtonColor: '#d33' }); }
    async function showSuccess(msg, title = '¡Éxito!') { await Swal.fire({ icon: 'success', title, text: msg, confirmButtonColor: '#3085d6' }); }

    function getUrlParams() {
        return { ticketId: new URLSearchParams(window.location.search).get('ticketId') };
    }

    async function loadUserData(user) {
        try {
            const q = db.collection('colaboradores').where("CORREO ELECTRÓNICO EMPRESARIAL", "==", user.email);
            const snap = await q.get();
            if (snap.empty) { showError('No se encontraron tus datos de colaborador'); return false; }
            snap.forEach(doc => {
                currentUserData = doc.data();
                currentUserData.colaboradorId = doc.id;
                currentUserData.NOMBRE = doc.data().NOMBRE;
            });
            return true;
        } catch (err) { console.error(err); showError('Error al cargar tus datos.'); return false; }
    }

    async function getColaboradorNames(colaboradorIds) {
        if (!colaboradorIds?.length) return 'Ninguno';
        try {
            const names = await Promise.all(colaboradorIds.map(async id => {
                const doc = await db.collection('colaboradores').doc(id).get();
                return doc.exists ? doc.data().NOMBRE : 'Desconocido';
            }));
            return names.join(', ');
        } catch (err) { console.error(err); return 'Error de carga'; }
    }

    async function loadTicketInfo(ticketId) {
        try {
            showLoading('Cargando ticket...');
            const ticketSnap = await db.collection('ticketsmesa').doc(ticketId).get();
            if (!ticketSnap.exists) throw new Error('El ticket no existe');
            currentTicketData = ticketSnap.data();
            const data = currentTicketData;
            const shortId = ticketId.substring(0,8).toUpperCase();
            const colaboradorNames = await getColaboradorNames(data.colaboradores);
            document.getElementById('ticketIdDisplay').innerText = `#${shortId}`;
            document.getElementById('ticketTitle').innerText = data.titulo || 'Sin título';
            document.getElementById('ticketStatus').innerText = data.estado || 'Desconocido';
            document.getElementById('ticketPriority').innerText = data.prioridad || 'Media';
            document.getElementById('ticketArea').innerText = data.area || 'General';
            document.getElementById('ticketColaboradores').innerText = colaboradorNames;
            document.getElementById('ticketDescription').innerText = data.descripcionActividades || 'No se proporcionó descripción.';
            hideLoading();

            // Si el ticket ya está pausado, mostrar la razón y deshabilitar el formulario
            if (data.estado === 'pausado') {
                const pauseReason = data.pauseComment || 'No se especificó una razón.';
                const textarea = document.getElementById('pauseReason');
                if (textarea) {
                    textarea.value = pauseReason;
                    textarea.disabled = true;
                }
                const submitBtn = document.querySelector('#pauseTicketForm button[type="submit"]');
                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.innerHTML = '<i class="fas fa-ban"></i> Ticket ya pausado';
                }
                // Mostrar un mensaje adicional
                Swal.fire({
                    icon: 'info',
                    title: 'Ticket ya pausado',
                    text: `Este ticket ya se encuentra en estado "pausado". Razón: ${pauseReason}`,
                    confirmButtonText: 'Entendido'
                });
            } else {
                // Si no está pausado pero tiene una razón anterior (caso raro), mostrarla pero permitir editar
                if (data.pauseComment) {
                    document.getElementById('pauseReason').value = data.pauseComment;
                }
            }
        } catch (err) {
            hideLoading();
            console.error(err);
            showError('No se pudo cargar la información del ticket.');
            setTimeout(() => window.location.href = '../gestion-tickets/gestion-tickets.html', 2000);
        }
    }

    async function recordHistory(ticketId, oldStatus, newStatus, motivo) {
        try {
            await db.collection('historialTicket').add({
                ticketId, oldStatus, newStatus, motivo,
                fechaCambio: firebase.firestore.FieldValue.serverTimestamp(),
                colaboradorId: currentUserData.colaboradorId,
                colaboradorNombre: currentUserData.NOMBRE
            });
        } catch (err) { console.error('Error registrando historial:', err); }
    }

    // ----- Función para pausar y extender 3 días (solo si no está pausado) -----
    async function pauseTicket(reason) {
        // Verificación adicional por si acaso
        if (currentTicketData && currentTicketData.estado === 'pausado') {
            showError('Este ticket ya se encuentra pausado. No se puede volver a pausar.');
            return;
        }
        try {
            showLoading('Pausando ticket...');
            const ticketRef = db.collection('ticketsmesa').doc(currentTicketId);
            const ticketSnap = await ticketRef.get();
            const ticketData = ticketSnap.data();
            const oldStatus = ticketData.estado || 'desconocido';
            
            // Calcular nueva fecha límite (suma 3 días a la actual o a la existente)
            let nuevaFechaLimite;
            if (ticketData.fechaLimite) {
                const fechaExistente = ticketData.fechaLimite.toDate();
                nuevaFechaLimite = new Date(fechaExistente);
                nuevaFechaLimite.setDate(fechaExistente.getDate() + 3);
                console.log(`Fecha límite existente: ${fechaExistente}, nueva: ${nuevaFechaLimite}`);
            } else {
                nuevaFechaLimite = new Date();
                nuevaFechaLimite.setDate(nuevaFechaLimite.getDate() + 3);
                console.log(`No había fecha límite, se crea desde hoy: ${nuevaFechaLimite}`);
            }
            
            const updateData = {
                estado: 'pausado',
                pauseComment: reason,
                fechaActualizacion: firebase.firestore.FieldValue.serverTimestamp(),
                fechaLimite: firebase.firestore.Timestamp.fromDate(nuevaFechaLimite)
            };
            
            await ticketRef.update(updateData);
            console.log('Ticket actualizado con fecha límite:', nuevaFechaLimite);
            
            await recordHistory(currentTicketId, oldStatus, 'pausado', `Pausa: ${reason} - Nueva fecha límite: ${nuevaFechaLimite.toLocaleDateString()}`);
            
            hideLoading();
            await showSuccess(`Ticket pausado. Nueva fecha límite: ${nuevaFechaLimite.toLocaleDateString()} (3 días añadidos).`, 'Ticket en Pausa');
            window.location.href = '../gestion-tickets/gestion-tickets.html';
        } catch (err) {
            hideLoading();
            console.error(err);
            showError(err.message || 'No se pudo pausar el ticket.');
        }
    }

    function validateReason(reason) {
        if (reason.length < MIN_PAUSE_REASON_LENGTH) throw new Error(`Mínimo ${MIN_PAUSE_REASON_LENGTH} caracteres.`);
        if (reason.length > MAX_PAUSE_REASON_LENGTH) throw new Error(`Máximo ${MAX_PAUSE_REASON_LENGTH} caracteres.`);
        return true;
    }

    async function handleSubmit(e) {
        e.preventDefault();
        // Verificar nuevamente que no esté pausado
        if (currentTicketData && currentTicketData.estado === 'pausado') {
            showError('No se puede pausar un ticket que ya está en pausa.');
            return;
        }
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const original = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...';
        try {
            const reason = document.getElementById('pauseReason').value.trim();
            validateReason(reason);
            await pauseTicket(reason);
        } catch (err) {
            showError(err.message);
            submitBtn.disabled = false;
            submitBtn.innerHTML = original;
        }
    }

    function setupEventListeners() {
        const form = document.getElementById('pauseTicketForm');
        const cancelBtn = document.getElementById('cancelBtn');
        const textarea = document.getElementById('pauseReason');
        const counter = document.getElementById('charCount');
        if (textarea) {
            textarea.addEventListener('input', function() {
                let len = Math.min(this.value.length, MAX_PAUSE_REASON_LENGTH);
                counter.innerText = len;
                if (this.value.length > MAX_PAUSE_REASON_LENGTH) this.value = this.value.slice(0, MAX_PAUSE_REASON_LENGTH);
            });
        }
        if (form) form.addEventListener('submit', handleSubmit);
        if (cancelBtn) cancelBtn.addEventListener('click', () => window.location.href = '../gestion-tickets/gestion-tickets.html');
    }

    async function init() {
        const { ticketId } = getUrlParams();
        if (!ticketId) {
            showError('No se especificó ningún ticket.');
            setTimeout(() => window.location.href = '../gestion-tickets/gestion-tickets.html', 2000);
            return;
        }
        currentTicketId = ticketId;
        auth.onAuthStateChanged(async (user) => {
            if (user) {
                const ok = await loadUserData(user);
                if (ok) {
                    await loadTicketInfo(ticketId);
                    setupEventListeners();
                }
            } else {
                showError('Debes iniciar sesión.');
                setTimeout(() => window.location.href = '/vista/nav-visitantes/inicio-de-sesion/inicio-de-sesion.html', 2000);
            }
        });
    }
    document.addEventListener('DOMContentLoaded', init);
})();