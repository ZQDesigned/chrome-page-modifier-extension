document.addEventListener('DOMContentLoaded', async () => {
  // 获取当前标签页的URL
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  document.getElementById('currentUrl').textContent = tab.url;

  // 颜色选择器相关
  const colorInput = document.getElementById('textColor');
  const colorPreview = document.getElementById('colorPreview');
  const enableColor = document.getElementById('enableColor');

  // 更新颜色预览
  function updateColorPreview() {
    colorPreview.style.backgroundColor = colorInput.value;
  }

  // 监听颜色变化
  colorInput.addEventListener('input', updateColorPreview);
  updateColorPreview();

  // 标签切换
  const tabButtons = document.querySelectorAll('.tab-button');
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const targetTab = button.dataset.tab;
      // 更新按钮状态
      tabButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      // 显示对应内容
      document.getElementById('ruleForm').classList.toggle('show', targetTab === 'ruleForm');
      document.getElementById('rulesList').classList.toggle('show', targetTab === 'rulesList');
      
      if (targetTab === 'rulesList') {
        loadRulesList();
      }
    });
  });

  // 获取表单数据
  function getFormData() {
    const ruleId = document.getElementById('ruleForm').dataset.editingRuleId || Date.now().toString();
    return {
      id: ruleId, // 使用现有ID或创建新ID
      name: document.getElementById('ruleName').value,
      selector: document.getElementById('selector').value,
      newContent: document.getElementById('newContent').value,
      triggerTiming: document.getElementById('triggerTiming').value,
      modifyMode: document.getElementById('modifyMode').value,
      textColor: colorInput.value,
      enableColor: enableColor.checked,
      url: tab.url
    };
  }

  // 清空表单
  function clearForm() {
    document.getElementById('ruleForm').dataset.editingRuleId = ''; // 清除编辑状态
    document.getElementById('ruleName').value = '';
    document.getElementById('selector').value = '';
    document.getElementById('newContent').value = '';
    document.getElementById('triggerTiming').value = 'immediate';
    document.getElementById('modifyMode').value = 'once';
    colorInput.value = '#000000';
    enableColor.checked = false;
    updateColorPreview();
  }

  // 加载规则到表单
  function loadRuleToForm(rule) {
    document.getElementById('ruleForm').dataset.editingRuleId = rule.id; // 保存正在编辑的规则ID
    document.getElementById('ruleName').value = rule.name;
    document.getElementById('selector').value = rule.selector;
    document.getElementById('newContent').value = rule.newContent;
    document.getElementById('triggerTiming').value = rule.triggerTiming;
    document.getElementById('modifyMode').value = rule.modifyMode;
    colorInput.value = rule.textColor || '#000000';
    enableColor.checked = !!rule.enableColor;
    updateColorPreview();
  }

  // 渲染规则列表
  function renderRulesList(rules) {
    const container = document.querySelector('.rules-container');
    container.innerHTML = rules.length ? '' : '<p>暂无保存的规则</p>';
    
    rules.forEach(rule => {
      const ruleElement = document.createElement('div');
      ruleElement.className = 'rule-item';
      ruleElement.innerHTML = `
        <div class="rule-header">
          <div class="rule-title">${rule.name || '未命名规则'}</div>
          <div class="rule-actions">
            <button class="secondary edit-rule" data-rule-id="${rule.id}">编辑</button>
            <button class="delete delete-rule" data-rule-id="${rule.id}">删除</button>
          </div>
        </div>
        <div class="rule-content">
          <div>选择器: ${rule.selector}</div>
          <div>内容: ${rule.newContent.substring(0, 50)}${rule.newContent.length > 50 ? '...' : ''}</div>
          <div>颜色: ${rule.enableColor ? rule.textColor : '未启用'}</div>
          <div>触发: ${rule.triggerTiming === 'immediate' ? '立即' : '页面加载后'}</div>
          <div>模式: ${rule.modifyMode === 'once' ? '单次' : '循环'}</div>
          <div>URL: ${rule.url}</div>
        </div>
      `;

      // 添加编辑按钮事件监听
      const editButton = ruleElement.querySelector('.edit-rule');
      editButton.addEventListener('click', () => {
        chrome.storage.sync.get('rules', (result) => {
          const rules = result.rules || [];
          const rule = rules.find(r => r.id === editButton.dataset.ruleId);
          if (rule) {
            loadRuleToForm(rule);
            // 切换到编辑表单
            tabButtons.forEach(btn => {
              btn.classList.toggle('active', btn.dataset.tab === 'ruleForm');
            });
            document.getElementById('ruleForm').classList.add('show');
            document.getElementById('rulesList').classList.remove('show');
          }
        });
      });

      // 添加删除按钮事件监听
      const deleteButton = ruleElement.querySelector('.delete-rule');
      deleteButton.addEventListener('click', () => {
        if (confirm('确定要删除这条规则吗？')) {
          chrome.storage.sync.get('rules', (result) => {
            const rules = result.rules || [];
            const newRules = rules.filter(r => r.id !== deleteButton.dataset.ruleId);
            chrome.storage.sync.set({ rules: newRules }, () => {
              loadRulesList();
            });
          });
        }
      });

      container.appendChild(ruleElement);
    });
  }

  // 加载规则列表
  async function loadRulesList() {
    chrome.storage.sync.get('rules', (result) => {
      const rules = result.rules || [];
      renderRulesList(rules);
    });
  }

  // 清空按钮点击事件
  document.getElementById('clearButton').addEventListener('click', clearForm);

  // 保存按钮点击事件
  document.getElementById('saveButton').addEventListener('click', () => {
    const newRule = getFormData();
    
    if (!newRule.selector) {
      alert('请输入目标元素选择器！');
      return;
    }

    chrome.storage.sync.get('rules', (result) => {
      const rules = result.rules || [];
      const existingRuleIndex = rules.findIndex(r => r.id === newRule.id);
      
      if (existingRuleIndex !== -1) {
        // 更新现有规则
        rules[existingRuleIndex] = newRule;
      } else {
        // 添加新规则
        rules.push(newRule);
      }

      chrome.storage.sync.set({ rules }, () => {
        // 向content script发送消息
        chrome.tabs.sendMessage(tab.id, {
          type: 'UPDATE_SETTINGS',
          settings: newRule
        });

        alert('规则保存成功！');
        clearForm();
        
        // 切换到规则列表
        tabButtons.forEach(btn => {
          btn.classList.toggle('active', btn.dataset.tab === 'rulesList');
        });
        document.getElementById('ruleForm').classList.remove('show');
        document.getElementById('rulesList').classList.add('show');
        loadRulesList();
      });
    });
  });

  // 加密密钥（建议使用更复杂的密钥生成方式）
  const ENCRYPTION_KEY = 'modifier-rules-v1';

  // 导出规则
  async function exportRules() {
    try {
      log('info', '开始导出规则');
      
      chrome.storage.sync.get('rules', (result) => {
        const rules = result.rules || [];
        if (rules.length === 0) {
          log('warning', '没有可导出的规则');
          alert('没有可导出的规则！');
          return;
        }

        // 准备导出数据（移除URL）
        const exportData = rules.map(rule => {
          const { url, ...ruleWithoutUrl } = rule;
          return ruleWithoutUrl;
        });

        // 转换为JSON并加密
        const jsonStr = JSON.stringify(exportData);
        const encrypted = CryptoJS.AES.encrypt(jsonStr, ENCRYPTION_KEY).toString();
        
        log('info', '规则加密完成', {
          rulesCount: rules.length,
          dataSize: jsonStr.length,
          encryptedSize: encrypted.length
        });

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

        log('success', '规则导出成功');
      });
    } catch (error) {
      log('error', '规则导出失败', { error: error.message });
      alert('导出失败：' + error.message);
    }
  }

  // 导入规则
  async function importRules(file) {
    try {
      log('info', '开始导入规则', {
        fileName: file.name,
        fileSize: file.size
      });

      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          // 解密数据
          const encrypted = e.target.result;
          const decrypted = CryptoJS.AES.decrypt(encrypted, ENCRYPTION_KEY).toString(CryptoJS.enc.Utf8);
          
          if (!decrypted) {
            throw new Error('无法解密文件，可能不是有效的规则文件');
          }

          // 解析JSON
          const importedRules = JSON.parse(decrypted);
          
          log('info', '规则解密成功', {
            rulesCount: importedRules.length,
            decryptedSize: decrypted.length
          });

          // 验证规则格式
          if (!Array.isArray(importedRules)) {
            throw new Error('无效的规则格式');
          }

          // 添加当前URL到规则中
          const rulesWithUrl = importedRules.map(rule => ({
            ...rule,
            url: tab.url
          }));

          // 获取现有规则
          chrome.storage.sync.get('rules', (result) => {
            const existingRules = result.rules || [];
            
            // 合并规则（避免重复）
            const mergedRules = [...existingRules];
            rulesWithUrl.forEach(newRule => {
              const existingIndex = mergedRules.findIndex(r => 
                r.selector === newRule.selector && r.url === newRule.url
              );
              if (existingIndex !== -1) {
                mergedRules[existingIndex] = newRule;
              } else {
                mergedRules.push(newRule);
              }
            });

            // 保存合并后的规则
            chrome.storage.sync.set({ rules: mergedRules }, () => {
              log('success', '规则导入成功', {
                importedCount: rulesWithUrl.length,
                totalRules: mergedRules.length
              });
              alert(`成功导入 ${rulesWithUrl.length} 条规则！`);
              loadRulesList();
            });
          });
        } catch (error) {
          log('error', '规则导入处理失败', { error: error.message });
          alert('导入失败：' + error.message);
        }
      };

      reader.onerror = (error) => {
        log('error', '文件读取失败', { error: error.message });
        alert('文件读取失败：' + error.message);
      };

      reader.readAsText(file);
    } catch (error) {
      log('error', '规则导入失败', { error: error.message });
      alert('导入失败：' + error.message);
    }
  }

  // 强制循环开关处理
  const forceLoopCheckbox = document.getElementById('forceLoopEnabled');
  
  // 加载强制循环设置
  chrome.storage.sync.get('forceLoopEnabled', (result) => {
    forceLoopCheckbox.checked = result.forceLoopEnabled || false;
    log('info', '加载强制循环设置', {
      enabled: forceLoopCheckbox.checked
    });
  });

  // 监听强制循环开关变化
  forceLoopCheckbox.addEventListener('change', () => {
    const enabled = forceLoopCheckbox.checked;
    chrome.storage.sync.set({ forceLoopEnabled: enabled }, () => {
      log('info', '更新强制循环设置', { enabled });
      
      // 通知当前标签页更新设置
      chrome.tabs.sendMessage(tab.id, {
        type: 'UPDATE_FORCE_LOOP',
        enabled: enabled
      });

      // 通知所有其他标签页
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach(t => {
          if (t.id !== tab.id) {
            chrome.tabs.sendMessage(t.id, {
              type: 'UPDATE_FORCE_LOOP',
              enabled: enabled
            }).catch(() => {
              // 忽略不支持的标签页错误
            });
          }
        });
      });
    });
  });

  // 日志函数
  function log(type, message, data = null) {
    const logMessage = {
      timestamp: new Date().toISOString(),
      type,
      message,
      data
    };
    console.log('🔄 规则管理器 >', logMessage);
  }

  // 绑定导入导出按钮事件
  document.getElementById('exportButton').addEventListener('click', exportRules);
  
  document.getElementById('importButton').addEventListener('click', () => {
    document.getElementById('importInput').click();
  });
  
  document.getElementById('importInput').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.name.endsWith('.mrf')) {
        alert('请选择有效的规则文件（.mrf）');
        return;
      }
      importRules(file);
      e.target.value = ''; // 清空选择，允许重复选择同一文件
    }
  });

  // 初始加载规则列表
  loadRulesList();
}); 