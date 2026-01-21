// ============ ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ============
let yandexSDK = null;
let isYandexEnv = false;
let currentDifficulty = 'easy';

const difficultySettings = {
    easy: { speed: 0.03, attempts: 5 },
    medium: { speed: 0.05, attempts: 3 },
    hard: { speed: 0.08, attempts: 2 }
};

let score = 0;
let attempts = 5;
let isRunning = false;
let angle = 0;
let speed = 0.03;
let gamePhase = 'ready'; // 'ready', 'waiting', 'stopped', 'ended'

// DOM
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.querySelector('#score span');
const messageEl = document.getElementById('message');
const clickBtn = document.getElementById('clickBtn');
const adBtn = document.getElementById('adBtn');
const shareBtn = document.getElementById('shareBtn');
const leaderboardBtn = document.getElementById('leaderboardBtn');

// ============ ИНИЦИАЛИЗАЦИЯ SDK ============
YaGames.init().then(ysdk => {
    yandexSDK = ysdk;
    isYandexEnv = true;
    if (ysdk.features.LoadingAPI) {
        ysdk.features.LoadingAPI.ready();
    }
}).catch(err => {
    console.warn('Yandex SDK не доступен:', err);
});

// ============ АДАПТАЦИЯ CANVAS ============
function resizeCanvas() {
    const size = Math.min(window.innerWidth - 40, window.innerHeight * 0.6, 400);
    canvas.width = canvas.height = size;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// ============ ОТРИСОВКА ============
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = canvas.width * 0.45;

    // Зелёная зона
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, -Math.PI / 6, Math.PI / 6);
    ctx.strokeStyle = '#4CAF50';
    ctx.lineWidth = radius * 0.15;
    ctx.stroke();

    // Стрелка
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(angle);
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(-10, 0);
    ctx.lineTo(radius - 20, 0);
    ctx.stroke();
    ctx.restore();

    angle += speed;
    if (angle > Math.PI * 2) angle -= Math.PI * 2;
}

function gameLoop() {
    if (isRunning) {
        draw();
        requestAnimationFrame(gameLoop);
    }
}

// ============ УПРАВЛЕНИЕ ИГРОЙ ============
function resetGame() {
    const settings = difficultySettings[currentDifficulty];
    speed = settings.speed;
    attempts = settings.attempts;
    score = 0;
    isRunning = false;
    angle = 0;
    gamePhase = 'ready';
    scoreEl.textContent = score;
    messageEl.textContent = '';
    clickBtn.disabled = false;
    clickBtn.textContent = 'НАЖМИ!';
    adBtn.style.display = 'none';
    shareBtn.style.display = 'none';
}

function endGame() {
    isRunning = false;
    gamePhase = 'ended';
    messageEl.innerHTML = `<b>Игра окончена!<br>Ваш счёт: ${score}</b>`;
    clickBtn.disabled = true;
    adBtn.style.display = 'inline-block';
    shareBtn.style.display = 'inline-block';
    saveScoreToLeaderboard();
}

function checkHit() {
    let normalized = ((angle + Math.PI) % (2 * Math.PI)) - Math.PI; // [-π, π]
    if (normalized >= -Math.PI / 6 && normalized <= Math.PI / 6) {
        const accuracy = 1 - Math.abs(normalized) / (Math.PI / 6);
        const points = Math.max(10, Math.floor(accuracy * 100));
        score += points;
        scoreEl.textContent = score;
        messageEl.textContent = `✅ Точно! +${points} очков`;
        setTimeout(() => {
            if (gamePhase !== 'ended') {
                gamePhase = 'ready';
                clickBtn.textContent = 'НАЖМИ!';
            }
        }, 1500);
    } else {
        attempts--;
        messageEl.textContent = '❌ Мимо!';
        if (attempts <= 0) {
            endGame();
        } else {
            adBtn.style.display = 'inline-block';
            setTimeout(() => {
                if (gamePhase !== 'ended') {
                    adBtn.style.display = 'none';
                    gamePhase = 'ready';
                    clickBtn.textContent = 'НАЖМИ!';
                }
            }, 5000);
        }
    }
}

// ============ ОБРАБОТЧИКИ ============
document.querySelectorAll('.diff-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentDifficulty = btn.dataset.level;
        resetGame();
    });
});

clickBtn.addEventListener('click', () => {
    if (gamePhase === 'ready') {
        gamePhase = 'waiting';
        isRunning = true;
        gameLoop();
        messageEl.textContent = 'Жди зелёную зону...';
        clickBtn.textContent = 'СТОП!';
    } else if (gamePhase === 'waiting') {
        gamePhase = 'stopped';
        isRunning = false;
        checkHit();
    }
});

// ============ РЕКЛАМА ============
async function showRewardedAd() {
    if (!isYandexEnv || !yandexSDK) {
        alert('РЕКЛАМА: +1 попытка (тестовый режим)');
        return true;
    }

    try {
        const isAvailable = await yandexSDK.adv.isRewardedVideoAvailable();
        if (!isAvailable) {
            await yandexSDK.adv.loadRewardedVideo();
        }
        await yandexSDK.adv.showRewardedVideo();
        return true;
    } catch (error) {
        console.warn('Реклама недоступна:', error);
        alert('Реклама временно недоступна.');
        return false;
    }
}

adBtn.addEventListener('click', async () => {
    adBtn.disabled = true;
    const success = await showRewardedAd();
    if (success) {
        attempts = 1;
        adBtn.style.display = 'none';
        gamePhase = 'ready';
        clickBtn.textContent = 'НАЖМИ!';
        clickBtn.disabled = false;
        messageEl.textContent = '❤️ +1 попытка!';
    }
    adBtn.disabled = false;
});

// ============ ЛИДЕРБОРД ============
async function saveScoreToLeaderboard() {
    if (!isYandexEnv || !yandexSDK) return;
    try {
        await yandexSDK.leaderboards.setScore('global_score', score);
        await yandexSDK.leaderboards.setScore('friends_score', score);
    } catch (e) {
        console.warn('Ошибка сохранения в лидерборд:', e);
    }
}

async function showLeaderboard() {
    if (!isYandexEnv || !yandexSDK) {
        alert('Лидерборд доступен только в Яндекс.Играх!');
        return;
    }
    try {
        await yandexSDK.leaderboards.getEntries('global_score', { includeUser: true, quantityTop: 10 });
        await yandexSDK.leaderboards.show('global_score');
    } catch (e) {
        alert('Ошибка открытия лидерборда.');
    }
}

leaderboardBtn.addEventListener('click', showLeaderboard);

// ============ ПОДЕЛИТЬСЯ ============
async function shareResult() {
    if (!isYandexEnv || !yandexSDK) {
        alert(`Мой счёт: ${score}! Сыграй сам: https://axelmoug.github.io/timing-clicker/`);
        return;
    }
    try {
        await yandexSDK.share({
            text: `Я набрал ${score} очков в игре "Попади в зелёную зону!"`,
            url: 'https://axelmoug.github.io/timing-clicker/'
        });
    } catch (e) {
        alert('Не удалось поделиться.');
    }
}

shareBtn.addEventListener('click', shareResult);

// ============ СТАРТ ============
resetGame();