/* ==========================================================================
   VIP ARISTROCRATE - High-Performance MindAR Image Tracking Engine
   Anchors Pristine High-Res 3D Blue Suitcase (55.87 MB) onto 1.jpg
   Standing Upright, Front-Facing, Continuous Tracking & Turntable Controls
   ========================================================================== */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MindARThree } from './vendor/mindar-image-three.prod.js';
import { Compiler } from './vendor/mindar-image.prod.js';

export class ARMindEngine {
  constructor(options) {
    this.container = options.container;
    this.statusBadge = options.statusBadge;
    this.statusText = options.statusText;
    this.loaderOverlay = options.loaderOverlay;
    this.progressBar = options.progressBar;
    this.progressPercent = options.progressPercent;
    this.progressMB = options.progressMB;
    this.controlBar = options.controlBar;
    
    this.mindThree = null;
    this.anchor = null;
    this.modelGroup = null;
    this.suitcaseMesh = null;
    this.isTargetFound = false;
    this.hasBeenDetected = false;
    this.autoRotate = false;
    this.modelScale = 0.65;

    // Touch and interaction state
    this.isDragging = false;
    this.isPanning = false;
    this.previousTouchDistance = null;
    this.previousTouchCenter = null;
    this.lastPointerX = 0;
    this.lastPointerY = 0;
  }

  async init() {
    try {
      this.updateStatus('Requesting Camera Access...', 'warning');

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera API unavailable. Open page over HTTPS (https://192.168.0.103:5173).");
      }

      try {
        const testStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        testStream.getTracks().forEach(track => track.stop());
      } catch (camErr) {
        if (camErr.name === 'NotAllowedError' || camErr.name === 'PermissionDeniedError') {
          throw new Error("Camera permission denied. Tap tune/lock icon in URL bar -> Permissions -> Allow Camera, then refresh.");
        } else {
          throw new Error("Camera error: " + camErr.message);
        }
      }

      this.updateStatus('Checking 1.jpg target dataset...', 'warning');

      let mindTargetSrc = './targets.mind';
      const hasValidTargetFile = await this.checkFileExists(mindTargetSrc);

      if (!hasValidTargetFile) {
        this.updateStatus('Compiling target 1.jpg features...', 'warning');
        mindTargetSrc = await this.compileImageTarget('./1.jpg');
      }

      this.updateStatus('Starting AR Camera Stream...', 'warning');

      // Initialize MindARThree instance with clean, instant detection configuration
      this.mindThree = new MindARThree({
        container: this.container,
        imageTargetSrc: mindTargetSrc,
        maxTrack: 1,
        uiScanning: '#arFramingGuide',
        uiLoading: 'no',
        filterMinCF: 0.0001,
        filterBeta: 0.001
      });

      const { renderer, scene, camera } = this.mindThree;

      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25));

      // Studio Lighting for High-Res Luggage
      const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
      scene.add(ambientLight);

      const dirLight1 = new THREE.DirectionalLight(0xffffff, 2.0);
      dirLight1.position.set(5, 10, 7);
      scene.add(dirLight1);

      const dirLight2 = new THREE.DirectionalLight(0xd4af37, 1.2);
      dirLight2.position.set(-5, -5, -5);
      scene.add(dirLight2);

      // Anchor Group for Target 1.jpg
      this.anchor = this.mindThree.addAnchor(0);
      this.modelGroup = new THREE.Group();
      this.anchor.group.add(this.modelGroup);

      this.anchor.onTargetFound = () => {
        this.isTargetFound = true;
        this.hasBeenDetected = true; // Lock visibility so model remains active once unlocked!
        this.updateStatus('Target 1.jpg Locked! 🎯 Swipe to Rotate • Pinch to Zoom', 'success');
        if (this.controlBar) this.controlBar.classList.remove('hidden');
      };

      this.anchor.onTargetLost = () => {
        this.isTargetFound = false;
        if (this.hasBeenDetected) {
          // Keep active interactive mode even if camera temporarily leaves the physical target card
          this.updateStatus('Target Locked! 🎯 Swipe to Rotate • 2-Finger Drag to Move', 'success');
        } else {
          this.updateStatus('Point camera at 1.jpg to scan...', 'warning');
        }
      };

      // Load Pristine High-Resolution 55.87 MB Original GLB Model
      await this.load3DModel('./blue_suitcase.glb');

      // Attach Touch & Mouse Control Handlers for Turntable Manipulation
      this.setupTouchAndMouseControls();

      // Start AR Camera
      await this.mindThree.start();

      renderer.setAnimationLoop(() => {
        // PERMANENT VISIBILITY LOCK ONCE DETECTED (Never disappears even if image leaves screen)
        if (this.hasBeenDetected && this.anchor && !this.anchor.group.visible) {
          this.anchor.group.visible = true;
        }

        // Auto-Rotate smoothly around vertical standing axis
        if (this.autoRotate && !this.isDragging) {
          this.modelGroup.rotation.y += 0.015;
        }

        renderer.render(scene, camera);
      });

      this.updateStatus('Point camera at 1.jpg to detect', 'warning');
      return true;

    } catch (err) {
      console.error('AR Engine Error:', err);
      this.updateStatus('Error: ' + err.message, 'warning');
      throw err;
    }
  }

  async checkFileExists(url) {
    try {
      const res = await fetch(url, { method: 'GET' });
      if (!res.ok) return false;
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('text/html')) return false;
      
      const buffer = await res.clone().arrayBuffer();
      if (buffer.byteLength < 100) return false;
      
      return true;
    } catch (e) {
      return false;
    }
  }

  async compileImageTarget(imageUrl) {
    const compiler = new Compiler();
    
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = async () => {
        try {
          const dataList = await compiler.compileImageTargets([img], (progress) => {
            const p = Math.round(progress * 100);
            this.updateStatus(`Compiling 1.jpg features (${p}%)`, 'warning');
          });

          const exportedBuffer = await compiler.exportData();
          const blob = new Blob([exportedBuffer], { type: 'application/octet-stream' });
          const objectUrl = URL.createObjectURL(blob);
          resolve(objectUrl);
        } catch (e) {
          reject(e);
        }
      };
      img.onerror = reject;
      img.src = imageUrl;
    });
  }

  load3DModel(modelUrl) {
    return new Promise((resolve, reject) => {
      this.loaderOverlay.classList.remove('hidden');

      const loader = new GLTFLoader();
      const TOTAL_SIZE_ESTIMATE = 55.87 * 1024 * 1024;

      loader.load(
        modelUrl,
        (gltf) => {
          this.suitcaseMesh = gltf.scene;

          // 1. STANDING UPRIGHT & FRONT-FACING ORIENTATION (Matches Mode 2 Studio Angle)
          // The raw 3D GLB model is inherently constructed with +Y pointing up (Aluminum Handle),
          // -Y pointing down (Spinner Wheels), and +Z facing forward (TSA Lock & Front Face).
          this.suitcaseMesh.rotation.set(0, 0, 0);
          this.suitcaseMesh.scale.set(1, 1, 1);

          // 2. AUTO-CENTERING BOUNDING BOX
          // Calculate true geometric center so model sits perfectly over the 1.jpg card without floating
          const box = new THREE.Box3().setFromObject(this.suitcaseMesh);
          const center = box.getCenter(new THREE.Vector3());
          this.suitcaseMesh.position.set(-center.x, -center.y, -center.z);

          this.suitcaseMesh.traverse((child) => {
            if (child.isMesh) {
              child.castShadow = false;
              child.receiveShadow = false;
            }
          });

          // Add mesh to interactive modelGroup
          this.modelGroup.add(this.suitcaseMesh);
          this.modelGroup.scale.set(this.modelScale, this.modelScale, this.modelScale);

          this.loaderOverlay.classList.add('hidden');
          resolve();
        },
        (xhr) => {
          if (xhr.lengthComputable || xhr.loaded) {
            const loadedBytes = xhr.loaded;
            const totalBytes = xhr.total || TOTAL_SIZE_ESTIMATE;
            const percent = Math.min(100, Math.round((loadedBytes / totalBytes) * 100));
            const loadedMB = (loadedBytes / (1024 * 1024)).toFixed(1);
            const totalMB = (totalBytes / (1024 * 1024)).toFixed(1);

            this.progressBar.style.width = `${percent}%`;
            this.progressPercent.textContent = `${percent}%`;
            this.progressMB.textContent = `${loadedMB} MB / ${totalMB} MB`;
          }
        },
        (error) => {
          console.error('Error loading 3D Model GLB:', error);
          this.updateStatus('Failed to load 3D GLB model', 'warning');
          this.loaderOverlay.classList.add('hidden');
          reject(error);
        }
      );
    });
  }

  /* ================= TURNTABLE TOUCH & MOUSE CONTROLS ================= */
  setupTouchAndMouseControls() {
    const el = this.container;
    if (!el) return;

    // ----- TOUCH EVENTS (Mobile Phone) -----
    el.addEventListener('touchstart', (e) => {
      if (!this.modelGroup || !this.hasBeenDetected) return;
      
      if (e.touches.length === 1) {
        this.isDragging = true;
        this.isPanning = false;
        this.lastPointerX = e.touches[0].clientX;
        this.lastPointerY = e.touches[0].clientY;
      } else if (e.touches.length === 2) {
        this.isDragging = false;
        this.isPanning = true;
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        this.previousTouchDistance = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        this.previousTouchCenter = {
          x: (t1.clientX + t2.clientX) / 2,
          y: (t1.clientY + t2.clientY) / 2
        };
      }
    }, { passive: false });

    el.addEventListener('touchmove', (e) => {
      if (!this.modelGroup || !this.hasBeenDetected) return;
      e.preventDefault();

      if (e.touches.length === 1 && this.isDragging) {
        const deltaX = e.touches[0].clientX - this.lastPointerX;

        // TURNTABLE ROTATION ONLY: Swiping spins horizontally around vertical Y-axis
        // Keeps the standing suitcase perfectly vertical without ever tilting or lying down!
        this.modelGroup.rotation.y += deltaX * 0.015;

        this.lastPointerX = e.touches[0].clientX;
        this.lastPointerY = e.touches[0].clientY;

      } else if (e.touches.length === 2 && this.isPanning) {
        const t1 = e.touches[0];
        const t2 = e.touches[1];

        // 1. Pinch to zoom (scale between 0.15x and 3.5x)
        const currentDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        if (this.previousTouchDistance !== null) {
          const zoomFactor = currentDist / this.previousTouchDistance;
          this.modelScale = Math.max(0.15, Math.min(3.5, this.modelScale * zoomFactor));
          this.modelGroup.scale.set(this.modelScale, this.modelScale, this.modelScale);
        }
        this.previousTouchDistance = currentDist;

        // 2. Pan across X and Y axes (reposition model on screen)
        const currentCenter = {
          x: (t1.clientX + t2.clientX) / 2,
          y: (t1.clientY + t2.clientY) / 2
        };
        if (this.previousTouchCenter !== null) {
          const panX = (currentCenter.x - this.previousTouchCenter.x) * 0.0035;
          const panY = -(currentCenter.y - this.previousTouchCenter.y) * 0.0035;
          this.modelGroup.position.x += panX;
          this.modelGroup.position.y += panY;
        }
        this.previousTouchCenter = currentCenter;
      }
    }, { passive: false });

    const endTouch = () => {
      this.isDragging = false;
      this.isPanning = false;
      this.previousTouchDistance = null;
      this.previousTouchCenter = null;
    };
    el.addEventListener('touchend', endTouch);
    el.addEventListener('touchcancel', endTouch);

    // ----- MOUSE EVENTS (Desktop / Laptop testing) -----
    el.addEventListener('mousedown', (e) => {
      if (!this.modelGroup || !this.hasBeenDetected) return;
      if (e.button === 0) {
        this.isDragging = true;
        this.lastPointerX = e.clientX;
        this.lastPointerY = e.clientY;
      } else if (e.button === 2) {
        this.isPanning = true;
        this.lastPointerX = e.clientX;
        this.lastPointerY = e.clientY;
      }
    });

    el.addEventListener('mousemove', (e) => {
      if (!this.modelGroup || !this.hasBeenDetected) return;

      if (this.isDragging) {
        const deltaX = e.clientX - this.lastPointerX;
        this.modelGroup.rotation.y += deltaX * 0.015;
        this.lastPointerX = e.clientX;
        this.lastPointerY = e.clientY;
      } else if (this.isPanning) {
        const deltaX = (e.clientX - this.lastPointerX) * 0.004;
        const deltaY = -(e.clientY - this.lastPointerY) * 0.004;
        this.modelGroup.position.x += deltaX;
        this.modelGroup.position.y += deltaY;
        this.lastPointerX = e.clientX;
        this.lastPointerY = e.clientY;
      }
    });

    const endMouse = () => {
      this.isDragging = false;
      this.isPanning = false;
    };
    el.addEventListener('mouseup', endMouse);
    el.addEventListener('mouseleave', endMouse);
    el.addEventListener('contextmenu', (e) => e.preventDefault());

    el.addEventListener('wheel', (e) => {
      if (!this.modelGroup || !this.hasBeenDetected) return;
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.05 : 0.05;
      this.adjustScale(delta);
    }, { passive: false });
  }

  toggleAutoRotate() {
    this.autoRotate = !this.autoRotate;
    return this.autoRotate;
  }

  resetPosition() {
    if (this.modelGroup && this.suitcaseMesh) {
      this.modelScale = 0.65;
      this.modelGroup.scale.set(this.modelScale, this.modelScale, this.modelScale);
      this.modelGroup.position.set(0, 0, 0);
      this.modelGroup.rotation.set(0, 0, 0);
      
      this.suitcaseMesh.rotation.set(0, 0, 0);
      const box = new THREE.Box3().setFromObject(this.suitcaseMesh);
      const center = box.getCenter(new THREE.Vector3());
      this.suitcaseMesh.position.set(-center.x, -center.y, -center.z);
    }
  }

  adjustScale(delta) {
    if (this.modelGroup) {
      this.modelScale = Math.max(0.15, Math.min(3.5, this.modelScale + delta));
      this.modelGroup.scale.set(this.modelScale, this.modelScale, this.modelScale);
    }
  }

  captureSnapshot() {
    if (!this.mindThree) return;
    const renderer = this.mindThree.renderer;
    const dataUrl = renderer.domElement.toDataURL('image/png');
    
    const link = document.createElement('a');
    link.download = 'VIP_Aristrocrate_AR_Snapshot.png';
    link.href = dataUrl;
    link.click();
  }

  updateStatus(text, type = 'warning') {
    if (this.statusText) this.statusText.textContent = text;
    if (this.statusBadge) {
      this.statusBadge.className = `status-badge status-${type}`;
    }
  }

  stop() {
    if (this.mindThree) {
      this.mindThree.stop();
      if (this.controlBar) this.controlBar.classList.add('hidden');
    }
  }
}
