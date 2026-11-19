// Taskaroo - help page: open/close the in-app help overlay, jump-to-section
// navigation, and keyboard shortcuts (? / F1 to open, Esc to close).

function openHelp() {
    const page = document.getElementById('helpPage');
    if (page) page.classList.remove('hidden');
}

function closeHelp() {
    const page = document.getElementById('helpPage');
    if (page) page.classList.add('hidden');
}

// Smooth-scroll the help content to a given section (used by the quick-jump chips).
function helpJumpTo(sectionId) {
    const content = document.getElementById('helpContent');
    const section = document.getElementById(sectionId);
    if (!content || !section) return;
    const top = section.getBoundingClientRect().top -
        content.getBoundingClientRect().top + content.scrollTop - 16;
    content.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
}

// Keyboard shortcuts: "?" or F1 opens help (unless the user is typing in a
// field — F1 still wins there so it can't be lost), while Esc closes it.
document.addEventListener('keydown', (e) => {
    const page = document.getElementById('helpPage');
    if (!page) return;
    const isOpen = !page.classList.contains('hidden');

    if (e.key === 'Escape' && isOpen) {
        closeHelp();
        return;
    }

    if ((e.key === '?' || e.key === 'F1') && !isOpen) {
        const el = e.target;
        const typing = el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);
        if (e.key === 'F1' || !typing) {
            e.preventDefault();
            openHelp();
        }
    }
});
