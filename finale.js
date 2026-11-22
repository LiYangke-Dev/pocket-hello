"use strict";

function createFinale(container) {
  const canvas = container.querySelector("canvas");
  const paper = container.querySelector(".finale-paper");
  const back = container.querySelector(".show-notes");
  const context = canvas.getContext("2d");
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const artwork = [
    {
      shape: new Path2D("M123 66C102 59 87 43 88 28C89 13 103 8 113 17C117 20 120 24 122 28C130 12 149 8 160 17C173 27 165 46 153 55C144 62 132 66 123 66Z"),
      colors: ["#b4242d", "#bf2936", "#d6443e"],
    },
    {
      shape: new Path2D("M88 112L80 92C76 82 82 74 90 72C99 69 107 74 110 81L117 98L135 89C144 84 154 87 158 95C162 103 159 112 152 116L130 127C150 134 165 147 174 164C185 185 175 204 158 214C138 227 115 225 96 211L69 188C53 174 48 152 57 133C63 121 74 115 88 112Z"),
      colors: ["#f5ba98", "#ffcca9", "#f0ad90", "#ffdec0", "#ffc19e"],
    },
  ];
  const redHeart = new Path2D("M124 58C109 50 98 40 99 29C100 22 107 19 112 23C117 27 120 31 122 36C127 27 137 19 147 21C157 22 160 31 154 40C149 48 137 56 124 58Z");
  const creases = new Path2D("M88 112L117 98 M130 127L96 154 M148 135L111 178 M166 151L132 195");
  const heartInside = ["#ea3941", "#f85c52", "#ed4c48", "#dc3339"];
  const handOutline = ["#e87872", "#ef867d", "#f8988a", "#f3a08d"];
  const confetti = ["#bd495b", "#dd9d45", "#7b9a82", "#8699b2", "#a98aae"];
  const gatherTime = 660;
  const burstTime = 960;
  const formTime = 2260;
  const scatterTime = 4160;
  const returnTime = scatterTime + 135;
  const finishTime = 5000;
  let pieces = [];
  let frame;
  let stillTimer;
  let animations = [];
  let elapsed = 0;

  function makePiece(x, y, colors, size, floating = false) {
    const direction = Math.random() * Math.PI * 2;
    const distance = .32 + Math.random() * .55;
    const color = colors[Math.floor(Math.random() * colors.length)];
    return { x, y, size, color, direction, distance, floating, tilt: direction };
  }

  function generatePieces() {
    const result = [];
    const [heart, hand] = artwork;
    context.lineWidth = 8;
    context.lineCap = "round";
    context.lineJoin = "round";
    for (let y = 9; y < 227; y += 4.25) {
      for (let x = 48; x < 186; x += 4.25) {
        const px = x + Math.random() * 3.25;
        const py = y + Math.random() * 3.25;
        let colors;
        if (context.isPointInPath(heart.shape, px, py)) {
          colors = context.isPointInPath(redHeart, px, py) ? heartInside : heart.colors;
        } else if (context.isPointInStroke(hand.shape, px, py) || context.isPointInStroke(creases, px, py)) {
          colors = handOutline;
        } else if (context.isPointInPath(hand.shape, px, py)) {
          colors = hand.colors;
        }
        if (colors) result.push(makePiece(px, py, colors, 2.6 + Math.random() * 3.3));
      }
    }
    for (let index = 0; index < 42; index++) {
      const angle = (index + Math.random()) * Math.PI * 2 / 42;
      const radius = 80 + Math.random() * 31;
      result.push(makePiece(121 + Math.cos(angle) * radius, 105 + Math.sin(angle) * radius,
        confetti, 2.4 + Math.random() * 2.6, true));
    }
    return result;
  }

  function paint(time) {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const density = Math.min(devicePixelRatio || 1, 2);
    if (canvas.width !== Math.round(width * density) || canvas.height !== Math.round(height * density)) {
      canvas.width = Math.round(width * density);
      canvas.height = Math.round(height * density);
    }
    context.setTransform(density, 0, 0, density, 0, 0);
    context.globalAlpha = 1;
    context.clearRect(0, 0, width, height);
    if (time < burstTime) return;

    const centerX = width * .5;
    const centerY = height * .46;
    const scale = Math.min(width * .9 / 240, (height - 74) / 221, 1.72);
    const travel = Math.min(width * .6, height * .52);
    const burst = Math.min(1, (time - burstTime) / 420);
    const form = Math.max(0, Math.min(1, (time - burstTime - 330) / (formTime - burstTime - 330)));
    const settle = 1 - (1 - form) ** 3;
    const scatter = Math.max(0, (time - scatterTime) / (finishTime - scatterTime));
    const scatterEase = 1 - (1 - scatter) ** 2;

    for (const piece of pieces) {
      const spread = (1 - (1 - burst) ** 2) * travel * piece.distance;
      const dx = Math.cos(piece.direction) * spread;
      const dy = Math.sin(piece.direction) * spread;
      const shapeX = (piece.x - 121) * scale;
      const shapeY = (piece.y - 108) * scale;
      const x = centerX + dx * (1 - settle + scatterEase * .82) + shapeX * (settle + scatterEase * .55);
      const y = centerY + dy * (1 - settle + scatterEase * .82) + shapeY * (settle + scatterEase * .55);
      context.save();
      context.translate(x, y);
      context.rotate(piece.tilt + (1 - settle) * burst * 4 + scatterEase * 5);
      context.globalAlpha = Math.min(1, burst * 4) * (piece.floating ? .62 : .96) * (1 - scatter ** 1.65);
      context.fillStyle = piece.color;
      const size = piece.size * scale;
      context.fillRect(-size / 2, -size / 3, size, size * .72);
      context.restore();
    }
  }

  function cancelAnimations() {
    for (const animation of animations) animation.cancel();
    animations = [];
  }

  function reset() {
    cancelAnimationFrame(frame);
    clearTimeout(stillTimer);
    cancelAnimations();
    container.hidden = true;
  }

  function returnNotes(noteLayer, offset) {
    cancelAnimations();
    const width = noteLayer.clientWidth;
    const height = noteLayer.clientHeight;
    const start = document.timeline.currentTime - offset;
    for (const note of noteLayer.children) {
      const dx = width / 2 - note.offsetLeft;
      const dy = height * .46 - note.offsetTop;
      const tilt = parseFloat(note.style.getPropertyValue("--tilt")) || 0;
      const turn = dx > 0 ? -24 : 24;
      const delay = Math.min(165, 118 * Math.hypot(dx / width, dy / height) + Math.random() * 88);
      const animation = note.animate([
        { opacity: 0, transform: `translate(-50%, -50%) translate(${dx * .67}px, ${dy * .67 - 14}px) rotate(${tilt + turn}deg) scale(.23)` },
        { opacity: .87, transform: `translate(-50%, -50%) translate(${dx * .14}px, ${dy * .14 - 9}px) rotate(${tilt + turn * .29}deg) scale(.82)`, offset: .55 },
        { opacity: 1, transform: `translate(-50%, -50%) translate(0, 3px) rotate(${tilt - 2}deg) scale(1.025)`, offset: .86 },
        { opacity: 1, transform: `translate(-50%, -50%) rotate(${tilt}deg)` },
      ], { duration: 485, delay, fill: "both", easing: "cubic-bezier(.18,.66,.32,1)" });
      animation.startTime = start;
      animations.push(animation);
    }
  }

  function play(noteLayer, onComplete, playSound) {
    reset();
    // Sample in the artwork's own coordinate space, independently of the view.
    context.resetTransform();
    pieces = generatePieces();
    elapsed = 0;
    container.hidden = false;
    back.hidden = true;

    if (reducedMotion.matches) {
      elapsed = formTime;
      paint(elapsed);
      back.hidden = false;
      stillTimer = setTimeout(onComplete, scatterTime - formTime);
      return;
    }

    const width = noteLayer.clientWidth;
    const height = noteLayer.clientHeight;
    playSound("paper");
    for (const note of noteLayer.children) {
      const transform = getComputedStyle(note).transform;
      const dx = width / 2 - note.offsetLeft;
      const dy = height * .46 - note.offsetTop;
      animations.push(note.animate([
        { transform, opacity: 1 },
        { transform: `translate(-50%, -50%) translate(${dx}px, ${dy}px) rotate(28deg) scale(.12)`, opacity: 0 },
      ], { duration: gatherTime - 150, delay: Math.random() * 150, fill: "forwards", easing: "cubic-bezier(.52,.02,.77,.35)" }));
    }
    animations.push(paper.animate([
      { opacity: 0, transform: "translate(-50%, -50%) rotate(-14deg) scale(.72)" },
      { opacity: 1, transform: "translate(-50%, -50%) rotate(3deg) scale(1.08)", offset: .38 },
      { opacity: 1, transform: "translate(-50%, -50%) rotate(-5deg) scale(.92)", offset: .82 },
      { opacity: 0, transform: "translate(-50%, -50%) rotate(4deg) scale(1.3)" },
    ], { delay: gatherTime - 125, duration: burstTime - gatherTime + 210, fill: "both" }));

    const start = performance.now();
    const advance = (now) => {
      const previousTime = elapsed;
      elapsed = Math.max(0, Math.min(finishTime, now - start));
      if (previousTime < burstTime && elapsed >= burstTime && elapsed < burstTime + 180) playSound("pop");
      if (elapsed < formTime || previousTime < formTime || elapsed > scatterTime) paint(elapsed);
      if (previousTime < formTime && elapsed >= formTime) back.hidden = false;
      if (previousTime < returnTime && elapsed >= returnTime && elapsed < finishTime) {
        returnNotes(noteLayer, elapsed - returnTime);
      }
      if (elapsed < finishTime) frame = requestAnimationFrame(advance);
      else onComplete();
    };
    frame = requestAnimationFrame(advance);
  }

  function redraw() {
    if (!container.hidden) paint(elapsed);
  }

  return { play, reset, redraw };
}

function createPaperAudio(player) {
  const startingVolume = .025;
  const musicVolume = .55;
  const fadeDuration = 1600;
  let context;
  let musicGain;
  let fadeFrame;
  let fadeStarted = false;
  let elementVolume = false;
  let canRouteMusic = false;

  function prepareMusic(source) {
    try {
      const url = new URL(source, document.baseURI);
      canRouteMusic = /^https?:$/.test(url.protocol) && url.origin === location.origin;
    } catch {
      canRouteMusic = false;
    }
    try {
      player.volume = startingVolume;
      elementVolume = Math.abs(player.volume - startingVolume) < .001;
    } catch {
      elementVolume = false;
    }
  }

  function rampMusicGain() {
    const start = context.currentTime;
    musicGain.gain.cancelScheduledValues(start);
    musicGain.gain.setValueAtTime(startingVolume, start);
    musicGain.gain.linearRampToValueAtTime(musicVolume, start + fadeDuration / 1000);
  }

  function connectMusicOutput() {
    if (elementVolume || !canRouteMusic || musicGain || context.state !== "running") return;
    const gain = context.createGain();
    gain.gain.value = startingVolume;
    const source = context.createMediaElementSource(player);
    source.connect(gain);
    gain.connect(context.destination);
    musicGain = gain;
    if (fadeStarted && !player.paused) rampMusicGain();
  }

  function unlock(fromGesture = false) {
    const Audio = window.AudioContext ?? window.webkitAudioContext;
    if (!Audio) return;
    try {
      context ??= new Audio();
      if (context.state === "suspended" && fromGesture) {
        context.resume().then(connectMusicOutput).catch(() => {});
      } else {
        connectMusicOutput();
      }
    } catch {
      // The music and animation can continue without the optional cues.
    }
  }

  function musicPlaying() {
    unlock();
    if (fadeStarted) return;
    fadeStarted = true;
    if (musicGain) {
      rampMusicGain();
    } else if (elementVolume) {
      const start = performance.now();
      const advance = (now) => {
        const progress = Math.max(0, Math.min(1, (now - start) / fadeDuration));
        player.volume = startingVolume + (musicVolume - startingVolume) * progress ** 1.35;
        if (progress < 1) fadeFrame = requestAnimationFrame(advance);
      };
      fadeFrame = requestAnimationFrame(advance);
    }
  }

  function resetMusicFade() {
    fadeStarted = false;
    cancelAnimationFrame(fadeFrame);
    if (elementVolume) player.volume = startingVolume;
    if (musicGain) {
      const now = context.currentTime;
      musicGain.gain.cancelScheduledValues(now);
      musicGain.gain.setValueAtTime(startingVolume, now);
    }
  }

  function playCue(cue) {
    if (context?.state !== "running" || player.paused || player.muted || player.ended ||
        player.readyState < HTMLMediaElement.HAVE_FUTURE_DATA || !player.volume) return;
    const level = musicGain?.gain.value ?? (elementVolume ? player.volume : musicVolume);
    const now = context.currentTime;
    const envelope = context.createGain();
    envelope.connect(context.destination);
    envelope.gain.setValueAtTime(.001, now);

    if (cue === "paper") {
      const seconds = .19;
      const noise = context.createBuffer(1, Math.ceil(context.sampleRate * seconds), context.sampleRate);
      const samples = noise.getChannelData(0);
      for (let index = 0; index < samples.length; index++) {
        samples[index] = (2 * Math.random() - 1) * (.65 + .35 * Math.sin(index / 69));
      }
      const source = context.createBufferSource();
      source.buffer = noise;
      const filter = context.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(1680, now);
      filter.frequency.exponentialRampToValueAtTime(970, now + seconds);
      source.connect(filter);
      filter.connect(envelope);
      envelope.gain.linearRampToValueAtTime(.21 * level, now + .035);
      envelope.gain.exponentialRampToValueAtTime(.001, now + seconds);
      source.onended = () => envelope.disconnect();
      source.start(now);
      return;
    }

    const pop = context.createOscillator();
    pop.type = "sine";
    pop.frequency.setValueAtTime(465, now);
    pop.frequency.exponentialRampToValueAtTime(164, now + .135);
    pop.connect(envelope);
    envelope.gain.linearRampToValueAtTime(.23 * level, now + .013);
    envelope.gain.exponentialRampToValueAtTime(.001, now + .145);
    pop.onended = () => envelope.disconnect();
    pop.start(now);
    pop.stop(now + .15);
  }

  return { prepareMusic, musicPlaying, resetMusicFade, unlock, playCue };
}
