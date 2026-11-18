// Taskaroo - custom date & time picker with OK/Cancel.
// Replaces the browser's native datetime-local popup (which has no OK button).
// Chosen value is written to the hidden #taskDueInput in standard
// "YYYY-MM-DDTHH:MM" format, so existing logic (save, recurring due dates,
// overdue badges, sorting) keeps working unchanged.

let dueDateSel = null; // working Date under selection (includes chosen time)

// Store a friendly, two-line label in the visible field: date on the first line,
// time on the second, so a short field still shows both without needing to scroll.
function syncDueDisplay() {
    const input = document.getElementById('taskDueInput');
    const display = document.getElementById('taskDueDisplay');
    if (!display) return;
    const raw = input ? input.value : '';
    const d = raw ? new Date(raw) : null;
    display.value = (d && !isNaN(d.getTime()))
        ? d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) + '\n' +
          d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
        : '';
}

function readDueValue() {
    const raw = document.getElementById('taskDueInput').value;
    const d = raw ? new Date(raw) : null;
    return (d && !isNaN(d.getTime())) ? d : null;
}

// ---- Time control helpers (hour & minute are typeable numeric inputs) ----
function setDueTimeControls(d) {
    if (!d) d = new Date();
    const hour12 = d.getHours() % 12 || 12;
    const minutes = d.getMinutes();
    document.getElementById('dueHourInput').value = String(hour12);
    document.getElementById('dueMinuteInput').value = String(minutes).padStart(2, '0');
    document.getElementById('dueAmpmSelect').value = d.getHours() >= 12 ? 'PM' : 'AM';
}

function readDueTimeControls() {
    const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
    const hour12 = clamp(parseInt(document.getElementById('dueHourInput').value, 10) || 12, 1, 12);
    const minutes = clamp(parseInt(document.getElementById('dueMinuteInput').value, 10) || 0, 0, 59);
    let hh = hour12 % 12;
    if (document.getElementById('dueAmpmSelect').value === 'PM') hh += 12;
    return String(hh).padStart(2, '0') + ':' + String(minutes).padStart(2, '0');
}

// ---- Editing the due-date field directly in the task window ----
// On focus, show the raw editable value (YYYY-MM-DD HH:MM). On blur/Enter, parse it back.
function dueDisplayFocus() {
    const input = document.getElementById('taskDueInput');
    const display = document.getElementById('taskDueDisplay');
    if (!input || !display) return;
    if (input.value) display.value = input.value.replace('T', ' ');
    else display.select();
}

function dueDisplayCommit() {
    const input = document.getElementById('taskDueInput');
    const display = document.getElementById('taskDueDisplay');
    if (!input || !display) return;
    const raw = display.value.trim().replace(/\s*[\r\n]+\s*/g, ' ');
    if (!raw) { input.value = ''; syncDueDisplay(); return; }
    // Accept "YYYY-MM-DD HH:MM" (swap the space for the ISO "T") or any parseable date.
    const iso = raw.replace(' ', 'T');
    let d = new Date(iso);
    if (isNaN(d.getTime())) d = new Date(raw);
    if (!isNaN(d.getTime())) {
        const pad = n => String(n).padStart(2, '0');
        input.value = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes());
    }
    syncDueDisplay();
}

// ---- Calendar rendering ----
function renderDueCalendar() {
    const y = dueDateSel.getFullYear();
    const m = dueDateSel.getMonth();
    const today = new Date();
    const current = dueDateSel; // the in-progress clicked date (time ignored for matching)

    document.getElementById('dueMonthLabel').textContent =
        dueDateSel.toLocaleString(undefined, { month: 'long', year: 'numeric' });

    const startDow = new Date(y, m, 1).getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();

    const cells = [];
    for (let i = 0; i < startDow; i++) cells.push('<div></div>');

    for (let day = 1; day <= daysInMonth; day++) {
        const isToday = y === today.getFullYear() && m === today.getMonth() && day === today.getDate();
        const isSel = current && current.getFullYear() === y && current.getMonth() === m && current.getDate() === day;
        const cls = 'h-9 flex items-center justify-center rounded-md text-sm cursor-pointer transition ' +
            (isSel
                ? 'bg-emerald-600 text-white font-semibold ring-2 ring-emerald-300'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-dark-700' +
                  (isToday ? ' font-semibold text-emerald-600 dark:text-emerald-400' : ''));
        cells.push(`<button type="button" onclick="dueSelectDay(${y},${m},${day})" class="${cls}">${day}</button>`);
    }
    document.getElementById('dueCalendarGrid').innerHTML = cells.join('');
}

function dueShiftMonth(delta) {
    const day = dueDateSel.getDate();
    const first = new Date(dueDateSel.getFullYear(), dueDateSel.getMonth() + delta, 1);
    const lastDay = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
    dueDateSel.setFullYear(first.getFullYear(), first.getMonth(), Math.min(day, lastDay));
    renderDueCalendar();
}
function duePrevMonth() { dueShiftMonth(-1); }
function dueNextMonth() { dueShiftMonth(1); }

function dueSelectDay(y, m, day) {
    const [hh, mm] = readDueTimeControls().split(':').map(Number);
    dueDateSel = new Date(y, m, day, hh, mm);
    renderDueCalendar();
}

// ---- Open / close / confirm ----
function openDuePicker() {
    const pop = document.getElementById('duePicker');
    const btn = document.getElementById('duePickerButton');
    if (!pop || !pop.classList.contains('hidden')) return;

    const existing = readDueValue();
    dueDateSel = existing ? new Date(existing) : new Date();

    setDueTimeControls(existing || null);
    if (!existing) dueDateSel.setHours(0, 0, 0, 0); // fresh selection, no time drift
    renderDueCalendar();

    // Position near the trigger button, keep on-screen.
    let top = btn.getBoundingClientRect().bottom + 8;
    let left = btn.getBoundingClientRect().right - pop.offsetWidth + 60;
    left = Math.max(8, Math.min(left, window.innerWidth - pop.offsetWidth - 8));
    if (top + pop.offsetHeight > window.innerHeight - 8) {
        top = Math.max(8, btn.getBoundingClientRect().top - pop.offsetHeight - 8);
    }
    pop.style.top = top + 'px';
    pop.style.left = left + 'px';

    pop.classList.remove('hidden');
    document.getElementById('duePickerBackdrop').classList.remove('hidden');
}

function closeDuePicker() {
    const pop = document.getElementById('duePicker');
    if (pop) pop.classList.add('hidden');
    const bd = document.getElementById('duePickerBackdrop');
    if (bd) bd.classList.add('hidden');
    dueDateSel = null;
}

function dueOk() {
    const [hh, mm] = readDueTimeControls().split(':').map(Number);
    const d = new Date(dueDateSel.getFullYear(), dueDateSel.getMonth(), dueDateSel.getDate(), hh, mm);
    const pad = n => String(n).padStart(2, '0');
    document.getElementById('taskDueInput').value =
        d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes());
    dueDateSel = null;
    closeDuePicker();
    syncDueDisplay();
}

function dueClear() {
    document.getElementById('taskDueInput').value = '';
    dueDateSel = null;
    closeDuePicker();
    syncDueDisplay();
}

// Keep the visible field in sync if the value is ever set programmatically.
(function initDueDisplay() {
    if (document.getElementById('taskDueDisplay')) syncDueDisplay();
})();