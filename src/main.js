/* ==========================================================================
   VIP ARISTROCRATE - Main Application Orchestrator
   ========================================================================== */

import { ARMindEngine } from './ar-mind.js';
import QRCode from 'qrcode';

document.addEventListener('DOMContentLoaded', () => {
  // Navigation Tabs
  const tabARImage = document.getElementById('tabARImage');
  const tab3DStudio = document.getElementById('tab3DStudio');
  const arImageSection = document.getElementById('arImageSection');
  const studioSection = document.getElementById('studioSection');

  // AR Launch Elements
  const arStartPrompt = document.getElementById('arStartPrompt');
  const startARBtn = document.getElementById('startARBtn');
  const arContainer = document.getElementById('arContainer');

  // Model Viewer Studio Elements
  const bagModelViewer = document.getElementById('bagModelViewer');
  const toggleAutoRotate = document.getElementById('toggleAutoRotate');
  const resetStudioCam = document.getElementById('resetStudioCam');
  const mvProgressFill = document.getElementById('mvProgressFill');
  const mvProgressText = document.getElementById('mvProgressText');
  const mvProgressBar = document.getElementById('mvProgressBar');

  let arEngine = null;

  // ================= 1. TAB SWITCHING LOGIC =================
  if (tabARImage && tab3DStudio) {
    tabARImage.addEventListener('click', () => {
      tabARImage.classList.add('active');
      tab3DStudio.classList.remove('active');
      arImageSection.classList.add('active');
      studioSection.classList.remove('active');

      // Free up Studio WebGL VRAM when entering Image AR Mode
      if (bagModelViewer && bagModelViewer.getAttribute('src')) {
        bagModelViewer.removeAttribute('src');
      }
    });

    tab3DStudio.addEventListener('click', () => {
      tab3DStudio.classList.add('active');
      tabARImage.classList.remove('active');
      studioSection.classList.add('active');
      arImageSection.classList.remove('active');

      if (arEngine) {
        arEngine.stop();
        if (arStartPrompt) arStartPrompt.classList.remove('hidden');
      }

      // Automatically load 3D Studio model only when entering Studio Mode
      if (bagModelViewer && !bagModelViewer.getAttribute('src')) {
        bagModelViewer.setAttribute('src', './blue_suitcase.glb');
      }
    });
  }

  // ================= 2. LAUNCH AR CAMERA =================
  if (startARBtn && arStartPrompt) {
    startARBtn.addEventListener('click', async () => {
      arStartPrompt.classList.add('hidden');

      if (!arEngine) {
        arEngine = new ARMindEngine({
          container: arContainer,
          statusBadge: document.getElementById('arStatusBadge'),
          statusText: document.getElementById('arStatusText'),
          loaderOverlay: document.getElementById('arLoader'),
          progressBar: document.getElementById('arProgressBar'),
          progressPercent: document.getElementById('arProgressPercent'),
          progressMB: document.getElementById('arProgressMB')
        });
      }

      try {
        await arEngine.init();
      } catch (e) {
        alert(e.message);
        arStartPrompt.classList.remove('hidden');
      }
    });
  }

  // ================= 3. MODEL VIEWER STUDIO CONTROLS =================
  if (bagModelViewer) {
    bagModelViewer.addEventListener('progress', (e) => {
      const percent = Math.round(e.detail.totalProgress * 100);
      if (mvProgressFill) mvProgressFill.style.width = `${percent}%`;
      if (mvProgressText) mvProgressText.textContent = `${percent}%`;
      if (percent >= 100 && mvProgressBar) {
        setTimeout(() => mvProgressBar.style.display = 'none', 300);
      }
    });

    const presetBtns = document.querySelectorAll('.preset-btn');
    presetBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        presetBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const env = btn.getAttribute('data-env');
        bagModelViewer.setAttribute('environment-image', env);
      });
    });

    if (toggleAutoRotate) {
      toggleAutoRotate.addEventListener('click', () => {
        if (bagModelViewer.hasAttribute('auto-rotate')) {
          bagModelViewer.removeAttribute('auto-rotate');
          toggleAutoRotate.firstElementChild.textContent = 'Start Auto-Rotation';
        } else {
          bagModelViewer.setAttribute('auto-rotate', '');
          toggleAutoRotate.firstElementChild.textContent = 'Pause Auto-Rotation';
        }
      });
    }

    if (resetStudioCam) {
      resetStudioCam.addEventListener('click', () => {
        bagModelViewer.cameraOrbit = '0deg 75deg 105%';
      });
    }
  }
});
