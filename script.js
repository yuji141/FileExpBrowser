let fileData = { files: [] };
let groupData = [];
let categoryList = [];
let isInitializingFocus = false;
// ===== 選択状態（グローバル） =====
let selectedPaths = [];

// ===== モード管理 =====
let mode = 'normal'; // "normal" or "tag"

// ===== ソート状態 =====
let sortColumn = 'updatedAt';
let sortDirection = 'desc';

// ===== 初期ロード =====
window.onload = async function () {
  updateTagCount();
  // ===== 初期ソート表示 =====
  const initialSort = document.getElementById('sort-updatedAt');

  if (initialSort) {
    initialSort.textContent = '▼';
  }
  document.addEventListener('click', function (e) {});
  showSearchPage();

  try {
    // ===== 実行環境判定 =====
    const isLocalFile = location.protocol === 'file:';

    const localArea = document.getElementById('localLoadArea');
    const serverArea = document.getElementById('serverLoadArea');

    // ===== 表示制御 =====
    if (isLocalFile) {
      if (localArea) localArea.style.display = 'block';
      if (serverArea) serverArea.style.display = 'none';

      document.addEventListener('change', function (e) {
        if (e.target.type === 'file') {
        }
      });
    } else {
      if (localArea) localArea.style.display = 'none';
      if (serverArea) serverArea.style.display = 'block';

      const reloadBtn = document.getElementById('reloadButton');
      if (reloadBtn) {
        reloadBtn.addEventListener('click', function () {
          const btn = document.getElementById('loadButton');
          if (btn) btn.click();
        });
      }
    }

    // ===== サーバ時のみJSON取得 =====
    if (!isLocalFile) {
      // filelist
      const fileRes = await fetch('filelist.json?v=' + Date.now());
      fileData = await fileRes.json();

      // categories
      const groupRes = await fetch('categories.json?v=' + Date.now());
      const json = await groupRes.json();

      groupData = json.groups;
      categoryList = json.categories;

      // ===== ★最終更新を保持（重要） =====
      window.currentLastUpdated = json.lastUpdated;

      // ===== ★ここで一度だけ表示（重要） =====
      const lastUpdated = document.getElementById('lastUpdated');
      if (lastUpdated && window.currentLastUpdated) {
        lastUpdated.textContent = '最終更新：' + window.currentLastUpdated;
      }

      // ===== Excelパス表示 =====
      const excelPathArea = document.getElementById('excelPath');
      if (excelPathArea && json.excelPath) {
        excelPathArea.textContent = '更新対象Excel：' + json.excelPath + '（クリックでコピー）';

        excelPathArea.style.cursor = 'pointer';

        excelPathArea.onclick = function () {
          navigator.clipboard.writeText(json.excelPath);

          excelPathArea.textContent = 'コピーしました：' + json.excelPath;

          setTimeout(function () {
            excelPathArea.textContent = '更新対象Excel：' + json.excelPath + '（クリックでコピー）';
          }, 2000);
        };
      }

      // ===== グループ描画 =====
      const groupDiv = document.getElementById('groupList');
      groupDiv.innerHTML = '';

      const folderLabel = document.createElement('label');
      const folderCheckbox = document.createElement('input');
      folderCheckbox.type = 'checkbox';
      folderCheckbox.value = '000_フォルダ';

      folderLabel.appendChild(folderCheckbox);
      folderLabel.appendChild(document.createTextNode('000_フォルダ'));
      groupDiv.appendChild(folderLabel);

      groupData.forEach(function (g) {
        const label = document.createElement('label');
        const checkbox = document.createElement('input');

        checkbox.type = 'checkbox';
        checkbox.value = g.group;

        label.appendChild(checkbox);
        label.appendChild(document.createTextNode(g.group));

        groupDiv.appendChild(label);
      });

      renderCategories();
      renderEditCategories();
      renderExtensions();
      loadData();
      showSearchPage();
    }
  } catch (error) {
    alert('初期読込エラー: ' + error.message);
  }

  // ===== パス欄クリックコピー =====
  const pathInput = document.getElementById('selectedPath');
  if (pathInput) {
    pathInput.addEventListener('click', function () {
      const path = pathInput.value;
      if (!path) return;

      navigator.clipboard.writeText(path);

      const msg = document.getElementById('copyMessage');
      if (msg) {
        msg.textContent = 'パスをコピーしました';
        setTimeout(function () {
          msg.textContent = '';
        }, 2000);
      }
    });
  }
};

// ===== カテゴリ描画（A列＋数値レンジ） =====
function renderCategories() {
  const requiredSelect = document.getElementById('requiredCategory');

  // ★現在選択されている値を保持
  const selectedRequired = requiredSelect?.value || '';

  if (requiredSelect) {
    requiredSelect.innerHTML = '<option value="">未選択</option>';

    const sortedForSelect = [...categoryList].sort(function (a, b) {
      const numA = parseInt(a.split('_')[0], 10);
      const numB = parseInt(b.split('_')[0], 10);
      return numA - numB;
    });

    sortedForSelect.forEach(function (cat) {
      if (cat === 'MasterCategory') return;
      if (cat === '000_フォルダ') return;
      if (cat === '未分類') return;

      const option = document.createElement('option');
      option.value = cat;
      option.textContent = cat;

      // ★選択状態復元
      if (cat === selectedRequired) {
        option.selected = true;
      }

      requiredSelect.appendChild(option);
    });
  }

  const catDiv = document.getElementById('categoryList');
  catDiv.innerHTML = '';

  const checkedGroups = [];

  document.querySelectorAll('#groupList input:checked').forEach(function (cb) {
    checkedGroups.push(cb.value);
  });

  // ソート
  const sortedCategories = [...categoryList].sort(function (a, b) {
    const numA = parseInt(a.split('_')[0], 10);
    const numB = parseInt(b.split('_')[0], 10);
    return numA - numB;
  });

  // ===== グループごとの列作成 =====
  const groupColumns = {};

  groupData.forEach(function (g) {
    // 中分類選択中は対象のみ表示
    if (checkedGroups.length > 0 && !checkedGroups.includes(g.group)) {
      return;
    }

    const column = document.createElement('div');

    const title = document.createElement('h4');
    title.textContent = g.group;
    title.style.margin = '0 0 8px 0';

    column.appendChild(title);

    groupColumns[g.group] = column;
    catDiv.appendChild(column);
  });

  sortedCategories.forEach(function (cat) {
    if (cat === '000_フォルダ') return;
    if (cat === 'MasterCategory') return;

    const num = parseInt(cat.split('_')[0], 10);

    let targetGroup = null;

    for (let i = 0; i < groupData.length; i++) {
      const g = groupData[i];

      if (num >= g.start && num <= g.end) {
        targetGroup = g.group;
        break;
      }
    }

    if (!targetGroup) return;

    if (!groupColumns[targetGroup]) {
      return;
    }

    const label = document.createElement('label');

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = cat;

    const requiredCategory = document.getElementById('requiredCategory')?.value || '';

    if (requiredCategory === cat) {
      checkbox.disabled = true;
      label.style.color = '#999';
    }

    label.appendChild(checkbox);
    label.appendChild(document.createTextNode(cat));

    groupColumns[targetGroup].appendChild(label);
  });

  Object.values(groupColumns).forEach(function (column) {
    if (column.querySelectorAll('label').length === 0) {
      column.remove();
    }
  });
}

// ===== 中分類変更イベント =====
document.addEventListener('change', function (e) {
  // 中分類変更
  if (e.target.closest('#groupList')) {
    renderCategories();
    loadData();
  }

  // カテゴリ変更
  if (e.target.closest('#categoryList')) {
    loadData();
  }
});

// ===== 検索（完全版） =====
function loadData() {
  const keyword = document.getElementById('keyword').value.toLowerCase();

  // ★ tbodyを取得（ここ重要）
  const table = document.getElementById('fileList');
  if (!table) return;

  const tableBody = table.querySelector('tbody');
  if (!tableBody) return;

  tableBody.innerHTML = '';

  // ===== 検索結果件数 =====
  let resultCount = 0;

  const checkedGroups = [];
  document.querySelectorAll('#groupList input:checked').forEach(function (cb) {
    checkedGroups.push(cb.value);
  });

  const checkedCategories = [];
  document.querySelectorAll('#categoryList input:checked').forEach(function (cb) {
    checkedCategories.push(cb.value);
  });

  const checkedExtensions = [];
  document.querySelectorAll('#extListTop input:checked').forEach(function (cb) {
    checkedExtensions.push(cb.value.toLowerCase());
  });

  // ===== 必須カテゴリ =====
  const requiredCategory = document.getElementById('requiredCategory')?.value || '';

  let fileList = fileData.files ? [...fileData.files] : [...fileData];
  // ===== ソート =====
  if (sortColumn !== '') {
    fileList.sort(function (a, b) {
      let valA = '';
      let valB = '';

      switch (sortColumn) {
        case 'name':
          valA = a.name || '';
          valB = b.name || '';
          break;

        case 'updatedAt':
          valA = a.updatedAt || '';
          valB = b.updatedAt || '';
          break;

        case 'ext':
          valA = a.ext || '';
          valB = b.ext || '';
          break;

        case 'category':
          valA = ((a.categories || [])[0] || '').split('_')[0];
          valB = ((b.categories || [])[0] || '').split('_')[0];
          break;
      }

      if (valA < valB) {
        return sortDirection === 'asc' ? -1 : 1;
      }

      if (valA > valB) {
        return sortDirection === 'asc' ? 1 : -1;
      }

      return 0;
    });
  }

  // ★ forEachの前に追加
  const tagData = JSON.parse(localStorage.getItem('tagData') || '{}');

  fileList.forEach(function (file) {
    const normalizedPath = file.path.replace(/\\/g, '/');

    let categories = file.categories;

    if (tagData[normalizedPath] !== undefined) {
      categories = normalizeCategories(tagData[normalizedPath]);
    }

    const name = file.name.toLowerCase();

    // ===== キーワード =====
    if (keyword !== '' && name.indexOf(keyword) === -1) {
      return;
    }

    // ===== 中分類 =====
    if (checkedGroups.length > 0) {
      let match = false;

      if (checkedGroups.includes('未分類')) {
        const isUnassigned = !categories || categories.length === 0 || categories[0] === '';

        if (!isUnassigned) return;

        match = true;
      } else {
        // フォルダ
        if (checkedGroups.includes('000_フォルダ')) {
          if (categories.includes('000_フォルダ')) {
            match = true;
          }
        }

        // 通常
        if (!match && categories && categories.length > 0) {
          for (let i = 0; i < categories.length; i++) {
            const cat = categories[i];
            if (!cat) continue;

            const num = parseInt(cat.split('_')[0], 10);
            if (isNaN(num)) continue;

            for (let j = 0; j < groupData.length; j++) {
              const g = groupData[j];

              if (num >= g.start && num <= g.end) {
                if (checkedGroups.includes(g.group)) {
                  match = true;
                  break;
                }
              }
            }

            if (match) break;
          }
        }

        if (!match) return;
      }
    }

    // ===== カテゴリ検索モード取得 =====
    const searchMode = document.querySelector('input[name="categorySearchMode"]:checked').value;

    // ===== カテゴリ絞り込み =====
    if (checkedCategories.length > 0) {
      if (searchMode === 'and') {
        // AND検索
        for (let i = 0; i < checkedCategories.length; i++) {
          const searchNo = checkedCategories[i].split('_')[0];

          const hit = categories.some(function (cat) {
            return cat.split('_')[0] === searchNo;
          });

          if (!hit) {
            return;
          }
        }
      } else if (searchMode === 'or') {
        // OR検索
        let hit = false;

        for (let i = 0; i < checkedCategories.length; i++) {
          const searchNo = checkedCategories[i].split('_')[0];

          const matched = categories.some(function (cat) {
            return cat.split('_')[0] === searchNo;
          });

          if (matched) {
            hit = true;
            break;
          }
        }

        if (!hit) {
          return;
        }
      } else if (searchMode === 'filterOr') {
        // ===== 必須カテゴリ取得 =====
        if (requiredCategory === '') {
          return;
        }

        const requiredNo = requiredCategory.split('_')[0];

        const hasRequired = categories.some(function (cat) {
          return cat.split('_')[0] === requiredNo;
        });

        if (!hasRequired) {
          return;
        }

        // ===== 追加カテゴリ未選択なら
        // 必須カテゴリだけで検索
        if (checkedCategories.length === 0) {
          return;
        }

        let hit = false;

        for (let i = 0; i < checkedCategories.length; i++) {
          const searchNo = checkedCategories[i].split('_')[0];

          // 必須カテゴリ自身は除外
          if (searchNo === requiredNo) {
            continue;
          }

          const matched = categories.some(function (cat) {
            return cat.split('_')[0] === searchNo;
          });

          if (matched) {
            hit = true;
            break;
          }
        }

        if (!hit) {
          return;
        }
      }
    }

    // ===== 拡張子絞り込み =====
    if (checkedExtensions.length > 0) {
      const ext = (file.ext || '').toLowerCase();

      if (!checkedExtensions.includes(ext)) {
        return;
      }
    }

    // ===== テーブル行生成 =====
    const tr = document.createElement('tr');

    // ===== チェックボックス列（モードで分岐） =====
    if (mode === 'tag') {
      // ===== チェックボックス列（追加） =====
      const tdCheck = document.createElement('td');
      tdCheck.style.textAlign = 'center';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';

      // ★ パスを完全統一（ここが本丸）
      const normalizedPath = file.path.replace(/\\/g, '/');
      checkbox.dataset.path = normalizedPath;

      // ===== チェック状態復元 =====
      if (selectedPaths.includes(normalizedPath)) {
        checkbox.checked = true;
      }

      // ★ 行クリックとの衝突防止
      checkbox.onclick = function (e) {
        e.stopPropagation();
      };

      // ===== チェック状態管理（追加） =====
      checkbox.addEventListener('change', function () {
        const path = checkbox.dataset.path;

        if (checkbox.checked) {
          if (!selectedPaths.includes(path)) {
            selectedPaths.push(path);
          }
        } else {
          selectedPaths = selectedPaths.filter(function (p) {
            return p !== path;
          });
        }

        updateSelectedCount();
      });
      tdCheck.appendChild(checkbox);
      tr.appendChild(tdCheck);
    }
    // ===== 既存列 =====

    // ファイル名（拡張子除去）
    const tdName = document.createElement('td');

    const dotIndex = file.name.lastIndexOf('.');
    const displayName = dotIndex > 0 ? file.name.substring(0, dotIndex) : file.name;

    tdName.textContent = displayName;

    tr.appendChild(tdName);

    // 更新日
    const tdDate = document.createElement('td');
    tdDate.textContent = file.updatedAt || '';
    tr.appendChild(tdDate);

    // 拡張子
    const tdExt = document.createElement('td');
    tdExt.textContent = file.ext || '';
    tr.appendChild(tdExt);

    // カテゴリ（クリックで詳細表示切替）
    const tdCat = document.createElement('td');

    // 数字だけ
    const shortText = (categories || [])
      .map(function (c) {
        return c.split('_')[0];
      })
      .join(', ');

    // 詳細
    const fullText = (categories || []).join(', ');

    // 初期表示
    tdCat.textContent = shortText;

    // ★ホバーで詳細表示
    // ★ツールチップに変更
    tdCat.title = fullText;

    // 視覚的にも分かりやすく
    tdCat.style.cursor = 'help';

    tr.appendChild(tdCat);

    // クリック
    tr.onclick = function () {
      // ★ タグモードではクリック無効（超重要）
      if (mode === 'tag') {
        return;
      }

      document.querySelectorAll('#fileList tbody tr').forEach(function (row) {
        row.style.backgroundColor = '';
      });

      tr.style.backgroundColor = '#e6f0ff';

      displayPath(file.path);
    };

    tableBody.appendChild(tr);

    resultCount++;
  });
  const resultCountDiv = document.getElementById('resultCount');

  if (resultCountDiv) {
    resultCountDiv.textContent = '検索結果：' + resultCount + '件';
  }
}

// ===== ソート変更 =====
function changeSort(column) {
  // 同じ列をクリック
  if (sortColumn === column) {
    sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
  } else {
    sortColumn = column;
    sortDirection = 'asc';
  }

  // ===== ソートマーク初期化 =====
  document.getElementById('sort-name').textContent = '';
  document.getElementById('sort-updatedAt').textContent = '';
  document.getElementById('sort-ext').textContent = '';
  document.getElementById('sort-category').textContent = '';

  // ===== 現在列にマーク表示 =====
  const mark = sortDirection === 'asc' ? '▲' : '▼';

  const target = document.getElementById('sort-' + sortColumn);

  if (target) {
    target.textContent = mark;
  }

  loadData();
}

// ===== 拡張子一覧描画 =====
function renderExtensions() {
  const extDivTop = document.getElementById('extListTop');

  if (!extDivTop) return;

  extDivTop.innerHTML = '';

  const extSet = new Set();

  const files = fileData.files ? fileData.files : fileData;

  files.forEach(function (file) {
    if (!file.ext) return;

    extSet.add(file.ext.toLowerCase());
  });

  const extList = Array.from(extSet).sort();

  extList.forEach(function (ext) {
    const label = document.createElement('label');

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = ext;

    // チェック変更時に再検索
    checkbox.addEventListener('change', function () {
      loadData();
    });

    label.appendChild(checkbox);
    label.appendChild(document.createTextNode(ext));

    if (extDivTop) {
      const topLabel = document.createElement('label');

      const topCheckbox = document.createElement('input');
      topCheckbox.type = 'checkbox';
      topCheckbox.value = ext;

      topCheckbox.addEventListener('change', function () {
        loadData();
      });

      topLabel.appendChild(topCheckbox);
      topLabel.appendChild(document.createTextNode(ext));

      extDivTop.appendChild(topLabel);
    }
  });
}

// ===== カテゴリ名を最新化 =====
function normalizeCategories(categories) {
  return (categories || []).map(function (cat) {
    const categoryNo = cat.split('_')[0];

    const latest = categoryList.find(function (masterCat) {
      return masterCat.split('_')[0] === categoryNo;
    });

    return latest || cat;
  });
}

function displayPath(path) {
  document.getElementById('selectedPath').value = path;
  document.getElementById('editSelectedPath').value = path;

  // ★ファイル名抽出して表示
  const fileName = path.split('\\').pop();
  document.getElementById('editFileName').textContent = '選択ファイル： ' + fileName;

  let tagData = JSON.parse(localStorage.getItem('tagData') || '{}');

  const normalizedPath = path.replace(/\\/g, '/');

  const savedTags = normalizeCategories(tagData[normalizedPath] || []);

  // チェックリセット
  document.querySelectorAll('#editCategoryList input').forEach(function (cb) {
    cb.checked = false;
  });

  // 保存タグを反映
  document.querySelectorAll('#editCategoryList input').forEach(function (cb) {
    if (savedTags.includes(cb.value)) {
      cb.checked = true;
    }
  });
}

function copyPath() {
  // 検索画面 or 編集画面どちらの値か判定
  let path = '';

  const searchPath = document.getElementById('selectedPath');
  const editPath = document.getElementById('editSelectedPath');

  if (document.getElementById('searchPage').style.display !== 'none') {
    path = searchPath.value;
  } else {
    path = editPath.value;
  }

  if (!path) return;

  const command = 'explorer "' + path + '"';

  navigator.clipboard.writeText(command);

  // ★ここを確実に更新
  const msg = document.getElementById('copyMessage');

  msg.textContent = 'コピーしました';

  // 数秒後に消す
  setTimeout(function () {
    msg.textContent = '';
  }, 2000);
}

function copyDeleteCommand() {
  const path = document.getElementById('selectedPath').value;
  if (!path) return;

  const command = 'del "' + path + '"';
  navigator.clipboard.writeText(command);

  // ★説明だけ表示（コマンドは出さない）
  alert('PowerShellに貼り付けて実行してください');

  // ===== 削除ログ =====
  addOperationLog('削除コマンドコピー：' + path);
  showSyncWarning();

  // ★メッセージ
  const msg = document.getElementById('copyMessage');
  msg.textContent = '削除コマンドをコピーしました';

  setTimeout(function () {
    msg.textContent = '';
  }, 3000);
}

// ===== フォルダを開く =====
function openInExplorer() {
  const path = document.getElementById('selectedPath').value;
  if (!path) return;

  // ★フォルダパスに変換
  const folderPath = path.substring(0, path.lastIndexOf('\\'));

  const command = 'explorer "' + folderPath + '"';
  navigator.clipboard.writeText(command);

  // ★ダイアログ（操作促す）
  alert('フォルダを開くには、PowerShellに貼り付けて実行してください');

  const msg = document.getElementById('copyMessage');
  msg.textContent = 'フォルダを開くコマンドをコピーしました';

  setTimeout(function () {
    msg.textContent = '';
  }, 2000);

  addOperationLog('フォルダを開くコマンドコピー：' + folderPath);
}

function copyRenameCommand() {
  const path = document.getElementById('selectedPath').value;
  if (!path) return;

  const fileName = path.split('\\').pop();

  // ★新しい名前入力
  const newName = prompt('新しいファイル名を入力してください', fileName);
  if (!newName) return;

  // ★PowerShellコマンド（フルパス）
  const command = '$old = "' + path + '"; $new = Join-Path (Split-Path $old) "' + newName + '"; Rename-Item $old $new';

  // ★コピー
  navigator.clipboard.writeText(command);

  // ★ダイアログ表示（ここが重要）
  alert('PowerShellに貼り付けて実行してください');

  // ===== リネームログ =====
  addOperationLog('リネームコマンドコピー：' + fileName + ' → ' + newName);
  showSyncWarning();

  // ★メッセージ
  const msg = document.getElementById('copyMessage');
  msg.textContent = 'リネームコマンドをコピーしました（PowerShellで実行）';

  setTimeout(function () {
    msg.textContent = '';
  }, 3000);
}

// ===== 操作ログ追加 =====
function addOperationLog(text) {
  const logDiv = document.getElementById('operationLog');

  const now = new Date();
  const time = now.toLocaleTimeString();

  const line = document.createElement('div');
  line.textContent = time + ' - ' + text;

  logDiv.prepend(line);
}

// ===== 拡張子取得 =====
function getExtension(fileName) {
  const index = fileName.lastIndexOf('.');
  if (index === -1) return '';
  return fileName.substring(index);
}

function applyTags() {
  // ===== チェックされたカテゴリ取得 =====
  const checkedCategories = [];

  document.querySelectorAll('#editCategoryList input:checked').forEach(function (cb) {
    checkedCategories.push(cb.value);
  });

  if (checkedCategories.length === 0) return;

  // ===== タグ設定方法 =====
  const tagApplyMode = document.querySelector('input[name="tagApplyMode"]:checked')?.value || 'overwrite';

  let tagData = JSON.parse(localStorage.getItem('tagData') || '{}');

  // ===== 複数ファイルに適用 =====
  selectedPaths.forEach(function (rawPath) {
    const path = rawPath.replace(/\\/g, '/');

    if (tagApplyMode === 'append') {
      // ===== 既存タグ取得 =====
      let existingTags = tagData[path] || [];

      if (existingTags.length === 0) {
        const fileInfo = fileData.files.find(function (f) {
          return f.path.replace(/\\/g, '/') === path;
        });

        existingTags = fileInfo ? fileInfo.categories : [];
      }

      const mergedTags = [...existingTags, ...checkedCategories];

      tagData[path] = [...new Set(mergedTags)];
    } else if (tagApplyMode === 'delete') {
      // ===== 既存タグ取得 =====
      let existingTags = tagData[path] || [];

      if (existingTags.length === 0) {
        const fileInfo = fileData.files.find(function (f) {
          return f.path.replace(/\\/g, '/') === path;
        });

        existingTags = fileInfo ? fileInfo.categories : [];
      }

      // ===== チェックしたタグだけ削除 =====
      tagData[path] = existingTags.filter(function (tag) {
        return !checkedCategories.includes(tag);
      });
    } else {
      // ===== 上書き =====
      tagData[path] = checkedCategories;
    }
  });

  localStorage.setItem('tagData', JSON.stringify(tagData));

  // ===== ログ =====
  const fileCount = selectedPaths.length;

  if (fileCount === 1) {
    addLog('ファイルにタグ設定：' + checkedCategories.join(', '));
  } else {
    addLog(fileCount + '件のファイルにタグ設定：' + checkedCategories.join(', '));
  }
  selectedPaths = [];
  updateSelectedCount();

  // ===== チェックボックスリセット =====
  document.querySelectorAll("#fileList input[type='checkbox']").forEach(function (cb) {
    cb.checked = false;
  });

  // ===== タグ画面チェックリセット =====
  document.querySelectorAll('#editCategoryList input').forEach(function (cb) {
    cb.checked = false;
  });

  // ===== 選択ファイル表示クリア =====
  const editFileName = document.getElementById('editFileName');

  if (editFileName) {
    editFileName.innerHTML = '';
  }

  // ===== 検索画面へ戻る =====
  showSearchPage();

  // ===== 再描画 =====
  loadData();

  // ===== 件数更新 =====
  updateTagCount();
}

// ===== 全選択／全解除 =====
function toggleSelectAll(headerCheckbox) {
  const checkboxes = document.querySelectorAll("#fileList tbody input[type='checkbox']");

  if (headerCheckbox.checked) {
    selectedPaths = [];

    checkboxes.forEach(function (cb) {
      cb.checked = true;

      const path = cb.dataset.path;

      if (!selectedPaths.includes(path)) {
        selectedPaths.push(path);
      }
    });
  } else {
    checkboxes.forEach(function (cb) {
      cb.checked = false;
    });

    selectedPaths = [];
  }

  updateSelectedCount();
}

function renderEditCategories() {
  const editDiv = document.getElementById('editCategoryList');

  const filterText = (document.getElementById('editCategoryFilter')?.value || '').toLowerCase();
  editDiv.innerHTML = '';

  // ===== 上段（固定エリア）=====
  const fixedWrapper = document.createElement('div');

  // ★ここが重要（1行占有）
  fixedWrapper.style.flexBasis = '100%';

  fixedWrapper.style.display = 'flex';
  fixedWrapper.style.gap = '20px';
  fixedWrapper.style.marginBottom = '10px';
  fixedWrapper.style.alignItems = 'center';

  // 未分類
  const unLabel = document.createElement('label');
  const unCheckbox = document.createElement('input');

  unCheckbox.type = 'checkbox';
  unCheckbox.value = '__UNASSIGNED__';

  unLabel.appendChild(unCheckbox);
  unLabel.appendChild(document.createTextNode('未分類'));

  // 000フォルダ
  const folderLabel = document.createElement('label');
  const folderCheckbox = document.createElement('input');

  folderCheckbox.type = 'checkbox';
  folderCheckbox.value = '000_フォルダ';

  folderLabel.appendChild(folderCheckbox);
  folderLabel.appendChild(document.createTextNode('000_フォルダ'));

  // 999
  const specialLabel = document.createElement('label');
  const specialCheckbox = document.createElement('input');

  specialCheckbox.type = 'checkbox';
  specialCheckbox.value = '999_';

  specialLabel.appendChild(specialCheckbox);
  specialLabel.appendChild(document.createTextNode('999_'));

  // ★まとめて横に並べる
  fixedWrapper.appendChild(unLabel);
  fixedWrapper.appendChild(folderLabel);
  fixedWrapper.appendChild(specialLabel);

  editDiv.appendChild(fixedWrapper);

  // ===== 中分類ごと =====
  const groupMap = {};

  groupData.forEach(function (g) {
    groupMap[g.group] = [];
  });

  categoryList.forEach(function (cat) {
    if (cat === 'MasterCategory') return;
    if (cat === '000_フォルダ') return;
    if (cat === '999_') return;

    const num = parseInt(cat.split('_')[0], 10);
    if (isNaN(num)) return;

    for (let i = 0; i < groupData.length; i++) {
      const g = groupData[i];

      if (num >= g.start && num <= g.end) {
        groupMap[g.group].push(cat);
        break;
      }
    }
  });

  // 表示
  for (const groupName in groupMap) {
    // ★ここが重要（追加）
    if (groupName === '未分類') continue;
    if (groupName === '999_') continue;

    const wrapper = document.createElement('div');
    wrapper.style.minWidth = '180px';
    wrapper.style.marginRight = '10px';

    const title = document.createElement('div');
    title.textContent = groupName;
    title.style.fontWeight = 'bold';
    title.style.borderBottom = '1px solid #ccc';
    title.style.marginBottom = '4px';

    wrapper.appendChild(title);

    groupMap[groupName].forEach(function (cat) {
      // カテゴリ検索
      if (filterText !== '' && !cat.toLowerCase().includes(filterText)) {
        return;
      }

      const label = document.createElement('label');

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.value = cat;

      label.appendChild(checkbox);
      label.appendChild(document.createTextNode(cat));

      wrapper.appendChild(label);
    });

    editDiv.appendChild(wrapper);
  }
}

function exportTagsToJson() {
  const tagData = JSON.parse(localStorage.getItem('tagData') || '{}');

  const blob = new Blob([JSON.stringify(tagData, null, 2)], {
    type: 'application/json',
  });

  const linkArea = document.getElementById('downloadArea');

  if (linkArea) {
    linkArea.innerHTML = '';

    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.textContent = 'tagData.json';
    link.style.display = 'inline-block';
    link.style.padding = '6px 10px';
    link.style.backgroundColor = '#e6f2ff';

    const pathLine = document.createElement('div');
    pathLine.textContent = '保存先：C:\\xampp\\htdocs\\FileExpBrowser';
    pathLine.style.fontSize = '12px';
    pathLine.style.color = '#666';
    pathLine.style.marginTop = '6px';

    const fileLine = document.createElement('div');
    fileLine.textContent = 'ファイル名：tagData.json';
    fileLine.style.fontSize = '12px';
    fileLine.style.color = '#333';
    fileLine.style.fontWeight = 'bold';
    fileLine.style.marginTop = '2px';

    const info = document.createElement('div');
    info.textContent =
      '① 右クリック → 名前を付けて保存（上書き）\n' +
      '② ExcelでJsonデータ取込を実行\n' +
      '③ Excel反映完了後に「Excel反映後に未反映タグを削除」を実行';
    info.style.fontSize = '12px';
    info.style.color = '#888';
    info.style.marginTop = '4px';

    linkArea.appendChild(link);
    linkArea.appendChild(pathLine);
    linkArea.appendChild(fileLine);
    linkArea.appendChild(info);
  }
}

function showSearchPage() {
  document.getElementById('searchPage').style.display = 'block';

  document.getElementById('searchPage').style.display = 'block';
  document.getElementById('editPage').style.display = 'none';

  const tabSearch = document.getElementById('tabSearch');
  const tabEdit = document.getElementById('tabEdit');

  // ★選択中（青系）
  tabSearch.style.background = '#e6f0ff';
  tabSearch.style.borderBottom = '2px solid blue';

  // ★非選択
  tabEdit.style.background = '#eee';
  tabEdit.style.borderBottom = '1px solid #ccc';

  // ===== ★追加：選択状態リセット =====
  const selected = document.getElementById('selectedPath');
  if (selected) selected.value = '';
}

function showEditPage() {
  console.log('downloadArea内容', document.getElementById('downloadArea')?.innerHTML);

  document.getElementById('searchPage').style.display = 'none';
  document.getElementById('editPage').style.display = 'block';

  const tabSearch = document.getElementById('tabSearch');
  const tabEdit = document.getElementById('tabEdit');

  // ★非選択
  tabSearch.style.background = '#eee';
  tabSearch.style.borderBottom = '1px solid #ccc';

  // ★選択中（青系）
  tabEdit.style.background = '#e6f0ff';
  tabEdit.style.borderBottom = '2px solid blue';

  setTimeout(function () {
    const firstCheckbox = document.querySelector('#editCategoryList input');
    if (firstCheckbox) firstCheckbox.focus();
  }, 50);
}

function renderEditFileList() {
  const list = document.getElementById('editFileList');
  list.innerHTML = '';

  const mode = document.querySelector('input[name="editMode"]:checked').value;

  const tagData = JSON.parse(localStorage.getItem('tagData') || '{}');

  fileData.files.forEach(function (file) {
    const path = file.path.replace(/\\/g, '/');

    let categories = file.categories.filter(function (cat) {
      return cat !== 'MasterCategory';
    });

    if (tagData[path] !== undefined) {
      categories = tagData[path];
    }

    // ★ 未分類判定
    const isUnassigned =
      !categories ||
      categories.length === 0 ||
      categories.every(function (c) {
        return c === '' || c === '000_フォルダ';
      });

    // ★ モードで分岐
    if (mode === 'unassigned' && !isUnassigned) {
      return;
    }

    const tr = document.createElement('tr');

    // ファイル名
    const tdName = document.createElement('td');
    tdName.textContent = file.name;
    tr.appendChild(tdName);

    // カテゴリ（クリックで詳細表示切替）
    const tdCat = document.createElement('td');

    // 数字だけ
    const shortText = (categories || [])
      .map(function (c) {
        return c.split('_')[0];
      })
      .join(', ');

    // 詳細
    const fullText = (categories || []).join(', ');

    // 初期表示
    tdCat.textContent = shortText;

    // ★ツールチップ表示に変更
    tdCat.title = fullText;

    tr.appendChild(tdCat);

    // 更新日
    const tdDate = document.createElement('td');
    tdDate.textContent = file.updatedAt || '';
    tr.appendChild(tdDate);

    // 拡張子
    const tdExt = document.createElement('td');
    tdExt.textContent = file.ext || '';
    tr.appendChild(tdExt);

    // クリックで選択
    tr.onclick = function () {
      displayPath(file.path);
    };

    table.appendChild(tr);
  });
}

function moveToEdit() {
  if (!selectedPaths || selectedPaths.length === 0) {
    alert('タグ付けするファイルをチェックしてください');
    return;
  }

  // ===== ★ここが最重要（単一選択の影響を完全に切る） =====
  const selectedPathInput = document.getElementById('selectedPath');
  if (selectedPathInput) selectedPathInput.value = '';

  const editPathInput = document.getElementById('editSelectedPath');
  if (editPathInput) editPathInput.value = '';

  // ===== tagData取得 =====
  const tagData = JSON.parse(localStorage.getItem('tagData') || '{}');

  const firstPath = selectedPaths[0].replace(/\\/g, '/');

  let baseTags = tagData[firstPath];

  if (!baseTags) {
    const fileInfo = fileData.files.find(function (f) {
      return f.path.replace(/\\/g, '/') === firstPath;
    });

    baseTags = fileInfo ? fileInfo.categories : [];
  }

  // ★ 最新カテゴリ名へ変換
  baseTags = normalizeCategories(baseTags);

  console.log('baseTags', baseTags);

  // ===== カテゴリチェック初期化 =====
  document.querySelectorAll('#editCategoryList input').forEach(function (cb) {
    cb.checked = false;
  });

  // ===== 共通タグを計算 =====
  let commonTags = [...baseTags];

  selectedPaths.forEach(function (p) {
    const path = p.replace(/\\/g, '/');

    let tags = tagData[path];

    if (!tags) {
      const fileInfo = fileData.files.find(function (f) {
        return f.path.replace(/\\/g, '/') === path;
      });

      tags = fileInfo ? fileInfo.categories : [];
    }

    tags = normalizeCategories(tags);

    commonTags = commonTags.filter(function (tag) {
      return tags.includes(tag);
    });
  });

  console.log('commonTags AFTER', commonTags);

  console.log('commonTags AFTER', commonTags);

  // ===== チェックリセット =====
  document.querySelectorAll('#editCategoryList input').forEach(function (cb) {
    cb.checked = false;
  });

  // ===== 共通タグだけチェック =====
  document.querySelectorAll('#editCategoryList input').forEach(function (cb) {
    if (commonTags.includes(cb.value)) {
      cb.checked = true;
      console.log('CHECK', cb.value);
    }
  });

  let hasDifference = false;

  // ===== 差分チェック =====
  selectedPaths.forEach(function (p) {
    const path = p.replace(/\\/g, '/');
    const tags = tagData[path] || [];

    if (tags.join(',') !== baseTags.join(',')) {
      hasDifference = true;
    }
  });

  // ===== 警告表示 =====
  const tagWarning = document.getElementById('tagWarning');

  if (tagWarning) {
    if (hasDifference) {
      tagWarning.innerHTML =
        '※選択したファイルでタグが異なります。<br>' + '現在の表示は共通タグのみです。<br>' + '上書きモードでは既存タグが置き換わります。';

      tagWarning.style.display = 'block';
    } else {
      tagWarning.style.display = 'none';
    }
  }

  // ===== テーブル生成 =====
  let html =
    "<div id='editSelectedCount' style='margin-bottom:4px; font-weight:bold;'>" + '選択ファイル（' + selectedPaths.length + '件）' + '</div>';

  html += "<div style='background:#fff; padding:6px; display:inline-block;'>";

  html += "<table style='border-collapse:collapse; font-size:13px;'>";

  html += '<tr>';

  html += "<th style='padding:4px 8px; border-bottom:2px solid #888; width:40px; text-align:center;'>対象</th>";

  html += "<th style='padding:4px 8px; border-bottom:2px solid #888; text-align:left;'>ファイル名</th>";

  html += "<th style='padding:4px 8px; border-bottom:2px solid #888; text-align:left;'>タグ</th>";
  html += '</tr>';

  selectedPaths.forEach(function (p) {
    const name = p.split('\\').pop();
    const path = p.replace(/\\/g, '/');
    const tags = tagData[path] || [];

    const tagText =
      tags.length > 0
        ? tags
            .map(function (t) {
              return t.split('_')[0];
            })
            .join(',')
        : '未設定';

    html += '<tr>';

    html +=
      "<td style='padding:4px 8px; border-bottom:1px solid #ccc; text-align:center;'>" +
      "<input type='checkbox' checked data-path='" +
      path +
      "' class='editTargetFile'>" +
      '</td>';

    html += "<td style='padding:4px 8px; border-bottom:1px solid #ccc;'>" + name + '</td>';
    html += "<td style='padding:4px 8px; border-bottom:1px solid #ccc;'>" + tagText + '</td>';
    html += '</tr>';
  });

  html += '</table></div>';

  document.getElementById('editFileName').innerHTML = html;

  // ===== 対象ファイル変更 =====
  document.querySelectorAll('.editTargetFile').forEach(function (cb) {
    cb.addEventListener('change', function () {
      const path = cb.dataset.path;

      if (!cb.checked) {
        selectedPaths = selectedPaths.filter(function (p) {
          return p.replace(/\\/g, '/') !== path;
        });
      } else {
        const exists = selectedPaths.some(function (p) {
          return p.replace(/\\/g, '/') === path;
        });

        if (!exists) {
          selectedPaths.push(path);
        }
      }

      updateSelectedCount();

      const countLabel = document.getElementById('editSelectedCount');

      if (countLabel) {
        countLabel.textContent = '選択ファイル（' + selectedPaths.length + '件）';
      }
    });
  });
  document.querySelectorAll('#editCategoryList input:checked').forEach(function (cb) {
    console.log('FINAL CHECK', cb.value);
  });

  showEditPage();
}

function clearSearch() {
  // キーワードクリア
  document.getElementById('keyword').value = '';

  // 中分類チェック解除
  document.querySelectorAll('#groupList input').forEach(function (cb) {
    cb.checked = false;
  });

  // カテゴリチェック解除
  document.querySelectorAll('#categoryList input').forEach(function (cb) {
    cb.checked = false;
  });

  // 拡張子チェック解除
  document.querySelectorAll('#extList input').forEach(function (cb) {
    cb.checked = false;
  });

  // 必須カテゴリ解除
  const requiredCategory = document.getElementById('requiredCategory');

  if (requiredCategory) {
    requiredCategory.value = '';
  }

  // パス表示クリア
  document.getElementById('selectedPath').value = '';

  // メッセージクリア
  const msg = document.getElementById('copyMessage');
  if (msg) msg.textContent = '';

  // 再描画（全件表示）
  renderCategories();
  loadData();
}
function showSyncWarning() {
  const warning = document.getElementById('syncWarning');
  warning.textContent = '※Excelを更新してください（変更はまだ反映されていません）';
}

function addLog(message) {
  const logArea = document.getElementById('logArea');
  if (!logArea) return;

  const time = new Date().toLocaleTimeString();

  const line = document.createElement('div');
  line.textContent = `[${time}] ${message}`;
  line.style.fontSize = '12px';

  logArea.prepend(line); // 新しいものを上に
}

function updateTagWarning() {
  const tagWarning = document.getElementById('tagWarning');

  if (!tagWarning || tagWarning.style.display === 'none') {
    return;
  }

  const tagApplyMode = document.querySelector('input[name="tagApplyMode"]:checked')?.value || 'overwrite';

  if (tagApplyMode === 'append') {
    tagWarning.innerHTML = '※選択したファイルでタグが異なります。<br>' + '既存タグは保持されます。<br>' + 'チェックしたタグのみ追加されます。';
  } else if (tagApplyMode === 'delete') {
    tagWarning.innerHTML = '※選択したファイルでタグが異なります。<br>' + '既存タグは保持されます。<br>' + 'チェックしたタグのみ削除されます。';
  } else {
    tagWarning.innerHTML =
      '※選択したファイルでタグが異なります。<br>' + '現在の表示は共通タグのみです。<br>' + '上書きモードでは既存タグが置き換わります。';
  }
  ``;
}

// ===== Enterキーでタグ設定 =====
document.addEventListener('keydown', function (e) {
  if (isInitializingFocus) return;
  // タグ付け画面が表示されているときだけ有効
  const isEditVisible = document.getElementById('editPage').style.display !== 'none';

  if (!isEditVisible) return;

  // Enterキー
  if (e.key === 'Enter') {
    // 入力途中（例えば検索ボックス）なら除外したい場合はここで条件追加可
    applyTags();
  }
});

function clearTags() {
  if (!confirm('Excelへのタグ反映は完了していますか？\n\n' + '未反映タグを削除すると元に戻せません。')) {
    return;
  }

  // ===== 保存キー削除 =====
  localStorage.removeItem('tagData');

  // ===== 画面メッセージ =====
  const msg = document.getElementById('copyMessage');
  if (msg) {
    addLog('タグデータをクリアしました');
    addLog('ブラウザで「データ再読み込み」を実行してください');

    setTimeout(function () {
      msg.textContent = '';
    }, 2000);
  }
}

function cancelTagEdit() {
  // 選択状態解除
  selectedPaths = [];

  updateSelectedCount();

  // 検索結果のチェック解除
  document.querySelectorAll("#fileList input[type='checkbox']").forEach(function (cb) {
    cb.checked = false;
  });

  // タグ付け画面のチェック解除
  document.querySelectorAll('#editCategoryList input').forEach(function (cb) {
    cb.checked = false;
  });

  // 選択ファイル一覧クリア
  const editFileName = document.getElementById('editFileName');
  if (editFileName) {
    editFileName.innerHTML = '';
  }

  // 警告メッセージクリア
  const tagWarning = document.getElementById('tagWarning');
  if (tagWarning) {
    tagWarning.innerHTML = '';
    tagWarning.style.display = 'none';
  }

  // 検索画面へ戻る
  showSearchPage();

  // タグ付けモード解除
  if (mode === 'tag') {
    toggleMode();
  }

  // 再描画
  loadData();
}

function updateTagCount() {
  const tagData = JSON.parse(localStorage.getItem('tagData') || '{}');

  const count = Object.keys(tagData).length;

  const el = document.getElementById('tagCount');
  if (el) {
    el.textContent = '未反映タグ：' + count + '件';
  }
}

// ===== 検索モード表示切替 =====
function updateSearchTypeUI() {
  const searchMode = document.querySelector('input[name="categorySearchMode"]:checked')?.value;

  const requiredArea = document.getElementById('requiredCategoryArea');

  if (!requiredArea) return;

  if (searchMode === 'filterOr') {
    requiredArea.style.display = 'block';
  } else {
    requiredArea.style.display = 'none';
  }
}

// ===== 選択件数表示更新 =====
function updateSelectedCount() {
  const el = document.getElementById('selectedCount');

  if (!el) return;

  el.textContent = '選択中：' + selectedPaths.length + '件';
}

// ===== モード切替 =====
function toggleMode() {
  if (mode === 'normal') {
    mode = 'tag';
  } else {
    mode = 'normal';
  }

  // ===== 要素取得 =====
  const btnCopy = document.querySelector('button[onclick="copyPath()"]');
  const btnDelete = document.querySelector('button[onclick="copyDeleteCommand()"]');
  const btnRename = document.querySelector('button[onclick="copyRenameCommand()"]');
  const btnMove = document.querySelector('button[onclick="moveToEdit()"]');
  const btnToggle = document.querySelector('button[onclick="toggleMode()"]');

  const selectedCount = document.getElementById('selectedCount');
  const checkHeader = document.getElementById('checkHeader');

  // ★追加：UIエリア
  const categoryArea = document.getElementById('categoryList');
  const groupArea = document.getElementById('groupList');
  const pathArea = document.getElementById('selectedPath');
  // ★ コマンド操作ブロックを取得（見出し＋ボタン）
  // ★ コマンド操作ブロックを取得（idで固定）
  const commandArea = document.getElementById('commandArea');
  // ★追加：検索入力エリア取得
  const searchControlArea = document.getElementById('searchControlArea');

  // ★ 操作説明表示
  const tagInstruction = document.getElementById('tagInstruction');

  if (mode === 'tag') {
    // ===== タグモード =====

    if (btnCopy) btnCopy.style.display = 'none';
    if (btnDelete) btnDelete.style.display = 'none';
    if (btnRename) btnRename.style.display = 'none';

    if (btnMove) btnMove.style.display = 'inline-block';

    if (selectedCount) selectedCount.style.display = 'inline';

    // ★追加：検索UI非表示
    if (categoryArea) categoryArea.style.display = 'none';
    if (groupArea) groupArea.style.display = 'none';
    if (pathArea) pathArea.style.display = 'none';
    if (commandArea) commandArea.style.display = 'none';

    if (btnToggle) btnToggle.textContent = '通常モード';
    if (searchControlArea) searchControlArea.style.display = 'none';
    if (tagInstruction) tagInstruction.style.display = 'block';
    if (checkHeader) checkHeader.style.display = 'table-cell';
  } else {
    // ===== 通常モード =====

    if (btnCopy) btnCopy.style.display = 'inline-block';
    if (btnDelete) btnDelete.style.display = 'inline-block';
    if (btnRename) btnRename.style.display = 'inline-block';

    if (btnMove) btnMove.style.display = 'none';

    if (selectedCount) selectedCount.style.display = 'none';

    // ★追加：検索UI復元
    if (categoryArea) categoryArea.style.display = 'flex';
    if (groupArea) groupArea.style.display = 'block';
    if (pathArea) pathArea.style.display = 'block';
    if (commandArea) commandArea.style.display = 'block';
    if (tagInstruction) tagInstruction.style.display = 'none';

    if (btnToggle) btnToggle.textContent = 'タグ付けモード';
    if (searchControlArea) searchControlArea.style.display = 'block';
    if (checkHeader) checkHeader.style.display = 'none';
  }

  loadData();
}

// ===== ↑↓キーでカテゴリ移動 =====
let currentIndex = -1;

document.addEventListener('keydown', function (e) {
  if (isInitializingFocus) return;

  const isEditVisible = document.getElementById('editPage').style.display !== 'none';

  if (!isEditVisible) return;

  const items = document.querySelectorAll('#editCategoryList input');
  if (items.length === 0) return;

  // ↓
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    currentIndex++;
    if (currentIndex >= items.length) currentIndex = 0;
    items[currentIndex].focus();
  }

  // ↑
  if (e.key === 'ArrowUp') {
    e.preventDefault();
    currentIndex--;
    if (currentIndex < 0) currentIndex = items.length - 1;
    items[currentIndex].focus();
  }

  // →（次へ）
  if (e.key === 'ArrowRight') {
    e.preventDefault();
    currentIndex++;
    if (currentIndex >= items.length) currentIndex = 0;
    items[currentIndex].focus();
  }

  // ←（前へ）
  if (e.key === 'ArrowLeft') {
    e.preventDefault();
    currentIndex--;
    if (currentIndex < 0) currentIndex = items.length - 1;
    items[currentIndex].focus();
  }
});

// ===== 再読み込みボタン（最終版）=====
window.addEventListener('DOMContentLoaded', function () {
  const btn = document.getElementById('loadButton');
  if (!btn) return;

  btn.addEventListener('click', async function () {
    const isLocalFile = location.protocol === 'file:';

    // ===== ローカル =====
    if (isLocalFile) {
      const input = document.getElementById('jsonFileInput');
      const files = input ? input.files : null;

      if (!files || files.length < 2) {
        alert('filelist.json と categories.json を選択してください');
        return;
      }

      let fileDataTemp = null;
      let groupDataTemp = null;
      let categoryListTemp = null;
      let loadCount = 0;

      Array.from(files).forEach(function (file) {
        const reader = new FileReader();

        reader.onload = function (evt) {
          const data = JSON.parse(evt.target.result);

          if (file.name.toLowerCase().includes('filelist')) {
            fileDataTemp = data;
          }

          if (file.name.toLowerCase().includes('categories')) {
            groupDataTemp = data.groups;
            categoryListTemp = data.categories;
          }

          loadCount++;

          if (loadCount === files.length) {
            applyData(fileDataTemp, groupDataTemp, categoryListTemp, window.currentLastUpdated);
          }
        };

        reader.readAsText(file);
      });
    } else {
      // ===== サーバ =====
      try {
        const fileRes = await fetch('filelist.json?v=' + Date.now());
        const fileDataTemp = await fileRes.json();

        const groupRes = await fetch('categories.json?v=' + Date.now());
        const json = await groupRes.json();

        applyData(fileDataTemp, json.groups, json.categories, json.lastUpdated);
      } catch (e) {
        alert('再読み込みエラー: ' + e.message);
      }
    }
  });
});

// ===== 共通処理（1つだけ）=====
function applyData(fileDataTemp, groupDataTemp, categoryListTemp, lastUpdatedValue) {
  fileData = fileDataTemp;
  groupData = groupDataTemp;
  categoryList = categoryListTemp;

  const groupDiv = document.getElementById('groupList');
  groupDiv.innerHTML = '';

  const folderLabel = document.createElement('label');
  const folderCheckbox = document.createElement('input');

  folderCheckbox.type = 'checkbox';
  folderCheckbox.value = '000_フォルダ';

  folderLabel.appendChild(folderCheckbox);
  folderLabel.appendChild(document.createTextNode('000_フォルダ'));
  groupDiv.appendChild(folderLabel);

  groupData.forEach(function (g) {
    const label = document.createElement('label');
    const checkbox = document.createElement('input');

    checkbox.type = 'checkbox';
    checkbox.value = g.group;

    label.appendChild(checkbox);
    label.appendChild(document.createTextNode(g.group));

    groupDiv.appendChild(label);
  });

  renderCategories();
  renderEditCategories();
  loadData();
  showSearchPage();

  // ===== ★最終更新表示（追加） =====
  const lastUpdated = document.getElementById('lastUpdated');
  if (lastUpdated && lastUpdatedValue) {
    lastUpdated.textContent = '最終更新：' + lastUpdatedValue;
  }
}

document.addEventListener('DOMContentLoaded', function () {
  const toggleBtn = document.getElementById('toggleConditionBtn');

  const details = document.getElementById('searchConditionDetails');

  if (!toggleBtn || !details) return;

  toggleBtn.addEventListener('click', function () {
    details.open = !details.open;

    toggleBtn.textContent = details.open ? '検索条件 ▼' : '検索条件 ▶';
  });
});
