import './style.css';
import { game } from './game.js';
import { audio } from './audio.js';

// DOM Elements
const screenOverlay = document.getElementById('screen-overlay');
const screenStart = document.getElementById('screen-start');
const screenGameOver = document.getElementById('screen-gameover');
const btnStartGame = document.getElementById('btn-start-game');
const btnRestartGame = document.getElementById('btn-restart-game');

const hudScore = document.getElementById('hud-score');
const hudMultiplier = document.getElementById('hud-multiplier');
const hudCoins = document.getElementById('hud-coins');
const btnToggleAuto = document.getElementById('btn-toggle-auto');
const hudAuto = document.getElementById('hud-auto');

const summaryScore = document.getElementById('summary-score');
const summaryCoins = document.getElementById('summary-coins');
const summaryHighScore = document.getElementById('summary-highscore');

const btnToggleMusic = document.getElementById('btn-toggle-music');
const lblMusic = document.getElementById('lbl-music');
const btnToggleSfx = document.getElementById('btn-toggle-sfx');
const lblSfx = document.getElementById('lbl-sfx');

// Animation Loop handle
let animationFrameId = null;

// Audio settings toggles
btnToggleMusic.addEventListener('click', () => {
  const current = audio.musicEnabled;
  audio.setMusicEnabled(!current);
  btnToggleMusic.classList.toggle('active', !current);
  lblMusic.textContent = !current ? 'ON' : 'OFF';
  btnToggleMusic.blur(); // Remove focus highlight
});

btnToggleSfx.addEventListener('click', () => {
  const current = audio.sfxEnabled;
  audio.setSfxEnabled(!current);
  btnToggleSfx.classList.toggle('active', !current);
  lblSfx.textContent = !current ? 'ON' : 'OFF';
  btnToggleSfx.blur();
});

btnToggleAuto.addEventListener('click', () => {
  const current = game.autopilot;
  game.autopilot = !current;
  btnToggleAuto.classList.toggle('active', !current);
  hudAuto.textContent = !current ? 'ON' : 'OFF';
  btnToggleAuto.blur();
});

// Setup Hoverboard Shop item purchase and equipment
const setupShopListeners = () => {
  const shopItems = document.querySelectorAll('.shop-item');
  shopItems.forEach(item => {
    item.addEventListener('click', () => {
      const boardId = item.getAttribute('data-board');
      const cost = parseInt(item.getAttribute('data-cost'));
      
      if (game.ownedBoards.includes(boardId)) {
        // Equip immediately if owned
        game.equipBoard(boardId);
        game.updateSidebarUI();
      } else {
        // Attempt to purchase
        const success = game.buyBoard(boardId, cost);
        if (!success) {
          // Visual warning cue (flash red)
          item.style.borderColor = 'hsl(0, 100%, 60%)';
          item.style.boxShadow = '0 0 15px hsla(0, 100%, 60%, 0.8)';
          audio.playTone(150, 'sawtooth', 0.2, 0.05, audio.ctx ? audio.ctx.currentTime : 0); // Buzz tone
          
          setTimeout(() => {
            item.style.borderColor = '';
            item.style.boxShadow = '';
          }, 300);
        }
      }
    });
  });
};

// UI HUD Updates
const onGameStateUpdate = (state) => {
  // Pad score with leading zeros
  if (hudScore) {
    const padded = String(Math.floor(state.score)).padStart(6, '0');
    hudScore.textContent = padded;
  }
  if (hudCoins) {
    hudCoins.textContent = state.coins;
  }
  if (hudMultiplier) {
    hudMultiplier.textContent = `x${state.multiplier}`;
  }
};

// Game Over event
const onGameOver = (summary) => {
  screenOverlay.classList.remove('hidden');
  screenStart.classList.add('hidden');
  screenGameOver.classList.remove('hidden');
  
  if (summaryScore) summaryScore.textContent = summary.score.toLocaleString();
  if (summaryCoins) summaryCoins.textContent = summary.coins.toLocaleString();
  if (summaryHighScore) summaryHighScore.textContent = summary.highScore.toLocaleString();
};

// Start run trigger
const startNewRun = () => {
  screenOverlay.classList.add('hidden');
  screenStart.classList.add('hidden');
  screenGameOver.classList.add('hidden');
  
  game.startGame();
};

let lastPopupTime = 0;

const handleStartClick = () => {
  lastPopupTime = Date.now();
  window.open('https://www.effectivecpmnetwork.com/cvjynzhf15?key=0a94fab7eb599bb285842ee1aeb3018f', '_blank');
  startNewRun();
};

btnStartGame.addEventListener('click', handleStartClick);
btnRestartGame.addEventListener('click', handleStartClick);

// 10-Second Interval Popunder Ad Trigger (tied to user interaction to bypass popup blockers)
const triggerPopupAd = () => {
  const now = Date.now();
  if (now - lastPopupTime >= 10000) {
    lastPopupTime = now;
    window.open('https://www.effectivecpmnetwork.com/cvjynzhf15?key=0a94fab7eb599bb285842ee1aeb3018f', '_blank');
  }
};

document.addEventListener('click', triggerPopupAd);
document.addEventListener('keydown', triggerPopupAd);
document.addEventListener('touchstart', triggerPopupAd);

// Global render animation tick
const tick = () => {
  const delta = game.clock.getDelta();
  game.update(delta);
  animationFrameId = requestAnimationFrame(tick);
};

// Boot Game
const init = () => {
  // Initialize ThreeJS canvas wrapper
  game.init('canvas-wrapper', onGameStateUpdate, onGameOver);
  
  // Set up listeners for the hoverboard shop items
  setupShopListeners();
  
  // Start animation frame loop
  tick();
};

// Run after page finishes loading
window.addEventListener('load', () => {
  init();
});

// Auto-refresh banner ads every 5 seconds to optimize CPM impressions
setInterval(() => {
  const adContainers = document.querySelectorAll('.banner-ad-large');
  adContainers.forEach(container => {
    const iframe = container.querySelector('iframe');
    if (iframe) {
      // Force reload by changing the query parameter of the iframe source
      iframe.src = `./ad-banner.html?t=${Date.now()}`;
    }
  });
}, 5000);
