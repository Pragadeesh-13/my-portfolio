
(function () {
  'use strict';
  // ─── Configuration ───
  const CONFIG = {
    particleCount: window.innerWidth < 768 ? 200 : 450,
    maxDistance: 1.8, // Maximum distance for drawing connecting lines
    mouseRepelRadius: 3.0,
    mouseRepelForce: 0.05,
    cameraZ: 10,
    dprCap: 2,
    baseSpeed: 0.002,
    colors: {
      bg: new THREE.Color(0xffffff),
      particle: new THREE.Color(0x000000),
      line: new THREE.Color(0x000000),
    },
  };

  // ─── State ───
  const state = {
    mouse: { x: 0, y: 0, smoothX: 0, smoothY: 0, rawX: -9999, rawY: -9999 },
    scroll: 0,
    smoothScroll: 0,
    viewportHeight: window.innerHeight,
    docHeight: 0,
    frameId: null,
  };

  // ─── Scene Setup ───
  const canvas = document.getElementById('webgl-canvas');
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, CONFIG.dprCap));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000000, 0); // Transparent to show CSS bg

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(CONFIG.colors.bg, 0.04);

  const camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );
  camera.position.z = CONFIG.cameraZ;

  // ─── Particle Network Setup ───

  // Data arrays
  const positions = new Float32Array(CONFIG.particleCount * 3);
  const velocities = [];
  const basePositions = []; // To anchor them slightly so they don't fly away completely

  // Spread them in a large volume
  const volumeSize = { x: 20, y: 30, z: 10 };

  for (let i = 0; i < CONFIG.particleCount; i++) {
    // Distribute heavily around Y=0 to Y=-20 (covering the scroll area)
    const px = (Math.random() - 0.5) * volumeSize.x;
    const py = (Math.random() - 0.5) * volumeSize.y - 5;
    const pz = (Math.random() - 0.5) * volumeSize.z;

    positions[i * 3] = px;
    positions[i * 3 + 1] = py;
    positions[i * 3 + 2] = pz;

    basePositions.push({ x: px, y: py, z: pz });

    // Random velocities
    velocities.push({
      x: (Math.random() - 0.5) * 2,
      y: (Math.random() - 0.5) * 2,
      z: (Math.random() - 0.5) * 2,
    });
  }

  // 1. Points Geometry & Material
  const pGeometry = new THREE.BufferGeometry();
  pGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  // Custom circular glowing point material
  const pMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: CONFIG.colors.particle },
      uPixelRatio: { value: renderer.getPixelRatio() }
    },
    vertexShader: `
      uniform float uPixelRatio;
      void main() {
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        // Size attenuates with distance
        gl_PointSize = 10.0 * uPixelRatio * (10.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      void main() {
        vec2 xy = gl_PointCoord.xy - vec2(0.5);
        float ll = length(xy);
        if(ll > 0.5) discard;
        
        // Soft glowing edge
        float alpha = (0.5 - ll) * 2.0;
        alpha = pow(alpha, 1.5);
        
        gl_FragColor = vec4(uColor, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });

  const particles = new THREE.Points(pGeometry, pMaterial);
  scene.add(particles);

  // 2. Lines Geometry & Material
  // Allocate buffer for maximum possible lines (n*(n-1)/2), but that's too much.
  // We'll limit it to a reasonable number.
  const maxLines = CONFIG.particleCount * 4;
  const linePositions = new Float32Array(maxLines * 6); // 2 vertices per line, 3 coords per vertex
  const lineAlphas = new Float32Array(maxLines * 2); // 1 alpha per vertex

  const lGeometry = new THREE.BufferGeometry();
  lGeometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3).setUsage(THREE.DynamicDrawUsage));
  lGeometry.setAttribute('aAlpha', new THREE.BufferAttribute(lineAlphas, 1).setUsage(THREE.DynamicDrawUsage));

  const lMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: CONFIG.colors.line }
    },
    vertexShader: `
      attribute float aAlpha;
      varying float vAlpha;
      void main() {
        vAlpha = aAlpha;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      varying float vAlpha;
      void main() {
        gl_FragColor = vec4(uColor, vAlpha * 0.45); // Increased line thickness/opacity
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });

  const linesMesh = new THREE.LineSegments(lGeometry, lMaterial);
  scene.add(linesMesh);


  // ─── Render Loop ───

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  // Vector helpers
  const vecA = new THREE.Vector3();
  const vecB = new THREE.Vector3();
  const mouseWorld = new THREE.Vector3();

  function animate() {
    state.frameId = requestAnimationFrame(animate);

    if (document.hidden) return;

    // Smooth scroll
    state.smoothScroll = lerp(state.smoothScroll, state.scroll, 0.05);

    // ─── 3D Camera Parallax ───
    const scrollFactor = 0.005; // Slowed down from 0.015
    camera.position.y = -(state.smoothScroll * scrollFactor);

    // Project mouse to world space at z=0 plane to repel particles
    mouseWorld.set(state.mouse.x, state.mouse.y, 0.5);
    mouseWorld.unproject(camera);
    mouseWorld.sub(camera.position).normalize();
    const distance = -camera.position.z / mouseWorld.z;
    mouseWorld.copy(camera.position).add(mouseWorld.multiplyScalar(distance));

    // Update Particles
    let lineIdx = 0;
    const posAttr = pGeometry.attributes.position.array;

    for (let i = 0; i < CONFIG.particleCount; i++) {
      const idx = i * 3;

      // Current pos
      let px = posAttr[idx];
      let py = posAttr[idx + 1];
      let pz = posAttr[idx + 2];

      // Base drift
      px += velocities[i].x * CONFIG.baseSpeed;
      py += velocities[i].y * CONFIG.baseSpeed;
      pz += velocities[i].z * CONFIG.baseSpeed;

      // Mouse Attraction (Symbiote Tendrils)
      if (state.mouse.rawX !== -9999) {
        const dxMouse = mouseWorld.x - px;
        const dyMouse = mouseWorld.y - py;
        const dzMouse = mouseWorld.z - pz;

        const distToMouseSq = dxMouse * dxMouse + dyMouse * dyMouse + dzMouse * dzMouse;
        const attractRadSq = 12.0; // Large reach radius

        if (distToMouseSq < attractRadSq && distToMouseSq > 0.01) {
          const force = (attractRadSq - distToMouseSq) / attractRadSq;
          // Aggressive attraction towards mouse
          px += (dxMouse / Math.sqrt(distToMouseSq)) * force * 0.25;
          py += (dyMouse / Math.sqrt(distToMouseSq)) * force * 0.25;
        }
      }

      // Elastic spring back to base position (snap back like organic matter)
      px += (basePositions[i].x - px) * 0.04;
      py += (basePositions[i].y - py) * 0.04;
      pz += (basePositions[i].z - pz) * 0.04;

      // Wrap around Y axis continuously centered on camera
      const camY = camera.position.y;
      const wrapHeight = 40; // Total height of the particle volume
      if (py > camY + wrapHeight / 2) {
        py -= wrapHeight;
        basePositions[i].y -= wrapHeight;
      } else if (py < camY - wrapHeight / 2) {
        py += wrapHeight;
        basePositions[i].y += wrapHeight;
      }

      posAttr[idx] = px;
      posAttr[idx + 1] = py;
      posAttr[idx + 2] = pz;

      vecA.set(px, py, pz);

      // Check distances for lines (optimized: only check remaining particles)
      for (let j = i + 1; j < CONFIG.particleCount; j++) {
        if (lineIdx >= maxLines) break;

        const jdx = j * 3;
        vecB.set(posAttr[jdx], posAttr[jdx + 1], posAttr[jdx + 2]);

        const distSq = vecA.distanceToSquared(vecB);
        const maxDistSq = CONFIG.maxDistance * CONFIG.maxDistance;

        if (distSq < maxDistSq) {
          // Calculate alpha based on distance (closer = more opaque)
          const alpha = 1.0 - Math.sqrt(distSq) / CONFIG.maxDistance;

          // Add to line buffers
          const lIdx = lineIdx * 6;
          const aIdx = lineIdx * 2;

          linePositions[lIdx] = px;
          linePositions[lIdx + 1] = py;
          linePositions[lIdx + 2] = pz;
          linePositions[lIdx + 3] = vecB.x;
          linePositions[lIdx + 4] = vecB.y;
          linePositions[lIdx + 5] = vecB.z;

          lineAlphas[aIdx] = alpha;
          lineAlphas[aIdx + 1] = alpha;

          lineIdx++;
        }
      }
    }

    pGeometry.attributes.position.needsUpdate = true;

    lGeometry.attributes.position.needsUpdate = true;
    lGeometry.attributes.aAlpha.needsUpdate = true;
    // Tell renderer exactly how many lines to draw to save performance
    lGeometry.setDrawRange(0, lineIdx * 2);

    // ─── DOM Parallax ───
    updateDOMParallax();

    renderer.render(scene, camera);
  }

  // ─── Event Listeners ───

  // Mouse move
  document.addEventListener('mousemove', (e) => {
    // Raw normalized device coordinates
    state.mouse.rawX = (e.clientX / window.innerWidth) * 2 - 1;
    state.mouse.rawY = -(e.clientY / window.innerHeight) * 2 + 1;

    // Lerped for smooth camera pan if we wanted it, but using raw for accurate repulsion mapping
    state.mouse.x = state.mouse.rawX;
    state.mouse.y = state.mouse.rawY;
  });

  // Scroll
  function onScroll() {
    state.scroll = window.pageYOffset || document.documentElement.scrollTop;

    // Update nav background
    const nav = document.getElementById('nav');
    if (state.scroll > 60) {
      nav.classList.add('scrolled');
    } else {
      nav.classList.remove('scrolled');
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Resize
  function onResize() {
    state.viewportHeight = window.innerHeight;
    state.docHeight = document.documentElement.scrollHeight;

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    pMaterial.uniforms.uPixelRatio.value = renderer.getPixelRatio();
  }

  window.addEventListener('resize', onResize);
  setTimeout(onResize, 100);

  // ─── DOM Parallax Logic ───
  const parallaxElements = document.querySelectorAll('[data-speed]');

  function updateDOMParallax() {
    parallaxElements.forEach(el => {
      const speed = parseFloat(el.getAttribute('data-speed'));
      const rect = el.getBoundingClientRect();
      const elCenter = rect.top + rect.height / 2;
      const viewCenter = state.viewportHeight / 2;
      const dist = elCenter - viewCenter;

      const yOffset = dist * (1 - speed) * 0.1;
      el.style.transform = `translate3d(0, ${yOffset}px, 0)`;
    });
  }

  // ─── Scroll Reveal Animation ───
  const revealElements = document.querySelectorAll('.reveal, .reveal-children');

  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1, rootMargin: '0px 0px 0px 0px' }
  );

  revealElements.forEach((el) => revealObserver.observe(el));



  // ─── Achievement Counter ───
  const counterEl = document.querySelector('[data-count]');

  if (counterEl) {
    const target = parseInt(counterEl.getAttribute('data-count'), 10);
    let counted = false;

    const counterObserver = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !counted) {
          counted = true;
          animateCounter(counterEl, target);
          counterObserver.unobserve(counterEl);
        }
      },
      { threshold: 0.5 }
    );

    counterObserver.observe(counterEl);
  }

  function animateCounter(el, target) {
    const duration = 1500;
    const start = performance.now();

    function step(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(eased * target);
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  // ─── Mobile Nav ───
  const navToggle = document.getElementById('nav-toggle');
  const navLinks = document.getElementById('nav-links');

  navToggle.addEventListener('click', () => {
    navToggle.classList.toggle('active');
    navLinks.classList.toggle('open');
  });

  navLinks.querySelectorAll('a[data-nav]').forEach((link) => {
    link.addEventListener('click', () => {
      navToggle.classList.remove('active');
      navLinks.classList.remove('open');
    });
  });

  // Smooth scroll
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', (e) => {
      const targetId = anchor.getAttribute('href');
      if (targetId === '#') return;
      e.preventDefault();
      const targetEl = document.querySelector(targetId);
      if (targetEl) targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  // Start loop
  animate();

})();
