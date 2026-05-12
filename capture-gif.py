import asyncio, os
from pathlib import Path
from PIL import Image
import io

HTML_PATH = Path('/sessions/kind-tender-brown/mnt/squarespell/dashboard-mockup-animation.html')
OUT_PATH  = Path('/sessions/kind-tender-brown/mnt/squarespell/dashboard-mockup.gif')

W, H       = 1400, 780
FPS        = 12          # 12fps — smooth but compact
DURATION   = 6.0         # seconds to capture (one full animation cycle)
FRAME_MS   = int(1000 / FPS)
N_FRAMES   = int(FPS * DURATION)

async def capture():
    from playwright.async_api import async_playwright
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            executable_path='/sessions/kind-tender-brown/.cache/ms-playwright/chromium_headless_shell-1217/chrome-linux/headless_shell',
            args=['--no-sandbox','--disable-gpu','--disable-dev-shm-usage']
        )
        page = await browser.new_page(viewport={'width': W, 'height': H})

        await page.goto(f'file://{HTML_PATH}', wait_until='networkidle', timeout=15000)
        await asyncio.sleep(1.0)   # let CSS animations start

        frames = []
        print(f'Capturing {N_FRAMES} frames at {FPS}fps...')
        for i in range(N_FRAMES):
            png = await page.screenshot(type='png', full_page=False)
            img = Image.open(io.BytesIO(png)).convert('RGB')
            # Downsample to 1050×585 for GIF file size
            img = img.resize((1050, 585), Image.LANCZOS)
            frames.append(img)
            if i % 10 == 0:
                print(f'  frame {i+1}/{N_FRAMES}')
            await asyncio.sleep(1 / FPS)

        await browser.close()
        print('Building GIF...')

        # Quantize each frame
        palettised = []
        for f in frames:
            q = f.quantize(colors=256, method=Image.Quantize.MEDIANCUT, dither=0)
            palettised.append(q)

        palettised[0].save(
            OUT_PATH,
            format='GIF',
            save_all=True,
            append_images=palettised[1:],
            duration=FRAME_MS,
            loop=0,
            optimize=False,
        )
        size_mb = OUT_PATH.stat().st_size / 1_048_576
        print(f'Done → {OUT_PATH}  ({size_mb:.1f} MB)')

asyncio.run(capture())
