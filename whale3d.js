(() => {
  'use strict';

  const THREE = window.THREE;
  const GLTFLoader = THREE && THREE.GLTFLoader;
  if (!THREE || !GLTFLoader) {
    console.error('Three.js or GLTFLoader bundle not loaded.');
    return;
  }

  /* =========================================================
     PAINTERLY ILLUSTRATION 3D HUMPBACK WHALE ENGINE (`humpback_whale.glb`)
     - Portable Zero-CORS Classic Script Edition: runs directly via file:// (double-click!)
       OR http:// on any school computer without Python/Node/server!
     ========================================================= */

  const canvas = document.getElementById('whale3dCanvas');
  const heroEl = document.getElementById('hero');

if (canvas && heroEl) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.06;

  // Pause WebGL render automatically when hero section is scrolled completely off-screen
  let heroVisible = true;
  if ('IntersectionObserver' in window) {
    const heroObs = new IntersectionObserver(
      (entries) => {
        heroVisible = entries[0] ? entries[0].isIntersecting : true;
      },
      { threshold: 0.01 }
    );
    heroObs.observe(heroEl);
  }

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(40, 16 / 9, 0.1, 100);
  camera.position.set(0, 0.2, 14.5);

  let visibleHalfH = 5.2;
  let visibleHalfW = 8.4;

  function resize() {
    const rect = heroEl.getBoundingClientRect();
    const w = Math.max(1, rect.width);
    const h = Math.max(1, rect.height);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);

    const vFovRad = THREE.MathUtils.degToRad(camera.fov);
    visibleHalfH = Math.tan(vFovRad * 0.5) * camera.position.z;
    visibleHalfW = visibleHalfH * camera.aspect;
  }
  resize();
  window.addEventListener('resize', resize);

  // --- Deeper Underwater Skylight Rig (Matches Original Poster's Rich Indigo-Blue Back & Pale Belly) ---
  const hemiLight = new THREE.HemisphereLight(0x88dcf0, 0x163258, 1.25);
  scene.add(hemiLight);

  const sunLight = new THREE.DirectionalLight(0xbcf2fc, 1.12);
  sunLight.position.set(1.5, 11.5, 4.8);
  scene.add(sunLight);

  const rimLight = new THREE.DirectionalLight(0x46b8d8, 0.92);
  rimLight.position.set(-7.5, 4.5, -6.5);
  scene.add(rimLight);

  const bookLight = new THREE.PointLight(0xd8eef4, 0.95, 26);
  bookLight.position.set(2.5, -3.5, 5.5); // Soft under-glow gently lifts pale whitish belly pleats!
  scene.add(bookLight);

  // --- Shared Bridge with 2D Canvas (Girl Tracking, Expansive Tail Waves & Wake Ribbons) ---
  const bridge = {
    ready: false,
    screenX: window.innerWidth * 0.55,
    screenY: window.innerHeight * 0.36,
    bodyX: window.innerWidth * 0.5,
    bodyY: window.innerHeight * 0.38,
    tailX: window.innerWidth * 0.38,
    tailY: window.innerHeight * 0.42,
    tailLeftX: window.innerWidth * 0.36,
    tailLeftY: window.innerHeight * 0.41,
    tailRightX: window.innerWidth * 0.36,
    tailRightY: window.innerHeight * 0.44,
    finLeftX: window.innerWidth * 0.52,
    finLeftY: window.innerHeight * 0.43,
    finRightX: window.innerWidth * 0.52,
    finRightY: window.innerHeight * 0.35,
    vx: 0,
    vy: 0,
    speed: 0.68,
    tailPhase: 0,
    depthScale: 1,
    inView: true,
    setTargetScreen: null,
    onArrival: null,
    triggerResonance: null,
  };
  window.__whaleBridge = bridge;

  // --- Painterly Cheonghae Poster PBR Maps (glTF flipY MUST be false!) ---
  // Uses pre-packed Base64 Data URLs from whale-data.js when present so file:// double-click never hits WebGL CORS!
  const packedAssets = window.__WHALE_ASSETS__ || null;
  const texLoader = new THREE.TextureLoader();
  const albedoTex = texLoader.load(
    packedAssets && packedAssets.albedoDataUrl
      ? packedAssets.albedoDataUrl
      : 'assets/layers/humpback-albedo.png?v=27'
  );
  albedoTex.flipY = false;
  albedoTex.colorSpace = THREE.SRGBColorSpace;

  const emissiveTex = texLoader.load(
    packedAssets && packedAssets.emissiveDataUrl
      ? packedAssets.emissiveDataUrl
      : 'assets/layers/humpback-emissive.png?v=27'
  );
  emissiveTex.flipY = false;
  emissiveTex.colorSpace = THREE.SRGBColorSpace;

  const fxUniforms = {
    uTime: { value: 0 },
    uResonance: { value: 2.0 },
  };

  // --- Whale Root, Skeleton Mixer & Full Bone Rig References ---
  const whaleRoot = new THREE.Group();
  whaleRoot.position.set(1.2, 0.95, -0.5);
  scene.add(whaleRoot);

  let mixer = null;
  let swimAction = null;
  let clipDuration = 4.9583;

  // Key bones for projection & real-time living spine/fin secondary flexibility
  const bones = {
    head1: null,
    head2: null,
    spine: [],      // [w_rug1_01, w_rug2_02, w_rug3_03, joint2_04, joint1_05, w_rug4_06]
    tailL: [],      // [w_L_staart1..4]
    tailR: [],      // [w_R_staart1..4]
    finL: [],       // [w_L_vin1..4]
    finR: [],       // [w_R_vin1..4]
  };

  const loader = new GLTFLoader();
  const onGltfLoaded = (gltf) => {
      const model = gltf.scene;

      // Node 1 has a 0.01 cm->m matrix, so gltf.scene spans length 0.08427, center y ~ 0.01432.
      const MODEL_SCALE = 64.0;
      model.scale.setScalar(MODEL_SCALE);
      model.position.set(0, -0.01432 * MODEL_SCALE, 0);

      const boneMap = {};
      model.traverse((child) => {
        if (child.isBone) {
          boneMap[child.name] = child;
        }

        if (child.isMesh && child.material) {
          const orig = child.material;

          // PAINTERLY SATIN-WET ILLUSTRATION MATERIAL:
          // Retains soft gouache harmony while adding just a whisper of damp sunlit satin sheen on the back!
          const mat = new THREE.MeshPhysicalMaterial({
            map: albedoTex,
            normalMap: orig.normalMap || null,
            normalScale: new THREE.Vector2(0.62, 0.62),
            aoMap: orig.aoMap || null,
            aoMapIntensity: 0.38,
            emissiveMap: emissiveTex,
            emissive: new THREE.Color(0x9cf0ea),
            emissiveIntensity: 0.74,
            roughness: 0.62,          // Soft damp satin (no longer dry chalky matte, no harsh plastic!)
            metalness: 0.0,
            clearcoat: 0.24,          // Whisper-subtle underwater wet sheen only where sunlight grazes
            clearcoatRoughness: 0.42, // Broad, silky painterly highlight instead of sharp CG glare
            side: THREE.DoubleSide,
          });

          // Inject Painterly Underwater Illustration Shader:
          // - Lifted sea-indigo shadow floor (no pitch-black CG shadows)
          // - Soft watercolor seafoam sunlight dapples (matches cheonghae-poster.jpg!)
          // - Underwater aerial perspective mist + backlit rim veil melting 3D edges into painting!
          mat.onBeforeCompile = (shader) => {
            shader.uniforms.uTime = fxUniforms.uTime;
            shader.uniforms.uResonance = fxUniforms.uResonance;

            shader.vertexShader = shader.vertexShader
              .replace(
                '#include <common>',
                `
                #include <common>
                varying vec3 vWhaleWorldPos;
                varying vec3 vWhaleWorldNormal;
                varying vec3 vWhaleLocalPos;
                `
              )
              .replace(
                '#include <defaultnormal_vertex>',
                `
                #include <defaultnormal_vertex>
                vWhaleWorldNormal = normalize(mat3(modelMatrix) * objectNormal);
                `
              )
              .replace(
                '#include <project_vertex>',
                `
                vWhaleLocalPos = transformed;
                vec4 wpWhale = modelMatrix * vec4(transformed, 1.0);
                vWhaleWorldPos = wpWhale.xyz;
                #include <project_vertex>
                `
              );

            shader.fragmentShader = shader.fragmentShader
              .replace(
                '#include <common>',
                `
                #include <common>
                uniform float uTime;
                uniform float uResonance;
                varying vec3 vWhaleWorldPos;
                varying vec3 vWhaleWorldNormal;
                varying vec3 vWhaleLocalPos;

                vec2 wHash22(vec2 p) {
                  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
                  return fract(sin(p) * 43758.5453);
                }

                // Soft painterly dappled sunlight pools (replaces harsh CG Voronoi lines!)
                float wSoftDapple(vec2 uv, float t) {
                  vec2 n = floor(uv);
                  vec2 f = fract(uv);
                  float md1 = 8.0;
                  float md2 = 8.0;
                  for (int j = -1; j <= 1; j++) {
                    for (int i = -1; i <= 1; i++) {
                      vec2 g = vec2(float(i), float(j));
                      vec2 o = wHash22(n + g);
                      o = 0.5 + 0.42 * sin(t * 0.48 + 6.2831 * o);
                      vec2 r = g + o - f;
                      float d = dot(r, r);
                      if (d < md1) { md2 = md1; md1 = d; }
                      else if (d < md2) { md2 = d; }
                    }
                  }
                  float edge = sqrt(md2) - sqrt(md1);
                  return smoothstep(0.28, 0.03, edge);
                }
                `
              )
              .replace(
                '#include <dithering_fragment>',
                `
                vec3 wNormal = normalize(vWhaleWorldNormal);
                vec3 wView = normalize(cameraPosition - vWhaleWorldPos);
                vec3 domeSunDir = normalize(vec3(0.14, 0.96, 0.24));

                float topSun = smoothstep(-0.08, 0.84, dot(wNormal, domeSunDir));
                float ndotv = clamp(abs(dot(wNormal, wView)), 0.0, 1.0);
                float rim = pow(1.0 - ndotv, 2.35);

                // 1. Lift crushed dark shadows toward original poster's deep painterly indigo-blue
                vec3 paintedShadowFloor = vec3(0.030, 0.088, 0.205);
                gl_FragColor.rgb = mix(gl_FragColor.rgb, max(gl_FragColor.rgb, paintedShadowFloor), 0.65);

                // 2. Sunlit Dorsal Sheen & Shimmering Underwater Sunbeam Caustics (ONLY on sunlit upper surfaces!)
                vec3 sunHalf = normalize(domeSunDir + wView);
                float sunSpec = pow(max(dot(wNormal, sunHalf), 0.0), 18.0) * smoothstep(0.10, 0.72, dot(wNormal, domeSunDir));
                // Subtle spatial boost when gliding right beneath the central glass-dome sunbeams
                float domeBeam = 0.72 + 0.45 * exp(-pow((vWhaleWorldPos.x - 0.6) * 0.22, 2.0));

                vec2 c1 = vWhaleWorldPos.xz * 1.02 + vec2(uTime * 0.10, -uTime * 0.12);
                vec2 c2 = vWhaleWorldPos.xz * 1.56 + vec2(-uTime * 0.08, uTime * 0.09);
                float dapple = clamp(wSoftDapple(c1, uTime) * 0.65 + wSoftDapple(c2, uTime * 0.8 + 1.7) * 0.35, 0.0, 1.0);
                float dappleCrest = pow(dapple, 2.1);

                // Soft silky sunlit water-sheen glazing the curved back & forehead
                gl_FragColor.rgb += vec3(0.54, 0.88, 0.94) * sunSpec * domeBeam * 0.30;
                // Shimmering underwater sunlight web pools dancing along the sunlit dorsal ridge
                gl_FragColor.rgb += vec3(0.36, 0.78, 0.88) * dapple * topSun * domeBeam * 0.28;
                gl_FragColor.rgb += vec3(0.70, 0.95, 0.98) * dappleCrest * topSun * domeBeam * 0.22;

                // 3. Poster-Matched Underwater Atmospheric Perspective (bridges cobalt blue & emerald teal!)
                vec3 domeMistColor = vec3(0.062, 0.265, 0.425);
                vec3 domeBacklight = vec3(0.20, 0.62, 0.78);
                float depthMist = clamp((-vWhaleWorldPos.z + 0.4) * 0.052, 0.04, 0.22);
                float tailFade = clamp((1.5 - vWhaleLocalPos.z) / 5.7, 0.0, 1.0) * 0.08;
                gl_FragColor.rgb = mix(gl_FragColor.rgb, domeMistColor, depthMist + tailFade);

                // 4. Soft painterly backlit silhouette veil
                gl_FragColor.rgb = mix(gl_FragColor.rgb, domeBacklight, rim * (0.20 + 0.16 * topSun));

                // 5. Gentle click/book resonance wave traveling snout (+4.2) -> tail (-4.2)
                float normZ = clamp((4.2 - vWhaleLocalPos.z) / 8.4, 0.0, 1.0);
                float resWave = smoothstep(0.24, 0.0, abs(normZ - uResonance)) * smoothstep(1.3, 0.92, uResonance);
                gl_FragColor.rgb += mix(vec3(0.32, 0.78, 0.92), vec3(0.95, 0.92, 0.74), 0.42) * resWave * 0.34;

                #include <dithering_fragment>
                `
              );
          };

          child.material = mat;
          child.frustumCulled = false;
        }
      });

      // Populate ordered skeleton chains for living secondary flex
      bones.head1 = boneMap['w_hoofd1_015'] || null;
      bones.head2 = boneMap['w_hoofd2_016'] || null;
      bones.spine = [
        boneMap['w_rug1_01'],
        boneMap['w_rug2_02'],
        boneMap['w_rug3_03'],
        boneMap['joint2_04'],
        boneMap['joint1_05'],
        boneMap['w_rug4_06'],
      ].filter(Boolean);
      bones.tailL = [
        boneMap['w_L_staart1_07'],
        boneMap['w_L_staart2_08'],
        boneMap['w_L_staart3_09'],
        boneMap['w_L_staart4_010'],
      ].filter(Boolean);
      bones.tailR = [
        boneMap['w_R_staart1_011'],
        boneMap['w_R_staart2_012'],
        boneMap['w_R_staart3_013'],
        boneMap['w_R_staart4_014'],
      ].filter(Boolean);
      bones.finL = [
        boneMap['w_L_vin1_017'],
        boneMap['w_L_vin2_018'],
        boneMap['w_L_vin3_019'],
        boneMap['w_L_vin4_020'],
      ].filter(Boolean);
      bones.finR = [
        boneMap['w_R_vin1_021'],
        boneMap['w_R_vin2_022'],
        boneMap['w_R_vin3_023'],
        boneMap['w_R_vin4_024'],
      ].filter(Boolean);

      whaleRoot.add(model);

      // Normalize Take 001 start time (0.2083s -> 0.0000s) for 100% seamless zero-stutter looping!
      if (gltf.animations && gltf.animations.length > 0) {
        const clip = gltf.animations[0].clone();
        let minT = Infinity;
        let maxT = -Infinity;
        for (const track of clip.tracks) {
          if (track.times && track.times.length > 0) {
            if (track.times[0] < minT) minT = track.times[0];
            const last = track.times[track.times.length - 1];
            if (last > maxT) maxT = last;
          }
        }
        if (minT > 0.001 && Number.isFinite(minT) && maxT > minT) {
          for (const track of clip.tracks) {
            const shifted = new Float32Array(track.times.length);
            for (let i = 0; i < track.times.length; i++) {
              shifted[i] = Math.max(0, track.times[i] - minT);
            }
            track.times = shifted;
          }
          clip.duration = maxT - minT;
        }
        clipDuration = Math.max(0.5, clip.duration);

        mixer = new THREE.AnimationMixer(model);
        swimAction = mixer.clipAction(clip);
        swimAction.setLoop(THREE.LoopRepeat, Infinity);
        swimAction.timeScale = 0.72; // Steady, natural, unhurried deep-sea tail cadence (no slow-mo!)
        swimAction.play();
      }

      bridge.ready = true;
  };
  const onGltfError = (err) => {
    console.error('Failed to load humpback_whale.glb:', err);
  };

  if (packedAssets && packedAssets.glbBase64) {
    try {
      const binStr = atob(packedAssets.glbBase64);
      const len = binStr.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binStr.charCodeAt(i);
      }
      loader.parse(bytes.buffer, '', onGltfLoaded, onGltfError);
    } catch (e) {
      loader.load('assets/layers/humpback_whale.glb?v=23', onGltfLoaded, undefined, onGltfError);
    }
  } else {
    loader.load('assets/layers/humpback_whale.glb?v=23', onGltfLoaded, undefined, onGltfError);
  }

  // =========================================================
  // DELICATE PAINTERLY 3D BIOLUMINESCENT PLANKTON AURA & WAKE
  // Harmonized seafoam-mint, pale glacier-aqua & whisper-gold motes
  // =========================================================
  const HALO_COUNT = 80;
  const WAKE_COUNT = 140;
  const TOTAL_PLANKTON = HALO_COUNT + WAKE_COUNT;

  const pPositions = new Float32Array(TOTAL_PLANKTON * 3);
  const pColors = new Float32Array(TOTAL_PLANKTON * 3);
  const pSizes = new Float32Array(TOTAL_PLANKTON);
  const pAlphas = new Float32Array(TOTAL_PLANKTON);
  const pPhases = new Float32Array(TOTAL_PLANKTON);

  const haloMeta = [];
  const palette = [
    new THREE.Color(0x8beee8), // painterly seafoam-aqua
    new THREE.Color(0xb8f6f2), // misty glacier-mint
    new THREE.Color(0xf6ebc2), // whisper pale star-gold
    new THREE.Color(0xe4faf8), // soft watercolor white
  ];

  for (let i = 0; i < HALO_COUNT; i++) {
    const zAlong = THREE.MathUtils.lerp(-2.9, 2.3, Math.random());
    const theta = Math.random() * Math.PI * 2;
    const rad = 1.0 + Math.random() * 1.55;
    haloMeta.push({
      baseX: Math.cos(theta) * rad,
      baseY: Math.sin(theta) * rad * 0.72,
      baseZ: zAlong,
      driftFreq: 0.36 + Math.random() * 0.58,
      driftAmp: 0.18 + Math.random() * 0.26,
      phase: Math.random() * Math.PI * 2,
    });
    const col = palette[i % 5 === 0 ? 2 : i % 3 === 0 ? 3 : i % 2];
    pColors[i * 3] = col.r;
    pColors[i * 3 + 1] = col.g;
    pColors[i * 3 + 2] = col.b;
    pSizes[i] = 4.0 + Math.random() * 6.8;
    pAlphas[i] = 0.42 + Math.random() * 0.28;
    pPhases[i] = Math.random() * Math.PI * 2;
  }

  const wakeState = [];
  for (let i = 0; i < WAKE_COUNT; i++) {
    const idx = HALO_COUNT + i;
    wakeState.push({
      vx: 0,
      vy: 0,
      vz: 0,
      life: 0,
      maxLife: 5.5,
      swirlPhase: Math.random() * Math.PI * 2,
      baseSize: 3.6 + Math.random() * 7.6,
    });
    const col = palette[i % 4 === 0 ? 2 : i % 3 === 0 ? 3 : i % 2];
    pColors[idx * 3] = col.r;
    pColors[idx * 3 + 1] = col.g;
    pColors[idx * 3 + 2] = col.b;
    pSizes[idx] = 0;
    pAlphas[idx] = 0;
    pPhases[idx] = Math.random() * Math.PI * 2;
    pPositions[idx * 3 + 2] = -999;
  }

  const planktonGeo = new THREE.BufferGeometry();
  planktonGeo.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
  planktonGeo.setAttribute('aColor', new THREE.BufferAttribute(pColors, 3));
  planktonGeo.setAttribute('aSize', new THREE.BufferAttribute(pSizes, 1));
  planktonGeo.setAttribute('aAlpha', new THREE.BufferAttribute(pAlphas, 1));
  planktonGeo.setAttribute('aPhase', new THREE.BufferAttribute(pPhases, 1));

  const planktonMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: fxUniforms.uTime,
      uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
    },
    vertexShader: `
      attribute vec3 aColor;
      attribute float aSize;
      attribute float aAlpha;
      attribute float aPhase;
      uniform float uTime;
      uniform float uPixelRatio;
      varying vec3 vColor;
      varying float vAlpha;
      varying float vTwinkle;

      void main() {
        vColor = aColor;
        vTwinkle = 0.55 + 0.45 * sin(uTime * 2.0 + aPhase);
        vAlpha = aAlpha * vTwinkle;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        float distScale = 14.5 / max(2.5, -mvPosition.z);
        gl_PointSize = aSize * uPixelRatio * distScale * (0.82 + 0.24 * vTwinkle);
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      varying float vAlpha;
      varying float vTwinkle;

      void main() {
        vec2 uv = gl_PointCoord - vec2(0.5);
        float d = length(uv);
        if (d > 0.5) discard;

        float core = exp(-d * d * 26.0);
        float halo = smoothstep(0.5, 0.05, d) * 0.36;
        float crossX = exp(-abs(uv.y) * 26.0) * smoothstep(0.46, 0.0, abs(uv.x));
        float crossY = exp(-abs(uv.x) * 26.0) * smoothstep(0.46, 0.0, abs(uv.y));
        float star = (crossX + crossY) * 0.28 * vTwinkle;

        float intensity = core + halo + star;
        vec3 col = mix(vColor, vec3(0.96, 1.0, 0.99), core * 0.58);
        gl_FragColor = vec4(col, clamp(intensity * vAlpha, 0.0, 1.0));
      }
    `,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending,
  });

  const planktonPoints = new THREE.Points(planktonGeo, planktonMat);
  planktonPoints.frustumCulled = false;
  scene.add(planktonPoints);

  let nextWakeIdx = 0;
  let wakeEmitAcc = 0;

  // =========================================================
  // NATURAL, STEADY, FREE-ROAMING 3D OCEANIC SWIMMING
  // - Constant, unbroken natural deep-sea cadence (zero slow-mo or sudden speedups!)
  // - Freely glides past screen edges and sweeps gracefully back in
  // - Turns smoothly toward a clicked location ONLY when the user's ripple wave reaches it!
  // =========================================================
  const phys = {
    pos: new THREE.Vector3(1.2, 0.95, -0.5),
    vel: new THREE.Vector3(0.62, 0.03, 0.25),
    forward: new THREE.Vector3(0.92, 0.04, 0.38).normalize(),
    angVelYaw: 0,
    angVelPitch: 0,
    bendYaw: 0,
    roll: 0,
    rollVel: 0,
    target: null,
    targetScreenX: 0,
    targetScreenY: 0,
    autoTime: 0.35,
  };

  function screenToWorld(clientX, clientY, zPlane = -0.65) {
    const rect = heroEl.getBoundingClientRect();
    const ndcX = ((clientX - rect.left) / rect.width) * 2 - 1;
    const ndcY = -((clientY - rect.top) / rect.height) * 2 + 1;

    const rayVec = new THREE.Vector3(ndcX, ndcY, 0.5).unproject(camera);
    const dir = rayVec.sub(camera.position).normalize();
    const dist = (zPlane - camera.position.z) / dir.z;
    return camera.position.clone().add(dir.multiplyScalar(dist));
  }

  bridge.setTargetScreen = (clientX, clientY) => {
    const rect = heroEl.getBoundingClientRect();
    const targetZ = THREE.MathUtils.lerp(-1.25, 0.15, Math.random());
    const worldPt = screenToWorld(clientX, clientY, targetZ);

    worldPt.x = THREE.MathUtils.clamp(worldPt.x, -visibleHalfW * 0.94, visibleHalfW * 0.94);
    worldPt.y = THREE.MathUtils.clamp(worldPt.y, -visibleHalfH * 0.72, visibleHalfH * 0.78);
    worldPt.z = THREE.MathUtils.clamp(worldPt.z, -2.2, 0.5);

    phys.target = worldPt;
    phys.targetScreenX = clientX - rect.left;
    phys.targetScreenY = clientY - rect.top;
    fxUniforms.uResonance.value = 0.0;
  };

  bridge.triggerResonance = () => {
    fxUniforms.uResonance.value = 0.0;
  };

  // Reusable math helpers (zero per-frame heap allocations!)
  const tmpGoal = new THREE.Vector3();
  const tmpToGoal = new THREE.Vector3();
  const tmpTargetVel = new THREE.Vector3();
  const tmpLookTarget = new THREE.Vector3();
  const tmpUp = new THREE.Vector3(0, 1, 0);
  const tmpRight = new THREE.Vector3();
  const tmpLocalUp = new THREE.Vector3();
  const tmpLookMat = new THREE.Matrix4();
  const tmpTargetQuat = new THREE.Quaternion();
  const tmpRollQuat = new THREE.Quaternion();
  const tmpFlexQ = new THREE.Quaternion();
  const tmpBoneWorldQ = new THREE.Quaternion();
  const tmpLocalYawAxis = new THREE.Vector3();
  const tmpRootUpWorld = new THREE.Vector3();
  const tmpZAxis = new THREE.Vector3(0, 0, 1);
  const projVec = new THREE.Vector3();
  const boneWorld = new THREE.Vector3();
  const tmpLocalPt = new THREE.Vector3();
  const tmpProjOut = [
    { x: 0, y: 0 },
    { x: 0, y: 0 },
    { x: 0, y: 0 },
    { x: 0, y: 0 },
    { x: 0, y: 0 },
    { x: 0, y: 0 },
    { x: 0, y: 0 },
  ];
  const spawnPts = [
    new THREE.Vector3(),
    new THREE.Vector3(),
    new THREE.Vector3(),
    new THREE.Vector3(),
    new THREE.Vector3(),
  ];

  // Pure, pop-free WAIST-ONLY horizontal turn curve (behind solid skull, before symmetrical flukes!)
  const waistYawW = [0.10, 0.13, 0.14, 0.13, 0.10];

  let prevHeadX = bridge.screenX;
  let prevHeadY = bridge.screenY;
  let lastTime = performance.now();

  function projectBoneInto(bone, fallbackVec, rect, out) {
    if (bone) {
      bone.getWorldPosition(boneWorld);
      projVec.copy(boneWorld).project(camera);
    } else {
      projVec.copy(fallbackVec).project(camera);
    }
    out.x = (projVec.x * 0.5 + 0.5) * rect.width;
    out.y = (-projVec.y * 0.5 + 0.5) * rect.height;
    return out;
  }

  function applyWaistTurnCurve() {
    if (Math.abs(phys.bendYaw) < 0.001 || bones.spine.length < 5) return;

    whaleRoot.updateMatrixWorld(true);
    tmpRootUpWorld.set(0, 1, 0).applyQuaternion(whaleRoot.quaternion).normalize();

    const count = Math.min(waistYawW.length, bones.spine.length);
    for (let i = 0; i < count; i++) {
      const b = bones.spine[i];
      b.getWorldQuaternion(tmpBoneWorldQ);
      tmpLocalYawAxis.copy(tmpRootUpWorld).applyQuaternion(tmpBoneWorldQ.invert()).normalize();
      const yawAngle = THREE.MathUtils.clamp(-phys.bendYaw * waistYawW[i], -0.13, 0.13);
      tmpFlexQ.setFromAxisAngle(tmpLocalYawAxis, yawAngle);
      b.quaternion.multiply(tmpFlexQ);
      b.updateMatrixWorld(true);
    }
  }

  function animate(now) {
    requestAnimationFrame(animate);
    const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
    lastTime = now;
    if (!heroVisible || document.hidden) return;

    const tSec = now * 0.001;
    fxUniforms.uTime.value = tSec;
    if (fxUniforms.uResonance.value < 1.5) {
      fxUniforms.uResonance.value += dt * 0.42;
    }

    // Soft ambient dome light shimmer
    sunLight.intensity = 1.08 + Math.sin(now * 0.0010) * 0.12;
    sunLight.position.x = 1.5 + Math.sin(now * 0.00045) * 1.8;

    // --- 1. Determine Swimming Goal (Steady Natural Pace — Zero Sudden Speedups or Slow-Mo!) ---
    let goalPos;
    let desiredSpeed = 0.68; // Constant, natural, graceful deep-sea cruising speed
    let steerGain = 1.15;

    if (phys.target) {
      goalPos = phys.target;
      const dist = phys.pos.distanceTo(goalPos);
      if (dist < 1.15) {
        fxUniforms.uResonance.value = 0.0;
        if (typeof bridge.onArrival === 'function') {
          bridge.onArrival(phys.targetScreenX, phys.targetScreenY);
        }
        const sinEst = THREE.MathUtils.clamp(phys.pos.x / Math.max(4, visibleHalfW * 1.22), -0.95, 0.95);
        const baseAngle = Math.asin(sinEst);
        phys.autoTime = phys.forward.x >= 0 ? baseAngle : Math.PI - baseAngle;
        phys.autoTime += 0.28;
        phys.target = null;
      } else {
        // Gentle, natural turn toward the wave source at the SAME steady organic speed!
        desiredSpeed = 0.74;
        steerGain = 1.45;
      }
    } else {
      phys.autoTime += dt * 0.088;
      const rx = visibleHalfW * 1.22;
      const ry = visibleHalfH * 0.40;
      const cy = 0.55;
      goalPos = tmpGoal.set(
        Math.sin(phys.autoTime) * rx,
        cy + Math.sin(phys.autoTime * 1.62 + 0.55) * ry,
        -1.05 + Math.cos(phys.autoTime * 0.82) * 1.85
      );
      desiredSpeed = 0.66;
      steerGain = 1.05;
    }

    // --- 2. Steady, Silky 3D Steering + Subtle Waist Turn Curve (Zero Heap Allocations!) ---
    const toGoal = tmpToGoal.copy(goalPos).sub(phys.pos);
    const distToGoal = toGoal.length();
    if (distToGoal > 0.001) toGoal.divideScalar(distToGoal);

    tmpRight.crossVectors(tmpUp, phys.forward).normalize();
    if (tmpRight.lengthSq() < 0.001) tmpRight.set(1, 0, 0);
    tmpLocalUp.crossVectors(phys.forward, tmpRight).normalize();

    const fwdDot = toGoal.dot(phys.forward);
    let yawError = toGoal.dot(tmpRight);
    // Eliminate the 180° dead-zone when the click wave came from behind the whale!
    if (fwdDot < 0) {
      const turnSign = yawError >= 0 ? 1 : -1;
      yawError = turnSign * Math.max(Math.abs(yawError), 1.0);
    }
    const pitchError = toGoal.dot(tmpLocalUp);

    const maxYaw = phys.target ? 0.92 : 0.56;
    phys.angVelYaw += yawError * (phys.target ? 2.15 : steerGain) * dt;
    phys.angVelPitch += pitchError * (steerGain * 0.72) * dt;
    phys.angVelYaw *= Math.exp(-2.8 * dt);
    phys.angVelPitch *= Math.exp(-3.1 * dt);
    phys.angVelYaw = THREE.MathUtils.clamp(phys.angVelYaw, -maxYaw, maxYaw);
    phys.angVelPitch = THREE.MathUtils.clamp(phys.angVelPitch, -0.32, 0.32);

    // Smoothly filter horizontal turn rate into gentle waist C-curve
    const targetBendYaw = THREE.MathUtils.clamp(phys.angVelYaw * 1.35, -0.9, 0.9);
    phys.bendYaw += (targetBendYaw - phys.bendYaw) * Math.min(1, dt * 2.8);

    phys.forward.addScaledVector(tmpRight, phys.angVelYaw * dt);
    phys.forward.addScaledVector(tmpLocalUp, phys.angVelPitch * dt);
    phys.forward.y = THREE.MathUtils.clamp(phys.forward.y, -0.34, 0.34);
    phys.forward.normalize();

    const targetRoll = THREE.MathUtils.clamp(-phys.angVelYaw * 0.48, -0.34, 0.34);
    const rollForce = (targetRoll - phys.roll) * 7.5 - phys.rollVel * 4.4;
    phys.rollVel += rollForce * dt;
    phys.roll += phys.rollVel * dt;

    const targetVel = tmpTargetVel.copy(phys.forward).multiplyScalar(desiredSpeed);
    phys.vel.lerp(targetVel, Math.min(1, dt * 1.6));
    phys.pos.addScaledVector(phys.vel, dt);

    const softMaxX = visibleHalfW * 1.65;
    const softMaxY = visibleHalfH * 1.05;
    if (Math.abs(phys.pos.x) > softMaxX) {
      phys.pos.x = THREE.MathUtils.lerp(phys.pos.x, Math.sign(phys.pos.x) * softMaxX, dt * 0.8);
    }
    if (Math.abs(phys.pos.y - 0.4) > softMaxY) {
      phys.pos.y = THREE.MathUtils.lerp(phys.pos.y, 0.4 + Math.sign(phys.pos.y - 0.4) * softMaxY, dt * 0.8);
    }
    phys.pos.z = THREE.MathUtils.clamp(phys.pos.z, -3.6, 1.35);

    const floatY = Math.sin(now * 0.00075) * 0.07;
    whaleRoot.position.set(phys.pos.x, phys.pos.y + floatY, phys.pos.z);

    const lookTarget = tmpLookTarget.copy(whaleRoot.position).add(phys.forward);
    tmpLookMat.lookAt(lookTarget, whaleRoot.position, tmpUp);
    tmpTargetQuat.setFromRotationMatrix(tmpLookMat);
    tmpRollQuat.setFromAxisAngle(tmpZAxis, phys.roll);
    tmpTargetQuat.multiply(tmpRollQuat);
    whaleRoot.quaternion.slerp(tmpTargetQuat, Math.min(1, dt * 4.2));

    // --- 3. Constant Natural Artist 25-Bone Swimming Rhythm + Pure Waist Turn Curve ---
    // Zero dynamic timeScale wobble & zero artificial tail-pitch overlay -> 100% pop-free!
    let swimPhase = tSec * 0.9;
    if (mixer && swimAction) {
      swimAction.timeScale = 0.72;
      mixer.update(dt);
      swimPhase = ((swimAction.time % clipDuration) / clipDuration) * Math.PI * 2;
      applyWaistTurnCurve();
    }
    bridge.tailPhase = swimPhase;

    whaleRoot.updateMatrixWorld(true);

    // --- 4. Update Painterly 3D Plankton Aura & Lingering Wake Sparkles ---
    const posAttr = planktonGeo.attributes.position;
    const sizeAttr = planktonGeo.attributes.aSize;
    const alphaAttr = planktonGeo.attributes.aAlpha;

    for (let i = 0; i < HALO_COUNT; i++) {
      const m = haloMeta[i];
      tmpLocalPt.set(
        m.baseX + Math.sin(tSec * m.driftFreq + m.phase) * m.driftAmp,
        m.baseY + Math.cos(tSec * m.driftFreq * 0.85 + m.phase) * m.driftAmp,
        m.baseZ + Math.sin(tSec * m.driftFreq * 0.6 + m.phase * 1.3) * m.driftAmp
      );
      tmpLocalPt.applyQuaternion(whaleRoot.quaternion).add(whaleRoot.position);
      posAttr.setXYZ(i, tmpLocalPt.x, tmpLocalPt.y, tmpLocalPt.z);
    }

    const tailBone = bones.spine[bones.spine.length - 1] || null;
    const tailLeftBone = bones.tailL[bones.tailL.length - 1] || null;
    const tailRightBone = bones.tailR[bones.tailR.length - 1] || null;
    const finLeftBone = bones.finL[bones.finL.length - 1] || null;
    const finRightBone = bones.finR[bones.finR.length - 1] || null;

    if (bridge.ready) {
      if (tailLeftBone) tailLeftBone.getWorldPosition(spawnPts[0]);
      else spawnPts[0].copy(whaleRoot.position);
      if (tailRightBone) tailRightBone.getWorldPosition(spawnPts[1]);
      else spawnPts[1].copy(whaleRoot.position);
      if (tailBone) tailBone.getWorldPosition(spawnPts[2]);
      else spawnPts[2].copy(whaleRoot.position);
      if (finLeftBone) finLeftBone.getWorldPosition(spawnPts[3]);
      else spawnPts[3].copy(whaleRoot.position);
      if (finRightBone) finRightBone.getWorldPosition(spawnPts[4]);
      else spawnPts[4].copy(whaleRoot.position);

      wakeEmitAcc += dt * 15.0;
      while (wakeEmitAcc >= 1.0) {
        wakeEmitAcc -= 1.0;
        const wIdx = nextWakeIdx;
        nextWakeIdx = (nextWakeIdx + 1) % WAKE_COUNT;
        const pIdx = HALO_COUNT + wIdx;

        const r = Math.random();
        const origin =
          r < 0.28 ? spawnPts[0] :
          r < 0.56 ? spawnPts[1] :
          r < 0.72 ? spawnPts[2] :
          r < 0.86 ? spawnPts[3] : spawnPts[4];

        const spread = r < 0.72 ? 0.56 : 0.38;
        posAttr.setXYZ(
          pIdx,
          origin.x + (Math.random() - 0.5) * spread,
          origin.y + (Math.random() - 0.5) * spread,
          origin.z + (Math.random() - 0.5) * spread
        );

        const st = wakeState[wIdx];
        st.vx = -phys.vel.x * 0.16 + (Math.random() - 0.5) * 0.18;
        st.vy = 0.04 + Math.random() * 0.10;
        st.vz = -phys.vel.z * 0.16 + (Math.random() - 0.5) * 0.18;
        st.maxLife = 5.2 + Math.random() * 3.0;
        st.life = st.maxLife;
        sizeAttr.setX(pIdx, st.baseSize);
        alphaAttr.setX(pIdx, 0.58);
      }
    }

    for (let i = 0; i < WAKE_COUNT; i++) {
      const st = wakeState[i];
      const pIdx = HALO_COUNT + i;
      if (st.life <= 0) continue;

      st.life -= dt;
      if (st.life <= 0) {
        alphaAttr.setX(pIdx, 0);
        sizeAttr.setX(pIdx, 0);
        continue;
      }

      const frac = st.life / st.maxLife;
      const swirl = Math.sin(tSec * 1.0 + st.swirlPhase) * 0.06;
      const px = posAttr.getX(pIdx) + (st.vx + swirl) * dt;
      const py = posAttr.getY(pIdx) + st.vy * dt;
      const pz = posAttr.getZ(pIdx) + (st.vz + Math.cos(tSec * 0.85 + st.swirlPhase) * 0.05) * dt;
      posAttr.setXYZ(pIdx, px, py, pz);

      st.vx *= Math.exp(-0.5 * dt);
      st.vz *= Math.exp(-0.5 * dt);

      const fadeIn = Math.min(1, (1 - frac) * 8.0);
      const fadeOut = Math.pow(frac, 1.45);
      alphaAttr.setX(pIdx, 0.58 * fadeIn * fadeOut);
      sizeAttr.setX(pIdx, st.baseSize * (0.45 + 0.55 * frac));
    }

    posAttr.needsUpdate = true;
    sizeAttr.needsUpdate = true;
    alphaAttr.needsUpdate = true;

    // --- 5. Project Real Skeleton Bones to 2D Screen (Zero Per-Frame Object Allocations) ---
    const rect = heroEl.getBoundingClientRect();
    const headP = projectBoneInto(bones.head2 || bones.head1, whaleRoot.position, rect, tmpProjOut[0]);
    const bodyP = projectBoneInto(bones.spine[1] || bones.spine[0], whaleRoot.position, rect, tmpProjOut[1]);
    const tailP = projectBoneInto(tailBone, whaleRoot.position, rect, tmpProjOut[2]);
    const tailLP = projectBoneInto(tailLeftBone, whaleRoot.position, rect, tmpProjOut[3]);
    const tailRP = projectBoneInto(tailRightBone, whaleRoot.position, rect, tmpProjOut[4]);
    const finLP = projectBoneInto(finLeftBone, whaleRoot.position, rect, tmpProjOut[5]);
    const finRP = projectBoneInto(finRightBone, whaleRoot.position, rect, tmpProjOut[6]);

    bridge.vx = (headP.x - prevHeadX) / Math.max(0.008, dt);
    bridge.vy = (headP.y - prevHeadY) / Math.max(0.008, dt);
    prevHeadX = headP.x;
    prevHeadY = headP.y;

    bridge.screenX = headP.x;
    bridge.screenY = headP.y;
    bridge.bodyX = bodyP.x;
    bridge.bodyY = bodyP.y;
    bridge.tailX = tailP.x;
    bridge.tailY = tailP.y;
    bridge.tailLeftX = tailLP.x;
    bridge.tailLeftY = tailLP.y;
    bridge.tailRightX = tailRP.x;
    bridge.tailRightY = tailRP.y;
    bridge.finLeftX = finLP.x;
    bridge.finLeftY = finLP.y;
    bridge.finRightX = finRP.x;
    bridge.finRightY = finRP.y;
    bridge.speed = phys.vel.length();
    bridge.depthScale = THREE.MathUtils.clamp(14.5 / (14.5 - whaleRoot.position.z), 0.72, 1.32);
    bridge.inView =
      headP.x > -360 && headP.x < rect.width + 360 &&
      headP.y > -280 && headP.y < rect.height + 280;

    renderer.render(scene, camera);
  }

  requestAnimationFrame(animate);
}
})();
