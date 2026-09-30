/* ============================================================
   CUBE QUEST — jeu de plateforme
   Basé sur une démo de départ (cube + gravité + une plateforme),
   étendu en un vrai petit jeu : plusieurs niveaux, ennemis, pièces,
   score, vies, menu/pause/game over/victoire, sons, contrôles tactiles.
   ============================================================ */

// ---------- Canvas ----------
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// ---------- Constantes de jeu ----------
const PLAYER_SIZE = 36;
const ENEMY_SIZE = 32;
const GROUND_Y = 360;      // hauteur (en y) du dessus du sol
const FLOOR_HEIGHT = 40;   // épaisseur des segments de sol
const FALL_LIMIT = 550;    // si le joueur tombe plus bas que ça (dans un trou) -> perd une vie

const MOVE_SPEED = 220;        // pixels / seconde
const JUMP_VELOCITY = -560;    // pixels / seconde
const GRAVITY = 1500;          // pixels / seconde^2
const MAX_FALL_SPEED = 900;

const HIGH_SCORE_KEY = 'cubeQuestHighScore';

// ---------- Éléments HUD / overlay ----------
const hudScore = document.getElementById('hudScore');
const hudLives = document.getElementById('hudLives');
const hudLevel = document.getElementById('hudLevel');
const hudHighScore = document.getElementById('hudHighScore');

const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlayTitle');
const overlayMessage = document.getElementById('overlayMessage');
const overlayButton = document.getElementById('overlayButton');
let overlayAction = null;

// ---------- Données des 3 niveaux ----------
// Chaque niveau est décrit en coordonnées "monde" (le niveau peut être
// plus large que le canevas ; la caméra suit le joueur horizontalement).
const LEVELS = [
    {
        width: 1200,
        playerStart: { x: 40, y: GROUND_Y - PLAYER_SIZE },
        floorSegments: [
            { x: 0, width: 500 },
            { x: 560, width: 640 }
        ],
        platforms: [
            { x: 250, y: 280, width: 120, height: 16 },
            { x: 700, y: 260, width: 140, height: 16 }
        ],
        enemies: [
            { x: 750, y: GROUND_Y - ENEMY_SIZE, rangeStart: 700, rangeEnd: 950, speed: 70 }
        ],
        coins: [
            { x: 150, y: 330 }, { x: 300, y: 250 }, { x: 620, y: 330 },
            { x: 760, y: 220 }, { x: 900, y: 330 }, { x: 1100, y: 330 }
        ],
        goal: { x: 1140, y: 300, width: 40, height: 60 }
    },
    {
        width: 1600,
        playerStart: { x: 40, y: GROUND_Y - PLAYER_SIZE },
        floorSegments: [
            { x: 0, width: 300 },
            { x: 380, width: 250 },
            { x: 700, width: 300 },
            { x: 1080, width: 520 }
        ],
        platforms: [
            { x: 150, y: 280, width: 100, height: 16 },
            { x: 450, y: 250, width: 100, height: 16 },
            { x: 820, y: 270, width: 120, height: 16 },
            { x: 1200, y: 260, width: 140, height: 16 }
        ],
        enemies: [
            { x: 420, y: GROUND_Y - ENEMY_SIZE, rangeStart: 380, rangeEnd: 620, speed: 80 },
            { x: 1150, y: GROUND_Y - ENEMY_SIZE, rangeStart: 1080, rangeEnd: 1450, speed: 100 }
        ],
        coins: [
            { x: 180, y: 250 }, { x: 250, y: 330 }, { x: 480, y: 220 }, { x: 560, y: 330 },
            { x: 850, y: 240 }, { x: 950, y: 330 }, { x: 1230, y: 230 }, { x: 1500, y: 330 }
        ],
        goal: { x: 1540, y: 300, width: 40, height: 60 }
    },
    {
        width: 2000,
        playerStart: { x: 40, y: GROUND_Y - PLAYER_SIZE },
        floorSegments: [
            { x: 0, width: 260 },
            { x: 340, width: 180 },
            { x: 600, width: 200 },
            { x: 880, width: 180 },
            { x: 1140, width: 260 },
            { x: 1480, width: 520 }
        ],
        platforms: [
            { x: 150, y: 270, width: 90, height: 16 },
            { x: 380, y: 240, width: 90, height: 16 },
            { x: 650, y: 260, width: 100, height: 16 },
            { x: 920, y: 230, width: 90, height: 16 },
            { x: 1180, y: 250, width: 120, height: 16 },
            { x: 1550, y: 260, width: 140, height: 16 },
            { x: 1750, y: 220, width: 120, height: 16 }
        ],
        enemies: [
            { x: 650, y: GROUND_Y - ENEMY_SIZE, rangeStart: 600, rangeEnd: 800, speed: 90 },
            { x: 1160, y: GROUND_Y - ENEMY_SIZE, rangeStart: 1140, rangeEnd: 1380, speed: 110 },
            { x: 1600, y: GROUND_Y - ENEMY_SIZE, rangeStart: 1480, rangeEnd: 1900, speed: 120 }
        ],
        coins: [
            { x: 180, y: 240 }, { x: 300, y: 330 }, { x: 410, y: 210 }, { x: 560, y: 330 },
            { x: 680, y: 230 }, { x: 780, y: 330 }, { x: 950, y: 200 }, { x: 1210, y: 220 },
            { x: 1580, y: 230 }, { x: 1900, y: 330 }
        ],
        goal: { x: 1950, y: 300, width: 40, height: 60 }
    }
];

// ---------- État global du jeu ----------
let state = 'menu'; // 'menu' | 'playing' | 'paused' | 'levelComplete' | 'gameOver' | 'win'
let currentLevelIndex = 0;
let currentLevel = null;
let player = null;
let enemies = [];
let coins = [];
let score = 0;
let lives = 3;
const camera = { x: 0 };
const keys = {};

// ---------- Classes ----------
class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = PLAYER_SIZE;
        this.height = PLAYER_SIZE;
        this.vx = 0;
        this.vy = 0;
        this.grounded = false;
        this.invulnerable = 0; // secondes restantes d'invulnérabilité (après un coup)
    }
    reset(x, y) {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.grounded = false;
        this.invulnerable = 1.2;
    }
}

class Enemy {
    constructor(x, y, rangeStart, rangeEnd, speed) {
        this.x = x;
        this.y = y;
        this.width = ENEMY_SIZE;
        this.height = ENEMY_SIZE;
        this.rangeStart = rangeStart;
        this.rangeEnd = rangeEnd;
        this.speed = speed;
        this.direction = 1;
        this.alive = true;
    }
    update(dt) {
        if (!this.alive) return;
        this.x += this.direction * this.speed * dt;
        if (this.x <= this.rangeStart) {
            this.x = this.rangeStart;
            this.direction = 1;
        } else if (this.x + this.width >= this.rangeEnd) {
            this.x = this.rangeEnd - this.width;
            this.direction = -1;
        }
    }
}

// ---------- Fonctions utilitaires ----------
function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function rectsOverlap(a, b) {
    return a.x < b.x + b.width &&
        a.x + a.width > b.x &&
        a.y < b.y + b.height &&
        a.y + a.height > b.y;
}

function getHighScore() {
    try {
        return parseInt(localStorage.getItem(HIGH_SCORE_KEY), 10) || 0;
    } catch (e) {
        return 0;
    }
}

function setHighScoreIfNeeded(finalScore) {
    try {
        if (finalScore > getHighScore()) {
            localStorage.setItem(HIGH_SCORE_KEY, String(finalScore));
        }
    } catch (e) {
        // localStorage indisponible (mode privé, etc.) : on ignore simplement
    }
}

// ---------- Son (Web Audio API — aucun fichier audio nécessaire) ----------
let audioCtx = null;
function getAudioCtx() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!audioCtx) audioCtx = new AC();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
}
function ensureAudioStarted() {
    getAudioCtx();
}
function playTone(freq, duration = 0.1, type = 'square', volume = 0.15) {
    const ac = getAudioCtx();
    if (!ac) return;
    try {
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        osc.type = type;
        osc.frequency.value = freq;
        gain.gain.value = volume;
        osc.connect(gain);
        gain.connect(ac.destination);
        const now = ac.currentTime;
        osc.start(now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
        osc.stop(now + duration + 0.02);
    } catch (e) {
        // audio indisponible : on ignore
    }
}
function playSequence(notes) {
    notes.forEach(n => setTimeout(() => playTone(n.freq, n.duration, 'square', 0.15), n.delay));
}
function playJumpSound() { playTone(520, 0.1, 'square', 0.12); }
function playCoinSound() { playTone(880, 0.09, 'triangle', 0.15); }
function playStompSound() { playTone(180, 0.14, 'sawtooth', 0.18); }
function playHitSound() { playTone(130, 0.25, 'sawtooth', 0.2); }
function playLevelCompleteSound() {
    playSequence([{ freq: 523, delay: 0, duration: 0.12 }, { freq: 659, delay: 120, duration: 0.12 }, { freq: 784, delay: 240, duration: 0.2 }]);
}
function playGameOverSound() {
    playSequence([{ freq: 300, delay: 0, duration: 0.15 }, { freq: 220, delay: 150, duration: 0.15 }, { freq: 140, delay: 300, duration: 0.3 }]);
}
function playWinSound() {
    playSequence([{ freq: 523, delay: 0, duration: 0.1 }, { freq: 659, delay: 100, duration: 0.1 }, { freq: 784, delay: 200, duration: 0.1 }, { freq: 1046, delay: 300, duration: 0.3 }]);
}

// ---------- Gestion des écrans superposés ----------
function showOverlay(title, message, buttonText, action) {
    overlayTitle.textContent = title;
    overlayMessage.innerHTML = message;
    overlayButton.textContent = buttonText;
    overlayAction = action;
    overlay.classList.add('visible');
}
function hideOverlay() {
    overlay.classList.remove('visible');
    overlayAction = null;
}
overlayButton.addEventListener('click', () => {
    ensureAudioStarted();
    if (overlayAction) overlayAction();
});

// ---------- HUD ----------
function updateHUD() {
    hudScore.textContent = `Score : ${score}`;
    hudLives.textContent = 'Vies : ' + '❤'.repeat(Math.max(lives, 0)) + '🖤'.repeat(Math.max(3 - lives, 0));
    hudLevel.textContent = `Niveau ${currentLevelIndex + 1}/${LEVELS.length}`;
    hudHighScore.textContent = `Meilleur score : ${getHighScore()}`;
}

// ---------- Chargement d'un niveau ----------
function loadLevel(index) {
    const data = LEVELS[index];

    const floorPlatforms = data.floorSegments.map(seg => ({
        x: seg.x, y: GROUND_Y, width: seg.width, height: FLOOR_HEIGHT, isFloor: true
    }));
    const otherPlatforms = data.platforms.map(p => ({ ...p, isFloor: false }));

    currentLevel = {
        width: data.width,
        playerStart: { ...data.playerStart },
        platforms: floorPlatforms.concat(otherPlatforms),
        goal: { ...data.goal }
    };

    player = new Player(data.playerStart.x, data.playerStart.y);
    enemies = data.enemies.map(e => new Enemy(e.x, e.y, e.rangeStart, e.rangeEnd, e.speed));
    coins = data.coins.map(c => ({ x: c.x, y: c.y, radius: 10, collected: false, bob: Math.random() * Math.PI * 2 }));
    camera.x = 0;
}

// ---------- Résolution des collisions joueur / plateformes (axe par axe) ----------
function resolvePlayerCollisions(dt) {
    // Déplacement horizontal puis correction
    player.x += player.vx * dt;
    for (const p of currentLevel.platforms) {
        if (rectsOverlap(player, p)) {
            if (player.vx > 0) player.x = p.x - player.width;
            else if (player.vx < 0) player.x = p.x + p.width;
        }
    }

    // Déplacement vertical puis correction
    player.grounded = false;
    player.y += player.vy * dt;
    for (const p of currentLevel.platforms) {
        if (rectsOverlap(player, p)) {
            if (player.vy > 0) {
                player.y = p.y - player.height;
                player.vy = 0;
                player.grounded = true;
            } else if (player.vy < 0) {
                player.y = p.y + p.height;
                player.vy = 0;
            }
        }
    }
}

// ---------- Réactions du joueur ----------
function loseLife() {
    lives--;
    updateHUD();
    playHitSound();
    if (lives <= 0) {
        triggerGameOver();
    } else {
        player.reset(currentLevel.playerStart.x, currentLevel.playerStart.y);
    }
}

function handleEnemyCollision(enemy) {
    // Si le joueur tombe sur le dessus de l'ennemi -> l'ennemi est vaincu
    const stomp = player.vy > 0 && (player.y + player.height - enemy.y) < player.height * 0.6;
    if (stomp) {
        enemy.alive = false;
        player.vy = JUMP_VELOCITY * 0.5;
        score += 50;
        updateHUD();
        playStompSound();
    } else if (player.invulnerable <= 0) {
        loseLife();
    }
}

function triggerGameOver() {
    state = 'gameOver';
    setHighScoreIfNeeded(score);
    playGameOverSound();
    showOverlay('Perdu !', `Score final : ${score}`, 'Recommencer', startGame);
}

function onLevelComplete() {
    if (currentLevelIndex < LEVELS.length - 1) {
        state = 'levelComplete';
        playLevelCompleteSound();
        showOverlay(`Niveau ${currentLevelIndex + 1} terminé !`, `Score actuel : ${score}`, 'Niveau suivant', () => {
            currentLevelIndex++;
            loadLevel(currentLevelIndex);
            state = 'playing';
            updateHUD();
            hideOverlay();
        });
    } else {
        state = 'win';
        setHighScoreIfNeeded(score);
        playWinSound();
        showOverlay('Bravo, Cube Quest terminé !', `Score final : ${score}<br>Meilleur score : ${getHighScore()}`, 'Rejouer', startGame);
    }
}

// ---------- Boucle de mise à jour ----------
function update(dt) {
    // Entrées clavier -> déplacement horizontal
    if (keys['ArrowLeft'] || keys['KeyA']) player.vx = -MOVE_SPEED;
    else if (keys['ArrowRight'] || keys['KeyD']) player.vx = MOVE_SPEED;
    else player.vx = 0;

    if ((keys['Space'] || keys['ArrowUp'] || keys['KeyW']) && player.grounded) {
        player.vy = JUMP_VELOCITY;
        player.grounded = false;
        playJumpSound();
    }

    // Gravité
    player.vy += GRAVITY * dt;
    if (player.vy > MAX_FALL_SPEED) player.vy = MAX_FALL_SPEED;

    resolvePlayerCollisions(dt);

    // Rester dans les limites horizontales du niveau
    if (player.x < 0) player.x = 0;
    if (player.x + player.width > currentLevel.width) player.x = currentLevel.width - player.width;

    if (player.invulnerable > 0) player.invulnerable -= dt;

    // Chute dans un trou -> perte d'une vie
    if (player.y > FALL_LIMIT) {
        loseLife();
        if (state !== 'playing') return;
    }

    // Ennemis
    for (const enemy of enemies) {
        enemy.update(dt);
        if (enemy.alive && rectsOverlap(player, enemy)) {
            handleEnemyCollision(enemy);
            if (state !== 'playing') return;
        }
    }

    // Pièces
    for (const coin of coins) {
        if (coin.collected) continue;
        coin.bob += dt * 4;
        const coinRect = { x: coin.x - coin.radius, y: coin.y - coin.radius, width: coin.radius * 2, height: coin.radius * 2 };
        if (rectsOverlap(player, coinRect)) {
            coin.collected = true;
            score += 10;
            updateHUD();
            playCoinSound();
        }
    }

    // But du niveau
    if (rectsOverlap(player, currentLevel.goal)) {
        onLevelComplete();
        if (state !== 'playing') return;
    }

    // Caméra : suit le joueur horizontalement, bornée aux limites du niveau
    camera.x = clamp(player.x - canvas.width / 2 + player.width / 2, 0, Math.max(0, currentLevel.width - canvas.width));
}

// ---------- Dessin ----------
function drawGoal(goal) {
    ctx.fillStyle = '#2ecc71';
    ctx.fillRect(goal.x, goal.y, 6, goal.height);
    ctx.beginPath();
    ctx.moveTo(goal.x + 6, goal.y + 5);
    ctx.lineTo(goal.x + 34, goal.y + 15);
    ctx.lineTo(goal.x + 6, goal.y + 25);
    ctx.closePath();
    ctx.fillStyle = '#27ae60';
    ctx.fill();
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ecf0f1';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (!currentLevel) return;

    ctx.save();
    ctx.translate(-camera.x, 0);

    // Plateformes
    for (const p of currentLevel.platforms) {
        ctx.fillStyle = p.isFloor ? '#34495e' : '#3498db';
        ctx.fillRect(p.x, p.y, p.width, p.height);
    }

    // But
    drawGoal(currentLevel.goal);

    // Pièces
    for (const coin of coins) {
        if (coin.collected) continue;
        const by = coin.y + Math.sin(coin.bob) * 3;
        ctx.beginPath();
        ctx.arc(coin.x, by, coin.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#f1c40f';
        ctx.fill();
        ctx.strokeStyle = '#d4ac0d';
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    // Ennemis
    for (const enemy of enemies) {
        if (!enemy.alive) continue;
        ctx.fillStyle = '#8e44ad';
        ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
        ctx.fillStyle = '#fff';
        ctx.fillRect(enemy.x + 6, enemy.y + 8, 6, 6);
        ctx.fillRect(enemy.x + enemy.width - 12, enemy.y + 8, 6, 6);
    }

    // Joueur (clignote pendant l'invulnérabilité)
    const flashing = player.invulnerable > 0 && Math.floor(performance.now() / 100) % 2 === 0;
    ctx.fillStyle = flashing ? '#f1948a' : '#e74c3c';
    ctx.fillRect(player.x, player.y, player.width, player.height);

    ctx.restore();
}

// ---------- Entrées clavier ----------
const PREVENT_DEFAULT_KEYS = ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
window.addEventListener('keydown', e => {
    if (PREVENT_DEFAULT_KEYS.includes(e.code)) e.preventDefault();
    keys[e.code] = true;

    if (e.code === 'Enter' && state !== 'playing' && overlayAction) {
        ensureAudioStarted();
        overlayAction();
    }
    if (e.code === 'Escape' || e.code === 'KeyP') {
        if (state === 'playing') {
            state = 'paused';
            showOverlay('Pause', 'Le jeu est en pause.', 'Reprendre', () => { state = 'playing'; hideOverlay(); });
        } else if (state === 'paused') {
            state = 'playing';
            hideOverlay();
        }
    }
});
window.addEventListener('keyup', e => { keys[e.code] = false; });

// Pause automatique si l'onglet perd le focus (évite un gros saut de temps au retour)
window.addEventListener('blur', () => {
    if (state === 'playing') {
        state = 'paused';
        showOverlay('Pause', 'Le jeu est en pause.', 'Reprendre', () => { state = 'playing'; hideOverlay(); });
    }
});

// ---------- Contrôles tactiles (mobile) ----------
function bindTouchButton(el, code) {
    const press = e => { e.preventDefault(); ensureAudioStarted(); keys[code] = true; };
    const release = e => { e.preventDefault(); keys[code] = false; };
    el.addEventListener('touchstart', press, { passive: false });
    el.addEventListener('touchend', release, { passive: false });
    el.addEventListener('touchcancel', release, { passive: false });
    el.addEventListener('mousedown', press);
    el.addEventListener('mouseup', release);
    el.addEventListener('mouseleave', release);
}
bindTouchButton(document.getElementById('btnLeft'), 'ArrowLeft');
bindTouchButton(document.getElementById('btnRight'), 'ArrowRight');
bindTouchButton(document.getElementById('btnJump'), 'Space');

// ---------- Démarrage / redémarrage ----------
function startGame() {
    ensureAudioStarted();
    lives = 3;
    score = 0;
    currentLevelIndex = 0;
    loadLevel(currentLevelIndex);
    state = 'playing';
    updateHUD();
    hideOverlay();
}

// Écran de menu initial
showOverlay(
    'Cube Quest',
    'Flèches ou WASD pour bouger, Espace pour sauter.<br>' +
    'Ramasse les pièces, saute sur les ennemis pour les vaincre (ou évite-les), ' +
    'et atteins le drapeau pour terminer le niveau.<br>Échap ou P pour mettre en pause.',
    'Jouer',
    startGame
);
updateHUD();

// ---------- Boucle principale ----------
let lastTime = 0;
function gameLoop(timestamp) {
    const dt = Math.min((timestamp - lastTime) / 1000, 0.033); // dt plafonné pour éviter les gros sauts
    lastTime = timestamp;

    if (state === 'playing') update(dt);
    draw();

    requestAnimationFrame(gameLoop);
}
requestAnimationFrame(gameLoop);