const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.querySelector('#score span');
const messageEl = document.getElementById('message');
const clickBtn = document.getElementById('clickBtn');
const adBtn = document.getElementById('adBtn');

let score = 0;
let attempts = 3;
let isRunning = false;
let angle = 0;
let speed = 0.05;

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = 180;

    // Зелёная зона (фиксированная)
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, -Math.PI / 6, Math.PI / 6);
    ctx.strokeStyle = '#4CAF50';
    ctx.lineWidth = 30;
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

function update() {
    if (!isRunning) return;
    draw();
    requestAnimationFrame(update);
}

function checkHit() {
    // Нормализуем угол от -π до π
    let normalized = angle;
    if (normalized > Math.PI) normalized -= 2 * Math.PI;
    if (normalized < -Math.PI) normalized += 2 * Math.PI;

    // Зелёная зона: от -π/6 до π/6
    if (normalized >= -Math.PI / 6 && normalized <= Math.PI / 6) {
        const accuracy = 1 - Math.abs(normalized) / (Math.PI / 6);
        const points = Math.max(10, Math.floor(accuracy * 100));
        score += points;
        scoreEl.textContent = score;
        messageEl.textContent = `✅ Точно! +${points} очков`;
        setTimeout(() => messageEl.textContent = '', 1500);
    } else {
        attempts--;
        messageEl.innerHTML = '❌ Мимо!';
        if (attempts <= 0) {
            endGame();
        } else {
            showAdButton();
        }
    }
}

function endGame() {
    isRunning = false;
    messageEl.innerHTML = `<b>Игра окончена!<br>Ваш счёт: ${score}</b>`;
    clickBtn.disabled = true;
    adBtn.style.display = 'inline-block';
}

function showAdButton() {
    adBtn.style.display = 'inline-block';
    setTimeout(() => {
        adBtn.style.display = 'none';
    }, 5000);
}

clickBtn.addEventListener('click', () => {
    if (!isRunning) {
        isRunning = true;
        update();
        messageEl.textContent = 'Жди зелёную зону...';
        setTimeout(() => {
            clickBtn.textContent = 'СТОП!';
            clickBtn.onclick = checkHit;
        }, 2000);
    }
});

adBtn.addEventListener('click', () => {
    // Здесь будет вызов рекламы (Yandex или VK)
    alert('РЕКЛАМА: +1 попытка!');
    attempts = 1;
    adBtn.style.display = 'none';
    clickBtn.textContent = 'НАЖМИ!';
    clickBtn.onclick = () => {
        isRunning = true;
        angle = 0;
        update();
        messageEl.textContent = 'Жди зелёную зону...';
        setTimeout(() => {
            clickBtn.textContent = 'СТОП!';
            clickBtn.onclick = checkHit;
        }, 2000);
    };
});

// Старт
scoreEl.textContent = score;