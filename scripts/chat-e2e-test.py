# -*- coding: utf-8 -*-
"""E2E browser test: seeker applies -> employer accepts -> two-way live chat.

Run:  python chat-e2e-test.py   (from project root; servers must be running)
Uses the installed system Chrome via playwright (channel='chrome').
"""
import json
import os
import re
import sys

from playwright.sync_api import sync_playwright, TimeoutError as PWTimeout

BASE = 'http://localhost:3000'
SEEKER_EMAIL = 'test-seeker@ishzone.uz'
EMP_EMAIL = 'test-employer@ishzone.uz'
PWD = 'TestPass123!'
COVER_MSG = 'Assalomu alaykum! Men frontend dasturchiman, bu vakansiyaga ariza topshirmoqchiman.'
EMP_REPLY = 'Assalomu alaykum! Arizaingizni qabul qildik. Intervyuga taklif qilamiz.'
SEEKER_REPLY = 'Rahmat! Tayyorman.'

SHOTS = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'e2e-shots')
os.makedirs(SHOTS, exist_ok=True)

results = []
console_errors = []


def rec(name, ok, detail=''):
    results.append({'name': name, 'passed': bool(ok), 'detail': str(detail)[:300]})
    print(('  PASS  ' if ok else '  FAIL  ') + name + ('  |  ' + str(detail)[:200] if detail else ''))


def step(name):
    print('\n== ' + name + ' ==')


def safe(fn, default=None):
    try:
        return fn()
    except Exception as e:  # noqa: BLE001
        rec('EXCEPTION: ' + str(e)[:120], False)
        return default


with sync_playwright() as p:
    browser = p.chromium.launch(channel='chrome', headless=True)
    ctx = browser.new_context(viewport={'width': 1440, 'height': 950}, locale='uz')
    page = ctx.new_page()
    page.on('console', lambda m: console_errors.append(m.text) if m.type == 'error' else None)
    page.on('pageerror', lambda e: console_errors.append(str(e)))

    def shot(name):
        try:
            page.screenshot(path=os.path.join(SHOTS, name + '.png'), full_page=False)
        except Exception:  # noqa: BLE001
            pass

    def login(email):
        page.goto(BASE + '/uz/login?mode=login', wait_until='load', timeout=30000)
        page.wait_for_timeout(1500)
        page.locator('input[type="email"]').fill(email)
        page.locator('input[type="password"]').fill(PWD)
        shot('diag-login-filled')
        page.get_by_role('button', name='Kirish', exact=True).last.click()
        page.wait_for_timeout(4000)  # SPA push to /
        alerts = page.locator('[role="alert"]').all_inner_texts() if page.locator('[role="alert"]').count() else []
        rec('login: ' + email, 'login' not in page.url, page.url + (' | ALERT: ' + ' / '.join(a[:80] for a in alerts) if alerts else ''))
        shot('diag-after-login')

    def logout():
        try:
            page.goto(BASE + '/uz', wait_until='load', timeout=25000)
            page.wait_for_timeout(1200)
            page.locator('header button[aria-haspopup="menu"]').first.click()
            page.wait_for_timeout(600)
            page.get_by_role('menuitem', name='Chiqish', exact=True).click()
            page.wait_for_timeout(500)
            page.get_by_role('button', name='Ha, chiqish', exact=True).click()
            page.wait_for_timeout(2500)
            # After logout the app stays on the home page in guest mode — the
            # avatar (session menu) must be gone and a "Kirish" link shown.
            no_avatar = page.locator('header button[aria-haspopup="menu"]').count() == 0
            rec('logout via UI', no_avatar, page.url)
        except Exception as e:  # noqa: BLE001
            rec('logout via UI', False, str(e)[:150])
            ctx.clear_cookies()
            page.goto(BASE + '/uz', wait_until='load', timeout=25000)
            page.wait_for_timeout(1500)

    def open_job_card():
        page.goto(BASE + '/uz/?q=Live+Chat', wait_until='load', timeout=30000)
        page.wait_for_selector('text=Test Company LLC', timeout=12000)
        page.wait_for_timeout(800)
        btn = page.get_by_role('button', name=re.compile('Live Chat Test')).first
        btn.click()
        page.wait_for_timeout(1000)

    # ================= PHASE A — seeker applies =================
    step('PHASE A: seeker logs in and applies')
    login(SEEKER_EMAIL)

    open_job_card()
    rec('job detail dialog opened', page.get_by_text('Test Company LLC').first.is_visible())

    cta = page.get_by_role('button', name='Ariza yuborish', exact=True).first
    rec('apply CTA visible', cta.is_visible())
    cta.click()
    page.wait_for_timeout(800)

    apply_dlg = page.locator('[role="dialog"]').filter(has_text='Vakansiyaga ariza')
    rec('apply dialog opened', apply_dlg.count() > 0)
    apply_dlg.locator('textarea').fill(COVER_MSG)
    shot('1-apply-dialog-filled')
    apply_dlg.get_by_role('button', name='Ariza yuborish', exact=True).click()
    page.wait_for_timeout(2500)

    applied_btn = page.get_by_role('button', name=re.compile('^Ariza yuborilgan'))
    rec('applied state button appears', applied_btn.count() > 0)
    shot('2-applied-state')
    if applied_btn.count() > 0:
        applied_btn.first.click()
        page.wait_for_timeout(3000)

    rec('redirected to /messages', 'messages' in page.url, page.url)
    # With the deep link the thread is already open; otherwise open it from the inbox.
    try:
        page.wait_for_selector('text=Kutilmoqda', timeout=4000)
        rec('deep link auto-opened the thread', 'convo=' in page.url, page.url)
    except PWTimeout:
        rec('deep link auto-opened the thread', False, 'no convo param — opening from inbox')
        page.wait_for_selector('text=Test Employer', timeout=8000)
        page.get_by_text('Test Employer').first.click()
        page.wait_for_timeout(2500)
        page.wait_for_selector('text=Kutilmoqda', timeout=8000)
    rec('thread shows PENDING chip', page.get_by_text('Kutilmoqda').first.is_visible())
    page.wait_for_selector('text=Test Employer', timeout=8000)
    rec('thread shows participant Test Employer', page.get_by_text('Test Employer').first.is_visible())
    page.wait_for_selector('text=Assalomu alaykum! Men frontend', timeout=8000)
    rec('cover message is first chat message', page.get_by_text(COVER_MSG).first.is_visible())
    # The thread's message container is uniquely `.scrollbar-hide.space-y-2`.
    thread_msgs = page.locator('.scrollbar-hide.space-y-2')
    bubbles = thread_msgs.locator('div.rounded-2xl', has_text='Assalomu alaykum! Men frontend').count()
    cover_bubble = thread_msgs.locator('div.rounded-2xl', has_text='Assalomu alaykum! Men frontend').last
    bubble_single = cover_bubble.locator('svg.lucide-check').count()
    bubble_double = cover_bubble.locator('svg.lucide-check-check').count()
    rec('exactly ONE message bubble rendered', bubbles == 1, 'bubbles=%d' % bubbles)
    rec('seeker msg has SINGLE check (sent)', bubble_single == 1 and bubble_double == 0,
        'single=%d double=%d' % (bubble_single, bubble_double))
    shot('3-seeker-thread-pending')

    # ================= PHASE B — employer reviews, accepts, replies =================
    step('PHASE B: employer reviews application, accepts, chats')
    logout()
    login(EMP_EMAIL)

    open_job_card()
    applicants_btn = page.get_by_role('button', name=re.compile(r'Arizalar \(\d+\)')).first
    rec('applicants button with count', applicants_btn.is_visible(), applicants_btn.inner_text() if applicants_btn.count() else '')
    applicants_btn.click()
    page.wait_for_timeout(1500)

    # Verify the FULL seeker form in the applicant card
    for label, text in [
        ('seeker name', 'Test Seeker'),
        ('specialization', 'Frontend Developer'),
        ('handle @testseeker', '@testseeker'),
        ('skill React', 'React'),
        ('skill TypeScript', 'TypeScript'),
        ('skill Tailwind CSS', 'Tailwind CSS'),
        ('skill Next.js', 'Next.js'),
        ('country', "O'zbekiston"),
        ('language', 'zbek, Rus'),
        ('about text', '3 yillik tajribaga ega'),
        ('cover message quoted', COVER_MSG),
        ('status PENDING', 'Kutilmoqda'),
    ]:
        rec('applicant card: ' + label, page.get_by_text(text, exact=False).first.is_visible())
    shot('4-applicants-full-form')

    accept_btn = page.get_by_role('button', name='Qabul qilish', exact=True).first
    rec('accept button visible', accept_btn.is_visible())
    accept_btn.click()
    page.wait_for_timeout(1500)
    rec('status chip becomes ACCEPTED', page.get_by_text('Qabul qilindi').first.is_visible())
    shot('5-applicant-accepted')

    msg_btn = page.get_by_role('button', name='Xabar yozish', exact=True).first
    rec('message button on applicant card', msg_btn.is_visible())
    msg_btn.click()
    page.wait_for_timeout(3000)
    rec('employer lands on conversation', 'messages' in page.url, page.url)
    page.wait_for_selector('text=Qabul qilindi', timeout=10000)
    rec('thread header shows ACCEPTED chip', page.get_by_text('Qabul qilindi').first.is_visible())
    try:
        page.get_by_text(COVER_MSG).first.wait_for(state='visible', timeout=8000)
        rec('seeker cover message visible to employer', True)
    except PWTimeout:
        body = page.locator('body').inner_text()[:500].replace('\n', ' | ')
        rec('seeker cover message visible to employer', False, 'BODY: ' + body)

    inp = page.get_by_placeholder('Xabar yozish…')
    rec('message input visible', inp.is_visible())
    inp.fill(EMP_REPLY)
    shot('6-employer-typing')
    page.keyboard.press('Enter')
    page.wait_for_timeout(2000)
    rec('employer reply appears', page.get_by_text('Intervyuga taklif qilamiz').first.is_visible())
    # employer's own reply has a single check (scoped to the reply bubble —
    # the language selector in the header also renders Check icons)
    reply_bubble = page.locator('.scrollbar-hide.space-y-2 div.rounded-2xl', has_text='Intervyuga taklif qilamiz').last
    emp_checks = reply_bubble.locator('svg.lucide-check').count()
    emp_double = reply_bubble.locator('svg.lucide-check-check').count()
    rec('employer reply has SINGLE check', emp_checks == 1 and emp_double == 0, 'single=%d double=%d' % (emp_checks, emp_double))
    shot('7-employer-thread')

    # ================= PHASE C — seeker reads + replies =================
    step('PHASE C: seeker reads employer reply, verifies read receipts')
    logout()
    login(SEEKER_EMAIL)

    page.goto(BASE + '/uz/messages', wait_until='load', timeout=30000)
    page.wait_for_selector('text=Test Employer', timeout=12000)
    rec('inbox lists Test Employer conversation', page.get_by_text('Test Employer').first.is_visible())
    # unread indicator — brand-colored badge in the conversation row
    unread_badges = page.locator('span:has-text("1")').filter(has=page.locator('svg')).count()
    unread = page.locator('[class*="bg-brand"]').count()
    rec('unread badge present in inbox', unread > 0, 'brand badges=%d' % unread)
    shot('8-seeker-inbox-unread')

    page.get_by_text('Test Employer').first.click()
    page.wait_for_timeout(3000)
    rec('thread opens with ACCEPTED chip', page.get_by_text('Qabul qilindi').first.is_visible())
    rec('employer reply visible to seeker', page.get_by_text('Intervyuga taklif qilamiz').first.is_visible())
    double_checks = page.locator('.scrollbar-hide.space-y-2 div.rounded-2xl', has_text=COVER_MSG).last.locator('svg.lucide-check-check').count()
    rec('cover msg shows DOUBLE check (read by employer)', double_checks >= 1, 'double=%d' % double_checks)
    shot('9-seeker-read-receipts')

    inp2 = page.get_by_placeholder('Xabar yozish…')
    inp2.fill(SEEKER_REPLY)
    page.keyboard.press('Enter')
    page.wait_for_timeout(2000)
    rec('seeker reply appears', page.get_by_text('Rahmat! Tayyorman.').first.is_visible())
    shot('10-seeker-replied')

    page.reload(wait_until='load')
    page.wait_for_timeout(3500)
    page.wait_for_selector('text=Rahmat! Tayyorman.', timeout=10000)
    rec('messages persist after reload', page.get_by_text('Rahmat! Tayyorman.').first.is_visible())
    shot('11-after-reload')

    browser.close()

# ---- Report ----
passed = sum(1 for r in results if r['passed'])
print('\n' + '=' * 60)
print('RESULTS: %d/%d passed' % (passed, len(results)))
for r in results:
    print(('PASS' if r['passed'] else 'FAIL') + ' | ' + r['name'] + (' | ' + r['detail'] if r['detail'] else ''))
if console_errors:
    print('\nCONSOLE ERRORS:')
    for e in console_errors[:20]:
        print(' -', e[:200])
else:
    print('\nNo console errors.')

report = {
    'passed': passed,
    'total': len(results),
    'steps': results,
    'console_errors': console_errors[:20],
    'screenshots_dir': SHOTS,
}
with open(os.path.join(SHOTS, 'report.json'), 'w', encoding='utf-8') as f:
    json.dump(report, f, ensure_ascii=False, indent=2)
sys.exit(0 if passed == len(results) else 1)
