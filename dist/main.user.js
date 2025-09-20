// ==UserScript==
// @name         Pixmap Area Downloader
// @namespace    http://tampermonkey.net/
// @version      1.3.1
// @description  Download an area from Pixmap.fun
// @author       PixelArg
// @match        *://pixmap.fun/*
// @grant        GM_addStyle
// @grant        GM_download
// @updateURL    https://raw.githubusercontent.com/Demz18/Pixmap-Area-Download/main/dist/main.user.js
// @downloadURL  https://raw.githubusercontent.com/Demz18/Pixmap-Area-Download/main/dist/main.user.js

// ==/UserScript==

(function() {
    'use strict';

    const PPFUN_URL = "https://pixmap.fun";
    const CANVASES_URL = "https://raw.githubusercontent.com/CodeToucher/motherfuckingcanvasjsonfuckupixmapformakingmedothisinsteadofu/refs/heads/main/canvases.json";

    // ---------- STYLES ----------
    GM_addStyle(`
    #areaCompact, #areaExpanded {
        position: fixed;
        z-index: 999999;
        cursor: grab;
        user-select: none;
        font-family:'Poppins',sans-serif;
    }
	
	#areaCompact {
		min-width: 200px;
		height: 44px;
		background: linear-gradient(135deg, #3a8dff, #0052d4);
		border-radius: 12px;
		box-shadow: 0 4px 12px rgba(0,0,0,.25);
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 14px;
		font-weight: 600;
		font-style: normal;
		color: #fff;
		font-size: 15px;
		letter-spacing: 0.3px;
		transition: background 0.25s, transform 0.15s;
	}

	#areaCompact:hover {
		background: linear-gradient(135deg, #4da1ff, #0060f5);
		transform: translateY(-1px);
	}

	#expandArrow {
		font-size: 18px;
		font-weight: bold;
		transition: transform 0.3s ease;
		margin-left: 10px;
		opacity: 0.9;
	}


    #areaExpanded {
        width: 360px;
        background: linear-gradient(180deg,#1c56d0 0%,#0a4ab7 100%);
        border-radius: 24px;
        padding:10px;
        box-shadow:0 6px 12px rgba(0,0,0,.3);
        display:none;
        flex-direction:column;
        align-items:center;
        color:white;
    }
    #areaExpanded h2 {
        width:100%;
        background:linear-gradient(90deg,#1c56d0 0%,#0a4ab7 100%);
        border-radius:18px;
        text-align:center;
        padding:8px;
        font-weight:bold;
        font-style:italic;
        margin:0 0 10px;
        position:relative;
    }
    #collapseArrow {
        position:absolute;
        right:12px;
        top:50%;
        transform:translateY(-50%);
        cursor:pointer;
        font-size:18px;
        font-weight:bold;
    }
    .coordInput {
        width:90%;
        margin:6px 0;
        padding:8px;
        border-radius:10px;
        border:none;
        background:#233b90;
        color:#fff;
        font-size:14px;
        text-align:center;
    }
    .mainBtn {
        margin:12px 0;
        padding:10px 18px;
        border-radius:18px;
        background:#003fbd;
        font-weight:bold;
        cursor:pointer;
        transition:background 0.2s;
        color:#fff;
        width:90%;
        text-align:center;
    }
    .mainBtn:hover { background:#004fff; }
    .progressContainer {
        width:90%;
        padding:10px;
        border-radius:14px;
        background:#233b90;
        margin:10px 0;
        text-align:center;
        font-size:14px;
    }
    .progressBar {
        width:100%;
        height:16px;
        background:#fff;
        border-radius:8px;
        overflow:hidden;
        position:relative;
    }
    .progressFill {
        width:0%;
        height:100%;
        background:#00aaff;
        transition:width 0.3s;
    }
    .previewBox {
        width:90%;
        height:160px;
        border:2px solid #fff;
        border-radius:12px;
        background:#1b3c90;
        margin:10px 0;
        display:flex;
        justify-content:center;
        align-items:center;
        overflow:hidden;
    }
    .footerLabel {
        margin-top:10px;
        font-size:14px;
        color:#d0d0d0;
    }
    `);

    // ---------- ELEMENTS ----------
    const compact = document.createElement('div');
    compact.id = 'areaCompact';
    compact.innerHTML = `<span>Area Downloader</span><div id="expandArrow">▼</div>`;

    const expanded = document.createElement('div');
    expanded.id = 'areaExpanded';
    expanded.innerHTML = `
        <h2>Area Downloader <span id="collapseArrow">▲</span></h2>
        <input class="coordInput" id="coordStart" placeholder="Start Coord (X_Y) (Press 'R')" />
        <input class="coordInput" id="coordEnd" placeholder="End Coord (X_Y) (Press 'R')" />
        <div class="mainBtn" id="downloadBtn">Download Area</div>
        <div class="progressContainer">
            <div id="status">Download Progress 0%</div>
            <div class="progressBar"><div class="progressFill" id="progressFill"></div></div>
        </div>
        <div class="previewBox"><canvas id="previewCanvas"></canvas></div>
        <div class="mainBtn" id="saveBtn" style="display:none;">Save As PNG</div>
        <div class="footerLabel">Made By PixelArg</div>
    `;

    document.body.appendChild(compact);
    document.body.appendChild(expanded);

    // Position memory
    let pos = JSON.parse(localStorage.getItem('areaDownloaderPos')||'{"x":50,"y":50}');
    compact.style.top = pos.y+'px';
    compact.style.left = pos.x+'px';

    // Drag function
    function makeDraggable(el) {
        let offsetX, offsetY, dragging=false;
        function down(e){
            dragging=true;
            const evt = e.touches?e.touches[0]:e;
            offsetX = evt.clientX - el.offsetLeft;
            offsetY = evt.clientY - el.offsetTop;
            document.addEventListener('mousemove',move);
            document.addEventListener('mouseup',up);
            document.addEventListener('touchmove',move,{passive:false});
            document.addEventListener('touchend',up);
        }
        function move(e){
            if(!dragging) return;
            const evt = e.touches?e.touches[0]:e;
            let x = evt.clientX - offsetX;
            let y = evt.clientY - offsetY;
            el.style.left = x+'px';
            el.style.top = y+'px';
            e.preventDefault();
        }
        function up(){
            dragging=false;
            localStorage.setItem('areaDownloaderPos',JSON.stringify({x:el.offsetLeft,y:el.offsetTop}));
            document.removeEventListener('mousemove',move);
            document.removeEventListener('mouseup',up);
            document.removeEventListener('touchmove',move);
            document.removeEventListener('touchend',up);
        }
        el.addEventListener('mousedown',down);
        el.addEventListener('touchstart',down);
    }

    makeDraggable(compact);
    makeDraggable(expanded);

    // Toggle expand/collapse
    document.getElementById('expandArrow').addEventListener('click',()=>{
        expanded.style.left = compact.offsetLeft+'px';
        expanded.style.top = compact.offsetTop+'px';
        expanded.style.display='flex';
        compact.style.display='none';
    });
    document.getElementById('collapseArrow').addEventListener('click',()=>{
        compact.style.left = expanded.offsetLeft+'px';
        compact.style.top = expanded.offsetTop+'px';
        compact.style.display='flex';
        expanded.style.display='none';
    });

    // ---------- LOGIC ----------
    const downloadBtn = expanded.querySelector("#downloadBtn");
    const saveBtn = expanded.querySelector("#saveBtn");
    const previewCanvas = expanded.querySelector("#previewCanvas");
    const statusEl = expanded.querySelector("#status");
    const progressFill = expanded.querySelector("#progressFill");

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

    async function downloadArea(start, end) {
        statusEl.textContent = "Fetching canvas data...";
        downloadBtn.style.pointerEvents = "none";
        try {
            const canvasesResp = await fetch(CANVASES_URL);
            const canvases = await canvasesResp.json();
            const canvasId = Object.keys(canvases)[0];
            const canvas = canvases[canvasId];

            const parse = parseCoords(start, end);
            if (!parse.ok) { statusEl.textContent = parse.msg; return; }
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
                            progressFill.style.width = (loadedTiles/totalTiles*100)+"%";
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
                        progressFill.style.width = (loadedTiles/totalTiles*100)+"%";
                    } catch {
                        loadedTiles++;
                        statusEl.textContent = `Tile ${loadedTiles}/${totalTiles} (error)`;
                        progressFill.style.width = (loadedTiles/totalTiles*100)+"%";
                    }
                }
            }

            ctx.putImageData(imgData, 0, 0);

            // preview
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
            downloadBtn.style.pointerEvents = "auto";
        }
    }

    downloadBtn.addEventListener("click", () => {
        const start = document.getElementById("coordStart").value.trim();
        const end = document.getElementById("coordEnd").value.trim();
        const parsed = parseCoords(start, end);
        if (!parsed.ok) { statusEl.textContent = parsed.msg; return; }
        downloadArea(start, end);
    });

})();
