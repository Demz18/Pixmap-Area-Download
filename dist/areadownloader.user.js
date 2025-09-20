// ==UserScript==
// @name         Pixmap Area Downloader
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Download an area from Pixmap.fun
// @author       demz
// @match        *://pixmap.fun/*
// @grant        GM_download
// ==/UserScript==

(function() {
    'use strict';

    const PPFUN_URL = "https://pixmap.fun";
    const CANVASES_URL = "https://raw.githubusercontent.com/CodeToucher/motherfuckingcanvasjsonfuckupixmapformakingmedothisinsteadofu/refs/heads/main/canvases.json";

    // ---- Create main UI container ----
    const ui = document.createElement("div");
    ui.style.position = "fixed";
    ui.style.top = "30px";
    ui.style.left = "200px";
    ui.style.width = "380px";
    ui.style.zIndex = "99999";
    ui.style.background = "linear-gradient(135deg, #1abc9c, #16a085)";
    ui.style.borderRadius = "10px";
    ui.style.color = "#fff";
    ui.style.fontSize = "15px";
    ui.style.boxShadow = "0 6px 20px rgba(0,0,0,0.45)";
    ui.style.userSelect = "none";
    ui.style.minWidth = "280px";
    ui.style.maxWidth = "70%";

    ui.innerHTML = `
        <div id="dragHeader" style="cursor:move; background:rgba(0,0,0,0.22); padding:10px; border-radius:10px 10px 0 0; display:flex; justify-content:space-between; align-items:center; font-weight:700;">
            <span style="font-size:16px;">📥 Area Downloader</span>
            <span id="collapseBtn" style="cursor:pointer; font-size:18px; padding:4px 8px; border-radius:6px;">➖</span>
        </div>
        <div id="menuContent" style="padding:14px;">
            <label style="font-weight:600;">Start Coord (X_Y):</label><br>
            <input type="text" id="coordStart" placeholder="-100_200" style="width:100%; margin:8px 0; padding:9px; font-size:14px; border-radius:6px; border:none;"><br>
            <label style="font-weight:600;">End Coord (X_Y):</label><br>
            <input type="text" id="coordEnd" placeholder="-50_250" style="width:100%; margin:8px 0; padding:9px; font-size:14px; border-radius:6px; border:none;"><br>
            <button id="downloadBtn" style="width:100%; padding:12px; background:#236fa1; border:none; border-radius:8px; color:#fff; font-weight:800; cursor:pointer; font-size:15px;">
                Generate Image
            </button>
            <div id="status" style="margin-top:8px; font-size:13px; min-height:18px;"></div>
            <hr style="border:none; border-top:1px solid rgba(255,255,255,0.15); margin:12px 0;">
            <div id="previewContainer" style="text-align:center;">
                <p style="margin:8px 0 6px; font-weight:700;">Preview:</p>
                <div style="max-height:240px; overflow:auto; border-radius:6px; border:1px solid rgba(255,255,255,0.15); background:#222;">
                    <canvas id="previewCanvas" style="display:block; max-width:100%;"></canvas>
                </div>
                <button id="saveBtn" style="margin-top:10px; display:none; width:100%; padding:10px; background:#27ae60; border:none; border-radius:8px; color:#fff; font-weight:700; cursor:pointer; font-size:15px;">
                    Download PNG
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(ui);

    // ---- Collapsed icon ----
    const collapsedIcon = document.createElement("div");
    collapsedIcon.textContent = "📥";
    collapsedIcon.style.position = "fixed";
    collapsedIcon.style.top = ui.style.top;
    collapsedIcon.style.left = ui.style.left;
    collapsedIcon.style.width = "56px";
    collapsedIcon.style.height = "56px";
    collapsedIcon.style.background = "#1abc9c";
    collapsedIcon.style.borderRadius = "50%";
    collapsedIcon.style.color = "#fff";
    collapsedIcon.style.fontSize = "26px";
    collapsedIcon.style.display = "flex";
    collapsedIcon.style.alignItems = "center";
    collapsedIcon.style.justifyContent = "center";
    collapsedIcon.style.cursor = "pointer";
    collapsedIcon.style.boxShadow = "0 6px 20px rgba(0,0,0,0.45)";
    collapsedIcon.style.zIndex = "99999";
    collapsedIcon.style.display = "none";
    collapsedIcon.title = "Open Area Downloader";
    document.body.appendChild(collapsedIcon);

    const collapseBtn = ui.querySelector("#collapseBtn");
    const downloadBtn = ui.querySelector("#downloadBtn");
    const saveBtn = ui.querySelector("#saveBtn");
    const previewCanvas = ui.querySelector("#previewCanvas");
    const statusEl = ui.querySelector("#status");

    // ---- Collapse / Expand functions ----
    function collapseMenu() {
        collapsedIcon.style.top = ui.style.top;
        collapsedIcon.style.left = ui.style.left;
        ui.style.display = "none";
        collapsedIcon.style.display = "flex";
    }

    function expandMenu() {
        ui.style.top = collapsedIcon.style.top;
        ui.style.left = collapsedIcon.style.left;
        ui.style.display = "block";
        collapsedIcon.style.display = "none";
    }

    collapseBtn.addEventListener("click", () => {
        collapseMenu();
    });

    // --- Click vs Drag handling on collapsed icon ---
    let dragMoved = false;
    collapsedIcon.addEventListener("mousedown", () => {
        dragMoved = false;
    });
    collapsedIcon.addEventListener("mousemove", () => {
        dragMoved = true;
    });
    collapsedIcon.addEventListener("mouseup", () => {
        if (!dragMoved) {
            expandMenu();
        }
    });

    // ---- Draggable helper ----
    function makeDraggable(targetEl, handleEl, onMoveCallback) {
        handleEl.style.touchAction = "none";
        function getIntPx(v) { return parseInt(String(v || '0').replace('px',''), 10) || 0; }

        handleEl.addEventListener('mousedown', startDrag);
        handleEl.addEventListener('touchstart', startDrag, { passive: false });

        function startDrag(e) {
            e.preventDefault();
            const startX = e.touches ? e.touches[0].clientX : e.clientX;
            const startY = e.touches ? e.touches[0].clientY : e.clientY;
            if (!targetEl.style.top) targetEl.style.top = "80px";
            if (!targetEl.style.left) targetEl.style.left = "50px";
            const origTop = getIntPx(targetEl.style.top);
            const origLeft = getIntPx(targetEl.style.left);

            function onMove(ev) {
                ev.preventDefault();
                const clientX = ev.touches ? ev.touches[0].clientX : ev.clientX;
                const clientY = ev.touches ? ev.touches[0].clientY : ev.clientY;
                const dx = clientX - startX;
                const dy = clientY - startY;
                const newTop = origTop + dy;
                const newLeft = origLeft + dx;
                targetEl.style.top = newTop + 'px';
                targetEl.style.left = newLeft + 'px';
                if (typeof onMoveCallback === 'function') onMoveCallback(newTop, newLeft);
            }

            function endDrag() {
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('mouseup', endDrag);
                document.removeEventListener('touchmove', onMove);
                document.removeEventListener('touchend', endDrag);
            }

            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', endDrag);
            document.addEventListener('touchmove', onMove, { passive: false });
            document.addEventListener('touchend', endDrag);
        }
    }

    // Draggable menu
    const header = ui.querySelector("#dragHeader");
    makeDraggable(ui, header, (top, left) => {
        if (collapsedIcon.style.display !== 'none') {
            collapsedIcon.style.top = top + 'px';
            collapsedIcon.style.left = left + 'px';
        }
    });

    // Draggable collapsed icon
    makeDraggable(collapsedIcon, collapsedIcon, (top, left) => {
        ui.style.top = top + 'px';
        ui.style.left = left + 'px';
    });

    // ---- Parse coordinates ----
    function parseCoords(start, end) {
        if (!start || !end) return { ok: false, msg: "Both coordinates required" };
        const a = start.split("_").map(s => Number(s.trim()));
        const b = end.split("_").map(s => Number(s.trim()));
        if (a.length !== 2 || b.length !== 2 || a.some(isNaN) || b.some(isNaN)) return { ok: false, msg: "Coordinates must be X_Y numbers" };
        const [x1, y1] = a;
        const [x2, y2] = b;
        if (x2 < x1 || y2 < y1) return { ok: false, msg: "End coordinate must be >= Start coordinate" };
        return { ok: true, x1, y1, x2, y2, w: x2 - x1 + 1, h: y2 - y1 + 1 };
    }

    // ---- Download and build area ----
    async function downloadArea(start, end) {
        statusEl.textContent = "Fetching canvas data...";
        downloadBtn.disabled = true;
        downloadBtn.textContent = "Generating...";
        try {
            const canvasesResp = await fetch(CANVASES_URL);
            const canvases = await canvasesResp.json();
            const canvasId = Object.keys(canvases)[0];
            const canvas = canvases[canvasId];

            const parse = parseCoords(start, end);
            if (!parse.ok) {
                statusEl.textContent = parse.msg;
                return;
            }
            const { x1, y1, x2, y2, w: width, h: height } = parse;

            statusEl.textContent = `Loading area ${width}×${height}...`;

            const offscreen = document.createElement("canvas");
            offscreen.width = width;
            offscreen.height = height;
            const ctx = offscreen.getContext("2d");
            const imgData = ctx.createImageData(width, height);

            const size = canvas.size;
            const canvasoffset = Math.sqrt(size);
            const offset = -canvasoffset * canvasoffset / 2;

            const xc1 = Math.floor((x1 - offset) / 256);
            const yc1 = Math.floor((y1 - offset) / 256);
            const xc2 = Math.floor((x2 - offset) / 256);
            const yc2 = Math.floor((y2 - offset) / 256);

            const totalTiles = (xc2 - xc1 + 1) * (yc2 - yc1 + 1);
            let loadedTiles = 0;

            for (let iy = yc1; iy <= yc2; iy++) {
                for (let ix = xc1; ix <= xc2; ix++) {
                    const url = `${PPFUN_URL}/chunks/${canvasId}/${ix}/${iy}.bmp`;
                    try {
                        const resp = await fetch(url);
                        const buf = await resp.arrayBuffer();
                        if (buf.byteLength !== 65536) {
                            loadedTiles++;
                            statusEl.textContent = `Tile ${loadedTiles}/${totalTiles} (invalid)`;
                            continue;
                        }
                        const arr = new Uint8Array(buf);
                        for (let i = 0; i < arr.length; i++) {
                            const tx = ix * 256 + (i % 256) + offset;
                            const ty = iy * 256 + Math.floor(i / 256) + offset;
                            if (tx >= x1 && tx <= x2 && ty >= y1 && ty <= y2) {
                                const px = tx - x1;
                                const py = ty - y1;
                                const idx = (py * width + px) * 4;
                                const colorIndex = arr[i] & 0x7F;
                                const color = canvas.colors[colorIndex] || [0,0,0,0];
                                imgData.data[idx] = color[0];
                                imgData.data[idx+1] = color[1];
                                imgData.data[idx+2] = color[2];
                                imgData.data[idx+3] = color[3] ?? 255;
                            }
                        }
                        loadedTiles++;
                        statusEl.textContent = `Loaded ${loadedTiles}/${totalTiles} tiles`;
                    } catch (err) {
                        loadedTiles++;
                        statusEl.textContent = `Tile ${loadedTiles}/${totalTiles} (error)`;
                    }
                }
            }

            ctx.putImageData(imgData, 0, 0);

            // show preview
            const pctx = previewCanvas.getContext("2d");
            previewCanvas.width = Math.min(width, 600);
            previewCanvas.height = Math.min(height, 300);
            pctx.imageSmoothingEnabled = false;
            pctx.drawImage(offscreen, 0, 0, previewCanvas.width, previewCanvas.height);

            saveBtn.style.display = "block";
            statusEl.textContent = `Done — ${width}×${height}.`;

            saveBtn.onclick = () => {
                offscreen.toBlob(blob => {
                    const url = URL.createObjectURL(blob);
                    try {
                        GM_download({ url, name: "area.png" });
                    } catch {
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = "area.png";
                        a.click();
                    }
                }, "image/png");
            };

        } catch (err) {
            statusEl.textContent = "Error: " + (err.message || err);
        } finally {
            downloadBtn.disabled = false;
            downloadBtn.textContent = "Generate Image";
        }
    }

    // ---- Button handler ----
    downloadBtn.addEventListener("click", () => {
        const start = document.getElementById("coordStart").value.trim();
        const end = document.getElementById("coordEnd").value.trim();
        const parsed = parseCoords(start, end);
        if (!parsed.ok) {
            statusEl.textContent = parsed.msg;
            return;
        }
        downloadArea(start, end);
    });

})();
