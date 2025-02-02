# 选择器编写指南

本指南将帮助你编写准确的 CSS 选择器，以精确定位要修改的页面元素。

## 基础选择器

### 1. ID 选择器（最优先）
如果目标元素有唯一的 ID 属性：
```html
<div id="user-name">用户名</div>
```
选择器写法：
```css
#user-name
```

### 2. 类选择器
如果目标元素有特定的 class：
```html
<div class="article-title">文章标题</div>
```
选择器写法：
```css
.article-title
```

### 3. 标签选择器
针对特定的 HTML 标签：
```html
<h1>标题文本</h1>
```
选择器写法：
```css
h1
```

## 组合选择器

### 1. 多类组合
当元素有多个 class：
```html
<div class="card premium-content">内容</div>
```
选择器写法：
```css
.card.premium-content
```

### 2. 父子关系
当需要指定父元素下的子元素：
```html
<div class="container">
  <div class="content">目标内容</div>
</div>
```
选择器写法：
```css
.container .content
```

### 3. 直接子元素
只选择直接子元素：
```html
<div class="parent">
  <span>直接子元素</span>
</div>
```
选择器写法：
```css
.parent > span
```

## 属性选择器

### 1. 具有特定属性
选择带有特定属性的元素：
```html
<input type="text" data-role="username">
```
选择器写法：
```css
[data-role="username"]
```

### 2. 属性值包含特定文本
```html
<a href="https://example.com">链接</a>
```
选择器写法：
```css
[href*="example.com"]
```

## 动态内容选择器

### 1. 动态加载的列表项
```html
<ul class="feed">
  <li class="post">动态内容1</li>
  <li class="post">动态内容2</li>
</ul>
```
选择器写法：
```css
.feed .post
```

### 2. iframe 内容
```html
<iframe class="content-frame">
  <div class="target">目标内容</div>
</iframe>
```
选择器写法：
```css
.content-frame .target
```

## 实用技巧

### 1. 使用开发者工具

1. 右键点击要修改的元素
2. 选择"检查"
3. 在开发者工具中右键点击对应的 HTML 代码
4. 选择"Copy > Copy selector"
5. 得到精确的选择器

### 2. 选择器测试

1. 在开发者工具的 Console 面板中
2. 使用 `document.querySelector('你的选择器')` 测试
3. 如果返回 null，说明选择器无效
4. 如果返回元素，可以继续检查是否是目标元素

### 3. 常见问题解决

#### 动态内容无法选中
- 使用更通用的父元素选择器
- 启用循环修改模式
- 考虑使用强制循环功能

#### 选择器太具体导致失效
- 避免过长的选择器链
- 优先使用唯一标识（如 ID）
- 使用类名而不是标签名

#### iframe 内容无法选中
- 确保 iframe 同源
- 使用正确的 iframe 选择器路径
- 启用循环修改模式

## 选择器优化建议

1. **优先级排序**
   - ID 选择器 (#id)
   - 类选择器 (.class)
   - 属性选择器 ([attr=value])
   - 标签选择器 (div, span)

2. **性能考虑**
   - 选择器越简单越好
   - 避免使用通配符 (*)
   - 减少选择器嵌套层级

3. **可维护性**
   - 使用有意义的类名
   - 避免依赖页面结构
   - 记录选择器的用途

## 示例场景

### 1. 社交媒体帖子
```html
<div class="post-container">
  <div class="post-header">
    <span class="username">用户名</span>
    <span class="timestamp">2小时前</span>
  </div>
  <div class="post-content">内容</div>
</div>
```
修改用户名：
```css
.post-header .username
```

### 2. 电商产品页
```html
<div class="product-card">
  <h2 class="product-title">产品名称</h2>
  <div class="price-container">
    <span class="price">¥199</span>
    <span class="original-price">¥299</span>
  </div>
</div>
```
修改价格：
```css
.price-container .price
```

### 3. 新闻网站文章
```html
<article class="news-article">
  <header>
    <h1 class="article-title">文章标题</h1>
    <div class="article-meta">
      <span class="author">作者名</span>
      <time class="publish-date">2024-01-01</time>
    </div>
  </header>
  <div class="article-content">文章内容</div>
</article>
```
修改作者名：
```css
.article-meta .author
``` 