import { escapementAudio } from './audio.js';

// Configuration (Using user's 100-frame assets sequence)
const TOTAL_FRAMES = 100;
const FRAME_BASE_PATH = '/assets/Watch_components_disassembling_20260930114213_';
const FRAME_EXT = '.jpg';

// Narrative Phase definitions according to user specification (Alternating Left / Right)
const NARRATIVE_PHASES = [
  { id: 'narrative-hero', start: 0.00, end: 0.08, side: 'center', name: '01. ASSEMBLED HERO' },
  { id: 'narrative-left-1', start: 0.08, end: 0.24, side: 'left', name: '02. THE ARCHITECTURE' },
  { id: 'narrative-right-1', start: 0.24, end: 0.40, side: 'right', name: '03. SKELETONIZED GEOMETRY' },
  { id: 'narrative-left-2', start: 0.40, end: 0.58, side: 'left', name: '04. THE REGULATING ORGAN' },
  { id: 'narrative-right-2', start: 0.58, end: 0.74, side: 'right', name: '05. MECHANICAL ARCHITECTURE' },
  { id: 'narrative-left-3', start: 0.74, end: 0.88, side: 'left', name: '06. MÉTIERS D\'ART' },
  { id: 'narrative-right-3', start: 0.88, end: 1.00, side: 'right', name: '07. HARMONIC CONVERGENCE' }
];

// State
let images = [];
let loadedCount = 0;
let targetProgress = 0;
let currentProgress = 0;
let currentFrameIndex = 0;
let isAutoPlaying = false;
let autoPlayDirection = 1;
let autoPlaySpeed = 0.0015;
let isScrubbing = false;

// DOM Elements
const canvas = document.getElementById('watch-canvas');
const ctx = canvas.getContext('2d', { alpha: false });
const preloader = document.getElementById('preloader');
const loaderBar = document.getElementById('loader-bar');
const loaderPercent = document.getElementById('loader-percent');
const mainNav = document.getElementById('main-nav');
const scrollContainer = document.getElementById('hero-scroll-container');
const frameSlider = document.getElementById('frame-slider');
const hudFrameNum = document.getElementById('hud-frame-num');
const hudPercent = document.getElementById('hud-percent');
const hudPhaseName = document.getElementById('hud-phase-name');
const hudPlayBtn = document.getElementById('hud-play-btn');
const hudPlayIcon = document.getElementById('hud-play-icon');
const hudPauseIcon = document.getElementById('hud-pause-icon');
const audioToggleBtn = document.getElementById('audio-toggle');
const audioMutedIcon = document.getElementById('audio-icon-muted');
const audioPlayingIcon = document.getElementById('audio-icon-playing');
const explodedHotspots = document.getElementById('exploded-hotspots');
const vipModal = document.getElementById('vip-modal');
const inquireBtn = document.getElementById('inquire-btn');
const vipInquireBtn = document.getElementById('vip-inquire-btn');
const closeModalBtn = document.getElementById('close-modal');
const vipForm = document.getElementById('vip-form');
const ambientGlow = document.getElementById('ambient-glow');

// Fallback poster element
const posterFallback = document.getElementById('watch-poster-fallback');

// Dismiss preloader function
function dismissPreloader() {
  if (preloader) {
    preloader.classList.add('loaded');
    setTimeout(() => {
      preloader.style.display = 'none';
    }, 600);
  }
}

// Emergency safety fallback: dismiss preloader after 1.2s max no matter what
setTimeout(dismissPreloader, 1200);

// Initialize image preloading pipeline
function initImagePreloader() {
  images = new Array(TOTAL_FRAMES);

  // 1. Load First Frame First for immediate visual display
  const firstImg = new Image();
  firstImg.src = getFrameUrl(0);
  firstImg.onload = () => {
    images[0] = firstImg;
    loadedCount++;
    updateLoader(loadedCount);
    resizeCanvas();
    renderFrame(0);

    // Dismiss preloader as soon as hero watch is rendered!
    setTimeout(dismissPreloader, 250);

    // 2. Load all remaining frames asynchronously in background
    preloadRemainingFrames();
  };

  firstImg.onerror = () => {
    console.error('Failed to load frame 0, dismissing preloader');
    dismissPreloader();
  };
}

function getFrameUrl(index) {
  const padded = String(index).padStart(3, '0');
  return `${FRAME_BASE_PATH}${padded}${FRAME_EXT}`;
}

function preloadRemainingFrames() {
  for (let i = 1; i < TOTAL_FRAMES; i++) {
    const img = new Image();
    img.src = getFrameUrl(i);
    img.onload = () => {
      images[i] = img;
      loadedCount++;
      updateLoader(loadedCount);
    };
    img.onerror = () => {
      // Fallback to frame 0 if any frame fails
      images[i] = images[0];
      loadedCount++;
      updateLoader(loadedCount);
    };
  }
}

function updateLoader(count) {
  const percent = Math.min(100, Math.round((count / TOTAL_FRAMES) * 100));
  if (loaderBar) loaderBar.style.width = `${percent}%`;
  if (loaderPercent) loaderPercent.textContent = `${percent}%`;
}

// Canvas Resizing with DevicePixelRatio support
let canvasWidth = 0;
let canvasHeight = 0;
let dpr = 1;

function resizeCanvas() {
  dpr = window.devicePixelRatio || 1;
  // Use viewport dimensions
  canvasWidth = window.innerWidth;
  canvasHeight = window.innerHeight;

  canvas.width = Math.round(canvasWidth * dpr);
  canvas.height = Math.round(canvasHeight * dpr);
  canvas.style.width = `${canvasWidth}px`;
  canvas.style.height = `${canvasHeight}px`;

  renderFrame(currentFrameIndex);
}

window.addEventListener('resize', resizeCanvas);

// High-Performance Frame Rendering with Seamless Background Blending
function renderFrame(index) {
  const img = images[index] || images[0];
  if (!img || !img.complete || img.naturalWidth === 0) return;

  // Hide fallback poster once canvas is rendering
  if (posterFallback && posterFallback.style.opacity !== '0') {
    posterFallback.style.opacity = '0';
  }

  // Idempotent transform reset - prevents compounding scale!
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  // Clear canvas with exact theme background
  ctx.fillStyle = '#050505';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Compute aspect ratio fit
  const imgAspect = img.naturalWidth / img.naturalHeight; // 480 / 270 = 1.7778
  const canvasAspect = canvasWidth / canvasHeight;

  let renderW, renderH;

  // Scale watch image to FULL SCREEN (fill viewport preserving crisp 16:9 aspect ratio)
  if (canvasAspect > imgAspect) {
    renderW = canvasWidth;
    renderH = renderW / imgAspect;
  } else {
    renderH = canvasHeight;
    renderW = renderH * imgAspect;
  }

  // Constant at the dead center - rock-solid with NO shifting
  const renderX = (canvasWidth - renderW) / 2;
  const renderY = (canvasHeight - renderH) / 2;

  // Draw crisp watch frame (natural black background blends seamlessly into #050505)
  ctx.drawImage(img, renderX, renderY, renderW, renderH);

  // Mask the Gemini watermark directly on the canvas with matching #050505 tone
  const wmLeft = renderX + (1130 / 1280) * renderW;
  const wmTop = renderY + (570 / 720) * renderH;
  const wmWidth = (65 / 1280) * renderW;
  const wmHeight = (65 / 720) * renderH;
  ctx.fillStyle = '#050505';
  ctx.fillRect(wmLeft, wmTop, wmWidth, wmHeight);

  // Position the luxury hallmark badge element directly centered over the watermark
  const maskBox = document.getElementById('gemini-mask-box');
  if (maskBox) {
    const centerX = wmLeft + wmWidth / 2;
    const centerY = wmTop + wmHeight / 2;
    maskBox.style.left = `${centerX}px`;
    maskBox.style.top = `${centerY}px`;
  }
}

// Scroll Calculation and Interpolation
function updateScrollProgress() {
  if (isScrubbing || isAutoPlaying) return;

  const rect = scrollContainer.getBoundingClientRect();
  const maxScroll = scrollContainer.offsetHeight - window.innerHeight;
  const currentScroll = -rect.top;

  let progress = currentScroll / maxScroll;
  progress = Math.max(0, Math.min(1, progress));
  targetProgress = progress;
}

window.addEventListener('scroll', () => {
  updateScrollProgress();

  // Glass Navbar scroll state (if present)
  if (mainNav) {
    if (window.scrollY > 40) {
      mainNav.classList.add('scrolled');
    } else {
      mainNav.classList.remove('scrolled');
    }
  }
}, { passive: true });

// Animation Loop (60 FPS smooth momentum)
function animationLoop() {
  // Handle Auto-Play Inspection mode
  if (isAutoPlaying) {
    targetProgress += autoPlaySpeed * autoPlayDirection;
    if (targetProgress >= 1) {
      targetProgress = 1;
      autoPlayDirection = -1;
    } else if (targetProgress <= 0) {
      targetProgress = 0;
      autoPlayDirection = 1;
    }
    // Sync window scroll with auto-play if within container
    const maxScroll = scrollContainer.offsetHeight - window.innerHeight;
    window.scrollTo({
      top: targetProgress * maxScroll,
      behavior: 'auto'
    });
  }

  // Smooth lerp interpolation for scroll
  const lerpFactor = 0.085;
  currentProgress += (targetProgress - currentProgress) * lerpFactor;

  // Calculate target frame
  const targetFrame = Math.min(TOTAL_FRAMES - 1, Math.max(0, Math.round(currentProgress * (TOTAL_FRAMES - 1))));

  if (targetFrame !== currentFrameIndex) {
    currentFrameIndex = targetFrame;
    renderFrame(currentFrameIndex);
    updateHUD(currentProgress, currentFrameIndex);
  }

  // Update Narrative Text Steps (Alternating Left & Right)
  updateNarrativeOverlays(currentProgress);

  // Update Ambient Glow intensity and color
  updateAmbientGlow(currentProgress);

  requestAnimationFrame(animationLoop);
}

// Update HUD & Slider
function updateHUD(progress, frameIdx) {
  if (!isScrubbing && frameSlider) {
    frameSlider.value = frameIdx;
  }
  if (hudFrameNum) {
    const formatted = String(frameIdx).padStart(3, '0');
    hudFrameNum.textContent = `${formatted} / ${TOTAL_FRAMES - 1}`;
  }
  if (hudPercent) {
    hudPercent.textContent = `${Math.round(progress * 100)}%`;
  }

  // Update Phase name
  const currentPhase = NARRATIVE_PHASES.find(p => progress >= p.start && progress <= p.end) || NARRATIVE_PHASES[0];
  if (hudPhaseName && hudPhaseName.textContent !== currentPhase.name) {
    hudPhaseName.textContent = currentPhase.name;
  }

  // Hotspots visibility: active primarily during exploded view (0.48 - 0.72)
  if (explodedHotspots) {
    if (progress >= 0.48 && progress <= 0.72) {
      explodedHotspots.style.opacity = '1';
      explodedHotspots.style.pointerEvents = 'auto';
    } else {
      explodedHotspots.style.opacity = '0';
      explodedHotspots.style.pointerEvents = 'none';
    }
  }
}

const HUD_PHASES = [
  {
    step: '01',
    side: 'left',
    eyebrow: 'MECHANICAL SYSTEM',
    headingMain: 'PRECISION',
    headingSub: 'IN MOTION',
    body: 'An intricate mechanical architecture engineered for precision, balance and perpetual motion.',
    specs: [
      { label: 'MOVEMENT', value: 'SKELETON AUTOMATIC' },
      { label: 'CASE', value: 'ROSE GOLD' },
      { label: 'CRYSTAL', value: 'SAPPHIRE' },
      { label: 'POWER RESERVE', value: '72 HOURS' }
    ]
  },
  {
    step: '02',
    side: 'right',
    eyebrow: 'DECONSTRUCTION',
    headingMain: 'CALIBRE',
    headingSub: 'UNVEILED',
    body: 'Exploded skeleton components revealing the architectural gear train and hand-chamfered bridges.',
    specs: [
      { label: 'GEAR TRAIN', value: '28,800 VPH' },
      { label: 'JEWELS', value: '38 SYNTHETIC RUBIES' },
      { label: 'FINISH', value: 'CÔTES DE GENÈVE' },
      { label: 'ESCAPEMENT', value: 'SILICON BALANCE' }
    ]
  },
  {
    step: '03',
    side: 'left',
    eyebrow: 'REGULATING ORGAN',
    headingMain: 'FLYING',
    headingSub: 'TOURBILLON',
    body: 'Gravity-defying 60-second tourbillon cage rotating perpetually to ensure chronometric perfection.',
    specs: [
      { label: 'CARRIAGE', value: 'GRADE 5 TITANIUM' },
      { label: 'MASS', value: '0.28 GRAMS' },
      { label: 'ROTATION', value: '60 SECONDS' },
      { label: 'REGULATION', value: '5 POSITIONS' }
    ]
  },
  {
    step: '04',
    side: 'right',
    eyebrow: 'HOROLOGICAL ART',
    headingMain: 'ETERNAL',
    headingSub: 'HARMONY',
    body: 'Seamless synthesis of haute horlogerie finishing, architectural aesthetics, and astronomical mechanics.',
    specs: [
      { label: 'WATER RESISTANCE', value: '30 METERS' },
      { label: 'STRAP', value: 'ALLIGATOR LEATHER' },
      { label: 'BUCKLE', value: '18K ROSE GOLD' },
      { label: 'EDITION', value: 'LIMITED 28 PCS' }
    ]
  }
];

let activePhaseIdx = -1;

// Update Horological HUD Overlays (Gauge Reticle, Bottom Progress, Left/Right Alternating Content)
function updateNarrativeOverlays(progress) {
  // Bottom Progress Track (01 ── 04)
  const bottomProg = document.getElementById('hud-bottom-progress');
  if (bottomProg) {
    const pct = Math.min(100, Math.max(3, progress * 100));
    bottomProg.style.width = `${pct}%`;
  }

  // Left Vertical Gauge Reticle ⊙ (travels smoothly from 01 to 04 along the ruler line)
  const reticle = document.getElementById('gauge-reticle');
  if (reticle) {
    const topPct = 8 + progress * 84;
    reticle.style.top = `${topPct}%`;
  }

  // Determine active phase (0 -> 1 -> 2 -> 3)
  const stepIdx = progress < 0.25 ? 0 : progress < 0.50 ? 1 : progress < 0.75 ? 2 : 3;
  if (activePhaseIdx !== stepIdx) {
    activePhaseIdx = stepIdx;
    const phase = HUD_PHASES[stepIdx];
    const leftCard = document.getElementById('hud-left-card');
    const rightCard = document.getElementById('hud-right-card');

    if (phase.side === 'left') {
      // Activate Left Card, Deactivate Right Card
      if (leftCard) {
        const eyebrow = document.getElementById('hud-left-eyebrow');
        const step = document.getElementById('hud-left-step');
        const heading = document.getElementById('hud-left-heading');
        const body = document.getElementById('hud-left-body');
        const specs = document.getElementById('hud-left-specs');

        if (eyebrow) eyebrow.textContent = phase.eyebrow;
        if (step) step.textContent = phase.step;
        if (heading) {
          heading.innerHTML = `<span class="text-white block font-medium">${phase.headingMain}</span><span class="text-[#c59a68] block font-light tracking-wide">${phase.headingSub}</span>`;
        }
        if (body) body.textContent = phase.body;
        if (specs) {
          specs.innerHTML = phase.specs.map(s => `
            <div class="hud-specs-row">
              <span class="hud-spec-label">${s.label}</span>
              <span class="hud-spec-val">${s.value}</span>
            </div>
          `).join('');
        }
        leftCard.classList.remove('hud-hidden');
      }
      if (rightCard) {
        rightCard.classList.add('hud-hidden');
      }
    } else {
      // Activate Right Card, Deactivate Left Card
      if (rightCard) {
        const eyebrow = document.getElementById('hud-right-eyebrow');
        const step = document.getElementById('hud-right-step');
        const heading = document.getElementById('hud-right-heading');
        const body = document.getElementById('hud-right-body');
        const specs = document.getElementById('hud-right-specs');

        if (eyebrow) eyebrow.textContent = phase.eyebrow;
        if (step) step.textContent = phase.step;
        if (heading) {
          heading.innerHTML = `<span class="text-white block font-medium">${phase.headingMain}</span><span class="text-[#c59a68] block font-light tracking-wide">${phase.headingSub}</span>`;
        }
        if (body) body.textContent = phase.body;
        if (specs) {
          specs.innerHTML = phase.specs.map(s => `
            <div class="hud-specs-row">
              <span class="hud-spec-label">${s.label}</span>
              <span class="hud-spec-val">${s.value}</span>
            </div>
          `).join('');
        }
        rightCard.classList.remove('hud-hidden');
      }
      if (leftCard) {
        leftCard.classList.add('hud-hidden');
      }
    }
  }
}

// Click listener to jump to detail phase on right cards
document.querySelectorAll('[data-jump-phase]').forEach(item => {
  item.addEventListener('click', () => {
    const phaseIdx = parseInt(item.getAttribute('data-jump-phase'), 10);
    const targets = [0.12, 0.36, 0.62, 0.88];
    const targetP = targets[phaseIdx] ?? 0;
    const maxScroll = scrollContainer.offsetHeight - window.innerHeight;
    window.scrollTo({
      top: targetP * maxScroll,
      behavior: 'smooth'
    });
  });
});

// Ambient Glow modulation
function updateAmbientGlow(progress) {
  if (!ambientGlow) return;
  // During exploded view (0.50 - 0.70), increase the amber warmth
  if (progress >= 0.45 && progress <= 0.75) {
    ambientGlow.style.opacity = '0.9';
    ambientGlow.style.transform = 'scale(1.15)';
  } else if (progress > 0.9) {
    ambientGlow.style.opacity = '0.8';
    ambientGlow.style.transform = 'scale(1.05)';
  } else {
    ambientGlow.style.opacity = '0.65';
    ambientGlow.style.transform = 'scale(1.0)';
  }
}

// Interactive Scrubber Event Handlers
if (frameSlider) {
  frameSlider.addEventListener('mousedown', () => { isScrubbing = true; });
  frameSlider.addEventListener('touchstart', () => { isScrubbing = true; });

  frameSlider.addEventListener('input', (e) => {
    const frame = parseInt(e.target.value, 10);
    const progress = frame / (TOTAL_FRAMES - 1);
    targetProgress = progress;
    currentProgress = progress;

    // Scroll window smoothly to match scrubbed position
    const maxScroll = scrollContainer.offsetHeight - window.innerHeight;
    window.scrollTo({
      top: progress * maxScroll,
      behavior: 'auto'
    });
  });

  window.addEventListener('mouseup', () => { isScrubbing = false; });
  window.addEventListener('touchend', () => { isScrubbing = false; });
}

// Auto-Play Toggle
if (hudPlayBtn) {
  hudPlayBtn.addEventListener('click', () => {
    isAutoPlaying = !isAutoPlaying;
    if (isAutoPlaying) {
      hudPlayIcon.classList.add('hidden');
      hudPauseIcon.classList.remove('hidden');
      hudPlayBtn.classList.add('text-[#dfc49e]');
    } else {
      hudPlayIcon.classList.remove('hidden');
      hudPauseIcon.classList.add('hidden');
      hudPlayBtn.classList.remove('text-[#dfc49e]');
    }
  });
}

// Escapement Audio Toggle
if (audioToggleBtn) {
  audioToggleBtn.addEventListener('click', () => {
    const isPlaying = escapementAudio.toggle();
    if (isPlaying) {
      audioMutedIcon.classList.add('hidden');
      audioPlayingIcon.classList.remove('hidden');
    } else {
      audioMutedIcon.classList.remove('hidden');
      audioPlayingIcon.classList.add('hidden');
    }
  });
}

// Layer Card Quick-Jump Triggers
document.querySelectorAll('.layer-card').forEach(card => {
  card.addEventListener('click', () => {
    const jumpProgress = parseFloat(card.dataset.jump);
    const maxScroll = scrollContainer.offsetHeight - window.innerHeight;
    window.scrollTo({
      top: jumpProgress * maxScroll,
      behavior: 'smooth'
    });
  });
});

// Prompt CTA Explore jump
const scrollPromptBtn = document.getElementById('scroll-prompt-btn');
if (scrollPromptBtn) {
  scrollPromptBtn.addEventListener('click', (e) => {
    e.preventDefault();
    const maxScroll = scrollContainer.offsetHeight - window.innerHeight;
    window.scrollTo({
      top: 0.25 * maxScroll,
      behavior: 'smooth'
    });
  });
}

const ctaExplore = document.getElementById('cta-explore');
if (ctaExplore) {
  ctaExplore.addEventListener('click', () => {
    document.getElementById('movement').scrollIntoView({ behavior: 'smooth' });
  });
}

// VIP Concierge Modal
function openVIPModal() {
  if (!vipModal) return;
  vipModal.classList.remove('opacity-0', 'pointer-events-none');
  vipModal.classList.add('opacity-100', 'pointer-events-auto');
}

function closeVIPModal() {
  if (!vipModal) return;
  vipModal.classList.remove('opacity-100', 'pointer-events-auto');
  vipModal.classList.add('opacity-0', 'pointer-events-none');
}

if (inquireBtn) inquireBtn.addEventListener('click', openVIPModal);
if (vipInquireBtn) vipInquireBtn.addEventListener('click', openVIPModal);
if (closeModalBtn) closeModalBtn.addEventListener('click', closeVIPModal);

if (vipModal) {
  vipModal.addEventListener('click', (e) => {
    if (e.target === vipModal) closeVIPModal();
  });
}

if (vipForm) {
  vipForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const btn = vipForm.querySelector('button[type="submit"]');
    const originalText = btn.textContent;
    btn.textContent = 'DOSSIER TRANSMITTED • SALON DIRECTOR NOTIFIED';
    btn.classList.add('bg-white', 'text-black');
    setTimeout(() => {
      closeVIPModal();
      btn.textContent = originalText;
      btn.classList.remove('bg-white', 'text-black');
      vipForm.reset();
    }, 2000);
  });
}

// Download Specification Dossier Feedback
const specDownloadBtn = document.getElementById('spec-download-btn');
if (specDownloadBtn) {
  specDownloadBtn.addEventListener('click', () => {
    specDownloadBtn.textContent = 'GENERATING DOSSIER...';
    setTimeout(() => {
      specDownloadBtn.textContent = 'DOSSIER GENERATED (PDF)';
      setTimeout(() => {
        specDownloadBtn.textContent = 'DOWNLOAD SPECIFICATION DOSSIER';
      }, 3000);
    }, 1200);
  });
}

// Start application
initImagePreloader();
updateScrollProgress();
requestAnimationFrame(animationLoop);
