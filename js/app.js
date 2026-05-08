// webOS TV Advanced Navigation Logic
document.addEventListener('DOMContentLoaded', async () => {
    // States
    const STATES = {
        CAROUSEL: 'CAROUSEL',
        ACTION_MODAL: 'ACTION_MODAL',
        DETAILS: 'DETAILS',
        SERVER_MODAL: 'SERVER_MODAL',
        PLAYER: 'PLAYER'
    };
    let currentState = STATES.CAROUSEL;

    // DOM Elements
    const statusElement = document.getElementById('status');
    const carouselElement = document.getElementById('carousel');
    const heroBg = document.getElementById('hero-bg');
    const heroTitle = document.getElementById('hero-title');
    const heroSubtitle = document.getElementById('hero-subtitle');
    
    // Action Modal Elements
    const actionModal = document.getElementById('action-modal');
    const btnActionPlay = document.getElementById('btn-action-play');
    const btnActionDetails = document.getElementById('btn-action-details');
    
    // Details Elements
    const detailsView = document.getElementById('details-view');
    const detailsCover = document.getElementById('details-cover');
    const detailsTitle = document.getElementById('details-title');
    const detailsSynopsis = document.getElementById('details-synopsis');
    const detailsEpisodesContainer = document.getElementById('details-episodes');

    // Server Modal Elements
    const serverModal = document.getElementById('server-modal');
    const serverButtonsContainer = document.getElementById('server-buttons');

    // Player Elements
    const playerOverlay = document.getElementById('player-overlay');
    const videoFrame = document.getElementById('video-frame');
    const playerTitle = document.getElementById('player-title');
    
    // Data & Navigation State
    let episodesData = [];
    let carouselIdx = 0;
    
    let actionModalIdx = 0; // 0 = Reproducir, 1 = Mas Episodios
    let targetEpisodeUrl = ""; // Used to track which episode to play or fetch details for
    
    let detailEpisodesData = [];
    let detailIdx = 0;
    
    let serverButtons = [];
    let serverIdx = 0;

    // Initialize clock
    setInterval(() => {
        const now = new Date();
        document.getElementById('clock').innerText = now.toLocaleTimeString('es-ES', {hour: '2-digit', minute:'2-digit'});
    }, 1000);

    // Initial Fetch
    fetchLatest();

    async function fetchLatest() {
        statusElement.innerText = "Conectando al servidor local...";
        try {
            const response = await fetch('http://localhost:3000/api/latest');
            const result = await response.json();
            if (result.success && result.data) {
                episodesData = result.data;
                renderCarousel();
                updateFocusCarousel(0);
                statusElement.innerText = "";
            }
        } catch (e) {
            statusElement.innerText = "Error de conexión con el backend.";
        }
    }

    // --- CAROUSEL ---
    function renderCarousel() {
        carouselElement.innerHTML = '';
        episodesData.forEach((ep, index) => {
            const card = document.createElement('div');
            card.className = 'card focusable';
            card.style.backgroundImage = `url('${ep.image}')`;
            card.innerHTML = `
                <div class="card-info">
                    <div class="card-episode">${ep.episode}</div>
                    <div class="card-title">${ep.title}</div>
                </div>
            `;
            carouselElement.appendChild(card);
        });
    }

    function updateFocusCarousel(idx) {
        if (idx < 0) idx = 0;
        if (idx >= episodesData.length) idx = episodesData.length - 1;
        carouselIdx = idx;

        document.querySelectorAll('#carousel .card').forEach((el, i) => {
            if (i === idx) el.classList.add('focused');
            else el.classList.remove('focused');
        });

        // Scroll carousel
        const cardWidth = 310;
        const offset = carouselIdx * cardWidth;
        carouselElement.style.transform = `translateX(-${Math.max(0, offset - 300)}px)`;
        
        // Update Hero
        const ep = episodesData[carouselIdx];
        if (ep) {
            heroBg.style.backgroundImage = `url('${ep.image}')`;
            heroTitle.innerText = ep.title;
            heroSubtitle.innerText = ep.episode;
        }
    }

    // --- ACTION MODAL ---
    function openActionModal() {
        currentState = STATES.ACTION_MODAL;
        targetEpisodeUrl = episodesData[carouselIdx].url;
        actionModal.classList.remove('hidden');
        updateFocusActionModal(0);
    }
    
    function closeActionModal() {
        actionModal.classList.add('hidden');
        currentState = STATES.CAROUSEL;
        updateFocusCarousel(carouselIdx);
    }

    function updateFocusActionModal(idx) {
        if (idx < 0) idx = 0;
        if (idx > 1) idx = 1;
        actionModalIdx = idx;
        btnActionPlay.classList.toggle('focused', idx === 0);
        btnActionDetails.classList.toggle('focused', idx === 1);
    }

    // --- DETAILS VIEW ---
    async function openDetailsView() {
        statusElement.innerText = "Cargando detalles...";
        try {
            const res = await fetch(`http://localhost:3000/api/anime-details?url=${encodeURIComponent(targetEpisodeUrl)}`);
            const result = await res.json();
            if (result.success && result.data) {
                const data = result.data;
                detailsTitle.innerText = data.title;
                detailsSynopsis.innerText = data.synopsis || "Sin sinopsis.";
                detailsCover.src = data.cover;
                
                detailEpisodesData = data.episodes;
                detailsEpisodesContainer.innerHTML = '';
                
                detailEpisodesData.forEach((ep, i) => {
                    const btn = document.createElement('button');
                    btn.className = 'modal-btn episode-btn';
                    btn.innerHTML = `<span>Episodio ${ep.episode}</span>`;
                    detailsEpisodesContainer.appendChild(btn);
                });
                
                detailsView.classList.remove('hidden');
                currentState = STATES.DETAILS;
                updateFocusDetails(0);
                statusElement.innerText = "";
            }
        } catch (e) {
            statusElement.innerText = "Error cargando detalles.";
        }
    }

    function closeDetailsView() {
        detailsView.classList.add('hidden');
        closeActionModal(); // Return to carousel
    }

    function updateFocusDetails(idx) {
        if (idx < 0) idx = 0;
        if (idx >= detailEpisodesData.length) idx = detailEpisodesData.length - 1;
        detailIdx = idx;

        const btns = detailsEpisodesContainer.querySelectorAll('.episode-btn');
        btns.forEach((el, i) => {
            if (i === idx) {
                el.classList.add('focused');
                // Scroll into view
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } else {
                el.classList.remove('focused');
            }
        });
    }

    // --- SERVER MODAL ---
    async function openServerModal(episodeUrl) {
        statusElement.innerText = "Buscando servidores...";
        try {
            const res = await fetch(`http://localhost:3000/api/servers?url=${encodeURIComponent(episodeUrl)}`);
            const json = await res.json();
            if (json.success && json.servers.length > 0) {
                serverButtonsContainer.innerHTML = '';
                serverButtons = json.servers;
                
                serverButtons.forEach((s, i) => {
                    const btn = document.createElement('button');
                    btn.className = 'modal-btn';
                    btn.innerText = s.title;
                    serverButtonsContainer.appendChild(btn);
                });
                
                serverModal.classList.remove('hidden');
                currentState = STATES.SERVER_MODAL;
                updateFocusServer(0);
                statusElement.innerText = "";
            } else {
                statusElement.innerText = "No hay servidores disponibles.";
            }
        } catch (e) {
            statusElement.innerText = "Error buscando servidores.";
        }
    }

    function closeServerModal() {
        serverModal.classList.add('hidden');
        // Go back to where we came from
        if (!detailsView.classList.contains('hidden')) {
            currentState = STATES.DETAILS;
            updateFocusDetails(detailIdx);
        } else if (!actionModal.classList.contains('hidden')) {
            currentState = STATES.ACTION_MODAL;
            updateFocusActionModal(actionModalIdx);
        } else {
            currentState = STATES.CAROUSEL;
            updateFocusCarousel(carouselIdx);
        }
    }

    function updateFocusServer(idx) {
        if (idx < 0) idx = 0;
        if (idx >= serverButtons.length) idx = serverButtons.length - 1;
        serverIdx = idx;

        const btns = serverButtonsContainer.querySelectorAll('.modal-btn');
        btns.forEach((el, i) => {
            if (i === idx) el.classList.add('focused');
            else el.classList.remove('focused');
        });
    }

    // --- PLAYER ---
    function openPlayer(serverCode) {
        videoFrame.src = serverCode;
        playerOverlay.classList.remove('hidden');
        currentState = STATES.PLAYER;
    }

    function closePlayer() {
        playerOverlay.classList.add('hidden');
        videoFrame.src = "";
        closeServerModal(); // Close server modal and return to previous state
    }

    // --- KEY HANDLING ---
    document.addEventListener('keydown', (e) => {
        const KEY_LEFT = 37;
        const KEY_UP = 38;
        const KEY_RIGHT = 39;
        const KEY_DOWN = 40;
        const KEY_ENTER = 13;
        const KEY_ESC = 27;
        const KEY_BACK = 461; // LG Magic Remote Back

        const isBack = e.keyCode === KEY_ESC || e.keyCode === KEY_BACK;

        switch (currentState) {
            case STATES.CAROUSEL:
                if (e.keyCode === KEY_LEFT) updateFocusCarousel(carouselIdx - 1);
                else if (e.keyCode === KEY_RIGHT) updateFocusCarousel(carouselIdx + 1);
                else if (e.keyCode === KEY_ENTER) openActionModal();
                break;
                
            case STATES.ACTION_MODAL:
                if (isBack) closeActionModal();
                else if (e.keyCode === KEY_UP) updateFocusActionModal(actionModalIdx - 1);
                else if (e.keyCode === KEY_DOWN) updateFocusActionModal(actionModalIdx + 1);
                else if (e.keyCode === KEY_ENTER) {
                    if (actionModalIdx === 0) {
                        // Reproducir
                        openServerModal(targetEpisodeUrl);
                    } else {
                        // Más Episodios
                        openDetailsView();
                    }
                }
                break;
                
            case STATES.DETAILS:
                if (isBack) closeDetailsView();
                else if (e.keyCode === KEY_UP) updateFocusDetails(detailIdx - 1);
                else if (e.keyCode === KEY_DOWN) updateFocusDetails(detailIdx + 1);
                else if (e.keyCode === KEY_ENTER) {
                    openServerModal(detailEpisodesData[detailIdx].url);
                }
                break;
                
            case STATES.SERVER_MODAL:
                if (isBack) closeServerModal();
                else if (e.keyCode === KEY_UP || e.keyCode === KEY_LEFT) updateFocusServer(serverIdx - 1);
                else if (e.keyCode === KEY_DOWN || e.keyCode === KEY_RIGHT) updateFocusServer(serverIdx + 1);
                else if (e.keyCode === KEY_ENTER) {
                    openPlayer(serverButtons[serverIdx].code);
                }
                break;
                
            case STATES.PLAYER:
                if (isBack) closePlayer();
                break;
        }
    });
});
