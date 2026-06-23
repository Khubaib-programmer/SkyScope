// ============================================
// Animated starfield background with shooting stars
// ============================================

let _starfieldInterval = null;

function createStarfield() {
  const container = document.getElementById("starfield");
  if (!container) return;

  const starCount = 200;

  for (let i = 0; i < starCount; i++) {
    const star = document.createElement("div");
    star.className = "star" + (Math.random() > 0.85 ? " bright" : "");

    const size = Math.random() * 2.5 + 0.5;
    star.style.width = `${size}px`;
    star.style.height = `${size}px`;
    star.style.top = `${Math.random() * 100}%`;
    star.style.left = `${Math.random() * 100}%`;
    star.style.animationDelay = `${Math.random() * 5}s`;
    star.style.animationDuration = `${2 + Math.random() * 4}s`;

    container.appendChild(star);
  }

  // Store interval reference so it can be stopped
  _starfieldInterval = setInterval(() => {
    if (Math.random() > 0.4) _launchShootingStar(container);
  }, 3000);

  // Launch one right away for impact
  setTimeout(() => _launchShootingStar(container), 1500);
}

function _launchShootingStar(container) {
  const star = document.createElement("div");
  star.className = "shooting-star";
  star.style.top = `${Math.random() * 50}%`;
  star.style.left = `${Math.random() * 60}%`;
  star.style.width = `${60 + Math.random() * 80}px`;

  const angle = 25 + Math.random() * 20;
  star.style.transform = `rotate(${angle}deg)`;

  const duration = 0.6 + Math.random() * 0.5;
  star.style.animationDuration = `${duration}s`;

  container.appendChild(star);
  setTimeout(() => star.remove(), duration * 1000 + 100);
}

// Stop shooting star interval when leaving landing page
function stopStarfield() {
  if (_starfieldInterval) {
    clearInterval(_starfieldInterval);
    _starfieldInterval = null;
  }
}

// Resume shooting stars when returning to landing page
function resumeStarfield() {
  if (_starfieldInterval) return; // already running
  const container = document.getElementById("starfield");
  if (!container) return;

  _starfieldInterval = setInterval(() => {
    if (Math.random() > 0.4) _launchShootingStar(container);
  }, 3000);
}

document.addEventListener("DOMContentLoaded", createStarfield);
