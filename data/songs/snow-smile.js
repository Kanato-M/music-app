// スノースマイル / BUMP OF CHICKEN
//
// ■ データの作り方（法的に安全な引用方針。詳細は docs/DATA_POLICY.md）
// - 歌詞は一切収録しない（歌詞は著作物。コード譜サイトの譜面も歌詞と一体の編集物）。
// - コード譜ページを転載しない。参照したページからは「コード名の並び」（事実情報）だけを読み取り、
//   本アプリのデータ形式で書き起こす。解説は本アプリのオリジナル文章とする。
// - 参照した情報源は sources に明記し、各サイトへリンクして本物の譜面はそちらで見てもらう。
//
// ■ 原曲キーについて
//   参照元の譜面は「半音下げチューニング＋G フォーム」で書かれているため、半音下げて
//   原曲の F♯ メジャーで記録している（G→F♯, D→C♯, C→B, A♯dim→Adim …）。
//
// ■ confidence（データの確度）
//   'referenced' … 公開コード譜とコードの並びを照合済み（小節割りは本アプリの解釈）
//   'estimated'  … 推定（要検証）

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
    note: 'ギターは半音下げチューニングにして G のフォームで弾くと原曲キー（F♯）で鳴ります。コード譜サイトの多くもこの G フォームで掲載しています。',
  },
  tags: ['下行ベースライン', '分数コード', 'パッシング・ディミニッシュ', '♯IVm7-5', 'Bメロなし'],
  summary:
    'ダイアトニックコード中心の素直な F♯ メジャーの曲。Aメロではベースが 1 オクターブ以上かけて音階を下りていき、' +
    'サビでは分数コード・パッシング・ディミニッシュ・♯IVm7-5 による半音の動きが「切なさ」を作ります。' +
    'Bメロを置かず Aメロからサビへ直結する構成と、全編転調なしでシンプルに聴かせる作りも特徴です。',
  chartNote:
    'コードの順番はリンネのコードブックの全編譜面と照合済みです。小節の区切りは本アプリの解釈で、実際の譜割りとは異なる場合があります。',

  sections: [
    {
      id: 'intro',
      name: 'イントロ',
      confidence: 'referenced',
      chart: '| C# C#add11 | C# C#add11 |',
    },
    {
      id: 'verse',
      name: 'Aメロ',
      confidence: 'referenced',
      chart: `
| F# | C# B | F#/A# G#m | F# C#/F |
| D#m | C# | B | F# G#m |
| F#/A# | B | F#/A# | B |
| G#m7 A#m7 | B | B/C# | C# |`,
    },
    {
      id: 'chorus',
      name: 'サビ',
      confidence: 'referenced',
      chart: `
| C#/B | F# | G#m7 | F# G#m7 |
| Adim F#/A# | C#/B | F#/A# | D#m7 Cm7-5 |
| B | B/C# | C# | C#sus4 C# |`,
    },
    {
      id: 'link',
      name: 'つなぎ',
      confidence: 'referenced',
      chart: '| B A#m7 | G#m7 |',
    },
    {
      id: 'bridge',
      name: 'ブリッジ',
      confidence: 'referenced',
      chart: `
| C#/B | F#/A# | G#m7 G#m7/F# | F# |
| C#/B | F#/A# | G#m7 G#m7/D# | F# |`,
    },
    {
      id: 'outro',
      name: 'アウトロ',
      confidence: 'referenced',
      chart: `
| F# | C#/B | F#/A# | G#m7 A#m7 | B C# |
| F# | C#/B | F#/A# | G#m7 A#m7 | B C# | F# |`,
    },
  ],

  // 曲の構成（セクションの登場順）。最後の Aメロは後奏として使われる。
  form: ['intro', 'verse', 'verse', 'chorus', 'link', 'verse', 'chorus', 'bridge', 'chorus', 'link', 'verse', 'outro'],

  // キーの流れ。転調がある曲では { section（または formIndex）, key, type, note } を複数並べる。
  keyChanges: [
    {
      section: 'intro',
      key: 'F#',
      type: 'original',
      note: '全編を通して F♯ メジャーのまま転調しません（参照した全編譜面で確認）。最後のサビでもキーを上げず、同じ響きのまま締めくくります。',
    },
  ],

  // 解説（本アプリのオリジナル文章）。bars は [開始小節, 終了小節]（0 始まり）
  highlights: [
    {
      section: 'intro',
      bars: [0, 1],
      title: 'V（C♯）の上で揺れるイントロ',
      lesson: 'functions',
      body:
        'トニックの F♯ ではなく、ドミナントの C♯ と C♯add11 を行き来するリフで始まります。add11 は 3rd を残したまま 4th（F♯）を足した響きで、' +
        'sus4 に似た「宙に浮いた」感じを作ります。V に留まって焦らしてから、Aメロ頭の F♯（I）へ解決する流れです。',
    },
    {
      section: 'verse',
      bars: [1, 5],
      title: '1オクターブ下りていくベースライン',
      lesson: 'slash-chords',
      body:
        'C♯ → B → F♯/A♯ → G♯m → F♯ → C♯/F → D♯m → C♯ と、ベースが C♯・B・A♯・G♯・F♯・E♯(F)・D♯・C♯ と音階を 1 音ずつ下りていきます。' +
        'F♯/A♯ や C♯/F のような転回形（3度ベース）を使うことで、コードが変わってもベースは滑らかにつながります。' +
        'カノン進行と同じ発想の「下行ベース」で、語りかけるような落ち着いた雰囲気を生んでいます。',
    },
    {
      section: 'verse',
      bars: [8, 15],
      title: 'I/III ⇄ IV の揺れから、IIm7 → IIIm7 → IV と上っていく',
      lesson: 'functions',
      body:
        '後半は F♯/A♯ と B を 2 回行き来してから、G♯m7 → A♯m7 → B とルートが上行して盛り上げ、' +
        'B/C♯（IV/V）→ C♯（V）でいったん溜めます。前半の「下る」動きと後半の「上る」動きが対になっていて、' +
        'Bメロを挟まなくても自然にサビ（あるいは次の Aメロ頭の I）へ向かう推進力が生まれます。',
    },
    {
      section: 'chorus',
      bars: [0, 1],
      title: 'C♯/B：7th をベースに置いたサビ頭',
      lesson: 'slash-chords',
      body:
        'サビは C♯/B から始まります。B は C♯7 の 7th で、7th は半音下へ解決したがる音。' +
        '次の F♯ の 3rd（A♯）へ B → A♯ と下りることで解決感が生まれます（譜面によっては F♯/A♯ と書き、ベースで B → A♯ を弾く形もあります）。' +
        'サビの頭をトニックではなく「不安定なドミナント」にすることで、強く前に進む印象になります。',
    },
    {
      section: 'chorus',
      bars: [3, 4],
      title: 'Adim：パッシング・ディミニッシュ',
      lesson: 'passing-dim',
      body:
        'F♯ → G♯m7 → Adim → F♯/A♯ で、ベースが F♯ → G♯ → A → A♯ と半音を含んで上がります。' +
        'Adim（ギターの G フォームでは A♯dim／B♭dim）は F♯ メジャーのダイアトニックにない音 A を含む経過和音で、' +
        '2 つのコードの「隙間」を半音でつなぐ役割です。',
    },
    {
      section: 'chorus',
      bars: [7, 8],
      title: '♯IVm7-5（B♯m7-5）からの半音下行',
      lesson: 'sharp-four-m7b5',
      body:
        'D♯m7 → B♯m7-5（譜面上は Cm7-5 と書かれることが多い。G フォームでは C♯m7-5）→ B。' +
        '♯IVm7-5 は J-POP の泣きどころで頻出するノンダイアトニックコードで、ルートが B♯ → B と半音で下りて IV へ着地します。' +
        '「明るいキーなのに一瞬だけ陰る」響きが、サビ後半の切なさを担っています。',
    },
    {
      section: 'chorus',
      bars: [9, 11],
      title: 'IV/V → V → Vsus4 → V：ドミナントを引き延ばす',
      lesson: 'slash-chords',
      body:
        'B/C♯（IV/V）は「ベースはドミナント、上はサブドミナント」という二面性のある和音で、V9sus4 に近い響きです。' +
        'そこから C♯ → C♯sus4 → C♯ とドミナントのまま 4th を出し入れして、解決（F♯）までの時間をたっぷり取っています。',
    },
    {
      section: 'link',
      bars: [0, 1],
      title: 'IV → IIIm7 → IIm7 → I：順次下行のつなぎ',
      lesson: 'functions',
      body:
        'サビの後は B → A♯m7 → G♯m7 と、ダイアトニックコードをルートが 1 音ずつ下りて、次の Aメロ頭の F♯ に着地します。' +
        'ドミナント（V）を使わずに I へ戻るので、強い終止感はなく、そのまま次のコーラスへ流れ込みます。',
    },
    {
      section: 'bridge',
      bars: [2, 3],
      title: '同じコードの下でベースだけが動く',
      lesson: 'slash-chords',
      body:
        '2 番サビの後のブリッジでは、サビ頭と同じ C♯/B → F♯/A♯ → G♯m7 を使いつつ、G♯m7 のままベースを F♯ や D♯ に動かします（G♯m7/F♯、G♯m7/D♯）。' +
        '和音は変えずにベースだけを動かすことで、景色を少しずつ変えながら最後のサビへつなぎます。',
    },
  ],

  // 参照した情報源（コード譜の転載は行わず、リンクで案内する）
  sources: [
    {
      site: 'リンネのコードブック',
      url: 'https://www.chord-rinne.jp/scode.php?id=4625',
      used: '全編のコードの並び（半音下げ・G フォーム表記）・BPM・作詞作曲クレジットを照合（コード名のみ参照）',
    },
    {
      site: 'ChordWiki',
      url: 'https://beta.chordwiki.org/song/%E3%82%B9%E3%83%8E%E3%83%BC%E3%82%B9%E3%83%9E%E3%82%A4%E3%83%AB',
      used: 'キー（F♯）・BPM・半音下げの情報（検索結果の表示内容のみ。ページ本体はボット対策により未取得）',
    },
    {
      site: 'J-Total Music',
      url: 'https://music.j-total.net/data/026ha/012_BUMP_OF_CHICKEN/002.html',
      used: '原曲キー F♯／半音ダウンで G フォームという情報の照合（検索結果の表示内容）',
    },
    {
      site: 'なつばやしギター小学校',
      url: 'https://knatsubrand81.com/score/score-105.html',
      used: 'サビの進行（G フォーム表記）の照合（検索結果の表示内容）',
    },
  ],
  accessed: '2026-11-04',
};
