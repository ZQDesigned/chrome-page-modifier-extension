document.addEventListener('DOMContentLoaded', async () => {
  // 获取当前标签页的URL
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  // 检查是否是编辑模式
  const urlParams = new URLSearchParams(window.location.search);
  const editRuleId = urlParams.get('edit');
  const editUrl = urlParams.get('url');
  
  // 设置当前URL（如果是编辑模式，使用原规则的URL）
  document.getElementById('currentUrl').textContent = editUrl || tab.url;

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
      id: ruleId,
      name: document.getElementById('ruleName').value,
      selector: document.getElementById('selector').value,
      newContent: document.getElementById('newContent').value,
      triggerTiming: document.getElementById('triggerTiming').value,
      modifyMode: document.getElementById('modifyMode').value,
      textColor: colorInput.value,
      enableColor: enableColor.checked,
      url: editUrl || tab.url,
      disabled: false // 新规则默认启用
    };
  }

  // 清空表单
  function clearForm() {
    document.getElementById('ruleForm').dataset.editingRuleId = '';
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
    document.getElementById('ruleForm').dataset.editingRuleId = rule.id;
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
          <div class="rule-title">
            <span>${rule.name || '未命名规则'}</span>
            <span class="status-badge ${rule.disabled ? 'status-inactive' : 'status-active'}">
              ${rule.disabled ? '禁用' : '启用'}
            </span>
          </div>
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
      const currentUrlRules = rules.filter(rule => rule.url === (editUrl || tab.url));
      renderRulesList(currentUrlRules);
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
            url: editUrl || tab.url
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

  // 绑定导入按钮事件
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

  // 如果是编辑模式，加载规则
  if (editRuleId) {
    chrome.storage.sync.get('rules', (result) => {
      const rules = result.rules || [];
      const rule = rules.find(r => r.id === editRuleId);
      if (rule) {
        loadRuleToForm(rule);
      }
    });
  }

  // 初始加载规则列表
  loadRulesList();
}); 