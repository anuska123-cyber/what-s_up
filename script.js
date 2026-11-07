
// =====================================
// LITTLE DIWALI NIGHT
// Main Game Controller
// =====================================

const $ = (id) => document.getElementById(id);
const screens = document.querySelectorAll(".screen");

function showScreen(id) {
    screens.forEach(screen => screen.classList.add("hidden"));
    $(id).classList.remove("hidden");
    window.scrollTo(0, 0);
}

// =====================================
// WELCOME AND NAVIGATION
// =====================================

$("startBtn").addEventListener("click", () => {
    showScreen("dashboard");
});

document.querySelectorAll("[data-open]").forEach(button => {
    button.addEventListener("click", () => {
        const game = button.dataset.open;
        showScreen(game);

        if (game === "rangoli") resizeRangoli();
        if (game === "fireworks") startFireworksAnimation();
    });
});

document.querySelectorAll(".back-btn").forEach(button => {
    button.addEventListener("click", () => {
        if (diyaInterval) {
            clearInterval(diyaInterval);
            diyaInterval = null;
        }

        stopFireworksAnimation();
        showScreen("dashboard");
    });
});

$("finishBtn").addEventListener("click", () => {
    showScreen("ending");
});

$("replayBtn").addEventListener("click", () => {
    resetDiyaGame();
    showScreen("welcome");
});

// =====================================
// OPTIONAL SOUND EFFECTS
// =====================================

let soundEnabled = false;
let audioContext = null;

$("soundBtn").addEventListener("click", () => {
    soundEnabled = !soundEnabled;
    $("soundBtn").textContent = soundEnabled ? "🔊" : "🔇";

    if (soundEnabled) {
        try {
            audioContext = audioContext ||
                new (window.AudioContext || window.webkitAudioContext)();

            audioContext.resume();
        } catch (error) {
            soundEnabled = false;
            $("soundBtn").textContent = "🔇";
        }
    }
});

function playSound(frequency = 500, duration = 0.15) {
    if (!soundEnabled || !audioContext) return;

    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();

    oscillator.type = "sine";
    oscillator.frequency.value = frequency;

    gain.gain.setValueAtTime(0.08, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(
        0.001,
        audioContext.currentTime + duration
    );

    oscillator.connect(gain);
    gain.connect(audioContext.destination);

    oscillator.start();
    oscillator.stop(audioContext.currentTime + duration);
}

// =====================================
// RANGOLI STUDIO
// =====================================

const rangoliCanvas = $("rangoliCanvas");
const rangoliCtx = rangoliCanvas.getContext("2d");

let drawing = false;
let currentColor = "#ff4d9d";
let brushSize = 8;
let lastPoint = null;

function resizeRangoli() {
    const rect = rangoliCanvas.getBoundingClientRect();
    if (!rect.width) return;

    const oldImage = rangoliCanvas.width
        ? rangoliCanvas.toDataURL()
        : null;

    const size = Math.min(rect.width, 650);
    const ratio = Math.min(window.devicePixelRatio || 1, 2);

    rangoliCanvas.width = size * ratio;
    rangoliCanvas.height = size * ratio;

    rangoliCtx.setTransform(ratio, 0, 0, ratio, 0, 0);
    rangoliCanvas.dataset.logicalSize = size;

    rangoliCtx.fillStyle = "#17112e";
    rangoliCtx.fillRect(0, 0, size, size);

    if (oldImage) {
        const image = new Image();

        image.onload = () => {
            rangoliCtx.drawImage(image, 0, 0, size, size);
        };

        image.src = oldImage;
    }
}

window.addEventListener("resize", () => {
    if (!$("rangoli").classList.contains("hidden")) {
        resizeRangoli();
    }
});

function getCanvasPoint(event) {
    const rect = rangoliCanvas.getBoundingClientRect();

    return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
    };
}

rangoliCanvas.addEventListener("pointerdown", event => {
    event.preventDefault();

    drawing = true;
    rangoliCanvas.setPointerCapture(event.pointerId);
    lastPoint = getCanvasPoint(event);

    rangoliCtx.beginPath();
    rangoliCtx.fillStyle = currentColor;
    rangoliCtx.arc(
        lastPoint.x,
        lastPoint.y,
        brushSize / 2,
        0,
        Math.PI * 2
    );
    rangoliCtx.fill();
});

rangoliCanvas.addEventListener("pointermove", event => {
    if (!drawing || !lastPoint) return;

    event.preventDefault();

    const point = getCanvasPoint(event);

    rangoliCtx.beginPath();
    rangoliCtx.strokeStyle = currentColor;
    rangoliCtx.lineWidth = brushSize;
    rangoliCtx.lineCap = "round";
    rangoliCtx.lineJoin = "round";

    rangoliCtx.moveTo(lastPoint.x, lastPoint.y);
    rangoliCtx.lineTo(point.x, point.y);
    rangoliCtx.stroke();

    lastPoint = point;
});

function stopDrawing() {
    drawing = false;
    lastPoint = null;
}

rangoliCanvas.addEventListener("pointerup", stopDrawing);
rangoliCanvas.addEventListener("pointercancel", stopDrawing);
rangoliCanvas.addEventListener("lostpointercapture", stopDrawing);

document.querySelectorAll(".color-btn").forEach(button => {
    button.addEventListener("click", () => {
        document.querySelectorAll(".color-btn")
            .forEach(btn => btn.classList.remove("selected"));

        button.classList.add("selected");
        currentColor = button.dataset.color;
    });
});

$("brushSize").addEventListener("input", event => {
    brushSize = Number(event.target.value);
});

$("clearRangoli").addEventListener("click", () => {
    const size = Number(rangoliCanvas.dataset.logicalSize);

    rangoliCtx.clearRect(0, 0, size, size);
    rangoliCtx.fillStyle = "#17112e";
    rangoliCtx.fillRect(0, 0, size, size);

    playSound(300);
});

$("saveRangoli").addEventListener("click", () => {
    const link = document.createElement("a");

    link.download = "My-Diwali-Rangoli.png";
    link.href = rangoliCanvas.toDataURL("image/png");
    link.click();

    playSound(700);
});

// =====================================
// DIYA LIGHTING CHALLENGE
// =====================================

const TOTAL_DIYAS = 12;
const GAME_TIME = 10;

let litDiyas = 0;
let timeLeft = GAME_TIME;
let diyaInterval = null;
let diyaStarted = false;

function createDiyas() {
    const grid = $("diyaGrid");
    grid.innerHTML = "";

    for (let i = 0; i < TOTAL_DIYAS; i++) {
        const diya = document.createElement("button");

        diya.className = "diya-item";
        diya.textContent = "🪔";
        diya.setAttribute("aria-label", "Unlit diya");
        diya.disabled = true;

        diya.addEventListener("click", () => {
            if (!diyaStarted || diya.classList.contains("lit")) return;

            diya.classList.add("lit");
            diya.textContent = "🔥";
            diya.setAttribute("aria-label", "Lighted diya");
            diya.disabled = true;

            litDiyas++;

            $("litCount").textContent =
                `${litDiyas}/${TOTAL_DIYAS}`;

            playSound(500 + litDiyas * 40);

            if (litDiyas === TOTAL_DIYAS) {
                finishDiyaGame(true);
            }
        });

        grid.appendChild(diya);
    }
}

function resetDiyaGame() {
    if (diyaInterval) {
        clearInterval(diyaInterval);
        diyaInterval = null;
    }

    diyaStarted = false;
    litDiyas = 0;
    timeLeft = GAME_TIME;

    $("timer").textContent = timeLeft;
    $("litCount").textContent = `0/${TOTAL_DIYAS}`;
    $("diyaMessage").textContent =
        "Ready? Let the celebration begin!";

    $("startDiyaGame").disabled = false;
    $("startDiyaGame").textContent = "Start Challenge 🪔";

    createDiyas();
}

function startDiyaGame() {
    resetDiyaGame();

    diyaStarted = true;

    $("diyaMessage").textContent = "Go! Light them all! ✨";
    $("startDiyaGame").disabled = true;
    $("startDiyaGame").textContent = "Challenge in progress...";

    document.querySelectorAll(".diya-item").forEach(diya => {
        diya.disabled = false;
    });

    diyaInterval = setInterval(() => {
        timeLeft--;
        $("timer").textContent = timeLeft;

        if (timeLeft <= 0) {
            finishDiyaGame(false);
        }
    }, 1000);
}

function finishDiyaGame(won) {
    if (diyaInterval) {
        clearInterval(diyaInterval);
        diyaInterval = null;
    }

    diyaStarted = false;

    document.querySelectorAll(".diya-item").forEach(diya => {
        diya.disabled = true;
    });

    $("startDiyaGame").disabled = false;
    $("startDiyaGame").textContent = "Play Again 🪔";

    if (won) {
        $("diyaMessage").textContent =
            "🎉 Amazing! You lit every diya! Happy Diwali!";
        playSound(900, 0.3);
    } else {
        $("diyaMessage").textContent =
            `Time's up! You lit ${litDiyas} out of ${TOTAL_DIYAS} diyas. Try again!`;
    }
}

$("startDiyaGame").addEventListener("click", startDiyaGame);
createDiyas();

// =====================================
// FIREWORKS FESTIVAL - FOUR FIREWORKS
// =====================================

const fireworksCanvas = $("fireworksCanvas");
const fireCtx = fireworksCanvas.getContext("2d");
const fireworksArea = $("fireworksArea");

let particles = [];
let fireworkCount = 0;
let fireworksRunning = false;
let animationFrame = null;
let selectedCracker = "spinner";
let lastFrameTime = 0;

const crackerHints = {
    spinner: "🌀 Tap the ground to spin your firework!",
    sparkler: "✨ Tap anywhere to create sparkling trails!",
    bomb: "💥 Tap the sky to launch a colourful burst!",
    flowerpot: "🎇 Tap the ground to create a golden fountain!"
};

document.querySelectorAll(".cracker-btn").forEach(button => {
    button.addEventListener("click", () => {
        document.querySelectorAll(".cracker-btn")
            .forEach(btn => btn.classList.remove("selected"));

        button.classList.add("selected");
        selectedCracker = button.dataset.cracker;

        $("crackerHint").textContent = crackerHints[selectedCracker];

        playSound(550);
    });
});

function resizeFireworks() {
    const rect = fireworksArea.getBoundingClientRect();

    if (!rect.width || !rect.height) return;

    const ratio = Math.min(window.devicePixelRatio || 1, 2);

    fireworksCanvas.width = Math.round(rect.width * ratio);
    fireworksCanvas.height = Math.round(rect.height * ratio);

    fireCtx.setTransform(ratio, 0, 0, ratio, 0, 0);
}

// Resize the fireworks canvas when the browser window changes.
window.addEventListener("resize", () => {
    if (!$("fireworks").classList.contains("hidden")) {
        resizeFireworks();
    }
});

function startFireworksAnimation() {
    if (fireworksRunning) return;

    resizeFireworks();

    fireworksRunning = true;
    lastFrameTime = 0;

    animationFrame = requestAnimationFrame(animateFireworks);
}

function stopFireworksAnimation() {
    fireworksRunning = false;

    if (animationFrame !== null) {
        cancelAnimationFrame(animationFrame);
        animationFrame = null;
    }

    particles = [];
}

function addParticle(
    x, y, vx, vy, color,
    size = 3, gravity = 0.035, life = 1
) {
    particles.push({
        x, y, vx, vy,
        color,
        size,
        gravity,
        alpha: life
    });
}

// Ground spinner

function createSpinner(x, y) {
    const colors = ["#ffd166", "#ff4d9d", "#4dd8ff", "#ffffff"];

    for (let i = 0; i < 85; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 4 + 1;

        addParticle(
            x, y,
            Math.cos(angle) * speed,
            Math.sin(angle) * speed * 0.65,
            colors[Math.floor(Math.random() * colors.length)],
            Math.random() * 3 + 1,
            0.015,
            1.2
        );
    }

    playSound(400, 0.25);
}

// Sparkler

function createSparkler(x, y) {
    const colors = ["#ffd166", "#fff4b0", "#ffffff"];

    for (let i = 0; i < 30; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 3;

        addParticle(
            x, y,
            Math.cos(angle) * speed,
            Math.sin(angle) * speed,
            colors[Math.floor(Math.random() * colors.length)],
            Math.random() * 2 + 1,
            0.025,
            0.8
        );
    }

    playSound(750, 0.1);
}

// Small bomb

function createBomb(x, y) {
    const colors = [
        "#ff4d9d", "#ffd166", "#4dd8ff",
        "#9b7bff", "#ffffff"
    ];

    for (let i = 0; i < 110; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 5 + 1;

        addParticle(
            x, y,
            Math.cos(angle) * speed,
            Math.sin(angle) * speed,
            colors[Math.floor(Math.random() * colors.length)],
            Math.random() * 3 + 1,
            0.035,
            1.3
        );
    }

    playSound(250, 0.35);
}

// Flower pot fountain

function createFlowerPot(x, y) {
    const colors = ["#ffd166", "#ffae42", "#fff4b0", "#ffffff"];

    for (let i = 0; i < 100; i++) {
        const angle = (-Math.PI / 2) +
            (Math.random() - 0.5) * 1.8;

        const speed = Math.random() * 5 + 2;

        addParticle(
            x, y,
            Math.cos(angle) * speed,
            Math.sin(angle) * speed,
            colors[Math.floor(Math.random() * colors.length)],
            Math.random() * 3 + 1,
            0.09,
            1.2
        );
    }

    playSound(600, 0.3);
}

// Launch selected firework

function launchFirework(x, y) {
    switch (selectedCracker) {
        case "spinner":
            createSpinner(x, y);
            break;

        case "sparkler":
            createSparkler(x, y);
            break;

        case "bomb":
            createBomb(x, y);
            break;

        case "flowerpot":
            createFlowerPot(x, y);
            break;
    }

    fireworkCount++;
    $("fireworkCount").textContent = fireworkCount;
}

// Animation loop

function animateFireworks(timestamp = 0) {
    if (!fireworksRunning) return;

    if (timestamp - lastFrameTime >= 1000 / 30) {
        lastFrameTime = timestamp;

        const rect = fireworksArea.getBoundingClientRect();

        fireCtx.clearRect(0, 0, rect.width, rect.height);

        particles.forEach(particle => {
            particle.x += particle.vx;
            particle.y += particle.vy;

            particle.vy += particle.gravity;

            particle.vx *= 0.985;
            particle.vy *= 0.985;

            particle.alpha -= 0.012;

            fireCtx.globalAlpha = Math.max(0, particle.alpha);
            fireCtx.fillStyle = particle.color;
            fireCtx.shadowBlur = 12;
            fireCtx.shadowColor = particle.color;

            fireCtx.beginPath();
            fireCtx.arc(
                particle.x,
                particle.y,
                particle.size,
                0,
                Math.PI * 2
            );

            fireCtx.fill();
        });

        fireCtx.globalAlpha = 1;
        fireCtx.shadowBlur = 0;

        particles = particles.filter(p => p.alpha > 0);
    }

    animationFrame = requestAnimationFrame(animateFireworks);
}

// Tap to launch fireworks

fireworksArea.addEventListener("pointerdown", event => {
    if (!fireworksRunning) return;

    // Avoid launching a firework when a selection button is clicked.
    if (event.target.closest(".cracker-btn")) return;

    const rect = fireworksArea.getBoundingClientRect();

    launchFirework(
        event.clientX - rect.left,
        event.clientY - rect.top
    );
});

// Reset fireworks

$("resetFireworks").addEventListener("click", () => {
    particles = [];
    fireworkCount = 0;

    $("fireworkCount").textContent = "0";

    playSound(600);
});

// =====================================
// INITIAL SETUP
// =====================================

resetDiyaGame();

console.log("🪔 Little Diwali Night is ready!");
