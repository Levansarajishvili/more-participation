"""B5: მედიის ეკრანები Chromium-ში რეალურ API-ზე (dev) — axe-core + ატვირთვის ნაკადი.

გაშვება:
  npm run audit:media-api            (= python3 scripts/audit_media_api.py --out audit-media-api.json)

სკრიპტი თავად უშვებს:
  - `node server/index.js` — development, in-memory MongoDB (migrate + seed), ადმინისტრატორი
    ერთჯერადი შემთხვევითი პაროლით (env-ით, ფაილში არ იწერება), `MEDIA_STORAGE=local` დროებით
    საქაღალდეში;
  - `vite` (dev, `VITE_ADMIN_API=/api/admin`) — `/api` და `/media` proxy-ით სერვერზე (ერთი origin).

მდგომარეობები × light / dark / contrast × 1440 / 390: `/admin/media` (ატვირთვის შემდეგ),
ბრაუზერის უარი (SVG `.png`-ად), სერვერის უარი (დაზიანებული JPEG — 400), alt-ის ფორმა,
`?filter=missing-alt`, `/admin/documents` (PDF-ის ატვირთვის შემდეგ). ყოველზე — axe (ფერის
კონტრასტით), ჰორიზონტალური სქროლი. ერთხელ: `/media/*` header-ები და ატვირთული JPEG-ის ბაიტებში
EXIF / მოწყობილობის სახელი.
"""

import argparse
import json
import os
import pathlib
import secrets
import socket
import subprocess
import sys
import tempfile
import time
import urllib.request

from playwright.sync_api import sync_playwright

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from audit import ADMIN_READY, AXE, PREFS, THEMES, WIDTHS, axe_admin  # noqa: E402

ROOT = pathlib.Path(__file__).resolve().parents[1]
API_PORT = 3307
WEB_PORT = 5174
BASE = f'http://localhost:{WEB_PORT}'
EMAIL = 'audit-admin@example.org'

FIXTURES_JS = """
import { writeFileSync } from 'node:fs';
const { jpegWithGps, PDF } = await import('./server/test/media/fixtures.js');
const dir = process.argv[1];
writeFileSync(`${dir}/ფოტო-სცენაზე.jpg`, await jpegWithGps());
writeFileSync(`${dir}/report.pdf`, PDF);
writeFileSync(`${dir}/logo.png`, '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"/>');
writeFileSync(`${dir}/broken.jpg`, Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4]));
"""


def wait_http(url, timeout=180):
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            with urllib.request.urlopen(url, timeout=2) as res:
                if res.status < 500:
                    return
        except Exception:
            time.sleep(0.5)
    raise RuntimeError(f'არ გაიხსნა: {url}')


def free(port):
    with socket.socket() as s:
        return s.connect_ex(('127.0.0.1', port)) != 0


def start(tmp, password):
    for port in (API_PORT, WEB_PORT):
        if not free(port):
            raise RuntimeError(f'პორტი დაკავებულია: {port}')
    server_env = {
        **os.environ,
        'NODE_ENV': 'development',
        'HOST': '127.0.0.1',
        'PORT': str(API_PORT),
        'LOG_LEVEL': 'warn',
        'MEDIA_STORAGE': 'local',
        'MEDIA_DIR': str(tmp / 'media'),
        'ADMIN_EMAIL': EMAIL,
        'ADMIN_NAME': '[აუდიტი]',
        'ADMIN_PASSWORD': password,
    }
    web_env = {
        **os.environ,
        'BROWSER': 'none',
        'VITE_ADMIN_API': '/api/admin',
        'VITE_API_PROXY': f'http://127.0.0.1:{API_PORT}',
    }
    procs = [
        subprocess.Popen(['node', 'server/index.js'], cwd=ROOT, env=server_env,
                         stdout=subprocess.DEVNULL, stderr=subprocess.PIPE),
        subprocess.Popen(['npx', 'vite', '--host', 'localhost', '--port', str(WEB_PORT), '--strictPort'],
                         cwd=ROOT, env=web_env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL),
    ]
    wait_http(f'http://127.0.0.1:{API_PORT}/api/health')
    wait_http(f'{BASE}/')
    return procs


def scroll_x(page):
    return page.evaluate('() => document.documentElement.scrollWidth - window.innerWidth')


def ready(page, selector):
    page.wait_for_function(ADMIN_READY)
    page.wait_for_selector(selector)
    page.wait_for_timeout(300)


def check(page, rows, theme, width, state):
    result = axe_admin(page)
    rows.append({
        'state': state, 'theme': theme, 'width': width,
        'violations': result['violations'], 'incomplete': result['incomplete'],
        'scrollX': scroll_x(page),
        **({'scrollContrast': result['scrollContrast']} if 'scrollContrast' in result else {}),
    })


def warm_up(browser, password):
    """Vite dev ადმინის lazy chunk-ების დამოკიდებულებებს პირველ გახსნაზე აოპტიმიზებს და გვერდს
    თავიდან ტვირთავს — აუდიტამდე ერთხელ ყველა ეკრანი იხსნება, რომ axe-ს შუაში reload არ მოხდეს."""
    context = browser.new_context()
    page = context.new_page()
    page.set_default_timeout(60000)
    context.request.post(f'{BASE}/api/admin/auth/login', data={'email': EMAIL, 'password': password})
    for path, selector in [('/admin/media', '.mc-media-grid'), ('/admin/documents', 'table'),
                           ('/admin/media', '.mc-media-grid')]:
        page.goto(BASE + path)
        page.wait_for_selector(selector)
        page.wait_for_timeout(4000)
    context.close()


def run(browser, files, password, report):
    warm_up(browser, password)
    rows = []
    for theme in THEMES:
        for width in WIDTHS:
            context = browser.new_context(viewport={'width': width, 'height': WIDTHS[width]},
                                          color_scheme='dark' if theme == 'dark' else 'light')
            context.add_init_script(PREFS % (100, theme, 'false'))
            page = context.new_page()
            page.set_default_timeout(30000)
            res = context.request.post(f'{BASE}/api/admin/auth/login',
                                       data={'email': EMAIL, 'password': password})
            assert res.status == 200, f'login {res.status}'

            page.goto(f'{BASE}/admin/media')
            ready(page, '.mc-media-grid')
            upload = page.locator('.mc-library__upload input[type="file"]')
            upload.set_input_files(str(files / 'ფოტო-სცენაზე.jpg'))
            page.get_by_text('ატვირთულია: ფოტო-სცენაზე.jpg').wait_for(state='attached')
            page.wait_for_selector('.mc-media-card h2:text-is("ფოტო-სცენაზე.jpg")')
            ready(page, '.mc-media-grid')
            check(page, rows, theme, width, 'media: ატვირთვის შემდეგ')

            upload.set_input_files(str(files / 'logo.png'))
            page.wait_for_selector('.mc-library__problem[role="alert"]')
            check(page, rows, theme, width, 'media: ბრაუზერის უარი (SVG)')

            upload.set_input_files(str(files / 'broken.jpg'))
            page.get_by_text('ფაილი ვერ აიტვირთა:').wait_for()
            check(page, rows, theme, width, 'media: სერვერის უარი (400)')

            # სერვერი ყველა კონტექსტისთვის ერთია — იმავე სახელის ფაილი რამდენიმეჯერ აიტვირთება
            card = page.locator('.mc-media-card', has=page.locator('h2:text-is("ფოტო-სცენაზე.jpg")')).first
            card.get_by_role('button', name='alt-ის რედაქტირება').click()
            card.get_by_role('textbox').wait_for()
            check(page, rows, theme, width, 'media: alt-ის ფორმა')

            page.goto(f'{BASE}/admin/media?filter=missing-alt')
            ready(page, '.mc-media-grid')
            check(page, rows, theme, width, 'media: alt აკლია')

            page.goto(f'{BASE}/admin/documents')
            ready(page, 'table')
            page.locator('.mc-library__upload input[type="file"]').set_input_files(str(files / 'report.pdf'))
            page.get_by_text('ატვირთულია: report.pdf').wait_for(state='attached')
            page.wait_for_selector('td:has-text("report.pdf")')
            ready(page, 'table')
            check(page, rows, theme, width, 'documents: ატვირთვის შემდეგ')

            if theme == 'light' and width == 1440:
                report['delivery'] = delivery(context, page)
            context.close()
    report['states'] = rows
    report['totals'] = {
        'runs': len(rows),
        'violations': sum(len(r['violations']) for r in rows),
        'incomplete': sum(len(r['incomplete']) for r in rows),
        'scrollX': max(r['scrollX'] for r in rows),
    }


def delivery(context, page):
    res = context.request.get(f'{BASE}/api/admin/media?kind=image')
    items = [m for m in res.json() if m['title'] == 'ფოტო-სცენაზე.jpg']
    src = items[0]['src']
    image = context.request.get(BASE + src)
    body = image.body()
    page.goto(f'{BASE}/admin/media')
    ready(page, '.mc-media-grid')
    rendered = page.evaluate("""(src) => [...document.querySelectorAll('img')]
      .filter((img) => img.getAttribute('src') === src).map((img) => img.naturalWidth)""", src)
    headers = image.headers
    return {
        'src': src,
        'status': image.status,
        'headers': {k: headers.get(k) for k in ['content-type', 'cache-control', 'content-security-policy',
                                                 'x-content-type-options', 'content-disposition', 'etag']},
        'bytes': len(body),
        'exif': b'Exif\x00\x00' in body,
        'camera': b'TestCam' in body,
        'rendered': rendered,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--out', default='audit-media-api.json')
    args = parser.parse_args()
    password = secrets.token_urlsafe(18)
    report = {}
    with tempfile.TemporaryDirectory(prefix='mc-audit-') as tmp_name:
        tmp = pathlib.Path(tmp_name)
        files = tmp / 'files'
        files.mkdir()
        subprocess.run(['node', '--import', './server/alias.js', '--input-type=module', '-e', FIXTURES_JS, str(files)],
                       cwd=ROOT, check=True)
        procs = start(tmp, password)
        try:
            with sync_playwright() as p:
                browser = p.chromium.launch()
                report['chromium'] = browser.version
                report['axeCore'] = json.loads((AXE.parent / 'package.json').read_text())['version']
                t0 = time.time()
                run(browser, files, password, report)
                print(f'✓ media-api ({time.time() - t0:.0f}s)', file=sys.stderr)
                browser.close()
        finally:
            for proc in procs:
                proc.terminate()
            for proc in procs:
                proc.wait(timeout=20)
    pathlib.Path(args.out).write_text(json.dumps(report, ensure_ascii=False, indent=1), encoding='utf-8')
    print(json.dumps(report['totals'], ensure_ascii=False), file=sys.stderr)
    print(f'→ {args.out}', file=sys.stderr)


if __name__ == '__main__':
    main()
