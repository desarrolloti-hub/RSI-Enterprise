/* * Archivo: sanvalentin.js
 * Función: Crea un efecto de corazones cayendo usando Canvas.
 */

(function() {
    const canvas = document.createElement('canvas');
    canvas.id = 'loveCanvas';
    
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.zIndex = '-1'; 
    canvas.style.pointerEvents = 'none'; 
    document.body.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    let W, H;
    let hearts = []; 
    let maxHearts = 50; // Menos cantidad que la nieve suele verse mejor para corazones

    function setSize() {
        W = window.innerWidth;
        H = window.innerHeight;
        canvas.width = W;
        canvas.height = H;
    }
    
    window.addEventListener('resize', setSize);
    setSize();

    function initHearts() {
        const colors = ['#ff4d6d', '#ff758f', '#ff8fa3', '#ffb3c1', '#c9184a'];
        for (let i = 0; i < maxHearts; i++) {
            hearts.push({
                x: Math.random() * W,
                y: Math.random() * H,
                size: Math.random() * 10 + 5, // Un poco más grandes que la nieve
                d: Math.random() * 0.5 + 0.5,
                color: colors[Math.floor(Math.random() * colors.length)],
                oscilation: Math.random() * 0.02 // Variación individual
            });
        }
    }

    // Función especial para dibujar un corazón
    function drawHeart(x, y, size, color) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.bezierCurveTo(x, y - 3 * size / 4, x - size, y - 3 * size / 4, x - size, y);
        ctx.bezierCurveTo(x - size, y + size / 2, x, y + size, x, y + 1.5 * size);
        ctx.bezierCurveTo(x, y + size, x + size, y + size / 2, x + size, y);
        ctx.bezierCurveTo(x + size, y - 3 * size / 4, x, y - 3 * size / 4, x, y);
        ctx.fill();
    }

    function draw() {
        ctx.clearRect(0, 0, W, H); 
        
        for (let i = 0; i < maxHearts; i++) {
            const h = hearts[i];
            drawHeart(h.x, h.y, h.size, h.color);
        }
        update();
    }

    let angle = 0;
    function update() {
        angle += 0.01;

        for (let i = 0; i < maxHearts; i++) {
            const h = hearts[i];
            
            // Caída más suave
            h.y += h.d * 1.5;
            // Movimiento de lado a lado (como si flotaran)
            h.x += Math.sin(angle + h.oscilation) * 1;

            if (h.y > H + 20) {
                hearts[i].y = -20;
                hearts[i].x = Math.random() * W;
            }

            if (h.x > W) h.x = 0;
            else if (h.x < 0) h.x = W;
        }
    }

    function loop() {
        draw();
        requestAnimationFrame(loop);
    }

    initHearts();
    loop();
})();