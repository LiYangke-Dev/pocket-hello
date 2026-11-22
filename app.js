"use strict";

const { times, notes, letter, music, musicCredit, secretNote, featuredNotes = [] } = window.greetingCopy;
const noteLayer = document.querySelector("#notes");
const canvas = document.querySelector(".circuit");
const roundAction = document.querySelector("#round-action");
const actionIcon = document.querySelector("#action-icon");
const actionLabel = document.querySelector("#action-label");
const aboutAction = document.querySelector("#about-action");
const letterDialog = document.querySelector("#letter");
const letterPaper = letterDialog.querySelector(".letter-inner");
const letterBody = document.querySelector("#letter-body");
const musicAction = document.querySelector("#music-action");
const player = document.querySelector("#background-music");
const sticker = document.querySelector(".sticker");
const noteReader = document.querySelector("#note-reader");
const readerPaper = noteReader.querySelector(".reader-paper");
const readerMark = document.querySelector("#reader-mark");
const readerText = document.querySelector("#reader-text");
const readerClose = document.querySelector("#reader-close");
const readerPrev = document.querySelector("#reader-prev");
const readerNext = document.querySelector("#reader-next");
const flower = document.querySelector("#flower-trigger");
const showNotes = document.querySelector("#show-notes");
const opening = createPaperOpening(document.querySelector(".opening-art"));
const finale = createFinale(document.querySelector("#finale"));
const paperAudio = createPaperAudio(player);
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");

const revealTime = 7200;
const firstNoteTime = 740;
const firstNoteLead = 160;
const pauseBeforeFinale = 1350;
const pauseAfterReading = 2000;
const papers = [
  ["#fff0c9", "#94611d", "✦"],
  ["#f5ccd0", "#a4384f", "✿"],
  ["#f9e5ad", "#936127", "✧"],
  ["#d5e5f3", "#376784", "✦"],
  ["#fff7e8", "#ab484d", "✿"],
  ["#d9e7d8", "#3b705d", "✧"],
  ["#e4ddf1", "#73528d", "✦"],
];
const accentPapers = [
  ["#ffe3a1", "#94611d", "✦"],
  ["#ffc1c3", "#a4384f", "✿"],
  ["#d7ecb6", "#536d39", "✧"],
  ["#c7e9f8", "#376784", "✦"],
];

let previous = new Set();
let round = [];
let slots = [];
let timer;
let nextRevealAt;
let firstFlight;
let shown = 0;
let playing = false;
let finalePending = false;
let earliestFinaleAt = 0;
let readerSource;
let readerMotion;
let readerClosing = false;
let readerSwitching = false;
let readerDrag;

function shuffled(items) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index--) {
    const target = Math.floor(Math.random() * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

function prepareRound(width, height) {
  const hour = new Date().getHours();
  const opening = times.find(({ before }) => hour < before)?.text;
  const first = opening && !previous.has(opening) ? opening : undefined;
  const featured = shuffled([...new Set(featuredNotes.filter(Boolean))]).filter((text) => text !== first);
  const featuredSet = new Set(featured);
  const regular = shuffled([...new Set(notes.filter(Boolean))]).filter((text) => text !== first && !featuredSet.has(text));
  const count = Math.min(roundSize(width, height), regular.length + featured.length + Number(Boolean(first)));
  const positions = layoutNotes(width, height, count);
  const preferFresh = (items) => items.sort((a, b) => Number(previous.has(a)) - Number(previous.has(b)));
  preferFresh(featured);
  preferFresh(regular);
  const accentCount = positions.filter((slot) => slot.accent).length;
  const reserved = new Set(featured.slice(0, accentCount));
  const ordinary = [...regular, ...featured.slice(accentCount)];
  let featuredIndex = 0;
  let ordinaryIndex = 0;
  const selection = positions.map((slot, index) => {
    if (index === 0 && first) return first;
    if (slot.accent && featuredIndex < reserved.size) return featured[featuredIndex++];
    return ordinary[ordinaryIndex++];
  });
  previous = new Set(selection);
  const colors = papers.slice(1);
  const palette = [papers[0]];
  while (palette.length < count) palette.push(...shuffled(colors));
  return {
    positions,
    greetings: selection.map((text, index) => ({ text, paper: palette[index], featured: reserved.has(text) })),
  };
}

function roundSize(width, height) {
  if (width >= 630) return height >= 460 ? 108 : 72;
  if (width < 330) return height < 440 ? 54 : 63;
  if (height < 455) return 66;
  return height > 650 ? 87 : 78;
}

function layoutNotes(width, height, count) {
  if (!count) return [];
  const columns = Math.max(3, Math.ceil(width / (width < 630 ? 66 : 93)));
  const rows = Math.ceil(count / columns);
  const padding = width < 630 ? 8 : 14;
  const cellWidth = (width - padding * 2) / columns;
  const cellHeight = (height - padding * 2) / rows;
  const positions = [];

  // Scatter one center within each area to fill the board evenly. Neither the
  // individual coordinates nor the order in which they appear are fixed.
  const areas = shuffled(Array.from({ length: rows * columns }, (_, index) => index)).slice(0, count);
  for (const area of areas) {
    const column = area % columns;
    const row = Math.floor(area / columns);
    const tilt = (Math.random() - .5) * 27;
    const paperWidth = cellWidth * (1.08 + Math.random() * .22);
    const paperHeight = Math.min(104, cellHeight * (.95 + Math.random() * .26));
    const radians = Math.abs(tilt) * Math.PI / 180;
    const extentX = (paperWidth * Math.cos(radians) + paperHeight * Math.sin(radians)) / 2;
    const extentY = (paperWidth * Math.sin(radians) + paperHeight * Math.cos(radians)) / 2;
    const nominalX = padding + (column + .5 + (Math.random() - .5) * .4) * cellWidth;
    const nominalY = padding + (row + .5 + (Math.random() - .5) * .53) * cellHeight;
    const x = Math.max(extentX + 5, Math.min(width - extentX - 5, nominalX));
    const y = Math.max(extentY + 6, Math.min(height - extentY - 6, nominalY));
    positions.push({ x, y, tilt, width: paperWidth, height: paperHeight });
  }

  // Keep a tappable patch around every center clear of neighboring papers.
  // Measure the clearance in each paper's rotated coordinates.
  for (const position of positions) {
    const radians = position.tilt * Math.PI / 180;
    const cosine = Math.cos(radians);
    const sine = Math.sin(radians);
    for (const neighbor of positions) {
      if (position === neighbor) continue;
      const dx = neighbor.x - position.x;
      const dy = neighbor.y - position.y;
      const localX = Math.abs(dx * cosine + dy * sine);
      const localY = Math.abs(dy * cosine - dx * sine);
      const widthLimit = (localX - 10) * 2;
      const heightLimit = (localY - 10) * 2;
      if (widthLimit >= position.width || heightLimit >= position.height) continue;
      if (widthLimit / position.width > heightLimit / position.height) {
        position.width = widthLimit;
      } else {
        position.height = heightLimit;
      }
    }
  }

  const distance = ({ x, y }) => Math.hypot((x - width / 2) / width, (y - height / 2) / height);
  positions.sort((a, b) => distance(a) - distance(b));
  accentNotes(positions, width, height);
  return [positions[0], ...shuffled(positions.slice(1))];
}

function accentNotes(positions, boardWidth, boardHeight) {
  const bandCount = boardWidth < 330 ? 3 : 4;
  const candidates = positions.slice(1).map((position) => {
    const { x, y, tilt, width, height } = position;
    const radians = tilt * Math.PI / 180;
    const cosine = Math.cos(radians);
    const sine = Math.sin(radians);
    const extentX = (width * cosine + height * Math.abs(sine)) / 2;
    const extentY = (width * Math.abs(sine) + height * cosine) / 2;
    let scale = Math.min(1.48, (Math.min(x, boardWidth - x) - 5) / extentX,
      (Math.min(y, boardHeight - y) - 6) / extentY);
    for (const neighbor of positions) {
      if (neighbor === position) continue;
      const dx = neighbor.x - x;
      const dy = neighbor.y - y;
      const localX = Math.abs(dx * cosine + dy * sine);
      const localY = Math.abs(dy * cosine - dx * sine);
      scale = Math.min(scale, Math.max((localX - 10) * 2 / width, (localY - 10) * 2 / height));
    }
    return { position, scale, score: width * height * scale ** 2 * (1 + Math.random() * .16) };
  });

  for (let band = 0; band < bandCount; band++) {
    const choices = candidates.filter(({ position, scale }) => (
      Math.floor(position.y / boardHeight * bandCount) === band && scale >= 1.06
    ));
    const selected = choices.sort((a, b) => b.score - a.score)[0];
    if (!selected) continue;
    selected.position.width *= selected.scale;
    selected.position.height *= selected.scale;
    selected.position.accent = accentPapers[band];
  }
}

function placeNote(note, slot, paper) {
  const { x, y, tilt, width, height } = slot;
  const [color, ink, symbol] = slot.accent ?? paper;
  note.classList.toggle("is-accent", Boolean(slot.accent));
  note.style.setProperty("--paper", color);
  note.style.setProperty("--mark", ink);
  note.querySelector(".note-mark").textContent = symbol;
  note.style.left = x + "px";
  note.style.top = y + "px";
  note.style.width = width + "px";
  note.style.height = height + "px";
  note.style.setProperty("--tilt", tilt + "deg");
  note.style.setProperty("--tape-tilt", -tilt * .65 + "deg");
  note.style.setProperty("--from-x", ((slot.tilt / 14) * 12) + "px");
  note.style.setProperty("--from-y", "14px");
  if (note.classList.contains("is-first")) {
    note.style.setProperty("--opening-x", (noteLayer.clientWidth / 2 - x) + "px");
    note.style.setProperty("--opening-y", (noteLayer.clientHeight / 2 - y) + "px");
  }
  note.classList.toggle("is-small", width < 85 || height < 61);
  const availableHeight = Math.max(9, height - (note.classList.contains("is-small") ? 10 : 23));
  note.style.setProperty("--text-space", availableHeight + "px");
  note.style.removeProperty("--note-font");
  if (!slot.accent) return;
  const fontSize = Math.max(10, Math.min(15, width / 7.5, height / 4.7));
  note.style.setProperty("--note-font", fontSize + "px");
  const text = note.querySelector(".note-text");
  if (text.scrollHeight > availableHeight) {
    note.style.setProperty("--note-font", Math.max(9, fontSize * availableHeight / text.scrollHeight) + "px");
  }
}

function showNext(animate, assembled = false) {
  const note = document.createElement("button");
  note.type = "button";
  note.className = animate ? "note is-entering" : "note";
  const isFirst = animate && shown === 0;
  if (isFirst) note.classList.add("is-first");
  if (isFirst && assembled) {
    note.classList.remove("is-entering");
    note.classList.add("is-assembled");
  }
  note.style.setProperty("--note-order", shown + 1);

  const paper = document.createElement("span");
  paper.className = "paper";
  const mark = document.createElement("span");
  mark.className = "note-mark";
  mark.setAttribute("aria-hidden", "true");
  const message = document.createElement("span");
  message.className = "note-text";
  message.textContent = round[shown].text;

  paper.append(mark, message);
  note.append(paper);
  note.addEventListener("click", () => openNote(note));
  noteLayer.append(note);
  placeNote(note, slots[shown], round[shown].paper);
  if (isFirst) note.classList.add("is-opening-note");
  shown++;
  if (noteReader.open) updateReaderNavigation();
}

function endRound() {
  clearTimeout(timer);
  playing = false;
  actionIcon.textContent = "↻";
  actionLabel.textContent = "再来一屏";
  finalePending = true;
  scheduleFinale();
}

function scheduleFinale() {
  if (!finalePending) return;
  clearTimeout(timer);
  if (noteReader.open || letterDialog.open) return;
  const delay = Math.max(pauseBeforeFinale, earliestFinaleAt - performance.now());
  timer = setTimeout(beginFinale, delay);
}

function beginFinale() {
  if (noteReader.open || letterDialog.open) return;
  finalePending = false;
  if (noteLayer.contains(document.activeElement)) roundAction.focus();
  noteLayer.inert = true;
  noteLayer.classList.add("is-gathering");
  finale.play(noteLayer, restoreNotes, paperAudio.playCue);
}

function restoreNotes() {
  if (document.activeElement === showNotes) roundAction.focus({ preventScroll: true });
  finale.reset();
  noteLayer.inert = false;
  noteLayer.classList.remove("is-gathering");
}

function stopFirstFlight() {
  if (!firstFlight) return;
  for (const animation of firstFlight.animations) animation.cancel();
  firstFlight.ghost.remove();
  firstFlight.note.classList.remove("is-settling");
  firstFlight = undefined;
}

function settleFirstNote(note, animate) {
  const paper = note.querySelector(".paper");
  const start = note.getBoundingClientRect();
  const width = note.offsetWidth;
  const height = note.offsetHeight;
  note.classList.remove("is-opening-note", "is-assembled", "is-first", "is-entering");
  if (!animate || note.classList.contains("is-lifted")) return;

  const goal = note.getBoundingClientRect();
  const dx = start.left + start.width / 2 - goal.left - goal.width / 2;
  const dy = start.top + start.height / 2 - goal.top - goal.height / 2;
  const angle = parseFloat(note.style.getPropertyValue("--tilt")) * Math.PI / 180;
  const x = dx * Math.cos(angle) + dy * Math.sin(angle);
  const y = dy * Math.cos(angle) - dx * Math.sin(angle);
  const sx = note.offsetWidth / width;
  const sy = note.offsetHeight / height;
  const ghost = paper.cloneNode(true);
  ghost.classList.add("opening-paper-flight");
  ghost.setAttribute("aria-hidden", "true");
  ghost.style.width = width + "px";
  ghost.style.height = height + "px";
  ghost.querySelector(".note-mark").className = "opening-flight-mark";
  ghost.querySelector(".note-text").className = "opening-flight-text";
  note.classList.add("is-settling");
  note.append(ghost);

  const motion = ghost.animate([
    { transform: `translate(-50%, -50%) translate(${x}px, ${y}px)`, opacity: 1 },
    { transform: `translate(-50%, -50%) translate(${x * .38}px, ${y * .38 - 12}px) rotate(-5deg) scale(${.37 + sx * .63}, ${.37 + sy * .63})`, opacity: 1, offset: .52 },
    { transform: `translate(-50%, -50%) translate(0, -2px) scale(${sx * 1.06}, ${sy * 1.06})`, opacity: .82, offset: .79 },
    { transform: `translate(-50%, -50%) scale(${sx}, ${sy})`, opacity: 0 },
  ], { duration: 460, easing: "cubic-bezier(.35,.12,.29,1)", fill: "both" });
  const face = paper.animate([
    { transform: "translateY(-3px)", opacity: 0 },
    { transform: "translateY(-2px)", opacity: 0, offset: .63 },
    { transform: "translateY(1.5px)", opacity: 1, offset: .89 },
    { transform: "none", opacity: 1 },
  ], { duration: 460, easing: "cubic-bezier(.35,.12,.29,1)", fill: "both" });
  firstFlight = { note, ghost, animations: [motion, face] };
  motion.onfinish = () => { if (firstFlight?.ghost === ghost) stopFirstFlight(); };
}

function playNext(assembled = false) {
  const lead = reduceMotion.matches ? 0 : firstNoteLead;
  if (shown === 1 && noteLayer.firstElementChild.classList.contains("is-opening-note")) {
    settleFirstNote(noteLayer.firstElementChild, Boolean(lead));
    if (lead) {
      nextRevealAt += lead;
      timer = setTimeout(playNext, Math.max(16, nextRevealAt - performance.now()));
      return;
    }
  }
  showNext(true, assembled);
  if (shown < round.length) {
    const interval = shown === 1 ? firstNoteTime :
      (revealTime - firstNoteTime - lead) / (round.length - 2) * (.74 + Math.random() * .52);
    nextRevealAt += interval;
    timer = setTimeout(playNext, Math.max(16, nextRevealAt - performance.now()));
  } else {
    endRound();
  }
}

function startRound() {
  clearTimeout(timer);
  stopFirstFlight();
  finalePending = false;
  earliestFinaleAt = 0;
  restoreNotes();
  const width = noteLayer.clientWidth;
  const height = noteLayer.clientHeight;
  const { positions, greetings } = prepareRound(width, height);
  round = greetings;
  slots = positions;
  noteLayer.style.setProperty("--note-count", round.length);
  noteLayer.replaceChildren();
  shown = 0;
  playing = true;
  actionIcon.textContent = "⋯";
  actionLabel.textContent = "直接看完";
  if (!round.length) {
    playing = false;
    actionIcon.textContent = "↻";
    actionLabel.textContent = "再来一屏";
    return;
  }
  opening.play(noteLayer, () => ({ ...slots[0], color: round[0].paper[0] }), (assembled) => {
    nextRevealAt = performance.now();
    playNext(assembled);
  });
}

roundAction.addEventListener("click", () => {
  if (!playing) {
    startRound();
    return;
  }
  clearTimeout(timer);
  opening.stop();
  stopFirstFlight();
  for (const note of noteLayer.children) note.classList.remove("is-entering", "is-first", "is-opening-note", "is-assembled");
  while (shown < round.length) showNext(false);
  endRound();
});

showNotes.addEventListener("click", () => {
  restoreNotes();
  roundAction.focus({ preventScroll: true });
});

function noteOrigin(source) {
  const noteBox = source.getBoundingClientRect();
  const readerBox = noteReader.getBoundingClientRect();
  const x = noteBox.left + noteBox.width / 2 - (readerBox.left + readerBox.width / 2);
  const y = noteBox.top + noteBox.height / 2 - (readerBox.top + readerBox.height / 2);
  const tilt = source.style.getPropertyValue("--tilt") || "-8deg";
  return `translate(${x}px, ${y}px) rotate(${tilt}) scale(${source.offsetWidth / readerBox.width}, ${source.offsetHeight / readerBox.height})`;
}

function openNote(note) {
  displayNote(note);
  showReader();
}

function displayNote(note) {
  if (firstFlight?.note === note) stopFirstFlight();
  note.classList.remove("is-entering");
  setReaderContent(note, note.querySelector(".note-text").textContent, note.querySelector(".note-mark").textContent,
    note.style.getPropertyValue("--paper"), note.style.getPropertyValue("--mark"), note.style.getPropertyValue("--tape-tilt"));
}

function setReaderContent(source, text, symbol, color, ink, tapeTilt) {
  readerSource = source;
  readerText.textContent = text;
  readerMark.textContent = symbol;
  readerPaper.style.setProperty("--paper", color);
  readerPaper.style.setProperty("--mark", ink);
  readerPaper.style.setProperty("--tape-tilt", tapeTilt);
  source.classList.add("is-lifted");
  updateReaderNavigation();
}

function showReader() {
  noteReader.showModal();
  scheduleFinale();
  if (!reduceMotion.matches) {
    readerMotion = readerPaper.animate([
      { transform: noteOrigin(readerSource) },
      { transform: "none" },
    ], { duration: 330, easing: "cubic-bezier(.2,.8,.25,1)" });
  }
}

function updateReaderNavigation() {
  const onWall = readerSource?.parentElement === noteLayer;
  readerPaper.classList.toggle("can-swipe", onWall);
  readerPrev.hidden = !onWall;
  readerNext.hidden = !onWall;
  readerPrev.disabled = !onWall || !readerSource.previousElementSibling;
  readerNext.disabled = !onWall || !readerSource.nextElementSibling;
}

function returnReaderSource() {
  readerSource?.classList.remove("is-lifted");
  if (readerSource?.parentElement === noteLayer) readerSource.classList.add("is-read");
}

function moveReader(direction) {
  if (readerClosing || readerSwitching || readerSource?.parentElement !== noteLayer) return false;
  const target = direction < 0 ? readerSource.previousElementSibling : readerSource.nextElementSibling;
  if (!target) return false;

  const switchNote = () => {
    returnReaderSource();
    displayNote(target);
  };
  if (reduceMotion.matches) {
    switchNote();
    return true;
  }

  readerSwitching = true;
  const transform = getComputedStyle(readerPaper).transform;
  readerMotion?.cancel();
  readerPaper.style.removeProperty("transform");
  readerMotion = readerPaper.animate([
    { transform, opacity: 1 },
    { transform: `translateX(${-direction * 65}px) rotate(${-direction * 5}deg)`, opacity: 0 },
  ], { duration: 120, easing: "ease-in", fill: "forwards" });
  readerMotion.onfinish = () => {
    readerMotion.cancel();
    switchNote();
    readerMotion = readerPaper.animate([
      { transform: `translateX(${direction * 58}px) rotate(${direction * 4}deg)`, opacity: 0 },
      { transform: "none", opacity: 1 },
    ], { duration: 215, easing: "ease-out" });
    readerMotion.onfinish = () => { readerSwitching = false; };
  };
  return true;
}

function finishReaderSwipe(event) {
  if (event.type === "lostpointercapture" && event.target !== readerPaper) return;
  if (readerDrag?.id !== event.pointerId) return;
  const { horizontal, x } = readerDrag;
  readerDrag = undefined;
  if (!horizontal) return;
  const distance = event.clientX - x;
  if (event.type === "pointerup" && Math.abs(distance) >= 42 && moveReader(distance < 0 ? 1 : -1)) return;
  const transform = getComputedStyle(readerPaper).transform;
  readerPaper.style.removeProperty("transform");
  if (transform !== "none") {
    readerMotion = readerPaper.animate([{ transform }, { transform: "none" }],
      { duration: 175, easing: "ease-out" });
  }
}

readerPaper.addEventListener("pointerdown", (event) => {
  if (event.button !== 0 || !event.isPrimary || event.target.closest("button") ||
      readerClosing || readerSwitching || readerSource?.parentElement !== noteLayer) return;
  readerDrag = { id: event.pointerId, x: event.clientX, y: event.clientY, horizontal: false };
});
readerPaper.addEventListener("pointermove", (event) => {
  if (readerDrag?.id !== event.pointerId) return;
  const dx = event.clientX - readerDrag.x;
  const dy = event.clientY - readerDrag.y;
  if (!readerDrag.horizontal) {
    if (Math.abs(dx) < 10 || Math.abs(dx) <= Math.abs(dy) * 1.25) return;
    readerDrag.horizontal = true;
    readerMotion?.cancel();
    readerPaper.setPointerCapture(event.pointerId);
  }
  if (!reduceMotion.matches) {
    const shift = Math.max(-85, Math.min(85, dx * .48));
    readerPaper.style.transform = `translateX(${shift}px) rotate(${shift / 22}deg)`;
  }
});
for (const event of ["pointerup", "pointercancel", "lostpointercapture"]) {
  readerPaper.addEventListener(event, finishReaderSwipe);
}
readerPaper.addEventListener("pointerleave", () => {
  if (!readerDrag?.horizontal) readerDrag = undefined;
});

function closeNote() {
  if (readerClosing) return;
  if (reduceMotion.matches || !readerSource?.isConnected) {
    noteReader.close();
    return;
  }
  readerClosing = true;
  const transform = getComputedStyle(readerPaper).transform;
  readerDrag = undefined;
  readerPaper.style.removeProperty("transform");
  readerMotion?.cancel();
  readerMotion = readerPaper.animate([
    { transform },
    { transform: noteOrigin(readerSource) },
  ], { duration: 240, easing: "cubic-bezier(.5,.05,.82,.42)", fill: "forwards" });
  readerMotion.onfinish = () => noteReader.close();
}

readerClose.addEventListener("click", closeNote);
readerPrev.addEventListener("click", () => moveReader(-1));
readerNext.addEventListener("click", () => moveReader(1));
flower.addEventListener("click", () => {
  setReaderContent(flower, secretNote, "✿", "#ffcbd0", "#a4384f", "-8deg");
  showReader();
});
noteReader.addEventListener("click", (event) => {
  if (event.target === noteReader) closeNote();
});
noteReader.addEventListener("cancel", (event) => {
  event.preventDefault();
  closeNote();
});
noteReader.addEventListener("keydown", (event) => {
  const direction = event.key === "ArrowLeft" ? -1 : event.key === "ArrowRight" ? 1 : 0;
  if (direction && moveReader(direction)) event.preventDefault();
});
noteReader.addEventListener("close", () => {
  readerMotion?.cancel();
  readerMotion = undefined;
  readerClosing = false;
  readerSwitching = false;
  readerDrag = undefined;
  readerPaper.style.removeProperty("transform");
  if (readerSource?.parentElement === noteLayer) earliestFinaleAt = performance.now() + pauseAfterReading;
  returnReaderSource();
  readerSource?.focus({ preventScroll: true });
  readerSource = undefined;
  scheduleFinale();
});

function drawCircuit(width, height) {
  const density = window.devicePixelRatio || 1;
  canvas.width = Math.round(width * density);
  canvas.height = Math.round(height * density);
  const context = canvas.getContext("2d");
  context.scale(density, density);
  context.lineWidth = 1;
  context.strokeStyle = "#a47b4942";

  const routes = [
    [[15, 59], [33, 59], [57, 35], [94, 35]],
    [[15, 75], [41, 75], [66, 50], [110, 50], [126, 34]],
    [[43, 94], [62, 94], [82, 74], [111, 74]],
  ];
  for (const [right, bottom] of [[false, false], [true, false], [false, true], [true, true]]) {
    const flipX = (x) => right ? width - x : x;
    const flipY = (y) => bottom ? height - y : y;
    for (const route of routes) {
      context.beginPath();
      context.moveTo(flipX(route[0][0]), flipY(route[0][1]));
      for (const [x, y] of route.slice(1)) context.lineTo(flipX(x), flipY(y));
      context.stroke();
      for (const [x, y] of [route[0], route.at(-1)]) {
        context.beginPath();
        context.arc(flipX(x), flipY(y), 3, 0, Math.PI * 2);
        context.stroke();
      }
    }
  }
}

for (const text of letter) {
  const paragraph = document.createElement("p");
  paragraph.textContent = text;
  letterBody.append(paragraph);
}
aboutAction.addEventListener("click", () => {
  letterDialog.showModal();
  scheduleFinale();
});

function closeLetter() {
  if (!letterDialog.open || letterDialog.classList.contains("is-closing")) return;
  if (reduceMotion.matches) {
    letterDialog.close();
    return;
  }
  const current = getComputedStyle(letterPaper);
  letterPaper.style.setProperty("--close-opacity", current.opacity);
  letterPaper.style.setProperty("--close-transform", current.transform);
  letterPaper.style.setProperty("--close-clip", current.clipPath === "none" ? "inset(-3rem round .65rem)" : current.clipPath);
  letterDialog.classList.add("is-closing");
  const animations = letterDialog.getAnimations({ subtree: true });
  Promise.allSettled(animations.map((animation) => animation.finished)).then(() => {
    if (letterDialog.classList.contains("is-closing")) letterDialog.close();
  });
}

letterDialog.addEventListener("submit", (event) => {
  event.preventDefault();
  closeLetter();
});
letterDialog.addEventListener("cancel", (event) => {
  event.preventDefault();
  closeLetter();
});
letterDialog.addEventListener("click", (event) => {
  if (event.target === letterDialog) closeLetter();
});
letterDialog.addEventListener("close", () => {
  letterDialog.classList.remove("is-closing");
  scheduleFinale();
});

function fillMusicSparks() {
  const layer = sticker.querySelector(".music-sparks");
  const colors = ["#dd9e3c", "#bf4e63", "#e57a79", "#688fab", "#82a074", "#a47ca9", "#edbd64"];
  const sparks = document.createDocumentFragment();
  for (let index = 0; index < 288; index++) {
    const spark = document.createElement("span");
    const angle = index * 2.39996 + Math.random() * .28;
    const radius = 20 + Math.random() * 25;
    const speed = 8 + Math.random() * 15;
    const duration = 1.65 + Math.random() * 1.25;
    const x = Math.cos(angle);
    const y = Math.sin(angle);
    const tile = index % 3 !== 0;
    const properties = {
      "--x": (54 + x * radius).toFixed(1) + "%",
      "--y": (52 + y * radius).toFixed(1) + "%",
      "--dx": (x * speed).toFixed(1) + "px",
      "--dy": (y * speed - 7).toFixed(1) + "px",
      "--size": (1.8 + Math.random() * 3).toFixed(1) + "px",
      "--shape": tile ? "1px" : "50%",
      "--ratio": tile ? "1.5" : "1",
      "--color": colors[index % colors.length],
      "--turn": (30 + Math.random() * 170).toFixed(0) + "deg",
      "--duration": duration.toFixed(2) + "s",
      "--delay": (-Math.random() * duration).toFixed(2) + "s",
    };
    for (const [name, value] of Object.entries(properties)) spark.style.setProperty(name, value);
    sparks.append(spark);
  }
  layer.replaceChildren(sparks);
}

function setupMusic() {
  if (!music) return;
  if (musicCredit) {
    const credit = document.querySelector("#music-credit");
    const source = credit.querySelector(".music-credit-source");
    const license = credit.querySelector(".music-credit-license");
    source.textContent = `《${musicCredit.title}》 ${musicCredit.artist}`;
    source.href = musicCredit.source;
    license.textContent = musicCredit.licenseName;
    license.href = musicCredit.license;
    credit.querySelector(".music-credit-change").textContent = musicCredit.change ? ` · ${musicCredit.change} · ` : " · ";
    credit.hidden = false;
  }
  musicAction.hidden = false;
  sticker.classList.add("has-music");
  fillMusicSparks();
  paperAudio.prepareMusic(music);
  const updateLabel = () => {
    const label = player.error ? "音乐暂不可用" : player.paused ? "播放音乐" : "暂停音乐";
    musicAction.setAttribute("aria-label", label);
    musicAction.title = label;
  };
  const playMusic = () => player.play().catch(updateLabel);
  player.addEventListener("play", updateLabel);
  player.addEventListener("pause", updateLabel);
  player.addEventListener("playing", () => {
    sticker.classList.add("is-playing");
    paperAudio.musicPlaying();
  });
  for (const event of ["pause", "waiting", "ended", "emptied", "error"]) {
    player.addEventListener(event, () => sticker.classList.remove("is-playing"));
  }
  for (const event of ["pause", "ended", "emptied", "error"]) {
    player.addEventListener(event, paperAudio.resetMusicFade);
  }
  player.addEventListener("error", () => {
    updateLabel();
    musicAction.disabled = true;
  });
  musicAction.addEventListener("click", () => {
    if (player.paused) {
      paperAudio.unlock(true);
      playMusic();
    }
    else player.pause();
  });
  // A browser that blocks autoplay may allow it on the first page interaction.
  document.addEventListener("click", (event) => {
    if (musicAction.contains(event.target) || player.error) return;
    paperAudio.unlock(true);
    if (player.paused) playMusic();
  }, { capture: true, once: true });
  player.src = music;
  playMusic();
}

let boardWidth = noteLayer.clientWidth;
let boardHeight = noteLayer.clientHeight;
drawCircuit(boardWidth, boardHeight);
startRound();
setupMusic();

new ResizeObserver(() => {
  const width = noteLayer.clientWidth;
  const height = noteLayer.clientHeight;
  if (width === boardWidth && height === boardHeight) return;
  boardWidth = width;
  boardHeight = height;
  drawCircuit(width, height);
  slots = layoutNotes(width, height, round.length);
  const spareAccents = slots.flatMap((slot, index) => slot.accent && !round[index].featured ? [index] : []);
  round.forEach((greeting, index) => {
    if (!greeting.featured || slots[index].accent || !spareAccents.length) return;
    const other = spareAccents.shift();
    [slots[index], slots[other]] = [slots[other], slots[index]];
  });
  [...noteLayer.children].forEach((note, index) => placeNote(note, slots[index], round[index].paper));
  finale.redraw();
}).observe(noteLayer);

window.addEventListener("pageshow", (event) => {
  if (event.persisted) {
    if (letterDialog.open) letterDialog.close();
    if (noteReader.open) noteReader.close();
    startRound();
  }
});
