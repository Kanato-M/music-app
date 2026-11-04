import {
  parseKey, keyFromPc, parseChart, parseSections, analyzeChord, detectPatterns, formatChord,
  degreeName, diatonicChords, guessKey, capoSuggestions, spellPc, chordToneNames, mod12,
  KEY_NAMES, prettyAccidentals,
} from './theory.js';
import { playChord, playBars, stop } from './audio.js';
import { LESSONS, findLesson } from './lessons.js';
import { EXTERNAL_SITES } from './sources.js';
import { SONGS, findSong } from '../data/songs/index.js';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const pretty = (s) => esc(prettyAccidentals(s));

const FUNC_LABEL = { T: 'トニック', SD: 'サブドミナント', D: 'ドミナント' };
const CONFIDENCE = {
  referenced: { label: '照合済み', title: '複数の公開コード譜の情報と照合したセクション' },
  estimated: { label: '推定・要検証', title: '曲中で使われるコードから推定したセクション。出典サイトで確認してください' },
  user: { label: 'ユーザー入力', title: 'あなたが入力したコード' },
};

// 表示設定（曲ページ間で共有、ブラウザに保存）
const prefs = loadPrefs();
function loadPrefs() {
  try {
    return { view: 'both', spelling: 'simple', ...JSON.parse(localStorage.getItem('chordlearn:prefs') || '{}') };
  } catch {
    return { view: 'both', spelling: 'simple' };
  }
}
function savePrefs() {
  try { localStorage.setItem('chordlearn:prefs', JSON.stringify(prefs)); } catch { /* 保存できなくても動作は続ける */ }
}

// ---------------------------------------------------------------------------
// マイリスト（自分で入力・解析した曲。歌詞は保存しない）
function loadMySongs() {
  try { return JSON.parse(localStorage.getItem('chordlearn:mysongs') || '[]'); } catch { return []; }
}
function saveMySongs(list) {
  try { localStorage.setItem('chordlearn:mysongs', JSON.stringify(list)); return true; } catch { return false; }
}
function allSongs() {
  return [...SONGS, ...loadMySongs()];
}
function getSong(id) {
  return findSong(id) ?? loadMySongs().find((s) => s.id === id) ?? null;
}

// ---------------------------------------------------------------------------
// 曲データ → 解析済みモデル

function prepare(song) {
  const key = parseKey(song.key);
  const sections = song.sections.map((sec, si) => ({ ...sec, si, bars: parseChart(sec.chart) }));
  const flat = [];
  sections.forEach((sec) => sec.bars.forEach((bar, bi) => bar.forEach((chord, ci) => flat.push({ chord, si: sec.si, bi, ci }))));
  flat.forEach((item, i) => {
    item.analysis = analyzeChord(item.chord, key, flat[i - 1]?.chord, flat[i + 1]?.chord);
    item.ref = `${item.si}-${item.bi}-${item.ci}`;
  });
  const lookup = new Map(flat.map((it) => [it.ref, it]));
  // 曲の構成（form）があれば、その順番で並べて進行を検出する（セクションをまたぐ進行も拾える）
  const form = (song.form ?? sections.map((s) => s.id))
    .map((id) => sections.find((s) => s.id === id))
    .filter(Boolean);
  const patterns = detectPatterns(form, key);
  return { song, key, sections, form, flat, lookup, patterns };
}

let current = null; // 表示中の曲モデル
let shift = 0; // 移調量（半音）

const displayKey = () => (shift === 0 ? current.key : keyFromPc(current.key.pc + shift));
const chordName = (chord, model = current, sh = shift) => {
  const k = sh === 0 ? model.key : keyFromPc(model.key.pc + sh);
  return formatChord(chord, k, prefs.spelling, sh);
};

// ---------------------------------------------------------------------------
// 部品

function chordButton(item, model = current) {
  const a = item.analysis;
  const cls = ['chord', a.diatonic ? `f-${a.func ?? 'x'}` : 'nd'];
  const name = chordName(item.chord, model);
  return `<button class="${cls.join(' ')}" data-ref="${item.ref}" title="${esc(prettyAccidentals(a.degree))}">
    <span class="cn">${pretty(name)}</span><span class="dg">${pretty(a.degree)}</span></button>`;
}

function barsHTML(model, si, from = 0, to = Infinity, withMarks = false) {
  const sec = model.sections[si];
  const marks = new Map();
  (model.song.highlights ?? []).forEach((h, hi) => {
    if (h.section === sec.id) marks.set(h.bars[0], hi + 1);
  });
  return sec.bars
    .map((bar, bi) => {
      if (bi < from || bi > to) return '';
      const items = bar.map((_, ci) => model.lookup.get(`${si}-${bi}-${ci}`));
      const mark = marks.has(bi) && withMarks ? `<a class="hl-mark" href="#hl-${marks.get(bi)}" data-tab-link="notes" title="解説 ${marks.get(bi)}">${marks.get(bi)}</a>` : '';
      return `<div class="bar" data-bar="${bi + 1}">${mark}${items.map((it) => chordButton(it, model)).join('')}</div>`;
    })
    .join('');
}

function sectionCard(model, si) {
  const sec = model.sections[si];
  const conf = CONFIDENCE[sec.confidence] ?? CONFIDENCE.user;
  return `<section class="sec-card" id="sec-${si}">
    <header>
      <h3>${esc(sec.name)}${sec.repeat ? ` <span class="repeat">×${sec.repeat}</span>` : ''}</h3>
      <span class="badge conf-${esc(sec.confidence ?? 'user')}" title="${esc(conf.title)}">${conf.label}</span>
      <button class="icon-btn play-sec" data-si="${si}" aria-label="${esc(sec.name)}を再生">▶ 再生</button>
    </header>
    <div class="bars view-${prefs.view}">${barsHTML(model, si, 0, Infinity, true)}</div>
  </section>`;
}

function miniProgression(chords, key, label = '') {
  // 単独のコード列（レッスン例など）をボタン列で表示
  return `<div class="mini" data-chords="${esc(chords.map((c) => c.symbol).join(' '))}" data-key="${esc(key.name)}">
    ${label ? `<div class="mini-label">${esc(label)}</div>` : ''}
    <div class="mini-row">
      <button class="icon-btn play-mini" aria-label="再生">▶</button>
      ${chords
        .map((c, i) => {
          const a = analyzeChord(c, key, chords[i - 1], chords[i + 1]);
          return `<button class="chord ${a.diatonic ? `f-${a.func ?? 'x'}` : 'nd'}" data-mini="${i}">
            <span class="cn">${pretty(formatChord(c, key, prefs.spelling))}</span><span class="dg">${pretty(a.degree)}</span></button>`;
        })
        .join('<span class="arrow">→</span>')}
    </div></div>`;
}

function lessonLink(id, text) {
  const l = findLesson(id);
  if (!l) return '';
  return `<a class="lesson-link" href="#/theory/${l.id}">📘 ${esc(text ?? l.title)}</a>`;
}

function externalLinks(q) {
  return `<ul class="ext-list">${EXTERNAL_SITES.map(
    (s) => `<li><a href="${esc(s.search(q))}" target="_blank" rel="noopener noreferrer">${esc(s.name)} で「${esc(q)}」を探す ↗</a>
      <span class="muted">${esc(s.description)}</span></li>`,
  ).join('')}</ul>`;
}

// ---------------------------------------------------------------------------
// ページ：ホーム（検索）

function normalize(s) {
  return String(s ?? '').toLowerCase().normalize('NFKC').replace(/[\s・]/g, '')
    .replace(/[ァ-ン]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
}

function matchSong(song, q) {
  const n = normalize(q);
  if (!n) return true;
  return [song.title, song.reading, song.romaji, song.artist, song.artistReading].some((f) => normalize(f).includes(n));
}

function homePage(params) {
  const q = params.get('q') ?? '';
  const songs = allSongs();
  const hits = songs.filter((s) => matchSong(s, q));
  return `
  <section class="hero">
    <h1>曲名から、コード進行と音楽理論を学ぶ</h1>
    <p class="lead">曲を検索すると、コード譜・ディグリー（2-5-1 などの度数表記）・キーと転調・使われている理論の解説がまとめて見られます。</p>
    <form class="search" role="search" id="search-form">
      <input type="search" name="q" value="${esc(q)}" placeholder="曲名・アーティスト名（例：スノースマイル）" aria-label="曲名で検索" autocomplete="off">
      <button type="submit">検索</button>
    </form>
  </section>

  <section>
    <h2>${q ? `「${esc(q)}」の検索結果` : '収録曲'} <span class="count">${hits.length} 曲</span></h2>
    ${hits.length ? `<div class="song-grid">${hits.map(songCard).join('')}</div>` : `
      <div class="empty">
        <p>まだ解説がない曲です。下のコード譜サイトで探して、<a href="#/analyze?title=${encodeURIComponent(q)}">コードを入力して解析</a>することもできます。</p>
      </div>`}
  </section>

  ${q ? `<section class="panel">
    <h2>外部のコード譜サイトで探す</h2>
    <p class="muted">コード譜（歌詞付き）は各サイトでご覧ください。本アプリは譜面を転載せず、リンクでご案内しています。</p>
    ${externalLinks(q)}
  </section>` : ''}

  <section class="panel">
    <h2>音楽理論を学ぶ</h2>
    <div class="lesson-grid">${LESSONS.slice(0, 6).map(lessonCard).join('')}</div>
    <p><a href="#/theory">すべてのレッスンを見る →</a></p>
  </section>`;
}

function songCard(s) {
  return `<a class="song-card" href="#/song/${esc(s.id)}">
    <div class="title">${esc(s.title)}</div>
    <div class="artist">${esc(s.artist || 'アーティスト未入力')}</div>
    <div class="meta"><span class="chip">Key ${pretty(s.key)}</span>${s.user ? '<span class="chip">マイ解析</span>' : ''}
    ${(s.tags ?? []).slice(0, 3).map((t) => `<span class="chip ghost">${esc(t)}</span>`).join('')}</div>
  </a>`;
}

function lessonCard(l) {
  return `<a class="lesson-card" href="#/theory/${l.id}"><span class="group">${esc(l.group)}</span>
    <div class="title">${esc(l.title)}</div><div class="muted">${esc(l.summary)}</div></a>`;
}

// ---------------------------------------------------------------------------
// ページ：曲

const TABS = [
  ['chart', 'コード譜'],
  ['progressions', 'コード進行'],
  ['key', 'キー・転調'],
  ['notes', '解説'],
  ['sources', '出典'],
];

function songPage(id, params) {
  const song = getSong(id);
  if (!song) return `<p>曲が見つかりませんでした。<a href="#/">トップへ</a></p>`;
  if (current?.song.id !== id) {
    current = prepare(song);
    shift = 0;
  }
  const tab = params.get('tab') ?? 'chart';
  const s = song;
  return `
  <nav class="crumbs"><a href="#/">ホーム</a> / ${esc(s.title)}</nav>
  <header class="song-head">
    <div>
      <h1>${esc(s.title)}</h1>
      <p class="artist">${esc(s.artist)}${s.credits ? `<span class="muted">（作詞 ${esc(s.credits.lyrics)}／作曲 ${esc(s.credits.music)}）</span>` : ''}</p>
      <div class="meta">
        <span class="chip strong">原曲キー ${pretty(current.key.name)} メジャー</span>
        ${s.tempo ? `<span class="chip">${esc(s.tempo)}</span>` : ''}
        ${s.tuning ? `<span class="chip">${esc(s.tuning.label)}</span>` : ''}
        ${s.released ? `<span class="chip ghost">${esc(s.released)}</span>` : ''}
      </div>
    </div>
    ${s.summary ? `<p class="summary">${esc(s.summary)}</p>` : ''}
  </header>

  <div class="toolbar" role="toolbar" aria-label="表示設定">
    <div class="tool-group" aria-label="移調">
      <span class="tool-label">移調</span>
      <button class="icon-btn" data-shift="-1" aria-label="半音下げる">−</button>
      <span class="key-now" id="key-now">${keyNowLabel()}</span>
      <button class="icon-btn" data-shift="1" aria-label="半音上げる">＋</button>
      ${s.tuning?.playKeyShift ? `<button class="pill ${shift === s.tuning.playKeyShift ? 'on' : ''}" data-set-shift="${s.tuning.playKeyShift}">${esc(s.tuning.label)}のフォーム</button>` : ''}
      <button class="pill ${shift === 0 ? 'on' : ''}" data-set-shift="0">原曲キー</button>
    </div>
    <div class="tool-group seg" aria-label="表示">
      ${[['both', 'コード＋度数'], ['chord', 'コード'], ['degree', '度数']].map(([v, l]) => `<button class="seg-btn ${prefs.view === v ? 'on' : ''}" data-view="${v}">${l}</button>`).join('')}
    </div>
    <div class="tool-group seg" aria-label="表記">
      ${[['simple', '簡易表記'], ['theory', '理論表記']].map(([v, l]) => `<button class="seg-btn ${prefs.spelling === v ? 'on' : ''}" data-spelling="${v}" title="${v === 'theory' ? 'F♯キーの♯IVを B♯ と書くなど、度数に沿った綴り' : 'コード譜サイトでよく見る綴り（B♯→C など）'}">${l}</button>`).join('')}
    </div>
  </div>

  <div class="tabs" role="tablist">
    ${TABS.map(([t, l]) => `<a role="tab" aria-selected="${t === tab}" class="tab ${t === tab ? 'on' : ''}" href="#/song/${esc(id)}?tab=${t}">${l}</a>`).join('')}
  </div>
  <div class="tab-body">${songTab(tab)}</div>
  <div class="legend">
    <span><i class="sw f-T"></i>トニック</span><span><i class="sw f-SD"></i>サブドミナント</span>
    <span><i class="sw f-D"></i>ドミナント</span><span><i class="sw nd"></i>ノンダイアトニック</span>
    <span class="muted">コードをタップすると音と解説が出ます</span>
  </div>`;
}

function keyNowLabel() {
  const k = displayKey();
  const tuning = current.song.tuning;
  let note = shift === 0 ? '（原曲）' : `（${shift > 0 ? '+' : ''}${shift}）`;
  if (tuning?.playKeyShift && shift === tuning.playKeyShift) note = `（${tuning.label}で原曲の音）`;
  return `${pretty(k.name)} <small>${esc(note)}</small>`;
}

function songTab(tab) {
  switch (tab) {
    case 'progressions': return progressionsTab();
    case 'key': return keyTab();
    case 'notes': return notesTab();
    case 'sources': return sourcesTab();
    default: return chartTab();
  }
}

function chartTab() {
  const est = current.sections.some((s) => s.confidence === 'estimated');
  const formLine = current.song.form
    ? `<p class="form-line"><span class="tool-label">曲の構成</span> ${current.form.map((s) => `<a href="#sec-${s.si}" class="chip ghost">${esc(s.name)}</a>`).join('<span class="arrow">→</span>')}</p>`
    : '';
  return `
    ${formLine}
    ${current.song.chartNote ? `<p class="muted small">${esc(current.song.chartNote)}</p>` : ''}
    ${est ? `<p class="notice">「推定・要検証」のセクションは、曲中で使われるコードから組み立てた暫定データです。正確な譜面は<a href="#/song/${esc(current.song.id)}?tab=sources">出典</a>のサイトで確認してください。</p>` : ''}
    <p class="muted small">歌詞は掲載していません（著作権保護のため）。コードの並びと度数のみを表示しています。</p>
    ${current.sections.map((_, si) => sectionCard(current, si)).join('')}`;
}

function progressionsTab() {
  const m = current;
  const total = m.flat.length;
  const nd = m.flat.filter((it) => !it.analysis.diatonic);
  // 度数ごとの使用回数
  const counts = new Map();
  m.flat.forEach((it) => {
    const d = degreeName({ ...it.chord, bass: null }, m.key);
    counts.set(d, (counts.get(d) ?? 0) + 1);
  });
  const ranking = [...counts].sort((a, b) => b[1] - a[1]);
  const max = ranking[0]?.[1] ?? 1;
  const where = (it) => `${esc(m.sections[it.si].name)} ${it.bi + 1}小節目`;

  return `
  <section class="panel">
    <h2>検出された進行パターン</h2>
    <p class="muted">ディグリーで「2-5-1」「4-5-3-6」などの有名な型や、ベースラインの動きを自動で検出しています。</p>
    ${m.patterns.length ? `<ol class="pattern-list">${m.patterns.map((p) => `
      <li>
        <div class="p-head"><span class="p-num">${pretty(p.numbers)}</span><b>${esc(p.name)}</b>
          ${p.chromatic ? '<span class="chip ghost">半音を含む</span>' : ''}
          ${m.sections[p.start.si].confidence === 'estimated' ? '<span class="badge conf-estimated">推定セクション</span>' : ''}</div>
        <div class="muted small">${where(p.start)} 〜 ${p.end.si !== p.start.si ? esc(m.sections[p.end.si].name) + ' ' : ''}${p.end.bi + 1}小節目　${p.id.startsWith('bass') ? `ベース音：${pretty(p.chords.map((c) => spellPc((c.bass ?? c.root).pc + shift, displayKey(), prefs.spelling)).join('→'))}` : pretty(p.roman)}</div>
        <div class="mini-row">${p.chords.map((c) => {
          const it = m.flat.find((f) => f.chord === c);
          return it ? chordButton(it) : '';
        }).join('<span class="arrow">→</span>')}</div>
        ${lessonLink(p.lesson)}
      </li>`).join('')}</ol>` : '<p>定番パターンは検出されませんでした。</p>'}
  </section>

  <section class="panel">
    <h2>ダイアトニック以外のコード <span class="count">${nd.length} / ${total}</span></h2>
    ${nd.length ? `<ul class="nd-list">${nd.map((it) => `
      <li>${chordButton(it)}<div><div>${it.analysis.tags.filter((t) => !['first-inversion', 'second-inversion', 'seventh-bass', 'pedal', 'four-over-five', 'hybrid', 'tension'].includes(t.id)).map((t) => `${esc(t.label)} ${lessonLink(t.lesson, '解説')}`).join('<br>')}</div>
      <div class="muted small">${where(it)}</div></div></li>`).join('')}</ul>` : '<p>すべてダイアトニックコードです。</p>'}
  </section>

  <section class="panel">
    <h2>度数ごとの使用回数</h2>
    <ul class="bars-chart">${ranking.map(([d, n]) => `<li><span class="lbl">${pretty(d)}</span><span class="bar-track"><span class="bar-fill" style="width:${(n / max) * 100}%"></span></span><span class="n">${n}</span></li>`).join('')}</ul>
  </section>`;
}

function keyTab() {
  const m = current;
  const s = m.song;
  const changes = s.keyChanges ?? [{ section: m.sections[0]?.id, key: s.key, type: 'original' }];
  // 構成順（form）に並べ、各区間のキーを求める。keyChanges の section は form 上の位置（formIndex）でも指定できる
  const segs = m.form.map((sec, fi) => {
    const kc = [...changes].reverse().find((c) => (c.formIndex ?? m.form.findIndex((x) => x.id === c.section)) <= fi) ?? changes[0];
    return { sec, key: parseKey(kc.key) };
  });
  const modulations = changes.filter((c) => c.type !== 'original');
  const dk = displayKey();
  const used = new Set(m.flat.map((it) => mod12(it.chord.root.pc - m.key.pc) + ':' + it.chord.quality.family));
  const diat = diatonicChords(dk);
  const ivs = [0, 2, 4, 5, 7, 9, 11];
  const fams = ['maj', 'min', 'min', 'maj', 'maj', 'min', 'dim'];

  return `
  <section class="panel">
    <h2>キーの流れ</h2>
    <div class="timeline">${segs.map(({ sec, key }) => `<div class="seg" style="flex:${sec.bars.length * (sec.repeat ?? 1)}" title="${esc(sec.name)}">
      <span class="seg-name">${esc(sec.name)}</span><span class="seg-key">${pretty(keyFromPc(key.pc + shift).name)}</span></div>`).join('')}</div>
    ${modulations.length ? `<ul>${modulations.map((c) => `<li><b>${esc(c.section)}</b>：${pretty(c.key)} へ転調（${esc(c.type)}）${esc(c.note ?? '')}</li>`).join('')}</ul>`
      : `<p><b>転調：なし</b>　${esc(changes[0].note ?? '')}</p>`}
    <p class="muted small">帯の長さは各セクションの小節数の目安です。</p>
    ${lessonLink('modulation', '転調の種類を学ぶ')}
  </section>

  ${s.tuning ? `<section class="panel">
    <h2>演奏キーとチューニング</h2>
    <p>${esc(s.tuning.note)}</p>
    <p>「転調」は曲の途中でキーが変わること、「移調」は曲全体のキーを変えることです。半音下げチューニングは<b>移調</b>の一種で、曲の中のコード進行（度数）は変わりません。</p>
    <p><button class="pill" data-set-shift="${s.tuning.playKeyShift}">${esc(s.tuning.label)}のフォームで表示する</button></p>
    ${lessonLink('transpose')}
  </section>` : ''}

  <section class="panel">
    <h2>カポを使う場合（表示中のキー ${pretty(dk.name)}）</h2>
    <ul class="capo">${capoSuggestions(dk).map((c) => `<li><b>${c.capo === 0 ? 'カポなし' : `カポ ${c.capo}`}</b>　${esc(c.shape)} のフォームで弾く</li>`).join('')}</ul>
  </section>

  <section class="panel">
    <h2>${pretty(dk.name)} メジャーのダイアトニックコード</h2>
    <p class="muted small">この曲で使われている度数に ● を付けています。</p>
    <table class="diatonic"><thead><tr><th>度数</th><th>三和音</th><th>四和音</th><th>機能</th><th>使用</th></tr></thead>
    <tbody>${diat.map((d, i) => `<tr class="f-${d.func}"><td>${pretty(d.roman)}</td>
      <td><button class="chip-btn" data-play="${esc(d.triad)}" data-play-key="${esc(dk.name)}">${pretty(d.triad)}</button></td>
      <td><button class="chip-btn" data-play="${esc(d.seventh)}" data-play-key="${esc(dk.name)}">${pretty(d.seventh)}</button></td>
      <td>${FUNC_LABEL[d.func]}</td><td>${[...used].some((u) => u.startsWith(ivs[i] + ':') && (u.endsWith(fams[i]) || (fams[i] === 'maj' && /dom|sus/.test(u)))) ? '●' : ''}</td></tr>`).join('')}</tbody></table>
    ${lessonLink('diatonic')}
  </section>`;
}

function notesTab() {
  const m = current;
  const hs = m.song.highlights ?? [];
  if (!hs.length) {
    return `<section class="panel"><p>この曲にはまだ解説がありません。「コード進行」タブで自動解析の結果を確認できます。</p></section>`;
  }
  return hs.map((h, i) => {
    const si = m.sections.findIndex((s) => s.id === h.section);
    const sec = m.sections[si];
    return `<article class="panel note" id="hl-${i + 1}">
      <h2><span class="hl-num">${i + 1}</span>${pretty(h.title)}</h2>
      <div class="muted small">${esc(sec.name)} ${h.bars[0] + 1}〜${h.bars[1] + 1}小節目
        ${sec.confidence === 'estimated' ? '<span class="badge conf-estimated">推定セクション</span>' : ''}</div>
      <div class="bars view-${prefs.view} compact">${barsHTML(m, si, h.bars[0], h.bars[1])}</div>
      <p>${pretty(h.body)}</p>
      ${lessonLink(h.lesson)}
    </article>`;
  }).join('');
}

function sourcesTab() {
  const s = current.song;
  return `
  <section class="panel">
    <h2>このページのデータについて</h2>
    <ul>
      <li>歌詞は掲載していません。コード譜サイトの譜面（歌詞とコードを組み合わせたページ）も転載していません。</li>
      <li>コードの並びは、下記の公開情報を参照して本アプリが独自に書き起こしたものです。解説文は本アプリのオリジナルです。</li>
      <li>セクションごとに確度を表示しています：<span class="badge conf-referenced">照合済み</span> <span class="badge conf-estimated">推定・要検証</span></li>
    </ul>
    <p><a href="#/about">データの扱い方針（引用ルール）を見る →</a></p>
  </section>
  ${s.sources?.length ? `<section class="panel">
    <h2>参照した情報源 <span class="muted small">（参照日 ${esc(s.accessed ?? '')}）</span></h2>
    <ul class="src-list">${s.sources.map((x) => `<li><a href="${esc(x.url)}" target="_blank" rel="noopener noreferrer">${esc(x.site)} ↗</a><div class="muted small">${esc(x.used)}</div></li>`).join('')}</ul>
  </section>` : ''}
  <section class="panel">
    <h2>正確なコード譜を見る</h2>
    ${externalLinks(s.title + (s.artist ? ' ' + s.artist : ''))}
  </section>`;
}

// ---------------------------------------------------------------------------
// ページ：理論

function theoryIndex() {
  const groups = [...new Set(LESSONS.map((l) => l.group))];
  return `<nav class="crumbs"><a href="#/">ホーム</a> / 音楽理論</nav>
  <h1>音楽理論を学ぶ</h1>
  <p class="lead">曲ページの解説から各レッスンにリンクしています。例のコードはタップすると鳴らせます。</p>
  ${groups.map((g) => `<section><h2>${esc(g)}</h2><div class="lesson-grid">${LESSONS.filter((l) => l.group === g).map(lessonCard).join('')}</div></section>`).join('')}`;
}

function lessonPage(id) {
  const l = findLesson(id);
  if (!l) return theoryIndex();
  const i = LESSONS.indexOf(l);
  const prev = LESSONS[i - 1];
  const next = LESSONS[i + 1];
  const examples = (l.examples ?? []).map((ex) => {
    const key = parseKey(ex.key);
    const chords = parseChart(ex.chart).flat();
    return miniProgression(chords, key, `${ex.label}（キー ${prettyAccidentals(key.name)}）`);
  }).join('');
  const related = SONGS.filter((s) => (s.highlights ?? []).some((h) => h.lesson === l.id));
  return `<nav class="crumbs"><a href="#/">ホーム</a> / <a href="#/theory">音楽理論</a> / ${esc(l.title)}</nav>
  <article class="lesson">
    <span class="group">${esc(l.group)}</span>
    <h1>${esc(l.title)}</h1>
    <p class="lead">${esc(l.summary)}</p>
    <div class="prose">${l.body}</div>
    ${l.widget === 'diatonic' ? diatonicWidget() : ''}
    ${examples ? `<h2>例を聴いてみる</h2>${examples}` : ''}
    ${related.length ? `<h2>この理論が出てくる曲</h2><ul>${related.map((s) => `<li><a href="#/song/${esc(s.id)}?tab=notes">${esc(s.title)} / ${esc(s.artist)}</a>：${(s.highlights ?? []).filter((h) => h.lesson === l.id).map((h) => esc(prettyAccidentals(h.title))).join('、')}</li>`).join('')}</ul>` : ''}
    <nav class="pager">${prev ? `<a href="#/theory/${prev.id}">← ${esc(prev.title)}</a>` : '<span></span>'}${next ? `<a href="#/theory/${next.id}">${esc(next.title)} →</a>` : ''}</nav>
  </article>`;
}

function diatonicWidget(keyName = 'C') {
  return `<div class="panel widget" id="diatonic-widget">
    <label>キー <select id="dw-key">${KEY_NAMES.map((k) => `<option ${k === keyName ? 'selected' : ''}>${k}</option>`).join('')}</select></label>
    <div id="dw-table">${diatonicTable(parseKey(keyName))}</div></div>`;
}

function diatonicTable(key) {
  return `<table class="diatonic"><thead><tr><th>度数</th><th>三和音</th><th>四和音</th><th>機能</th></tr></thead><tbody>
    ${diatonicChords(key).map((d) => `<tr class="f-${d.func}"><td>${pretty(d.roman)}</td>
    <td><button class="chip-btn" data-play="${esc(d.triad)}" data-play-key="${esc(key.name)}">${pretty(d.triad)}</button> <span class="muted small">${pretty(d.romanTriad)}</span></td>
    <td><button class="chip-btn" data-play="${esc(d.seventh)}" data-play-key="${esc(key.name)}">${pretty(d.seventh)}</button> <span class="muted small">${pretty(d.romanSeventh)}</span></td>
    <td>${FUNC_LABEL[d.func]}</td></tr>`).join('')}</tbody></table>`;
}

// ---------------------------------------------------------------------------
// ページ：自分で入力して解析

const SAMPLE = `[Aメロ]
| C | G/B | Am | Em/G |
| F | C/E | Dm7 | G7 |
[サビ]
| FM7 | G7 | Em7 | Am |
| Dm7 | E7 | Am | A7 |
| Dm7 | G7 | C | C |`;

function analyzePage(params) {
  return `<nav class="crumbs"><a href="#/">ホーム</a> / コードを入力して解析</nav>
  <h1>コードを入力して解析</h1>
  <p class="lead">コード譜サイトで見たコードを入力すると、ディグリー・進行パターン・ノンダイアトニックコードを自動で解析します。</p>
  <p class="notice">⚠ 歌詞は入力しないでください（コード名のみ）。入力内容はこの端末のブラウザにだけ保存され、外部には送信されません。</p>
  <form id="analyze-form" class="panel analyze-form">
    <div class="row">
      <label>曲名 <input name="title" value="${esc(params.get('title') ?? '')}" placeholder="曲名"></label>
      <label>アーティスト <input name="artist" placeholder="アーティスト名"></label>
      <label>キー <select name="key"><option value="auto">自動判定</option>${KEY_NAMES.map((k) => `<option value="${k}">${k} メジャー</option>`).join('')}</select></label>
    </div>
    <label>コード（[セクション名] で区切り、小節は | で区切る）
      <textarea name="chart" rows="9" spellcheck="false" placeholder="${esc(SAMPLE)}"></textarea></label>
    <div class="row">
      <button type="submit">解析する</button>
      <button type="button" class="ghost" id="fill-sample">サンプルを入れる</button>
    </div>
    <p class="error" id="analyze-error" hidden></p>
  </form>
  <div id="analyze-result"></div>`;
}

function runAnalyze(form) {
  const fd = new FormData(form);
  const err = $('#analyze-error');
  err.hidden = true;
  try {
    const sections = parseSections(fd.get('chart') || '');
    if (!sections.length) throw new Error('コードを入力してください。');
    const allChords = sections.flatMap((s) => parseChart(s.chart).flat());
    const key = fd.get('key') === 'auto' ? guessKey(allChords) : parseKey(fd.get('key'));
    const song = {
      id: `my-${Date.now()}`,
      title: fd.get('title') || '無題',
      artist: fd.get('artist') || '',
      key: key.name.replace('♯', '#').replace('♭', 'b'),
      user: true,
      sections: sections.map((s, i) => ({ id: `s${i}`, name: s.name, chart: s.chart, confidence: 'user' })),
    };
    current = prepare(song);
    shift = 0;
    $('#analyze-result').innerHTML = `
      <section class="panel">
        <h2>解析結果：${pretty(key.name)} メジャー${fd.get('key') === 'auto' ? '（自動判定）' : ''}</h2>
        <p class="muted small">短調の曲は、平行調（例：Am → C）のメジャーキーとして度数を表示します。</p>
        <button id="save-song">マイリストに保存して曲ページを開く</button>
      </section>
      ${current.sections.map((_, si) => sectionCard(current, si)).join('')}
      ${progressionsTab()}`;
    $('#save-song').addEventListener('click', () => {
      const list = loadMySongs();
      list.push(song);
      if (!saveMySongs(list)) alert('このブラウザでは保存できませんでした。');
      location.hash = `#/song/${song.id}`;
    });
  } catch (e) {
    err.textContent = e.message;
    err.hidden = false;
  }
}

// ---------------------------------------------------------------------------
// ページ：データ方針

function aboutPage() {
  return `<nav class="crumbs"><a href="#/">ホーム</a> / データの扱い方針</nav>
  <article class="prose">
  <h1>データの扱い方針（法的に安全な引用ルール）</h1>
  <p>本アプリは ChordWiki・U-FRET・リンネのコードブック・コード進行メモ倉庫などのコード譜サイトを<b>情報の参照先</b>として扱い、以下のルールで運用します。</p>
  <h2>やらないこと</h2>
  <ul>
    <li><b>歌詞の掲載</b>：歌詞は著作物です。一部であっても掲載しません。</li>
    <li><b>コード譜ページの転載・スクレイピング</b>：各サイトの譜面は歌詞・レイアウトと一体の編集物で、利用規約で転載や機械的な収集が禁じられていることがあります。ページの取得・複製・自動収集は行いません。</li>
    <li><b>サイトのデザインやロゴの利用</b>、各サイトの公式と誤解される表示。</li>
  </ul>
  <h2>やること</h2>
  <ul>
    <li><b>コード名の並び（事実情報）だけを独自に書き起こす</b>：個々のコードやありふれた進行そのものは一般に著作権の保護対象になりにくい情報です。公開情報を参照し、本アプリで改めて記述します。</li>
    <li><b>解説はオリジナルの文章</b>：理論解説・分析はすべて本アプリが書いたものです。</li>
    <li><b>出典の明示とリンク</b>：参照したページを曲ごとに明記し、正確な譜面は元のサイトで見てもらうようリンクします。</li>
    <li><b>引用する場合の4要件</b>（著作権法32条）：他サイトの文章等をやむを得ず引用するときは、①本文が主・引用が従、②引用部分を明確に区別、③出所の明示、④必要最小限、を守ります。</li>
    <li><b>確度の表示</b>：照合済みか推定かをセクションごとに表示し、誤りの指摘を受け付けます。</li>
  </ul>
  <p class="muted small">※ 本ページは方針の説明であり、法的助言ではありません。公開・商用化の前には、各サイトの最新の利用規約の確認と、必要に応じて専門家への相談を行ってください。</p>
  </article>`;
}

// ---------------------------------------------------------------------------
// ルーティングとイベント

function route() {
  stop();
  const [path, query = ''] = location.hash.replace(/^#/, '').split('?');
  const params = new URLSearchParams(query);
  const parts = path.split('/').filter(Boolean);
  let html;
  if (parts[0] === 'song') html = songPage(decodeURIComponent(parts[1] ?? ''), params);
  else if (parts[0] === 'theory') html = parts[1] ? lessonPage(parts[1]) : theoryIndex();
  else if (parts[0] === 'analyze') html = analyzePage(params);
  else if (parts[0] === 'about') html = aboutPage();
  else html = homePage(params);
  const main = $('#main');
  const sameSong = parts[0] === 'song' && main.dataset.song === parts[1];
  main.dataset.song = parts[0] === 'song' ? parts[1] : '';
  main.innerHTML = html;
  hideInfo();
  $$('.nav a').forEach((a) => a.classList.toggle('on', a.getAttribute('href').split('/')[1] === (parts[0] ?? '')));
  if (!sameSong) window.scrollTo(0, 0);
}

function rerenderSong() {
  const y = window.scrollY;
  route();
  window.scrollTo(0, y);
}

function showInfo(item, model = current, sh = shift) {
  const a = item.analysis;
  const k = sh === 0 ? model.key : keyFromPc(model.key.pc + sh);
  const rootName = spellPc(item.chord.root.pc + sh, k, prefs.spelling);
  const notes = chordToneNames(item.chord, rootName, prefs.spelling);
  if (item.chord.bass) notes.unshift(`ベース ${spellPc(item.chord.bass.pc + sh, k, prefs.spelling)}`);
  const box = $('#chord-info');
  box.innerHTML = `
    <button class="close" aria-label="閉じる">×</button>
    <div class="ci-name">${pretty(chordName(item.chord, model, sh))}</div>
    <div class="ci-degree">${pretty(a.degree)} <span class="muted">（${esc(item.chord.quality.label)}）</span></div>
    <div class="small">構成音：${pretty(notes.join(' ・ '))}</div>
    <div class="small">${a.diatonic ? `ダイアトニックコード／機能：<b>${FUNC_LABEL[a.func] ?? '—'}</b>` : '<b class="nd-text">ノンダイアトニックコード</b>'}</div>
    ${a.tags.length ? `<ul>${a.tags.map((t) => `<li>${esc(t.label)} ${lessonLink(t.lesson, '解説')}</li>`).join('')}</ul>` : ''}
    ${item.si >= 0 ? `<div class="muted small">${esc(model.sections[item.si]?.name ?? '')} ${item.bi + 1}小節目</div>` : ''}`;
  box.hidden = false;
}
function hideInfo() {
  const box = $('#chord-info');
  if (box) box.hidden = true;
}

document.addEventListener('click', (e) => {
  const t = e.target.closest('button, a');
  if (!t) return;

  if (t.matches('#chord-info .close')) return hideInfo();

  if (t.dataset.ref && current) {
    const item = current.lookup.get(t.dataset.ref);
    if (item) {
      playChord(item.chord, { shift });
      showInfo(item);
    }
    return;
  }
  if (t.dataset.mini !== undefined) {
    const mini = t.closest('.mini');
    const key = parseKey(mini.dataset.key);
    const chords = mini.dataset.chords.split(' ').map((s) => parseChart(`| ${s} |`)[0][0]);
    const i = Number(t.dataset.mini);
    playChord(chords[i]);
    showInfo({ chord: chords[i], analysis: analyzeChord(chords[i], key, chords[i - 1], chords[i + 1]), si: -1, bi: -1 }, { key, sections: [] }, 0);
    return;
  }
  if (t.classList.contains('play-mini')) {
    const mini = t.closest('.mini');
    const chords = mini.dataset.chords.split(' ').map((s) => parseChart(`| ${s} |`)[0][0]);
    const btns = $$('[data-mini]', mini);
    playBars(chords.map((c) => [c]), {
      bpm: 120,
      onStep: (bi) => btns.forEach((b, i) => b.classList.toggle('playing', i === bi)),
      onEnd: () => btns.forEach((b) => b.classList.remove('playing')),
    });
    return;
  }
  if (t.classList.contains('play-sec')) {
    const si = Number(t.dataset.si);
    const sec = current.sections[si];
    const bars = Array.from({ length: sec.repeat ?? 1 }, () => sec.bars).flat();
    const card = $(`#sec-${si}`);
    const clear = () => $$('.chord.playing', card).forEach((b) => b.classList.remove('playing'));
    playBars(bars, {
      bpm: current.song.playBpm ?? 96,
      shift,
      onStep: (bi, ci) => {
        clear();
        $(`[data-ref="${si}-${bi % sec.bars.length}-${ci}"]`, card)?.classList.add('playing');
      },
      onEnd: clear,
    });
    return;
  }
  if (t.dataset.play) {
    const c = parseChart(`| ${t.dataset.play.replace(/♯/g, '#').replace(/♭/g, 'b')} |`)[0][0];
    playChord(c);
    return;
  }
  if (t.dataset.shift) {
    shift = Math.max(-11, Math.min(11, shift + Number(t.dataset.shift)));
    return rerenderSong();
  }
  if (t.dataset.setShift !== undefined) {
    shift = Number(t.dataset.setShift);
    return rerenderSong();
  }
  if (t.dataset.view) {
    prefs.view = t.dataset.view;
    savePrefs();
    return rerenderSong();
  }
  if (t.dataset.spelling) {
    prefs.spelling = t.dataset.spelling;
    savePrefs();
    return rerenderSong();
  }
  if (t.dataset.tabLink && current) {
    e.preventDefault();
    location.hash = `#/song/${current.song.id}?tab=${t.dataset.tabLink}`;
    const anchor = t.getAttribute('href');
    setTimeout(() => $(anchor)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 30);
    return;
  }
  if (t.id === 'fill-sample') {
    const f = $('#analyze-form');
    f.chart.value = SAMPLE;
    f.title.value ||= 'サンプル進行';
  }
});

document.addEventListener('submit', (e) => {
  if (e.target.id === 'search-form') {
    e.preventDefault();
    const q = new FormData(e.target).get('q').trim();
    location.hash = q ? `#/?q=${encodeURIComponent(q)}` : '#/';
  }
  if (e.target.id === 'analyze-form') {
    e.preventDefault();
    runAnalyze(e.target);
  }
});

document.addEventListener('change', (e) => {
  if (e.target.id === 'dw-key') {
    $('#dw-table').innerHTML = diatonicTable(parseKey(e.target.value));
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') hideInfo();
});

window.addEventListener('hashchange', route);
route();
