/* * Archivo: navidad.js
 * Función: Crea un efecto de nieve cayendo usando Canvas.
 */

(function() {
    // 1. Crear y configurar el elemento Canvas
    const canvas = document.createElement('canvas');
    canvas.id = 'snowCanvas';
    
    // Aplicar estilos para que ocupe toda la pantalla y esté detrás del contenido
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.zIndex = '-1'; // Poner detrás de todo el contenido
    canvas.style.pointerEvents = 'none'; // Ignorar clics del ratón
    document.body.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    let W, H; // Ancho y Alto
    let flakes = []; // Array para guardar los copos de nieve
    let maxFlakes = 100; // Puedes ajustar este número para más o menos nieve

    // Función para ajustar el tamaño del Canvas a la ventana
    function setSize() {
        W = window.innerWidth;
        H = window.innerHeight;
        canvas.width = W;
        canvas.height = H;
    }
    
    // Escuchar el evento de redimensionamiento para que funcione en móviles y al cambiar el tamaño del navegador
    window.addEventListener('resize', setSize);
    setSize(); // Llamar una vez al inicio

    // Definición inicial de los copos de nieve
    function initFlakes() {
        for (let i = 0; i < maxFlakes; i++) {
            flakes.push({
                x: Math.random() * W, // Posición X aleatoria
                y: Math.random() * H, // Posición Y aleatoria
                r: Math.random() * 3 + 1, // Radio (tamaño, entre 1 y 4)
                d: Math.random() * 0.5 + 0.5 // Densidad/velocidad de caída (entre 0.5 y 1.0)
            });
        }
    }

    // Dibujar los copos
    function draw() {
        // Limpiar el Canvas en cada cuadro
        ctx.clearRect(0, 0, W, H); 
        
        ctx.fillStyle = "rgba(255, 255, 255, 0.8)"; // Blanco semitransparente
        ctx.beginPath();
        
        for (let i = 0; i < maxFlakes; i++) {
            const f = flakes[i];
            ctx.moveTo(f.x, f.y);
            ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2, true);
        }
        
        ctx.fill();
        update();
    }

    // Actualizar la posición de los copos
    let angle = 0; // Para el movimiento lateral de "viento"
    function update() {
        angle += 0.01; // Cambiar el ángulo ligeramente en cada cuadro

        for (let i = 0; i < maxFlakes; i++) {
            const f = flakes[i];
            
            // 1. Caída: (velocidad base + densidad)
            f.y += f.r * f.d;
            
            // 2. Movimiento lateral (Viento sutil usando seno del ángulo global y el radio del copo)
            f.x += Math.sin(angle) * 0.5;

            // 3. Si un copo sale por la parte inferior, reiniciarlo en la parte superior
            if (f.y > H) {
                flakes[i] = {
                    x: Math.random() * W, 
                    y: 0, 
                    r: f.r, 
                    d: f.d
                };
            }

            // 4. Si sale por los lados, reiniciarlo en el lado opuesto (opcional)
            if (f.x > W) {
                f.x = 0;
            } else if (f.x < 0) {
                f.x = W;
            }
        }
    }

    // Iniciar el bucle de animación
    function loop() {
        draw();
        // Pedir al navegador que repinte en el siguiente ciclo (eficiente)
        requestAnimationFrame(loop);
    }

    // Iniciar todo
    initFlakes();
    loop();

})();