/**
 * CSVパーサー関数
 */

export interface GroupMember {
  グループID: number;
  名前: string;
  国籍: string;
  学年: string;
  学部: string;
  興味関心キーワード: string;
}

export interface GroupData {
  [groupId: number]: GroupMember[];
}

/**
 * CSVファイルをパースしてグループデータに変換
 */
export function parseCSV(csvText: string): GroupData {
  const lines = csvText.split("\n").filter((line) => line.trim() !== "");
  if (lines.length === 0) {
    throw new Error("CSVファイルが空です");
  }

  // ヘッダー行を取得
  const headers = lines[0].split(",").map((h) => h.trim());

  // 必須カラムの確認
  const requiredColumns = [
    "グループID",
    "名前",
    "国籍",
    "学年",
    "学部",
    "興味関心キーワード",
  ];
  const missingColumns = requiredColumns.filter(
    (col) => !headers.includes(col)
  );
  if (missingColumns.length > 0) {
    throw new Error(`必須カラムが見つかりません: ${missingColumns.join(", ")}`);
  }

  // データ行をパース
  const groupData: GroupData = {};

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const values = parseCSVLine(line);

    if (values.length !== headers.length) {
      console.warn(`行 ${i + 1} のカラム数が一致しません。スキップします。`);
      continue;
    }

    const member: GroupMember = {
      グループID: parseInt(values[headers.indexOf("グループID")], 10),
      名前: values[headers.indexOf("名前")],
      国籍: values[headers.indexOf("国籍")],
      学年: values[headers.indexOf("学年")],
      学部: values[headers.indexOf("学部")],
      興味関心キーワード: values[headers.indexOf("興味関心キーワード")],
    };

    if (isNaN(member.グループID)) {
      console.warn(`行 ${i + 1} のグループIDが無効です。スキップします。`);
      continue;
    }

    if (!groupData[member.グループID]) {
      groupData[member.グループID] = [];
    }

    groupData[member.グループID].push(member);
  }

  return groupData;
}

/**
 * CSV行をパース（カンマ区切り、ダブルクォート対応）
 */
function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // エスケープされたダブルクォート
        current += '"';
        i++;
      } else {
        // クォートの開始/終了
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      // カンマで区切る
      values.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  // 最後の値を追加
  values.push(current.trim());

  return values;
}

/**
 * 名前でグループメンバーを検索（完全一致優先、部分一致フォールバック）
 */
export function findMemberByName(
  name: string,
  groupData: GroupData
): GroupMember | null {
  // すべてのグループから検索
  for (const groupId in groupData) {
    const members = groupData[parseInt(groupId, 10)];

    // 完全一致を優先
    const exactMatch = members.find((m) => m.名前 === name);
    if (exactMatch) {
      return exactMatch;
    }

    // 部分一致
    const partialMatch = members.find(
      (m) => m.名前.includes(name) || name.includes(m.名前)
    );
    if (partialMatch) {
      return partialMatch;
    }
  }

  return null;
}

/**
 * グループIDでグループメンバーを取得
 */
export function getGroupMembers(
  groupId: number,
  groupData: GroupData
): GroupMember[] {
  return groupData[groupId] || [];
}

/**
 * 利用可能なグループIDのリストを取得
 */
export function getAvailableGroupIds(groupData: GroupData): number[] {
  return Object.keys(groupData)
    .map((id) => parseInt(id, 10))
    .sort((a, b) => a - b);
}
