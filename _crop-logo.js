// Crop logo: trim whitespace and make white background transparent
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const fs = require('fs');
const path = require('path');

async function cropLogo() {
    const img = await loadImage(path.join(__dirname, '세무회계 봄날 로고.png'));
    const w = img.width, h = img.height;

    // Draw to canvas
    const canvas = createCanvas(w, h);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const data = ctx.getImageData(0, 0, w, h).data;

    // Find bounds of non-white pixels
    let top = h, left = w, bottom = 0, right = 0;
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const i = (y * w + x) * 4;
            const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
            // Not white and not transparent
            if (a > 10 && (r < 240 || g < 240 || b < 240)) {
                if (y < top) top = y;
                if (y > bottom) bottom = y;
                if (x < left) left = x;
                if (x > right) right = x;
            }
        }
    }

    // Add small padding
    const pad = 10;
    top = Math.max(0, top - pad);
    left = Math.max(0, left - pad);
    bottom = Math.min(h - 1, bottom + pad);
    right = Math.min(w - 1, right + pad);

    const cw = right - left + 1, ch = bottom - top + 1;
    const out = createCanvas(cw, ch);
    const octx = out.getContext('2d');

    // Draw cropped image (transparent bg)
    octx.drawImage(img, left, top, cw, ch, 0, 0, cw, ch);

    // Make white pixels transparent
    const outData = octx.getImageData(0, 0, cw, ch);
    const d = outData.data;
    for (let i = 0; i < d.length; i += 4) {
        if (d[i] > 240 && d[i + 1] > 240 && d[i + 2] > 240) {
            d[i + 3] = 0; // make transparent
        }
    }
    octx.putImageData(outData, 0, 0);

    const buf = out.toBuffer('image/png');
    fs.writeFileSync(path.join(__dirname, 'public', 'logo.png'), buf);
    console.log(`Cropped: ${w}x${h} -> ${cw}x${ch}`);
}

cropLogo().catch(console.error);
