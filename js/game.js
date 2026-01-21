/**
 * INFILTRA - Game Logic v0.9.8.9
 * Correcciones:
 * - QR centrado con instrucciones
 * - Mensaje de inicio de ronda más visible y persistente
 * - Mensaje "Has sido expulsado" primero
 * - Avatares con marco en resultados de votación
 * - Resultados de expulsión centrados con icono de rol
 * - Lista de jugadores lateral durante rondas
 * - Botones host diferenciados (Iniciar vs Siguiente)
 * - Prevención de multi-click en iniciar ronda
 * - Pantalla de fin de juego mejorada
 * - Ordenamiento por puntos con medallas
 * - Botón kick con icono
 */

const ICONS = {
    citizen: 'assets/icons/icon-citizen.png',
    impostor: 'assets/icons/icon-impostor.png',
    charlatan: 'assets/icons/icon-charlatan.png',
    help: 'assets/icons/icon-help.png',
    check: 'assets/icons/icon-check.png',
    close: 'assets/icons/icon-close.png',
    kick: 'assets/icons/icon-kick.png',
    lock: 'assets/icons/icon-lock.png',
    active: 'assets/icons/icon-active.png',
    eliminated: 'assets/icons/icon-eliminated.png',
    voted: 'assets/icons/icon-voted.png',
    pending: 'assets/icons/icon-pending.png',
    tie: 'assets/icons/icon-tie.png',
    celebrate: 'assets/icons/icon-celebrate.png',
    medalGold: 'assets/icons/icon-medal-gold.png',
    medalSilver: 'assets/icons/icon-medal-silver.png',
    medalBronze: 'assets/icons/icon-medal-bronze.png',
    warning: 'assets/icons/icon-warning.png',
    soundOn: 'assets/icons/icon-sound-on.png',
    soundOff: 'assets/icons/icon-sound-off.png',
    play: 'assets/icons/icon-play.png'
};

const POINTS = {
    CITIZEN_SURVIVE: 15,
    CITIZEN_CORRECT_VOTE: 7,
    CITIZEN_WRONG_VOTE: -3,
    IMPOSTOR_WIN: 30,
    IMPOSTOR_SURVIVE_ROUND: 5,
    CHARLATAN_SURVIVE: 25
};

const DB = {
    "Animales": ["León", "Tigre", "Elefante", "Zebra", "Delfín", "Lobo", "Gorila", "Águila", "Jirafa", "Oso", "Zorro", "Panda", "Tiburón", "Canguro", "Hipopótamo", "Serpiente", "Cocodrilo", "Pájaro", "Mono", "Tortuga"],
    "Comida": ["Pizza", "Tacos", "Sushi", "Hamburguesa", "Pasta", "Ensalada", "Helado", "Pollo", "Pescado", "Chocolate", "Empanadas", "Ramen", "Curry", "Paella", "Burrito", "Croissant", "Queso", "Arroz", "Sopa", "Tarta"],
    "Países": ["México", "Japón", "Brasil", "España", "Francia", "Italia", "Alemania", "Australia", "Argentina", "Canadá", "China", "India", "Rusia", "Estados Unidos", "Reino Unido", "Sudáfrica", "Egipto", "Nueva Zelanda", "Corea del Sur", "Turquía"],
    "Profesiones": ["Médico", "Abogado", "Ingeniero", "Profesor", "Chef", "Piloto", "Arquitecto", "Programador", "Fotógrafo", "Enfermero", "Diseñador", "Periodista", "Músico", "Actor", "Científico", "Veterinario", "Contador", "Psicólogo", "Bombero", "Policía"],
    "Deportes": ["Fútbol", "Baloncesto", "Tenis", "Natación", "Boxeo", "Golf", "Voleibol", "Surf", "Ciclismo", "Atletismo", "Esquí", "Karate", "Béisbol", "Rugby", "Gimnasia", "Escalada", "Patinaje", "Hockey"],
    "Ciudades": ["París", "Tokio", "Nueva York", "Londres", "Roma", "Berlín", "Madrid", "Dubai", "Barcelona", "México DF", "Sídney", "Río de Janeiro", "Los Ángeles", "Toronto", "Estambul", "Singapur", "Ámsterdam", "Seúl"],
    "Frutas": ["Manzana", "Banana", "Naranja", "Uva", "Fresa", "Piña", "Mango", "Sandía", "Kiwi", "Melón", "Pera", "Durazno", "Cereza", "Limón", "Papaya", "Granada", "Coco", "Mora"],
    "Vehículos": ["Coche", "Bicicleta", "Avión", "Barco", "Tren", "Helicóptero", "Motocicleta", "Camión", "Submarino", "Cohete", "Autobús", "Patineta", "Tractor", "Yate"],
    "Instrumentos": ["Guitarra", "Piano", "Batería", "Violín", "Flauta", "Trompeta", "Saxofón", "Arpa", "Bajo", "Ukelele", "Acordeón", "Cello", "Clarinete", "Órgano"],
    "Películas": ["Titanic", "Star Wars", "Avatar", "Frozen", "Shrek", "Batman", "Avengers", "Coco", "Inception", "The Matrix", "Jurassic Park", "Harry Potter", "Toy Story"],
    "Colores": ["Rojo", "Azul", "Verde", "Amarillo", "Naranja", "Morado", "Rosa", "Negro", "Blanco", "Gris", "Turquesa", "Violeta", "Dorado", "Plateado"],
    "Superhéroes": ["Superman", "Batman", "Spider-Man", "Wonder Woman", "Iron Man", "Captain America", "Thor", "Hulk", "Flash", "Aquaman", "Wolverine", "Deadpool"]
};

const AVATARS = [
    { id: 'avatar-11', image: 'assets/avatars/avatar-11.svg' },
    { id: 'avatar-12', image: 'assets/avatars/avatar-12.svg' },
    { id: 'avatar-13', image: 'assets/avatars/avatar-13.svg' },
    { id: 'avatar-16', image: 'assets/avatars/avatar-16.svg' },
    { id: 'avatar-17', image: 'assets/avatars/avatar-17.svg' }
];

const FRAMES = [
    { id: 'fr-basic', color: '#4a5568', locked: false },
    { id: 'fr-gold', color: '#c9a227', locked: false },
    { id: 'fr-red', color: '#8b2635', locked: false },
    { id: 'fr-purple', color: '#7c3aed', locked: false }
];

const RESULT_DISPLAY_TIME = 5000;
const ROUND_START_DISPLAY_TIME = 3500;

let G = {
    pubnub: null,
    channel: null,
    myId: null,
    playerName: '',
    avatar: 'avatar-11',
    frame: 'fr-basic',
    isHost: false,
    hostId: null,
    maxPlayers: 10,
    roundTime: 60,
    selectedCategories: Object.keys(DB),
    players: {},
    activePlayers: [],
    eliminated: [],
    impostors: [],
    charlatans: [],
    citizens: [],
    myRole: null,
    fullRoles: {},
    trueRoles: {},
    scores: {},
    usedWords: [],
    currentCategory: null,
    currentSecretWord: null,
    currentFakeWord: null,
    starterPlayerId: null,
    gamePhase: 'home',
    isSpectator: false,
    votes: {},
    votedPlayers: new Set(),
    voteTargets: {},
    timerInterval: null,
    voteTimerInterval: null,
    refreshInterval: null,
    voteTimeout: null,
    spectatorTimerInterval: null,
    soundEnabled: true,
    screenStack: [],
    roleRevealed: false,
    isFirstRound: true,
    roundStarting: false,
    roundInProgress: false
};

document.addEventListener('DOMContentLoaded', init);

function init() {
    G.myId = sessionStorage.getItem('infiltra_myId');
    if (!G.myId) {
        G.myId = 'P-' + Date.now() + '-' + Math.floor(Math.random() * 10000);
        sessionStorage.setItem('infiltra_myId', G.myId);
    }
    loadProfile();
    initAvatars();
    initFrames();
    initCategories();
    initParticles();
    bindEvents();
    checkURLParams();
    updateProfilePreview();
    createPlayersSidebar();
    console.log('INFILTRA v0.9.8.9 iniciado');
}

function loadProfile() {
    const name = localStorage.getItem('infiltra_name');
    const avatar = localStorage.getItem('infiltra_avatar');
    const frame = localStorage.getItem('infiltra_frame');
    if (name) {
        document.getElementById('input-name').value = name;
        G.playerName = name;
    }
    G.avatar = (avatar && AVATARS.find(a => a.id === avatar)) ? avatar : AVATARS[0].id;
    G.frame = (frame && FRAMES.find(f => f.id === frame)) ? frame : FRAMES[0].id;
    updateProfilePreview();
    saveProfile();
}

function saveProfile() {
    localStorage.setItem('infiltra_name', G.playerName);
    localStorage.setItem('infiltra_avatar', G.avatar);
    localStorage.setItem('infiltra_frame', G.frame);
}

function updateProfilePreview() {
    const previewAvatar = document.getElementById('preview-avatar');
    const previewWrapper = document.getElementById('preview-avatar-wrapper');
    const previewName = document.getElementById('preview-name');
    if (!previewAvatar || !previewWrapper) return;
    const avatar = AVATARS.find(a => a.id === G.avatar) || AVATARS[0];
    previewAvatar.innerHTML = '<img src="' + avatar.image + '" alt="avatar">';
    const frame = FRAMES.find(f => f.id === G.frame);
    if (frame) {
        previewWrapper.style.border = '4px solid ' + frame.color;
        previewWrapper.style.boxShadow = '0 0 15px ' + frame.color + '40';
    }
    if (previewName) previewName.textContent = document.getElementById('input-name')?.value || 'Tu Nombre';
}

function initAvatars() {
    const grid = document.getElementById('avatar-grid');
    if (!grid) return;
    grid.innerHTML = '';
    if (!G.avatar || !AVATARS.find(a => a.id === G.avatar)) G.avatar = AVATARS[0].id;
    AVATARS.forEach(avatar => {
        const div = document.createElement('div');
        div.className = 'avatar-option' + (avatar.id === G.avatar ? ' selected' : '');
        div.innerHTML = '<div class="avatar-img-container"><img src="' + avatar.image + '" alt="' + avatar.id + '"></div><div class="avatar-check">✓</div>';
        div.onclick = function() {
            G.avatar = avatar.id;
            grid.querySelectorAll('.avatar-option').forEach(el => el.classList.remove('selected'));
            div.classList.add('selected');
            updateProfilePreview();
            saveProfile();
        };
        grid.appendChild(div);
    });
}

function initFrames() {
    const grid = document.getElementById('frame-grid');
    if (!grid) return;
    grid.innerHTML = '';
    if (!G.frame || !FRAMES.find(f => f.id === G.frame)) G.frame = FRAMES[0].id;
    FRAMES.forEach(frame => {
        const div = document.createElement('div');
        div.className = 'frame-option-new' + (frame.id === G.frame ? ' selected' : '') + (frame.locked ? ' locked' : '');
        const preview = document.createElement('div');
        preview.className = 'frame-preview';
        preview.style.border = '4px solid ' + frame.color;
        preview.style.boxShadow = '0 0 10px ' + frame.color + '60';
        preview.innerHTML = '<img src="' + ICONS.citizen + '" alt="" class="frame-preview-img">';
        div.appendChild(preview);
        const check = document.createElement('div');
        check.className = 'frame-check';
        check.textContent = '✓';
        div.appendChild(check);
        if (!frame.locked) {
            div.onclick = function() {
                G.frame = frame.id;
                grid.querySelectorAll('.frame-option-new').forEach(el => el.classList.remove('selected'));
                div.classList.add('selected');
                updateProfilePreview();
                saveProfile();
            };
        }
        grid.appendChild(div);
    });
}

function initCategories() {
    const list = document.getElementById('categories-list');
    if (!list) return;
    list.innerHTML = Object.keys(DB).map(cat => 
        '<div class="category-item"><input type="checkbox" id="cat-' + cat + '" value="' + cat + '" checked><label for="cat-' + cat + '">' + cat + '</label></div>'
    ).join('');
}

function updateSelectedCategories() {
    G.selectedCategories = Array.from(document.querySelectorAll('.category-item input:checked')).map(cb => cb.value);
}

function initParticles() {
    const container = document.getElementById('particles');
    if (!container) return;
    for (let i = 0; i < 40; i++) {
        const p = document.createElement('div');
        p.className = 'particle';
        p.style.left = Math.random() * 100 + '%';
        p.style.top = Math.random() * 100 + '%';
        p.style.animationDelay = Math.random() * 5 + 's';
        container.appendChild(p);
    }
}

function createPlayersSidebar() {
    if (document.getElementById('players-sidebar')) return;
    const sidebar = document.createElement('div');
    sidebar.id = 'players-sidebar';
    sidebar.className = 'players-sidebar';
    sidebar.innerHTML = '<div class="players-sidebar-title">Jugadores</div><div class="players-sidebar-list" id="sidebar-players-list"></div>';
    document.body.appendChild(sidebar);
}

function updatePlayersSidebar() {
    const list = document.getElementById('sidebar-players-list');
    if (!list) return;
    
    let html = '';
    
    // Activos primero (con icono active)
    G.activePlayers.forEach(id => {
        const p = G.players[id];
        const avatar = renderPlayerAvatar(id, 32);
        html += '<div class="sidebar-player">' +
            '<div class="sidebar-player-avatar">' + avatar + '</div>' +
            '<span class="sidebar-player-name">' + (p?.name || id.substring(0,8)) + '</span>' +
            '<img src="' + ICONS.active + '" alt="" class="player-status-icon">' +
            '</div>';
    });
    
    // Eliminados (opacidad + icono)
    G.eliminated.forEach(id => {
        const p = G.players[id];
        const avatar = renderPlayerAvatar(id, 32);
        html += '<div class="sidebar-player eliminated">' +
            '<div class="sidebar-player-avatar">' + avatar + '</div>' +
            '<span class="sidebar-player-name">' + (p?.name || id.substring(0,8)) + '</span>' +
            '<img src="' + ICONS.eliminated + '" alt="" class="player-status-icon">' +
            '</div>';
    });
    
    list.innerHTML = html;
}

function showPlayersSidebar() {
    const sidebar = document.getElementById('players-sidebar');
    if (sidebar) {
        updatePlayersSidebar();
        sidebar.classList.add('visible');
    }
}

function hidePlayersSidebar() {
    const sidebar = document.getElementById('players-sidebar');
    if (sidebar) sidebar.classList.remove('visible');
}

function bindEvents() {
    const bind = (id, fn) => {
        const el = document.getElementById(id);
        if (el) el.onclick = fn;
    };
    bind('btn-show-config', showConfig);
    bind('btn-back-home', function() { showScreen('screen-home'); });
    bind('btn-join-room', joinRoom);
    bind('btn-create-room', createRoom);
    bind('btn-leave-room', leaveRoom);
    bind('btn-distribute', distributeRoles);
    bind('btn-start-round', startRound);
    bind('btn-skip-word', skipWord);
    bind('btn-next-round', nextRound);
    bind('btn-back-lobby', backToLobby);
    bind('btn-back-to-lobby', backToLobby);
    bind('btn-exit-game', exitGame);
    bind('btn-spectator-next', spectatorNextAction);
    bind('btn-spectator-lobby', backToLobby);
    bind('role-card', revealRole);
    bind('btn-leave-role', leaveRoom);
    bind('btn-leave-voting', leaveRoom);
    bind('btn-leave-results', leaveRoom);
    bind('btn-leave-spectator', leaveRoom);
    bind('btn-cat-all', function() {
        document.querySelectorAll('.category-item input').forEach(cb => cb.checked = true);
        updateSelectedCategories();
    });
    bind('btn-cat-none', function() {
        document.querySelectorAll('.category-item input').forEach(cb => cb.checked = false);
        updateSelectedCategories();
    });
    bind('btn-sound', function() {
        G.soundEnabled = !G.soundEnabled;
        const btn = document.getElementById('btn-sound');
        if (btn) {
            btn.querySelector('img').src = G.soundEnabled ? ICONS.soundOn : ICONS.soundOff;
            btn.classList.toggle('muted', !G.soundEnabled);
        }
    });
    bind('btn-help', function() {
        const current = document.querySelector('.screen.active')?.id || 'screen-home';
        if (current !== 'screen-help') G.screenStack.push(current);
        showScreen('screen-help');
    });
    bind('btn-help-back', function() {
        showScreen(G.screenStack.pop() || 'screen-home');
    });
    const nameInput = document.getElementById('input-name');
    if (nameInput) nameInput.addEventListener('input', updateProfilePreview);
}

function checkURLParams() {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code') || params.get('room');
    if (code) {
        const input = document.getElementById('input-join-code');
        if (input) {
            input.value = code.toUpperCase();
            toast('Código detectado');
        }
    }
}

function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const screen = document.getElementById(id);
    if (screen) screen.classList.add('active');
    
    if (id === 'screen-role' || id === 'screen-voting') {
        showPlayersSidebar();
    } else {
        hidePlayersSidebar();
    }
}

function showConfig() {
    G.playerName = document.getElementById('input-name')?.value.trim() || '';
    if (!G.playerName) {
        toast('Ingresa tu nombre', 'error');
        return;
    }
    saveProfile();
    showScreen('screen-config');
}

function createRoom() {
    updateSelectedCategories();
    if (G.selectedCategories.length === 0) {
        toast('Selecciona categorías', 'error');
        return;
    }
    G.isHost = true;
    G.hostId = G.myId;
    G.maxPlayers = Math.min(parseInt(document.getElementById('config-max-players')?.value) || 10, 10);
    G.roundTime = parseInt(document.getElementById('config-time')?.value) || 60;
    G.channel = generateCode();
    G.scores = {};
    G.usedWords = [];
    G.isFirstRound = true;
    G.gamePhase = 'lobby';
    initPubNub();
}

function joinRoom() {
    G.playerName = document.getElementById('input-name')?.value.trim() || '';
    if (!G.playerName) {
        toast('Ingresa tu nombre', 'error');
        return;
    }
    const code = (document.getElementById('input-join-code')?.value || '').toUpperCase().trim();
    if (code.length !== 4) {
        toast('Código de 4 letras', 'error');
        return;
    }
    saveProfile();
    G.isHost = false;
    G.channel = code;
    G.gamePhase = 'lobby';
    initPubNub();
}

function generateCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    let code = '';
    for (let i = 0; i < 4; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    return code;
}

function initPubNub() {
    clearAllTimers();
    if (G.pubnub) {
        G.pubnub.unsubscribeAll();
        G.pubnub = null;
    }
    G.pubnub = new PubNub({
        publishKey: 'demo',
        subscribeKey: 'demo',
        userId: G.myId
    });
    G.pubnub.addListener({
        status: onStatus,
        message: onMessage,
        presence: onPresence
    });
    G.pubnub.subscribe({
        channels: [G.channel],
        withPresence: true
    });
}

function onStatus(status) {
    if (status.category === 'PNConnectedCategory') {
        setPlayerState();
        document.getElementById('display-room-code').textContent = G.channel;
        showScreen('screen-lobby');
        generateQR();
        if (G.isHost) {
            document.getElementById('btn-distribute').style.display = 'block';
            setTimeout(publishConfig, 300);
        } else {
            setTimeout(requestSync, 500);
        }
        setTimeout(refreshPlayers, 500);
        G.refreshInterval = setInterval(refreshPlayers, 3000);
    } else if (status.error) {
        toast('Error de conexión', 'error');
    }
}

function onMessage(event) {
    const msg = event.message;
    const sender = event.publisher;
    switch (msg.type) {
        case 'config':
            G.maxPlayers = Math.min(msg.maxPlayers, 10);
            G.roundTime = msg.roundTime;
            G.hostId = msg.hostId;
            G.isHost = (G.myId === G.hostId);
            if (msg.usedWords) G.usedWords = msg.usedWords;
            if (msg.scores) G.scores = msg.scores;
            renderPlayerList();
            break;
        case 'player_state':
            const currentCount = Object.keys(G.players).length;
            if (!G.players[sender] && currentCount >= G.maxPlayers && sender !== G.myId) {
                if (G.isHost) {
                    G.pubnub.publish({ channel: G.channel, message: { type: 'room_full', targetId: sender } });
                }
                return;
            }
            G.players[sender] = { name: msg.name, avatar: msg.avatar, frame: msg.frame };
            if (G.scores[sender] === undefined) G.scores[sender] = 0;
            renderPlayerList();
            break;
        case 'assign':
            handleAssign(msg);
            break;
        case 'start_round':
            handleStartRound(msg);
            break;
        case 'vote':
            handleVote(sender, msg.target);
            break;
        case 'vote_update':
            G.votes = msg.votes;
            G.votedPlayers = new Set(msg.voted);
            if (G.isSpectator) updateSpectatorVotes();
            break;
        case 'results':
            showResults(msg);
            break;
        case 'next_round':
            handleNextRound(msg);
            break;
        case 'back_to_lobby':
            handleBackToLobby(msg);
            break;
        case 'game_over':
            handleGameOver(msg);
            break;
        case 'spectator_roles':
            if (G.isSpectator) {
                G.fullRoles = msg.roles;
                G.activePlayers = msg.activePlayers || G.activePlayers;
                updateSpectatorRoles();
            }
            break;
        case 'host_disconnect':
            toast('Host desconectado', 'error');
            setTimeout(exitGame, 2000);
            break;
        case 'kick_player':
            if (msg.targetId === G.myId) {
                toast('Fuiste expulsado', 'error');
                setTimeout(exitGame, 1500);
            } else {
                delete G.players[msg.targetId];
                delete G.scores[msg.targetId];
                renderPlayerList();
            }
            break;
        case 'skip_word':
            handleSkipWord(msg);
            break;
        case 'request_sync':
            if (G.isHost) publishFullSync();
            break;
        case 'full_sync':
            handleFullSync(msg);
            break;
    }
}

function onPresence(event) {
    if (event.action === 'join' && G.isHost && event.uuid !== G.myId) {
        setTimeout(publishConfig, 500);
    }
    if (event.action === 'leave' || event.action === 'timeout') {
        if (G.gamePhase === 'lobby' || G.gamePhase === 'home') {
            delete G.players[event.uuid];
        } else {
            G.activePlayers = G.activePlayers.filter(id => id !== event.uuid);
            if (!G.eliminated.includes(event.uuid)) G.eliminated.push(event.uuid);
        }
        renderPlayerList();
        updatePlayersSidebar();
    }
    setTimeout(refreshPlayers, 500);
}

function setPlayerState() {
    if (!G.pubnub) return;
    G.pubnub.setState({
        state: { name: G.playerName, avatar: G.avatar, frame: G.frame },
        channels: [G.channel]
    });
    G.pubnub.publish({
        channel: G.channel,
        message: { type: 'player_state', name: G.playerName, avatar: G.avatar, frame: G.frame }
    });
}

function publishConfig() {
    if (!G.pubnub || !G.isHost) return;
    G.pubnub.publish({
        channel: G.channel,
        message: {
            type: 'config',
            maxPlayers: G.maxPlayers,
            roundTime: G.roundTime,
            hostId: G.hostId,
            usedWords: G.usedWords,
            scores: G.scores
        }
    });
}

function requestSync() {
    if (!G.pubnub || G.isHost) return;
    G.pubnub.publish({
        channel: G.channel,
        message: { type: 'request_sync' }
    });
}

function publishFullSync() {
    if (!G.pubnub || !G.isHost) return;
    G.pubnub.publish({
        channel: G.channel,
        message: {
            type: 'full_sync',
            maxPlayers: G.maxPlayers,
            roundTime: G.roundTime,
            hostId: G.hostId,
            usedWords: G.usedWords,
            scores: G.scores,
            gamePhase: G.gamePhase,
            activePlayers: G.activePlayers,
            eliminated: G.eliminated,
            fullRoles: G.fullRoles,
            impostors: G.impostors,
            charlatans: G.charlatans,
            citizens: G.citizens
        }
    });
}

function handleFullSync(msg) {
    if (G.isHost) return;
    G.maxPlayers = Math.min(msg.maxPlayers || 10, 10);
    G.roundTime = msg.roundTime || 60;
    G.hostId = msg.hostId;
    G.isHost = (G.myId === G.hostId);
    G.usedWords = msg.usedWords || [];
    G.scores = msg.scores || {};
    if (msg.gamePhase && msg.gamePhase !== 'lobby') {
        G.gamePhase = msg.gamePhase;
        G.activePlayers = msg.activePlayers || [];
        G.eliminated = msg.eliminated || [];
        G.fullRoles = msg.fullRoles || {};
        G.impostors = msg.impostors || [];
        G.charlatans = msg.charlatans || [];
        G.citizens = msg.citizens || [];
        if (G.eliminated.includes(G.myId)) G.isSpectator = true;
        if (G.fullRoles[G.myId]) G.myRole = G.fullRoles[G.myId];
    }
    renderPlayerList();
}

function generateQR() {
    const container = document.getElementById('qr-container');
    if (!container || typeof qrcode === 'undefined') return;
    const qr = qrcode(0, 'M');
    qr.addData('https://crissarroyo.github.io/infiltra/game.html?code=' + G.channel);
    qr.make();
    container.innerHTML = qr.createImgTag(4) + 
        '<div class="qr-instructions"><strong>Comparte el código de arriba</strong>para que tus amigos se unan</div>';
}

function refreshPlayers() {
    if (!G.pubnub) return;
    G.pubnub.hereNow({
        channels: [G.channel],
        includeState: true
    }, function(status, response) {
        if (response && response.channels && response.channels[G.channel]) {
            const occupants = response.channels[G.channel].occupants;
            const currentIds = occupants.map(o => o.uuid);
            Object.keys(G.players).forEach(id => {
                if (!currentIds.includes(id)) delete G.players[id];
            });
            occupants.forEach(o => {
                if (!G.players[o.uuid]) {
                    G.players[o.uuid] = {
                        name: o.state?.name || o.uuid.substring(0, 8),
                        avatar: o.state?.avatar || 'avatar-11',
                        frame: o.state?.frame || 'fr-basic'
                    };
                } else if (o.state) {
                    G.players[o.uuid].name = o.state.name || G.players[o.uuid].name;
                    G.players[o.uuid].avatar = o.state.avatar || G.players[o.uuid].avatar;
                    G.players[o.uuid].frame = o.state.frame || G.players[o.uuid].frame;
                }
                if (G.scores[o.uuid] === undefined) G.scores[o.uuid] = 0;
            });
            renderPlayerList();
        }
    });
}

function renderPlayerAvatar(playerId, size) {
    size = size || 40;
    const p = G.players[playerId];
    const avatar = AVATARS.find(a => a.id === p?.avatar) || AVATARS[0];
    const frame = FRAMES.find(f => f.id === p?.frame);
    const frameStyle = frame ? 'border:3px solid ' + frame.color + ';' : '';
    return '<img src="' + avatar.image + '" style="width:' + size + 'px;height:' + size + 'px;border-radius:50%;object-fit:cover;' + frameStyle + '">';
}

function renderPlayerList() {
    const list = document.getElementById('player-list');
    const countEl = document.getElementById('player-count');
    if (!list) return;
    
    const playerIds = Object.keys(G.players).sort((a, b) => (G.scores[b] || 0) - (G.scores[a] || 0));
    
    if (countEl) countEl.textContent = playerIds.length + '/' + G.maxPlayers;
    
    let headerHtml = '<div class="player-list-score-header"><span>Jugador</span><span>Puntos</span></div>';
    
    list.innerHTML = headerHtml + playerIds.map((id, index) => {
        const p = G.players[id];
        const isMe = id === G.myId;
        const isHostPlayer = id === G.hostId;
        const score = G.scores[id] || 0;
        
        let rankHtml = '';
        if (index === 0) rankHtml = '<div class="player-rank"><img src="' + ICONS.medalGold + '" alt="1"></div>';
        else if (index === 1) rankHtml = '<div class="player-rank"><img src="' + ICONS.medalSilver + '" alt="2"></div>';
        else if (index === 2) rankHtml = '<div class="player-rank"><img src="' + ICONS.medalBronze + '" alt="3"></div>';
        else rankHtml = '<div class="player-rank"><span class="player-rank-number">' + (index + 1) + '</span></div>';
        
        const kickBtn = (G.isHost && !isMe && (G.gamePhase === 'lobby' || G.gamePhase === 'home')) ?
            '<button class="btn-kick" onclick="kickPlayer(\'' + id + '\')" title="Expulsar"><img src="' + ICONS.kick + '" alt="Kick"></button>' : '';
        
        return '<div class="player-item">' + rankHtml +
            '<div class="player-avatar">' + renderPlayerAvatar(id, 40) + '</div>' +
            '<div class="player-info"><div class="player-name">' + p.name + (isMe ? ' (Tú)' : '') + '</div>' +
            (isHostPlayer ? '<div class="player-tag">Host</div>' : '') + '</div>' +
            '<div class="player-score">' + score + '</div>' + kickBtn + '</div>';
    }).join('');
    
    const btnDistribute = document.getElementById('btn-distribute');
    if (btnDistribute) btnDistribute.style.display = G.isHost ? 'block' : 'none';
}

function kickPlayer(playerId) {
    if (!G.isHost || !G.pubnub) return;
    const playerName = G.players[playerId]?.name || 'Jugador';
    if (confirm('¿Expulsar a ' + playerName + '?')) {
        G.pubnub.publish({
            channel: G.channel,
            message: { type: 'kick_player', targetId: playerId, targetName: playerName }
        });
    }
}
window.kickPlayer = kickPlayer;

function selectNewWord() {
    updateSelectedCategories();
    let availableWords = [];
    G.selectedCategories.forEach(cat => {
        DB[cat].forEach(word => {
            if (!G.usedWords.includes(word)) availableWords.push({ category: cat, word: word });
        });
    });
    if (availableWords.length < 2) {
        G.usedWords = [];
        availableWords = [];
        G.selectedCategories.forEach(cat => {
            DB[cat].forEach(word => {
                availableWords.push({ category: cat, word: word });
            });
        });
        toast('Palabras reiniciadas');
    }
    const secretIdx = Math.floor(Math.random() * availableWords.length);
    const secretData = availableWords[secretIdx];
    G.currentCategory = secretData.category;
    G.currentSecretWord = secretData.word;
    G.usedWords.push(G.currentSecretWord);
    const fakeOptions = availableWords.filter(w => w.word !== G.currentSecretWord);
    G.currentFakeWord = fakeOptions.length > 0 ? fakeOptions[Math.floor(Math.random() * fakeOptions.length)].word : '???';
    if (G.currentFakeWord !== '???') G.usedWords.push(G.currentFakeWord);
    return { category: G.currentCategory, secretWord: G.currentSecretWord, fakeWord: G.currentFakeWord };
}

function distributeRoles() {
    if (!G.pubnub) return;
    const playerIds = Object.keys(G.players);
    if (playerIds.length < 3) {
        toast('Mínimo 3 jugadores', 'error');
        return;
    }
    const numImp = Math.min(parseInt(document.getElementById('config-impostors')?.value) || 1, Math.floor(playerIds.length / 2));
    const numChar = Math.min(parseInt(document.getElementById('config-charlatans')?.value) || 0, playerIds.length - numImp - 1);
    updateSelectedCategories();
    if (G.selectedCategories.length === 0) {
        toast('Selecciona categorías', 'error');
        return;
    }
    const wordData = selectNewWord();
    let roles = {};
    let pool = [...playerIds];
    G.impostors = [];
    G.charlatans = [];
    G.citizens = [];
    for (let i = 0; i < numImp && pool.length; i++) {
        const idx = Math.floor(Math.random() * pool.length);
        const id = pool.splice(idx, 1)[0];
        roles[id] = { role: 'INFILTRADO', icon: ICONS.impostor, word: 'Categoría: ' + wordData.category };
        G.trueRoles[id] = 'INFILTRADO';
        G.impostors.push(id);
    }
    for (let i = 0; i < numChar && pool.length; i++) {
        const idx = Math.floor(Math.random() * pool.length);
        const id = pool.splice(idx, 1)[0];
        roles[id] = { role: 'CIUDADANO', icon: ICONS.citizen, word: wordData.secretWord };
        G.trueRoles[id] = 'CHARLATÁN';
        G.charlatans.push(id);
    }
    pool.forEach(id => {
        roles[id] = { role: 'CIUDADANO', icon: ICONS.citizen, word: wordData.secretWord };
        G.trueRoles[id] = 'CIUDADANO';
        G.citizens.push(id);
    });
    G.activePlayers = [...playerIds];
    G.eliminated = [];
    G.fullRoles = roles;
    G.gamePhase = 'roles';
    G.isFirstRound = true;
    G.starterPlayerId = G.activePlayers[Math.floor(Math.random() * G.activePlayers.length)];
    G.pubnub.publish({
        channel: G.channel,
        message: {
            type: 'assign',
            roles: roles,
            activePlayers: G.activePlayers,
            impostors: G.impostors,
            charlatans: G.charlatans,
            citizens: G.citizens,
            hostId: G.hostId,
            starterPlayerId: G.starterPlayerId,
            usedWords: G.usedWords,
            isFirstRound: true
        }
    });
}

function skipWord() {
    if (!G.isHost || !G.pubnub) return;
    const wordData = selectNewWord();
    Object.keys(G.fullRoles).forEach(id => {
        const role = G.fullRoles[id];
        if (role.role === 'CIUDADANO') role.word = wordData.secretWord;
        else if (role.role === 'CHARLATÁN') role.word = wordData.fakeWord;
        else role.word = 'Categoría: ' + wordData.category;
    });
    G.starterPlayerId = G.activePlayers[Math.floor(Math.random() * G.activePlayers.length)];
    G.pubnub.publish({
        channel: G.channel,
        message: {
            type: 'skip_word',
            roles: G.fullRoles,
            activePlayers: G.activePlayers,
            impostors: G.impostors,
            charlatans: G.charlatans,
            citizens: G.citizens,
            hostId: G.hostId,
            starterPlayerId: G.starterPlayerId,
            usedWords: G.usedWords
        }
    });
}

function handleSkipWord(msg) {
    G.fullRoles = msg.roles;
    G.starterPlayerId = msg.starterPlayerId;
    G.usedWords = msg.usedWords || G.usedWords;
    if (G.fullRoles[G.myId]) G.myRole = G.fullRoles[G.myId];
    G.roleRevealed = false;
    const card = document.getElementById('role-card');
    if (card) card.className = 'role-card blurred';
    document.getElementById('role-icon').innerHTML = '<img src="' + ICONS.help + '" alt="?" class="role-icon-img">';
    document.getElementById('role-title').textContent = 'SECRETO';
    document.getElementById('role-word').textContent = '???';
    document.getElementById('role-instruction').textContent = 'Toca la carta para revelar';
    const starterInfo = document.getElementById('starter-info');
    if (starterInfo) {
        starterInfo.textContent = 'Inicia: ' + (G.players[G.starterPlayerId]?.name || 'Alguien');
        starterInfo.style.display = 'block';
    }
    toast('Palabra cambiada', 'info');
}

function handleAssign(msg) {
    G.activePlayers = msg.activePlayers;
    G.impostors = msg.impostors;
    G.charlatans = msg.charlatans;
    G.citizens = msg.citizens;
    G.fullRoles = msg.roles;
    G.hostId = msg.hostId || G.hostId;
    G.isHost = (G.myId === G.hostId);
    G.starterPlayerId = msg.starterPlayerId;
    G.usedWords = msg.usedWords || G.usedWords;
    G.gamePhase = 'roles';
    G.isSpectator = false;
    G.isFirstRound = msg.isFirstRound !== false;
    if (G.isFirstRound) G.roleRevealed = false;
    const myRoleData = msg.roles[G.myId];
    if (!myRoleData) return;
    G.myRole = myRoleData;
    const card = document.getElementById('role-card');
    const roleIcon = document.getElementById('role-icon');
    const roleTitle = document.getElementById('role-title');
    const roleWord = document.getElementById('role-word');
    const roleInst = document.getElementById('role-instruction');
    const starterInfo = document.getElementById('starter-info');
    const btnStart = document.getElementById('btn-start-round');
    const btnSkip = document.getElementById('btn-skip-word');
    if (starterInfo) starterInfo.style.display = 'none';
    if (G.isFirstRound) {
        if (card) card.className = 'role-card blurred';
        roleIcon.innerHTML = '<img src="' + ICONS.help + '" alt="?" class="role-icon-img">';
        roleTitle.textContent = 'SECRETO';
        roleWord.textContent = '???';
        roleInst.textContent = 'Toca la carta para revelar';
    } else {
        G.roleRevealed = true;
        const roleClass = G.myRole.role === 'INFILTRADO' ? 'impostor' : G.myRole.role === 'CHARLATÁN' ? 'charlatan' : 'citizen';
        if (card) card.className = 'role-card ' + roleClass;
        roleIcon.innerHTML = '<img src="' + G.myRole.icon + '" alt="" class="role-icon-img">';
        roleTitle.textContent = G.myRole.role;
        roleWord.textContent = G.myRole.word;
        roleInst.textContent = 'Tu rol (ya revelado)';
    }
    document.getElementById('points-box').style.display = 'none';
    document.getElementById('timer').style.display = 'none';
    document.getElementById('wait-message').style.display = 'block';
    if (btnStart) {
        btnStart.style.display = G.isHost ? 'block' : 'none';
        btnStart.disabled = false;
        btnStart.className = 'btn btn-start-round';
        btnStart.textContent = 'Iniciar Ronda';
    }
    if (btnSkip) btnSkip.style.display = G.isHost ? 'block' : 'none';
    showScreen('screen-role');
    clearInterval(G.refreshInterval);
    updatePlayersSidebar();
}

function revealRole() {
    if (G.roleRevealed) return;
    G.roleRevealed = true;
    const card = document.getElementById('role-card');
    if (card) card.classList.remove('blurred');
    document.getElementById('role-icon').innerHTML = '<img src="' + G.myRole.icon + '" alt="" class="role-icon-img">';
    document.getElementById('role-title').textContent = G.myRole.role;
    document.getElementById('role-word').textContent = G.myRole.word;
    document.getElementById('role-instruction').textContent = 'Memoriza tu información';
    const roleClass = G.myRole.role === 'INFILTRADO' ? 'impostor' : G.myRole.role === 'CHARLATÁN' ? 'charlatan' : 'citizen';
    if (card) card.classList.add(roleClass);
    showPointsReminder();
}

function showPointsReminder() {
    const box = document.getElementById('points-box');
    const list = document.getElementById('points-list');
    if (!box || !list) return;
    let html = '';
    if (G.myRole.role === 'CIUDADANO') {
        html = '<li><span class="points-value positive">+' + POINTS.CITIZEN_SURVIVE + '</span> Sobrevivir</li>' +
               '<li><span class="points-value positive">+' + POINTS.CITIZEN_CORRECT_VOTE + '</span> Votar bien</li>' +
               '<li><span class="points-value negative">' + POINTS.CITIZEN_WRONG_VOTE + '</span> Votar mal</li>';
    } else if (G.myRole.role === 'INFILTRADO') {
        html = '<li><span class="points-value positive">+' + POINTS.IMPOSTOR_WIN + '</span> Ganar</li>' +
               '<li><span class="points-value positive">+' + POINTS.IMPOSTOR_SURVIVE_ROUND + '</span> Sobrevivir ronda</li>';
    } else {
        html = '<li><span class="points-value positive">+' + POINTS.CHARLATAN_SURVIVE + '</span> Sobrevivir</li>' +
               '<li><span class="points-value positive">+' + POINTS.CITIZEN_CORRECT_VOTE + '</span> Votar bien</li>';
    }
    list.innerHTML = html;
    box.style.display = 'block';
}

function startRound() {
    if (!G.pubnub || !G.isHost || G.roundStarting) return;
    G.roundStarting = true;
    const btnStart = document.getElementById('btn-start-round');
    const btnSkip = document.getElementById('btn-skip-word');
    if (btnStart) {
        btnStart.disabled = true;
        btnStart.textContent = 'Iniciando...';
    }
    if (btnSkip) btnSkip.style.display = 'none';
    const newStarter = G.activePlayers[Math.floor(Math.random() * G.activePlayers.length)];
    G.pubnub.publish({
        channel: G.channel,
        message: { type: 'start_round', time: G.roundTime, starterPlayerId: newStarter }
    });
    setTimeout(() => { G.roundStarting = false; }, 2000);
}

function showRoundStartOverlay(starterName, starterAvatar, starterFrame) {
    const existing = document.getElementById('round-start-overlay');
    if (existing) existing.remove();
    const avatar = AVATARS.find(a => a.id === starterAvatar) || AVATARS[0];
    const frame = FRAMES.find(f => f.id === starterFrame);
    const frameStyle = frame ? 'border: 6px solid ' + frame.color + '; box-shadow: 0 0 30px ' + frame.color + '60;' : '';
    const overlay = document.createElement('div');
    overlay.id = 'round-start-overlay';
    overlay.className = 'round-start-overlay';
    overlay.innerHTML = '<div class="round-start-message"><h2>¡COMIENZA LA RONDA!</h2><div class="round-start-avatar" style="' + frameStyle + '"><img src="' + avatar.image + '" alt="avatar"></div><p>Empieza: <span class="starter-name">' + starterName + '</span></p></div>';
    document.body.appendChild(overlay);
}

function hideRoundStartOverlay() {
    const overlay = document.getElementById('round-start-overlay');
    if (overlay) overlay.remove();
}

function showStarterBanner(starterName) {
    const existing = document.getElementById('starter-banner');
    if (existing) existing.remove();
    const banner = document.createElement('div');
    banner.id = 'starter-banner';
    banner.className = 'starter-banner';
    banner.innerHTML = '<img src="' + ICONS.play + '" alt="">Inicia: ' + starterName;
    document.body.appendChild(banner);
}

function hideStarterBanner() {
    const banner = document.getElementById('starter-banner');
    if (banner) banner.remove();
}

function handleStartRound(msg) {
    clearAllTimers();
    G.starterPlayerId = msg.starterPlayerId;
    G.gamePhase = 'round';
    G.roundStarting = false;
    const btnStart = document.getElementById('btn-start-round');
    const btnSkip = document.getElementById('btn-skip-word');
    if (btnStart) {
        btnStart.style.display = 'none';
        btnStart.disabled = false;
        btnStart.textContent = 'Iniciar Ronda';
    }
    if (btnSkip) btnSkip.style.display = 'none';
    const starterName = G.players[G.starterPlayerId]?.name || 'Alguien';
    if (G.isSpectator) {
        const btnSpecNext = document.getElementById('btn-spectator-next');
        if (btnSpecNext) { btnSpecNext.style.display = 'none'; btnSpecNext.disabled = true; }
        document.getElementById('spectator-status').textContent = starterName + ' inicia!';
        setTimeout(function() { startSpectatorTimer(msg.time); }, ROUND_START_DISPLAY_TIME);
        return;
    }
    const starter = G.players[G.starterPlayerId] || {};
    showRoundStartOverlay(starterName, starter.avatar || 'avatar-11', starter.frame || 'fr-basic');
    setTimeout(function() {
        hideRoundStartOverlay();
        showStarterBanner(starterName);
        startTimer(msg.time);
    }, ROUND_START_DISPLAY_TIME);
}

function clearAllTimers() {
    if (G.timerInterval) { clearInterval(G.timerInterval); G.timerInterval = null; }
    if (G.voteTimerInterval) { clearInterval(G.voteTimerInterval); G.voteTimerInterval = null; }
    if (G.voteTimeout) { clearTimeout(G.voteTimeout); G.voteTimeout = null; }
    if (G.spectatorTimerInterval) { clearInterval(G.spectatorTimerInterval); G.spectatorTimerInterval = null; }
}

function startTimer(duration) {
    if (G.timerInterval) clearInterval(G.timerInterval);
    const timer = document.getElementById('timer');
    timer.style.display = 'block';
    timer.classList.remove('warning');
    document.getElementById('wait-message').style.display = 'none';
    document.getElementById('points-box').style.display = 'none';
    let remaining = duration;
    updateTimerDisplay(remaining);
    G.timerInterval = setInterval(function() {
        remaining--;
        if (remaining < 0) { clearInterval(G.timerInterval); return; }
        updateTimerDisplay(remaining);
        updatePlayersSidebar();
        if (remaining <= 10) timer.classList.add('warning');
        if (remaining <= 0) {
            clearInterval(G.timerInterval);
            timer.textContent = '¡TIEMPO!';
            if (navigator.vibrate) navigator.vibrate([500, 200, 500]);
            startVoting();
        }
    }, 1000);
}

function startSpectatorTimer(duration) {
    if (G.spectatorTimerInterval) clearInterval(G.spectatorTimerInterval);
    let remaining = duration;
    const specStatus = document.getElementById('spectator-status');
    function updateDisplay() {
        const mins = Math.floor(remaining / 60);
        const secs = remaining % 60;
        specStatus.textContent = 'Ronda: ' + mins.toString().padStart(2, '0') + ':' + secs.toString().padStart(2, '0');
    }
    updateDisplay();
    G.spectatorTimerInterval = setInterval(function() {
        remaining--;
        if (remaining < 0) {
            clearInterval(G.spectatorTimerInterval);
            specStatus.textContent = 'Votación...';
            return;
        }
        updateDisplay();
    }, 1000);
}

function updateTimerDisplay(seconds) {
    if (seconds < 0) seconds = 0;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    document.getElementById('timer').textContent = mins.toString().padStart(2, '0') + ':' + secs.toString().padStart(2, '0');
}

function startVoting() {
    if (G.timerInterval) clearInterval(G.timerInterval);
    hideStarterBanner();
    if (G.isSpectator) {
        document.getElementById('spectator-status').textContent = 'Votación...';
        showScreen('screen-spectator');
        return;
    }
    G.gamePhase = 'voting';
    G.votes = {};
    G.votedPlayers = new Set();
    G.voteTargets = {};
    showScreen('screen-voting');
    renderVotingList();
    startVoteTimer(30);
    if (G.isHost) {
        if (G.voteTimeout) clearTimeout(G.voteTimeout);
        G.voteTimeout = setTimeout(publishResults, 32000);
    }
}

function renderVotingList() {
    const list = document.getElementById('voting-list');
    if (!list) return;
    const votable = G.activePlayers.filter(id => id !== G.myId && !G.eliminated.includes(id));
    list.innerHTML = votable.map(id => 
        '<div class="vote-item">' +
        '<div class="vote-avatar">' + renderPlayerAvatar(id, 48) + '</div>' +
        '<div class="player-info"><div class="player-name">' + (G.players[id]?.name || id) + '</div></div>' +
        '<button class="btn-vote" data-target="' + id + '">Votar</button></div>'
    ).join('');
    list.querySelectorAll('.btn-vote').forEach(btn => {
        btn.onclick = function() { sendVote(btn.dataset.target, btn); };
    });
}

function startVoteTimer(seconds) {
    if (G.voteTimerInterval) clearInterval(G.voteTimerInterval);
    let remaining = seconds;
    const display = document.getElementById('vote-timer');
    display.textContent = '00:' + remaining.toString().padStart(2, '0');
    G.voteTimerInterval = setInterval(function() {
        remaining--;
        if (remaining < 0) { clearInterval(G.voteTimerInterval); return; }
        display.textContent = '00:' + remaining.toString().padStart(2, '0');
        updatePlayersSidebar();
    }, 1000);
}

function sendVote(targetId, button) {
    if (!G.pubnub || G.eliminated.includes(targetId) || !G.activePlayers.includes(targetId)) return;
    G.pubnub.publish({
        channel: G.channel,
        message: { type: 'vote', target: targetId }
    });
    button.classList.add('voted');
    button.textContent = 'Votado';
    button.disabled = true;
    document.querySelectorAll('.btn-vote').forEach(btn => btn.disabled = true);
    document.getElementById('vote-status').textContent = 'Voto registrado. Esperando...';
}

function handleVote(voterId, targetId) {
    if (!G.activePlayers.includes(targetId) || G.eliminated.includes(targetId) ||
        !G.activePlayers.includes(voterId) || G.votedPlayers.has(voterId) || voterId === targetId) return;
    G.votes[targetId] = (G.votes[targetId] || 0) + 1;
    G.votedPlayers.add(voterId);
    G.voteTargets[voterId] = targetId;
    if (G.isHost && G.pubnub) {
        G.pubnub.publish({
            channel: G.channel,
            message: { type: 'vote_update', votes: G.votes, voted: Array.from(G.votedPlayers) }
        });
        if (G.votedPlayers.size >= G.activePlayers.length) {
            if (G.voteTimeout) clearTimeout(G.voteTimeout);
            setTimeout(publishResults, 500);
        }
    }
    if (G.isSpectator) updateSpectatorVotes();
    if (!G.isSpectator) updatePlayersSidebar();
}

function publishResults() {
    if (!G.pubnub) return;
    clearAllTimers();
    let maxVotes = 0;
    let mostVoted = [];
    Object.entries(G.votes).forEach(function([id, count]) {
        if (count > maxVotes) { maxVotes = count; mostVoted = [id]; }
        else if (count === maxVotes) mostVoted.push(id);
    });
    const isTie = mostVoted.length > 1 || maxVotes === 0;
    let eliminatedId = null;
    let eliminatedRole = null;
    if (!isTie) {
        eliminatedId = mostVoted[0];
        G.eliminated.push(eliminatedId);
        G.activePlayers = G.activePlayers.filter(id => id !== eliminatedId);
        if (G.impostors.includes(eliminatedId)) {
            eliminatedRole = 'INFILTRADO';
            G.impostors = G.impostors.filter(id => id !== eliminatedId);
        } else if (G.charlatans.includes(eliminatedId)) {
            eliminatedRole = 'CHARLATÁN';
            G.charlatans = G.charlatans.filter(id => id !== eliminatedId);
        } else {
            eliminatedRole = 'CIUDADANO';
            G.citizens = G.citizens.filter(id => id !== eliminatedId);
        }
        Object.entries(G.voteTargets).forEach(function([voterId, targetId]) {
            if (targetId === eliminatedId) {
                if (eliminatedRole === 'INFILTRADO') {
                    G.scores[voterId] = (G.scores[voterId] || 0) + POINTS.CITIZEN_CORRECT_VOTE;
                } else if (!G.impostors.includes(voterId)) {
                    G.scores[voterId] = (G.scores[voterId] || 0) + POINTS.CITIZEN_WRONG_VOTE;
                }
            }
        });
        G.impostors.forEach(id => {
            G.scores[id] = (G.scores[id] || 0) + POINTS.IMPOSTOR_SURVIVE_ROUND;
        });
    }
    G.pubnub.publish({
        channel: G.channel,
        message: {
            type: 'results',
            votes: G.votes,
            eliminatedId: eliminatedId,
            eliminatedName: eliminatedId ? G.players[eliminatedId]?.name : null,
            eliminatedRole: eliminatedRole,
            isTie: isTie,
            scores: G.scores,
            activePlayers: G.activePlayers,
            impostors: G.impostors,
            fullRoles: G.fullRoles
        }
    });
    G.pubnub.publish({
        channel: G.channel,
        message: { type: 'spectator_roles', roles: G.fullRoles, activePlayers: G.activePlayers }
    });
}

function showYouEliminatedOverlay(role) {
    const existing = document.getElementById('you-eliminated-overlay');
    if (existing) existing.remove();
    const overlay = document.createElement('div');
    overlay.id = 'you-eliminated-overlay';
    overlay.className = 'you-eliminated-overlay';
    overlay.innerHTML = '<div class="you-eliminated-message">' +
        '<h1>HAS SIDO EXPULSADO</h1>' +
        '<p>Eras ' + role + '</p>' +
        '</div>';
    document.body.appendChild(overlay);
}

function hideYouEliminatedOverlay() {
    const overlay = document.getElementById('you-eliminated-overlay');
    if (overlay) overlay.remove();
}

function showResults(msg) {
    clearAllTimers();
    hideStarterBanner();
    G.votes = msg.votes;
    G.scores = msg.scores || G.scores;
    G.activePlayers = msg.activePlayers;
    G.impostors = msg.impostors;
    if (msg.eliminatedId && !G.eliminated.includes(msg.eliminatedId)) {
        G.eliminated.push(msg.eliminatedId);
    }
    updatePlayersSidebar();
    if (msg.eliminatedId === G.myId) {
        G.isSpectator = true;
        G.fullRoles = msg.fullRoles || G.fullRoles;
        showYouEliminatedOverlay(msg.eliminatedRole);
        setTimeout(() => {
            hideYouEliminatedOverlay();
            showScreen('screen-spectator');
            document.getElementById('spectator-status').textContent = 'Eliminado (' + msg.eliminatedRole + ')';
            updateSpectatorRoles();
            if (G.isHost) {
                document.getElementById('btn-spectator-next').style.display = 'block';
                document.getElementById('btn-spectator-lobby').style.display = 'block';
            }
        }, 3000);
        return;
    }
    if (G.isSpectator) {
        document.getElementById('spectator-status').textContent = msg.isTie ? 'Empate' : msg.eliminatedName + ' eliminado';
        updateSpectatorRoles();
        if (G.isHost) document.getElementById('btn-spectator-next').style.display = 'block';
        return;
    }
    showScreen('screen-results');
    G.gamePhase = 'results';
    const resultsList = document.getElementById('results-list');
    if (resultsList) {
        const voteEntries = Object.entries(msg.votes);
        const maxVotes = voteEntries.length > 0 ? Math.max(...Object.values(msg.votes), 1) : 1;
        resultsList.innerHTML = voteEntries.map(function([id, count]) {
            return '<div class="result-item">' +
                '<div class="result-header">' +
                '<div class="result-player">' +
                '<div class="result-avatar">' + renderPlayerAvatar(id, 36) + '</div>' +
                '<span class="result-name">' + (G.players[id]?.name || id) + '</span>' +
                '</div>' +
                '<span class="result-votes">' + count + ' votos</span>' +
                '</div>' +
                '<div class="result-bar"><div class="result-bar-fill" style="width:' + (count / maxVotes * 100) + '%"></div></div>' +
                '</div>';
        }).join('');
    }
    const elimBox = document.getElementById('eliminated-box');
    if (elimBox) {
        if (msg.isTie) {
            elimBox.innerHTML = '<div class="eliminated-message">Empate en la votación</div>' +
                '<div class="eliminated-name">NADIE ELIMINADO</div>' +
                '<div class="eliminated-role-container">' +
                '<img src="' + ICONS.tie + '" alt="" class="eliminated-role-icon">' +
                '</div>';
        } else {
            const iconSrc = msg.eliminatedRole === 'INFILTRADO' ? ICONS.impostor :
                           msg.eliminatedRole === 'CHARLATÁN' ? ICONS.charlatan : ICONS.citizen;
            elimBox.innerHTML = '<div class="eliminated-message">Ha sido expulsado</div>' +
                '<div class="eliminated-name">' + msg.eliminatedName + '</div>' +
                '<div class="eliminated-role-container">' +
                '<img src="' + iconSrc + '" alt="" class="eliminated-role-icon">' +
                '<span class="eliminated-role">Era <strong>' + msg.eliminatedRole + '</strong></span>' +
                '</div>';
        }
    }
    const btnNext = document.getElementById('btn-next-round');
    if (btnNext) {
        btnNext.style.display = 'none';
        btnNext.disabled = false;
        btnNext.className = 'btn btn-next-round';
    }
    document.getElementById('btn-back-lobby').style.display = 'none';
    if (G.isHost) {
        setTimeout(function() {
            let winner = null;
            let reason = '';
            if (G.impostors.length === 0) {
                winner = 'CIUDADANOS';
                reason = 'Infiltrados eliminados';
                G.citizens.forEach(id => {
                    if (G.activePlayers.includes(id)) G.scores[id] = (G.scores[id] || 0) + POINTS.CITIZEN_SURVIVE;
                });
                G.charlatans.forEach(id => {
                    if (G.activePlayers.includes(id)) G.scores[id] = (G.scores[id] || 0) + POINTS.CHARLATAN_SURVIVE;
                });
            } else if (G.activePlayers.length - G.impostors.length <= G.impostors.length) {
                winner = 'INFILTRADOS';
                reason = 'Infiltrados dominan';
                G.impostors.forEach(id => {
                    G.scores[id] = (G.scores[id] || 0) + POINTS.IMPOSTOR_WIN;
                });
            }
            if (winner) {
                G.pubnub.publish({
                    channel: G.channel,
                    message: { type: 'game_over', winner: winner, reason: reason, scores: G.scores, roles: G.fullRoles }
                });
            } else {
                if (btnNext) btnNext.style.display = 'block';
            }
        }, RESULT_DISPLAY_TIME);
    }
}

function nextRound() {
    if (!G.pubnub || !G.isHost) return;
    const btnNext = document.getElementById('btn-next-round');
    if (btnNext) btnNext.disabled = true;
    G.pubnub.publish({
        channel: G.channel,
        message: { type: 'next_round', activePlayers: G.activePlayers, fullRoles: G.fullRoles }
    });
}

function spectatorNextAction() {
    if (!G.isHost) return;
    const btn = document.getElementById('btn-spectator-next');
    if (btn && btn.textContent.includes('Iniciar')) startRound();
    else nextRound();
}

function handleNextRound(msg) {
    clearAllTimers();
    hideStarterBanner();
    G.votes = {};
    G.votedPlayers = new Set();
    G.voteTargets = {};
    G.isFirstRound = false;
    G.gamePhase = 'roles';
    if (msg && msg.activePlayers) G.activePlayers = msg.activePlayers;
    if (msg && msg.fullRoles) {
        G.fullRoles = msg.fullRoles;
        if (G.fullRoles[G.myId]) G.myRole = G.fullRoles[G.myId];
    }
    if (G.isSpectator) {
        document.getElementById('spectator-status').textContent = 'Esperando inicio...';
        const btnSpecNext = document.getElementById('btn-spectator-next');
        if (btnSpecNext) btnSpecNext.style.display = 'none';
        if (G.isHost && btnSpecNext) {
            btnSpecNext.textContent = 'Iniciar Ronda';
            btnSpecNext.style.display = 'block';
            btnSpecNext.disabled = false;
            btnSpecNext.className = 'btn btn-start-round';
        }
        showScreen('screen-spectator');
        updateSpectatorRoles();
        return;
    }
    const card = document.getElementById('role-card');
    const btnStart = document.getElementById('btn-start-round');
    const btnSkip = document.getElementById('btn-skip-word');
    G.roleRevealed = true;
    const roleClass = G.myRole.role === 'INFILTRADO' ? 'impostor' : G.myRole.role === 'CHARLATÁN' ? 'charlatan' : 'citizen';
    if (card) card.className = 'role-card ' + roleClass;
    document.getElementById('role-icon').innerHTML = '<img src="' + G.myRole.icon + '" alt="" class="role-icon-img">';
    document.getElementById('role-title').textContent = G.myRole.role;
    document.getElementById('role-word').textContent = G.myRole.word;
    document.getElementById('role-instruction').textContent = 'Tu rol (conocido)';
    document.getElementById('points-box').style.display = 'none';
    const timer = document.getElementById('timer');
    timer.style.display = 'none';
    timer.classList.remove('warning');
    document.getElementById('wait-message').style.display = 'block';
    document.getElementById('starter-info').style.display = 'none';
    if (btnStart) {
        btnStart.style.display = G.isHost ? 'block' : 'none';
        btnStart.disabled = false;
        btnStart.className = 'btn btn-start-round';
        btnStart.textContent = 'Iniciar Ronda';
    }
    if (btnSkip) btnSkip.style.display = G.isHost ? 'block' : 'none';
    showScreen('screen-role');
    updatePlayersSidebar();
}

function handleGameOver(msg) {
    clearAllTimers();
    hideStarterBanner();
    hidePlayersSidebar();
    G.gamePhase = 'gameover';
    G.scores = msg.scores || G.scores;
    G.fullRoles = msg.roles || G.fullRoles;
    showScreen('screen-gameover');
    document.getElementById('gameover-title').textContent = '¡' + msg.winner + ' GANAN!';
    document.getElementById('gameover-reason').textContent = msg.reason;
    document.getElementById('gameover-icon').src = msg.winner === 'INFILTRADOS' ? ICONS.impostor : ICONS.celebrate;
    const scoresList = document.getElementById('final-scores');
    const sorted = Object.entries(G.scores).sort((a, b) => b[1] - a[1]);
    scoresList.innerHTML = '<div class="final-scores-list">' + sorted.map(function([id, score], idx) {
        const p = G.players[id];
        const role = G.fullRoles[id];
        let rankHtml = '';
        if (idx === 0) rankHtml = '<div class="score-rank"><img src="' + ICONS.medalGold + '" alt="1"></div>';
        else if (idx === 1) rankHtml = '<div class="score-rank"><img src="' + ICONS.medalSilver + '" alt="2"></div>';
        else if (idx === 2) rankHtml = '<div class="score-rank"><img src="' + ICONS.medalBronze + '" alt="3"></div>';
        else rankHtml = '<div class="score-rank"><span class="score-rank-number">' + (idx + 1) + '</span></div>';
        return '<div class="score-item">' + rankHtml +
            '<div class="score-avatar">' + renderPlayerAvatar(id, 44) + '</div>' +
            '<div class="score-info">' +
            '<div class="score-name">' + (p?.name || id) + '</div>' +
            '<div class="score-role">' + (role?.role || '') + '</div>' +
            '</div>' +
            '<div class="score-points">' + score + '</div>' +
            '</div>';
    }).join('') + '</div>';
}

function backToLobby() {
    if (G.isHost && G.pubnub) {
        G.pubnub.publish({
            channel: G.channel,
            message: { type: 'back_to_lobby', scores: G.scores, hostId: G.hostId, usedWords: G.usedWords }
        });
    }
    resetGameState();
    showScreen('screen-lobby');
    const btn = document.getElementById('btn-distribute');
    if (btn) btn.style.display = G.isHost ? 'block' : 'none';
    G.refreshInterval = setInterval(refreshPlayers, 3000);
    refreshPlayers();
}

function handleBackToLobby(msg) {
    clearAllTimers();
    hideStarterBanner();
    G.scores = msg.scores || G.scores;
    G.hostId = msg.hostId || G.hostId;
    G.isHost = (G.myId === G.hostId);
    G.usedWords = msg.usedWords || G.usedWords;
    resetGameState();
    showScreen('screen-lobby');
    const btn = document.getElementById('btn-distribute');
    if (btn) btn.style.display = G.isHost ? 'block' : 'none';
    G.refreshInterval = setInterval(refreshPlayers, 3000);
    refreshPlayers();
}

function resetGameState() {
    clearAllTimers();
    hideStarterBanner();
    hidePlayersSidebar();
    G.gamePhase = 'lobby';
    G.isSpectator = false;
    G.activePlayers = [];
    G.eliminated = [];
    G.impostors = [];
    G.charlatans = [];
    G.citizens = [];
    G.myRole = null;
    G.fullRoles = {};
    G.votes = {};
    G.votedPlayers = new Set();
    G.voteTargets = {};
    G.roleRevealed = false;
    G.starterPlayerId = null;
    G.isFirstRound = true;
    G.roundStarting = false;
}

function updateSpectatorRoles() {
    const list = document.getElementById('spectator-roles');
    if (!list || !G.fullRoles) return;
    list.innerHTML = Object.entries(G.fullRoles).map(function([id, role]) {
        const p = G.players[id];
        const isActive = G.activePlayers.includes(id);
        const statusIcon = isActive ? ICONS.active : ICONS.eliminated;
        return '<div class="player-item" style="opacity:' + (isActive ? 1 : 0.5) + '">' +
            '<div class="player-avatar">' + renderPlayerAvatar(id, 36) + '</div>' +
            '<div class="player-info">' +
            '<div class="player-name">' + (p?.name || id) + '</div>' +
            '<div class="player-tag">' + role.role + ' - ' + role.word + '</div>' +
            '</div>' +
            '<img src="' + statusIcon + '" alt="" class="player-status-icon">' +
            '</div>';
    }).join('');
}

function updateSpectatorVotes() {
    const list = document.getElementById('spectator-votes');
    if (!list) return;
    list.innerHTML = G.activePlayers.map(function(id) {
        const p = G.players[id];
        const votes = G.votes[id] || 0;
        const hasVoted = G.votedPlayers.has(id);
        const statusIcon = hasVoted ? ICONS.voted : ICONS.pending;
        return '<div class="player-item">' +
            '<div class="player-avatar">' + renderPlayerAvatar(id, 36) + '</div>' +
            '<div class="player-info">' +
            '<div class="player-name">' + (p?.name || id) + '</div>' +
            '<div class="player-tag">' + (hasVoted ? 'Ha votado' : 'Pendiente') + '</div>' +
            '</div>' +
            '<span>' + votes + ' votos</span>' +
            '</div>';
    }).join('');
}

function leaveRoom() {
    if (confirm('¿Abandonar?')) exitGame();
}

function exitGame() {
    clearAllTimers();
    clearInterval(G.refreshInterval);
    hideStarterBanner();
    hidePlayersSidebar();
    if (G.isHost && G.pubnub) {
        G.pubnub.publish({
            channel: G.channel,
            message: { type: 'host_disconnect' }
        });
    }
    if (G.pubnub) {
        G.pubnub.unsubscribeAll();
        G.pubnub = null;
    }
    G.channel = null;
    G.isHost = false;
    G.hostId = null;
    G.players = {};
    G.scores = {};
    G.usedWords = [];
    resetGameState();
    showScreen('screen-home');
}

function toast(message, type) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const t = document.createElement('div');
    t.className = 'toast ' + (type || 'info');
    t.textContent = message;
    container.appendChild(t);
    setTimeout(function() { t.remove(); }, 3000);
}

window.G = G;
console.log('INFILTRA v0.9.8.9 cargado completamente');
