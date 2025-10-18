// ==UserScript==
// @name         deai prompt generator
// @namespace    http://tampermonkey.net/
// @version      1.0.3
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

"use strict";
(function () {
    'use strict';
    const CONFIG = {
        MESSAGE_DISPLAY_TIME: 3000,
        PAIRS_MODAL_TIMEOUT: 10000
    };
    const CSS_SELECTORS = {
        WITH_IS: {
            NICKNAME: '.profile_main-nickname',
            AGE_ADDRESS: '.profile_main-age-address',
            INTRODUCTION: '.profile-introduction',
            COMMON_POINTS: '.profile-affinities_list.on-user-detail li',
            BASIC_INFO_TABLE: '.profile-detail table',
            BASIC_INFO_ROW: 'tr',
            BASIC_INFO_HEADER: 'th',
            BASIC_INFO_DATA: 'td'
        },
        PAIRS: {
            NICKNAME: '#dialog-root > div > div > div > div:nth-child(2) > div > div > div:nth-child(3) > div:nth-child(1) > div > div:nth-child(1) > div:nth-child(3) > p',
            AGE_LOCATION: '#dialog-root > div > div > div > div:nth-child(2) > div > div > div:nth-child(3) > div:nth-child(1) > div > div:nth-child(1) > div:nth-child(4) > span',
            MY_TAGS: '#dialog-root > div > div > div > div:nth-child(2) > div > div > div:nth-child(3) > div:nth-child(2) > div:nth-child(1) > div > ul > li > a',
            INTRODUCTION: '#dialog-root > div > div > div > div:nth-child(2) > div > div > div:nth-child(3) > div:nth-child(2) > div:nth-child(2) > div > p',
            PROFILE_CONTAINER: '#dialog-root > div > div > div > div:nth-child(2) > div > div > div:nth-child(3) > div:nth-child(2) > div:nth-child(3) > div',
            BUTTON_INSERT: '#dialog-root > div > div > div > div:nth-child(2) > div > div > div:nth-child(3) > div:nth-child(1) > div > div:nth-child(1) > div:nth-child(3) > p'
        }
    };
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    }
    else {
        init();
    }
    function init() {
        if (window.location.href.includes('with.is/users/')) {
            addCopyButton('WITH_IS');
        }
        else if (window.location.href.includes('pairs.lv/message/detail/')) {
            waitForPairsModal();
        }
        else {
            return;
        }
    }
    function waitForPairsModal() {
        console.log('等待pairs.lv模态框加载...');
        if (tryAddPairsButton()) {
            return;
        }
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'childList') {
                    if (tryAddPairsButton()) {
                        observer.disconnect();
                        console.log('pairs.lv模态框已加载，按钮已添加');
                        return;
                    }
                }
            }
        });
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        setTimeout(() => {
            observer.disconnect();
            console.log('pairs.lv模态框加载超时');
        }, CONFIG.PAIRS_MODAL_TIMEOUT);
    }
    function tryAddPairsButton() {
        const buttonContainer = document.querySelector(CSS_SELECTORS.PAIRS.BUTTON_INSERT);
        if (buttonContainer) {
            addCopyButton('PAIRS');
            return true;
        }
        return false;
    }
    function addCopyButton(site) {
        let buttonContainer = null;
        let buttonText = '📋 ユーザー情報をコピー';
        if (site === 'WITH_IS') {
            buttonContainer = document.querySelector(CSS_SELECTORS.WITH_IS.NICKNAME);
        }
        else if (site === 'PAIRS') {
            buttonContainer = document.querySelector(CSS_SELECTORS.PAIRS.BUTTON_INSERT);
            buttonText = '📋 プロフィールをコピー';
        }
        if (!buttonContainer) {
            console.log('ボタン追加位置が見つかりません:', site, 'selector:', site === 'WITH_IS' ? CSS_SELECTORS.WITH_IS.NICKNAME : CSS_SELECTORS.PAIRS.BUTTON_INSERT);
            return;
        }
        createCopyButton(buttonContainer, buttonText);
    }
    function createCopyButton(container, buttonText) {
        const copyButton = document.createElement('button');
        copyButton.textContent = buttonText;
        copyButton.style.cssText = `
            margin-left: 10px;
            padding: 4px 8px;
            background: #007bff;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
        `;
        copyButton.addEventListener('click', handleCopy);
        container.parentNode?.insertBefore(copyButton, container.nextSibling);
    }
    function handleCopy() {
        try {
            const userData = extractUserData();
            const promptText = generatePrompt(userData);
            GM_setClipboard(promptText, 'text');
            showMessage('✅ ユーザー情報をクリップボードにコピーしました！', 'success');
        }
        catch (error) {
            console.error('コピーに失敗しました:', error);
            showMessage('❌ コピーに失敗しました。コンソールを確認してください', 'error');
        }
    }
    function extractUserData() {
        let selectors;
        let site = 'WITH_IS';
        if (window.location.href.includes('with.is/users/')) {
            selectors = CSS_SELECTORS.WITH_IS;
            site = 'WITH_IS';
        }
        else if (window.location.href.includes('pairs.lv/message/detail/')) {
            selectors = CSS_SELECTORS.PAIRS;
            site = 'PAIRS';
        }
        else {
            throw new Error('サポートされていないサイトです');
        }
        if (site === 'WITH_IS') {
            return extractWithIsData(selectors);
        }
        else {
            return extractPairsData(selectors);
        }
    }
    function extractWithIsData(selectors) {
        const nickname = document.querySelector(selectors.NICKNAME)?.textContent?.trim() || '見つかりません';
        const ageAddressElement = document.querySelector(selectors.AGE_ADDRESS);
        let age = '見つかりません';
        let location = '見つかりません';
        if (ageAddressElement) {
            const text = ageAddressElement.textContent?.trim() || '';
            const parts = text.split('\n').filter((part) => part.trim());
            if (parts.length >= 1)
                age = parts[0].trim();
            if (parts.length >= 2)
                location = parts[1].trim();
        }
        let introduction = document.querySelector(selectors.INTRODUCTION)?.textContent?.trim() || '見つかりません';
        if (introduction.startsWith('自己紹介文')) {
            introduction = introduction.replace(/^自己紹介文\s*/, '');
        }
        const commonPoints = [];
        const commonPointElements = document.querySelectorAll(selectors.COMMON_POINTS);
        commonPointElements.forEach(el => {
            const text = el.textContent?.trim();
            if (text)
                commonPoints.push(text);
        });
        const basicInfo = {};
        const basicInfoTable = document.querySelector(selectors.BASIC_INFO_TABLE);
        if (basicInfoTable) {
            const rows = basicInfoTable.querySelectorAll(selectors.BASIC_INFO_ROW);
            rows.forEach((row) => {
                const th = row.querySelector(selectors.BASIC_INFO_HEADER)?.textContent?.trim();
                const td = row.querySelector(selectors.BASIC_INFO_DATA)?.textContent?.trim();
                if (th && td) {
                    basicInfo[th] = td;
                }
            });
        }
        return {
            nickname,
            age,
            location,
            introduction,
            commonPoints,
            basicInfo,
            site: 'WITH_IS'
        };
    }
    function extractPairsData(selectors) {
        const nickname = document.querySelector(selectors.NICKNAME)?.textContent?.trim() || '見つかりません';
        const ageLocationElement = document.querySelector(selectors.AGE_LOCATION);
        let age = '見つかりません';
        let location = '見つかりません';
        if (ageLocationElement) {
            const text = ageLocationElement.textContent?.trim() || '';
            const parts = text.split(' ').filter((part) => part.trim());
            if (parts.length >= 1)
                age = parts[0].trim();
            if (parts.length >= 2)
                location = parts.slice(1).join(' ').trim();
        }
        const introduction = document.querySelector(selectors.INTRODUCTION)?.textContent?.trim() || '見つかりません';
        const myTags = [];
        const myTagElements = document.querySelectorAll(selectors.MY_TAGS);
        myTagElements.forEach(el => {
            const title = el.getAttribute('title');
            if (title) {
                myTags.push(title);
            }
        });
        const basicInfo = {};
        const profileContainer = document.querySelector(CSS_SELECTORS.PAIRS.PROFILE_CONTAINER);
        if (profileContainer) {
            console.log('找到プロフィール容器');
            const allH3Elements = profileContainer.querySelectorAll('h3');
            console.log('找到的h3元素数量:', allH3Elements.length);
            const allDlElements = profileContainer.querySelectorAll('dl');
            console.log('找到的dl元素数量:', allDlElements.length);
            allDlElements.forEach((dl) => {
                const dtElements = dl.querySelectorAll('dt');
                const ddElements = dl.querySelectorAll('dd');
                dtElements.forEach((dt, index) => {
                    const key = dt.textContent?.trim();
                    const value = ddElements[index]?.textContent?.trim();
                    if (key && value) {
                        basicInfo[key] = value;
                    }
                });
            });
            console.log('提取的基本信息数量:', Object.keys(basicInfo).length);
            console.log('提取的键:', Object.keys(basicInfo));
        }
        else {
            console.log('未找到プロフィール容器');
        }
        return {
            nickname,
            age,
            location,
            introduction,
            myTags,
            basicInfo,
            site: 'PAIRS'
        };
    }
    function generatePrompt(data) {
        const basicInfoText = Object.entries(data.basicInfo).length > 0
            ? Object.entries(data.basicInfo).map(([key, value]) => `${key}: ${value}`).join('\n')
            : 'なし';
        if (data.site === 'PAIRS') {
            const myTagsText = data.myTags.length > 0
                ? data.myTags.map(tag => `- ${tag}`).join('\n')
                : 'なし';
            return `pairs.lvで以下ユーザーとマッチしました。相手の情報は以下になります

ユーザー名：${data.nickname}
年齢：${data.age}
居住地：${data.location}

自己紹介：
${data.introduction}

マイタグ：
${myTagsText}

相手の基本情報：
${basicInfoText}

以上情報常に忘れず、相手と会話で送るメッセージを提案してみてください。`;
        }
        else {
            const commonPointsText = data.commonPoints.length > 0
                ? data.commonPoints.map(point => `- ${point}`).join('\n')
                : 'なし';
            return `with.isで以下ユーザーとマッチしました。相手の情報は以下になります

ユーザー名：${data.nickname}
年齢：${data.age}
居住地：${data.location}

自己紹介文：
${data.introduction}

俺との共通点：
${commonPointsText}

相手の基本情報：
${basicInfoText}

以上情報常に忘れず、相手と会話で送るメッセージを提案してみてください。`;
        }
    }
    function showMessage(message, type) {
        const messageDiv = document.createElement('div');
        messageDiv.textContent = message;
        messageDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 10px 15px;
            background: ${type === 'success' ? '#28a745' : '#dc3545'};
            color: white;
            border-radius: 4px;
            z-index: 10000;
            font-size: 14px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        `;
        document.body.appendChild(messageDiv);
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.parentNode.removeChild(messageDiv);
            }
        }, CONFIG.MESSAGE_DISPLAY_TIME);
    }
})();
