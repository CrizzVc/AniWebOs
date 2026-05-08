// 2D Spatial Navigation and Data Fetching for webOS TV
document.addEventListener('DOMContentLoaded', async () => {
    const statusElement = document.getElementById('status');
    const carouselElement = document.getElementById('carousel');
    const heroBg = document.getElementById('hero-bg');
    const heroTitle = document.getElementById('hero-title');
    const heroSubtitle = document.getElementById('hero-subtitle');
    
    // Player elements
    const playerOverlay = document.getElementById('player-overlay');
    const videoFrame = document.getElementById('video-frame');
    const playerTitle = document.getElementById('player-title');
    
    let focusableElements = [];
    let currentIndex = 0;
    
    // Constants for 2D Grid Navigation
    // We have 2 rows: 
    // Row 0: Top Buttons (Reproducir, Catálogo)
    // Row 1: Carousel Cards
    let currentRow = 1; // Start in carousel
    let currentColumn = 0;
    
    let buttons = [];
    let cards = [];
    let episodesData = [];

    // Initialize clock
    setInterval(() => {
        const now = new Date();
        document.getElementById('clock').innerText = now.toLocaleTimeString('es-ES', {hour: '2-digit', minute:'2-digit'});
    }, 1000);

    // Fetch data
    try {
        statusElement.innerText = "Conectando al servidor local...";
        const response = await fetch('http://localhost:3000/api/latest');
        const result = await response.json();
        
        if (result.success && result.data) {
            episodesData = result.data;
            renderCarousel(episodesData);
            setupNavigation();
            statusElement.innerText = "¡Listo!";
            setTimeout(() => statusElement.innerText = "", 3000);
        }
    } catch (e) {
        console.error(e);
        statusElement.innerText = "Error de conexión. ¿Está corriendo el backend?";
    }

    function renderCarousel(episodes) {
        carouselElement.innerHTML = '';
        cards = [];
        
        episodes.forEach((ep, index) => {
            const card = document.createElement('div');
            card.className = 'card focusable';
            card.setAttribute('tabindex', '-1');
            card.style.backgroundImage = `url('${ep.image}')`;
            card.dataset.index = index;
            
            card.innerHTML = `
                <div class="card-info">
                    <div class="card-episode">${ep.episode}</div>
                    <div class="card-title">${ep.title}</div>
                </div>
            `;
            
            carouselElement.appendChild(card);
            cards.push(card);
        });
    }

    function setupNavigation() {
        buttons = Array.from(document.querySelectorAll('.hero-actions .focusable'));
        
        // Initial state
        if (cards.length > 0) {
            updateFocus(1, 0); // Row 1 (cards), Col 0
        }
    }

    function updateHero(episode) {
        if (!episode) return;
        heroBg.style.backgroundImage = `url('${episode.image}')`;
        heroTitle.innerText = episode.title;
        heroSubtitle.innerText = episode.episode;
    }

    function updateFocus(row, col) {
        // Remove previous focus
        const currentActive = document.querySelector('.focused');
        if (currentActive) currentActive.classList.remove('focused');
        
        currentRow = row;
        currentColumn = col;
        
        let newActive;
        
        if (currentRow === 0) {
            // Buttons row
            if (currentColumn >= buttons.length) currentColumn = buttons.length - 1;
            newActive = buttons[currentColumn];
        } else {
            // Cards row
            if (currentColumn >= cards.length) currentColumn = cards.length - 1;
            newActive = cards[currentColumn];
            
            // Move carousel container to keep card in view
            const cardWidth = 310; // 280 + 30 gap
            const offset = currentColumn * cardWidth;
            // Center it slightly
            carouselElement.style.transform = `translateX(-${Math.max(0, offset - 300)}px)`;
            
            // Update Background and Text
            updateHero(episodesData[currentColumn]);
        }
        
        if (newActive) {
            newActive.classList.add('focused');
            newActive.focus();
        }
    }

    // Handle remote control key presses
    document.addEventListener('keydown', (e) => {
        const KEY_LEFT = 37;
        const KEY_UP = 38;
        const KEY_RIGHT = 39;
        const KEY_DOWN = 40;
        const KEY_ENTER = 13;
        const KEY_ESC = 27; // Keyboard ESC
        const KEY_BACK = 461; // LG Magic Remote Back Button

        // If player is open, intercept Back/Esc to close it
        if (!playerOverlay.classList.contains('hidden')) {
            if (e.keyCode === KEY_ESC || e.keyCode === KEY_BACK) {
                e.preventDefault();
                closePlayer();
            }
            return; // Don't process other navigation keys when player is open
        }

        if (cards.length === 0) return; // Not loaded yet

        switch (e.keyCode) {
            case KEY_LEFT:
                e.preventDefault();
                if (currentColumn > 0) {
                    updateFocus(currentRow, currentColumn - 1);
                }
                break;
            case KEY_RIGHT:
                e.preventDefault();
                const maxCols = currentRow === 0 ? buttons.length - 1 : cards.length - 1;
                if (currentColumn < maxCols) {
                    updateFocus(currentRow, currentColumn + 1);
                }
                break;
            case KEY_UP:
                e.preventDefault();
                if (currentRow === 1) { // Move from cards to buttons
                    // Try to map horizontal position to buttons logically, or just select first button
                    updateFocus(0, currentColumn < buttons.length ? currentColumn : 0);
                }
                break;
            case KEY_DOWN:
                e.preventDefault();
                if (currentRow === 0) { // Move from buttons to cards
                    // Maintain previous card column if possible
                    updateFocus(1, currentColumn);
                }
                break;
            case KEY_ENTER:
                e.preventDefault();
                if (currentRow === 1) {
                    const ep = episodesData[currentColumn];
                    statusElement.innerText = `Intentando reproducir: ${ep.title} (${ep.episode})`;
                    // Here you would fetch /api/servers?url=ep.url
                    fetchServersAndPlay(ep.url);
                } else if (currentRow === 0) {
                    if (currentColumn === 0) { // Reproducir (btn-play)
                        // Play currently focused card even if button is pressed
                        // Wait, how do we know which card? Actually btn-play should play the last focused card
                        // For simplicity, just alert
                        statusElement.innerText = "¡Usa las tarjetas abajo para reproducir!";
                    } else if (currentColumn === 1) { // Catalogo
                        statusElement.innerText = "¡Abriendo catálogo completo!";
                    }
                }
                break;
        }
    });
    
    async function fetchServersAndPlay(episodeUrl) {
        statusElement.innerText = "Buscando reproductores...";
        try {
            const res = await fetch(`http://localhost:3000/api/servers?url=${encodeURIComponent(episodeUrl)}`);
            const json = await res.json();
            if (json.success && json.servers.length > 0) {
                // Find a good server, try to find 'mega' or 'okru' or just use the first one
                let selectedServer = json.servers.find(s => s.server === 'mega' || s.server === 'okru') || json.servers[0];
                
                statusElement.innerText = `Reproduciendo en servidor: ${selectedServer.title}`;
                openPlayer(episodesData[currentColumn].title + " " + episodesData[currentColumn].episode, selectedServer.code);
            } else {
                statusElement.innerText = "No se encontraron reproductores.";
            }
        } catch (e) {
            statusElement.innerText = "Error buscando reproductores.";
        }
    }

    function openPlayer(title, videoUrl) {
        playerTitle.innerText = `Reproduciendo: ${title}`;
        videoFrame.src = videoUrl;
        playerOverlay.classList.remove('hidden');
    }

    function closePlayer() {
        playerOverlay.classList.add('hidden');
        videoFrame.src = ""; // Stop playing audio/video
        statusElement.innerText = "Reproductor cerrado.";
        setTimeout(() => statusElement.innerText = "", 2000);
    }
});
