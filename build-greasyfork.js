const fs = require('fs');
const path = require('path');

// 读取编译后的JavaScript文件
const jsContent = fs.readFileSync('./dist/with-profile-copy.js', 'utf8');

// 用户脚本头部 - 针对GreasyFork优化
const header = `// ==UserScript==
// @name         With Profile Copy
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  在with.is用户页面添加复制按钮，用于生成AI对话提示
// @author       Your Name
// @match        https://with.is/users/*
// @grant        GM_setClipboard
// @license      MIT
// @supportURL   https://github.com/thelastfantasy/with-profile-copy/issues
// @updateURL    https://github.com/thelastfantasy/with-profile-copy/raw/main/script.user.js
// @downloadURL  https://github.com/thelastfantasy/with-profile-copy/raw/main/script.user.js
// ==/UserScript==

`;

// 合并头部和编译后的代码
const finalContent = header + jsContent;

// 写入根目录的用户脚本文件（用于GreasyFork导入）
fs.writeFileSync('./script.user.js', finalContent);

console.log('✅ GreasyFork用户脚本构建完成: script.user.js');