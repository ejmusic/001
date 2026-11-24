/* =========================================================
   PARK HYEJIN PORTFOLIO — 2.5D/3D HYBRID ABYSS ENGINE & UI
   - Back Canvas: Dome Sunlight Bloom, Back Fan God Rays, Distant Books & Bubbles
   - Middle Layer (whale3d.js): True 3D Starry Whale (Blender GLB + Three.js Shader)
   - Front Canvas: Head-Tracking Girl Watching 3D Whale, Foreground Books,
     Book Resonance Ripples, Dialogue Light Streams, Front Fan Rays & Bubbles
   ========================================================= */

(() => {
  'use strict';

  /* -------------------------------------------------------
     1. CUSTOM CURSOR GLOW & BACKGROUND PARALLAX
     ------------------------------------------------------- */
  const cursorGlow = document.getElementById('cursorGlow');
  const heroBgWrap = document.getElementById('heroBgWrap');
  const heroEl = document.getElementById('hero');

  let targetParallaxX = 0;
  let targetParallaxY = 0;
  let currentParallaxX = 0;
  let currentParallaxY = 0;

  window.addEventListener('mousemove', (e) => {
    if (cursorGlow) {
      cursorGlow.style.left = `${e.clientX}px`;
      cursorGlow.style.top = `${e.clientY}px`;
    }
    const nx = (e.clientX / window.innerWidth - 0.5) * 2;
    const ny = (e.clientY / window.innerHeight - 0.5) * 2;
    targetParallaxX = -nx * 14;
    targetParallaxY = -ny * 9;
  });

  /* -------------------------------------------------------
     1.5. PROCEDURAL UNDERWATER ACOUSTIC ENGINE (Web Audio API)
     - Continuous deep-sea underwater library ambience (filtered ocean currents,
       warm abyssal sub-harmonics & distant hydrophone micro-bubbles)
     - Open-water click: Crystalline deep-sea SONAR PING + 3-tap stereo echo + wave swell
     - Floating book click: Tactile underwater "뽀욱 (Bbo-ook)" buoyant bubble-plop + trailing bubbles
     - Occasional Humpback Whale vocal call ("우~우웅~ / 끼우~웅~"): Expressive cetacean melodic glide + distant dome echo
     - Scroll down to main page: Smooth exponential volume + lowpass muffle fade-out (and fade-in on return)
     ------------------------------------------------------- */
  const soundBtn = document.getElementById('heroSoundBtn');
  const soundLabel = document.getElementById('heroSoundLabel');

  const abyssAudio = (() => {
    let ctx = null;
    let masterComp = null;
    let userMuteGain = null;
    let scrollLowpass = null;
    let scrollFadeGain = null;
    let reverbNode = null;
    let reverbSend = null;
    let isStarted = false;
    let isMuted = false;
    let lastScrollFade = 1.0;
    let bubbleTimer = null;
    let lastWhaleSongTime = 0;
    let whalePhraseIdx = 0;

    function createUnderwaterReverb(audioCtx) {
      const rate = audioCtx.sampleRate;
      const len = Math.floor(rate * 2.2);
      const buf = audioCtx.createBuffer(2, len, rate);
      for (let ch = 0; ch < 2; ch++) {
        const data = buf.getChannelData(ch);
        let lp1 = 0;
        let lp2 = 0;
        for (let i = 0; i < len; i++) {
          const t = i / rate;
          const env = Math.pow(1 - i / len, 2.35) * (0.85 + 0.15 * Math.sin(t * 14 + ch * 1.5));
          const white = Math.random() * 2 - 1;
          // Two-pole lowpass (~650Hz) so reverb tail sounds warm and submerged in deep water
          lp1 += 0.085 * (white - lp1);
          lp2 += 0.085 * (lp1 - lp2);
          data[i] = lp2 * env * 2.1;
        }
      }
      const conv = audioCtx.createConvolver();
      conv.buffer = buf;
      return conv;
    }

    function init() {
      if (ctx) return true;
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return false;

      try {
        ctx = new AudioCtx();
      } catch {
        return false;
      }

      masterComp = ctx.createDynamicsCompressor();
      masterComp.threshold.value = -16;
      masterComp.knee.value = 18;
      masterComp.ratio.value = 4;
      masterComp.attack.value = 0.01;
      masterComp.release.value = 0.25;

      userMuteGain = ctx.createGain();
      userMuteGain.gain.value = isMuted ? 0.0 : 1.0;

      // Scroll-linked lowpass filter (muffles high frequencies first as you dive down into main page)
      scrollLowpass = ctx.createBiquadFilter();
      scrollLowpass.type = 'lowpass';
      scrollLowpass.frequency.value = 2400;
      scrollLowpass.Q.value = 0.7;

      scrollFadeGain = ctx.createGain();
      scrollFadeGain.gain.value = 1.0;

      reverbNode = createUnderwaterReverb(ctx);
      reverbSend = ctx.createGain();
      reverbSend.gain.value = 0.48;

      reverbSend.connect(reverbNode);
      reverbNode.connect(masterComp);
      masterComp.connect(userMuteGain);
      userMuteGain.connect(scrollLowpass);
      scrollLowpass.connect(scrollFadeGain);
      scrollFadeGain.connect(ctx.destination);

      startAmbience();
      updateScrollFade();
      return true;
    }

    function startAmbience() {
      if (!ctx || isStarted) return;
      isStarted = true;

      // 1. Pre-baked 5-second Seamless Stereo Low-Pitched "보글보글 (Bogeul-Bogeul)" Bubble Bed
      //    (ZERO continuous "웅~" drone or bass hum — purely soft, low-toned bubbling water droplets!)
      const rate = ctx.sampleRate;
      const len = rate * 5;
      const bogeulBuf = ctx.createBuffer(2, len, rate);

      // Populate ~58 overlapping low-pitched underwater bubble droplets across the 5s loop
      const dropCount = 58;
      for (let d = 0; d < dropCount; d++) {
        const startSample = Math.floor(Math.random() * len);
        const durSec = 0.055 + Math.random() * 0.075;
        const durSamples = Math.floor(durSec * rate);
        // Deep, warm low-register bubble pitch (88Hz..215Hz -> 170Hz..370Hz)
        const f0 = 88 + Math.pow(Math.random(), 1.3) * 128;
        const f1 = f0 * (1.72 + Math.random() * 0.36);
        const pan = (Math.random() - 0.5) * 1.4; // -0.7 .. +0.7
        const gainL = (0.045 + Math.random() * 0.045) * Math.sqrt(0.5 * (1 - pan));
        const gainR = (0.045 + Math.random() * 0.045) * Math.sqrt(0.5 * (1 + pan));

        const chL = bogeulBuf.getChannelData(0);
        const chR = bogeulBuf.getChannelData(1);
        let phase = Math.random() * Math.PI * 2;

        for (let i = 0; i < durSamples; i++) {
          const u = i / durSamples;
          // Rounded water-bubble envelope (soft attack, resonant belly, smooth decay)
          const env = Math.sin(Math.min(1, u * 3.2) * Math.PI * 0.5) * Math.pow(1 - u, 1.55);
          // Exponential upward Minnaert bubble pitch curve ("보-글")
          const freq = f0 * Math.pow(f1 / f0, Math.pow(u, 1.35));
          phase += (2 * Math.PI * freq) / rate;
          // Warm fundamental + subtle 2nd cavity harmonic
          const sample = (Math.sin(phase) + 0.24 * Math.sin(phase * 1.98 + 0.4)) * env;
          const idx = (startSample + i) % len;
          chL[idx] += sample * gainL;
          chR[idx] += sample * gainR;
        }
      }

      // Softly lowpass the entire stereo bubble bed (~420Hz) so it stays deep, warm, and muffled underwater
      for (let ch = 0; ch < 2; ch++) {
        const data = bogeulBuf.getChannelData(ch);
        let lp1 = 0;
        let lp2 = 0;
        for (let i = 0; i < len; i++) {
          lp1 += 0.065 * (data[i] - lp1);
          lp2 += 0.065 * (lp1 - lp2);
          data[i] = lp2;
        }
      }

      const bedSrc = ctx.createBufferSource();
      bedSrc.buffer = bogeulBuf;
      bedSrc.loop = true;

      const bedGain = ctx.createGain();
      bedGain.gain.value = 0.78;
      bedSrc.connect(bedGain);
      bedGain.connect(masterComp);
      bedGain.connect(reverbSend);
      bedSrc.start();

      // 2. Live Procedural Low-Pitched "보글보글" Bubble Clusters (Continuous Organic Variation)
      const scheduleAmbientBubble = () => {
        bubbleTimer = setTimeout(() => {
          if (ctx && ctx.state === 'running' && !isMuted && lastScrollFade > 0.05 && !document.hidden) {
            playAmbientBubbleCluster();
          }
          scheduleAmbientBubble();
        }, 420 + Math.random() * 520);
      };
      scheduleAmbientBubble();
    }

    function playAmbientBubbleCluster() {
      if (!ctx || ctx.state !== 'running') return;
      const now = ctx.currentTime;
      // 3 to 6 staggered low-pitched bubbles per cluster ("보글보글~")
      const count = 3 + Math.floor(Math.random() * 4);
      const panVal = (Math.random() - 0.5) * 1.25;

      const clusterLp = ctx.createBiquadFilter();
      clusterLp.type = 'lowpass';
      clusterLp.frequency.setValueAtTime(440, now);
      clusterLp.Q.setValueAtTime(1.4, now);

      if (ctx.createStereoPanner) {
        const panner = ctx.createStereoPanner();
        panner.pan.setValueAtTime(Math.max(-0.85, Math.min(0.85, panVal)), now);
        clusterLp.connect(panner);
        panner.connect(masterComp);
        panner.connect(reverbSend);
      } else {
        clusterLp.connect(masterComp);
        clusterLp.connect(reverbSend);
      }

      let tCursor = now;
      for (let i = 0; i < count; i++) {
        tCursor += i === 0 ? 0 : 0.042 + Math.random() * 0.058;
        const dur = 0.065 + Math.random() * 0.055;
        // Deep low-register "부글 / 보글" frequencies (92Hz..220Hz -> 175Hz..380Hz)
        const fStart = 92 + Math.random() * 125;
        const fDip = fStart * 0.90;
        const fEnd = fStart * (1.70 + Math.random() * 0.35);

        const osc = ctx.createOscillator();
        const sub = ctx.createOscillator();
        const gain = ctx.createGain();
        const subGain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(fStart, tCursor);
        osc.frequency.exponentialRampToValueAtTime(fDip, tCursor + dur * 0.22);
        osc.frequency.exponentialRampToValueAtTime(fEnd, tCursor + dur);

        sub.type = 'triangle';
        sub.frequency.setValueAtTime(fStart * 1.96, tCursor);
        sub.frequency.exponentialRampToValueAtTime(fEnd * 1.85, tCursor + dur);
        subGain.gain.value = 0.18;

        const peakAmp = (0.036 + Math.random() * 0.026) * (1 - i * 0.08);
        gain.gain.setValueAtTime(0.0001, tCursor);
        gain.gain.linearRampToValueAtTime(peakAmp, tCursor + 0.014);
        gain.gain.exponentialRampToValueAtTime(0.0001, tCursor + dur);

        osc.connect(gain);
        sub.connect(subGain);
        subGain.connect(gain);
        gain.connect(clusterLp);

        osc.start(tCursor);
        sub.start(tCursor);
        osc.stop(tCursor + dur + 0.02);
        sub.stop(tCursor + dur + 0.02);
      }
    }

    function ensureRunning() {
      if (!ctx) init();
      if (ctx && ctx.state === 'suspended' && !isMuted) {
        ctx.resume().catch(() => {});
      }
    }

    // --- 2. OPEN-WATER CLICK: DEEP-SEA SONAR ACOUSTIC WAVE PING ---
    function playSonarPing(normX = 0, normY = 0.5, gainScale = 1.0) {
      ensureRunning();
      if (!ctx || isMuted || lastScrollFade < 0.02) return;

      const now = ctx.currentTime;
      const panBase = Math.max(-0.8, Math.min(0.8, normX * 0.8));
      // Subtle pitch variation based on vertical depth in the dome (higher = brighter, deeper = lower)
      const baseFreq = (1180 - normY * 220) * (0.97 + Math.random() * 0.06);

      // A. Primary Biosonar Ping + 3 Underwater Canyon Echo Taps
      const taps = [
        { delay: 0.0,   amp: 0.16 * gainScale, pan: panBase,         lp: 3200, dur: 0.95 },
        { delay: 0.27,  amp: 0.062 * gainScale, pan: -panBase * 0.65, lp: 1350, dur: 1.05 },
        { delay: 0.56,  amp: 0.028 * gainScale, pan: panBase * 0.45,  lp: 840,  dur: 1.15 },
        { delay: 0.88,  amp: 0.013 * gainScale, pan: 0,               lp: 540,  dur: 1.25 },
      ];

      for (let idx = 0; idx < taps.length; idx++) {
        const tap = taps[idx];
        const t0 = now + tap.delay;

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(tap.lp, t0);

        const env = ctx.createGain();
        env.gain.setValueAtTime(0.0001, t0);
        // Smooth water-cushioned attack (14ms -> zero harsh click!)
        env.gain.linearRampToValueAtTime(tap.amp, t0 + 0.015);
        env.gain.exponentialRampToValueAtTime(tap.amp * 0.28, t0 + 0.18);
        env.gain.exponentialRampToValueAtTime(0.0001, t0 + tap.dur);

        // Fundamental sonar carrier (gentle underwater Doppler downward glide)
        const osc1 = ctx.createOscillator();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(baseFreq * 1.03, t0);
        osc1.frequency.exponentialRampToValueAtTime(baseFreq * 0.86, t0 + 0.22);
        osc1.frequency.exponentialRampToValueAtTime(baseFreq * 0.82, t0 + tap.dur);

        // Warm sub-octave sonar body tone
        const oscSub = ctx.createOscillator();
        oscSub.type = 'sine';
        oscSub.frequency.setValueAtTime(baseFreq * 0.515, t0);
        oscSub.frequency.exponentialRampToValueAtTime(baseFreq * 0.43, t0 + 0.24);
        const subGain = ctx.createGain();
        subGain.gain.value = 0.42;

        // Delicate crystalline 2nd harmonic shimmer (only on primary & first echo)
        let oscHarm = null;
        if (idx <= 1) {
          oscHarm = ctx.createOscillator();
          oscHarm.type = 'sine';
          oscHarm.frequency.setValueAtTime(baseFreq * 2.06, t0);
          oscHarm.frequency.exponentialRampToValueAtTime(baseFreq * 1.72, t0 + 0.16);
          const harmGain = ctx.createGain();
          harmGain.gain.value = 0.15;
          oscHarm.connect(harmGain);
          harmGain.connect(filter);
        }

        osc1.connect(filter);
        oscSub.connect(subGain);
        subGain.connect(filter);
        filter.connect(env);

        if (ctx.createStereoPanner) {
          const panner = ctx.createStereoPanner();
          panner.pan.setValueAtTime(tap.pan, t0);
          env.connect(panner);
          panner.connect(masterComp);
          panner.connect(reverbSend);
        } else {
          env.connect(masterComp);
          env.connect(reverbSend);
        }

        osc1.start(t0);
        oscSub.start(t0);
        if (oscHarm) oscHarm.start(t0);
        osc1.stop(t0 + tap.dur + 0.03);
        oscSub.stop(t0 + tap.dur + 0.03);
        if (oscHarm) oscHarm.stop(t0 + tap.dur + 0.03);
      }

      // B. Low-Frequency Underwater Ripple Expansion Wave Swell ("우웅~" water pulse)
      const swellOsc = ctx.createOscillator();
      const swellGain = ctx.createGain();
      swellOsc.type = 'sine';
      swellOsc.frequency.setValueAtTime(84, now);
      swellOsc.frequency.exponentialRampToValueAtTime(38, now + 0.48);

      swellGain.gain.setValueAtTime(0.0001, now);
      swellGain.gain.linearRampToValueAtTime(0.14 * gainScale, now + 0.045);
      swellGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.52);

      swellOsc.connect(swellGain);
      swellGain.connect(masterComp);
      swellOsc.start(now);
      swellOsc.stop(now + 0.55);
    }

    // --- 3. FLOATING BOOK CLICK: UNDERWATER "뽀욱 (BBO-OOK)" BUOYANT BUBBLE-PUSH SOUND ---
    function playBookBboook(normX = 0) {
      ensureRunning();
      if (!ctx || isMuted || lastScrollFade < 0.02) return;

      const now = ctx.currentTime;
      const panVal = Math.max(-0.8, Math.min(0.8, normX * 0.8));
      const outBus = ctx.createStereoPanner ? ctx.createStereoPanner() : ctx.createGain();
      if (outBus.pan) outBus.pan.setValueAtTime(panVal, now);
      outBus.connect(masterComp);
      outBus.connect(reverbSend);

      // Stage 1 ("뽀-" / Heavy Submerged Water-Displacement Thump, 0..55ms)
      const thumpOsc = ctx.createOscillator();
      const thumpGain = ctx.createGain();
      thumpOsc.type = 'triangle';
      thumpOsc.frequency.setValueAtTime(142, now);
      thumpOsc.frequency.exponentialRampToValueAtTime(92, now + 0.065);

      const thumpLp = ctx.createBiquadFilter();
      thumpLp.type = 'lowpass';
      thumpLp.frequency.setValueAtTime(240, now);

      thumpGain.gain.setValueAtTime(0.0001, now);
      thumpGain.gain.linearRampToValueAtTime(0.24, now + 0.010);
      thumpGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.085);

      thumpOsc.connect(thumpLp);
      thumpLp.connect(thumpGain);
      thumpGain.connect(outBus);
      thumpOsc.start(now);
      thumpOsc.stop(now + 0.095);

      // Stage 2 ("-욱!" / Rising Buoyant Air-Pocket Formant Plop, 22ms..225ms)
      // Dual coupled oscillators + resonant vowel formant bandpass sweeping 115Hz -> 410Hz ("뽀-욱!")
      const tPlop = now + 0.020;
      const plopDur = 0.205;

      const plopSine = ctx.createOscillator();
      const plopTri = ctx.createOscillator();
      plopSine.type = 'sine';
      plopTri.type = 'triangle';

      // Characteristic "Bbo-ook" pitch curve: brief low dip then buoyant upward bubble gulp!
      plopSine.frequency.setValueAtTime(126, tPlop);
      plopSine.frequency.exponentialRampToValueAtTime(108, tPlop + 0.032);
      plopSine.frequency.exponentialRampToValueAtTime(395, tPlop + 0.165);
      plopSine.frequency.exponentialRampToValueAtTime(330, tPlop + plopDur);

      plopTri.frequency.setValueAtTime(252, tPlop);
      plopTri.frequency.exponentialRampToValueAtTime(216, tPlop + 0.032);
      plopTri.frequency.exponentialRampToValueAtTime(740, tPlop + 0.165);
      plopTri.frequency.exponentialRampToValueAtTime(580, tPlop + plopDur);

      const triMix = ctx.createGain();
      triMix.gain.value = 0.35;

      // High-Q resonant water-cavity filter sweeping with the bubble pitch
      const cavityFilter = ctx.createBiquadFilter();
      cavityFilter.type = 'bandpass';
      cavityFilter.Q.setValueAtTime(3.8, tPlop);
      cavityFilter.frequency.setValueAtTime(160, tPlop);
      cavityFilter.frequency.exponentialRampToValueAtTime(520, tPlop + 0.165);
      cavityFilter.frequency.exponentialRampToValueAtTime(420, tPlop + plopDur);

      const plopEnv = ctx.createGain();
      plopEnv.gain.setValueAtTime(0.0001, tPlop);
      plopEnv.gain.linearRampToValueAtTime(0.30, tPlop + 0.024);
      plopEnv.gain.setValueAtTime(0.28, tPlop + 0.115);
      plopEnv.gain.exponentialRampToValueAtTime(0.0001, tPlop + plopDur);

      // Direct warm sine body + resonant cavity formant
      const bodyGain = ctx.createGain();
      bodyGain.gain.value = 0.55;
      plopSine.connect(bodyGain);
      bodyGain.connect(plopEnv);

      plopSine.connect(cavityFilter);
      plopTri.connect(triMix);
      triMix.connect(cavityFilter);
      cavityFilter.connect(plopEnv);
      plopEnv.connect(outBus);

      plopSine.start(tPlop);
      plopTri.start(tPlop);
      plopSine.stop(tPlop + plopDur + 0.02);
      plopTri.stop(tPlop + plopDur + 0.02);

      // Stage 3 (3 Trailing Little Bubbles Shaken Loose from the Book's Pages!)
      const trailDelays = [0.155, 0.235, 0.325];
      const trailFreqs = [340, 430, 520];
      for (let k = 0; k < 3; k++) {
        const tb = now + trailDelays[k] + Math.random() * 0.02;
        const bDur = 0.065 + Math.random() * 0.025;
        const f0 = trailFreqs[k] * (0.95 + Math.random() * 0.1);
        const bOsc = ctx.createOscillator();
        const bEnv = ctx.createGain();
        bOsc.type = 'sine';
        bOsc.frequency.setValueAtTime(f0, tb);
        bOsc.frequency.exponentialRampToValueAtTime(f0 * 1.85, tb + bDur);

        bEnv.gain.setValueAtTime(0.0001, tb);
        bEnv.gain.linearRampToValueAtTime(0.065 * (1 - k * 0.22), tb + 0.010);
        bEnv.gain.exponentialRampToValueAtTime(0.0001, tb + bDur);

        bOsc.connect(bEnv);
        bEnv.connect(outBus);
        bOsc.start(tb);
        bOsc.stop(tb + bDur + 0.015);
      }
    }

    // --- 4. OCCASIONAL HUMPBACK WHALE VOCAL CALL / SONG ("우~우웅~ / 끼우~웅~") ---
    function playWhaleSong(normX = 0, gainScale = 1.0, minCooldownSec = 6.2) {
      ensureRunning();
      if (!ctx || isMuted || lastScrollFade < 0.05) return false;
      const now = ctx.currentTime;
      if (now - lastWhaleSongTime < minCooldownSec) return false;
      lastWhaleSongTime = now;

      // Cycle through 3 authentic Humpback Whale melodic vocal contours
      const phrase = whalePhraseIdx % 3;
      whalePhraseIdx++;

      let dur = 2.45;
      // Points: [timeFraction, fundamentalHz, formantHz]
      let contour;
      if (phrase === 0) {
        // Phrase 0: Classic rising-then-falling mournful Humpback song sweep ("우~우웅~")
        dur = 2.45;
        contour = [
          [0.00, 168, 250],
          [0.34, 372, 620],
          [0.52, 348, 560],
          [0.82, 186, 310],
          [1.00, 142, 220],
        ];
      } else if (phrase === 1) {
        // Phrase 1: Higher crystalline harmonic cetacean call ("끼우~우웅~")
        dur = 2.25;
        contour = [
          [0.00, 248, 390],
          [0.26, 485, 790],
          [0.55, 310, 520],
          [0.85, 205, 340],
          [1.00, 172, 260],
        ];
      } else {
        // Phrase 2: Gentle two-syllable deep greeting call ("우우~ 아우~")
        dur = 2.60;
        contour = [
          [0.00, 158, 240],
          [0.24, 286, 480],
          [0.44, 198, 320],
          [0.68, 338, 580],
          [1.00, 146, 230],
        ];
      }

      const panBase = Math.max(-0.75, Math.min(0.75, normX * 0.75));

      // Render primary vocal call + soft distant sunken-dome stereo echo (+0.54s)
      const layers = [
        { delay: 0.00, amp: 0.145 * gainScale, pan: panBase,         lpCutoff: 690, wet: 0.85 },
        { delay: 0.54, amp: 0.044 * gainScale, pan: -panBase * 0.65, lpCutoff: 470, wet: 1.00 },
      ];

      for (let li = 0; li < layers.length; li++) {
        const layer = layers[li];
        const t0 = now + layer.delay;

        const osc1 = ctx.createOscillator(); // Fundamental laryngeal tone
        const osc2 = ctx.createOscillator(); // 2nd harmonic (vocal sac resonance)
        const osc3 = ctx.createOscillator(); // 3rd soft overtone (biological reediness)
        osc1.type = 'sine';
        osc2.type = 'sine';
        osc3.type = 'triangle';

        // Schedule smooth exponential pitch glide along the whale's melodic contour
        for (let k = 0; k < contour.length; k++) {
          const [frac, fHz] = contour[k];
          const tk = t0 + frac * dur;
          if (k === 0) {
            osc1.frequency.setValueAtTime(fHz, tk);
            osc2.frequency.setValueAtTime(fHz * 1.995, tk);
            osc3.frequency.setValueAtTime(fHz * 2.99, tk);
          } else {
            osc1.frequency.exponentialRampToValueAtTime(fHz, tk);
            osc2.frequency.exponentialRampToValueAtTime(fHz * 1.995, tk);
            osc3.frequency.exponentialRampToValueAtTime(fHz * 2.99, tk);
          }
        }

        // Subtle organic vocal vibrato (4.1Hz)
        const lfo = ctx.createOscillator();
        const lfoGain1 = ctx.createGain();
        const lfoGain2 = ctx.createGain();
        lfo.type = 'sine';
        lfo.frequency.setValueAtTime(4.1, t0);
        lfoGain1.gain.setValueAtTime(5.2, t0);
        lfoGain2.gain.setValueAtTime(10.4, t0);
        lfo.connect(lfoGain1);
        lfo.connect(lfoGain2);
        lfoGain1.connect(osc1.frequency);
        lfoGain2.connect(osc2.frequency);

        const g2 = ctx.createGain();
        const g3 = ctx.createGain();
        g2.gain.value = 0.44;
        g3.gain.value = 0.13;

        // Moving vocal-cavity formant bandpass filter (gives authentic hollow cetacean vowel character)
        const formantBp = ctx.createBiquadFilter();
        formantBp.type = 'bandpass';
        formantBp.Q.setValueAtTime(2.4, t0);
        for (let k = 0; k < contour.length; k++) {
          const [frac, , formHz] = contour[k];
          const tk = t0 + frac * dur;
          if (k === 0) {
            formantBp.frequency.setValueAtTime(formHz, tk);
          } else {
            formantBp.frequency.exponentialRampToValueAtTime(formHz, tk);
          }
        }

        // Highpass above 120Hz so the whale voice is clear & melodic without any boomy sub-bass hum
        const cleanHp = ctx.createBiquadFilter();
        cleanHp.type = 'highpass';
        cleanHp.frequency.setValueAtTime(120, t0);

        // Warm underwater propagation lowpass
        const waterLp = ctx.createBiquadFilter();
        waterLp.type = 'lowpass';
        waterLp.frequency.setValueAtTime(layer.lpCutoff, t0);

        // Expressive breath envelope (soft swell in, singing sustain, long underwater decay)
        const env = ctx.createGain();
        env.gain.setValueAtTime(0.0001, t0);
        env.gain.linearRampToValueAtTime(layer.amp, t0 + dur * 0.22);
        env.gain.setValueAtTime(layer.amp * 0.88, t0 + dur * 0.58);
        env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

        // Parallel blend of warm direct fundamental + resonant vocal formant cavity
        const directBody = ctx.createGain();
        directBody.gain.value = 0.52;

        osc1.connect(directBody);
        directBody.connect(cleanHp);

        osc1.connect(formantBp);
        osc2.connect(g2);
        g2.connect(formantBp);
        osc3.connect(g3);
        g3.connect(formantBp);
        formantBp.connect(cleanHp);

        cleanHp.connect(waterLp);
        waterLp.connect(env);

        const wetBus = ctx.createGain();
        wetBus.gain.value = layer.wet;

        if (ctx.createStereoPanner) {
          const panner = ctx.createStereoPanner();
          panner.pan.setValueAtTime(layer.pan, t0);
          env.connect(panner);
          panner.connect(masterComp);
          panner.connect(wetBus);
          wetBus.connect(reverbSend);
        } else {
          env.connect(masterComp);
          env.connect(wetBus);
          wetBus.connect(reverbSend);
        }

        lfo.start(t0);
        osc1.start(t0);
        osc2.start(t0);
        osc3.start(t0);
        lfo.stop(t0 + dur + 0.05);
        osc1.stop(t0 + dur + 0.05);
        osc2.stop(t0 + dur + 0.05);
        osc3.stop(t0 + dur + 0.05);
      }

      return true;
    }

    // --- 5. SCROLL-LINKED NATURAL FADE-OUT TO MAIN PAGE (AND FADE-IN ON RETURN) ---
    function updateScrollFade() {
      const heroH = heroEl ? Math.max(400, heroEl.offsetHeight) : window.innerHeight;
      // Smoothly fade from 1.0 at top (scrollY=0) down to 0.0 by 82% of hero scroll
      const progress = Math.max(0, Math.min(1, window.scrollY / (heroH * 0.82)));
      const targetFade = Math.pow(1 - progress, 1.65);
      lastScrollFade = targetFade;

      if (!ctx || !scrollFadeGain || !scrollLowpass) return;
      const now = ctx.currentTime;
      scrollFadeGain.gain.setTargetAtTime(targetFade, now, 0.065);
      // Simultaneously muffle high frequencies (2400Hz -> 130Hz) as you dive below the intro hero!
      const cutoff = 130 + 2270 * Math.pow(1 - progress, 1.35);
      scrollLowpass.frequency.setTargetAtTime(cutoff, now, 0.065);
    }

    function toggleMute() {
      isMuted = !isMuted;
      if (!ctx) init();
      if (ctx && userMuteGain) {
        if (!isMuted && ctx.state === 'suspended') {
          ctx.resume().catch(() => {});
        }
        userMuteGain.gain.setTargetAtTime(isMuted ? 0.0 : 1.0, ctx.currentTime, 0.05);
      }
      if (soundBtn) {
        soundBtn.classList.toggle('is-active', !isMuted);
        soundBtn.setAttribute('aria-pressed', String(!isMuted));
      }
      if (soundLabel) {
        soundLabel.textContent = isMuted ? '수중 사운드 OFF' : '수중 사운드 ON';
      }
    }

    return {
      ensureRunning,
      playSonarPing,
      playBookBboook,
      playWhaleSong,
      updateScrollFade,
      toggleMute,
    };
  })();

  if (soundBtn) {
    soundBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      abyssAudio.toggleMute();
    });
  }

  // Unlock underwater ambience automatically on first user gesture anywhere
  for (const evt of ['pointerdown', 'keydown', 'wheel', 'touchstart']) {
    window.addEventListener(evt, () => abyssAudio.ensureRunning(), { once: true, passive: true });
  }
  window.addEventListener('scroll', () => abyssAudio.updateScrollFade(), { passive: true });
  let heroVisible = true;
  if (heroEl && 'IntersectionObserver' in window) {
    const hObs = new IntersectionObserver(
      (entries) => {
        heroVisible = entries[0] ? entries[0].isIntersecting : true;
      },
      { threshold: 0.01 }
    );
    hObs.observe(heroEl);
  }

  /* -------------------------------------------------------
     2. HYBRID BACK & FRONT ABYSS CANVASES (60FPS ZERO-LEAK ENGINE)
     ------------------------------------------------------- */
  const backCanvas = document.getElementById('abyssBackCanvas');
  const frontCanvas = document.getElementById('abyssFrontCanvas');

  if (backCanvas && frontCanvas && heroEl) {
    const bCtx = backCanvas.getContext('2d');
    const fCtx = frontCanvas.getContext('2d');
    // Quarter-res offscreen buffer for ultra-fast silky blurred volumetric god rays (ZERO ctx.filter blur!)
    const rayCanvas = document.createElement('canvas');
    const rayCtx = rayCanvas.getContext('2d');

    let W = 0;
    let H = 0;
    // Soft atmospheric back canvas at 1x DPR (4x fewer pixels!), sharp front canvas capped at 1.5x DPR
    const backDpr = 1;
    const frontDpr = Math.min(window.devicePixelRatio || 1, 1.5);

    const sprites = {
      girl: new Image(),
      books: [new Image(), new Image(), new Image()],
    };
    sprites.girl.src = 'assets/layers/girl.png';
    sprites.books[0].src = 'assets/layers/book-1.png';
    sprites.books[1].src = 'assets/layers/book-2.png';
    sprites.books[2].src = 'assets/layers/book-3.png';

    // Pre-rendered 64x64 sprite stamps (eliminates 550+ createRadialGradient allocations every frame!)
    function makeBubbleStamp() {
      const c = document.createElement('canvas');
      c.width = 64;
      c.height = 64;
      const g = c.getContext('2d');
      const cx = 32, cy = 32, r = 27;
      const fill = g.createRadialGradient(cx - r * 0.25, cy - r * 0.25, 0, cx, cy, r);
      fill.addColorStop(0, 'rgba(235, 254, 255, 0.34)');
      fill.addColorStop(0.7, 'rgba(135, 232, 240, 0.16)');
      fill.addColorStop(1, 'rgba(160, 242, 248, 0.58)');
      g.fillStyle = fill;
      g.beginPath();
      g.arc(cx, cy, r, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = 'rgba(210, 250, 254, 0.92)';
      g.lineWidth = 2.6;
      g.stroke();
      g.fillStyle = 'rgba(255, 255, 255, 0.95)';
      g.beginPath();
      g.arc(cx - r * 0.32, cy - r * 0.32, r * 0.24, 0, Math.PI * 2);
      g.fill();
      return c;
    }

    function makePlanktonStamp(rgb, withStar) {
      const c = document.createElement('canvas');
      c.width = 64;
      c.height = 64;
      const g = c.getContext('2d');
      const cx = 32, cy = 32, r = 28;
      const rad = g.createRadialGradient(cx, cy, 0, cx, cy, r);
      rad.addColorStop(0, `rgba(${rgb}, 0.98)`);
      rad.addColorStop(0.28, `rgba(${rgb}, 0.55)`);
      rad.addColorStop(0.65, `rgba(${rgb}, 0.16)`);
      rad.addColorStop(1, `rgba(${rgb}, 0)`);
      g.fillStyle = rad;
      g.beginPath();
      g.arc(cx, cy, r, 0, Math.PI * 2);
      g.fill();
      if (withStar) {
        const lgH = g.createLinearGradient(2, cy, 62, cy);
        lgH.addColorStop(0, `rgba(${rgb}, 0)`);
        lgH.addColorStop(0.5, 'rgba(248, 255, 254, 0.92)');
        lgH.addColorStop(1, `rgba(${rgb}, 0)`);
        g.strokeStyle = lgH;
        g.lineWidth = 2.4;
        g.beginPath();
        g.moveTo(2, cy);
        g.lineTo(62, cy);
        g.stroke();
        const lgV = g.createLinearGradient(cx, 2, cx, 62);
        lgV.addColorStop(0, `rgba(${rgb}, 0)`);
        lgV.addColorStop(0.5, 'rgba(248, 255, 254, 0.92)');
        lgV.addColorStop(1, `rgba(${rgb}, 0)`);
        g.strokeStyle = lgV;
        g.beginPath();
        g.moveTo(cx, 2);
        g.lineTo(cx, 62);
        g.stroke();
      }
      return c;
    }

    const stamps = {
      bubble: makeBubbleStamp(),
      aqua: makePlanktonStamp('140, 240, 240', false),
      white: makePlanktonStamp('234, 254, 252', false),
      gold: makePlanktonStamp('248, 234, 178', false),
      starAqua: makePlanktonStamp('170, 246, 248', true),
      starGold: makePlanktonStamp('252, 240, 195', true),
    };

    function resizeCanvases() {
      const rect = heroEl.getBoundingClientRect();
      W = rect.width;
      H = rect.height;

      backCanvas.width = Math.max(1, Math.round(W * backDpr));
      backCanvas.height = Math.max(1, Math.round(H * backDpr));
      backCanvas.style.width = `${W}px`;
      backCanvas.style.height = `${H}px`;
      bCtx.setTransform(backDpr, 0, 0, backDpr, 0, 0);

      frontCanvas.width = Math.max(1, Math.round(W * frontDpr));
      frontCanvas.height = Math.max(1, Math.round(H * frontDpr));
      frontCanvas.style.width = `${W}px`;
      frontCanvas.style.height = `${H}px`;
      fCtx.setTransform(frontDpr, 0, 0, frontDpr, 0, 0);

      // Quarter-resolution god-ray canvas for silky hardware-upscaled rays at 1/16th cost
      rayCanvas.width = Math.max(64, Math.round(W * 0.25));
      rayCanvas.height = Math.max(64, Math.round(H * 0.25));
    }

    function getWhaleScreen() {
      const br = window.__whaleBridge;
      if (br && Number.isFinite(br.screenX) && Number.isFinite(br.screenY)) {
        return {
          ready: !!br.ready,
          inView: br.inView !== false,
          x: br.screenX,
          y: br.screenY,
          bodyX: br.bodyX ?? br.screenX,
          bodyY: br.bodyY ?? br.screenY,
          tailX: br.tailX ?? br.screenX,
          tailY: br.tailY ?? br.screenY,
          tailLeftX: br.tailLeftX ?? br.tailX ?? br.screenX,
          tailLeftY: br.tailLeftY ?? br.tailY ?? br.screenY,
          tailRightX: br.tailRightX ?? br.tailX ?? br.screenX,
          tailRightY: br.tailRightY ?? br.tailY ?? br.screenY,
          finLeftX: br.finLeftX ?? br.bodyX ?? br.screenX,
          finLeftY: br.finLeftY ?? br.bodyY ?? br.screenY,
          finRightX: br.finRightX ?? br.bodyX ?? br.screenX,
          finRightY: br.finRightY ?? br.bodyY ?? br.screenY,
          vx: br.vx || 0,
          vy: br.vy || 0,
          urgency: br.urgency || 0,
          depthScale: br.depthScale || 1,
        };
      }
      return {
        ready: false,
        inView: true,
        x: W * 0.5,
        y: H * 0.36,
        bodyX: W * 0.44,
        bodyY: H * 0.38,
        tailX: W * 0.34,
        tailY: H * 0.4,
        tailLeftX: W * 0.33,
        tailLeftY: H * 0.39,
        tailRightX: W * 0.33,
        tailRightY: H * 0.42,
        finLeftX: W * 0.46,
        finLeftY: H * 0.42,
        finRightX: W * 0.46,
        finRightY: H * 0.35,
        vx: 0,
        vy: 0,
        urgency: 0,
        depthScale: 1,
      };
    }

    // --- Volumetric Fan-Shaped God Rays ---
    const fanRays = [];
    function initFanRays() {
      fanRays.length = 0;
      const count = 15;
      for (let i = 0; i < count; i++) {
        const frac = i / (count - 1);
        const baseAngle = -0.82 + frac * 1.64;
        fanRays.push({
          baseAngle,
          width: 0.036 + Math.random() * 0.056,
          lengthFactor: 0.88 + Math.random() * 0.32,
          speed: 0.00045 + Math.random() * 0.00055,
          swayAmp: 0.018 + Math.random() * 0.024,
          phase: Math.random() * Math.PI * 2,
          alphaBase: 0.055 + (1 - Math.abs(frac - 0.5) * 1.6) * 0.085,
          isFront: i % 4 === 1,
          hue: i % 3 === 0 ? 'gold-aqua' : 'aqua',
        });
      }
    }

    function drawSunDomeBloom(ctx, time) {
      const ox = W * 0.52 + currentParallaxX * 0.4;
      const oy = -H * 0.02 + currentParallaxY * 0.3;
      const pulse = 0.92 + 0.08 * Math.sin(time * 0.0012);
      const radius = Math.max(W, H) * 0.42 * pulse;

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const grad = ctx.createRadialGradient(ox, oy, 0, ox, oy, radius);
      grad.addColorStop(0, 'rgba(226, 252, 255, 0.38)');
      grad.addColorStop(0.28, 'rgba(128, 226, 248, 0.18)');
      grad.addColorStop(0.6, 'rgba(68, 182, 224, 0.06)');
      grad.addColorStop(1, 'rgba(28, 118, 185, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(ox, oy, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    function drawFanGodRays(ctx, time, frontOnly) {
      // Render rays at 1/4 resolution without expensive ctx.filter Gaussian blur, then smoothly upscale!
      const rw = rayCanvas.width;
      const rh = rayCanvas.height;
      const sx = rw / Math.max(1, W);
      const sy = rh / Math.max(1, H);
      const ox = (W * 0.52 + currentParallaxX * 0.55) * sx;
      const oy = (-H * 0.12 + currentParallaxY * 0.35) * sy;
      const maxLen = Math.hypot(rw, rh) * 1.08;

      rayCtx.clearRect(0, 0, rw, rh);
      rayCtx.save();
      rayCtx.globalCompositeOperation = 'lighter';

      for (const ray of fanRays) {
        if (ray.isFront !== frontOnly) continue;

        const sway = Math.sin(time * ray.speed + ray.phase) * ray.swayAmp;
        const angle = Math.PI * 0.5 + ray.baseAngle + sway;
        const shimmer = 0.58 + 0.42 * Math.sin(time * ray.speed * 1.6 + ray.phase * 1.3);
        const alpha = ray.alphaBase * shimmer * (frontOnly ? 0.58 : 0.95);
        const len = maxLen * ray.lengthFactor;

        const ex = ox + Math.cos(angle) * len;
        const ey = oy + Math.sin(angle) * len;

        const grad = rayCtx.createLinearGradient(ox, oy, ex, ey);
        if (ray.hue === 'gold-aqua') {
          grad.addColorStop(0, `rgba(240, 250, 240, ${alpha * 1.5})`);
          grad.addColorStop(0.28, `rgba(146, 234, 244, ${alpha * 0.86})`);
          grad.addColorStop(0.62, `rgba(76, 192, 218, ${alpha * 0.24})`);
          grad.addColorStop(1, 'rgba(30, 128, 178, 0)');
        } else {
          grad.addColorStop(0, `rgba(206, 248, 255, ${alpha * 1.44})`);
          grad.addColorStop(0.32, `rgba(108, 218, 246, ${alpha * 0.80})`);
          grad.addColorStop(0.64, `rgba(52, 168, 218, ${alpha * 0.20})`);
          grad.addColorStop(1, 'rgba(22, 108, 176, 0)');
        }

        // Dual soft-feathered concentric wedges emulate smooth blur with ZERO filter overhead!
        const halfW = ray.width * 0.65;
        rayCtx.fillStyle = grad;
        for (let pass = 0; pass < 2; pass++) {
          const wMul = pass === 0 ? 1.35 : 0.72;
          rayCtx.globalAlpha = pass === 0 ? 0.42 : 0.68;
          const a1 = angle - halfW * wMul;
          const a2 = angle + halfW * wMul;
          rayCtx.beginPath();
          rayCtx.moveTo(ox, oy);
          rayCtx.lineTo(ox + Math.cos(a1) * len, oy + Math.sin(a1) * len);
          rayCtx.lineTo(ox + Math.cos(a2) * len, oy + Math.sin(a2) * len);
          rayCtx.closePath();
          rayCtx.fill();
        }
      }
      rayCtx.restore();

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(rayCanvas, 0, 0, W, H);
      ctx.restore();
    }

    // --- Interactive Underwater Floating Books (5 Books with Buoyancy, Push, Spin & Screen Bounds!) ---
    const floatingBooks = [
      { spriteIdx: 0, nx: 0.13, ny: 0.25, scale: 0.34, depth: 0.62, phase: 0.2, rotBase: -0.18, ampY: 11, x: 0, y: 0, vx: 0, vy: 0, rot: -0.18, vRot: 0, bounce: 1, bounceVel: 0, hoverGlow: 0, radius: 64, initialized: false },
      { spriteIdx: 2, nx: 0.28, ny: 0.19, scale: 0.22, depth: 0.45, phase: 2.1, rotBase: 0.24, ampY: 8, x: 0, y: 0, vx: 0, vy: 0, rot: 0.24, vRot: 0, bounce: 1, bounceVel: 0, hoverGlow: 0, radius: 44, initialized: false },
      { spriteIdx: 1, nx: 0.83, ny: 0.27, scale: 0.30, depth: 0.58, phase: 1.4, rotBase: 0.14, ampY: 12, x: 0, y: 0, vx: 0, vy: 0, rot: 0.14, vRot: 0, bounce: 1, bounceVel: 0, hoverGlow: 0, radius: 56, initialized: false },
      { spriteIdx: 0, nx: 0.85, ny: 0.68, scale: 0.38, depth: 0.95, phase: 3.7, rotBase: -0.22, ampY: 14, x: 0, y: 0, vx: 0, vy: 0, rot: -0.22, vRot: 0, bounce: 1, bounceVel: 0, hoverGlow: 0, radius: 72, initialized: false },
      { spriteIdx: 2, nx: 0.76, ny: 0.47, scale: 0.24, depth: 0.55, phase: 4.9, rotBase: -0.12, ampY: 9, x: 0, y: 0, vx: 0, vy: 0, rot: -0.12, vRot: 0, bounce: 1, bounceVel: 0, hoverGlow: 0, radius: 48, initialized: false },
    ];

    let prevStageW = 0;
    let prevStageH = 0;

    function syncBookBoundsOnResize() {
      const baseUnit = Math.min(W, H) / 900;
      const sx = prevStageW > 0 ? W / prevStageW : 1;
      const sy = prevStageH > 0 ? H / prevStageH : 1;
      for (const b of floatingBooks) {
        const img = sprites.books[b.spriteIdx];
        const refW = img && img.naturalWidth ? img.naturalWidth * b.scale * baseUnit : 120 * b.scale * baseUnit * 2.5;
        const refH = img && img.naturalHeight ? img.naturalHeight * b.scale * baseUnit : 100 * b.scale * baseUnit * 2.5;
        b.radius = Math.max(36, Math.max(refW, refH) * 0.48);
        if (!b.initialized) {
          b.x = W * b.nx;
          b.y = H * b.ny;
          b.rot = b.rotBase;
          b.initialized = true;
        } else {
          b.x *= sx;
          b.y *= sy;
          const padX = b.radius + 20;
          b.x = Math.max(padX, Math.min(W - padX, b.x));
          b.y = Math.max(82 + b.radius, Math.min(H - b.radius - 24, b.y));
        }
      }
      prevStageW = W;
      prevStageH = H;
    }

    function getBookPos(b, time) {
      if (!b.initialized && W > 0 && H > 0) syncBookBoundsOnResize();
      const floatY = Math.sin(time * 0.0011 + b.phase) * b.ampY;
      const floatX = Math.cos(time * 0.00075 + b.phase * 1.3) * 6;
      const swayRot = Math.sin(time * 0.0009 + b.phase) * 0.07;
      const px = b.x + floatX + currentParallaxX * (0.45 + b.depth * 0.65);
      const py = b.y + floatY + currentParallaxY * (0.45 + b.depth * 0.65);
      // Keep visual position softly inside viewport even with parallax/bob
      const padX = b.radius + 12;
      return {
        x: Math.max(padX, Math.min(W - padX, px)),
        y: Math.max(76 + b.radius * 0.85, Math.min(H - b.radius - 14, py)),
        rot: b.rot + swayRot,
      };
    }

    function updateBooksPhysics(time, dtScale) {
      if (!W || !H) return;
      const baseUnit = Math.min(W, H) / 900;
      const dragLin = Math.pow(0.976, dtScale);
      const dragRot = Math.pow(0.983, dtScale);
      const glowFade = Math.pow(0.92, dtScale);

      for (const b of floatingBooks) {
        if (!b.initialized) syncBookBoundsOnResize();
        const img = sprites.books[b.spriteIdx];
        if (img && img.complete && img.naturalWidth) {
          const drawW = img.naturalWidth * b.scale * baseUnit;
          const drawH = img.naturalHeight * b.scale * baseUnit;
          b.radius = Math.max(36, Math.max(drawW, drawH) * 0.48);
        }

        // Ultra-slow deep-sea drift gently centering books over many seconds (heavy & calm)
        const homeX = W * b.nx;
        const homeY = H * b.ny;
        const speedSq = b.vx * b.vx + b.vy * b.vy;
        const restore = (speedSq < 0.25 ? 0.00009 : 0.00002) * dtScale;
        b.vx += (homeX - b.x) * restore;
        b.vy += (homeY - b.y) * restore;

        // Heavy, silky deep-water viscous resistance ("물속처럼 묵직하고 느리게")
        b.vx *= dragLin;
        b.vy *= dragLin;
        const curSpd = Math.hypot(b.vx, b.vy);
        if (curSpd > 3.8) {
          b.vx = (b.vx / curSpd) * 3.8;
          b.vy = (b.vy / curSpd) * 3.8;
        }
        b.vRot *= dragRot;
        b.hoverGlow *= glowFade;

        // Integrate position & slow weighty spin (frame-rate independent!)
        b.x += b.vx * dtScale;
        b.y += b.vy * dtScale;
        b.rot += b.vRot * dtScale;

        // Slow heavy buoyant bob on click nudge
        const bForce = (1.0 - b.bounce) * 0.075 - b.bounceVel * 0.22;
        b.bounceVel += bForce * dtScale;
        b.bounce += b.bounceVel * dtScale;

        // Strict soft-cushion viewport walls so floating books NEVER leave the screen!
        const minX = b.radius + 20;
        const maxX = W - b.radius - 20;
        const minY = 84 + b.radius;
        const maxY = H - b.radius - 24;

        if (b.x < minX) {
          b.x = minX;
          if (b.vx < -0.3) {
            b.vx = -b.vx * 0.45;
            b.vRot += (b.vy >= 0 ? -0.014 : 0.014);
            b.bounceVel += 0.018;
            spawnSparkleBurst(b.x - b.radius * 0.5, b.y, 'cyan', 4);
          } else {
            b.vx = Math.abs(b.vx) * 0.35;
          }
        } else if (b.x > maxX) {
          b.x = maxX;
          if (b.vx > 0.3) {
            b.vx = -b.vx * 0.45;
            b.vRot += (b.vy >= 0 ? 0.014 : -0.014);
            b.bounceVel += 0.018;
            spawnSparkleBurst(b.x + b.radius * 0.5, b.y, 'cyan', 4);
          } else {
            b.vx = -Math.abs(b.vx) * 0.35;
          }
        }

        if (b.y < minY) {
          b.y = minY;
          if (b.vy < -0.3) {
            b.vy = -b.vy * 0.45;
            b.vRot += (b.vx >= 0 ? 0.014 : -0.014);
            b.bounceVel += 0.018;
            spawnSparkleBurst(b.x, b.y - b.radius * 0.5, 'cyan', 4);
          } else {
            b.vy = Math.abs(b.vy) * 0.35;
          }
        } else if (b.y > maxY) {
          b.y = maxY;
          if (b.vy > 0.3) {
            b.vy = -b.vy * 0.45;
            b.vRot += (b.vx >= 0 ? -0.014 : 0.014);
            b.bounceVel += 0.018;
            spawnSparkleBurst(b.x, b.y + b.radius * 0.5, 'cyan', 4);
          } else {
            b.vy = -Math.abs(b.vy) * 0.35;
          }
        }
      }

      // Soft, slow underwater book-to-book cushioned bumping
      for (let i = 0; i < floatingBooks.length; i++) {
        for (let j = i + 1; j < floatingBooks.length; j++) {
          const a = floatingBooks[i];
          const b = floatingBooks[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist = Math.hypot(dx, dy);
          const minDist = (a.radius + b.radius) * 0.92;
          if (dist > 0.1 && dist < minDist) {
            const nx = dx / dist;
            const ny = dy / dist;
            const overlap = (minDist - dist) * 0.45;
            a.x -= nx * overlap;
            a.y -= ny * overlap;
            b.x += nx * overlap;
            b.y += ny * overlap;

            const rvx = b.vx - a.vx;
            const rvy = b.vy - a.vy;
            const sepVel = rvx * nx + rvy * ny;
            if (sepVel < 0) {
              const imp = -sepVel * 0.55 + 0.35;
              a.vx -= nx * imp;
              a.vy -= ny * imp;
              b.vx += nx * imp;
              b.vy += ny * imp;
              a.vRot -= 0.018;
              b.vRot += 0.018;
              a.bounceVel += 0.022;
              b.bounceVel += 0.022;
              spawnSparkleBurst((a.x + b.x) * 0.5, (a.y + b.y) * 0.5, 'gold', 5);
            }
          }
        }
      }
    }

    function nudgeBook(b, cx, cy, isDirectHit) {
      const pos = getBookPos(b, performance.now());
      let dx = pos.x - cx;
      let dy = pos.y - cy;
      const dist = Math.hypot(dx, dy);

      if (dist < 10) {
        const randAng = Math.random() * Math.PI * 2;
        dx = Math.cos(randAng);
        dy = Math.sin(randAng);
      } else {
        dx /= dist;
        dy /= dist;
      }

      if (isDirectHit) {
        // Weighty, slow, submerged underwater "퉁" nudge + lazy slow tumble!
        const pushSpeed = 1.95 + Math.random() * 0.85;
        b.vx += dx * pushSpeed;
        b.vy += dy * pushSpeed - 0.32;
        const offsetCross = (cx - pos.x) * dy - (cy - pos.y) * dx;
        const spinDir = offsetCross >= 0 ? 1 : -1;
        b.vRot += spinDir * (0.024 + Math.random() * 0.014);
        b.vRot = Math.max(-0.055, Math.min(0.055, b.vRot));
        b.bounceVel = 0.042;
        b.hoverGlow = 1.0;

        // Golden underwater ripple + sparkles + 4 slow rising bubbles from its pages
        spawnRipple(pos.x, pos.y, 'book', 0);
        spawnSparkleBurst(pos.x, pos.y, 'gold', 14);
        for (let k = 0; k < 4; k++) {
          bubbles.push({
            x: pos.x + (Math.random() - 0.5) * b.radius,
            y: pos.y + (Math.random() - 0.5) * b.radius * 0.7,
            r: 2.0 + Math.random() * 3.4,
            vy: 0.55 + Math.random() * 0.55,
            wobbleAmp: 0.65 + Math.random() * 0.85,
            wobbleFreq: 0.015 + Math.random() * 0.014,
            phase: Math.random() * Math.PI * 2,
            alpha: 0.40 + Math.random() * 0.22,
            isFore: true,
            ephemeral: true,
          });
        }
      } else if (dist < 135) {
        // Very subtle water wake sway ONLY if another book is right beside the click
        const falloff = Math.max(0, 1 - dist / 135);
        b.vx += dx * falloff * 0.85;
        b.vy += dy * falloff * 0.85;
        b.vRot += (Math.random() > 0.5 ? 1 : -1) * falloff * 0.012;
      }
    }

    // All 5 floating books render IN FRONT OF the 3D whale (sorted back-to-front by depth!)
    const sortedBooksByDepth = [...floatingBooks].sort((a, b) => a.depth - b.depth);

    function drawFloatingBooks(ctx, time) {
      const baseUnit = Math.min(W, H) / 900;
      for (const b of sortedBooksByDepth) {
        const img = sprites.books[b.spriteIdx];
        if (!img.complete || !img.naturalWidth) continue;

        const pos = getBookPos(b, time);
        const drawW = img.naturalWidth * b.scale * baseUnit * b.bounce;
        const drawH = img.naturalHeight * b.scale * baseUnit * (2 - b.bounce);

        const pulse = 0.5 + 0.5 * Math.sin(time * 0.002 + b.phase);
        const auraBoost = 1 + b.hoverGlow * 0.9;
        const auraR = Math.max(drawW, drawH) * (0.65 + pulse * 0.16 + b.hoverGlow * 0.18);
        const g = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, auraR);
        g.addColorStop(0, `rgba(245, 226, 162, ${Math.min(0.55, 0.22 * pulse * auraBoost + b.hoverGlow * 0.22)})`);
        g.addColorStop(0.5, `rgba(123, 227, 246, ${0.1 * pulse * auraBoost})`);
        g.addColorStop(1, 'rgba(123, 227, 246, 0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, auraR, 0, Math.PI * 2);
        ctx.fill();

        ctx.save();
        ctx.translate(pos.x, pos.y);
        ctx.rotate(pos.rot);
        ctx.globalAlpha = 0.96;
        ctx.drawImage(img, -drawW * 0.5, -drawH * 0.5, drawW, drawH);
        ctx.restore();
      }
    }

    // --- Head-Tracking Girl Watching the 3D Whale ---
    const girlRig = {
      lookX: -0.2,
      lookY: 0.4,
    };

    function drawGirl(ctx, time, whalePos) {
      const img = sprites.girl;
      if (!img.complete || !img.naturalWidth) return;

      const girlH = Math.min(H * 0.39, 360);
      const girlW = girlH * (img.naturalWidth / img.naturalHeight);
      const footX = W * 0.67 + currentParallaxX * 1.45;
      const footY = H * 0.96 + currentParallaxY * 1.25;
      const headY = footY - girlH * 0.86;

      // Smoothly track the real-time projected 3D whale coordinates
      const dx = whalePos.x - footX;
      const dy = headY - whalePos.y;
      const targetLookX = Math.max(-1, Math.min(1, dx / (W * 0.26)));
      const targetLookY = Math.max(-0.2, Math.min(1, dy / (H * 0.42)));

      girlRig.lookX += (targetLookX - girlRig.lookX) * 0.075;
      girlRig.lookY += (targetLookY - girlRig.lookY) * 0.075;

      // Contact shadow on wooden platform
      ctx.save();
      const shadowGrad = ctx.createRadialGradient(footX, footY - 2, 4, footX, footY - 2, girlW * 0.42);
      shadowGrad.addColorStop(0, 'rgba(2, 8, 16, 0.72)');
      shadowGrad.addColorStop(1, 'rgba(2, 8, 16, 0)');
      ctx.fillStyle = shadowGrad;
      ctx.beginPath();
      ctx.ellipse(footX, footY - 2, girlW * 0.42, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // 44-Slice Horizontal Strip Rigging
      const SLICES = 44;
      const srcSliceH = img.naturalHeight / SLICES;
      const dstSliceH = girlH / SLICES;

      ctx.save();
      for (let i = 0; i < SLICES; i++) {
        const v = i / (SLICES - 1);

        let headWeight = 0;
        if (v < 0.31) {
          headWeight = Math.pow(1 - v / 0.31, 1.35);
        }
        let torsoWeight = 0;
        if (v < 0.55) {
          torsoWeight = Math.pow(1 - v / 0.55, 1.8) * 0.32;
        }
        const hairSway =
          v < 0.35
            ? Math.sin(time * 0.0019 + v * 9.0) * (4.8 * (1 - v / 0.35))
            : 0;
        const skirtSway =
          v > 0.34 && v < 0.74
            ? Math.sin(time * 0.00145 + v * 7.5) * (3.6 * Math.sin(((v - 0.34) / 0.4) * Math.PI))
            : 0;

        const turnShiftX = girlRig.lookX * (girlW * 0.19 * headWeight + girlW * 0.07 * torsoWeight);
        const headScaleX = 1 - Math.abs(girlRig.lookX) * 0.08 * headWeight;
        const liftY = -girlRig.lookY * (5.6 * headWeight);
        const tiltAngle = girlRig.lookX * 0.145 * headWeight;

        const sliceCenterX = footX + turnShiftX + hairSway + skirtSway;
        const sliceTopY = footY - girlH + i * dstSliceH + liftY;
        const drawSliceW = girlW * headScaleX;

        ctx.save();
        ctx.translate(sliceCenterX, sliceTopY + dstSliceH * 0.5);
        if (tiltAngle !== 0) ctx.rotate(tiltAngle);
        ctx.drawImage(
          img,
          0,
          i * srcSliceH,
          img.naturalWidth,
          srcSliceH + 0.5,
          -drawSliceW * 0.5,
          -dstSliceH * 0.5,
          drawSliceW,
          dstSliceH + 0.9
        );
        ctx.restore();
      }
      ctx.restore();
    }

    // --- Ripples, Click Flares, Dialogue Streams, Tail Wake Ribbons/Ripples, Plankton, Bubbles & Dust ---
    const ripples = [];
    const clickFlares = [];
    const dialogueStreams = [];
    const sparkles = [];
    const whaleTrail = [];
    const tailWakeRipples = [];
    const wakeRibbons = {
      tailLeft: [],
      tailRight: [],
      tailCenter: [],
      finLeft: [],
      finRight: [],
    };
    let lastWakeSampleTime = 0;
    let lastTailRippleTime = 0;
    const bubbles = [];
    const dustParticles = [];

    function initAmbient() {
      bubbles.length = 0;
      dustParticles.length = 0;
      // Rich bottom-up rising water bubbles (~130) & sparkling micro-plankton (~230)!
      const bubbleCount = Math.min(135, Math.max(70, Math.floor(W / 11)));
      const dustCount = Math.min(240, Math.max(120, Math.floor(W / 6.2)));

      for (let i = 0; i < bubbleCount; i++) {
        const isFore = Math.random() > 0.56;
        // Organic horizontal clustering echoing rising underwater library bubble streams
        const streamBias = Math.random() < 0.45
          ? [0.14, 0.36, 0.58, 0.78, 0.90][i % 5] * W + (Math.random() - 0.5) * (W * 0.14)
          : Math.random() * W;
        bubbles.push({
          x: Math.max(0, Math.min(W, streamBias)),
          y: Math.random() * (H + 60),
          r: isFore ? 2.4 + Math.random() * 5.6 : 1.0 + Math.random() * 2.8,
          vy: isFore ? 0.55 + Math.random() * 0.82 : 0.26 + Math.random() * 0.48,
          wobbleAmp: 0.45 + Math.random() * 1.15,
          wobbleFreq: 0.011 + Math.random() * 0.022,
          phase: Math.random() * Math.PI * 2,
          alpha: isFore ? 0.24 + Math.random() * 0.32 : 0.14 + Math.random() * 0.24,
          isFore,
          ephemeral: false,
        });
      }

      for (let i = 0; i < dustCount; i++) {
        const isFore = Math.random() > 0.52;
        const hueRoll = Math.random();
        dustParticles.push({
          x: Math.random() * W,
          y: Math.random() * (H + 40),
          r: isFore ? 0.9 + Math.random() * 2.3 : 0.65 + Math.random() * 1.6,
          vx: (Math.random() - 0.5) * 0.26,
          vy: -(isFore ? 0.36 + Math.random() * 0.54 : 0.18 + Math.random() * 0.34), // Steadily rising from floor!
          swayAmp: 0.16 + Math.random() * 0.32,
          twinkleSpeed: 0.0022 + Math.random() * 0.0042,
          phase: Math.random() * Math.PI * 2,
          hue: hueRoll < 0.54 ? 'aqua' : hueRoll < 0.82 ? 'white' : 'gold',
          sparkle: Math.random() > 0.74, // ~26% flash delicate 4-point plankton star glints!
          isFore,
        });
      }
    }

    function spawnRipple(x, y, type = 'book', delayFrames = 0) {
      const rings = type === 'whale' ? 3 : 2;
      for (let i = 0; i < rings; i++) {
        ripples.push({
          x,
          y,
          type,
          style: i === 1 && type === 'whale' ? 'constellation' : 'solid',
          radius: 5,
          maxRadius: type === 'whale' ? 195 + i * 65 : 115 + i * 44,
          speed: type === 'whale' ? 1.25 : 0.96,
          alpha: type === 'whale' ? 0.58 : 0.7,
          lineWidth: type === 'whale' ? 2.0 - i * 0.4 : 1.7 - i * 0.35,
          rot: Math.random() * Math.PI * 2,
          rotSpeed: (i % 2 === 0 ? 1 : -1) * 0.008,
          delay: delayFrames + i * 16,
        });
      }
    }

    // Grand 5-Layer Fantasy Water Resonance Wave on User Click!
    // Sends a luminous wave stream to the whale; once it touches the whale, the whale glides toward the click!
    function spawnHeroClickWave(x, y, callClientX = null, callClientY = null) {
      // 1. Center luminous starburst cross flare + soft bloom
      clickFlares.push({
        x,
        y,
        life: 1.0,
        decay: 0.022,
        maxRadius: 56,
        rot: Math.random() * 0.5,
      });

      // 2. 4-layer harmonic expanding rings (gold main -> cyan interference -> rotating constellation dots -> wide caustic halo)
      const layers = [
        { type: 'gold', style: 'solid', maxR: 155, speed: 1.65, alpha: 0.92, lw: 2.8, delay: 0 },
        { type: 'whale', style: 'solid', maxR: 215, speed: 1.45, alpha: 0.72, lw: 1.9, delay: 7 },
        { type: 'gold', style: 'constellation', maxR: 255, speed: 1.32, alpha: 0.85, lw: 1.5, delay: 14 },
        { type: 'whale', style: 'caustic', maxR: 310, speed: 1.18, alpha: 0.52, lw: 6.5, delay: 20 },
      ];
      for (let i = 0; i < layers.length; i++) {
        const l = layers[i];
        ripples.push({
          x,
          y,
          type: l.type,
          style: l.style,
          radius: 6,
          maxRadius: l.maxR,
          speed: l.speed,
          alpha: l.alpha,
          lineWidth: l.lw,
          rot: Math.random() * Math.PI * 2,
          rotSpeed: (i % 2 === 0 ? 1 : -1) * 0.011,
          delay: l.delay,
        });
      }

      // 3. 28 swirling bioluminescent sparks radiating gracefully outward
      for (let i = 0; i < 28; i++) {
        const angle = (Math.PI * 2 * i) / 28 + (Math.random() - 0.5) * 0.3;
        const speed = 0.85 + Math.random() * 2.25;
        sparkles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 0.25,
          swirl: (i % 2 === 0 ? 1 : -1) * (0.025 + Math.random() * 0.02),
          r: 1.4 + Math.random() * 2.6,
          life: 1.0,
          decay: 0.010 + Math.random() * 0.009,
          color: i % 3 === 0 ? 'gold' : i % 3 === 1 ? 'cyan' : 'white',
        });
      }

      // 4. Dual intertwining harmonic light streams flying to call the whale!
      // Primary stream carries the user's click coordinate and summons the whale when it touches!
      const callTarget =
        callClientX !== null && callClientY !== null
          ? { clientX: callClientX, clientY: callClientY }
          : null;
      spawnDialogueStream(x, y, true, 1, callTarget);
      setTimeout(() => spawnDialogueStream(x, y, true, -1, null), 110);
    }

    function spawnDialogueStream(fromX, fromY, toWhale = true, curveSign = 0, callTarget = null) {
      const wp = getWhaleScreen();
      const tx = toWhale ? wp.x : W * floatingBooks[Math.floor(Math.random() * floatingBooks.length)].nx;
      const ty = toWhale ? wp.y : H * floatingBooks[Math.floor(Math.random() * floatingBooks.length)].ny;
      const spread = curveSign !== 0 ? curveSign * (95 + Math.random() * 55) : (Math.random() - 0.5) * 140;
      const midX = (fromX + tx) * 0.5 + spread;
      const midY = (fromY + ty) * 0.5 - 55 - Math.random() * 75;

      dialogueStreams.push({
        sx: fromX,
        sy: fromY,
        cx: midX,
        cy: midY,
        tx,
        ty,
        t: 0,
        speed: callTarget ? 0.022 : 0.013 + Math.random() * 0.004,
        toWhale,
        callTarget,
        tint: curveSign < 0 ? 'cyan' : 'gold',
        trail: [],
      });
    }

    function spawnSparkleBurst(x, y, color = 'cyan', count = 10) {
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
        const speed = 0.45 + Math.random() * 1.45;
        sparkles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 0.2,
          r: 1.2 + Math.random() * 2.2,
          life: 1,
          decay: 0.013 + Math.random() * 0.012,
          color,
        });
      }
    }

    let lastBookIdx = -1;
    function triggerBookCall() {
      if (document.hidden || !heroVisible || !W) return;
      let idx = Math.floor(Math.random() * floatingBooks.length);
      if (idx === lastBookIdx) idx = (idx + 1) % floatingBooks.length;
      lastBookIdx = idx;
      const pos = getBookPos(floatingBooks[idx], performance.now());
      spawnRipple(pos.x, pos.y, 'book', 0);
      spawnSparkleBurst(pos.x, pos.y, 'gold', 9);
      spawnDialogueStream(pos.x, pos.y, true);
    }

    // Hook arrival resonance from 3D whale
    function bindBridgeArrival() {
      if (window.__whaleBridge) {
        window.__whaleBridge.onArrival = (wx, wy) => {
          spawnRipple(wx, wy, 'whale', 0);
          spawnSparkleBurst(wx, wy, 'cyan', 16);
        };
      } else {
        setTimeout(bindBridgeArrival, 100);
      }
    }
    bindBridgeArrival();

    // Hovering a floating book ONLY highlights its soft golden aura & cursor (NO push until clicked!)
    heroEl.addEventListener('mousemove', (e) => {
      const rect = heroEl.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const now = performance.now();
      let hoveringBook = false;

      for (const b of floatingBooks) {
        const pos = getBookPos(b, now);
        const dist = Math.hypot(pos.x - mx, pos.y - my);
        if (dist < b.radius * 1.15) {
          hoveringBook = true;
          b.hoverGlow = Math.min(1, b.hoverGlow + 0.16);
        }
      }
      heroEl.style.cursor = hoveringBook ? 'pointer' : '';
    });

    heroEl.addEventListener('mouseleave', () => {
      heroEl.style.cursor = '';
    });

    // Click anywhere on Hero -> Click a book to gently nudge/spin it underwater ("묵직하게 퉁") + Guide Whale!
    heroEl.addEventListener('click', (e) => {
      if (e.target.closest('a, button')) return;
      const rect = heroEl.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      const now = performance.now();

      let hitBook = null;
      let hitDist = Infinity;
      for (const b of floatingBooks) {
        const pos = getBookPos(b, now);
        const d = Math.hypot(pos.x - cx, pos.y - cy);
        if (d < b.radius * 1.15 && d < hitDist) {
          hitBook = b;
          hitDist = d;
        }
      }

      if (hitBook) {
        nudgeBook(hitBook, cx, cy, true);
        // Play tactile underwater "뽀욱 (Bbo-ook)" bubble-push sound + soft distant sonar shimmer!
        const normX = (cx / Math.max(1, W)) * 2 - 1;
        const normY = cy / Math.max(1, H);
        abyssAudio.playBookBboook(normX);
        abyssAudio.playSonarPing(normX, normY, 0.28);
      } else {
        for (const b of floatingBooks) {
          nudgeBook(b, cx, cy, false);
        }
        // Play crystalline deep-sea SONAR acoustic wave ping + underwater echo!
        const normX = (cx / Math.max(1, W)) * 2 - 1;
        const normY = cy / Math.max(1, H);
        abyssAudio.playSonarPing(normX, normY, 1.0);
      }

      // Shoot click ripple & light wave toward the whale; whale turns when the wave reaches it!
      spawnHeroClickWave(cx, cy, e.clientX, e.clientY);
    });

    // Fast stamp-based rising bubbles (ZERO per-frame createRadialGradient allocations!)
    function drawBubbles(ctx, time, foreOnly, dtScale) {
      const pxOff = currentParallaxX * (foreOnly ? 1.5 : 0.45);
      const pyOff = currentParallaxY * (foreOnly ? 1.2 : 0.4);
      const stamp = stamps.bubble;
      ctx.save();
      for (let i = bubbles.length - 1; i >= 0; i--) {
        const b = bubbles[i];
        if (b.isFore !== foreOnly) continue;
        b.y -= b.vy * dtScale;
        b.x += Math.sin(time * b.wobbleFreq + b.phase) * b.wobbleAmp * 0.42 * dtScale;
        if (b.y < -22) {
          if (b.ephemeral) {
            bubbles.splice(i, 1);
            continue;
          }
          b.y = H + 8 + Math.random() * 36;
          b.x = Math.random() * W;
        }
        const bx = b.x + pxOff;
        const by = b.y + pyOff;
        const sz = b.r * 2.35;
        ctx.globalAlpha = Math.min(1, b.alpha * 1.35);
        ctx.drawImage(stamp, bx - sz * 0.5, by - sz * 0.5, sz, sz);
      }
      ctx.restore();
    }

    // Fast stamp-based twinkling micro-plankton rising continuously from the floor (ZERO gradient GC!)
    function drawDustLayer(ctx, time, foreOnly, dtScale) {
      const pxOff = currentParallaxX * (foreOnly ? 1.15 : 0.35);
      const pyOff = currentParallaxY * (foreOnly ? 0.95 : 0.30);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < dustParticles.length; i++) {
        const p = dustParticles[i];
        if (p.isFore !== foreOnly) continue;
        p.x += (p.vx + Math.sin(time * 0.001 + p.phase) * p.swayAmp) * dtScale;
        p.y += p.vy * dtScale;
        if (p.y < -14) {
          p.y = H + 6 + Math.random() * 28;
          p.x = Math.random() * W;
        }
        if (p.x < -14) p.x = W + 14;
        if (p.x > W + 14) p.x = -14;

        const px = p.x + pxOff;
        const py = p.y + pyOff;
        const twinkle = 0.2 + 0.8 * Math.pow(0.5 + 0.5 * Math.sin(time * p.twinkleSpeed + p.phase), 1.6);
        const alpha = (foreOnly ? 0.78 : 0.52) * twinkle;
        if (alpha < 0.03) continue;

        const isStar = p.sparkle && twinkle > 0.55;
        const stamp = isStar
          ? (p.hue === 'gold' ? stamps.starGold : stamps.starAqua)
          : (p.hue === 'gold' ? stamps.gold : p.hue === 'white' ? stamps.white : stamps.aqua);
        const sz = p.r * (isStar ? 8.2 : 5.4);
        ctx.globalAlpha = alpha;
        ctx.drawImage(stamp, px - sz * 0.5, py - sz * 0.5, sz, sz);
      }
      ctx.restore();
    }

    // --- Fast, Silky Long Tail-Wake Ribbons & Zero-ShadowBlur Expanding Water Ripples ---
    function updateAndDrawWhaleWakeBack(ctx, time, whalePos, dtScale) {
      if (whalePos.ready) {
        // Sample every ~92ms (max 68 pts = exact same 7.6s length at 9x lower stroke count!)
        if (time - lastWakeSampleTime > 92) {
          lastWakeSampleTime = time;
          const pushPt = (arr, x, y, maxLen) => {
            if (!Number.isFinite(x) || !Number.isFinite(y)) return;
            if (arr.length > 0) {
              const prev = arr[arr.length - 1];
              if (Math.hypot(x - prev.x, y - prev.y) > 260) arr.length = 0;
            }
            arr.push({
              x,
              y,
              born: time,
              driftSeed: Math.random() * Math.PI * 2,
            });
            while (arr.length > maxLen) arr.shift();
          };
          pushPt(wakeRibbons.tailLeft, whalePos.tailLeftX, whalePos.tailLeftY, 72);
          pushPt(wakeRibbons.tailRight, whalePos.tailRightX, whalePos.tailRightY, 72);
          pushPt(wakeRibbons.tailCenter, whalePos.tailX, whalePos.tailY, 68);
          pushPt(wakeRibbons.finLeft, whalePos.finLeftX, whalePos.finLeftY, 42);
          pushPt(wakeRibbons.finRight, whalePos.finRightX, whalePos.finRightY, 42);
        }

        // Emit large, wide, tranquil water ripples steadily from the whale's tail (capped <= 10!)
        if (time - lastTailRippleTime > 760 && whalePos.inView) {
          lastTailRippleTime = time;
          if (tailWakeRipples.length >= 10) tailWakeRipples.shift();
          const ang = Math.atan2(whalePos.vy || 0.01, whalePos.vx || 1);
          tailWakeRipples.push({
            x: whalePos.tailX + (Math.random() - 0.5) * 20,
            y: whalePos.tailY + (Math.random() - 0.5) * 18,
            vx: -(whalePos.vx || 0) * 0.006 + (Math.random() - 0.5) * 0.14,
            vy: -(whalePos.vy || 0) * 0.006 - 0.10,
            angle: ang + Math.PI * 0.5,
            radius: 18 * whalePos.depthScale,
            maxRadius: (245 + Math.random() * 145) * whalePos.depthScale,
            speed: 0.62 + Math.random() * 0.20,
            alpha: 0.14 + Math.random() * 0.07,
            aspect: 0.46 + Math.random() * 0.14,
            goldTint: Math.random() > 0.78,
          });
        }
      }

      const maxAge = 7600;
      const drawRibbon = (pts, baseWidth, baseAlpha, colorRgb, coreAlpha) => {
        while (pts.length > 0 && time - pts[0].born > maxAge) {
          pts.shift();
        }
        if (pts.length < 3) return;

        for (let i = 0; i < pts.length; i++) {
          const p = pts[i];
          const ageNorm = (time - p.born) / maxAge;
          p.x += Math.sin(time * 0.00085 + p.driftSeed + i * 0.18) * 0.22 * ageNorm * dtScale;
          p.y += (Math.cos(time * 0.00072 + p.driftSeed) * 0.15 - 0.06) * ageNorm * dtScale;
        }

        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        for (let i = 1; i < pts.length - 1; i++) {
          const p0 = pts[i - 1];
          const p1 = pts[i];
          const p2 = pts[i + 1];
          const frac = i / (pts.length - 1);
          const ageFade = Math.max(0, 1 - (time - p1.born) / maxAge);
          const tipTaper = Math.sin(Math.min(1, frac * 1.12) * Math.PI * 0.5) * Math.pow(frac, 0.55);
          const alpha = baseAlpha * tipTaper * Math.pow(ageFade, 1.35);
          if (alpha < 0.003) continue;

          const mx1 = (p0.x + p1.x) * 0.5;
          const my1 = (p0.y + p1.y) * 0.5;
          const mx2 = (p1.x + p2.x) * 0.5;
          const my2 = (p1.y + p2.y) * 0.5;
          const spreadFactor = 1.0 + (1.0 - ageFade) * 1.85;

          // 2 clean passes (wide mist + luminous filament) -> exact same look, ~9x faster!
          ctx.strokeStyle = `rgba(${colorRgb}, ${alpha * 0.44})`;
          ctx.lineWidth = baseWidth * (0.45 + frac * 0.65) * spreadFactor;
          ctx.beginPath();
          ctx.moveTo(mx1, my1);
          ctx.quadraticCurveTo(p1.x, p1.y, mx2, my2);
          ctx.stroke();

          ctx.strokeStyle = `rgba(210, 248, 246, ${alpha * coreAlpha})`;
          ctx.lineWidth = Math.max(0.9, baseWidth * 0.12 * frac);
          ctx.stroke();
        }
        ctx.restore();
      };

      drawRibbon(wakeRibbons.tailCenter, 64.0, 0.056, '118, 224, 228', 0.12);
      drawRibbon(wakeRibbons.tailLeft, 36.0, 0.082, '142, 236, 238', 0.18);
      drawRibbon(wakeRibbons.tailRight, 36.0, 0.082, '142, 236, 238', 0.18);
      drawRibbon(wakeRibbons.finLeft, 24.0, 0.058, '152, 238, 238', 0.14);
      drawRibbon(wakeRibbons.finRight, 24.0, 0.058, '152, 238, 238', 0.14);

      // Draw huge, tranquil, feathered tail-undulation water ripples (ZERO shadowBlur!)
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let i = tailWakeRipples.length - 1; i >= 0; i--) {
        const wr = tailWakeRipples[i];
        const progress = wr.radius / wr.maxRadius;
        wr.radius += wr.speed * (1.18 - progress * 0.58) * dtScale;
        wr.x += wr.vx * dtScale;
        wr.y += wr.vy * dtScale;
        if (wr.radius >= wr.maxRadius) {
          tailWakeRipples.splice(i, 1);
          continue;
        }
        const fade = Math.pow(1 - progress, 1.75) * Math.min(1, progress * 4.8);
        const alpha = wr.alpha * fade;
        if (alpha < 0.002) continue;

        const rgb = wr.goldTint ? '210, 240, 222' : '142, 234, 238';
        const ry = wr.radius * (wr.aspect || 0.5);

        ctx.save();
        ctx.translate(wr.x, wr.y);
        ctx.rotate(wr.angle);

        // Layer 1: Wide, ultra-faint feathered water-wave swell band
        ctx.strokeStyle = `rgba(${rgb}, ${alpha * 0.22})`;
        ctx.lineWidth = 18 + progress * 22;
        ctx.beginPath();
        ctx.ellipse(0, 0, wr.radius, ry, 0, 0, Math.PI * 2);
        ctx.stroke();

        // Layer 2: Soft halo crest (replaces expensive shadowBlur at 25x speed!)
        ctx.strokeStyle = `rgba(${rgb}, ${alpha * 0.28})`;
        ctx.lineWidth = 8.0 * (1 - progress * 0.4);
        ctx.stroke();

        // Layer 3: Crisp luminous primary ripple crest
        ctx.strokeStyle = `rgba(${rgb}, ${alpha * 0.78})`;
        ctx.lineWidth = 2.0 * (1 - progress * 0.45);
        ctx.stroke();

        // Layer 4: Gentle trailing inner harmonic wave (0.68x)
        ctx.strokeStyle = `rgba(205, 248, 246, ${alpha * 0.34})`;
        ctx.lineWidth = 1.2 * (1 - progress * 0.4);
        ctx.beginPath();
        ctx.ellipse(0, 0, wr.radius * 0.68, ry * 0.68, 0, 0, Math.PI * 2);
        ctx.stroke();

        // Layer 5: Whisper-faint leading outer echo (1.24x)
        ctx.strokeStyle = `rgba(${rgb}, ${alpha * 0.18})`;
        ctx.lineWidth = 1.0;
        ctx.beginPath();
        ctx.ellipse(0, 0, wr.radius * 1.24, ry * 1.24, 0, 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();
      }
      ctx.restore();
    }

    function drawEffects(ctx, time, whalePos, dtScale) {
      // Emit delicate painterly seafoam plankton along whale wake (capped <= 90!)
      if (whalePos.ready && whalePos.inView && whaleTrail.length < 90 && Math.random() < 0.48 * dtScale) {
        const pick = Math.random();
        let sx, sy, jitter;
        if (pick < 0.32) {
          sx = whalePos.tailLeftX; sy = whalePos.tailLeftY; jitter = 38;
        } else if (pick < 0.64) {
          sx = whalePos.tailRightX; sy = whalePos.tailRightY; jitter = 38;
        } else if (pick < 0.80) {
          sx = whalePos.tailX; sy = whalePos.tailY; jitter = 48;
        } else if (pick < 0.90) {
          sx = whalePos.finLeftX; sy = whalePos.finLeftY; jitter = 30;
        } else {
          sx = whalePos.finRightX; sy = whalePos.finRightY; jitter = 30;
        }
        whaleTrail.push({
          x: sx + (Math.random() - 0.5) * jitter,
          y: sy + (Math.random() - 0.5) * jitter,
          vx: -(whalePos.vx || 0) * 0.0045 + (Math.random() - 0.5) * 0.44,
          vy: -0.14 - Math.random() * 0.26,
          swirlPhase: Math.random() * Math.PI * 2,
          r: 1.0 + Math.random() * 2.1,
          life: 1,
          decay: 0.0038 + Math.random() * 0.0038,
          gold: Math.random() > 0.74,
          star: Math.random() > 0.76,
        });
      }

      // Fast stamp-based whale wake sparkles (ZERO per-frame gradient allocations!)
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const trailDrag = Math.pow(0.988, dtScale);
      for (let i = whaleTrail.length - 1; i >= 0; i--) {
        const pt = whaleTrail[i];
        pt.x += (pt.vx + Math.sin(time * 0.0018 + (pt.swirlPhase || 0)) * 0.16) * dtScale;
        pt.y += pt.vy * dtScale;
        pt.vx *= trailDrag;
        pt.life -= pt.decay * dtScale;
        if (pt.life <= 0) {
          whaleTrail.splice(i, 1);
          continue;
        }
        const twinkle = 0.58 + 0.42 * Math.sin(time * 0.0052 + (pt.swirlPhase || i));
        const alpha = Math.pow(pt.life, 1.3) * twinkle * 0.80;
        const rad = pt.r * (0.45 + 0.55 * pt.life);
        const stamp = pt.star
          ? (pt.gold ? stamps.starGold : stamps.starAqua)
          : (pt.gold ? stamps.gold : stamps.aqua);
        const sz = rad * (pt.star ? 8.6 : 6.2);
        ctx.globalAlpha = alpha;
        ctx.drawImage(stamp, pt.x - sz * 0.5, pt.y - sz * 0.5, sz, sz);
      }
      ctx.restore();

      // Click center starburst flares (capped <= 8)
      while (clickFlares.length > 8) clickFlares.shift();
      for (let i = clickFlares.length - 1; i >= 0; i--) {
        const fl = clickFlares[i];
        fl.life -= fl.decay * dtScale;
        fl.rot += 0.012 * dtScale;
        if (fl.life <= 0) {
          clickFlares.splice(i, 1);
          continue;
        }
        const ease = Math.sin(fl.life * Math.PI);
        const rad = fl.maxRadius * (1.25 - fl.life * 0.45);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const bloom = ctx.createRadialGradient(fl.x, fl.y, 0, fl.x, fl.y, rad);
        bloom.addColorStop(0, `rgba(255, 252, 232, ${ease * 0.85})`);
        bloom.addColorStop(0.35, `rgba(245, 223, 156, ${ease * 0.42})`);
        bloom.addColorStop(0.7, `rgba(123, 227, 246, ${ease * 0.18})`);
        bloom.addColorStop(1, 'rgba(123, 227, 246, 0)');
        ctx.fillStyle = bloom;
        ctx.beginPath();
        ctx.arc(fl.x, fl.y, rad, 0, Math.PI * 2);
        ctx.fill();

        ctx.translate(fl.x, fl.y);
        ctx.rotate(fl.rot);
        const arm = rad * 0.92;
        for (let k = 0; k < 2; k++) {
          ctx.rotate(Math.PI * 0.5);
          const g = ctx.createLinearGradient(-arm, 0, arm, 0);
          g.addColorStop(0, 'rgba(255, 255, 255, 0)');
          g.addColorStop(0.5, `rgba(255, 250, 224, ${ease * 0.92})`);
          g.addColorStop(1, 'rgba(255, 255, 255, 0)');
          ctx.strokeStyle = g;
          ctx.lineWidth = 2.0 * ease;
          ctx.beginPath();
          ctx.moveTo(-arm, 0);
          ctx.lineTo(arm, 0);
          ctx.stroke();
        }
        ctx.restore();
      }

      // Multi-layer harmonic water ripples (capped <= 24, ZERO shadowBlur!)
      while (ripples.length > 24) ripples.shift();
      for (let i = ripples.length - 1; i >= 0; i--) {
        const rp = ripples[i];
        if (rp.delay > 0) {
          rp.delay -= dtScale;
          continue;
        }
        const progress = rp.radius / rp.maxRadius;
        rp.radius += rp.speed * (1.25 - progress * 0.55) * dtScale;
        rp.rot = (rp.rot || 0) + (rp.rotSpeed || 0) * dtScale;
        if (rp.radius >= rp.maxRadius) {
          ripples.splice(i, 1);
          continue;
        }
        const p2 = rp.radius / rp.maxRadius;
        const alpha = rp.alpha * Math.pow(1 - p2, 1.35);
        const isWhale = rp.type === 'whale';
        const rgb = isWhale ? '123, 227, 246' : '248, 228, 162';

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.translate(rp.x, rp.y);

        if (rp.style === 'constellation') {
          ctx.rotate(rp.rot);
          ctx.strokeStyle = `rgba(${rgb}, ${alpha * 0.45})`;
          ctx.lineWidth = 1.0;
          ctx.setLineDash([8, 14]);
          ctx.beginPath();
          ctx.ellipse(0, 0, rp.radius, rp.radius * 0.84, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);

          const dots = 24;
          for (let d = 0; d < dots; d++) {
            const a = (Math.PI * 2 * d) / dots;
            const dx = Math.cos(a) * rp.radius;
            const dy = Math.sin(a) * rp.radius * 0.84;
            const dr = d % 3 === 0 ? 2.2 : 1.15;
            ctx.fillStyle = d % 3 === 0 ? `rgba(255, 252, 232, ${alpha * 0.95})` : `rgba(${rgb}, ${alpha * 0.78})`;
            ctx.beginPath();
            ctx.arc(dx, dy, dr * (1 - p2 * 0.35), 0, Math.PI * 2);
            ctx.fill();
          }
        } else if (rp.style === 'caustic') {
          // Layered wide translucent caustic halo (replaces expensive shadowBlur!)
          ctx.beginPath();
          ctx.ellipse(0, 0, rp.radius, rp.radius * 0.84, -0.1, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(${rgb}, ${alpha * 0.16})`;
          ctx.lineWidth = rp.lineWidth * (2.4 + p2 * 1.1);
          ctx.stroke();
          ctx.strokeStyle = `rgba(${rgb}, ${alpha * 0.36})`;
          ctx.lineWidth = rp.lineWidth * (1 + p2 * 0.55);
          ctx.stroke();
        } else {
          // Layered luminous harmonic ring (replaces expensive shadowBlur!)
          ctx.beginPath();
          ctx.ellipse(0, 0, rp.radius, rp.radius * 0.84, -0.12, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(${rgb}, ${alpha * 0.25})`;
          ctx.lineWidth = rp.lineWidth * 4.2 * (1 - p2 * 0.3);
          ctx.stroke();
          ctx.strokeStyle = `rgba(${rgb}, ${alpha})`;
          ctx.lineWidth = rp.lineWidth * (1 - p2 * 0.35);
          ctx.stroke();
          ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.48})`;
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
        ctx.restore();
      }

      // Dialogue / call light streams (capped <= 10)
      while (dialogueStreams.length > 10) dialogueStreams.shift();
      for (let i = dialogueStreams.length - 1; i >= 0; i--) {
        const st = dialogueStreams[i];
        if (st.toWhale) {
          st.tx = whalePos.x;
          st.ty = whalePos.y;
        }
        st.t += st.speed * dtScale;
        const inv = 1 - st.t;
        const x = inv * inv * st.sx + 2 * inv * st.t * st.cx + st.t * st.t * st.tx;
        const y = inv * inv * st.sy + 2 * inv * st.t * st.cy + st.t * st.t * st.ty;

        st.trail.push({ x, y });
        if (st.trail.length > 26) st.trail.shift();

        const isGold = st.tint ? st.tint === 'gold' : st.toWhale;
        for (let j = 1; j < st.trail.length; j++) {
          const frac = j / st.trail.length;
          ctx.beginPath();
          ctx.moveTo(st.trail[j - 1].x, st.trail[j - 1].y);
          ctx.lineTo(st.trail[j].x, st.trail[j].y);
          ctx.strokeStyle = isGold
            ? `rgba(248, 228, 168, ${frac * 0.78})`
            : `rgba(123, 227, 246, ${frac * 0.78})`;
          ctx.lineWidth = frac * 3.2;
          ctx.lineCap = 'round';
          ctx.stroke();
        }

        const headStamp = isGold ? stamps.starGold : stamps.starAqua;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.95;
        ctx.drawImage(headStamp, x - 18, y - 18, 36, 36);
        ctx.restore();

        if (st.t >= 1) {
          if (st.toWhale) {
            spawnRipple(st.tx, st.ty, 'whale', 0);
            spawnSparkleBurst(st.tx, st.ty, 'cyan', 12);
            if (
              st.callTarget &&
              window.__whaleBridge &&
              typeof window.__whaleBridge.setTargetScreen === 'function'
            ) {
              window.__whaleBridge.setTargetScreen(st.callTarget.clientX, st.callTarget.clientY);
              // Whale gently answers the user's sonar wave with a deep vocal call (6.2s cooldown prevents spam)
              const wNormX = (st.tx / Math.max(1, W)) * 2 - 1;
              abyssAudio.playWhaleSong(wNormX, 0.90, 6.2);
            } else if (
              window.__whaleBridge &&
              typeof window.__whaleBridge.triggerResonance === 'function'
            ) {
              window.__whaleBridge.triggerResonance();
            }
            if (Math.random() < 0.45) {
              setTimeout(() => spawnDialogueStream(st.tx, st.ty, false), 450);
            }
          } else {
            spawnRipple(st.tx, st.ty, 'book', 0);
            spawnSparkleBurst(st.tx, st.ty, 'gold', 7);
          }
          dialogueStreams.splice(i, 1);
        }
      }

      // Click & book sparkle bursts (capped <= 130, fast stamp draw!)
      while (sparkles.length > 130) sparkles.shift();
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const spDrag = Math.pow(0.975, dtScale);
      for (let i = sparkles.length - 1; i >= 0; i--) {
        const sp = sparkles[i];
        if (sp.swirl) {
          const angS = sp.swirl * dtScale;
          const cosS = Math.cos(angS);
          const sinS = Math.sin(angS);
          const nvx = sp.vx * cosS - sp.vy * sinS;
          const nvy = sp.vx * sinS + sp.vy * cosS;
          sp.vx = nvx;
          sp.vy = nvy - 0.012 * dtScale;
        }
        sp.x += sp.vx * dtScale;
        sp.y += sp.vy * dtScale;
        sp.vx *= spDrag;
        sp.vy *= spDrag;
        sp.life -= sp.decay * dtScale;
        if (sp.life <= 0) {
          sparkles.splice(i, 1);
          continue;
        }
        const stamp = sp.color === 'gold' ? stamps.gold : sp.color === 'white' ? stamps.white : stamps.aqua;
        const sz = sp.r * (0.4 + sp.life * 0.6) * 5.2;
        ctx.globalAlpha = sp.life;
        ctx.drawImage(stamp, sp.x - sz * 0.5, sp.y - sz * 0.5, sz, sz);
      }
      ctx.restore();
    }

    let lastStageTime = performance.now();

    function renderStage(now) {
      requestAnimationFrame(renderStage);
      const dtMs = Math.min(48, Math.max(4, now - lastStageTime));
      lastStageTime = now;
      if (!heroVisible || document.hidden) return;
      abyssAudio.updateScrollFade();

      const dtScale = dtMs / 16.6667;

      // Update background parallax smoothly inside the single unified 2D RAF loop
      const pLerp = 1 - Math.pow(1 - 0.045, dtScale);
      currentParallaxX += (targetParallaxX - currentParallaxX) * pLerp;
      currentParallaxY += (targetParallaxY - currentParallaxY) * pLerp;
      if (heroBgWrap) {
        heroBgWrap.style.transform = `translate3d(${currentParallaxX}px, ${currentParallaxY}px, 0)`;
      }

      const whalePos = getWhaleScreen();
      updateBooksPhysics(now, dtScale);

      // --- BACK CANVAS (Behind 3D Whale) ---
      bCtx.clearRect(0, 0, W, H);
      drawSunDomeBloom(bCtx, now);
      drawFanGodRays(bCtx, now, false);
      drawDustLayer(bCtx, now, false, dtScale);
      drawBubbles(bCtx, now, false, dtScale);
      updateAndDrawWhaleWakeBack(bCtx, now, whalePos, dtScale);

      // --- FRONT CANVAS (In Front of 3D Whale: ALL 5 Floating Books, Ripples, Girl, Rays & Bubbles!) ---
      fCtx.clearRect(0, 0, W, H);
      drawFloatingBooks(fCtx, now);
      drawEffects(fCtx, now, whalePos, dtScale);
      drawGirl(fCtx, now, whalePos);
      drawFanGodRays(fCtx, now, true);
      drawDustLayer(fCtx, now, true, dtScale);
      drawBubbles(fCtx, now, true, dtScale);
    }

    resizeCanvases();
    syncBookBoundsOnResize();
    initFanRays();
    initAmbient();
    window.addEventListener('resize', () => {
      resizeCanvases();
      syncBookBoundsOnResize();
      initAmbient();
    });

    setTimeout(triggerBookCall, 1200);
    setInterval(triggerBookCall, 4200);

    // Occasional Spontaneous Humpback Whale Vocal Song (every ~11s..16s while in the hero dome)
    function triggerSpontaneousWhaleVocal() {
      if (document.hidden || !heroVisible || !W) return;
      const wp = getWhaleScreen();
      const normX = ((wp.x || W * 0.5) / Math.max(1, W)) * 2 - 1;
      const sang = abyssAudio.playWhaleSong(normX, 1.0, 8.5);
      if (sang && wp.ready) {
        spawnRipple(wp.x, wp.y, 'whale', 0);
        spawnSparkleBurst(wp.x, wp.y, 'cyan', 10);
        if (window.__whaleBridge && typeof window.__whaleBridge.triggerResonance === 'function') {
          window.__whaleBridge.triggerResonance();
        }
      }
    }

    function scheduleNextWhaleVocal(initialDelayMs) {
      const waitMs = initialDelayMs || (11000 + Math.random() * 5200);
      setTimeout(() => {
        triggerSpontaneousWhaleVocal();
        scheduleNextWhaleVocal();
      }, waitMs);
    }
    // Schedule periodic whale calls + a gentle greeting call ~2.4s after first user gesture unlocks audio
    scheduleNextWhaleVocal(9500);
    for (const evt of ['pointerdown', 'keydown', 'wheel', 'touchstart']) {
      window.addEventListener(
        evt,
        () => {
          setTimeout(triggerSpontaneousWhaleVocal, 2400);
        },
        { once: true, passive: true }
      );
    }

    requestAnimationFrame(renderStage);
  }

  /* -------------------------------------------------------
     3. NAVBAR SCROLL & MOBILE MENU
     ------------------------------------------------------- */
  const navbar = document.getElementById('navbar');
  const navToggle = document.getElementById('navToggle');
  const mobileMenu = document.getElementById('mobileMenu');

  window.addEventListener(
    'scroll',
    () => {
      if (window.scrollY > 40) {
        navbar.classList.add('scrolled');
      } else {
        navbar.classList.remove('scrolled');
      }
    },
    { passive: true }
  );

  if (navToggle && mobileMenu) {
    navToggle.addEventListener('click', () => {
      const open = mobileMenu.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', String(open));
      mobileMenu.setAttribute('aria-hidden', String(!open));
    });

    mobileMenu.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        mobileMenu.classList.remove('open');
        navToggle.setAttribute('aria-expanded', 'false');
        mobileMenu.setAttribute('aria-hidden', 'true');
      });
    });
  }

  /* -------------------------------------------------------
     4. SCROLL REVEAL (IntersectionObserver)
     ------------------------------------------------------- */
  const revealEls = document.querySelectorAll('.reveal');
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
  );
  revealEls.forEach((el) => revealObserver.observe(el));

  /* -------------------------------------------------------
     5. TOAST HELPER + AERINDEW SWATCH COPY + EMAIL COPY
     ------------------------------------------------------- */
  const toastEl = document.getElementById('toast');
  let toastTimer = null;

  function showToast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2200);
  }

  async function copyText(text, label) {
    try {
      await navigator.clipboard.writeText(text);
      showToast(`${label} (${text}) 복사되었습니다.`);
    } catch {
      showToast(`${text}`);
    }
  }

  document.querySelectorAll('.swatch').forEach((btn) => {
    btn.addEventListener('click', () => {
      const hex = btn.dataset.hex;
      if (hex) copyText(hex, '컬러 코드');
    });
  });

  const copyEmailBtn = document.getElementById('copyEmailBtn');
  if (copyEmailBtn) {
    copyEmailBtn.addEventListener('click', () => {
      copyText(copyEmailBtn.dataset.email, '이메일 주소');
    });
  }

  /* -------------------------------------------------------
     6. TEAZ INTERACTIVE MOOD SELECTOR
     ------------------------------------------------------- */
  const MOOD_DATA = {
    wake: {
      title: 'WAKE / ENERGISE — Green Tea + Lime',
      desc: '활기찬 에너지가 필요할 때. 상쾌한 그린티와 톡 쏘는 라임이 어우러져 가볍고 선명한 하루의 시작을 열어줍니다.',
      tags: ['#에너지부스트', '#상쾌한맛', '#비타민가득'],
    },
    focus: {
      title: 'FOCUS / CLARITY — Oolong Tea + Blueberry',
      desc: '깊은 집중력이 필요한 순간. 깔끔한 우롱티에 은은한 블루베리 향을 더해 머리를 맑게 정돈해 줍니다.',
      tags: ['#집중력UP', '#클린우롱', '#블루베리노트'],
    },
    boost: {
      title: 'BOOST / GOOD VIBES — White Tea + Raspberry',
      desc: '기분 전환이 필요할 때. 산뜻한 화이트티와 달콤한 라즈베리가 어우러져 생기 넘치는 무드를 채워줍니다.',
      tags: ['#기분전환', '#굿바이브', '#산뜻한과일향'],
    },
    chill: {
      title: 'CHILL / RELAX — Black Tea + Passionfruit',
      desc: '편안한 휴식이 필요할 때. 부드러운 홍차와 이국적인 패션프루트의 여운이 하루의 긴장을 천천히 풀어줍니다.',
      tags: ['#편안한휴식', '#릴렉스무드', '#패션프루트'],
    },
  };

  const teazMoodBox = document.getElementById('teazMoodBox');
  const moodTitle = document.getElementById('moodTitle');
  const moodDesc = document.getElementById('moodDesc');
  const moodTags = document.getElementById('moodTags');

  document.querySelectorAll('.mood-pill').forEach((pill) => {
    pill.addEventListener('click', () => {
      const key = pill.dataset.mood;
      const data = MOOD_DATA[key];
      if (!data || !teazMoodBox) return;

      document.querySelectorAll('.mood-pill').forEach((p) => {
        p.classList.remove('active');
        p.setAttribute('aria-selected', 'false');
      });
      pill.classList.add('active');
      pill.setAttribute('aria-selected', 'true');

      teazMoodBox.dataset.mood = key;
      moodTitle.textContent = data.title;
      moodDesc.textContent = data.desc;
      moodTags.innerHTML = data.tags.map((t) => `<span>${t}</span>`).join('');
    });
  });

  /* -------------------------------------------------------
     7. LIGHTBOX MODAL FOR ARTWORK INSPECTION
     ------------------------------------------------------- */
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightboxImg');
  const lightboxCaption = document.getElementById('lightboxCaption');
  const lightboxClose = document.getElementById('lightboxClose');

  function openLightbox(src, caption) {
    if (!lightbox) return;
    lightboxImg.src = src;
    lightboxImg.alt = caption || '포트폴리오 이미지';
    lightboxCaption.textContent = caption || '';
    lightbox.classList.add('open');
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    if (!lightbox) return;
    lightbox.classList.remove('open');
    lightbox.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  document.querySelectorAll('[data-lightbox]').forEach((card) => {
    card.addEventListener('click', () => {
      openLightbox(card.dataset.lightbox, card.dataset.caption);
    });
  });

  if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
  if (lightbox) {
    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox) closeLightbox();
    });
  }
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeLightbox();
  });
})();
