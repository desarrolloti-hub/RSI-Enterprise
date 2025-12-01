// ==========================================
// CONFIGURACIÓN FIREBASE
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

let unsubscribeMultas = null;
// ==========================================
// INICIALIZACIÓN AUTOMÁTICA
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    console.log("Inicializando módulo de Mis Novedades...");

    // 1. Escuchar el estado de autenticación
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            console.log("Usuario autenticado detectado:", user.email);
            // Iniciamos el proceso de búsqueda con el email del usuario logueado
            await identifyCollaborator(user.email);
        } else {
            console.log("No hay usuario, redirigiendo...");
            // Si no hay usuario, mandar al login
            Swal.fire({
                title: 'Sesión no iniciada',
                text: 'Redirigiendo al inicio de sesión...',
                icon: 'warning',
                timer: 2000,
                showConfirmButton: false
            }).then(() => {
                // Ajusta esta ruta a donde tengas tu login
                window.location.href = '../nav-visitantes/inicio-de-sesion.html'; 
            });
        }
    });
});

// 2. Identificar al Colaborador en la Base de Datos
async function identifyCollaborator(email) {
    const title = document.getElementById('welcomeTitle');
    const container = document.getElementById('resultsContainer');

    try {
        // 
        // NOTA: Usamos el campo exacto que usan tus compañeros: "CORREO ELECTRÓNICO EMPRESARIAL"
        const snapshot = await db.collection('colaboradores')
            .where('CORREO ELECTRÓNICO EMPRESARIAL', '==', email) 
            .limit(1)
            .get();

        if (snapshot.empty) {
            console.warn("Correo no encontrado en la colección colaboradores");
            title.textContent = "Usuario no vinculado";
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-user-slash" style="color: #e74c3c;"></i>
                    <p>Tu correo (${email}) no está registrado en la base de datos de colaboradores.</p>
                    <p style="font-size:0.8rem; margin-top:10px;">Contacta a Recursos Humanos.</p>
                </div>`;
            return;
        }

        // Si encontramos al colaborador, obtenemos su nombre
        const doc = snapshot.docs[0];
        const colabData = doc.data();
        // Tus compañeros usan 'NOMBRE' en mayúsculas
        const collaboratorName = colabData.NOMBRE; 

        console.log("Colaborador identificado:", collaboratorName);
        title.textContent = `Hola, ${collaboratorName}`;
        
        // Ahora buscamos las multas asociadas a ese NOMBRE
        startRealtimeIncidentsListener(collaboratorName);

    } catch (error) {
        console.error("Error identificando colaborador:", error);
        title.textContent = "Error de conexión";
        container.innerHTML = `<p class="error">Error al consultar datos de usuario: ${error.message}</p>`;
    }
}

// 3. Cargar Incidentes (VERSIÓN SIN ÍNDICE DE FIREBASE)
function startRealtimeIncidentsListener(collaboratorName) {
    const container = document.getElementById('resultsContainer');
    
    // Mostrar spinner inicial
    container.innerHTML = '<div style="text-align:center; padding:20px;"><div class="spinner"></div><p>Sincronizando reportes...</p></div>';

    // Detener escucha anterior si existe
    if (unsubscribeMultas) {
        unsubscribeMultas();
    }

    // --- CONSULTA EN VIVO (onSnapshot) ---
    // Nota: Quitamos orderBy para evitar problemas de índice, ordenamos en JS
    const query = db.collection('checkList')
        .where('collaboratorInfo.name', '==', collaboratorName);

    unsubscribeMultas = query.onSnapshot((snapshot) => {
        
        if (snapshot.empty) {
            renderEmptyState();
            return;
        }

        let totalDebt = 0;
        let incidentCount = 0;
        let incidentsList = [];

        snapshot.forEach(doc => {
            const data = doc.data();
            const createdTime = data.createdAt ? data.createdAt.toDate().getTime() : 0;

            if (data.incidents && Array.isArray(data.incidents) && data.incidents.length > 0) {
                data.incidents.forEach(inc => {
                    totalDebt += parseFloat(inc.cost || 0);
                    incidentCount++;
                    
                    incidentsList.push({
                        ...inc,
                        vehicle: data.vehicleInfo?.plates || 'Sin Placa',
                        checklistId: doc.id,
                        sortTime: createdTime 
                    });
                });
            }
        });

        if (incidentCount === 0) {
            renderEmptyState();
            return;
        }

        // Ordenamiento manual (Más reciente primero)
        incidentsList.sort((a, b) => b.sortTime - a.sortTime);

        // Renderizar (se actualiza solo en pantalla)
        renderIncidents(incidentsList, totalDebt, incidentCount);

    }, (error) => {
        console.error("Error en tiempo real:", error);
        container.innerHTML = `<p class="error">Error de sincronización: ${error.message}</p>`;
    });
}
// 4. Renderizar Tarjetas en HTML
function renderIncidents(list, total, count) {
    const container = document.getElementById('resultsContainer');
    const summaryCard = document.getElementById('summaryCard');
    const totalAmount = document.getElementById('totalAmount');
    const totalCount = document.getElementById('totalCount');

    summaryCard.style.display = 'block';
    totalAmount.textContent = `$${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;
    totalCount.textContent = `${count} novedad(es) encontrada(s)`;

    container.innerHTML = '';

    list.forEach(inc => {
        const date = new Date(inc.date).toLocaleDateString();
        
        const card = document.createElement('div');
        card.className = 'incident-card';
        
        let btnEvidence = '';
        if (inc.evidence) {
            const safeEvidence = inc.evidence.replace(/'/g, "\\'");
            btnEvidence = `
                <button onclick="viewEvidence('${safeEvidence}')" class="btn-secondary" style="margin-top:5px; font-size:0.8rem;">
                    <i class="fas fa-image"></i> Ver Foto
                </button>`;
        }

        card.innerHTML = `
            <div class="incident-info">
                <h4>${inc.type} <span class="vehicle-tag">${inc.vehicle}</span></h4>
                <div class="incident-date"><i class="far fa-calendar-alt"></i> ${date}</div>
                <div class="incident-desc">${inc.desc}</div>
                ${btnEvidence}
            </div>
            <div class="incident-cost">
                $${parseFloat(inc.cost).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </div>
        `;
        container.appendChild(card);
    });
}

function renderEmptyState() {
    document.getElementById('resultsContainer').innerHTML = `
        <div class="empty-state">
            <i class="fas fa-check-circle" style="color: #2ecc71;"></i>
            <p>¡Felicidades! No tienes multas ni novedades pendientes.</p>
        </div>
    `;
}

// Utilidad para ver foto en grande
window.viewEvidence = (imgData) => {
    const safeData = imgData.replace(/"/g, '&quot;');
    Swal.fire({
        title: 'Evidencia',
        html: `<img src="${safeData}" style="max-width: 100%; height: auto; border-radius: 8px;">`,
        width: '80%',
        confirmButtonText: 'Cerrar'
    });
};