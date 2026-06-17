/*
 * Archivo: particulas_emojis.js
 * Función: ⚽ y 🇲🇽 cayendo usando imágenes desde una ruta local.
 * ¡Solo cambia las rutas de las imágenes!
 */

(function() {
    // ---- 👇 CAMBIA ESTAS RUTAS POR LAS TUYAS ----
    const IMG_PATHS = {
        ball: '/vista/css/img/balon.png',      // Ruta de tu balón ⚽
        flag: '/vista/css/img/mex.png'     // Ruta de tu bandera 🇲🇽
    };
    // -------------------------------------------------

    const canvas = document.createElement('canvas');
    canvas.id = 'emojiCanvas';
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.zIndex = '-1';
    canvas.style.pointerEvents = 'none';
    document.body.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    let W, H;
    let particles = [];
    const maxParticles = 55;

    let images = {};
    let imagesLoaded = 0;
    const totalImages = Object.keys(IMG_PATHS).length;

    function onImageLoaded() {
        imagesLoaded++;
        if (imagesLoaded === totalImages) {
            initParticles();
            loop();
        }
    }

    function loadImages() {
        for (let key in IMG_PATHS) {
            const img = new Image();
            img.crossOrigin = 'anonymous'; // solo si usas URLs externas, si es local no hace falta
            img.src = IMG_PATHS[key];
            img.onload = onImageLoaded;
            img.onerror = function() {
                console.warn('Error cargando imagen:', key, '→', IMG_PATHS[key]);
                imagesLoaded++;
                if (imagesLoaded === totalImages) {
                    initParticles();
                    loop();
                }
            };
            images[key] = img;
        }
    }

    function setSize() {
        W = window.innerWidth;
        H = window.innerHeight;
        canvas.width = W;
        canvas.height = H;
    }
    window.addEventListener('resize', setSize);
    setSize();

    function initParticles() {
        const types = ['ball', 'flag'];
        for (let i = 0; i < maxParticles; i++) {
            const sizeBase = Math.random() * 22 + 28; // 28-50px (tamaño de emoji)
            particles.push({
                x: Math.random() * W,
                y: Math.random() * H,
                size: sizeBase,
                d: Math.random() * 0.3 + 0.15,
                type: types[Math.floor(Math.random() * types.length)],
                rotation: Math.random() * Math.PI * 2,
                rotationSpeed: (Math.random() - 0.5) * 0.015
            });
        }
    }

    function draw() {
        ctx.clearRect(0, 0, W, H);
        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            const img = images[p.type];
            if (img && img.complete && img.naturalWidth > 0) {
                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rotation);
                ctx.drawImage(img, -p.size/2, -p.size/2, p.size, p.size);
                ctx.restore();
            } else {
                // Fallback: emoji de texto por si no carga la imagen
                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rotation);
                ctx.font = `${p.size}px sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(p.type === 'ball' ? '⚽' : '🇲🇽', 0, 0);
                ctx.restore();
            }
        }
        update();
    }

    let angle = 0;
    function update() {
        angle += 0.008;
        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            p.y += p.d * 1.0;
            p.x += Math.sin(angle + i * 0.5) * 0.2;
            p.rotation += p.rotationSpeed;
            if (p.y > H + 50) {
                p.y = -50;
                p.x = Math.random() * W;
            }
            if (p.x > W + 50) p.x = -50;
            else if (p.x < -50) p.x = W + 50;
        }
    }

    function loop() {
        draw();
        requestAnimationFrame(loop);
    }

    loadImages();
})();