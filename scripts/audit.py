#!/usr/bin/env python3
"""
F7: საბოლოო აუდიტი Chromium-ში (Playwright + axe-core).

  npm run build && python3 scripts/audit.py [--out audit.json] [--fixtures DIR] [--only axe,keyboard,…]

წინაპირობა: `pip install playwright` + `python -m playwright install chromium`; axe-core
node_modules-შია (vitest-axe-ის დამოკიდებულება). სკრიპტი თავად უშვებს `vite preview`-ს (4173, build)
და `vite`-ს (5173, მხოლოდ /__kit და ფლეიერი ფაილით).

ნაწილები:
- axe     — ყველა როუტი × light / dark / contrast × 1440 / 390 (ფერის კონტრასტით), + ჰორიზ. სქროლი;
- keyboard — Tab-ით გავლა 1440 და 390: რგოლი ჩანს, ელემენტი ეკრანზეა და არ იფარება, ციკლი;
            სლაიდერის და ფლეიერის სცენარები;
- motion  — prefers-reduced-motion: reduce → ხანგრძლივობა 0; no-preference → §7-ის მნიშვნელობები;
- reflow  — 320px (100%), 720px (1440 × 200% zoom), data-size 200 (1440 და 390);
- media   — ფლეიერი რეალური ფაილით (ffmpeg-ის WebM + VTT, `--fixtures`): დაკვრა, PiP-ის სინქრონი,
            სუბტიტრი overlay-ში, აუდიოაღწერა, მალსახმობები, ტრანსკრიპტი, axe;
- bundle  — dist/assets-ის gzip ზომები.

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
import sys
import time

from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parents[1]
AXE = ROOT / 'node_modules' / 'axe-core' / 'axe.min.js'
PREVIEW = 'http://127.0.0.1:4173'
DEV = 'http://127.0.0.1:5173'

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


def start_servers():
    env = {**os.environ, 'BROWSER': 'none'}
    procs = [
        subprocess.Popen(['npx', 'vite', 'preview', '--host', '127.0.0.1', '--port', '4173', '--strictPort'], cwd=ROOT, env=env,
                         stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL),
        subprocess.Popen(['npx', 'vite', '--host', '127.0.0.1', '--port', '5173', '--strictPort'], cwd=ROOT, env=env,
                         stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL),
    ]
    wait_port(4173)
    wait_port(5173)
    return procs


def new_page(browser, width=1440, theme='light', size=100, spacing=False, reduce=False, base=PREVIEW):
    context = browser.new_context(viewport={'width': width, 'height': WIDTHS.get(width, 900)},
                                  reduced_motion='reduce' if reduce else 'no-preference',
                                  color_scheme='dark' if theme == 'dark' else 'light')
    context.add_init_script(PREFS % (size, theme, 'true' if spacing else 'false'))
    page = context.new_page()
    page.set_default_timeout(20000)
    return context, page


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


def run_axe(page):
    if not page.evaluate('() => !!window.axe'):
        page.add_script_tag(path=str(AXE))
    return page.evaluate("""async () => {
      const r = await axe.run(document, { resultTypes: ['violations', 'incomplete'] });
      const pick = (list) => list.map((v) => ({ id: v.id, impact: v.impact,
        wcag: v.tags.some((t) => /^wcag/.test(t)), nodes: v.nodes.length,
        targets: v.nodes.slice(0, 3).map((n) => n.target.join(' ')) }));
      return { violations: pick(r.violations), incomplete: pick(r.incomplete) };
    }""")


# ───────────────────────────────────────────────────────────────── axe
def audit_axe(browser, report):
    rows = []
    for path in ROUTES:
        for theme in THEMES:
            for width in WIDTHS:
                context, page = new_page(browser, width, theme)
                goto(page, path)
                print(f'  axe {path} {theme} {width}', file=sys.stderr, flush=True)
                result = run_axe(page)
                overflow = page.evaluate(OVERFLOW)
                rows.append({'path': path, 'theme': theme, 'width': width, **result,
                             'scroll': overflow['scroll']})
                context.close()
    # /__kit — dev-ში (build-ში არ არის)
    for theme in ['light']:
        for width in WIDTHS:
            context, page = new_page(browser, width, theme)
            goto(page, '/__kit', DEV)
            page.wait_for_timeout(800)
            rows.append({'path': '/__kit', 'theme': 'all', 'width': width, **run_axe(page),
                         'scroll': page.evaluate(OVERFLOW)['scroll']})
            context.close()
    report['axe'] = rows


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
  const files = (v) => ({ ...v,
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


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--out', default='audit.json')
    parser.add_argument('--fixtures', default=str(ROOT / '.audit-fixtures'))
    parser.add_argument('--only', default='axe,keyboard,motion,reflow,placeholders,media,bundle')
    parser.add_argument('--make-fixtures', action='store_true')
    args = parser.parse_args()
    fixtures = pathlib.Path(args.fixtures)
    if args.make_fixtures or not (fixtures / 'video.webm').exists():
        make_fixtures(fixtures)
    parts = set(args.only.split(','))
    report = {}
    procs = start_servers()
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
            report['chromium'] = browser.version
            report['axeCore'] = json.loads((AXE.parent / 'package.json').read_text())['version']
            for name, fn in [('axe', audit_axe), ('keyboard', audit_keyboard), ('motion', audit_motion),
                             ('reflow', audit_reflow), ('placeholders', audit_placeholders)]:
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
