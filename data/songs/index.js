// 収録曲の一覧。曲を追加するときは data/songs/<id>.js を作ってここに登録する。
import snowSmile from './snow-smile.js';

export const SONGS = [snowSmile];

export function findSong(id) {
  return SONGS.find((s) => s.id === id) ?? null;
}
