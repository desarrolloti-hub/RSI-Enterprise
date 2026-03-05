/* * Archivo: primavera_pequena.js
 * Función: Crea un efecto de flores y girasoles pequeños cayendo usando Canvas.
 */

(function() {
    const canvas = document.createElement('canvas');
    canvas.id = 'flowerCanvas';
    
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.zIndex = '-1'; 
    canvas.style.pointerEvents = 'none'; 
    document.body.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    let W, H;
    let flowers = []; 
    // Ajustado ligeramente la cantidad para compensar el tamaño menor
    let maxFlowers = 45; 

    function setSize() {
        W = window.innerWidth;
        H = window.innerHeight;
        canvas.width = W;
        canvas.height = H;
    }
    
    window.addEventListener('resize', setSize);
    setSize();

    function initFlowers() {
        // Colores para flores variadas y el amarillo clásico del girasol
        const colors = ['#ff85a1', '#fbb1bd', '#f7cad0', '#ffb703', '#fb8500'];
        for (let i = 0; i < maxFlowers; i++) {
            // REDUCCIÓN DE TAMAÑO: El rango de tamaño ahora es menor
            const sizeBase = Math.random() * 4 + 3; // Rango de 3 a 7 píxeles de base
            flowers.push({
                x: Math.random() * W,
                y: Math.random() * H,
                size: sizeBase, 
                d: Math.random() * 0.4 + 0.3, // Velocidad de caída un poco más lenta para objetos más ligeros
                color: colors[Math.floor(Math.random() * colors.length)],
                type: Math.random() > 0.5 ? 'sunflower' : 'flower', // 50% probabilidad de cada una
                rotation: Math.random() * Math.PI * 2,
                rotationSpeed: (Math.random() - 0.5) * 0.04 // Rotación ligeramente más suave
            });
        }
    }

    // Dibuja una flor simple
    function drawFlower(x, y, size, color) {
        ctx.fillStyle = color;
        // REDUCCIÓN DE TAMAÑO: El factor multiplicador es menor
        for (let i = 0; i < 5; i++) {
            ctx.beginPath();
            ctx.arc(
                x + Math.cos(i * Math.PI * 2 / 5) * (size * 0.9), // Ajuste de distancia del pétalo
                y + Math.sin(i * Math.PI * 2 / 5) * (size * 0.9), // Ajuste de distancia del pétalo
                size * 0.8, // Pétalos un poco más pequeños
                0, Math.PI * 2
            );
            ctx.fill();
        }
        ctx.fillStyle = '#fff'; // Centro blanco
        ctx.beginPath();
        ctx.arc(x, y, size * 0.4, 0, Math.PI * 2); // Centro más pequeño
        ctx.fill();
    }

    // Dibuja un girasol
    function drawSunflower(x, y, size) {
        // Pétalos amarillos
        ctx.fillStyle = '#ffcc00';
        for (let i = 0; i < 8; i++) {
            ctx.beginPath();
            // REDUCCIÓN DE TAMAÑO: Escala reducida en elipses y posición
            ctx.ellipse(
                x + Math.cos(i * Math.PI / 4) * size, // Distancia
                y + Math.sin(i * Math.PI / 4) * size, // Distancia
                size * 1.0, // Tamaño elipse
                size / 2.5, // Tamaño elipse
                i * Math.PI / 4, 
                0, Math.PI * 2
            );
            ctx.fill();
        }
        // Centro marrón
        ctx.fillStyle = '#6b4226';
        ctx.beginPath();
        // REDUCCIÓN DE TAMAÑO: Centro proporcional al nuevo tamaño
        ctx.arc(x, y, size * 0.7, 0, Math.PI * 2);
        ctx.fill();
    }

    function draw() {
        ctx.clearRect(0, 0, W, H); 
        
        for (let i = 0; i < maxFlowers; i++) {
            const f = flowers[i];
            ctx.save();
            ctx.translate(f.x, f.y);
            ctx.rotate(f.rotation); 
            
            if (f.type === 'sunflower') {
                drawSunflower(0, 0, f.size);
            } else {
                drawFlower(0, 0, f.size, f.color);
            }
            
            ctx.restore();
        }
        update();
    }

    let angle = 0;
    function update() {
        angle += 0.01;

        for (let i = 0; i < maxFlowers; i++) {
            const f = flowers[i];
            
            f.y += f.d * 1.1; // Caída ligeramente más rápida para flores pequeñas
            f.x += Math.sin(angle) * 0.4; // Movimiento lateral más sutil
            f.rotation += f.rotationSpeed; 

            if (f.y > H + 30) {
                flowers[i].y = -30;
                flowers[i].x = Math.random() * W;
            }

            if (f.x > W + 15) f.x = -15;
            else if (f.x < -15) f.x = W + 15;
        }
    }

    function loop() {
        draw();
        requestAnimationFrame(loop);
    }

    initFlowers();
    loop();
})();