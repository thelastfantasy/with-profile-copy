const fs = require('fs');
const path = require('path');

// 读取编译后的JavaScript文件
const jsContent = fs.readFileSync('./dist/with-profile-copy.js', 'utf8');

// 用户脚本头部
const header = `// ==UserScript==
// @name         deai prompt generator
// @namespace    http://tampermonkey.net/
// @version      1.2.0
// @description  with.isとpairs.lvとmarrish.comのユーザーページにコピーボタンを追加し、AI対話プロンプトを生成します。marrish.comのチャットページでメッセージをコピーできます。
// @author       Your Name
// @match        https://with.is/users/*
// @match        https://pairs.lv/message/detail/*
// @match        https://marrish.com/profile/detail/partner/*
// @match        https://marrish.com/message/index/*
// @grant        GM_setClipboard
// @license      MIT
// @supportURL   https://github.com/thelastfantasy/with-profile-copy/issues
// @updateURL    https://github.com/thelastfantasy/with-profile-copy/raw/main/script.user.js
// @downloadURL  https://github.com/thelastfantasy/with-profile-copy/raw/main/script.user.js
// ==/UserScript==

`;

// 合并头部和编译后的代码
const finalContent = header + jsContent;

// 写入最终的用户脚本文件
fs.writeFileSync('./dist/with-profile-copy.user.js', finalContent);

console.log('✅ 用户脚本构建完成: dist/with-profile-copy.user.js');