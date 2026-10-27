'use strict';
const $ = id => document.getElementById(id);
const state = { tab: 'workbench', direction: 'encode', version: 0, resultVersion: -1, result: null, busy: false, analysis: null, analysisVersion: 0, analysisResultVersion: -1, all: false, puzzles: [], puzzle: null };
const SAMPLE = 'Every letter has a story. Change the shift, and the story changes.';
function el(tag, cls, text) { const n = document.createElement(tag); if (cls)
    n.className = cls; if (text !== undefined)
    n.textContent = text; return n; }
function announce(text) { $('announcement').textContent = text; }
function error(id, text = '') { $(id).textContent = text; $(id).hidden = !text; }
function current() { return state.result && state.version === state.resultVersion; }
function inputCount() { $('input-count').textContent = `${Array.from($('input').value).length} characters`; }
function dirty() { state.version++; error('work-error'); inputCount(); $('stale').hidden = !state.result; $('copy').disabled = true; $('reverse').disabled = true; $('export').disabled = true; $('output-status').textContent = 'Needs transformation'; document.querySelectorAll('.letter-map').forEach(button => button.disabled = true); }
function method() { const caesar = $('method').value === 'caesar'; $('caesar-controls').hidden = !caesar; $('substitution-controls').hidden = caesar; }
function direction(value) { state.direction = value; $('encode').setAttribute('aria-pressed', String(value === 'encode')); $('decode').setAttribute('aria-pressed', String(value === 'decode')); $('input-title').textContent = value === 'encode' ? 'Plaintext' : 'Ciphertext'; $('output-title').textContent = value === 'encode' ? 'Ciphertext' : 'Plaintext'; dirty(); }
function busy(value) { state.busy = value; for (const id of ['method', 'shift', 'shift-number', 'shift-minus', 'shift-plus', 'key', 'encode', 'decode', 'reverse-key', 'input', 'sample', 'transform', 'analyze', 'show-all', 'check', 'reveal', 'to-workbench'])
    $(id).disabled = value; $('copy').disabled = value || !current(); $('reverse').disabled = value || !current(); $('export').disabled = value || !current(); $('transform').replaceChildren(document.createTextNode(value ? 'Working on the note…' : 'Transform message ')); if (!value)
    $('transform').append(el('span', '', '↗')); }
async function api(path, payload) { const response = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); const result = await response.json(); if (!response.ok)
    throw Error(result.error || 'Could not read this note.'); return result; }
function failure(id, fail) { error(id, fail instanceof TypeError ? 'Cannot reach the notebook. Start python3 server.py and try again.' : fail.message); }
function showLetter(item) { if (!current())
    return; document.querySelectorAll('.letter-map').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.from === item.from))); $('letter-note').textContent = `${item.from} → ${item.to} · ${state.result.method === 'caesar' ? `Caesar shift ${state.result.shift}, ${state.result.direction === 'encode' ? 'forward' : 'backward'}` : 'Your substitution alphabet, ' + state.result.direction + '.'} · Lowercase letters follow the same rule.`; }
function mapping() {
    $('alphabet').replaceChildren(...state.result.mapping.map(item => { const button = el('button', 'letter-map'); button.type = 'button'; button.dataset.from = item.from; button.setAttribute('aria-label', `${item.from} maps to ${item.to}`); button.setAttribute('aria-pressed', 'false'); button.append(el('span', '', item.from), el('span', '', item.to)); button.addEventListener('click', () => showLetter(item)); return button; }));
    showLetter(state.result.mapping[0]);
}
async function transform() { if (state.busy)
    return; const shift = Number($('shift-number').value); if ($('method').value === 'caesar' && (!Number.isInteger(shift) || shift < 0 || shift > 25 || $('shift-number').value === '')) {
    error('work-error', 'Choose a whole-number shift from 0 to 25.');
    return;
} const snapshot = { text: $('input').value, method: $('method').value, direction: state.direction, shift, key: $('key').value }; const version = state.version; error('work-error'); busy(true); try {
    const result = await api('/api/transform', snapshot);
    if (state.version !== version)
        return;
    state.result = { ...result, input: snapshot.text };
    state.resultVersion = version;
    $('output').value = result.output;
    $('output-status').textContent = `${result.letters} ASCII letters transformed`;
    $('stale').hidden = true;
    mapping();
    announce(`Message ${state.direction === 'encode' ? 'encoded' : 'decoded'}. ${result.letters} ASCII letters processed.`);
}
catch (fail) {
    failure('work-error', fail);
}
finally {
    busy(false);
} }
function setTab(tab, focus = false) { state.tab = tab; for (const name of ['workbench', 'analysis', 'practice']) {
    $(name + '-tab').setAttribute('aria-selected', String(name === tab));
    $(name + '-tab').tabIndex = name === tab ? 0 : -1;
    $(name + '-panel').hidden = name !== tab;
} if (focus)
    $(tab + '-tab').focus(); if (tab === 'analysis' && !state.analysis && !state.busy)
    analyze(); if (tab === 'practice' && !state.puzzles.length)
    loadPuzzles(); }
function analysisDirty() { state.analysisVersion++; error('analysis-error'); $('analysis-stale').hidden = !state.analysis; document.querySelectorAll('.candidate .text-button,.frequency-bar button').forEach(button => button.disabled = true); }
function showFrequency(letter, item) { if (state.analysisVersion !== state.analysisResultVersion)
    return; document.querySelectorAll('.frequency-bar button').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.letter === letter))); $('frequency-note').textContent = `${letter.toUpperCase()} appears ${item.count} time${item.count === 1 ? '' : 's'}: ${item.percent.toFixed(2)}% of the ASCII letters in this message.`; }
function renderAnalysis() { const report = state.analysis; const maximum = Math.max(1, ...Object.values(report.frequency).map(item => item.percent)); $('frequency-chart').replaceChildren(...Object.entries(report.frequency).map(([letter, item]) => { const row = el('div', 'frequency-bar'); const button = el('button'); button.type = 'button'; button.style.height = `${item.percent / maximum * 100}%`; button.dataset.letter = letter; button.setAttribute('aria-label', `${letter.toUpperCase()}: ${item.count} occurrences, ${item.percent} percent`); button.setAttribute('aria-pressed', 'false'); button.title = `${letter.toUpperCase()} · ${item.count} · ${item.percent}%`; button.addEventListener('click', () => showFrequency(letter, item)); row.append(button, el('span', '', letter.toUpperCase())); return row; })); $('letter-total').textContent = `${report.letters} LETTERS`; $('unique-letters').textContent = report.unique_letters; const top = Object.entries(report.frequency).sort((a, b) => b[1].count - a[1].count)[0]; $('top-letter').textContent = report.letters ? `${top[0].toUpperCase()} · ${top[1].percent}%` : '—'; $('frequency-note').textContent = 'Bars are scaled to the largest share in this message. Choose one for its exact count and percentage.'; renderCandidates(); }
function renderCandidates() { const guesses = state.all ? state.analysis.guesses : state.analysis.guesses.slice(0, 5); $('show-all').textContent = state.all ? 'Show top five ↑' : 'Show all 26 ↓'; $('show-all').disabled = !state.analysis.guesses.length; $('candidates').replaceChildren(...guesses.map(guess => { const row = el('article', 'candidate'); const shift = el('span', 'candidate-shift', `SHIFT ${guess.encryption_shift}`); shift.append(el('small', '', `χ² ${guess.score.toFixed(2)}`)); const use = el('button', 'text-button', 'Use this shift ↗'); use.type = 'button'; use.addEventListener('click', () => { $('method').value = 'caesar'; method(); $('input').value = state.analysis.text; $('shift-number').value = guess.encryption_shift; $('shift').value = guess.encryption_shift; direction('decode'); setTab('workbench'); transform(); }); row.append(shift, el('p', '', guess.text), use); return row; })); if (!guesses.length)
    $('candidates').append(el('p', 'candidate-empty', 'No ASCII letters to investigate. Add some English text to try the 26 shifts.')); }
async function analyze() { if (state.busy)
    return; const text = $('analysis-input').value, version = state.analysisVersion; error('analysis-error'); busy(true); try {
    const report = await api('/api/analyze', { text });
    if (version !== state.analysisVersion)
        return;
    state.analysis = { ...report, text };
    state.analysisResultVersion = version;
    state.all = false;
    $('analysis-stale').hidden = true;
    renderAnalysis();
    announce(`Analysis complete. ${report.letters} ASCII letters, ${report.guesses.length} Caesar candidates.`);
}
catch (fail) {
    failure('analysis-error', fail);
}
finally {
    busy(false);
    if (state.analysis)
        $('show-all').disabled = !state.analysis.guesses.length;
} }
async function loadPuzzles() { try {
    const response = await fetch('/api/challenges');
    if (!response.ok)
        throw Error('Could not load practice notes.');
    state.puzzles = await response.json();
    $('puzzle-list').replaceChildren(...state.puzzles.map((puzzle, index) => { const button = el('button', 'puzzle-choice'); button.type = 'button'; button.id = puzzle.id; button.setAttribute('aria-pressed', 'false'); button.append(el('small', '', `NOTE ${String(index + 1).padStart(2, '0')}`), document.createTextNode(puzzle.title)); button.addEventListener('click', () => choosePuzzle(puzzle, index)); return button; }));
    choosePuzzle(state.puzzles[0], 0);
}
catch (fail) {
    failure('practice-error', fail);
} }
function choosePuzzle(puzzle, index) { state.puzzle = puzzle; document.querySelectorAll('.puzzle-choice').forEach(button => button.setAttribute('aria-pressed', String(button.id === puzzle.id))); $('puzzle-number').textContent = `NOTE ${String(index + 1).padStart(2, '0')}`; $('puzzle-title').textContent = puzzle.title; $('puzzle-text').textContent = puzzle.ciphertext; $('hint-text').textContent = puzzle.hint; $('hint-text').hidden = true; $('hint').textContent = 'A little hint ↗'; $('answer').value = ''; $('answer-feedback').classList.remove('correct'); $('answer-feedback').textContent = 'Case and extra whitespace don’t matter. Punctuation does.'; error('practice-error'); }
async function check(reveal = false) { if (state.busy || !state.puzzle)
    return; const id = state.puzzle.id; error('practice-error'); busy(true); try {
    const result = await api('/api/check', { id, answer: $('answer').value, reveal });
    if (state.puzzle.id !== id)
        return;
    $('answer-feedback').textContent = result.message + (result.plaintext ? ` Shift ${result.shift}. ${result.plaintext}` : '');
    $('answer-feedback').classList.toggle('correct', result.correct);
    announce(result.message);
}
catch (fail) {
    failure('practice-error', fail);
}
finally {
    busy(false);
} }
for (const tab of ['workbench', 'analysis', 'practice'])
    $(tab + '-tab').addEventListener('click', () => setTab(tab));
document.querySelector('.desk-tabs').addEventListener('keydown', event => { const order = ['workbench', 'analysis', 'practice']; if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key))
    return; event.preventDefault(); const index = order.indexOf(state.tab); setTab(event.key === 'Home' ? order[0] : event.key === 'End' ? order[2] : order[(index + (event.key === 'ArrowLeft' ? 2 : 1)) % 3], true); });
$('method').addEventListener('change', () => { method(); dirty(); });
$('input').addEventListener('input', dirty);
$('key').addEventListener('input', dirty);
$('shift').addEventListener('input', () => { $('shift-number').value = $('shift').value; dirty(); });
$('shift-number').addEventListener('input', () => { $('shift').value = $('shift-number').value; dirty(); });
for (const [id, delta] of [['shift-minus', -1], ['shift-plus', 1]])
    $(id).addEventListener('click', () => { const shift = ((Number($('shift-number').value) || 0) + delta + 26) % 26; $('shift-number').value = shift; $('shift').value = shift; dirty(); });
$('encode').addEventListener('click', () => direction('encode'));
$('decode').addEventListener('click', () => direction('decode'));
$('reverse-key').addEventListener('click', () => { $('key').value = 'ZYXWVUTSRQPONMLKJIHGFEDCBA'; dirty(); });
$('sample').addEventListener('click', () => { $('input').value = SAMPLE; direction('encode'); transform(); });
$('transform').addEventListener('click', transform);
$('reverse').addEventListener('click', () => { if (!current())
    return; $('input').value = state.result.output; direction(state.direction === 'encode' ? 'decode' : 'encode'); transform(); });
$('copy').addEventListener('click', async () => { if (!current())
    return; try {
    await navigator.clipboard.writeText(state.result.output);
    $('output-status').textContent = 'Copied to clipboard';
    announce('Output copied.');
}
catch {
    error('work-error', 'Clipboard access is unavailable. Select the output text and copy it manually.');
} });
$('export').addEventListener('click', () => { if (!current())
    return; const url = URL.createObjectURL(new Blob([JSON.stringify(state.result, null, 2) + '\n'], { type: 'application/json' })); const link = el('a'); link.href = url; link.download = 'cipher-notebook.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); announce('Note exported with input, output, settings, letter mapping, and frequencies.'); });
$('analysis-input').addEventListener('input', analysisDirty);
$('analyze').addEventListener('click', analyze);
$('show-all').addEventListener('click', () => { if (!state.analysis || state.analysisVersion !== state.analysisResultVersion)
    return; state.all = !state.all; renderCandidates(); });
$('hint').addEventListener('click', () => { $('hint-text').hidden = !$('hint-text').hidden; $('hint').textContent = $('hint-text').hidden ? 'A little hint ↗' : 'Hide hint ↑'; });
$('to-workbench').addEventListener('click', () => { if (!state.puzzle)
    return; $('method').value = 'caesar'; method(); $('input').value = state.puzzle.ciphertext; $('shift-number').value = 0; $('shift').value = 0; direction('decode'); setTab('workbench'); transform(); });
$('check').addEventListener('click', () => check());
$('reveal').addEventListener('click', () => check(true));
inputCount();
transform();
