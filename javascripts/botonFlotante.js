function togglePanel() {
    const panel = document.getElementById('socialPanel');
    const buttons = document.querySelectorAll('.social-btn');
    panel.classList.toggle('open');
    
    if (panel.classList.contains('open')) {
        buttons.forEach((btn, index) => {
            let angle = (index * (360 / buttons.length)) * (Math.PI / 180); 
            let x = Math.cos(angle) * 80;
            let y = Math.sin(angle) * -80;
            btn.style.transform = `translate(${x}px, ${y}px)`;
        });
    } else {
        buttons.forEach((btn) => {
            btn.style.transform = "translate(0, 0)";
        });
    }
}

function openChatbot() {
    alert('Aquí se abriría el chatbot. Puedes integrarlo aquí.');
}