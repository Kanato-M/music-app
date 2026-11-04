// スノースマイル / BUMP OF CHICKEN
//
// ■ データの作り方（法的に安全な引用方針。詳細は docs/DATA_POLICY.md）
// - 歌詞は一切収録しない（歌詞は著作物。コード譜サイトの譜面も歌詞と一体の編集物）。
// - コード譜サイトのページを転載・スクレイピングしない。公開情報を参照して
//   コード名の並び（事実情報）だけを独自に書き起こし、解説は本アプリのオリジナル文章とする。
// - 参照した情報源は sources に明記し、各サイトへリンクして本物の譜面はそちらで見てもらう。
//
// ■ confidence（データの確度）
//   'referenced' … 複数の公開コード譜の情報と照合したセクション
//   'estimated'  … 曲中で使われるコードから推定したセクション（要検証）

export default {
  id: 'snow-smile',
  title: 'スノースマイル',
  reading: 'すのーすまいる',
  romaji: 'snow smile',
  artist: 'BUMP OF CHICKEN',
  artistReading: 'ばんぷおぶちきん',
  credits: { lyrics: '藤原基央', music: '藤原基央' },
  released: '2002年12月（シングル）',
  key: 'F#',
  tempo: 'BPM 73（ハーフタイム・シャッフル表記）',
  meter: '4/4',
  tuning: {
    label: '半音下げチューニング',
    playKeyShift: 1, // 半音下げチューニングなら G のフォームで弾ける
    note: 'ギターは半音下げチューニングにして G のフォームで弾くと原曲キー（F♯）で鳴ります。',
  },
  tags: ['分数コード', 'パッシング・ディミニッシュ', '♯IVm7-5', 'ツーファイブ', 'ベースライン'],
  summary:
    'ダイアトニックコード中心の素直な F♯ メジャーの曲ですが、分数コードによるなめらかなベースライン、' +
    'サビの パッシング・ディミニッシュ と ♯IVm7-5 による半音の動きが「切なさ」を作っています。' +
    'ギターでは半音下げチューニング＋G フォームという、バンドで定番の弾き方を学べる曲でもあります。',

  sections: [
    {
      id: 'intro',
      name: 'イントロ',
      confidence: 'referenced',
      repeat: 2,
      chart: '| C# | F#/A# | G#m7 | B |',
    },
    {
      id: 'verse',
      name: 'Aメロ',
      confidence: 'estimated',
      repeat: 2,
      chart: `
| F#add9 | B/F# | F#add9 | B/F# |
| C#/F | D#m7 | G#m7 | B/C# C#7 |`,
    },
    {
      id: 'pre-chorus',
      name: 'Bメロ',
      confidence: 'estimated',
      chart: `
| B | C#/B | A#m7 | D#m7 |
| G#m7 | F#/A# | B | B/C# C#7 |`,
    },
    {
      id: 'chorus',
      name: 'サビ',
      confidence: 'referenced',
      chart: `
| C#/B | F#/A# | G#m7 | F# G#m |
| Adim F#/A# | F#add9 | D#m7 | Cm7-5 |
| Badd9 | B/C# | C# |`,
    },
  ],

  // キーの流れ。転調がある曲では { section, key, type, note } を複数並べる。
  keyChanges: [
    {
      section: 'intro',
      key: 'F#',
      type: 'original',
      note: '本データの範囲（イントロ〜サビ）では転調は確認されず、全編 F♯ メジャーとして解析しています。',
    },
  ],

  // 解説（本アプリのオリジナル文章）。bars は [開始小節, 終了小節]（0 始まり）
  highlights: [
    {
      section: 'intro',
      bars: [0, 3],
      title: 'V（ドミナント）から始まるイントロ',
      lesson: 'functions',
      body:
        'いきなりトニック（F♯）ではなく、ドミナントの C♯ から始まります。V は「I に戻りたい」力を持つ和音なので、' +
        '曲の冒頭から前へ進む推進力が生まれます。続く F♯/A♯ → G♯m7 → B は ベースが A♯ → G♯ と下がりつつ、' +
        'T → SD へと流れる穏やかな動きです。',
    },
    {
      section: 'verse',
      bars: [0, 3],
      title: 'トニック・ペダル（F♯add9 ⇄ B/F♯）',
      lesson: 'slash-chords',
      body:
        'ベースは F♯ に留めたまま、上の和音だけ I と IV を行き来しています（IV/I）。' +
        'ベースが動かないので落ち着きがありつつ、上声の動きでゆらぎが出る、ギター・ロックで多用される手法です。' +
        'add9 の 9th（G♯）が加わることで、冬の空気のような透明感が出ます。',
    },
    {
      section: 'verse',
      bars: [4, 7],
      title: '3度ベースと「拡張ツーファイブワン」',
      lesson: 'two-five-one',
      body:
        'C♯/F（V の第1転回形）はベースが E♯(F) になり、次の D♯m7 へ半音でつながります。' +
        'その後の G♯m7 → B/C♯ → C♯7 → （繰り返しの頭の F♯add9）は、IIm7 → V → I の「ツーファイブワン」。' +
        'V の手前に IV/V（B/C♯）を挟むことで、いきなり V7 に行くより柔らかく溜めを作っています。',
    },
    {
      section: 'pre-chorus',
      bars: [0, 3],
      title: '王道進行の形（IV → V/IV → IIIm7 → VIm）',
      lesson: 'famous-progressions',
      body:
        'B → C♯/B → A♯m7 → D♯m7 は「4-5-3-6」の王道進行の形です。V をベース B の上に置く（V/IV）ことで、' +
        'ベースは B のまま上だけが動き、A♯m7 へ半音下行します。※このセクションは推定データです。',
    },
    {
      section: 'chorus',
      bars: [0, 2],
      title: 'C♯/B → F♯/A♯ → G♯m7：7度ベースの解決',
      lesson: 'slash-chords',
      body:
        'C♯/B は C♯7 の 7th（B）をベースに置いた形（第3転回形）。7th は半音下へ解決したがる音なので、' +
        'ベースは B → A♯（I の3度）へ自然に下がり、さらに G♯ へ。サビの頭からベースが「下りていく」ことで、' +
        '高揚と同時にどこか切ない印象になります。',
    },
    {
      section: 'chorus',
      bars: [3, 4],
      title: 'Adim：パッシング・ディミニッシュ',
      lesson: 'passing-dim',
      body:
        'F♯ → G♯m → Adim → F♯/A♯ でベースが F♯ → G♯ → A → A♯ と半音を含んで上がります。' +
        'Adim（ギターの G フォームなら B♭dim）は F♯ メジャーのダイアトニックにない音 A を含む経過和音で、' +
        '2つのコードの「隙間」を半音でつなぐ役割です。',
    },
    {
      section: 'chorus',
      bars: [6, 8],
      title: '♯IVm7-5（B♯m7-5）からの半音下行',
      lesson: 'sharp-four-m7b5',
      body:
        'D♯m7 → B♯m7-5（譜面上は Cm7-5 と書かれることが多い）→ Badd9。♯IVm7-5 は J-POP の泣きどころで頻出する' +
        'ノンダイアトニックコードで、ルートが B♯ → B と半音で下りて IV へ着地します。' +
        '「明るいキーなのに一瞬だけ陰る」響きがサビ後半の切なさを担っています。',
    },
    {
      section: 'chorus',
      bars: [9, 10],
      title: 'IV/V（B/C♯）で溜めてから V へ',
      lesson: 'slash-chords',
      body:
        'B/C♯ は「ベースはドミナント（C♯）、上はサブドミナント（B）」という二面性のある和音で、' +
        'V9sus4 に近い響きです。ここで一度ふわっと溜めてから C♯ に落ち着き、次の I へ解決します。',
    },
  ],

  // 参照した情報源（コード譜の転載は行わず、リンクで案内する）
  sources: [
    {
      site: 'ChordWiki',
      url: 'https://beta.chordwiki.org/song/%E3%82%B9%E3%83%8E%E3%83%BC%E3%82%B9%E3%83%9E%E3%82%A4%E3%83%AB',
      used: 'キー（F♯）・BPM・半音下げ（簡単コード：移調+1）・使用コードの一覧を参照',
    },
    {
      site: 'ChordWiki（旧版）',
      url: 'https://ja.chordwiki.org/wiki/%E3%82%B9%E3%83%8E%E3%83%BC%E3%82%B9%E3%83%9E%E3%82%A4%E3%83%AB',
      used: '作詞・作曲クレジットの確認',
    },
    {
      site: 'J-Total Music',
      url: 'https://music.j-total.net/data/026ha/012_BUMP_OF_CHICKEN/002.html',
      used: '原曲キー F♯／半音ダウンで G フォームという情報の照合',
    },
    {
      site: 'music-chord.com',
      url: 'https://music-chord.com/songs/%E3%82%B9%E3%83%8E%E3%83%BC%E3%82%B9%E3%83%9E%E3%82%A4%E3%83%AB-BUMP_OF_CHICKEN/',
      used: 'イントロの進行（G フォーム表記）の照合',
    },
    {
      site: 'なつばやしギター小学校',
      url: 'https://knatsubrand81.com/score/score-105.html',
      used: 'サビの進行（G フォーム表記）の照合',
    },
    {
      site: 'リンネのコードブック',
      url: 'https://www.chord-rinne.jp/scode.php?id=4625',
      used: '照合用リンク（未取得）',
    },
  ],
  accessed: '2026-11-04',
};
