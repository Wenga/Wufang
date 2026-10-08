import {test} from 'node:test';
import assert from 'node:assert/strict';
import {phrases,translate,preferredLanguage} from '../public/i18n.js';
test('all interface phrases have three translations and unique source keys',()=>{
  assert.equal(new Set(phrases.map(p=>p[0])).size,phrases.length);
  for(const row of phrases){assert.equal(row.length,3);for(const cell of row)assert.ok(cell.length);assert.equal(translate(row[0],'zh-TW'),row[1]);assert.equal(translate(row[0],'en'),row[2]);}
});
test('counts, combined tastes and whitespace translate without losing values',()=>{
  assert.equal(translate('共同作品 · 已留下 12 笔','en'),'Shared artwork · 12 strokes');
  assert.equal(translate('装置已连接 · 3 笔等候中','zh-TW'),'裝置已連線 · 3 筆等候中');
  assert.equal(translate('南京 · 鲜 · 柔','en'),'Nanjing · Umami · Gentle');
  assert.equal(translate(' 显示水墨山水','en'),' Show ink landscape');
  assert.equal(translate('50%','en'),'50%');
  assert.match(translate('已生成 8 笔共同作品。若未自动下载，可打开图片保存。','en'),/8 strokes/);
});
test('browser locale chooses Simplified, Traditional or English',()=>{
  assert.equal(preferredLanguage('zh-Hant-HK'),'zh-TW');assert.equal(preferredLanguage('zh-CN'),'zh-CN');assert.equal(preferredLanguage('zh-SG'),'zh-CN');assert.equal(preferredLanguage('en-US'),'en');
});
