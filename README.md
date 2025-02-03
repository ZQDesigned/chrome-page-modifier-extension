# Chrome 页面内容修改器扩展

这是一个强大的 Chrome 扩展，允许用户自定义修改网页内容。通过简单的配置，你可以替换页面上的文本内容，修改文字颜色，并支持动态内容的自动更新。

## 主要功能

- 🎯 精确定位：使用 CSS 选择器精确定位页面元素
- 🔄 动态更新：支持循环模式，自动处理动态加载的内容
- 🎨 样式定制：支持修改文字颜色
- 💾 规则管理：导入/导出规则，方便分享和备份
- ⚡ 性能优化：内置智能限流机制，避免过度消耗资源
- 🔒 安全可靠：规则文件加密存储，保护你的隐私

## 安装说明

1. 下载本扩展的源代码
2. 打开 Chrome 浏览器，进入扩展管理页面（chrome://extensions/）
3. 开启右上角的"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择本扩展的源代码目录

## 使用方法

### 创建修改规则

1. 点击扩展图标，打开控制面板
2. 在"创建规则"标签页中：
   - 输入规则名称
   - 设置目标元素的 CSS 选择器（[查看选择器编写指南](docs/selector-guide.md)）
   - 输入要替换的新内容
   - 选择是否修改文字颜色
   - 选择触发时机（立即/页面加载后）
   - 选择修改模式（单次/循环）
3. 点击"保存规则"按钮

### 管理规则

- 在"已保存规则"标签页中查看所有规则
- 可以编辑或删除已有规则
- 使用导入/导出功能管理规则集
- 支持选择性导出规则
- 提供规则搜索和过滤功能

### 规则设置页面

1. 右键点击扩展图标，选择"选项"
2. 在设置页面中可以：
   - 查看所有已保存的规则
   - 搜索和过滤规则
   - 批量启用/禁用规则
   - 批量删除规则
   - 导出全部或选中的规则

### 性能控制

- 可选择是否启用强制循环功能
- 内置智能限流机制，避免过度消耗系统资源
- 针对不同场景优化的触发策略

## 高级功能

### 规则导出/导入

- 规则以加密格式保存为 .mrf 文件
- 支持批量导入规则
- 支持选择性导出规则
- 自动合并重复规则
- 导入时自动更新现有规则

### 动态内容处理

- 支持 iframe 内容修改
- 智能检测动态加载的内容
- 可配置强制循环检查功能

### 规则管理

- 支持规则搜索和过滤
- 按修改模式和状态筛选
- 批量操作功能
- 详细的规则状态显示

## 注意事项

- 选择器建议使用 Chrome 开发者工具获取（[查看详细教程](docs/selector-guide.md#使用开发者工具)）
- 循环模式可能会增加 CPU 使用率
- 建议仅在必要时启用强制循环功能
- 导出规则时建议选择性导出，避免导出无用规则

## 技术支持

如有问题或建议，请在 GitHub 仓库提交 Issue。

## 许可证

MIT License 