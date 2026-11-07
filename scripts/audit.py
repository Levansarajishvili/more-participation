#!/usr/bin/env python3
"""
F7: საბოლოო აუდიტი Chromium-ში (Playwright + axe-core). B7: production build-ზე და რეალურ API-ზე.

  npm run build && npm run audit [-- --only axe,keyboard,…]

`npm run audit` = `node scripts/local-prod.mjs --seed --mail-dir .audit-mail --port 4173 -- python3
scripts/audit.py --out audit.json`: `dist/` + `node server/index.js` (ერთი სერვისი — API + საიტი, სერვერის
meta, CSP) + MongoDB (memory) seed-ით + ყალბი S3; ადმინისტრატორი `server:create-admin`-ით, რედაქტორი —
მოწვევით. მისამართი და ანგარიშები env-იდან (`BASE_URL`, `MC_ADMIN_*`, `MC_EDITOR_*`, `MC_MAIL_DIR`) —
პაროლი კოდში არ არის. სერვერი `NODE_ENV=development`-ითაა მხოლოდ იმიტომ, რომ წერილი ფაილად ჩაიწეროს
(`forms`); bundle — წარმოების `dist/` (mock-ის გარეშე, check-dist).

mock-ის ორი დემო-მონახაზი (სტატია ხარვეზებით, ვიდეო id-ისა და სუბტიტრის გარეშე) seed-ში არ არის —
აუდიტი მათ ადმინის API-ით ქმნის (`prepare_admin_fixtures`). dev-only ნაწილები — `/__kit` და native
ფლეიერი ფაილით (`media`) — `vite`-ზე (5173, mock): წარმოების bundle-ში ისინი განზრახ არ არის.
ყოველ გვერდზე `securitypolicyviolation` ითვლება (`csp` — CSP-ის დარღვევა; B7).

წინაპირობა: `pip install playwright` + `python -m playwright install chromium`; axe-core
node_modules-შია (vitest-axe-ის დამოკიდებულება).

ნაწილები:
- axe     — ყველა როუტი × light / dark / contrast × 1440 / 390 (ფერის კონტრასტით), + ჰორიზ. სქროლი;
- keyboard — Tab-ით გავლა 1440 და 390: რგოლი ჩანს, ელემენტი ეკრანზეა და არ იფარება, ციკლი;
            სლაიდერის და ფლეიერის სცენარები;
- motion  — prefers-reduced-motion: reduce → ხანგრძლივობა 0; no-preference → §7-ის მნიშვნელობები;
- reflow  — 320px (100%), 720px (1440 × 200% zoom), data-size 200 (1440 და 390);
- media   — ფლეიერი რეალური ფაილით (ffmpeg-ის WebM + VTT, `--fixtures`): დაკვრა, PiP-ის სინქრონი,
            სუბტიტრი overlay-ში, აუდიოაღწერა, მალსახმობები, ტრანსკრიპტი, axe;
- bundle  — dist/assets-ის gzip ზომები;
- en      — F9: ინგლისური ვერსია — საჯარო როუტები `/en`-ით + ადმინი `/en/admin` (შესვლა, დაფა, სია,
            რედაქტორი English ჩანართით, პარამეტრები) × light / dark / contrast × 1440 / 390: axe,
            ჰორიზ. სქროლი, `<html lang="en">` (EN_THEMES / EN_WIDTHS — ნაწილ-ნაწილ);
- youtube — F10: `/videos`, `/en/videos` (mock) და ვიდეოს რედაქტორი (ცარიელი / ბმულით + VTT) × 3 თემა ×
            1440 / 390; შემდეგ გამოქვეყნება → facade (iframe და API-ის სკრიპტი არ არის) → Enter → ყალბი
            IFrame API (page.route) → სუბტიტრის ზოლი, ფოკუსი, K / C; axe `iframes: false` (შიგთავსი გარეა);
- forms   — B6: კონტაქტის ფორმა მხოლოდ კლავიატურით (Tab / Space / Enter → დადასტურება, CAPTCHA არ არის),
            გამოწერა → „შეამოწმე ელფოსტა“ → წერილის ბმული (`MC_MAIL_DIR`-ის ფაილი) →
            დადასტურება → გაუქმება, გამოყენებული ბმული → alert; ყოველ მდგომარეობაზე axe × 3 თემა × 1440 / 390;
- admin   — F8: ადმინის როუტები (შესვლა / რეგისტრაცია / მდგომარეობები, დაფა, სიები, ანგარიში,
            ძიება, 403, 404, გახსნილი compact-მენიუ) × light / dark / contrast × 1440 / 390 — axe +
            ჰორიზ. სქროლი; Tab-ით გავლა (რგოლი, ხილვადობა, ≥ 24px) შესვლაზე, დაფასა და სიაზე.
            შესვლა რეალური API-ით (`__Host-` cookie); შემდეგ გადასვლა SPA-ს შიგნით (history API).

`AUDIT_THEMES` / `ADMIN_THEMES` / `ADMIN_WIDTHS` / `EN_THEMES` / `EN_WIDTHS` — ნაწილ-ნაწილ გაშვებისთვის.

fixture-ები რეპოში არ ინახება (bundle-ში არ უნდა მოხვდეს): `scripts/audit.py --make-fixtures DIR`
ffmpeg-ით ქმნის.
"""

import argparse
import gzip
import json
import mimetypes
import os
import pathlib
import socket
import subprocess
import tempfile
import urllib.request
import sys
import time

from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parents[1]
AXE = ROOT / 'node_modules' / 'axe-core' / 'axe.min.js'
# B7: production build + რეალური API (`scripts/local-prod.mjs`); dev-only ნაწილები — Vite (mock)
PREVIEW = os.environ.get('BASE_URL', '').rstrip('/')
DEV = 'http://127.0.0.1:5173'
ADMIN = (os.environ.get('MC_ADMIN_EMAIL', ''), os.environ.get('MC_ADMIN_PASSWORD', ''))
EDITOR = (os.environ.get('MC_EDITOR_EMAIL', ''), os.environ.get('MC_EDITOR_PASSWORD', ''))
MAIL_DIR = pathlib.Path(os.environ['MC_MAIL_DIR']) if os.environ.get('MC_MAIL_DIR') else None
# prepare_admin_fixtures(): დემო-მონახაზების id-ები (seed-ში არ არის)
DEMO = {}

ROUTES = [
    '/',
    '/about',
    '/articles',
    '/articles/zrdis-azrovneba-ratom-aris-jer-qvelaze-dzlieri-sitqva',
    '/development',
    '/development?series=msoplkhedva',
    '/videos',
    '/videos?video=sporti-romelmats-tskhovreba-shetsvala',
    '/news',
    '/news/tsipruli-unarebis-akademiis-akhali-nakadi-ikhsneba',
    '/contact',
    # B6: წერილის ბმულის გვერდი — სწორი ფორმის token (ღილაკი), token-ის გარეშე, გაუქმება
    '/subscribe/confirm#token=' + 'A' * 43,
    '/subscribe/confirm',
    '/subscribe/unsubscribe#token=' + '0' * 24 + '.' + 'A' * 43,
    '/ar-arsebuli',
]
PAGES = ['/', '/about', '/articles', '/articles/zrdis-azrovneba-ratom-aris-jer-qvelaze-dzlieri-sitqva',
         '/development', '/videos', '/news', '/news/tsipruli-unarebis-akademiis-akhali-nakadi-ikhsneba',
         '/contact']
THEMES = ['light', 'dark', 'contrast']
WIDTHS = {1440: 900, 390: 844}
SPORT = 'sporti-romelmats-tskhovreba-shetsvala'

PREFS = "localStorage.setItem('mc-a11y', JSON.stringify({ size: %d, theme: '%s', spacing: %s, voice: false }));"

READY = """() => document.querySelector('main h1')
  && !document.querySelector('[aria-busy="true"]')
  && document.fonts.status === 'loaded'"""

KIT_READY = """() => document.querySelector('main h1') && document.querySelector('.mc-slider')
  && document.fonts.status === 'loaded'"""

OVERFLOW = """() => {
  // დეკორი (aria-hidden) და skip-link-ი, რომელიც მშობელს არ სცდება, სქროლს არ ქმნის — scroll-ის მნიშვნელობა მთავარია
  const vw = document.documentElement.clientWidth;
  const out = [];
  for (const el of document.querySelectorAll('body *')) {
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    if (el.closest('.sr-only, .mc-hp, [aria-hidden="true"] svg')) continue;
    const cs = getComputedStyle(el);
    if (cs.position === 'absolute' && cs.clip !== 'auto') continue;
    if (r.right > vw + 1 || r.left < -1) {
      const parent = el.parentElement?.getBoundingClientRect();
      if (parent && (parent.right > vw + 1 || parent.left < -1)) continue;
      out.push((el.className && typeof el.className === 'string' ? '.' + el.className.split(' ')[0] : el.tagName)
        + ' ' + Math.round(r.left) + '…' + Math.round(r.right));
    }
  }
  return { scroll: document.documentElement.scrollWidth - vw, offenders: out.slice(0, 8) };
}"""

CLIPPED = """() => {
  const out = [];
  for (const el of document.querySelectorAll('main *, header *, footer *')) {
    const cs = getComputedStyle(el);
    if (!/(hidden|clip)/.test(cs.overflowX + cs.overflowY)) continue;
    if (el.closest('.sr-only, [aria-hidden="true"], .mc-hp')) continue;
    if (el.matches('.sr-only, .mc-progress__track, .mc-slide__deco, .mc-media, .mc-player, video, img')) continue;
    const text = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (!text) continue;
    if (el.scrollWidth > el.clientWidth + 2 || el.scrollHeight > el.clientHeight + 2) {
      out.push((el.className || el.tagName).toString().split(' ')[0]);
    }
  }
  return out.slice(0, 8);
}"""

FOCUS = """() => {
  const el = document.activeElement;
  if (!el || el === document.body || el === document.documentElement) return null;
  const seen = el.hasAttribute('data-audit-seen');
  el.setAttribute('data-audit-seen', '');
  const card = el.matches('.mc-card__link') ? el.closest('.mc-card') : null;
  const ringEl = card || el;
  const cs = getComputedStyle(ringEl);
  const ring = cs.boxShadow && cs.boxShadow !== 'none';
  const forced = cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) >= 2;
  const r = ringEl.getBoundingClientRect();
  const vh = innerHeight, vw = innerWidth;
  const inView = r.bottom > 0 && r.top < vh && r.right > 0 && r.left < vw;
  const cx = Math.min(Math.max(r.left + r.width / 2, 0), vw - 1);
  const cy = Math.min(Math.max(r.top + r.height / 2, 0), vh - 1);
  const hit = document.elementFromPoint(cx, cy);
  const obscured = !!hit && !ringEl.contains(hit) && !hit.contains(ringEl) && !el.contains(hit);
  const name = (el.getAttribute('aria-label') || el.textContent || el.getAttribute('title') || el.value || '')
    .replace(/\\s+/g, ' ').trim().slice(0, 60);
  return { seen, tag: el.tagName.toLowerCase(), role: el.getAttribute('role'), name, ring, forced,
           inView, obscured, size: [Math.round(r.width), Math.round(r.height)] };
}"""

MOTION = """() => {
  const moving = [];
  for (const el of document.querySelectorAll('*')) {
    const cs = getComputedStyle(el);
    const t = cs.transitionDuration.split(',').some((d) => parseFloat(d) > 0);
    const a = cs.animationName !== 'none' && cs.animationDuration.split(',').some((d) => parseFloat(d) > 0);
    if (t || a) moving.push((el.className || el.tagName).toString().split(' ')[0] + (a ? ' (animation)' : ''));
  }
  return [...new Set(moving)].slice(0, 12);
}"""


def wait_port(port, timeout=40):
    end = time.time() + timeout
    while time.time() < end:
        with socket.socket() as s:
            if s.connect_ex(('127.0.0.1', port)) == 0:
                return True
        time.sleep(0.3)
    raise RuntimeError(f'port {port} არ გაიხსნა')


def wait_http(url, timeout=180):
    end = time.time() + timeout
    while time.time() < end:
        try:
            with urllib.request.urlopen(url, timeout=2) as res:
                if res.status < 500:
                    return
        except Exception:
            time.sleep(0.5)
    raise RuntimeError(f'არ გაიხსნა: {url}')


def start_servers(parts):
    """B7: საიტი და API უკვე მუშაობს (`local-prod.mjs`); აქ მხოლოდ Vite dev (mock) — `/__kit` და
    native ფლეიერი ფაილით, რომლებიც წარმოების bundle-ში არ არის."""
    if not PREVIEW or not ADMIN[1] or not EDITOR[1]:
        raise SystemExit('BASE_URL / MC_ADMIN_* / MC_EDITOR_* არ არის — გაუშვი `npm run audit` '
                         '(scripts/local-prod.mjs --seed --mail-dir … -- python3 scripts/audit.py)')
    wait_http(f'{PREVIEW}/api/health')
    procs = []
    if parts & {'axe', 'reflow', 'media'}:
        env = {**os.environ, 'BROWSER': 'none'}
        for key in ('VITE_CONTENT_API', 'VITE_ADMIN_API', 'VITE_MOCK'):
            env.pop(key, None)
        procs.append(subprocess.Popen(['npx', 'vite', '--host', '127.0.0.1', '--port', '5173', '--strictPort'],
                                      cwd=ROOT, env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL))
        wait_port(5173)
    return procs


def new_page(browser, width=1440, theme='light', size=100, spacing=False, reduce=False, base=PREVIEW):
    context = browser.new_context(viewport={'width': width, 'height': WIDTHS.get(width, 900)},
                                  reduced_motion='reduce' if reduce else 'no-preference',
                                  color_scheme='dark' if theme == 'dark' else 'light')
    context.add_init_script(PREFS % (size, theme, 'true' if spacing else 'false'))
    context.add_init_script(CSP_WATCH)
    page = context.new_page()
    page.set_default_timeout(20000)
    return context, page


def inject_axe(page):
    """B7: საიტის CSP inline script-ს (`add_script_tag`) არ უშვებს — axe DevTools-ის პროტოკოლით
    (`evaluate`) ჩაიტვირთება, რომელსაც გვერდის CSP არ ეხება. CSP-ის დარღვევა ამიტომ არ ჩნდება."""
    page.evaluate(AXE_SOURCE)


AXE_SOURCE = AXE.read_text(encoding='utf-8')


# B7: CSP-ის დარღვევა (`securitypolicyviolation`) — ყოველ გვერდზე, სესიის განმავლობაში
CSP_WATCH = """window.__csp = []; document.addEventListener('securitypolicyviolation',
  (e) => window.__csp.push(e.violatedDirective + ' ' + (e.blockedURI || 'inline')));"""


def csp_of(page):
    try:
        return page.evaluate('() => window.__csp ?? []')
    except Exception:
        return []


def goto(page, path, base=PREVIEW):
    page.goto(base + path)
    try:
        if path.startswith('/__kit'):
            # ნაკრებში „ჩატვირთვის“ მაგალითები მუდმივად aria-busy-ია
            page.wait_for_function(KIT_READY)
            page.wait_for_timeout(1500)
        else:
            page.wait_for_function(READY)
            page.wait_for_timeout(250)
    except Exception as error:
        raise RuntimeError(f'{base}{path}: გვერდი არ ჩაიტვირთა') from error


def run_axe(page, retries=2):
    """axe-core გვერდზე (+ B7: CSP-ის დარღვევები). Vite dev (`/__kit`) ახალ დამოკიდებულებას აოპტიმიზებს და
    გვერდს თავიდან ტვირთავს — ამ დროს კონტექსტი ქრება: ელოდება ჩატვირთვას და ხელახლა ცდის (ლოგში `↻`)."""
    for attempt in range(retries + 1):
        try:
            return {**_run_axe(page), 'csp': csp_of(page)}
        except Exception as error:
            if 'Execution context was destroyed' not in str(error) or attempt == retries:
                raise
            print(f'  ↻ reload {page.url}', file=sys.stderr, flush=True)
            page.wait_for_load_state('load')
            page.wait_for_function(READY)
            page.wait_for_timeout(500)


def _run_axe(page):
    if not page.evaluate('() => !!window.axe'):
        inject_axe(page)
    return page.evaluate("""async () => {
      const r = await axe.run(document, { resultTypes: ['violations', 'incomplete'] });
      const pick = (list) => list.map((v) => ({ id: v.id, impact: v.impact,
        wcag: v.tags.some((t) => /^wcag/.test(t)), nodes: v.nodes.length,
        targets: v.nodes.slice(0, 3).map((n) => n.target.join(' ')) }));
      return { violations: pick(r.violations), incomplete: pick(r.incomplete) };
    }""")


# ───────────────────────────────────────────────────────────────── axe
def audit_axe(browser, report):
    themes = [t for t in os.environ.get('AUDIT_THEMES', ','.join(THEMES)).split(',') if t]
    rows = []
    for path in ROUTES:
        for theme in themes:
            for width in WIDTHS:
                context, page = new_page(browser, width, theme)
                goto(page, path)
                print(f'  axe {path} {theme} {width}', file=sys.stderr, flush=True)
                result = run_axe(page)
                overflow = page.evaluate(OVERFLOW)
                rows.append({'path': path, 'theme': theme, 'width': width, **result,
                             'scroll': overflow['scroll']})
                context.close()
    # /__kit — dev-ში (build-ში არ არის; Vite, mock)
    for theme in ['light']:
        for width in WIDTHS:
            context, page = new_page(browser, width, theme)
            goto(page, '/__kit', DEV)
            page.wait_for_timeout(800)
            rows.append({'path': '/__kit', 'theme': 'all', 'width': width, **run_axe(page),
                         'scroll': page.evaluate(OVERFLOW)['scroll']})
            context.close()
    report['axe'] = rows


# ───────────────────────────────────────────────────────────────── admin (F8)
ADMIN_READY = """() => document.querySelector('h1')
  && !document.querySelector('[aria-busy="true"]')
  && document.fonts.status === 'loaded'"""
ADMIN_LOGIN = [
    '/admin/login',
    '/admin/login?tab=register&invite=MC-INVITE-0001',
    '/admin/login?reason=expired',
]
ADMIN_ROUTES = [
    '/admin',
    '/admin/articles',
    '/admin/articles?status=draft',
    '/admin/articles?check=altMissing',
    '/admin/videos',
    '/admin/events',
    '/admin/pages',
    '/admin/a11y',
    '/admin/search?q=%E1%83%9B%E1%83%9D%E1%83%9C%E1%83%90%E1%83%AE%E1%83%90%E1%83%96%E1%83%98',
    '/admin/users',
    '/admin/ar-arsebuli',
    # ნაწილი ბ: რედაქტორი (seed-ის id-ები mock-ისაა: a-001 …; `{article}` / `{video}` — დემო-მონახაზები
    # ხარვეზებით, `prepare_admin_fixtures`; p-002 — „ჩვენ შესახებ“ გუნდითა და პარტნიორებით), გადახედვა,
    # ბიბლიოთეკა, პარამეტრები
    '/admin/articles/{article}',
    '/admin/articles/new',
    '/admin/news/n-001',
    '/admin/videos/{video}',
    '/admin/series/s-001',
    '/admin/events/e-001',
    '/admin/pages/p-002',
    '/admin/articles/a-001/preview',
    '/admin/series/s-001/preview',
    '/admin/media',
    '/admin/media?filter=missing-alt',
    '/admin/documents',
    '/admin/settings',
]


# axe ცხრილის სქროლ-რეგიონში ხილვის არეს გარეთ მყოფ უჯრას „incomplete“-ად ნიშნავს (ფონი ვერ
# დგინდება — ნაწილობრივ ფარულია). ასეთ კვანძებს computed style-ით ვზომავთ: ტექსტის ფერი ↔ პირველი
# გაუმჭვირვალე ფონი წინაპრებში (F4-ის მენიუს მეთოდი).
SCROLL_CONTRAST = """() => {
  const rgb = (c) => (c.match(/[\\d.]+/g) || []).map(Number);
  const lum = ([r, g, b]) => [r, g, b].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; })
    .reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0);
  const bgOf = (el) => { for (let n = el; n; n = n.parentElement) { const c = rgb(getComputedStyle(n).backgroundColor);
    if (c.length >= 3 && (c.length < 4 || c[3] > 0.99)) return c; } return [255, 255, 255]; };
  let min = 99, worst = null, count = 0;
  for (const el of document.querySelectorAll('.mc-table-scroll th, .mc-table-scroll td, .mc-table-scroll td *')) {
    if (!el.childNodes.length || ![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
    if (el.closest('.sr-only')) continue;
    const a = lum(rgb(getComputedStyle(el).color)), b = lum(bgOf(el));
    const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    count += 1;
    if (ratio < min) { min = ratio; worst = el.textContent.trim().slice(0, 40); }
  }
  return { count, min: Math.round(min * 100) / 100, worst };
}"""


def axe_admin(page):
    result = run_axe(page)
    inside = page.evaluate("""async () => {
      const r = await axe.run(document, { runOnly: ['color-contrast'], resultTypes: ['incomplete'] });
      return r.incomplete.flatMap((v) => v.nodes).every((n) =>
        document.querySelector(n.target.join(' '))?.closest('.mc-table-scroll'));
    }""")
    inc = [v for v in result['incomplete'] if v['id'] == 'color-contrast'] if inside else []
    if inc:
        measured = page.evaluate(SCROLL_CONTRAST)
        result['scrollContrast'] = measured
        if measured['min'] >= 4.5:
            result['incomplete'] = [v for v in result['incomplete'] if v not in inc]
    return result


def admin_ready(page):
    page.wait_for_function(ADMIN_READY)
    page.wait_for_timeout(300)


def admin_login(page, account=ADMIN):
    """რეალური შესვლა (B7): ანგარიში env-იდან (`local-prod.mjs`), cookie — `__Host-mc-session`."""
    email, password = account
    page.goto(PREVIEW + '/admin/login')
    page.wait_for_selector('#login-email')
    page.fill('#login-email', email)
    page.fill('#login-password', password)
    page.click('#auth-panel-login button[type=submit]')
    page.wait_for_selector('.mc-admin')
    admin_ready(page)


EDITOR_PATH = __import__('re').compile(r'^(?:/en)?/admin/(articles|news|series|videos|events|pages)/([a-z]-\d+|new)$')


def admin_nav(page, path):
    page.evaluate("(p) => { history.pushState({}, '', p); dispatchEvent(new PopStateEvent('popstate')); }", path)
    match = EDITOR_PATH.match(path)
    if match:
        page.wait_for_selector('.mc-editor__grid')
        if match.group(1) in ('articles', 'news'):
            page.wait_for_selector('.mc-rte__toolbar')
    if path.endswith('/preview'):
        page.wait_for_selector('.mc-preview__frame')
    admin_ready(page)


def audit_admin(browser, report):
    # ADMIN_THEMES=light,dark / ADMIN_WIDTHS=390 / ADMIN_SKIP_KEYBOARD=1 — ნაწილ-ნაწილ გაშვებისთვის
    themes = [t for t in os.environ.get('ADMIN_THEMES', ','.join(THEMES)).split(',') if t]
    widths = [int(w) for w in os.environ.get('ADMIN_WIDTHS', ','.join(map(str, WIDTHS))).split(',') if w]
    rows = []
    for theme in themes:
        for width in widths:
            context, page = new_page(browser, width, theme)
            for path in ADMIN_LOGIN:
                page.goto(PREVIEW + path)
                admin_ready(page)
                rows.append({'path': path, 'theme': theme, 'width': width, **axe_admin(page),
                             'scroll': page.evaluate(OVERFLOW)['scroll']})
            # შეცდომის მდგომარეობები: ცარიელი ფორმა (ჯამი) და უარყოფილი შესვლა (role="alert")
            page.goto(PREVIEW + '/admin/login')
            admin_ready(page)
            page.click('#auth-panel-login button[type=submit]')
            page.wait_for_selector('.mc-error-summary')
            rows.append({'path': '/admin/login [ჯამი]', 'theme': theme, 'width': width, **axe_admin(page),
                         'scroll': page.evaluate(OVERFLOW)['scroll']})
            page.fill('#login-email', 'nobody@example.org')
            page.fill('#login-password', 'wrong-password-1')
            page.click('#auth-panel-login button[type=submit]')
            page.wait_for_selector('.mc-auth-alert')
            rows.append({'path': '/admin/login [უარყოფა]', 'theme': theme, 'width': width, **axe_admin(page),
                         'scroll': page.evaluate(OVERFLOW)['scroll']})

            admin_login(page)
            for path in [p.format(**DEMO) for p in ADMIN_ROUTES]:
                admin_nav(page, path)
                print(f'  admin {path} {theme} {width}', file=sys.stderr, flush=True)
                rows.append({'path': path, 'theme': theme, 'width': width, **axe_admin(page),
                             'scroll': page.evaluate(OVERFLOW)['scroll']})
            # რედაქტორი: გამოქვეყნება ბლოკერით → შეცდომების ჯამი
            admin_nav(page, f"/admin/articles/{DEMO['article']}")
            page.click('.mc-editor__aside .mc-btn--cta')
            page.wait_for_selector('.mc-error-summary')
            rows.append({'path': '/admin/articles/{article} [გამოქვეყნების ბლოკერი]', 'theme': theme, 'width': width,
                         **axe_admin(page), 'scroll': page.evaluate(OVERFLOW)['scroll']})
            if width == 390:
                admin_nav(page, '/admin')
                page.click('.mc-admin-menu button[aria-expanded]')
                page.wait_for_timeout(200)
                rows.append({'path': '/admin [მენიუ გახსნილი]', 'theme': theme, 'width': width,
                             **axe_admin(page), 'scroll': page.evaluate(OVERFLOW)['scroll']})
            context.close()
            # რედაქტორი: 403 /admin/users-ზე
            context, page = new_page(browser, width, theme)
            admin_login(page, EDITOR)
            admin_nav(page, '/admin/users')
            rows.append({'path': '/admin/users [რედაქტორი → 403]', 'theme': theme, 'width': width,
                         **axe_admin(page), 'scroll': page.evaluate(OVERFLOW)['scroll']})
            context.close()

    keyboard = {}
    for width in ([] if os.environ.get('ADMIN_SKIP_KEYBOARD') else widths):
        for path in os.environ.get('ADMIN_KEYBOARD', '/admin/login,/admin,/admin/articles').split(','):
            context, page = new_page(browser, width, 'light')
            if path == '/admin/login':
                page.goto(PREVIEW + path)
                admin_ready(page)
            else:
                admin_login(page)
                admin_nav(page, path)
            stops = tab_walk(page)
            keyboard[f'{path} @{width}'] = {
                'stops': len(stops),
                'noRing': [s for s in stops if not (s['ring'] or s['forced'])][:5],
                'notVisible': [s for s in stops if not s['inView'] or s['obscured']][:5],
                'under24': [s for s in stops if min(s['size']) < 24][:5],
            }
            context.close()
    report['admin'] = {'axe': rows, 'keyboard': keyboard}


# ───────────────────────────────────────────────────────────────── დემო-მონახაზები (B7)
def tbilisi_iso(days):
    """mock-ის `tbilisi(now, days)`: თარიღი Asia/Tbilisi-ით, 10:00."""
    import datetime
    tz = datetime.timezone(datetime.timedelta(hours=4))
    day = (datetime.datetime.now(tz) + datetime.timedelta(days=days)).date()
    return f'{day.isoformat()}T10:00:00+04:00'


# mock-ის `adminState`-ის მონახაზი ხარვეზებით (alt, სათაურების რიგი, „აქ“-ბმული) — seed-ში არ შედის
DEMO_ARTICLE = {
    'slug': 'akhali-statia-monakhazi',
    'title': '[სტატიის სათაური — მონახაზი]',
    'excerpt': '[მოკლე აღწერა: ერთი-ორი წინადადება, რომელიც ბარათზე და ძიებაში ჩანს]',
    'category': 'career',
    'cover': {'src': None, 'alt': '', 'ratio': '3:2'},
    'author': '[ავტორის სახელი გვარი]',
    'status': 'draft',
    'featured': False,
    'body': [
        {'type': 'h3', 'text': '[ქვესათაური]'},
        {'type': 'p', 'content': [
            {'type': 'text', 'text': '[ტექსტის აბზაცი — დაწვრილებით '},
            {'type': 'link', 'text': 'აქ', 'href': '/articles'},
            {'type': 'text', 'text': ']'},
        ]},
    ],
    'audio': None,
    'readingMinutes': 1,
}
DEMO_VIDEOS = 1 + len(THEMES) * len(WIDTHS)


def prepare_admin_fixtures(browser):
    """seed-ში არ არსებული დემო-მონახაზები ადმინის API-ით (`POST /api/admin/content/{type}`):
    სტატია ხარვეზებით და ვიდეოები id-ისა და სუბტიტრის გარეშე (პირველი ვიდეოს ასლი — mock-ის იგივე
    წესი); YouTube-ის ნაწილისთვის თითო თემასა და სიგანეზე ცალკე ვიდეო (გამოქვეყნება მდგომარეობას ცვლის)."""
    context, page = new_page(browser)
    admin_login(page)
    token = next(c['value'] for c in context.cookies() if c['name'] == '__Host-mc-csrf')
    headers = {'x-csrf-token': token, 'content-type': 'application/json'}

    def create(kind, item):
        res = context.request.post(f'{PREVIEW}/api/admin/content/{kind}', headers=headers,
                                   data=json.dumps(item, ensure_ascii=False))
        if not res.ok:
            raise RuntimeError(f'{kind}: HTTP {res.status} {res.text()[:200]}')
        return res.json()['id']

    DEMO['article'] = create('articles', {**DEMO_ARTICLE, 'publishedAt': tbilisi_iso(7)})
    first = context.request.get(f'{PREVIEW}/api/admin/items/v-001').json()['item']
    videos = []
    for n in range(DEMO_VIDEOS):
        slug = 'akhali-video-monakhazi' if n == 0 else f'akhali-video-monakhazi-{n}'
        item = {**first, 'slug': slug, 'title': '[ვიდეოს სათაური — მონახაზი]', 'status': 'draft',
                'featured': False, 'youtube': {'id': ''}, 'captions': []}
        videos.append({'id': create('videos', item), 'slug': slug})
    DEMO['video'] = videos[0]['id']
    DEMO['videos'] = videos
    context.close()


# ───────────────────────────────────────────────────────────────── en (F9)
EN_PUBLIC = ['/en' + (p if p != '/' else '') for p in ROUTES if p != '/ar-arsebuli']
EN_ADMIN = ['/en/admin', '/en/admin/articles', '/en/admin/articles/a-002', '/en/admin/settings', '/en/admin/media']


def audit_en(browser, report):
    themes = [t for t in os.environ.get('EN_THEMES', ','.join(THEMES)).split(',') if t]
    widths = [int(w) for w in os.environ.get('EN_WIDTHS', ','.join(map(str, WIDTHS))).split(',') if w]
    rows = []
    for theme in themes:
        for width in widths:
            context, page = new_page(browser, width, theme)
            for path in EN_PUBLIC:
                goto(page, path)
                print(f'  en {path} {theme} {width}', file=sys.stderr, flush=True)
                rows.append({'path': path, 'theme': theme, 'width': width, **run_axe(page),
                             'scroll': page.evaluate(OVERFLOW)['scroll'],
                             'lang': page.evaluate('document.documentElement.lang')})
            page.goto(PREVIEW + '/en/admin/login')
            admin_ready(page)
            rows.append({'path': '/en/admin/login', 'theme': theme, 'width': width, **axe_admin(page),
                         'scroll': page.evaluate(OVERFLOW)['scroll'],
                         'lang': page.evaluate('document.documentElement.lang')})
            page.fill('#login-email', ADMIN[0])
            page.fill('#login-password', ADMIN[1])
            page.click('#auth-panel-login button[type=submit]')
            page.wait_for_selector('.mc-admin')
            admin_ready(page)
            for path in EN_ADMIN:
                admin_nav(page, path)
                if path.endswith('a-002'):
                    page.click('#editor-lang-tab-en')
                    page.wait_for_timeout(300)
                print(f'  en {path} {theme} {width}', file=sys.stderr, flush=True)
                rows.append({'path': path + (' [English]' if path.endswith('a-002') else ''), 'theme': theme,
                             'width': width, **axe_admin(page), 'scroll': page.evaluate(OVERFLOW)['scroll'],
                             'lang': page.evaluate('document.documentElement.lang')})
            context.close()
    report['en'] = {'axe': rows}


# ───────────────────────────────────────────────────────────────── forms (B6)
def latest_mail(template, after):
    """`MAIL_DIR`-ის უახლესი წერილი შაბლონით (file გადამცემი) → ბმული (`#token=`)."""
    end = time.time() + 15
    while time.time() < end:
        files = sorted(p for p in MAIL_DIR.glob(f'*-{template}-*.txt') if p.stat().st_mtime_ns > after)
        if files:
            text = files[-1].read_text(encoding='utf-8')
            for line in text.splitlines():
                if '#token=' in line and line.startswith('http'):
                    return line.strip()
        time.sleep(0.2)
    raise RuntimeError(f'წერილი არ მოვიდა: {template}')


def check_state(page, rows, state, theme, width):
    print(f'  forms {state} {theme} {width}', file=sys.stderr, flush=True)
    rows.append({'state': state, 'theme': theme, 'width': width, **run_axe(page),
                 'scroll': page.evaluate(OVERFLOW)['scroll']})


def audit_forms(browser, report):
    themes = [t for t in os.environ.get('AUDIT_THEMES', ','.join(THEMES)).split(',') if t]
    rows = []
    flow = []
    for theme in themes:
        for width in WIDTHS:
            context, page = new_page(browser, width, theme)
            # კონტაქტი — მხოლოდ კლავიატურით: ველზე ფოკუსი, აკრეფა, Tab, Space (თანხმობა), Enter
            goto(page, '/contact')
            page.focus('#cf-name')
            page.keyboard.type('[სახელი გვარი]')
            page.keyboard.press('Tab')
            assert page.evaluate('document.activeElement.id') == 'cf-contact', 'Tab: სახელი → კონტაქტი'
            page.keyboard.type(f'audit-{theme}-{width}@example.org')
            page.focus('#cf-consent')
            page.keyboard.press('Space')
            page.focus('#cf-name')
            page.keyboard.press('Enter')
            page.wait_for_selector('.mc-contact-confirm[role="status"]')
            focused = page.evaluate('document.activeElement.textContent')
            captcha = page.evaluate("() => /captcha/i.test(document.body.innerHTML)")
            flow.append({'step': 'contact', 'theme': theme, 'width': width, 'focus': focused, 'captcha': captcha})
            check_state(page, rows, '/contact → დადასტურება', theme, width)

            # გამოწერა — „შეამოწმე ელფოსტა“
            goto(page, '/news')
            after = time.time_ns()
            email = f'audit-{theme}-{width}@example.org'
            page.fill('.mc-subscribe input[type="email"]', email)
            page.keyboard.press('Enter')
            page.wait_for_function("() => /@/.test(document.querySelector('.mc-subscribe__status')?.textContent ?? '')")
            check_state(page, rows, '/news → შეამოწმე ელფოსტა', theme, width)

            if MAIL_DIR:
                link = latest_mail('subscribe-confirm', after)
                page.goto(link)
                page.wait_for_function(READY)
                page.wait_for_timeout(250)
                check_state(page, rows, '/subscribe/confirm (წერილიდან)', theme, width)
                after = time.time_ns()
                page.click('.mc-subscription__form button[type="submit"]')
                page.wait_for_selector('.mc-subscription__done[role="status"]')
                check_state(page, rows, '/subscribe/confirm → დადასტურდა', theme, width)
                welcome = latest_mail('subscribe-welcome', after)
                # იგივე ბმული ხელახლა → გამოყენებულია (alert)
                page.goto(PREVIEW + '/ar-arsebuli')
                page.goto(link)
                page.wait_for_function(READY)
                page.click('.mc-subscription__form button[type="submit"]')
                page.wait_for_selector('.mc-subscription__alert[role="alert"]')
                check_state(page, rows, '/subscribe/confirm → გამოყენებული (alert)', theme, width)
                page.goto(welcome)
                page.wait_for_function(READY)
                page.click('.mc-subscription__form button[type="submit"]')
                page.wait_for_selector('.mc-subscription__done[role="status"]')
                check_state(page, rows, '/subscribe/unsubscribe → გაუქმდა', theme, width)
                flow.append({'step': 'subscribe', 'theme': theme, 'width': width,
                             'confirmLink': link.split('#')[0], 'unsubscribeLink': welcome.split('#')[0]})
            context.close()
    report['forms'] = {'api': True, 'axe': rows, 'flow': flow}


# ───────────────────────────────────────────────────────────────── keyboard
def tab_walk(page, limit=260):
    stops = []
    page.evaluate("() => { document.activeElement?.blur(); window.scrollTo(0, 0); }")
    for _ in range(limit):
        page.keyboard.press('Tab')
        info = page.evaluate(FOCUS)
        if info is None:
            continue
        if info['seen']:
            break
        stops.append(info)
    return stops


def audit_keyboard(browser, report):
    pages = {}
    for path in PAGES:
        for width in WIDTHS:
            context, page = new_page(browser, width, 'light')
            goto(page, path)
            stops = tab_walk(page)
            bad = [s for s in stops if not (s['ring'] or s['forced'])]
            hidden = [s for s in stops if not s['inView'] or s['obscured']]
            small = [s for s in stops if min(s['size']) < 24]
            pages[f'{path} @{width}'] = {
                'stops': len(stops), 'noRing': bad[:5], 'notVisible': hidden[:5], 'under24': small[:5],
            }
            context.close()
    report['keyboard'] = pages

    scenarios = {}
    # სლაიდერი: ← → Home End მხოლოდ ფოკუსისას
    context, page = new_page(browser, 1440, 'light')
    goto(page, '/development')
    status = lambda: page.locator('.mc-slider__status').inner_text().split(':')[0]
    page.evaluate('() => document.activeElement?.blur()')
    page.keyboard.press('ArrowRight')
    outside = status()
    page.get_by_role('button', name='შემდეგი სლაიდი').focus()
    page.keyboard.press('ArrowRight')
    after_right = status()
    page.keyboard.press('End')
    after_end = status()
    page.keyboard.press('Home')
    after_home = status()
    page.locator('.mc-slider__dot').nth(0).focus()
    page.keyboard.press('ArrowRight')
    dot_focus = page.evaluate("() => document.activeElement?.getAttribute('aria-current')")
    # swipe (touch pointer events)
    page.evaluate("""() => {
      const v = document.querySelector('.mc-slider__viewport');
      const o = { bubbles: true, pointerId: 7, pointerType: 'touch', isPrimary: true };
      v.dispatchEvent(new PointerEvent('pointerdown', { ...o, clientX: 400, clientY: 400 }));
      v.dispatchEvent(new PointerEvent('pointerup', { ...o, clientX: 300, clientY: 405 }));
    }""")
    after_swipe = status()
    scenarios['slider'] = {
        'arrowOutside': outside, 'arrowRight': after_right, 'end': after_end, 'home': after_home,
        'dotFocusFollows': dot_focus, 'swipeLeft': after_swipe,
    }
    # სერიის ბარათი → ფოკუსი h2-ზე
    page.get_by_role('link', name='[მსოფლხედვა]').first.click()
    page.wait_for_function("() => document.activeElement?.id === 'deck-title'")
    scenarios['seriesFocus'] = page.evaluate('() => document.activeElement.textContent')
    context.close()

    # ვიდეო: ბარათი → ფოკუსი ფლეიერზე; ფაილის გარეშე — ჩართვა aria-disabled
    context, page = new_page(browser, 1440, 'light')
    goto(page, '/videos')
    page.get_by_role('link', name='[სპორტი, რომელმაც ცხოვრება შეცვალა]').click()
    page.wait_for_function("() => document.activeElement?.getAttribute('role') === 'region'")
    scenarios['videoFocus'] = page.evaluate("() => document.activeElement.getAttribute('aria-label')")
    scenarios['pendingPlay'] = page.get_by_role('button', name='ჩართვა').get_attribute('aria-disabled')
    context.close()
    report['keyboardScenarios'] = scenarios


# ───────────────────────────────────────────────────────────────── motion
def audit_motion(browser, report):
    out = {}
    for reduce in (False, True):
        context, page = new_page(browser, 1440, 'light', reduce=reduce)
        goto(page, '/development')
        page.get_by_role('button', name='შემდეგი სლაიდი').click()
        slide = page.evaluate("""() => { const s = getComputedStyle(document.querySelector('.mc-slide'));
          const p = getComputedStyle(document.querySelector('.mc-slider__pip'));
          return { animation: s.animationName, duration: s.animationDuration, pip: p.transitionDuration }; }""")
        goto(page, '/')
        page.mouse.move(5, 5)
        moving_home = page.evaluate(MOTION)
        cta = page.evaluate("() => getComputedStyle(document.querySelector('.mc-btn--cta')).transitionDuration")
        out['reduce' if reduce else 'no-preference'] = {'slide': slide, 'ctaTransition': cta,
                                                         'movingOnHome': moving_home if reduce else None}
        context.close()
    report['motion'] = out


# ───────────────────────────────────────────────────────────────── reflow
def audit_reflow(browser, report):
    rows = []
    cases = [('320px', 320, 100), ('720px (1440 @ 200%)', 720, 100), ('1440 · შრიფტი 200%', 1440, 200),
             ('390 · შრიფტი 200%', 390, 200)]
    for label, width, size in cases:
        for path in PAGES + ['/__kit']:
            base = DEV if path == '/__kit' else PREVIEW
            context = browser.new_context(viewport={'width': width, 'height': 800})
            context.add_init_script(PREFS % (size, 'light', 'false'))
            page = context.new_page()
            page.set_default_timeout(20000)
            goto(page, path, base)
            o = page.evaluate(OVERFLOW)
            rows.append({'case': label, 'path': path, 'scroll': o['scroll'], 'offenders': o['offenders'],
                         'clipped': page.evaluate(CLIPPED)})
            context.close()
    report['reflow'] = rows


# ───────────────────────────────────────────────────────────────── media (ფაილით)
INJECT = """async () => {
  const { setContentAdapter } = await import('/src/content/adapter.js');
  const { createMockAdapter } = await import('/src/content/mock/index.js');
  const base = createMockAdapter();
  // F10-დან კონტენტის ვიდეო YouTube-ზეა — native ობიექტი (`sources`, `youtube`-ის გარეშე) მხოლოდ აქ
  // (`resolveSource`: `sources` და არა `youtube` → nativeSource)
  const files = ({ youtube, ...v }) => ({ ...v,
    poster: { src: null, alt: '', ratio: '16:9' },
    sources: [{ src: '/__fixtures/video.webm', type: 'video/webm' }],
    captions: v.captions.map((c) => ({ ...c, src: '/__fixtures/captions.vtt' })),
    audioDescription: { ...v.audioDescription, src: '/__fixtures/ad.webm' },
    signLanguage: { ...v.signLanguage, src: '/__fixtures/sign.webm' } });
  setContentAdapter({ ...base, getVideo: async (slug) => files(await base.getVideo(slug)) });
}"""


def media_page(browser, fixtures, width=1440, theme='light', reduce=False):
    context, page = new_page(browser, width, theme, reduce=reduce)

    def serve(route):
        # Range-ის მხარდაჭერა: მის გარეშე Chromium-ის მედია seek-ს ვერ აკეთებს (0-ზე ბრუნდება)
        name = route.request.url.split('/__fixtures/')[1].split('?')[0]
        body = (fixtures / name).read_bytes()
        mime = 'text/vtt' if name.endswith('.vtt') else (mimetypes.guess_type(name)[0] or 'video/webm')
        headers = {'Content-Type': mime, 'Accept-Ranges': 'bytes'}
        wanted = route.request.headers.get('range')
        if wanted and wanted.startswith('bytes='):
            start, _, end = wanted[6:].partition('-')
            start = int(start or 0)
            end = min(int(end) if end else len(body) - 1, len(body) - 1)
            headers['Content-Range'] = f'bytes {start}-{end}/{len(body)}'
            route.fulfill(status=206, body=body[start:end + 1], headers=headers)
        else:
            route.fulfill(status=200, body=body, headers=headers)

    page.route('**/__fixtures/**', serve)
    goto(page, '/contact', DEV)
    page.evaluate(INJECT)
    page.evaluate(f"""() => {{ history.pushState({{}}, '', '/videos?video={SPORT}');
      dispatchEvent(new PopStateEvent('popstate')); }}""")
    page.wait_for_selector('.mc-player video')
    page.wait_for_function("() => document.querySelector('.mc-player video').readyState >= 1")
    return context, page


def audit_media(browser, fixtures, report):
    out = {'axe': []}
    context, page = media_page(browser, fixtures)
    v = lambda js: page.evaluate(f"() => {{ const v = document.querySelector('.mc-player__video'); "
                                  f"const s = document.querySelector('.mc-player__sign'); "
                                  f"const a = document.querySelector('.mc-player audio'); return {js}; }}")
    region = page.get_by_role('region', name='ვიდეოფლეიერი: [სპორტი, რომელმაც ცხოვრება შეცვალა]')
    out['autoplay'] = v('v.paused')
    out['captionsTrackMode'] = v("[...v.textTracks].map((t) => t.mode)")
    region.focus()
    page.keyboard.press('k')
    page.wait_for_timeout(1500)
    out['afterK'] = v('{ paused: v.paused, t: +v.currentTime.toFixed(2), signPaused: s.paused, '
                      'drift: +Math.abs(s.currentTime - v.currentTime).toFixed(2) }')
    out['captionOverlay'] = page.locator('.mc-player__caption').all_inner_texts()
    page.keyboard.press('ArrowRight')
    page.wait_for_timeout(300)
    out['afterArrowRight'] = v('+v.currentTime.toFixed(1)')
    page.keyboard.press('m')
    out['afterM'] = v('v.muted')
    page.keyboard.press('m')
    page.keyboard.press('c')
    page.wait_for_timeout(200)
    out['afterC'] = page.locator('.mc-player__caption').count()
    page.keyboard.press('c')
    page.get_by_role('button', name='აუდიოაღწერა').click()
    page.wait_for_timeout(800)
    out['audioDescription'] = v('{ videoMuted: v.muted, adPaused: a.paused, '
                                'drift: +Math.abs(a.currentTime - v.currentTime).toFixed(2) }')
    page.get_by_role('button', name='აუდიოაღწერა').click()
    page.get_by_role('button', name='ტრანსკრიპტი').click()
    page.get_by_role('button', name='გადასვლა: 00:04').click()
    page.wait_for_timeout(400)
    out['transcriptSeek'] = v('+v.currentTime.toFixed(1)')
    slider = page.get_by_role('slider', name='პროგრესი')
    out['valuetext'] = slider.get_attribute('aria-valuetext')
    slider.focus()
    page.keyboard.press('Home')
    page.wait_for_timeout(200)
    out['sliderHome'] = v('+v.currentTime.toFixed(1)')
    page.get_by_role('button', name='სრული ეკრანი').click()
    page.wait_for_timeout(400)
    out['fullscreen'] = page.evaluate("() => document.fullscreenElement?.getAttribute('role') ?? null")
    if out['fullscreen']:
        page.keyboard.press('Escape')
    page.keyboard.press('k')
    context.close()

    for theme in THEMES:
        for width in WIDTHS:
            context, page = media_page(browser, fixtures, width, theme)
            page.get_by_role('region', name='ვიდეოფლეიერი: [სპორტი, რომელმაც ცხოვრება შეცვალა]').focus()
            page.keyboard.press('k')
            page.wait_for_timeout(1200)
            page.keyboard.press('k')
            if width == 390:
                page.get_by_role('button', name='მეტი').click()
            else:
                page.get_by_role('button', name='ტრანსკრიპტი').click()
            out['axe'].append({'theme': theme, 'width': width, 'layout': page.evaluate(
                "() => document.querySelector('.mc-player').dataset.layout"), **run_axe(page),
                'scroll': page.evaluate(OVERFLOW)['scroll']})
            if width == 390 and theme == 'light':
                page.keyboard.press('Escape')
                out['compactEsc'] = page.evaluate("() => document.activeElement?.textContent?.trim()")
            context.close()

    context, page = media_page(browser, fixtures, 1440, 'light', reduce=True)
    out['reducedProgress'] = page.evaluate(
        "() => getComputedStyle(document.querySelector('.mc-progress__fill')).transitionDuration")
    context.close()
    report['media'] = out


# ───────────────────────────────────────────────────────────────── placeholders (რენდერი)
PLACEHOLDERS = """() => {
  const out = new Set();
  const add = (text) => { for (const [, inner] of (text || '').matchAll(/\\[([^\\[\\]]*[\\u10D0-\\u10FF\\d][^\\[\\]]*)\\]/g)) out.add(inner.trim()); };
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) add(n.textContent);
  for (const el of document.querySelectorAll('[aria-label], [title]'))
    ['aria-label', 'title'].forEach((a) => add(el.getAttribute(a)));
  // alt — ფოტოს აღწერა (ტიპი „ფოტო / კადრი“)
  const before = new Set(out);
  for (const el of document.querySelectorAll('[alt]')) add(el.getAttribute('alt'));
  return [...out].map((text) => (before.has(text) ? text : 'ფოტო: ' + text));
}"""

TYPES = [
    ('ფოტო / კადრი', r'^(ფოტო|ვიდეოს კადრი|კადრი|ლოგო|ფოტოს)|ფოტო:|კადრი:'),
    ('სახელი', r'^(სახელი|გვარი|ავტორი|თანამდებობა|პარტნიორი)'),
    ('რიცხვი', r'^(\d+|N|0+|00 KB)$'),
    ('თარიღი / დრო', r'^(თარიღი|წელი|\d\d:\d\d|დღე, საათი|თვეში)|(დღეში|საათში|წუთში)$'),
    ('კონტაქტი', r'^(ტელეფონი|ელფოსტა|მისამართი|ნომერი|მესენჯერი)( |:|$)|^@'),
    ('ბმული / URL', r'^(ბმული|en-ვერსიის)'),
    ('ფაილი', r'(^|, )PDF$'),
]


def classify(text):
    import re
    for name, pattern in TYPES:
        if re.search(pattern, text):
            return name
    return 'ტექსტი'


def audit_placeholders(browser, report):
    per_page = {}
    every = set()
    for path in PAGES + ['/ar-arsebuli']:
        context, page = new_page(browser, 1440, 'light')
        goto(page, path)
        # დამალული ბლოკებიც (ტექსტური ვერსია, ტრანსკრიპტი) DOM-შია ან იხსნება
        for name in ('ტექსტური ვერსია',):
            if page.get_by_role('button', name=name).count():
                page.get_by_role('button', name=name).first.click()
        found = page.evaluate(PLACEHOLDERS)
        per_page[path] = len(found)
        every.update(found)
        context.close()
    by_type = {}
    for text in every:
        by_type.setdefault(classify(text), []).append(text)
    report['placeholders'] = {
        'perPage': per_page,
        'unique': len(every),
        'byType': {k: {'count': len(v), 'examples': sorted(v)[:3]} for k, v in sorted(by_type.items())},
    }


# ───────────────────────────────────────────────────────────────── bundle
def audit_bundle(report):
    assets = ROOT / 'dist' / 'assets'
    rows = []
    for file in sorted(assets.glob('*')):
        if file.suffix not in ('.js', '.css'):
            continue
        raw = file.read_bytes()
        rows.append({'file': file.name, 'kB': round(len(raw) / 1000, 2),
                     'gzip': round(len(gzip.compress(raw, 9)) / 1000, 2)})
    report['bundle'] = rows


def make_fixtures(target):
    target.mkdir(parents=True, exist_ok=True)
    run = lambda *a: subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', *a], check=True)
    run('-f', 'lavfi', '-i', 'testsrc2=size=480x270:rate=24:duration=20', '-f', 'lavfi', '-i',
        'sine=frequency=440:duration=20', '-c:v', 'libvpx-vp9', '-b:v', '200k', '-c:a', 'libopus',
        '-shortest', str(target / 'video.webm'))
    run('-f', 'lavfi', '-i', 'smptebars=size=240x180:rate=24:duration=20', '-c:v', 'libvpx-vp9',
        '-b:v', '80k', '-an', str(target / 'sign.webm'))
    run('-f', 'lavfi', '-i', 'sine=frequency=660:duration=20', '-c:a', 'libopus', str(target / 'ad.webm'))
    (target / 'captions.vtt').write_text(
        'WEBVTT\n\n00:00.000 --> 00:03.000\n<v [სახელი]>[პირველი ფრაზა — სუბტიტრი]\n\n'
        '00:03.000 --> 00:08.000\n[მეორე ფრაზა: გუნდმა მაშინვე მიმიღო]\n[მეორე ხაზი]\n\n'
        '00:08.000 --> 00:20.000\n[მესამე ფრაზა]\n', encoding='utf-8')


# ───────────────────────────────────────────────────────────────── youtube (F10)
# YouTube-ის ქსელი sandbox-ში მიუწვდომელია: IFrame API, youtube-nocookie.com და i.ytimg.com
# page.route-ით ყალბდება. ყალბი API iframe-ს ქმნის და დროს Date.now()-ით ითვლის.
YT_FAKE_API = """
(() => {
  class Player {
    constructor(host, o) {
      this.o = o; this.t = 0; this.s = -1; this.start = 0;
      const f = document.createElement('iframe');
      f.src = o.host + '/embed/' + o.videoId + '?controls=0&enablejsapi=1';
      f.setAttribute('allow', 'autoplay; encrypted-media');
      host.replaceWith(f); this.f = f;
      setTimeout(() => o.events.onReady && o.events.onReady({ target: this }), 60);
    }
    getIframe() { return this.f; }
    emit(s) { this.s = s; this.o.events.onStateChange && this.o.events.onStateChange({ data: s }); }
    playVideo() { this.start = Date.now() - this.t * 1000; this.emit(1); }
    pauseVideo() { this.t = this.getCurrentTime(); this.emit(2); }
    seekTo(t) { this.t = t; this.start = Date.now() - t * 1000; }
    loadVideoById(v) { this.t = v.startSeconds || 0; this.playVideo(); }
    cueVideoById(v) { this.t = v.startSeconds || 0; this.emit(5); }
    getCurrentTime() { return this.s === 1 ? (Date.now() - this.start) / 1000 : this.t; }
    getDuration() { return 270; }
    setVolume() {} mute() {} unMute() {} setPlaybackRate() {}
    destroy() { this.f.remove(); }
  }
  window.YT = { Player };
  if (typeof window.onYouTubeIframeAPIReady === 'function') window.onYouTubeIframeAPIReady();
})();
"""
YT_FAKE_EMBED = '<!doctype html><html lang="en"><head><title>[YouTube embed]</title></head><body style="margin:0;background:#000"></body></html>'
YT_FAKE_THUMB = ('<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">'
                 '<rect width="1280" height="720" fill="#0A1D38"/></svg>')
YT_TEST_ID = 'TestVideo01'
YT_TEST_AD = 'TestVidAD00'
YT_VTT = 'WEBVTT\n\n00:00:00.500 --> 00:00:06.000\n[სუბტიტრი: პირველი ფრაზა]\n\n00:00:06.000 --> 00:00:12.000\n[სუბტიტრი: მეორე ფრაზა]\n'


def youtube_routes(context, log):
    def api(route):
        log.append(route.request.url)
        route.fulfill(status=200, content_type='text/javascript', body=YT_FAKE_API)

    def embed(route):
        log.append(route.request.url)
        route.fulfill(status=200, content_type='text/html', body=YT_FAKE_EMBED)

    def thumb(route):
        route.fulfill(status=200, content_type='image/svg+xml', body=YT_FAKE_THUMB)

    context.route('https://www.youtube.com/**', api)
    context.route('https://www.youtube-nocookie.com/**', embed)
    context.route('https://i.ytimg.com/**', thumb)


def run_axe_no_frames(page):
    """axe ჩვენს გვერდზე; iframe-ის შიგთავსი გარეა (YouTube) — `iframes: false`."""
    if not page.evaluate('() => !!window.axe'):
        inject_axe(page)
    return page.evaluate("""async () => {
      // frame-tested — „axe iframe-შიც გაეშვა?“ (დაფარვის შემოწმება, არა WCAG-ის წესი): YouTube-ის iframe
      // გარე origin-ია და ჩვენი კონტროლის მიღმაა
      const r = await axe.run(document, { iframes: false, rules: { 'frame-tested': { enabled: false } },
        resultTypes: ['violations', 'incomplete'] });
      const pick = (list) => list.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length,
        targets: v.nodes.slice(0, 3).map((n) => n.target.join(' ')) }));
      return { violations: pick(r.violations), incomplete: pick(r.incomplete) };
    }""") | {'csp': csp_of(page)}


def open_video_editor(page, video):
    admin_login(page, EDITOR)
    admin_nav(page, f"/admin/videos/{video}")


def fill_youtube(page, n=0):
    # B7: რეალურ API-ზე ვიდეოები ერთ ბაზაშია — id თითოეულზე სხვაა (გამოყენებული id-ის გაფრთხილების გარეშე)
    page.fill('#f-youtube-id', f'https://youtu.be/{YT_TEST_ID[:-2]}{n:02d}?t=4')
    page.fill('#f-youtube-adId', f'https://www.youtube.com/watch?v={YT_TEST_AD[:-2]}{n:02d}')
    page.set_input_files('#f-captions input[type=file]',
                         files=[{'name': 'ka.vtt', 'mimeType': 'text/vtt', 'buffer': YT_VTT.encode('utf-8')}])
    page.wait_for_selector('text=ფაილი ატვირთულია')
    page.wait_for_timeout(300)


def audit_youtube(browser, report):
    rows = []
    # 1. /videos, /en/videos — seed (id-ის ჩანაცვლება): ჩანაცვლების ჩარჩო, ჩართვა aria-disabled
    for path in ['/videos', '/en/videos']:
        for theme in THEMES:
            for width in WIDTHS:
                context, page = new_page(browser, width, theme)
                log = []
                youtube_routes(context, log)
                goto(page, path)
                print(f'  youtube {path} {theme} {width}', file=sys.stderr, flush=True)
                rows.append({'path': path, 'state': 'seed', 'theme': theme, 'width': width, **run_axe(page),
                             'scroll': page.evaluate(OVERFLOW)['scroll'], 'youtubeRequests': len(log)})
                context.close()
    # 2. ვიდეოს რედაქტორი — ბმული ჩასმული (id + კადრი), VTT ატვირთული; 3. გამოქვეყნება → facade → ჩართვა
    n = 0
    for theme in THEMES:
        for width in WIDTHS:
            n += 1
            demo = DEMO['videos'][n]
            context, page = new_page(browser, width, theme)
            log = []
            youtube_routes(context, log)
            print(f'  youtube editor {theme} {width}', file=sys.stderr, flush=True)
            api_log = []
            page.on('response', lambda r: api_log.append(f'{r.request.method} {r.url.split("/api/")[-1]} {r.status}')
                    if '/api/admin/' in r.url and r.status >= 400 else None)
            open_video_editor(page, demo['id'])
            rows.append({'path': '/admin/videos/:id', 'state': 'editor-empty', 'theme': theme, 'width': width,
                         **axe_admin(page), 'scroll': page.evaluate(OVERFLOW)['scroll']})
            fill_youtube(page, n)
            title_before = page.input_value('#f-title')
            rows.append({'path': '/admin/videos/:id', 'state': 'editor-filled', 'theme': theme, 'width': width,
                         **axe_admin(page), 'scroll': page.evaluate(OVERFLOW)['scroll'],
                         'titleUnchanged': page.input_value('#f-title') == title_before,
                         'youtubeRequests': len(log)})
            page.click('button:has-text("გამოქვეყნება")')
            try:
                page.wait_for_selector('text=გამოქვეყნდა', timeout=15000)
            except Exception:
                # დიაგნოსტიკა: ბლოკერის ჯამი / სერვერის შეცდომა ტექსტად
                summary = page.locator('.mc-error-summary, .mc-editor__message, [role="alert"]').all_inner_texts()
                raise RuntimeError(f'ვიდეო არ გამოქვეყნდა: {summary} {api_log}')
            admin_nav(page, f"/videos?video={demo['slug']}")
            page.wait_for_selector('.mc-player__facade')
            page.wait_for_timeout(300)
            facade = {
                'iframe': page.evaluate("() => document.querySelectorAll('iframe').length"),
                'apiScript': page.evaluate("() => !!document.querySelector('script[src*=\"iframe_api\"]')"),
                'requests': len(log),
            }
            rows.append({'path': '/videos?video=…', 'state': 'facade', 'theme': theme, 'width': width,
                         **run_axe_no_frames(page), 'scroll': page.evaluate(OVERFLOW)['scroll'], **facade})
            page.focus('.mc-player__facade')
            page.keyboard.press('Enter')
            page.wait_for_selector('iframe.mc-player__iframe')
            page.wait_for_selector('.mc-player__band-text:has-text("[სუბტიტრი: პირველი ფრაზა]")', timeout=8000)
            live = page.evaluate("""() => {
              const f = document.querySelector('iframe.mc-player__iframe');
              const band = document.querySelector('.mc-player__band');
              const a = document.activeElement;
              return { title: f.title, tabindex: f.getAttribute('tabindex'), src: f.src,
                       referrer: f.getAttribute('referrerpolicy'),
                       bandOutsideStage: !band.closest('.mc-player__stage'),
                       focus: a && (a.getAttribute('aria-label') || a.textContent),
                       stage: (() => { const r = document.querySelector('.mc-player__stage').getBoundingClientRect();
                                       return [Math.round(r.width), Math.round(r.height)]; })() };
            }""")
            # კლავიატურა: K — პაუზა, C — სუბტიტრი გამორთვა / ჩართვა
            page.focus('.mc-player')
            page.keyboard.press('k')
            page.wait_for_timeout(200)
            live['pausedByK'] = page.evaluate("() => !!document.querySelector('.mc-player__play[aria-label=\"ჩართვა\"]')")
            page.keyboard.press('c')
            page.wait_for_timeout(200)
            live['bandHiddenByC'] = page.evaluate("() => !document.querySelector('.mc-player__band')")
            page.keyboard.press('c')
            rows.append({'path': '/videos?video=…', 'state': 'live', 'theme': theme, 'width': width,
                         **run_axe_no_frames(page), 'scroll': page.evaluate(OVERFLOW)['scroll'], **live})
            context.close()
    report['youtube'] = rows


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--out', default='audit.json')
    parser.add_argument('--fixtures', default=str(ROOT / '.audit-fixtures'))
    parser.add_argument('--only', default='axe,keyboard,motion,reflow,placeholders,media,bundle,admin,en,youtube,forms')
    parser.add_argument('--make-fixtures', action='store_true')
    args = parser.parse_args()
    fixtures = pathlib.Path(args.fixtures)
    if args.make_fixtures or not (fixtures / 'video.webm').exists():
        make_fixtures(fixtures)
    parts = set(args.only.split(','))
    report = {}
    procs = start_servers(parts)
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
            report['chromium'] = browser.version
            report['axeCore'] = json.loads((AXE.parent / 'package.json').read_text())['version']
            report['api'] = True
            report['base'] = PREVIEW
            if parts & {'admin', 'youtube'}:
                prepare_admin_fixtures(browser)
                report['demo'] = DEMO
            for name, fn in [('axe', audit_axe), ('keyboard', audit_keyboard), ('motion', audit_motion),
                             ('reflow', audit_reflow), ('placeholders', audit_placeholders),
                             ('admin', audit_admin), ('en', audit_en), ('youtube', audit_youtube),
                             ('forms', audit_forms)]:
                if name in parts:
                    t0 = time.time()
                    fn(browser, report)
                    print(f'✓ {name} ({time.time() - t0:.0f}s)', file=sys.stderr)
            if 'media' in parts:
                audit_media(browser, fixtures, report)
                print('✓ media', file=sys.stderr)
            browser.close()
        if 'bundle' in parts:
            audit_bundle(report)
    finally:
        for proc in procs:
            proc.terminate()
    pathlib.Path(args.out).write_text(json.dumps(report, ensure_ascii=False, indent=1), encoding='utf-8')
    print(f'→ {args.out}', file=sys.stderr)


if __name__ == '__main__':
    main()
