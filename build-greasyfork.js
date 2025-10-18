const fs = require('fs');
const path = require('path');

// 读取编译后的JavaScript文件
const jsContent = fs.readFileSync('./dist/with-profile-copy.js', 'utf8');

// 读取package.json获取版本信息
const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));

// 用户脚本头部 - 针对GreasyFork优化
const header = `// ==UserScript==
// @name         deai prompt generator
// @namespace    http://tampermonkey.net/
// @version      ${packageJson.version}
// @description  with.isとpairs.lvのユーザーページにコピーボタンを追加し、AI対話プロンプトを生成します
// @author       Your Name
// @match        https://with.is/users/*
// @match        https://pairs.lv/message/detail/*
// @grant        GM_setClipboard
// @license      MIT
// @supportURL   https://github.com/thelastfantasy/with-profile-copy/issues
// @updateURL    https://github.com/thelastfantasy/with-profile-copy/raw/dist/script.user.js
// @downloadURL  https://github.com/thelastfantasy/with-profile-copy/raw/dist/script.user.js
// ==/UserScript==

`;

// 合并头部和编译后的代码
const finalContent = header + jsContent;

// 写入根目录的用户脚本文件（用于GreasyFork导入）
fs.writeFileSync('./script.user.js', finalContent);

console.log('✅ GreasyFork用户脚本构建完成: script.user.js');