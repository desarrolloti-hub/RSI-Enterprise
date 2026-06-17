        // ==================== CONFIGURACIÓN DE FIREBASE ====================
        const firebaseConfig = {
            apiKey: "AIzaSyBJy992gkvsT77-_fMp_O_z99wtjZiK77Y",
            authDomain: "rsienterprise.firebaseapp.com",
            projectId: "rsienterprise",
            storageBucket: "rsienterprise.appspot.com",
            messagingSenderId: "1063117165770",
            appId: "1:1063117165770:web:8555f26b25ae80bc42d033"
        };
        firebase.initializeApp(firebaseConfig);

        // ==================== FUNCIONES DE LOCAL STORAGE ====================
        function saveSessionToLocalStorage(userData) {
            try {
                const sessionData = {
                    uid: userData.uid,
                    email: userData.email,
                    nombreCompleto: userData.nombreCompleto || userData.nombre || 'Usuario',
                    rol: userData.rol || 'user',
                    fechaInicioSesion: new Date().toISOString(),
                    emailVerified: userData.emailVerified || false,
                    expiresAt: new Date().getTime() + (24 * 60 * 60 * 1000)
                };
                localStorage.setItem('rsi_session', JSON.stringify(sessionData));
                localStorage.setItem('userUID', userData.uid);
                localStorage.setItem('userEmail', userData.email);
                localStorage.setItem('userName', userData.nombreCompleto || userData.nombre || 'Usuario');
                localStorage.setItem('userRole', userData.rol || 'user');
                localStorage.setItem('sessionStart', new Date().toISOString());
                return true;
            } catch (error) {
                return false;
            }
        }

        function getSessionFromLocalStorage() {
            try {
                const sessionData = localStorage.getItem('rsi_session');
                if (sessionData) {
                    const parsedData = JSON.parse(sessionData);
                    const now = new Date().getTime();
                    if (parsedData.expiresAt && now > parsedData.expiresAt) {
                        clearSessionFromLocalStorage();
                        return null;
                    }
                    return parsedData;
                }
                return null;
            } catch (error) {
                return null;
            }
        }

        function clearSessionFromLocalStorage() {
            try {
                localStorage.removeItem('rsi_session');
                localStorage.removeItem('userUID');
                localStorage.removeItem('userEmail');
                localStorage.removeItem('userName');
                localStorage.removeItem('userRole');
                localStorage.removeItem('sessionStart');
                return true;
            } catch (error) {
                return false;
            }
        }

        function hasActiveSessionInLocalStorage() {
            return getSessionFromLocalStorage() !== null;
        }

        function getUserFromLocalStorage(key) {
            try {
                return localStorage.getItem(key) || null;
            } catch (error) {
                return null;
            }
        }

        function saveColaboradorDataToLocalStorage(colaboradorData) {
            try {
                if (colaboradorData) {
                    localStorage.setItem('colaboradorData', JSON.stringify(colaboradorData));
                }
            } catch (error) {}
        }

        // ==================== FUNCIONES DE UI Y NAVEGACIÓN ====================
        function togglePassword(inputId, button) {
            const input = document.getElementById(inputId);
            const icon = button.querySelector('i');
            if (input.type === 'password') {
                input.type = 'text';
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            } else {
                input.type = 'password';
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            }
        }

        function showSessionLoading() {
            document.getElementById('sessionLoadingOverlay').style.display = 'flex';
        }

        function hideSessionLoading() {
            document.getElementById('sessionLoadingOverlay').style.display = 'none';
        }

        function redirectByRole(rol) {
            const rutas = {
                'admin': '/vista/nav-admin/dashAdmin.html',
                'puntoVenta': '/vista/nav-puntoVenta/inicio.html',
                'facturas': '/vista/nav-mesa-admin/asistencia/asistencia.html',
                'colaborador': '/vista/nav-mesa-admin/asistencia/asistencia.html',  // ← unificado con admincolaborador
                'user': '/vista/nav-usuarios/inicio-usuario/inicio-usuario.html',
                'admincolaborador': '/vista/nav-mesa-admin/asistencia/asistencia.html'
            };
            window.location.href = rutas[rol] || '/vista/nav-usuarios/dashUser.html';
        }

        function redirectAfterLogin(rol, userData) {
            const tieneNotificaciones = userData && userData.hasOwnProperty('notificacionesHabilitadas');
            // Colaborador y admincolaborador van al mismo panel (admincolaborador)
            if (rol === 'colaborador' || rol === 'admincolaborador') {
                const rutaBase = '/vista/nav-mesa-admin';
                const destino = tieneNotificaciones
                    ? `${rutaBase}/asistencia/asistencia.html`
                    : `${rutaBase}/permisos/permisos.html`;
                window.location.href = destino;
            } else {
                redirectByRole(rol);
            }
        }

        // ==================== FUNCIONES DE AUTENTICACIÓN ====================
        function showSessionDetectedAlert(rol, nombreCompleto, email, uid, userData) {
            const rolNames = {
                'admin': 'Administrador',
                'puntoVenta': 'Punto de Venta',
                'facturas': 'Operador de Facturas',
                'colaborador': 'Colaborador',
                'user': 'Usuario',
                'admincolaborador': 'Administrador de Colaboradores'
            };
            const rolDisplay = rolNames[rol] || rol;
            const tieneNotificaciones = userData && userData.hasOwnProperty('notificacionesHabilitadas');

            let timerInterval;
            Swal.fire({
                title: 'Sesión activa detectada',
                html: `
                    <div style="text-align: left; margin-bottom: 1rem;">
                        <p><strong>Nombre:</strong> ${nombreCompleto}</p>
                        <p><strong>Correo:</strong> ${email}</p>
                        <p><strong>Rol:</strong> ${rolDisplay}</p>
                        <p><strong>Estado:</strong> <span style="color: #28a745;">Sesión activa</span></p>
                        ${rol === 'colaborador' || rol === 'admincolaborador' ? `
                            <p><strong>Notificaciones:</strong> 
                                <span style="color: ${tieneNotificaciones ? '#28a745' : '#ffc107'};">
                                    ${tieneNotificaciones ? '✓ Configuradas' : '⚠️ Pendientes de configurar'}
                                </span>
                            </p>
                        ` : ''}
                    </div>
                    <p>Serás redirigido automáticamente en <strong id="countdown">3</strong> segundos...</p>
                `,
                icon: 'info',
                showConfirmButton: false,
                allowOutsideClick: false,
                allowEscapeKey: false,
                timer: 3000,
                didOpen: () => {
                    const timer = Swal.getPopup().querySelector("strong#countdown");
                    let timeLeft = 3;
                    timerInterval = setInterval(() => {
                        timeLeft--;
                        timer.textContent = timeLeft;
                        if (timeLeft <= 0) clearInterval(timerInterval);
                    }, 1000);
                    saveSessionToLocalStorage({
                        uid, email, nombreCompleto, rol, emailVerified: true
                    });
                },
                willClose: () => clearInterval(timerInterval)
            }).then((result) => {
                if (result.dismiss === Swal.DismissReason.timer) {
                    redirectAfterLogin(rol, userData);
                }
            });
        }

        async function checkActiveSession() {
            showSessionLoading();
            firebase.auth().onAuthStateChanged(async (user) => {
                if (user && user.emailVerified) {
                    try {
                        const userDoc = await firebase.firestore().collection('usuarios').doc(user.uid).get();
                        if (userDoc.exists) {
                            const userData = userDoc.data();
                            const rol = userData.rol;
                            const nombreCompleto = userData.nombreCompleto || 'Usuario';
                            const email = user.email;

                            if (rol === 'colaborador' || rol === 'admincolaborador') {
                                const colaboradorDoc = await firebase.firestore().collection('colaboradores').doc(user.uid).get();
                                if (colaboradorDoc.exists) {
                                    const colaboradorData = colaboradorDoc.data();
                                    if (colaboradorData.trabajo === 'Activo') {
                                        saveColaboradorDataToLocalStorage(colaboradorData);
                                        hideSessionLoading();
                                        showSessionDetectedAlert(rol, nombreCompleto, email, user.uid, userData);
                                    } else {
                                        await firebase.auth().signOut();
                                        clearSessionFromLocalStorage();
                                        hideSessionLoading();
                                        Swal.fire({
                                            title: 'Cuenta deshabilitada',
                                            text: 'Su cuenta ha sido deshabilitada. Por favor, póngase en contacto con el administrador.',
                                            icon: 'warning',
                                            confirmButtonText: 'Aceptar'
                                        });
                                    }
                                } else {
                                    hideSessionLoading();
                                    showSessionDetectedAlert(rol, nombreCompleto, email, user.uid, userData);
                                }
                            } else {
                                hideSessionLoading();
                                showSessionDetectedAlert(rol, nombreCompleto, email, user.uid, userData);
                            }
                        } else {
                            hideSessionLoading();
                        }
                    } catch (error) {
                        hideSessionLoading();
                    }
                } else {
                    hideSessionLoading();
                    if (hasActiveSessionInLocalStorage()) {
                        clearSessionFromLocalStorage();
                    }
                }
            });
        }

        async function handleSignup(fullName, email, password, confirmPassword, rol) {
            if (password !== confirmPassword) throw new Error('Las contraseñas no coinciden');
            const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;
            await firebase.firestore().collection('usuarios').doc(user.uid).set({
                nombreCompleto: fullName,
                email: user.email,
                rol: rol,
                fechaRegistro: firebase.firestore.FieldValue.serverTimestamp()
            });
            await user.sendEmailVerification();
            return user;
        }

        async function handleLogin(email, password) {
            const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
            const user = userCredential.user;
            if (!user.emailVerified) {
                await firebase.auth().signOut();
                clearSessionFromLocalStorage();
                throw new Error('Por favor verifica tu correo electrónico antes de iniciar sesión');
            }
            const userDoc = await firebase.firestore().collection('usuarios').doc(user.uid).get();
            if (!userDoc.exists) throw new Error('No se encontró información del usuario');
            const userData = userDoc.data();
            const rol = userData.rol;

            saveSessionToLocalStorage({
                uid: user.uid,
                email: user.email,
                nombreCompleto: userData.nombreCompleto || 'Usuario',
                rol: rol,
                emailVerified: user.emailVerified
            });

            if (rol === 'colaborador' || rol === 'admincolaborador') {
                const colaboradorDoc = await firebase.firestore().collection('colaboradores').doc(user.uid).get();
                if (colaboradorDoc.exists) {
                    const colaboradorData = colaboradorDoc.data();
                    if (colaboradorData.trabajo !== 'Activo') {
                        await firebase.auth().signOut();
                        clearSessionFromLocalStorage();
                        throw new Error('Su cuenta ha sido deshabilitada. Por favor, póngase en contacto con el administrador.');
                    }
                    saveColaboradorDataToLocalStorage(colaboradorData);
                }
            }
            return { rol, userData };
        }

        // ==================== INICIALIZACIÓN CUANDO EL DOM ESTÉ LISTO ====================
        document.addEventListener('DOMContentLoaded', function() {
            checkActiveSession();

            document.getElementById('goToLogin')?.addEventListener('click', function(e) {
                e.preventDefault();
                document.getElementById('signupForm').classList.remove('active');
                document.getElementById('loginForm').classList.add('active');
            });
            document.getElementById('goToSignup')?.addEventListener('click', function(e) {
                e.preventDefault();
                document.getElementById('loginForm').classList.remove('active');
                document.getElementById('signupForm').classList.add('active');
            });

            document.getElementById('forgotPasswordLink')?.addEventListener('click', function(e) {
                e.preventDefault();
                Swal.fire({
                    title: 'Recuperar contraseña',
                    input: 'email',
                    inputPlaceholder: 'Ingresa tu correo electrónico',
                    showCancelButton: true,
                    confirmButtonText: 'Enviar',
                    cancelButtonText: 'Cancelar',
                    confirmButtonColor: '#3085d6',
                    cancelButtonColor: '#d33',
                    preConfirm: async (email) => {
                        if (!email) {
                            Swal.showValidationMessage('Por favor, ingresa un correo válido');
                            return false;
                        }
                        try {
                            await firebase.auth().sendPasswordResetEmail(email);
                            return email;
                        } catch (error) {
                            Swal.showValidationMessage(`Error: ${error.message}`);
                            return false;
                        }
                    }
                }).then((result) => {
                    if (result.isConfirmed) {
                        Swal.fire({
                            title: 'Correo enviado',
                            text: 'Se ha enviado un correo para restablecer tu contraseña. Revisa tu bandeja de entrada.',
                            icon: 'success'
                        });
                    }
                });
            });

            document.getElementById('signupFormElement')?.addEventListener('submit', async function(e) {
                e.preventDefault();
                const fullName = document.getElementById('fullName').value;
                const email = document.getElementById('signupEmail').value;
                const password = document.getElementById('signupPassword').value;
                const confirmPassword = document.getElementById('confirmPassword').value;
                const rol = document.querySelector('input[name="rol"]').value;

                try {
                    Swal.showLoading();
                    await handleSignup(fullName, email, password, confirmPassword, rol);
                    Swal.fire({
                        title: '¡Registro exitoso!',
                        text: 'Se ha enviado un correo de verificación. Por favor verifica tu cuenta.',
                        icon: 'success'
                    });
                    this.reset();
                    document.getElementById('signupForm').classList.remove('active');
                    document.getElementById('loginForm').classList.add('active');
                } catch (error) {
                    let errorMessage = 'Error al registrar';
                    switch(error.code) {
                        case 'auth/email-already-in-use': errorMessage = 'El correo ya está registrado'; break;
                        case 'auth/weak-password': errorMessage = 'La contraseña debe tener al menos 6 caracteres'; break;
                        default: errorMessage = error.message;
                    }
                    Swal.fire({ title: 'Error', text: errorMessage, icon: 'error' });
                }
            });

            document.getElementById('loginFormElement')?.addEventListener('submit', async function(e) {
                e.preventDefault();
                const email = document.getElementById('loginEmail').value;
                const password = document.getElementById('loginPassword').value;

                try {
                    Swal.showLoading();
                    const { rol, userData } = await handleLogin(email, password);

                    try {
                        const { subscribeUser } = await import("/push-subscribe.js");
                        const user = firebase.auth().currentUser;
                        if (user) await subscribeUser(user.uid);
                    } catch (err) {}

                    Swal.fire({
                        title: '¡Bienvenido!',
                        text: 'Redirigiendo...',
                        icon: 'success',
                        timer: 1500,
                        showConfirmButton: false
                    });

                    setTimeout(() => redirectAfterLogin(rol, userData), 1500);
                } catch (error) {
                    let errorMessage = 'Error al iniciar sesión';
                    switch(error.code) {
                        case 'auth/user-not-found':
                        case 'auth/wrong-password': errorMessage = 'Correo o contraseña incorrectos'; break;
                        default: errorMessage = error.message;
                    }
                    Swal.fire({ title: 'Error', text: errorMessage, icon: 'error' });
                    clearSessionFromLocalStorage();
                }
            });

            const savedSession = getSessionFromLocalStorage();
            if (savedSession) {
                // No se imprime nada en consola
            }
        });