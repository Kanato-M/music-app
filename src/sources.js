// 外部のコード譜・コード進行サイト。
// 本アプリはこれらのサイトのページを取得・転載せず、「検索リンク」と「出典リンク」で案内する。
// （各サイトの利用規約は転載・機械的な収集を禁じている場合があるため。docs/DATA_POLICY.md 参照）

const google = (site, q) =>
  `https://www.google.com/search?q=${encodeURIComponent(`site:${site} ${q}`)}`;

export const EXTERNAL_SITES = [
  {
    id: 'chordwiki',
    name: 'ChordWiki',
    description: 'ユーザー投稿型のコード譜共有サイト。キー・BPM 情報も充実。',
    search: (q) => google('chordwiki.org', q),
  },
  {
    id: 'ufret',
    name: 'U-FRET',
    description: '国内最大級のギターコード譜サイト。動画プラスで弾き方も確認できる。',
    search: (q) => `https://www.ufret.jp/search.php?key=${encodeURIComponent(q)}`,
  },
  {
    id: 'rinne',
    name: 'リンネのコードブック',
    description: 'コード譜サイト。押さえ方のダイアグラム付き。',
    search: (q) => google('chord-rinne.jp', q),
  },
  {
    id: 'memo',
    name: 'コード進行メモ倉庫',
    description: '楽曲のコード進行をディグリーで分析・記録しているサイト。',
    search: (q) => `https://www.google.com/search?q=${encodeURIComponent(`"コード進行メモ倉庫" ${q}`)}`,
  },
];
