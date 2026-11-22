"use strict";

function createPaperOpening(canvas) {
  const context = canvas.getContext("2d");
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const colors = ["#bd495b", "#e87872", "#dd9d45", "#648bab", "#7b9a82", "#a98aae"];
  const duration = 1430;
  const gatherAt = 875;
  let frame;

  function makeBurst(count) {
    return Array.from({ length: count }, (_, index) => {
      const angle = (index + Math.random()) / count * Math.PI * 2;
      const x = Math.cos(angle);
      const y = Math.sin(angle);
      const radius = index % 6 === 0 ? .08 + .37 * Math.random() : .2 + .79 * Math.sqrt(Math.random());
      const distance = radius / Math.max(Math.abs(x), Math.abs(y));
      const ribbon = index % 5 === 0;
      return {
        x: x * distance,
        y: y * distance,
        delay: Math.random() * 80,
        ribbon,
        tile: index % 12 === 0 ? index / 12 : -1,
        length: ribbon ? 9 + Math.random() * 11 : 3.2 + Math.random() * 5,
        width: ribbon ? 2.2 + Math.random() * 2.3 : 2.6 + Math.random() * 4,
        tilt: Math.random() * Math.PI * 2,
        phase: Math.random() * Math.PI * 2,
        color: colors[Math.floor(Math.random() * colors.length)],
      };
    });
  }

  function stop() {
    cancelAnimationFrame(frame);
    canvas.hidden = true;
  }

  function paintPaper(paper, progress) {
    const opacity = Math.max(0, (progress - .53) / .47);
    if (!opacity) return;
    const { x, y, width, height, tilt, color } = paper;
    context.save();
    context.translate(x, y);
    context.rotate(tilt);
    context.globalAlpha = opacity;
    context.beginPath();
    if (context.roundRect) context.roundRect(-width / 2, -height / 2, width, height, [4, 6, 9, 5]);
    else context.rect(-width / 2, -height / 2, width, height);
    context.fillStyle = color;
    context.shadowColor = "#69462437";
    context.shadowBlur = 6;
    context.shadowOffsetY = 3;
    context.fill();
    context.shadowColor = "transparent";
    context.strokeStyle = "#71512b2b";
    context.lineWidth = 1;
    context.stroke();
    context.beginPath();
    context.strokeStyle = "#304d660d";
    for (let line = -height / 2 + 14; line < height / 2; line += 14) {
      context.moveTo(-width / 2 + 2, line);
      context.lineTo(width / 2 - 2, line);
    }
    context.stroke();
    context.fillStyle = "#dfb96cac";
    context.fillRect(-20, -height / 2 - 4, 40, 8);
    context.restore();
  }

  function play(noteLayer, getFirstPaper, onComplete) {
    stop();
    if (reducedMotion.matches || !context) {
      onComplete(false);
      return;
    }

    canvas.hidden = false;
    const pieces = makeBurst(canvas.clientWidth < 600 ? 190 : 270);
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const start = performance.now();

    const advance = (now) => {
      const elapsed = now - start;
      if (elapsed >= duration) {
        stop();
        onComplete(true);
        return;
      }
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      const density = Math.min(devicePixelRatio || 1, 2);
      const scale = Math.min(Math.max(width / 385, .72), 1.32);
      if (canvas.width !== Math.round(width * density) || canvas.height !== Math.round(height * density)) {
        canvas.width = Math.round(width * density);
        canvas.height = Math.round(height * density);
      }
      context.setTransform(density, 0, 0, density, 0, 0);
      context.clearRect(0, 0, width, height);
      context.lineCap = "round";
      const progress = Math.max(0, (elapsed - gatherAt) / (duration - gatherAt));
      const gather = progress * progress * (3 - 2 * progress);
      let paper;
      if (progress > 0) {
        const box = noteLayer.getBoundingClientRect();
        const first = getFirstPaper();
        paper = {
          x: box.left + box.width / 2,
          y: box.top + box.height / 2,
          width: Math.max(first.width, Math.min(box.width * .55, 13.5 * rem)),
          height: Math.max(first.height, 6.15 * rem),
          tilt: first.tilt * Math.PI / 180,
          color: first.color,
        };
        paintPaper(paper, progress);
      }
      for (const piece of pieces) {
        const t = (elapsed - piece.delay) / 1000;
        if (t <= 0) continue;
        const spread = 1 - (1 - Math.min(1, t / .75)) ** 2.4;
        const drift = Math.max(0, t - .35);
        let x = width / 2 + piece.x * (width / 2 - 6) * spread + Math.sin(t * 8 + piece.phase) * 18 * drift;
        let y = height / 2 + piece.y * (height / 2 - 6) * spread + height * .16 * drift ** 2;
        let opacity = Math.min(1, (duration - elapsed) / 420);
        if (paper && piece.tile >= 0) {
          const tileX = ((piece.tile % 6) / 5 - .5) * paper.width * .83;
          const tileY = ((Math.floor(piece.tile / 6) % 4) / 3 - .5) * paper.height * .78;
          const targetX = paper.x + tileX * Math.cos(paper.tilt) - tileY * Math.sin(paper.tilt);
          const targetY = paper.y + tileX * Math.sin(paper.tilt) + tileY * Math.cos(paper.tilt);
          x += (targetX - x) * gather;
          y += (targetY - y) * gather;
          opacity = Math.min(1, (1 - progress) / .27);
        }
        const twist = Math.sin(piece.phase + t * 10);
        const length = piece.length * scale * Math.min(1, t * 12);
        const thickness = Math.max(1, piece.width * scale * (.4 + .6 * Math.abs(twist)));
        context.save();
        context.translate(x, y);
        context.rotate(piece.tilt + t * (piece.x > 0 ? 4 : -4) + twist * .3);
        context.globalAlpha = Math.min(1, t * 18) * opacity;
        if (piece.ribbon) {
          context.strokeStyle = piece.color;
          context.lineWidth = thickness;
          context.beginPath();
          context.moveTo(-length / 2, 0);
          context.bezierCurveTo(-length / 4, 5 * scale * twist, length / 4, -5 * scale * twist, length / 2, 0);
          context.stroke();
        } else {
          context.fillStyle = piece.color;
          context.fillRect(-length / 2, -thickness / 2, length, thickness);
        }
        context.restore();
      }
      frame = requestAnimationFrame(advance);
    };
    frame = requestAnimationFrame(advance);
  }

  return { play, stop };
}
