// ==UserScript==
// @name         Pixmap Area Downloader
// @namespace    http://tampermonkey.net/
// @version      1.4
// @description  Download an area from Pixmap.fun
// @author       Demz and Bauti
// @match        *://pixmap.fun/*
// @grant        GM_addStyle
// @grant        GM_download
// @icon         https://media.discordapp.net/attachments/1412815236486139996/1412815236737531986/Pixmap_logo_2025_DC.png?ex=68cec239&is=68cd70b9&hm=093395e81a766687f347c082c623217bd321e3c777f72ec24274516fee609563
// @updateURL    https://raw.githubusercontent.com/Demz18/Pixmap-Area-Download/main/dist/main.user.js
// @downloadURL  https://raw.githubusercontent.com/Demz18/Pixmap-Area-Download/main/dist/main.user.js

// ==/UserScript==

(function() {
  'use strict';

  const PPFUN_URL = "https://pixmap.fun";
  const CANVASES_URL = "https://raw.githubusercontent.com/CodeToucher/motherfuckingcanvasjsonfuckupixmapformakingmedothisinsteadofu/refs/heads/main/canvases.json";

  // ---- Style helper ----
  function addStyles(css) {
    try {
      if (typeof GM_addStyle === 'function') return GM_addStyle(css);
    } catch (e) {}
    const s = document.createElement('style');
    s.textContent = css;
    document.head.appendChild(s);
  }

  // ---- Styles ----
  addStyles(`
    #areaDownloader {
      position: fixed;
      top: 40px;
      left: 260px;
      width: 320px;
      background: linear-gradient(135deg, #3a8dff, #0052d4);
      border-radius: 14px;
      box-shadow: 0 6px 20px rgba(0,0,0,.35);
      color: #fff;
      font-family: 'Segoe UI', Arial, sans-serif;
      font-size: 14px;
      z-index: 99999;
    }
    #dragHeader {
      cursor: move;
      background: rgba(0,0,0,0.2);
      padding: 10px;
      border-radius: 14px 14px 0 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-weight: 700;
    }
    #collapseBtn {
      cursor: pointer;
      font-size: 18px;
      padding: 2px 6px;
      border-radius: 6px;
    }
    #menuContent { padding: 14px; }
    .mainInput, .selectCanvas {
      width: 100%;
      margin: 6px 0;
      padding: 10px;
      border-radius: 8px;
      border: none;
      font-size: 14px;
      background: #233b90;
      color: #fff;
      box-sizing: border-box;
    }
    .mainBtn {
      width: 100%;
      margin-top: 10px;
      padding: 12px;
      border-radius: 8px;
      border: none;
      background: #0044cc;
      color: #fff;
      font-weight: bold;
      cursor: pointer;
      font-size: 15px;
    }
    .mainBtn:hover { background: #0056ff; }
    #progress {
      width: 100%;
      margin-top: 12px;
      height: 18px;
      background: #ddd;
      border-radius: 10px;
      overflow: hidden;
    }
    #progressBar {
      width: 0%;
      height: 100%;
      background: #27ae60;
      text-align: center;
      color: #fff;
      font-size: 12px;
      line-height: 18px;
      transition: width 0.2s;
    }
    #status { text-align: center; margin-top: 8px; font-size: 13px; min-height: 18px; }
    #previewContainer { text-align: center; margin-top: 12px; }
    #previewCanvas {
      display: block;
      max-width: 100%;
      border: 1px solid rgba(255,255,255,0.2);
      border-radius: 6px;
      background: #111;
      margin: auto;
    }
    #saveBtn {
      margin-top: 8px;
      width: 100%;
      padding: 10px;
      border-radius: 8px;
      border: none;
      background: #27ae60;
      color: #fff;
      font-weight: bold;
      cursor: pointer;
      font-size: 15px;
      display: none;
    }
    .footerLabel {
        margin-top:10px;
        font-size:14px;
        color:#d0d0d0;
    }
  `);

  // ---- UI ----
  const ui = document.createElement("div");
  ui.id = "areaDownloader";
  ui.innerHTML = `
    <div id="dragHeader">
      <span>📥 Area Downloader</span>
      <span id="collapseBtn">➖</span>
    </div>
    <div id="menuContent">
      <input type="text" id="coordStart" class="mainInput" placeholder="Start Coord (X_Y) e.g. -11601_6079">
      <input type="text" id="coordEnd" class="mainInput" placeholder="End Coord (X_Y) e.g. -10792_8622">
      <select class="selectCanvas" id="canvasSelect">
          <option value="0">🌍 Earth</option>
          <option value="1">🌙 Moon</option>
          <option value="17">🗺️ MiniMap</option>
      </select>
      <button id="downloadBtn" class="mainBtn">Download Area</button>
      <div id="progress"><div id="progressBar">0%</div></div>
      <div id="status"></div>
      <div id="previewContainer">
        <canvas id="previewCanvas"></canvas>
        <button id="saveBtn">Download PNG</button>
      </div>
	  <div class="footerLabel">Made By demz and bauti</div>
    </div>
  `;
  document.body.appendChild(ui);

  // ---- Refs ----
  const header = ui.querySelector("#dragHeader");
  const collapseBtn = ui.querySelector("#collapseBtn");
  const menuContent = ui.querySelector("#menuContent");
  const inputStart = ui.querySelector("#coordStart");
  const inputEnd = ui.querySelector("#coordEnd");
  const canvasSelect = ui.querySelector("#canvasSelect");
  const downloadBtn = ui.querySelector("#downloadBtn");
  const saveBtn = ui.querySelector("#saveBtn");
  const previewCanvas = ui.querySelector("#previewCanvas");
  const progressBar = ui.querySelector("#progressBar");
  const statusEl = ui.querySelector("#status");

  // ---- Collapse ----
  collapseBtn.addEventListener("click", () => {
    if (menuContent.style.display === "none") {
      menuContent.style.display = "block";
      collapseBtn.textContent = "➖";
    } else {
      menuContent.style.display = "none";
      collapseBtn.textContent = "➕";
    }
  });

  // ---- Draggable ----
  (function makeDraggable(target, handle) {
    let offsetX = 0, offsetY = 0, dragging = false;
    handle.addEventListener("mousedown", (e) => {
      dragging = true;
      offsetX = e.clientX - target.offsetLeft;
      offsetY = e.clientY - target.offsetTop;
      document.addEventListener("mousemove", move);
      document.addEventListener("mouseup", stop);
    });
    function move(e) {
      if (!dragging) return;
      target.style.left = (e.clientX - offsetX) + "px";
      target.style.top = (e.clientY - offsetY) + "px";
    }
    function stop() {
      dragging = false;
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", stop);
    }
  })(ui, header);

  // ---- Coord parsing (robust) ----
  // Accepts: "X_Y", "X,Y", "X Y", "X;Y" and negative numbers
  function parseCoords(start, end) {
    if (!start || !end) return { ok: false, msg: "Both coordinates required (format: X_Y). Example: -11601_6079" };

    const re = /(-?\d+)\s*[_,\s;]\s*(-?\d+)/;
    const ma = String(start).trim().match(re);
    const mb = String(end).trim().match(re);

    if (!ma || !mb) {
      return { ok: false, msg: "Coordinates must be in format X_Y (underscore, comma or space). Example: -11601_6079" };
    }

    const x1 = parseInt(ma[1], 10);
    const y1 = parseInt(ma[2], 10);
    const x2 = parseInt(mb[1], 10);
    const y2 = parseInt(mb[2], 10);

    if ([x1,y1,x2,y2].some(v => Number.isNaN(v))) {
      return { ok: false, msg: "Coordinates must contain valid integers." };
    }

    if (x2 < x1 || y2 < y1) {
      return { ok: false, msg: "End must be >= Start (X2>=X1 and Y2>=Y1)." };
    }

    return { ok: true, x1, y1, x2, y2, w: x2 - x1 + 1, h: y2 - y1 + 1 };
  }

  // ---- safe canvas lookup ----
  function findCanvasKey(canvasesObj, selectedVal) {
    // try exact match first (string)
    if (selectedVal in canvasesObj) return selectedVal;
    // try numeric string
    const numStr = String(Number(selectedVal));
    if (numStr in canvasesObj) return numStr;
    // try convert to number and find equal numeric key
    const keys = Object.keys(canvasesObj);
    // if selectedVal looks like index (0,1,2...), map to keys[index]
    const idx = Number(selectedVal);
    if (!Number.isNaN(idx) && Number.isInteger(idx) && keys[idx]) return keys[idx];
    // fallback: first key
    return keys.length ? keys[0] : null;
  }

  // ---- Download area ----
  async function downloadArea(parsedCoords) {
    statusEl.textContent = "Fetching canvas data...";
    downloadBtn.disabled = true;
    saveBtn.style.display = "none";
    progressBar.style.width = "0%";
    progressBar.textContent = "0%";

    try {
      const canvasesResp = await fetch(CANVASES_URL);
      if (!canvasesResp.ok) throw new Error("Failed to fetch canvases.json: HTTP " + canvasesResp.status);
      const canvases = await canvasesResp.json();

	  const selectedVal = canvasSelect.value;
      const canvas = canvases[selectedVal];
	  const canvasKey = selectedVal;


      const { x1, y1, x2, y2, w, h } = parsedCoords;
      // safety: avoid insane sizes
      if (w > 20000 || h > 20000) {
        statusEl.textContent = `Requested area too large: ${w}×${h}`;
        return;
      }

      statusEl.textContent = `Loading area ${w}×${h}...`;

      const offscreen = document.createElement("canvas");
      offscreen.width = w;
      offscreen.height = h;
      const ctx = offscreen.getContext("2d");
      const imgData = ctx.createImageData(w, h);

      const size = canvas.size;
      const canvasoffset = Math.sqrt(size);
      const offset = -canvasoffset * canvasoffset / 2;

      const xc1 = Math.floor((x1 - offset) / 256);
      const yc1 = Math.floor((y1 - offset) / 256);
      const xc2 = Math.floor((x2 - offset) / 256);
      const yc2 = Math.floor((y2 - offset) / 256);

      const totalTiles = (xc2 - xc1 + 1) * (yc2 - yc1 + 1);
      let loaded = 0;

      for (let iy = yc1; iy <= yc2; iy++) {
        for (let ix = xc1; ix <= xc2; ix++) {
          const url = `${PPFUN_URL}/chunks/${canvasKey}/${ix}/${iy}.bmp`;
          try {
            const resp = await fetch(url);
            const buf = await resp.arrayBuffer();
            if (buf.byteLength === 65536) {
              const arr = new Uint8Array(buf);
              for (let i = 0; i < arr.length; i++) {
                const tx = ix * 256 + (i % 256) + offset;
                const ty = iy * 256 + Math.floor(i / 256) + offset;
                if (tx >= x1 && tx <= x2 && ty >= y1 && ty <= y2) {
                  const px = tx - x1;
                  const py = ty - y1;
                  const idx = (py * w + px) * 4;
                  const color = canvas.colors[arr[i] & 0x7F] || [0, 0, 0, 0];
                  imgData.data[idx] = color[0];
                  imgData.data[idx + 1] = color[1];
                  imgData.data[idx + 2] = color[2];
                  imgData.data[idx + 3] = color[3] ?? 255;
                }
              }
            }
          } catch (err) {
            // ignore individual tile errors, but continue
          } finally {
            loaded++;
            const pct = Math.floor((loaded / totalTiles) * 100);
            progressBar.style.width = pct + "%";
            progressBar.textContent = pct + "%";
            statusEl.textContent = `Loading tiles ${loaded}/${totalTiles} (${pct}%)`;
          }
        }
      }

      ctx.putImageData(imgData, 0, 0);

      // show preview (scale down)
      const pctx = previewCanvas.getContext("2d");
      previewCanvas.width = Math.min(w, 300);
      previewCanvas.height = Math.min(h, 150);
      pctx.imageSmoothingEnabled = false;
      pctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
      pctx.drawImage(offscreen, 0, 0, previewCanvas.width, previewCanvas.height);

      saveBtn.style.display = "block";
      statusEl.textContent = `Done — ${w}×${h}`;

      saveBtn.onclick = () => {
        offscreen.toBlob((blob) => {
          const url = URL.createObjectURL(blob);
          try {
            if (typeof GM_download === 'function') {
              GM_download({ url, name: `area_${canvasKey}.png` });
            } else {
              const a = document.createElement('a');
              a.href = url;
              a.download = `area_${canvasKey}.png`;
              a.click();
            }
          } catch (e) {
            console.error(e);
          }
        }, "image/png");
      };

    } catch (err) {
      statusEl.textContent = "Error: " + (err && err.message ? err.message : String(err));
      console.error(err);
    } finally {
      downloadBtn.disabled = false;
    }
  }

  // ---- Button handler ----
  downloadBtn.addEventListener("click", () => {
    const s = inputStart.value;
    const e = inputEnd.value;
    const parsed = parseCoords(s, e);
    if (!parsed.ok) {
      statusEl.textContent = parsed.msg;
      return;
    }
    // call with parsed object
    downloadArea(parsed);
  });

})();
