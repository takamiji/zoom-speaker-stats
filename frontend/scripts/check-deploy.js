#!/usr/bin/env node

/**
 * デプロイ前チェックスクリプト
 * manifest.jsonの設定が正しいか確認する
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const manifestPath = path.join(rootDir, 'manifest.json');

console.log('🔍 デプロイ前チェックを実行しています...\n');

// manifest.jsonが存在するか確認
if (!fs.existsSync(manifestPath)) {
  console.error('❌ manifest.json が見つかりません。');
  console.log('   npm run deploy:setup を実行してmanifest.jsonを作成してください。');
  process.exit(1);
}

// manifest.jsonを読み込む
let manifest;
try {
  const manifestContent = fs.readFileSync(manifestPath, 'utf-8');
  manifest = JSON.parse(manifestContent);
} catch (error) {
  console.error('❌ manifest.json の読み込みに失敗しました:', error.message);
  process.exit(1);
}

// 必須項目のチェック
const requiredFields = [
  'app_name',
  'version',
  'app_type',
  'app_url',
  'app_desc',
  'app_contact',
  'app_category',
  'app_permissions'
];

const missingFields = requiredFields.filter(field => !manifest[field]);
if (missingFields.length > 0) {
  console.error('❌ 必須項目が不足しています:');
  missingFields.forEach(field => {
    console.error(`   - ${field}`);
  });
  process.exit(1);
}

// プレースホルダーのチェック
const placeholders = {
  'app_url': 'your-ngrok-url.ngrok',
  'app_icon': 'your-ngrok-url.ngrok',
  'app_contact': 'your-email@example.com'
};

const issues = [];
for (const [field, placeholder] of Object.entries(placeholders)) {
  if (manifest[field] && manifest[field].includes(placeholder)) {
    issues.push({
      field,
      message: `${field} がプレースホルダーのままです。実際の値に置き換えてください。`
    });
  }
}

// app_urlがngrokのURLか確認
if (manifest.app_url && !manifest.app_url.includes('ngrok.io') && !manifest.app_url.includes('ngrok-free.dev') && !manifest.app_url.includes('ngrok-free.app')) {
  issues.push({
    field: 'app_url',
    message: 'app_url はngrokのURL（.ngrok.io または .ngrok-free.dev）である必要があります。'
  });
}

// 権限のチェック
const requiredPermissions = [
  'getMeetingParticipants',
  'onActiveSpeakerChange',
  'onParticipantChange'
];

const missingPermissions = requiredPermissions.filter(
  perm => !manifest.app_permissions.includes(perm)
);

if (missingPermissions.length > 0) {
  issues.push({
    field: 'app_permissions',
    message: `以下の権限が不足しています: ${missingPermissions.join(', ')}`
  });
}

// 結果の表示
if (issues.length > 0) {
  console.log('⚠️  以下の問題が見つかりました:\n');
  issues.forEach(issue => {
    console.log(`   ${issue.field}: ${issue.message}`);
  });
  console.log('\n❌ デプロイ前に上記の問題を修正してください。');
  process.exit(1);
}

console.log('✅ すべてのチェックが完了しました。');
console.log('\n📋 manifest.json の内容:');
console.log(`   - アプリ名: ${manifest.app_name}`);
console.log(`   - バージョン: ${manifest.version}`);
console.log(`   - URL: ${manifest.app_url}`);
console.log(`   - カテゴリ: ${manifest.app_category}`);
console.log(`   - 権限数: ${manifest.app_permissions.length}`);
console.log('\n✅ デプロイの準備が整いました！');

