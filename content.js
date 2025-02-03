let settings = null;
let observer = null;
let rules = []; // 存储所有规则

// 限流相关变量
const MIN_INTERVAL = 500; // 最小修改间隔（毫秒）
const MAX_MODIFY_PER_MINUTE = 30; // 每分钟最大修改次数
const ruleStates = new Map(); // 存储每个规则的限流状态

// 添加初始化时间标记
const initTime = Date.now();
const INIT_GRACE_PERIOD = 1000; // 初始化宽限期（1秒）

// 循环触发器相关变量
const LOOP_INTERVAL = 250; // 循环触发间隔（毫秒）
let loopTimer = null;

// 添加强制循环设置
let forceLoopEnabled = false;

// 防抖函数
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// 获取规则状态
function getRuleState(ruleId) {
  if (!ruleStates.has(ruleId)) {
    ruleStates.set(ruleId, {
      lastModifyTime: 0,
      modifyCount: 0,
      lastMinuteStart: Date.now()
    });
  }
  return ruleStates.get(ruleId);
}

// 检查是否可以执行修改
function canModify(rule) {
  // 单次修改模式不限流
  if (rule.modifyMode === 'once') {
    log('info', '单次修改模式，跳过限流检查', { ruleId: rule.id });
    return true;
  }

  const now = Date.now();
  
  // 初始化宽限期内不限流
  if (now - initTime < INIT_GRACE_PERIOD) {
    log('info', '初始化宽限期内，跳过限流检查', {
      timeSinceInit: now - initTime,
      gracePeriod: INIT_GRACE_PERIOD,
      ruleId: rule.id
    });
    return true;
  }

  const state = getRuleState(rule.id);

  // 检查最小时间间隔
  if (now - state.lastModifyTime < MIN_INTERVAL) {
    log('warning', '规则修改过于频繁，已限流', {
      ruleId: rule.id,
      ruleName: rule.name,
      timeSinceLastModify: now - state.lastModifyTime,
      minInterval: MIN_INTERVAL
    });
    return false;
  }
  
  // 检查每分钟修改次数限制
  if (now - state.lastMinuteStart >= 60000) {
    // 重置计数器
    state.modifyCount = 0;
    state.lastMinuteStart = now;
  }
  
  if (state.modifyCount >= MAX_MODIFY_PER_MINUTE) {
    log('warning', '规则达到每分钟最大修改次数限制', {
      ruleId: rule.id,
      ruleName: rule.name,
      modifyCount: state.modifyCount,
      maxPerMinute: MAX_MODIFY_PER_MINUTE,
      timeUntilReset: Math.ceil((state.lastMinuteStart + 60000 - now) / 1000) + '秒'
    });
    return false;
  }
  
  return true;
}

// 更新修改计数器
function updateModifyCounter(rule) {
  // 只在循环模式下更新计数器
  if (rule.modifyMode === 'loop') {
    const state = getRuleState(rule.id);
    state.lastModifyTime = Date.now();
    state.modifyCount++;
    
    log('info', '规则修改计数更新', {
      ruleId: rule.id,
      ruleName: rule.name,
      modifyCount: state.modifyCount,
      maxPerMinute: MAX_MODIFY_PER_MINUTE,
      lastModifyTime: new Date(state.lastModifyTime).toISOString()
    });
  }
}

// 日志记录函数
function log(type, message, data = null) {
  const timestamp = new Date().toISOString();
  const logMessage = {
    timestamp,
    type,
    message,
    data
  };
  console.log('🔄 内容修改器 >', logMessage);
}

// 修改元素内容的函数
function modifyContent(element, rule) {
  if (!element || !rule || !rule.newContent) {
    log('warning', '修改失败：缺少必要参数', { element: !!element, hasRule: !!rule });
    return;
  }
  
  if (!canModify(rule)) {
    return;
  }
  
  const oldContent = element.innerHTML;
  const oldColor = element.style.color;
  
  // 修改内容
  element.innerHTML = rule.newContent;
  
  // 修改颜色（如果启用）
  if (rule.enableColor && rule.textColor) {
    element.style.color = rule.textColor;
    log('info', '颜色修改成功', {
      oldColor: oldColor || '默认颜色',
      newColor: rule.textColor,
      ruleName: rule.name,
      modifyMode: rule.modifyMode
    });
  }
  
  updateModifyCounter(rule);
  
  log('success', '内容修改成功', {
    ruleName: rule.name,
    selector: rule.selector,
    modifyMode: rule.modifyMode,
    oldContent: oldContent.substring(0, 100) + (oldContent.length > 100 ? '...' : ''),
    newContent: rule.newContent.substring(0, 100) + (rule.newContent.length > 100 ? '...' : ''),
    colorModified: rule.enableColor && rule.textColor,
    isInitialPhase: Date.now() - initTime < INIT_GRACE_PERIOD
  });
}

// 获取元素在页面中的详细信息
function getElementDetails(element) {
  if (!element) return null;
  return {
    tagName: element.tagName,
    id: element.id,
    className: element.className,
    textContent: element.textContent?.substring(0, 50) + (element.textContent?.length > 50 ? '...' : ''),
    attributes: Array.from(element.attributes).map(attr => ({
      name: attr.name,
      value: attr.value
    })),
    path: getElementPath(element)
  };
}

// 获取元素的 DOM 路径
function getElementPath(element) {
  const path = [];
  while (element && element.nodeType === Node.ELEMENT_NODE) {
    let selector = element.tagName.toLowerCase();
    if (element.id) {
      selector += '#' + element.id;
    } else if (element.className) {
      selector += '.' + Array.from(element.classList).join('.');
    }
    path.unshift(selector);
    element = element.parentNode;
  }
  return path.join(' > ');
}

// 获取所有可访问的 iframe
function getAllFrames() {
  const frames = [document];
  try {
    // 获取所有 iframe
    const iframes = document.getElementsByTagName('iframe');
    for (const iframe of iframes) {
      try {
        // 检查是否可以访问 iframe 的内容（同源策略）
        if (iframe.contentDocument) {
          frames.push(iframe.contentDocument);
          log('info', '成功访问 iframe', {
            src: iframe.src,
            id: iframe.id,
            name: iframe.name
          });
        }
      } catch (e) {
        log('warning', '无法访问 iframe（可能是跨域限制）', {
          src: iframe.src,
          error: e.message
        });
      }
    }
  } catch (e) {
    log('error', '获取 iframe 列表失败', { error: e.message });
  }
  return frames;
}

// 在所有 frame 中查找元素
function findElementInFrames(selector) {
  const frames = getAllFrames();
  let element = null;
  let frameIndex = -1;

  frames.some((frame, index) => {
    try {
      element = frame.querySelector(selector);
      if (element) {
        frameIndex = index;
        return true;
      }
    } catch (e) {
      log('warning', '在 frame 中查找元素失败', {
        frameIndex: index,
        error: e.message
      });
    }
    return false;
  });

  return { element, frameIndex };
}

// 处理单个规则
function handleRule(rule) {
  if (!rule || !rule.selector) {
    log('warning', '处理失败：规则无效', { rule });
    return;
  }

  // 如果规则被禁用，直接返回
  if (rule.disabled) {
    log('info', '规则已禁用，跳过处理', {
      ruleName: rule.name,
      ruleId: rule.id
    });
    return;
  }
  
  // 记录当前页面状态
  log('info', '开始查找元素 - 页面状态', {
    url: window.location.href,
    title: document.title,
    readyState: document.readyState,
    timestamp: new Date().toISOString(),
    ruleName: rule.name,
    selector: rule.selector,
    totalElements: document.getElementsByTagName('*').length,
    bodyChildNodes: document.body.childNodes.length,
    iframeCount: document.getElementsByTagName('iframe').length
  });

  // 尝试查找元素前的日志
  log('info', '正在查找目标元素', {
    ruleName: rule.name,
    selector: rule.selector,
    selectorType: rule.selector.startsWith('#') ? 'ID' : 
                 rule.selector.startsWith('.') ? 'Class' : 
                 rule.selector.includes('[') ? 'Attribute' : 'Tag/Complex'
  });
  
  const { element, frameIndex } = findElementInFrames(rule.selector);
  
  if (element) {
    // 找到元素后的详细日志
    log('success', '成功找到目标元素', {
      ruleName: rule.name,
      selector: rule.selector,
      frameIndex: frameIndex,
      elementDetails: getElementDetails(element),
      parentDetails: getElementDetails(element.parentElement),
      siblings: {
        total: element.parentElement ? element.parentElement.children.length : 0,
        position: Array.from(element.parentElement?.children || []).indexOf(element) + 1
      },
      visibility: {
        isVisible: element.offsetParent !== null,
        dimensions: {
          width: element.offsetWidth,
          height: element.offsetHeight,
          top: element.offsetTop,
          left: element.offsetLeft
        },
        computedStyle: {
          display: window.getComputedStyle(element).display,
          visibility: window.getComputedStyle(element).visibility,
          opacity: window.getComputedStyle(element).opacity
        }
      }
    });
    
    modifyContent(element, rule);
  } else {
    // 未找到元素时的诊断日志
    log('warning', '未找到目标元素，诊断信息', {
      ruleName: rule.name,
      selector: rule.selector,
      searchedFrames: getAllFrames().length,
      possibleIssues: [
        rule.selector.includes(' ') ? '选择器包含空格，请确保格式正确' : null,
        rule.selector.includes('#') && document.querySelectorAll(rule.selector).length > 1 ? 'ID选择器匹配到多个元素' : null,
        rule.selector.startsWith('.') && !document.getElementsByClassName(rule.selector.slice(1)).length ? '未找到指定class的元素' : null,
        document.getElementsByTagName('iframe').length > 0 ? '页面包含iframe，目标元素可能在iframe中但无法访问（跨域限制）' : null
      ].filter(Boolean)
    });
  }
}

// 处理所有规则
function handleAllRules() {
  rules.forEach(rule => {
    if (rule.url === window.location.href) {
      handleRule(rule);
    }
  });
}

// 开始观察 DOM 变化
function startObserving() {
  if (!observer) {
    log('info', '创建新的观察器');
    
    observer = new MutationObserver((mutations) => {
      log('info', 'DOM发生变化，准备处理元素', {
        mutationsCount: mutations.length,
        timeSinceLastModify: Date.now() - lastModifyTime,
        currentModifyCount: modifyCount,
        activeRules: rules.filter(rule => rule.url === window.location.href).length
      });
      
      // 处理所有需要循环修改的规则
      const currentRules = rules.filter(rule => 
        rule.url === window.location.href && 
        rule.modifyMode === 'loop'
      );

      currentRules.forEach(rule => {
        handleRule(rule);
      });
    });

    // 观察主文档
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });

    // 观察所有可访问的 iframe
    try {
      const iframes = document.getElementsByTagName('iframe');
      for (const iframe of iframes) {
        try {
          if (iframe.contentDocument && iframe.contentDocument.body) {
            observer.observe(iframe.contentDocument.body, {
              childList: true,
              subtree: true,
              characterData: true
            });
            log('info', '成功添加 iframe 观察器', {
              src: iframe.src,
              id: iframe.id,
              name: iframe.name
            });
          }
        } catch (e) {
          log('warning', '无法观察 iframe（可能是跨域限制）', {
            src: iframe.src,
            error: e.message
          });
        }
      }
    } catch (e) {
      log('error', '设置 iframe 观察器失败', { error: e.message });
    }
    
    log('success', '观察器启动成功', {
      config: {
        minInterval: MIN_INTERVAL + 'ms',
        maxModifyPerMinute: MAX_MODIFY_PER_MINUTE,
        observedFrames: getAllFrames().length
      }
    });
  }
}

// 停止观察
function stopObserving() {
  if (observer) {
    observer.disconnect();
    observer = null;
    stopLoopTimer(); // 同时停止循环触发器
    log('info', '观察器和循环触发器已停止');
  }
}

// 处理循环规则
function handleLoopRules(force = false) {
  const currentRules = rules.filter(rule => 
    rule.url === window.location.href && 
    rule.modifyMode === 'loop'
  );

  if (currentRules.length > 0) {
    log('info', '执行循环规则检查', {
      rulesCount: currentRules.length,
      forced: force,
      timestamp: new Date().toISOString()
    });

    currentRules.forEach(rule => {
      // 在强制模式下跳过限流检查
      if (force) {
        const { element, frameIndex } = findElementInFrames(rule.selector);
        if (element) {
          const oldContent = element.innerHTML;
          element.innerHTML = rule.newContent;
          if (rule.enableColor && rule.textColor) {
            element.style.color = rule.textColor;
          }
          log('info', '强制循环执行规则修改', {
            ruleName: rule.name,
            ruleId: rule.id,
            frameIndex,
            contentChanged: oldContent !== rule.newContent
          });
        }
      } else {
        handleRule(rule);
      }
    });
  }
}

// 启动循环触发器
function startLoopTimer() {
  // 只在启用强制循环时创建定时器
  if (!loopTimer && forceLoopEnabled) {
    log('info', '启动循环触发器', {
      interval: LOOP_INTERVAL,
      forceLoopEnabled
    });

    loopTimer = setInterval(() => {
      handleLoopRules(true); // 使用强制模式
    }, LOOP_INTERVAL);
  }
}

// 停止循环触发器
function stopLoopTimer() {
  if (loopTimer) {
    clearInterval(loopTimer);
    loopTimer = null;
    log('info', '停止循环触发器');
  }
}

// 修改初始化函数
function initModification() {
  const currentRules = rules.filter(rule => rule.url === window.location.href);
  
  if (!currentRules.length) {
    log('info', '当前页面没有匹配的规则');
    return;
  }

  log('info', '开始初始化修改逻辑', {
    totalRules: rules.length,
    matchingRules: currentRules.length
  });

  // 处理所有规则
  currentRules.forEach(rule => {
    if (rule.triggerTiming === 'immediate') {
      log('info', `即时修改模式 - 规则：${rule.name}`);
      handleRule(rule);
    } else if (rule.triggerTiming === 'onload') {
      log('info', `页面加载完成后修改 - 规则：${rule.name}`);
      window.addEventListener('load', () => {
        log('info', `页面加载完成，开始处理 - 规则：${rule.name}`);
        handleRule(rule);
      });
    }
  });

  // 如果有任何规则需要循环修改，启动观察器和循环触发器
  const hasLoopRules = currentRules.some(rule => rule.modifyMode === 'loop');
  if (hasLoopRules) {
    log('info', '存在循环修改规则，启动观察器和循环触发器');
    startObserving();
    startLoopTimer();
  }
}

// 修改监听消息的处理
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'UPDATE_SETTINGS') {
    log('info', '收到新的规则', message.settings);
    // 更新或添加规则
    const ruleIndex = rules.findIndex(r => r.id === message.settings.id);
    if (ruleIndex !== -1) {
      rules[ruleIndex] = message.settings;
    } else {
      rules.push(message.settings);
    }

    // 检查是否需要启动循环触发器
    const hasLoopRules = rules.some(rule => 
      rule.url === window.location.href && 
      rule.modifyMode === 'loop'
    );

    if (hasLoopRules && forceLoopEnabled) {
      startLoopTimer();
    } else {
      stopLoopTimer();
    }

    // 只有当没有观察器时才需要重新初始化
    if (!observer) {
      initModification();
    } else {
      // 直接处理新规则
      handleRule(message.settings);
    }
  } else if (message.type === 'UPDATE_FORCE_LOOP') {
    log('info', '收到强制循环设置更新', { enabled: message.enabled });
    forceLoopEnabled = message.enabled;
    
    // 根据设置和当前规则状态决定是否启动/停止循环触发器
    const hasLoopRules = rules.some(rule => 
      rule.url === window.location.href && 
      rule.modifyMode === 'loop'
    );

    if (hasLoopRules && forceLoopEnabled) {
      startLoopTimer();
    } else {
      stopLoopTimer();
    }
  }
});

// 从 storage 加载设置和规则
chrome.storage.sync.get(['rules', 'forceLoopEnabled'], (result) => {
  // 加载强制循环设置
  forceLoopEnabled = result.forceLoopEnabled || false;
  log('info', '加载强制循环设置', { enabled: forceLoopEnabled });

  // 加载规则
  if (result.rules && result.rules.length > 0) {
    log('info', '从存储中加载规则', {
      totalRules: result.rules.length,
      matchingRules: result.rules.filter(rule => rule.url === window.location.href).length,
      forceLoopEnabled
    });
    rules = result.rules;
    initModification();
  } else {
    log('info', '存储中没有找到规则');
  }
}); 