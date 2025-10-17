const fs = require('fs');
const path = require('path');

// 读取编译后的JavaScript文件
const jsContent = fs.readFileSync('./dist/with-profile-copy.js', 'utf8');

// 用户脚本头部
const header = `// ==UserScript==
// @name         With Profile Copy
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  在with.is用户页面添加复制按钮，用于生成AI对话提示
// @author       Your Name
// @match        https://with.is/users/*
// @grant        GM_setClipboard
// @license      MIT
// ==/UserScript==

`;

// 合并头部和编译后的代码
const finalContent = header + jsContent;

// 写入最终的用户脚本文件
fs.writeFileSync('./dist/with-profile-copy.user.js', finalContent);

console.log('✅ 用户脚本构建完成: dist/with-profile-copy.user.js');