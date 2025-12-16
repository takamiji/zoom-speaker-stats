#!/usr/bin/env node

/**
 * デプロイセットアップスクリプト
 * manifest.jsonのテンプレートから実際のファイルを作成する
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const manifestExamplePath = path.join(rootDir, 'manifest.json.example');
const manifestPath = path.join(rootDir, 'manifest.json');

// manifest.jsonが既に存在するか確認
if (fs.existsSync(manifestPath)) {
  console.log('⚠️  manifest.json は既に存在します。');
  console.log('   上書きする場合は、手動で削除してから再実行してください。');
  process.exit(0);
}

// manifest.json.exampleが存在するか確認
if (!fs.existsSync(manifestExamplePath)) {
  console.error('❌ manifest.json.example が見つかりません。');
  process.exit(1);
}

// manifest.json.exampleをコピー
try {
  const manifestContent = fs.readFileSync(manifestExamplePath, 'utf-8');
  fs.writeFileSync(manifestPath, manifestContent, 'utf-8');
  
  console.log('✅ manifest.json を作成しました。');
  console.log('');
  console.log('📝 次の手順:');
  console.log('   1. manifest.json を開いて、以下の項目を編集してください:');
  console.log('      - app_url: ngrokのURLに置き換え');
  console.log('      - app_icon: アイコンのURLに置き換え（オプション）');
  console.log('      - app_contact: あなたのメールアドレスに置き換え');
  console.log('');
  console.log('   2. ngrokを起動: ngrok http 3000');
  console.log('   3. ngrokのURLをmanifest.jsonのapp_urlに設定');
  console.log('   4. Zoom Marketplaceでアプリを登録');
} catch (error) {
  console.error('❌ エラーが発生しました:', error.message);
  process.exit(1);
}


