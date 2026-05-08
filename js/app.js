// webOS TV Advanced Navigation Logic
document.addEventListener('DOMContentLoaded', async () => {
    // States
    const STATES = {
        CAROUSEL: 'CAROUSEL',
        ACTION_MODAL: 'ACTION_MODAL',
        DETAILS: 'DETAILS',
        SERVER_MODAL: 'SERVER_MODAL',
        PLAYER: 'PLAYER',
        SEARCH: 'SEARCH'
    };
    let currentState = STATES.CAROUSEL;

    // DOM Elements
    const statusElement = document.getElementById('status');
    const carouselElement = document.getElementById('carousel');
    const heroBg = document.getElementById('hero-bg');
    const heroTitle = document.getElementById('hero-title');
    const heroSubtitle = document.getElementById('hero-subtitle');
    
    // Header Elements
    const searchBtn = document.getElementById('btn-search');
    
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

    // Search Elements
    const searchView = document.getElementById('search-view');
    const searchInput = document.getElementById('search-input');
    const searchResultsContainer = document.getElementById('search-results');

    // Player Elements
    const playerOverlay = document.getElementById('player-overlay');
    const videoFrame = document.getElementById('video-frame');
    const playerTitle = document.getElementById('player-title');
    
    // Data & Navigation State
    let episodesData = [];
    let carouselIdx = 0;
    let isHeaderFocused = false; // To track if we are in search button
    
    let actionModalIdx = 0; // 0 = Reproducir, 1 = Mas Episodios
    let targetEpisodeUrl = ""; // Used to track which episode to play or fetch details for
    
    let detailEpisodesData = [];
    let detailIdx = 0;
    
    let serverButtons = [];
    let serverIdx = 0;

    let searchResultsData = [];
    let searchGridIdx = 0;

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
        
        isHeaderFocused = false;
        searchBtn.classList.remove('focused');
    }

    function focusHeader() {
        isHeaderFocused = true;
        document.querySelectorAll('#carousel .card').forEach(el => el.classList.remove('focused'));
        searchBtn.classList.add('focused');
    }

    // --- SEARCH ---
    function openSearchView() {
        currentState = STATES.SEARCH;
        searchView.classList.remove('hidden');
        searchResultsContainer.innerHTML = '';
        searchResultsData = [];
        searchInput.value = '';
        searchInput.focus(); // Opens virtual keyboard on webOS
    }

    function closeSearchView() {
        searchView.classList.add('hidden');
        currentState = STATES.CAROUSEL;
        focusHeader();
    }

    async function performSearch(query) {
        if (!query) return;
        statusElement.innerText = `Buscando "${query}"...`;
        try {
            const res = await fetch(`http://localhost:3000/api/search?q=${encodeURIComponent(query)}`);
            const result = await res.json();
            if (result.success && result.data) {
                searchResultsData = result.data;
                renderSearchResults();
                if (searchResultsData.length > 0) {
                    searchInput.blur(); // Close keyboard
                    updateFocusSearchGrid(0);
                } else {
                    statusElement.innerText = "No se encontraron resultados.";
                }
            }
        } catch (e) {
            statusElement.innerText = "Error en la búsqueda.";
        }
    }

    function renderSearchResults() {
        searchResultsContainer.innerHTML = '';
        searchResultsData.forEach((anime, index) => {
            const card = document.createElement('div');
            card.className = 'card';
            card.style.backgroundImage = `url('${anime.image}')`;
            card.innerHTML = `
                <div class="card-info">
                    <div class="card-title">${anime.title}</div>
                </div>
            `;
            searchResultsContainer.appendChild(card);
        });
        statusElement.innerText = `${searchResultsData.length} resultados encontrados.`;
    }

    function updateFocusSearchGrid(idx) {
        if (idx < 0) idx = 0;
        if (idx >= searchResultsData.length) idx = searchResultsData.length - 1;
        searchGridIdx = idx;

        const cards = searchResultsContainer.querySelectorAll('.card');
        cards.forEach((el, i) => {
            if (i === idx) {
                el.classList.add('focused');
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } else {
                el.classList.remove('focused');
            }
        });
        
        // When focused on grid, input is not focused
        if (idx >= 0) searchInput.blur();
    }

    // --- ACTION MODAL ---
    function openActionModal(url) {
        currentState = STATES.ACTION_MODAL;
        targetEpisodeUrl = url;
        actionModal.classList.remove('hidden');
        updateFocusActionModal(0);
    }
    
    function closeActionModal() {
        actionModal.classList.add('hidden');
        if (detailsView.classList.contains('hidden')) {
            if (!searchView.classList.contains('hidden')) {
                currentState = STATES.SEARCH;
                updateFocusSearchGrid(searchGridIdx);
            } else {
                currentState = STATES.CAROUSEL;
                updateFocusCarousel(carouselIdx);
            }
        }
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
                actionModal.classList.add('hidden');
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
        if (!searchView.classList.contains('hidden')) {
            currentState = STATES.SEARCH;
            updateFocusSearchGrid(searchGridIdx);
        } else {
            closeActionModal();
        }
    }

    function updateFocusDetails(idx) {
        if (idx < 0) idx = 0;
        if (idx >= detailEpisodesData.length) idx = detailEpisodesData.length - 1;
        detailIdx = idx;

        const btns = detailsEpisodesContainer.querySelectorAll('.episode-btn');
        btns.forEach((el, i) => {
            if (i === idx) {
                el.classList.add('focused');
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
        if (!detailsView.classList.contains('hidden')) {
            currentState = STATES.DETAILS;
            updateFocusDetails(detailIdx);
        } else if (!actionModal.classList.contains('hidden')) {
            currentState = STATES.ACTION_MODAL;
            updateFocusActionModal(actionModalIdx);
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
        let videoUrl = serverCode;
        if (videoUrl.includes('?')) {
            if (!videoUrl.includes('autoplay=')) videoUrl += '&autoplay=1';
        } else {
            videoUrl += '?autoplay=1';
        }

        videoFrame.src = videoUrl;
        playerOverlay.classList.remove('hidden');
        currentState = STATES.PLAYER;
    }

    function closePlayer() {
        playerOverlay.classList.add('hidden');
        videoFrame.src = "";
        closeServerModal();
    }

    // --- KEY HANDLING ---
    document.addEventListener('keydown', (e) => {
        const KEY_LEFT = 37;
        const KEY_UP = 38;
        const KEY_RIGHT = 39;
        const KEY_DOWN = 40;
        const KEY_ENTER = 13;
        const KEY_ESC = 27;
        const KEY_BACK = 461;

        const isBack = e.keyCode === KEY_ESC || e.keyCode === KEY_BACK;

        switch (currentState) {
            case STATES.CAROUSEL:
                if (isHeaderFocused) {
                    if (e.keyCode === KEY_DOWN) updateFocusCarousel(carouselIdx);
                    else if (e.keyCode === KEY_ENTER) openSearchView();
                } else {
                    if (e.keyCode === KEY_LEFT) updateFocusCarousel(carouselIdx - 1);
                    else if (e.keyCode === KEY_RIGHT) updateFocusCarousel(carouselIdx + 1);
                    else if (e.keyCode === KEY_UP) focusHeader();
                    else if (e.keyCode === KEY_ENTER) openActionModal(episodesData[carouselIdx].url);
                }
                break;
                
            case STATES.SEARCH:
                if (isBack) {
                    e.preventDefault();
                    closeSearchView();
                } else if (e.keyCode === KEY_ENTER) {
                    if (document.activeElement === searchInput) {
                        performSearch(searchInput.value);
                    } else if (searchResultsData.length > 0) {
                        targetEpisodeUrl = searchResultsData[searchGridIdx].url;
                        openDetailsView();
                    }
                } else if (e.keyCode === KEY_UP) {
                    if (searchGridIdx < 6) searchInput.focus();
                    else updateFocusSearchGrid(searchGridIdx - 6);
                } else if (e.keyCode === KEY_DOWN) {
                    if (document.activeElement === searchInput) {
                        if (searchResultsData.length > 0) updateFocusSearchGrid(0);
                    } else {
                        updateFocusSearchGrid(searchGridIdx + 6);
                    }
                } else if (e.keyCode === KEY_LEFT) {
                    if (document.activeElement !== searchInput) updateFocusSearchGrid(searchGridIdx - 1);
                } else if (e.keyCode === KEY_RIGHT) {
                    if (document.activeElement !== searchInput) updateFocusSearchGrid(searchGridIdx + 1);
                }
                break;

            case STATES.ACTION_MODAL:
                if (isBack) { e.preventDefault(); closeActionModal(); }
                else if (e.keyCode === KEY_UP) updateFocusActionModal(actionModalIdx - 1);
                else if (e.keyCode === KEY_DOWN) updateFocusActionModal(actionModalIdx + 1);
                else if (e.keyCode === KEY_ENTER) {
                    if (actionModalIdx === 0) openServerModal(targetEpisodeUrl);
                    else openDetailsView();
                }
                break;
                
            case STATES.DETAILS:
                if (isBack) { e.preventDefault(); closeDetailsView(); }
                else if (e.keyCode === KEY_UP) updateFocusDetails(detailIdx - 1);
                else if (e.keyCode === KEY_DOWN) updateFocusDetails(detailIdx + 1);
                else if (e.keyCode === KEY_ENTER) openServerModal(detailEpisodesData[detailIdx].url);
                break;
                
            case STATES.SERVER_MODAL:
                if (isBack) { e.preventDefault(); closeServerModal(); }
                else if (e.keyCode === KEY_UP || e.keyCode === KEY_LEFT) updateFocusServer(serverIdx - 1);
                else if (e.keyCode === KEY_DOWN || e.keyCode === KEY_RIGHT) updateFocusServer(serverIdx + 1);
                else if (e.keyCode === KEY_ENTER) openPlayer(serverButtons[serverIdx].code);
                break;
                
            case STATES.PLAYER:
                if (isBack) { e.preventDefault(); closePlayer(); }
                break;
        }
    });
});
