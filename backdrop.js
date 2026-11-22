"use strict";

(() => {
  const canvas = document.querySelector(".outer-art");
  const board = document.querySelector(".board");
  const art = canvas.getContext("2d");
  if (!art) return;

  const routes = [
    [[0, -19], [28, -19], [44, -35], [68, -35]],
    [[0, -3], [43, -3], [64, -24], [94, -24]],
    [[0, 13], [27, 13], [43, 29], [67, 29]],
    [[0, 28], [16, 28], [35, 47], [52, 47]],
  ];

  function traces(x, y, direction, scale, opacity) {
    art.save();
    art.translate(x, y);
    art.scale(direction * scale, scale);
    art.globalAlpha = opacity;
    art.strokeStyle = "#a57939";
    art.lineWidth = 1;
    art.lineJoin = "round";
    for (const [start, ...points] of routes) {
      art.beginPath();
      art.moveTo(...start);
      for (const point of points) art.lineTo(...point);
      art.stroke();
      art.beginPath();
      art.arc(...points.at(-1), 2.6, 0, Math.PI * 2);
      art.stroke();
    }
    art.restore();
  }

  function petal(x, y, scale, rotation, opacity) {
    art.save();
    art.translate(x, y);
    art.rotate(rotation);
    art.scale(scale, scale);
    art.globalAlpha = opacity;
    art.beginPath();
    art.moveTo(0, 6);
    art.bezierCurveTo(-10, 1, -8, -9, -1, -6);
    art.bezierCurveTo(5, -12, 11, -3, 0, 6);
    art.fillStyle = "#cf747b";
    art.fill();
    art.restore();
  }

  function flower(x, y, scale, opacity) {
    art.save();
    art.translate(x, y);
    art.scale(scale, scale);
    for (let index = 0; index < 5; index++) {
      const angle = index * Math.PI * 2 / 5;
      petal(Math.sin(angle) * 9, -Math.cos(angle) * 9, 1, angle, opacity);
    }
    art.globalAlpha = opacity * 1.35;
    art.beginPath();
    art.arc(0, 0, 4, 0, Math.PI * 2);
    art.fillStyle = "#c89a52";
    art.fill();
    art.restore();
  }

  function draw() {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const density = Math.min(devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(width * density);
    canvas.height = Math.round(height * density);
    art.setTransform(density, 0, 0, density, 0, 0);
    const frame = board.getBoundingClientRect();
    const top = frame.top + scrollY;
    const bottom = frame.bottom + scrollY;

    if (frame.left > 100) {
      const gutter = frame.left;
      traces(0, top + frame.height * .2, 1, Math.min(2, gutter / 120), .37);
      traces(width, top + frame.height * .74, -1, Math.min(2, gutter / 120), .36);
      flower(frame.right + gutter * .55, top + frame.height * .12, 2.1, .22);
      petal(frame.right + gutter * .71, top + frame.height * .18, .94, -.55, .31);
      petal(frame.right + gutter * .48, top + frame.height * .22, .63, .49, .29);
      flower(gutter * .37, bottom - frame.height * .17, 1.7, .22);
      petal(gutter * .59, bottom - frame.height * .11, .82, .76, .31);
      petal(gutter * .25, bottom - frame.height * .09, .72, -.39, .25);
      return;
    }

    // Use the header and footer margins on narrow screens.
    traces(width, 15, -1, .78, .26);
    petal(width * .69, 16, .62, -.58, .33);
    petal(width * .74, 25, .45, .39, .31);
    flower(30, Math.min(height - 24, bottom + 31), .82, .3);
    petal(51, Math.min(height - 12, bottom + 49), .46, .72, .29);
    traces(width, height - 12, -1, .68, .3);
  }

  draw();
  const observer = new ResizeObserver(draw);
  observer.observe(document.body);
  observer.observe(board);
})();
