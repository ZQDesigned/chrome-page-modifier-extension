// 加密密钥
const ENCRYPTION_KEY = 'modifier-rules-v1';

// 日志函数
function log(type, message, data = null) {
  const logMessage = {
    timestamp: new Date().toISOString(),
    type,
    message,
    data
  };
  console.log('🔧 规则管理器 >', logMessage);
}

// 获取所有规则
async function loadRules() {
  return new Promise((resolve) => {
    chrome.storage.sync.get('rules', (result) => {
      const rules = result.rules || [];
      log('info', '加载规则列表', { count: rules.length });
      resolve(rules);
    });
  });
}

// 保存规则
async function saveRules(rules) {
  return new Promise((resolve) => {
    chrome.storage.sync.set({ rules }, () => {
      log('success', '保存规则成功', { count: rules.length });
      resolve();
    });
  });
}

// 渲染规则列表
function renderRules(rules, filters = {}) {
  const tbody = document.getElementById('rulesTableBody');
  tbody.innerHTML = '';

  // 应用过滤器
  let filteredRules = rules;
  
  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    filteredRules = filteredRules.filter(rule => 
      rule.name.toLowerCase().includes(searchLower) ||
      rule.url.toLowerCase().includes(searchLower) ||
      rule.selector.toLowerCase().includes(searchLower)
    );
  }
  
  if (filters.mode) {
    filteredRules = filteredRules.filter(rule => rule.modifyMode === filters.mode);
  }
  
  if (filters.status) {
    filteredRules = filteredRules.filter(rule => 
      (filters.status === 'active' && !rule.disabled) ||
      (filters.status === 'inactive' && rule.disabled)
    );
  }

  filteredRules.forEach(rule => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="checkbox-cell">
        <input type="checkbox" class="rule-checkbox" data-rule-id="${rule.id}">
      </td>
      <td>${rule.name || '未命名规则'}</td>
      <td title="${rule.url}">${rule.url.substring(0, 30)}${rule.url.length > 30 ? '...' : ''}</td>
      <td title="${rule.selector}">${rule.selector.substring(0, 30)}${rule.selector.length > 30 ? '...' : ''}</td>
      <td>${rule.modifyMode === 'once' ? '单次' : '循环'}</td>
      <td class="status-cell">
        <span class="status-text">${rule.disabled ? '已禁用' : '已启用'}</span>
        <label class="switch">
          <input type="checkbox" class="status-toggle" data-rule-id="${rule.id}" ${rule.disabled ? '' : 'checked'}>
          <span class="switch-slider"></span>
        </label>
      </td>
      <td class="actions-cell">
        <button class="secondary-button edit-rule" data-rule-id="${rule.id}">编辑</button>
        <button class="delete-button delete-rule" data-rule-id="${rule.id}">删除</button>
      </td>
    `;

    // 添加事件监听器
    const checkbox = tr.querySelector('.rule-checkbox');
    checkbox.addEventListener('change', updateBulkActions);

    const editButton = tr.querySelector('.edit-rule');
    editButton.addEventListener('click', () => editRule(rule));

    const deleteButton = tr.querySelector('.delete-rule');
    deleteButton.addEventListener('click', () => deleteRule(rule.id));

    const statusToggle = tr.querySelector('.status-toggle');
    statusToggle.addEventListener('change', (e) => toggleRule(rule.id, e.target.checked));

    tbody.appendChild(tr);
  });

  updateBulkActions();
  updateExportButton();
}

// 更新批量操作区域
function updateBulkActions() {
  const selectedCount = document.querySelectorAll('.rule-checkbox:checked').length;
  const bulkActions = document.getElementById('bulkActions');
  const selectedCountSpan = document.getElementById('selectedCount');
  
  bulkActions.classList.toggle('show', selectedCount > 0);
  selectedCountSpan.textContent = selectedCount;
  
  // 更新导出选中按钮状态
  document.getElementById('exportSelectedButton').disabled = selectedCount === 0;
}

// 更新导出按钮状态
function updateExportButton() {
  const hasRules = document.querySelectorAll('.rule-checkbox').length > 0;
  document.getElementById('exportAllButton').disabled = !hasRules;
}

// 获取选中的规则ID
function getSelectedRuleIds() {
  return Array.from(document.querySelectorAll('.rule-checkbox:checked'))
    .map(checkbox => checkbox.dataset.ruleId);
}

// 导出规则
async function exportRules(selectedOnly = false) {
  try {
    const rules = await loadRules();
    let exportRules = rules;
    
    if (selectedOnly) {
      const selectedIds = getSelectedRuleIds();
      exportRules = rules.filter(rule => selectedIds.includes(rule.id));
    }
    
    if (exportRules.length === 0) {
      alert('没有可导出的规则！');
      return;
    }

    // 准备导出数据
    const exportData = exportRules.map(rule => {
      const { url, ...ruleWithoutUrl } = rule;
      return ruleWithoutUrl;
    });

    // 加密数据
    const jsonStr = JSON.stringify(exportData);
    const encrypted = CryptoJS.AES.encrypt(jsonStr, ENCRYPTION_KEY).toString();
    
    // 创建并下载文件
    const blob = new Blob([encrypted], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `modifier-rules-${new Date().toISOString().slice(0,10)}.mrf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    log('success', '规则导出成功', {
      selectedOnly,
      count: exportRules.length
    });
  } catch (error) {
    log('error', '规则导出失败', { error: error.message });
    alert('导出失败：' + error.message);
  }
}

// 编辑规则
function editRule(rule) {
  // 打开弹出窗口进行编辑
  chrome.windows.create({
    url: chrome.runtime.getURL('popup.html') + '?edit=' + rule.id + '&url=' + encodeURIComponent(rule.url),
    type: 'popup',
    width: 600,
    height: 800
  });
}

// 删除规则
async function deleteRule(ruleId) {
  if (!confirm('确定要删除这条规则吗？')) {
    return;
  }

  try {
    const rules = await loadRules();
    const newRules = rules.filter(r => r.id !== ruleId);
    await saveRules(newRules);
    renderRules(newRules);
    
    log('success', '规则删除成功', { ruleId });
  } catch (error) {
    log('error', '规则删除失败', { error: error.message });
    alert('删除失败：' + error.message);
  }
}

// 切换规则状态
async function toggleRule(ruleId, enabled) {
  try {
    const rules = await loadRules();
    const ruleIndex = rules.findIndex(r => r.id === ruleId);
    if (ruleIndex !== -1) {
      rules[ruleIndex].disabled = !enabled;
      await saveRules(rules);
      
      // 只更新状态文本，不重新渲染整个列表
      const tr = document.querySelector(`[data-rule-id="${ruleId}"]`).closest('tr');
      const statusText = tr.querySelector('.status-text');
      statusText.textContent = enabled ? '已启用' : '已禁用';
      
      log('success', '规则状态切换成功', {
        ruleId,
        newStatus: enabled ? '启用' : '禁用'
      });
    }
  } catch (error) {
    log('error', '规则状态切换失败', { error: error.message });
    alert('状态切换失败：' + error.message);
    
    // 切换失败时恢复开关状态
    const toggle = document.querySelector(`[data-rule-id="${ruleId}"].status-toggle`);
    if (toggle) {
      toggle.checked = !enabled;
    }
  }
}

// 批量启用规则
async function enableRules(ruleIds) {
  try {
    const rules = await loadRules();
    const updatedRules = rules.map(rule => {
      if (ruleIds.includes(rule.id)) {
        return { ...rule, disabled: false };
      }
      return rule;
    });
    await saveRules(updatedRules);
    renderRules(updatedRules);
    
    log('success', '规则批量启用成功', { count: ruleIds.length });
  } catch (error) {
    log('error', '规则批量启用失败', { error: error.message });
    alert('启用失败：' + error.message);
  }
}

// 批量禁用规则
async function disableRules(ruleIds) {
  try {
    const rules = await loadRules();
    const updatedRules = rules.map(rule => {
      if (ruleIds.includes(rule.id)) {
        return { ...rule, disabled: true };
      }
      return rule;
    });
    await saveRules(updatedRules);
    renderRules(updatedRules);
    
    log('success', '规则批量禁用成功', { count: ruleIds.length });
  } catch (error) {
    log('error', '规则批量禁用失败', { error: error.message });
    alert('禁用失败：' + error.message);
  }
}

// 批量删除规则
async function deleteRules(ruleIds) {
  if (!confirm(`确定要删除选中的 ${ruleIds.length} 条规则吗？`)) {
    return;
  }

  try {
    const rules = await loadRules();
    const newRules = rules.filter(rule => !ruleIds.includes(rule.id));
    await saveRules(newRules);
    renderRules(newRules);
    
    log('success', '规则批量删除成功', { count: ruleIds.length });
  } catch (error) {
    log('error', '规则批量删除失败', { error: error.message });
    alert('删除失败：' + error.message);
  }
}

// 初始化页面
document.addEventListener('DOMContentLoaded', async () => {
  // 加载规则列表
  const rules = await loadRules();
  renderRules(rules);

  // 全选/取消全选
  document.getElementById('selectAll').addEventListener('change', (e) => {
    const checkboxes = document.querySelectorAll('.rule-checkbox');
    checkboxes.forEach(checkbox => checkbox.checked = e.target.checked);
    updateBulkActions();
  });

  // 搜索和过滤
  const searchInput = document.getElementById('searchInput');
  const modeFilter = document.getElementById('modeFilter');
  const statusFilter = document.getElementById('statusFilter');

  function applyFilters() {
    const filters = {
      search: searchInput.value,
      mode: modeFilter.value,
      status: statusFilter.value
    };
    renderRules(rules, filters);
  }

  searchInput.addEventListener('input', applyFilters);
  modeFilter.addEventListener('change', applyFilters);
  statusFilter.addEventListener('change', applyFilters);

  // 导出按钮
  document.getElementById('exportAllButton').addEventListener('click', () => {
    exportRules(false);
  });

  document.getElementById('exportSelectedButton').addEventListener('click', () => {
    exportRules(true);
  });

  // 批量操作按钮
  document.getElementById('enableSelected').addEventListener('click', () => {
    enableRules(getSelectedRuleIds());
  });

  document.getElementById('disableSelected').addEventListener('click', () => {
    disableRules(getSelectedRuleIds());
  });

  document.getElementById('deleteSelected').addEventListener('click', () => {
    deleteRules(getSelectedRuleIds());
  });
}); 