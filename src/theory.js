// 音楽理論エンジン
// コード名の解析・移調・ディグリー表記・ダイアトニック判定・ノンダイアトニックの分類・
// 有名進行の検出を行う。DOM に依存しないので Node のテストからも使える。

const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const LETTER_PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const ACC_VALUE = { '#': 1, '♯': 1, b: -1, '♭': -1 };

/** メジャースケールの構成音（主音からの半音数） */
export const MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11];

/** 主音からの半音数 → [スケール上の度数(0-6), 臨時記号, ローマ数字] */
const DEGREE_TABLE = {
  0: [0, '', 'I'],
  1: [1, '♭', 'II'],
  2: [1, '', 'II'],
  3: [2, '♭', 'III'],
  4: [2, '', 'III'],
  5: [3, '', 'IV'],
  6: [3, '♯', 'IV'],
  7: [4, '', 'V'],
  8: [5, '♭', 'VI'],
  9: [5, '', 'VI'],
  10: [6, '♭', 'VII'],
  11: [6, '', 'VII'],
};

/** 上行の経過和音（♯Idim, ♯Vdim など）で使うシャープ側の度数 */
const SHARP_DEGREES = { 1: [0, '♯', 'I'], 3: [1, '♯', 'II'], 8: [4, '♯', 'V'] };
const degreeEntry = (interval, preferSharp) =>
  (preferSharp && SHARP_DEGREES[interval]) || DEGREE_TABLE[interval];
/** ディミニッシュはルートを ♯I・♯V で綴る（D♭dim ではなく C♯dim） */
const prefersSharp = (chord, key) =>
  chord.quality.family === 'dim' && [1, 8].includes(mod12(chord.root.pc - key.pc));

/** 12 キーの表記（調号の少ない方を採用） */
export const KEY_NAMES = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];

export const mod12 = (n) => ((n % 12) + 12) % 12;

/** "F#" "Bb" "B♭" などを {letter, acc, pc} に */
export function parseNote(str) {
  const m = /^([A-G])([#♯b♭]{0,2})$/.exec(str.trim());
  if (!m) return null;
  const acc = [...m[2]].reduce((s, c) => s + ACC_VALUE[c], 0);
  return { letter: m[1], acc, pc: mod12(LETTER_PC[m[1]] + acc) };
}

/** キー名（"F#", "F♯", "Gb" …）を {letter, acc, pc, name} に */
export function parseKey(str) {
  const n = parseNote(str.replace(/\s*(major|maj|メジャー)$/i, ''));
  if (!n) throw new Error(`キーを解釈できません: ${str}`);
  return { ...n, name: n.letter + accString(n.acc) };
}

/** 半音数（0-11）のキーを、表記の素直なキーとして返す */
export function keyFromPc(pc) {
  return parseKey(KEY_NAMES[mod12(pc)]);
}

function accString(acc) {
  if (acc === 0) return '';
  if (acc > 0) return acc === 2 ? '𝄪' : '♯'.repeat(acc);
  return '♭'.repeat(-acc);
}

// ---------------------------------------------------------------------------
// コードの品質（クオリティ）
// family: maj | min | dom | dim | hdim | aug | sus
const Q = (family, intervals, label) => ({ family, intervals, label });
const QUALITY_TABLE = {
  '': Q('maj', [0, 4, 7], 'メジャー'),
  M: Q('maj', [0, 4, 7], 'メジャー'),
  maj: Q('maj', [0, 4, 7], 'メジャー'),
  add9: Q('maj', [0, 4, 7, 14], 'アドナインス'),
  add2: Q('maj', [0, 2, 4, 7], 'アドツー'),
  '6': Q('maj', [0, 4, 7, 9], 'シックス'),
  '69': Q('maj', [0, 4, 7, 9, 14], 'シックスナインス'),
  M7: Q('maj', [0, 4, 7, 11], 'メジャーセブンス'),
  maj7: Q('maj', [0, 4, 7, 11], 'メジャーセブンス'),
  '△7': Q('maj', [0, 4, 7, 11], 'メジャーセブンス'),
  M9: Q('maj', [0, 4, 7, 11, 14], 'メジャーナインス'),
  m: Q('min', [0, 3, 7], 'マイナー'),
  m7: Q('min', [0, 3, 7, 10], 'マイナーセブンス'),
  m9: Q('min', [0, 3, 7, 10, 14], 'マイナーナインス'),
  m6: Q('min', [0, 3, 7, 9], 'マイナーシックス'),
  mM7: Q('min', [0, 3, 7, 11], 'マイナーメジャーセブンス'),
  madd9: Q('min', [0, 3, 7, 14], 'マイナーアドナインス'),
  m11: Q('min', [0, 3, 7, 10, 17], 'マイナーイレブンス'),
  '7': Q('dom', [0, 4, 7, 10], 'セブンス'),
  '9': Q('dom', [0, 4, 7, 10, 14], 'ナインス'),
  '13': Q('dom', [0, 4, 10, 21], 'サーティーンス'),
  '7(b9)': Q('dom', [0, 4, 7, 10, 13], 'セブンス・フラットナインス'),
  '7(#9)': Q('dom', [0, 4, 7, 10, 15], 'セブンス・シャープナインス'),
  '7sus4': Q('dom', [0, 5, 7, 10], 'セブンスサスフォー'),
  sus4: Q('sus', [0, 5, 7], 'サスフォー'),
  sus2: Q('sus', [0, 2, 7], 'サスツー'),
  dim: Q('dim', [0, 3, 6], 'ディミニッシュ'),
  dim7: Q('dim', [0, 3, 6, 9], 'ディミニッシュセブンス'),
  'm7-5': Q('hdim', [0, 3, 6, 10], 'マイナーセブンフラットファイブ'),
  aug: Q('aug', [0, 4, 8], 'オーギュメント'),
  aug7: Q('aug', [0, 4, 8, 10], 'オーギュメントセブンス'),
};
const QUALITY_ALIASES = {
  o: 'dim', o7: 'dim7', '°': 'dim', '°7': 'dim7',
  m7b5: 'm7-5', 'm7(b5)': 'm7-5', 'm7(-5)': 'm7-5', ø: 'm7-5', ø7: 'm7-5',
  '+': 'aug', '+7': 'aug7', '7#5': 'aug7',
  min: 'm', min7: 'm7', '-': 'm', '-7': 'm7',
  'm(9)': 'madd9', '(9)': 'add9', 'add(9)': 'add9', '7(9)': '9',
  'M7(9)': 'M9', 'maj9': 'M9', 'mmaj7': 'mM7', 'm(maj7)': 'mM7',
  '6(9)': '69', '6/9': '69',
};

function resolveQuality(q) {
  const key = QUALITY_ALIASES[q] ?? q;
  if (QUALITY_TABLE[key]) return { ...QUALITY_TABLE[key], symbol: q };
  // 未知の表記はおおまかに推定する
  if (/^m(?!aj)/.test(q)) return { ...QUALITY_TABLE.m, symbol: q, label: 'マイナー系' };
  if (/dim/.test(q)) return { ...QUALITY_TABLE.dim, symbol: q };
  if (/^7/.test(q)) return { ...QUALITY_TABLE['7'], symbol: q, label: 'セブンス系' };
  return { ...QUALITY_TABLE[''], symbol: q, label: 'メジャー系' };
}

/**
 * コード名を解析する。
 * @returns {{symbol, root, quality, bass}|null}
 */
export function parseChord(symbol) {
  const s = symbol.trim();
  const m = /^([A-G][#♯b♭]?)([^/]*?)(?:\/([A-G][#♯b♭]?))?$/.exec(s);
  if (!m) return null;
  const root = parseNote(m[1]);
  const bass = m[3] ? parseNote(m[3]) : null;
  if (!root) return null;
  return { symbol: s, root, quality: resolveQuality(m[2]), bass };
}

/** コードの構成音（ピッチクラス集合。ベース音を含む） */
export function chordPitchClasses(chord) {
  const pcs = new Set(chord.quality.intervals.map((i) => mod12(chord.root.pc + i)));
  if (chord.bass) pcs.add(chord.bass.pc);
  return pcs;
}

// ---------------------------------------------------------------------------
// 表記（スペル）と移調

/**
 * キーに対して音名を綴る。
 * 「理論的表記」(theory) では度数に沿った綴り（F♯キーの #IV は B♯）、
 * 「簡易表記」(simple) では E♯→F, B♯→C のように実用的な綴りにする。
 */
export function spellPc(pc, key, mode = 'simple', preferSharp = false) {
  const interval = mod12(pc - key.pc);
  const [step] = degreeEntry(interval, preferSharp);
  const letter = LETTERS[(LETTERS.indexOf(key.letter) + step) % 7];
  let acc = mod12(pc - LETTER_PC[letter]);
  if (acc > 6) acc -= 12;
  let name = letter + accString(acc);
  if (mode === 'simple') name = simplify(letter, acc, key);
  return name;
}

function simplify(letter, acc, key) {
  const pc = mod12(LETTER_PC[letter] + acc);
  const awkward = Math.abs(acc) > 1 || ['E♯', 'B♯', 'C♭', 'F♭'].includes(letter + accString(acc));
  if (!awkward) return letter + accString(acc);
  const useFlats = key.acc < 0 || (key.acc === 0 && key.letter === 'F');
  const sharpNames = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
  const flatNames = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'];
  return (useFlats ? flatNames : sharpNames)[pc];
}

/** ASCII の # / b を ♯ / ♭ に揃える（表示用） */
export function prettyAccidentals(s) {
  return s.replace(/([A-G])#/g, '$1♯').replace(/([A-G])b/g, '$1♭');
}

/**
 * コードの構成音を、ルートからの音程に沿って綴る（例：Adim → A・C・E♭）。
 * rootName は表示中の表記でのルート名。
 */
export function chordToneNames(chord, rootName, mode = 'simple') {
  const root = parseNote(rootName.replace('♯', '#').replace('♭', 'b'));
  const fam = chord.quality.family;
  const stepFor = (iv) => {
    if (iv === 8) return fam === 'aug' ? 4 : 5;
    if (iv === 9) return fam === 'dim' ? 6 : 5;
    return { 0: 0, 1: 1, 2: 1, 3: 2, 4: 2, 5: 3, 6: 4, 7: 4, 10: 6, 11: 6 }[iv];
  };
  const names = chord.quality.intervals.map((raw) => {
    const iv = mod12(raw);
    const ext = raw > 12 ? { 13: 1, 14: 1, 15: 1, 17: 3, 21: 5 }[raw] : undefined;
    const letter = LETTERS[(LETTERS.indexOf(root.letter) + (ext ?? stepFor(iv))) % 7];
    let acc = mod12(root.pc + iv - LETTER_PC[letter]);
    if (acc > 6) acc -= 12;
    const pseudoKey = { letter: root.letter, acc: root.acc, pc: root.pc };
    return mode === 'simple' ? simplify(letter, acc, pseudoKey) : letter + accString(acc);
  });
  return names;
}

/** 解析済みコードを、指定キーの表記で文字列化 */
export function formatChord(chord, key, mode = 'simple', shift = 0) {
  const root = spellPc(chord.root.pc + shift, key, mode, prefersSharp(chord, keyFromPc(key.pc - shift)));
  const bass = chord.bass ? '/' + spellPc(chord.bass.pc + shift, key, mode) : '';
  return root + chord.quality.symbol + bass;
}

// ---------------------------------------------------------------------------
// ディグリー（度数）

/** 主音からの半音数をローマ数字に（臨時記号つき） */
export function romanFor(interval, preferSharp = false) {
  const [, acc, roman] = degreeEntry(mod12(interval), preferSharp);
  return acc + roman;
}

/** アラビア数字の度数（「2-5-1」表記用） */
export function arabicFor(interval) {
  const [step, acc] = DEGREE_TABLE[mod12(interval)];
  return acc + String(step + 1);
}

/** コードのディグリー表記（例: IIm7, IV/V, ♭IIIdim） */
export function degreeName(chord, key) {
  const r = romanFor(chord.root.pc - key.pc, prefersSharp(chord, key));
  const b = chord.bass ? '/' + romanFor(chord.bass.pc - key.pc) : '';
  return r + chord.quality.symbol + b;
}

/** キーのダイアトニックコード（三和音・四和音） */
export function diatonicChords(key) {
  const triadQ = ['', 'm', 'm', '', '', 'm', 'dim'];
  const seventhQ = ['M7', 'm7', 'm7', 'M7', '7', 'm7', 'm7-5'];
  const funcs = ['T', 'SD', 'T', 'SD', 'D', 'T', 'D'];
  return MAJOR_SCALE.map((iv, i) => {
    const root = spellPc(key.pc + iv, key, 'simple');
    return {
      degree: i + 1,
      roman: romanFor(iv),
      triad: root + triadQ[i],
      seventh: root + seventhQ[i],
      romanTriad: romanFor(iv) + triadQ[i],
      romanSeventh: romanFor(iv) + seventhQ[i],
      func: funcs[i],
    };
  });
}

/** コードの機能（T / SD / D）。ダイアトニック以外は null */
export function harmonicFunction(chord, key) {
  const iv = mod12(chord.root.pc - key.pc);
  const map = { 0: 'T', 2: 'SD', 4: 'T', 5: 'SD', 7: 'D', 9: 'T', 11: 'D' };
  return map[iv] ?? null;
}

// ---------------------------------------------------------------------------
// ダイアトニック判定とノンダイアトニックの分類

/** 構成音がすべてメジャースケール内ならダイアトニック */
export function isDiatonic(chord, key) {
  const scale = new Set(MAJOR_SCALE.map((i) => mod12(key.pc + i)));
  return [...chordPitchClasses(chord)].every((pc) => scale.has(pc));
}

const isMajorLike = (c) => ['maj', 'dom', 'sus'].includes(c.quality.family);

/**
 * 1 つのコードを、前後の文脈つきで分析する。
 * @returns {{degree, func, diatonic, tags: {id, label, lesson}[]}}
 */
export function analyzeChord(chord, key, prev = null, next = null) {
  const iv = mod12(chord.root.pc - key.pc);
  const fam = chord.quality.family;
  const nextIv = next ? mod12(next.root.pc - key.pc) : null;
  const diatonic = isDiatonic(chord, key);
  const tags = [];
  const tag = (id, label, lesson) => tags.push({ id, label, lesson });

  if (!diatonic) {
    const target = mod12(iv + 5); // 完全4度上（=完全5度下）への解決先
    if (fam === 'dom' && nextIv !== null && mod12(iv - 1) === nextIv && iv !== 7) {
      tag('tritone-sub', `裏コード（${romanFor(nextIv)} へ半音下で解決するドミナント）`, 'secondary-dominant');
    } else if ((fam === 'dom' || fam === 'maj') && [2, 4, 9, 11].includes(iv) && iv !== 7) {
      const resolved = nextIv === target;
      tag(
        'secondary-dominant',
        `セカンダリードミナント（${romanFor(target)} に対する V${fam === 'dom' ? '7' : ''}）${resolved ? '→ 解決' : ''}`,
        'secondary-dominant',
      );
    } else if (fam === 'dom' && iv === 0) {
      tag('secondary-dominant', 'セカンダリードミナント（IV に対する V7）', 'secondary-dominant');
    } else if (fam === 'dim') {
      if (next && mod12((next.bass ?? next.root).pc - chord.root.pc) === 1) {
        tag('passing-dim', 'パッシング・ディミニッシュ（半音上のコードへつなぐ経過和音）', 'passing-dim');
      } else if (next && mod12(chord.root.pc - (next.bass ?? next.root).pc) === 1) {
        tag('passing-dim', 'パッシング・ディミニッシュ（下行型）', 'passing-dim');
      } else if (next && next.root.pc === chord.root.pc) {
        tag('aux-dim', 'オルタード／補助的ディミニッシュ（同じルートへ戻る）', 'passing-dim');
      } else {
        tag('dim', 'ディミニッシュ（ドミナント的な緊張を持つ和音）', 'passing-dim');
      }
    } else if (fam === 'hdim' && iv === 6) {
      tag('sharp4-m7b5', '♯IVm7-5（半音下行ラインを作るノンダイアトニック）', 'sharp-four-m7b5');
    } else if ((fam === 'min' && [5, 7].includes(iv)) || (fam === 'hdim' && iv === 2) ||
               (isMajorLike(chord) && [3, 8, 10].includes(iv))) {
      const name = fam === 'min' && iv === 5 ? 'サブドミナントマイナー' : '同主短調からの借用和音';
      tag('borrowed', `${name}（モーダル・インターチェンジ）`, 'borrowed');
    } else if (isMajorLike(chord) && iv === 1) {
      tag('borrowed', 'ナポリの和音（♭II）', 'borrowed');
    } else {
      tag('non-diatonic', 'ノンダイアトニックコード', 'diatonic');
    }
  }

  // 分数コード（オンコード）の分類
  if (chord.bass && chord.bass.pc !== chord.root.pc) {
    const bassIv = mod12(chord.bass.pc - chord.root.pc);
    const bassKeyIv = mod12(chord.bass.pc - key.pc);
    if (bassIv === 2 && isMajorLike(chord) && bassKeyIv === 7) {
      tag('four-over-five', 'IV/V 型の分数コード（柔らかいドミナント／V9sus4 の代用）', 'slash-chords');
    } else if (bassIv === 10 || bassIv === 11) {
      tag('seventh-bass', '7度ベース（第3転回形的）：ベースが半音／全音下へ進みやすい', 'slash-chords');
    } else if (bassIv === 3 || bassIv === 4) {
      tag('first-inversion', '第1転回形（3度ベース）：ベースラインを滑らかにする', 'slash-chords');
    } else if (bassIv === 7 && bassKeyIv === 0) {
      tag('pedal', 'トニック・ペダル（ベースを主音に保ったまま上を動かす）', 'slash-chords');
    } else if (bassIv === 7) {
      tag('second-inversion', '第2転回形（5度ベース）', 'slash-chords');
    } else {
      tag('hybrid', 'ハイブリッドコード（ルート以外の音をベースにした分数コード）', 'slash-chords');
    }
  }

  if (chord.quality.symbol.includes('add9') && diatonic) {
    tag('tension', 'テンション（9th）付加：響きに透明感を足す', 'diatonic');
  }

  return {
    degree: degreeName(chord, key),
    func: diatonic ? harmonicFunction(chord, key) : null,
    diatonic,
    tags,
  };
}

// ---------------------------------------------------------------------------
// コード譜（テキスト）の解析

/**
 * "| C# | F#/A# | G#m7 | B |" のような 1 セクション分の譜面テキストを小節の配列に。
 * 1 小節に複数コードがある場合は空白区切り。"%" は直前の小節の繰り返し。
 */
export function parseChart(text) {
  const bars = [];
  for (const line of text.split('\n')) {
    const cells = line.split('|').map((c) => c.trim()).filter(Boolean);
    for (const cell of cells) {
      if (cell === '%') {
        bars.push([...(bars.at(-1) ?? [])]);
        continue;
      }
      const chords = cell.split(/\s+/).filter((t) => t && t !== '-');
      const parsed = chords.map((t) => {
        const c = parseChord(t);
        if (!c) throw new Error(`コードを解釈できません: "${t}"`);
        return c;
      });
      bars.push(parsed);
    }
  }
  return bars;
}

/**
 * "[サビ]" 見出しつきの複数セクションのテキストを解析（自分で入力する解析ページ用）。
 */
export function parseSections(text) {
  const sections = [];
  let current = null;
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    const head = /^\[(.+)\]$/.exec(line);
    if (head) {
      current = { name: head[1], chart: '' };
      sections.push(current);
      continue;
    }
    if (!current) {
      current = { name: 'セクション 1', chart: '' };
      sections.push(current);
    }
    current.chart += (line.includes('|') ? line : `| ${line.split(/\s+/).join(' | ')} |`) + '\n';
  }
  return sections;
}

// ---------------------------------------------------------------------------
// 有名進行・ベースラインの検出

/**
 * 進行の検出に使う「機能上のルート」。
 * IV/V 型（ルートの全音上がベース）の分数コードはドミナントとして扱う。
 */
function functionalRoot(chord) {
  if (chord.bass && mod12(chord.bass.pc - chord.root.pc) === 2 && isMajorLike(chord)) {
    return { pc: chord.bass.pc, family: 'dom' };
  }
  return { pc: chord.root.pc, family: chord.quality.family };
}

// fam: 'min' | 'D'(メジャー/セブンス/sus) | 'maj' | '*'
export const PROGRESSIONS = [
  { id: 'two-five-one', name: 'ツーファイブワン', numbers: '2-5-1', roman: 'IIm7–V7–I', seq: [[2, 'min'], [7, 'D'], [0, '*']], lesson: 'two-five-one' },
  { id: 'royal-road', name: '王道進行', numbers: '4-5-3-6', roman: 'IVM7–V7–IIIm7–VIm', seq: [[5, 'maj'], [7, 'D'], [4, 'min'], [9, 'min']], lesson: 'famous-progressions' },
  { id: 'komuro', name: '小室進行', numbers: '6-4-5-1', roman: 'VIm–IV–V–I', seq: [[9, 'min'], [5, 'maj'], [7, 'D'], [0, '*']], lesson: 'famous-progressions' },
  { id: 'canon', name: 'カノン進行（前半）', numbers: '1-5-6-3', roman: 'I–V–VIm–IIIm', seq: [[0, 'maj'], [7, 'D'], [9, 'min'], [4, 'min']], lesson: 'famous-progressions' },
  { id: 'fifties', name: 'イチロクニーゴー／50s進行', numbers: '1-6-4-5', roman: 'I–VIm–IV–V', seq: [[0, 'maj'], [9, 'min'], [5, 'maj'], [7, 'D']], lesson: 'famous-progressions' },
  { id: 'axis', name: 'アクシス進行', numbers: '1-5-6-4', roman: 'I–V–VIm–IV', seq: [[0, 'maj'], [7, 'D'], [9, 'min'], [5, 'maj']], lesson: 'famous-progressions' },
  { id: 'four-five-one', name: 'フォーファイブワン（終止形）', numbers: '4-5-1', roman: 'IV–V–I', seq: [[5, 'maj'], [7, 'D'], [0, '*']], lesson: 'functions' },
  { id: 'two-five', name: 'ツーファイブ', numbers: '2-5', roman: 'IIm7–V7', seq: [[2, 'min'], [7, 'D']], lesson: 'two-five-one' },
];

function famMatches(want, fam) {
  if (want === '*') return true;
  if (want === 'D') return ['maj', 'dom', 'sus'].includes(fam);
  if (want === 'maj') return ['maj', 'sus'].includes(fam);
  return want === fam;
}

/**
 * 曲全体（セクションの配列）から、進行パターンとベースラインの動きを検出する。
 * @param {{name:string, bars: object[][]}[]} sections
 */
export function detectPatterns(sections, key) {
  // 全コードを位置情報つきで平坦化
  // 繰り返し（repeat）は展開して、繰り返しの頭へ戻る進行も検出できるようにする
  const flat = [];
  sections.forEach((sec, si) => {
    for (let r = 0; r < (sec.repeat ?? 1); r++) {
      sec.bars.forEach((bar, bi) => bar.forEach((chord, ci) => flat.push({ chord, si, bi, ci })));
    }
  });
  const posKey = (it) => `${it.si}-${it.bi}-${it.ci}`;

  // 進行パターン：同じ機能ルートの連続はまとめる（B/C# → C#7 は 1 つの V とみなす）
  const steps = [];
  for (const item of flat) {
    const fr = functionalRoot(item.chord);
    const iv = mod12(fr.pc - key.pc);
    const last = steps.at(-1);
    if (last && last.iv === iv) {
      last.items.push(item);
      continue;
    }
    steps.push({ iv, family: fr.family, items: [item] });
  }

  const found = [];
  const covered = new Set();
  for (const prog of PROGRESSIONS) {
    for (let i = 0; i + prog.seq.length <= steps.length; i++) {
      const ok = prog.seq.every(([iv, fam], k) => steps[i + k].iv === iv && famMatches(fam, steps[i + k].family));
      if (!ok) continue;
      const span = steps.slice(i, i + prog.seq.length);
      const sig = posKey(span[0].items[0]);
      // 繰り返しで同じ箇所を二重に数えない／2-5 が 2-5-1 の一部ならスキップ
      if (covered.has(`${prog.id}:${sig}`)) continue;
      if (prog.id === 'two-five' && covered.has(`two-five-one:${sig}`)) continue;
      covered.add(`${prog.id}:${sig}`);
      found.push({
        ...prog,
        start: span[0].items[0],
        end: span.at(-1).items.at(-1),
        chords: span.flatMap((s) => s.items.map((it) => it.chord)),
      });
    }
  }

  // ベースライン：3 つ以上のコードにわたって 1〜2 半音ずつ同方向に動く箇所
  const basses = [];
  for (const item of flat) {
    const pc = (item.chord.bass ?? item.chord.root).pc;
    if (basses.length && basses.at(-1).pc === pc) continue;
    basses.push({ pc, item });
  }
  const runs = [];
  for (const dir of basses.length ? [-1, 1] : []) {
    let run = [basses[0]];
    for (let i = 1; i <= basses.length; i++) {
      const cur = basses[i];
      const step = cur ? mod12((cur.pc - run.at(-1).pc) * dir) : 99;
      if (cur && step >= 1 && step <= 2) {
        run.push(cur);
      } else {
        if (run.length >= 4 || (run.length >= 3 && run.some((b, k) => k > 0 && mod12((b.pc - run[k - 1].pc) * dir) === 1))) {
          const chromatic = run.some((b) => !MAJOR_SCALE.includes(mod12(b.pc - key.pc)));
          const sig = `${dir}:${posKey(run[0].item)}`;
          if (!covered.has(sig)) runs.push({
            id: dir < 0 ? 'bass-down' : 'bass-up',
            name: dir < 0 ? '下行ベースライン' : '上行ベースライン',
            numbers: run.map((b) => arabicFor(b.pc - key.pc)).join('→'),
            roman: run.map((b) => spellPc(b.pc, key)).join('→'),
            chromatic,
            lesson: 'slash-chords',
            start: run[0].item,
            end: run.at(-1).item,
            chords: run.map((b) => b.item.chord),
          });
          covered.add(sig);
        }
        run = cur ? [cur] : [];
      }
    }
  }

  const order = (p) => p.start.si * 1e6 + p.start.bi * 1e3 + p.start.ci;
  return [...found, ...runs].sort((a, b) => order(a) - order(b));
}

// ---------------------------------------------------------------------------
// キー推定（入力ページ用）

/**
 * コード列から、もっともらしいメジャーキーを推定する。
 * 構成音がスケールに含まれる割合＋最初/最後のコードがトニックかどうかで採点。
 */
export function guessKey(chords) {
  if (!chords.length) return keyFromPc(0);
  let best = { score: -Infinity, pc: 0 };
  for (let pc = 0; pc < 12; pc++) {
    const key = keyFromPc(pc);
    let score = 0;
    for (const c of chords) {
      for (const p of chordPitchClasses(c)) score += MAJOR_SCALE.includes(mod12(p - pc)) ? 1 : -1.5;
      const iv = mod12(c.root.pc - pc);
      if (iv === 0 && c.quality.family !== 'min') score += 1.5;
      if (iv === 7 && c.quality.family === 'dom') score += 1;
      if (iv === 9 && c.quality.family === 'min') score += 0.5;
    }
    const first = chords[0];
    const last = chords.at(-1);
    if (mod12(first.root.pc - pc) === 0) score += 2;
    if (mod12(last.root.pc - pc) === 0) score += 3;
    if (score > best.score) best = { score, pc, key };
  }
  return best.key;
}

/** あるキーを、開放弦で弾きやすいキーにするためのカポ位置 */
export function capoSuggestions(key) {
  const open = [['C', 0], ['G', 7], ['D', 2], ['A', 9], ['E', 4]];
  return open
    .map(([name, pc]) => ({ shape: name, capo: mod12(key.pc - pc) }))
    .filter((s) => s.capo <= 7)
    .sort((a, b) => a.capo - b.capo);
}
