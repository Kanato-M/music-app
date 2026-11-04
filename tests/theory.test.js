import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseChord, parseKey, keyFromPc, formatChord, degreeName, analyzeChord, parseChart, parseSections,
  detectPatterns, isDiatonic, guessKey, spellPc, diatonicChords, capoSuggestions,
} from '../src/theory.js';
import snowSmile from '../data/songs/snow-smile.js';
import { LESSONS } from '../src/lessons.js';

const C = parseKey('C');
const Fs = parseKey('F#');
const ch = (s) => parseChord(s);

test('コード名の解析', () => {
  const c = ch('F#m7-5/A');
  assert.equal(c.root.pc, 6);
  assert.equal(c.quality.family, 'hdim');
  assert.equal(c.bass.pc, 9);
  assert.equal(ch('Bbadd9').root.pc, 10);
  assert.equal(ch('C#7').quality.family, 'dom');
  assert.equal(ch('Adim').quality.family, 'dim');
  assert.equal(ch('X'), null);
});

test('ディグリー表記', () => {
  assert.equal(degreeName(ch('G#m7'), Fs), 'IIm7');
  assert.equal(degreeName(ch('B/C#'), Fs), 'IV/V');
  assert.equal(degreeName(ch('Cm7-5'), Fs), '♯IVm7-5');
  assert.equal(degreeName(ch('Adim'), Fs), '♭IIIdim');
  assert.equal(degreeName(ch('Bb'), C), '♭VII');
});

test('キーに沿った綴りと移調', () => {
  // 理論表記では F♯ キーの #IV は B♯、簡易表記では C
  assert.equal(spellPc(0, Fs, 'theory'), 'B♯');
  assert.equal(spellPc(0, Fs, 'simple'), 'C');
  assert.equal(spellPc(5, Fs, 'theory'), 'E♯');
  // F♯ → G（半音下げチューニングのフォーム）に移調
  const G = keyFromPc(Fs.pc + 1);
  assert.equal(formatChord(ch('C#/B'), G, 'simple', 1), 'D/C');
  assert.equal(formatChord(ch('Adim'), G, 'simple', 1), 'B♭dim');
  assert.equal(formatChord(ch('Cm7-5'), G, 'simple', 1), 'C♯m7-5');
});

test('ダイアトニック判定', () => {
  assert.ok(isDiatonic(ch('F#add9'), Fs));
  assert.ok(isDiatonic(ch('C#7'), Fs));
  assert.ok(isDiatonic(ch('B/C#'), Fs));
  assert.ok(!isDiatonic(ch('Adim'), Fs));
  assert.ok(!isDiatonic(ch('Cm7-5'), Fs));
  assert.deepEqual(diatonicChords(C).map((d) => d.seventh), ['CM7', 'Dm7', 'Em7', 'FM7', 'G7', 'Am7', 'Bm7-5']);
});

test('ノンダイアトニックの分類', () => {
  const tags = (s, next, key = C) => analyzeChord(ch(s), key, null, next && ch(next)).tags.map((t) => t.id);
  assert.ok(tags('E7', 'Am').includes('secondary-dominant'));
  assert.ok(tags('A7', 'Dm7').includes('secondary-dominant'));
  assert.ok(tags('Db7', 'C').includes('tritone-sub'));
  assert.ok(tags('Fm', 'C').includes('borrowed'));
  assert.ok(tags('Ab', 'Bb').includes('borrowed'));
  assert.ok(tags('C#dim', 'Dm7').includes('passing-dim'));
  assert.ok(tags('Adim', 'F#/A#', Fs).includes('passing-dim'));
  assert.ok(tags('Cm7-5', 'Badd9', Fs).includes('sharp4-m7b5'));
  assert.ok(tags('B/C#', 'C#', Fs).includes('four-over-five'));
  assert.ok(tags('C#/B', 'F#/A#', Fs).includes('seventh-bass'));
  assert.ok(tags('B/F#', null, Fs).includes('pedal'));
});

test('譜面テキストの解析', () => {
  const bars = parseChart('| C G/B | Am | % |');
  assert.equal(bars.length, 3);
  assert.equal(bars[0].length, 2);
  assert.equal(bars[2][0].symbol, 'Am');
  assert.throws(() => parseChart('| ここは歌詞 |'));
  const secs = parseSections('[A]\n| C | G |\n[B]\nF G C');
  assert.equal(secs.length, 2);
  assert.equal(parseChart(secs[1].chart).length, 3);
});

test('進行パターンの検出', () => {
  const sec = (chart) => [{ name: 'x', bars: parseChart(chart) }];
  const ids = (chart, key = C) => detectPatterns(sec(chart), key).map((p) => p.id);
  assert.ok(ids('| Dm7 | G7 | C |').includes('two-five-one'));
  assert.ok(!ids('| Dm7 | G7 | C |').includes('two-five'));
  assert.ok(ids('| FM7 | G7 | Em7 | Am |').includes('royal-road'));
  assert.ok(ids('| Am | F | G | C |').includes('komuro'));
  assert.ok(ids('| C | G/B | Am | G |').includes('bass-down'));
  // IV/V を V とみなして 2-5-1 を検出
  assert.ok(ids('| G#m7 | B/C# C#7 | F# |', Fs).includes('two-five-one'));
});

test('キー推定とカポ', () => {
  const chords = parseChart('| G | D/F# | Em7 | C | D | G |').flat();
  assert.equal(guessKey(chords).name, 'G');
  assert.deepEqual(capoSuggestions(Fs)[0], { shape: 'E', capo: 2 });
});

test('スノースマイルのデータが解析できる', () => {
  const key = parseKey(snowSmile.key);
  const sections = snowSmile.sections.map((s) => ({ ...s, bars: parseChart(s.chart) }));
  const all = sections.flatMap((s) => s.bars.flat());
  assert.ok(all.length > 30);
  // サビにパッシング・ディミニッシュと ♯IVm7-5 がある
  const chorus = sections.find((s) => s.id === 'chorus').bars.flat();
  const tagIds = chorus.flatMap((c, i) => analyzeChord(c, key, chorus[i - 1], chorus[i + 1]).tags.map((t) => t.id));
  assert.ok(tagIds.includes('passing-dim'));
  assert.ok(tagIds.includes('sharp4-m7b5'));
  const pats = detectPatterns(sections, key).map((p) => p.id);
  assert.ok(pats.includes('two-five-one'));
  assert.ok(pats.includes('bass-down'));
  assert.ok(pats.includes('bass-up'));
  // 歌詞を含まない（譜面テキストはコードと区切り記号のみ）
  for (const s of snowSmile.sections) {
    for (const tok of s.chart.split(/[\s|]+/).filter(Boolean)) assert.ok(parseChord(tok), tok);
  }
  // 解説が参照するセクションとレッスンが存在する
  const lessonIds = new Set(LESSONS.map((l) => l.id));
  for (const h of snowSmile.highlights) {
    const sec = sections.find((s) => s.id === h.section);
    assert.ok(sec, h.section);
    assert.ok(h.bars[1] < sec.bars.length, h.title);
    assert.ok(lessonIds.has(h.lesson), h.lesson);
  }
});

test('レッスンの例がすべて解析できる', () => {
  for (const l of LESSONS) for (const ex of l.examples ?? []) parseChart(ex.chart);
});

test('構成音の綴り', async () => {
  const { chordToneNames } = await import('../src/theory.js');
  assert.deepEqual(chordToneNames(ch('Adim'), 'A', 'theory'), ['A', 'C', 'E♭']);
  assert.deepEqual(chordToneNames(ch('C#7'), 'C♯', 'theory'), ['C♯', 'E♯', 'G♯', 'B']);
  assert.deepEqual(chordToneNames(ch('C#7'), 'C♯', 'simple'), ['C♯', 'F', 'G♯', 'B']);
  assert.deepEqual(chordToneNames(ch('F#add9'), 'F♯', 'theory'), ['F♯', 'A♯', 'C♯', 'G♯']);
  assert.deepEqual(chordToneNames(ch('Cdim7'), 'C', 'theory'), ['C', 'E♭', 'G♭', 'B♭♭']);
});

test('ディミニッシュのルートはシャープ側で綴る', () => {
  assert.equal(formatChord(ch('C#dim'), C), 'C♯dim');
  assert.equal(formatChord(ch('Dbdim'), C), 'C♯dim');
  assert.equal(degreeName(ch('C#dim'), C), '♯Idim');
  assert.equal(degreeName(ch('G#dim'), C), '♯Vdim');
  assert.equal(degreeName(ch('Ebdim'), C), '♭IIIdim');
});
