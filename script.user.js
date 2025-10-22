// ==UserScript==
// @name         deai prompt generator
// @namespace    http://tampermonkey.net/
// @version      1.0.4
// @description  with.isとpairs.lvとmarrish.comのユーザーページにコピーボタンを追加し、AI対話プロンプトを生成します。marrish.comのチャットページでメッセージをコピーできます。
// @author       Your Name
// @match        https://with.is/users/*
// @match        https://pairs.lv/message/detail/*
// @match        https://marrish.com/profile/detail/partner/*
// @match        https://marrish.com/message/index/*
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
    const TEMPLATES = {
        WITH_IS: {
            header: 'with.isで以下ユーザーとマッチしました。相手の情報は以下になります',
            nickname: 'ユーザー名',
            age: '年齢',
            location: '居住地',
            introduction: '自己紹介文',
            additional: '俺との共通点',
            basicInfo: '相手の基本情報',
            footer: '以上情報常に忘れず、相手と会話で送るメッセージを提案してみてください。'
        },
        PAIRS: {
            header: 'pairs.lvで以下ユーザーとマッチしました。相手の情報は以下になります',
            nickname: 'ユーザー名',
            age: '年齢',
            location: '居住地',
            introduction: '自己紹介',
            additional: 'マイタグ',
            basicInfo: '相手の基本情報',
            footer: '以上情報常に忘れず、相手と会話で送るメッセージを提案してみてください。'
        },
        MARRISH: {
            header: 'marrish.comで以下ユーザーとマッチしました。相手の情報は以下になります',
            nickname: 'ユーザー名',
            age: '年齢',
            location: '居住地',
            introduction: '自己PR',
            additional: '参加グループ',
            basicInfo: '相手の基本情報',
            footer: '以上情報常に忘れず、相手と会話で送るメッセージを提案してみてください。'
        }
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
        },
        MARRISH: {
            BASE_INFO: '.as-profile__baseinfo-pc',
            NAME: '.as-profile__name',
            AGE: '.as-profile__age',
            AREA: '.as-profile__area',
            GROUP_LIST: '.as-prof-group-list',
            GROUP_ITEMS: '.as-prof-group-list__item',
            GROUP_TITLE: '.as-prof-group-list__title',
            GROUP_MEMBER: '.as-prof-group-list__member',
            SELF_PR: '.as-profile-text-contents',
            DETAIL_WRAP: '.as-profile-detail-wrap',
            DETAIL_GROUP: '.as-profile-detail-item-group',
            DETAIL_SUB_TITLE: '.as-profile-detail-sub-title',
            DETAIL_ITEM: '.as-profile-detail-item',
            DETAIL_ITEM_TITLE: '.as-profile-detail-item-title',
            DETAIL_ITEM_DATE: '.as-profile-detail-item-date',
            MESSAGE_BUBBLE: '.yi-message-form-text-body-bg1, .yi-message-form-text-body-bg1-me',
            MESSAGE_CONTENT: 'p',
            SPEAKER_NAME: '.yi-message-form-phone_head_name_textover'
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
        else if (window.location.href.includes('marrish.com/profile/detail/partner/')) {
            waitForMarrishBaseInfo();
        }
        else if (window.location.href.includes('marrish.com/message/index/')) {
            waitForMarrishMessages();
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
    function waitForMarrishBaseInfo() {
        console.log('等待marrish.com基本信息区域加载...');
        if (tryAddMarrishButton()) {
            return;
        }
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'childList') {
                    if (tryAddMarrishButton()) {
                        observer.disconnect();
                        console.log('marrish.com基本信息区域已加载，按钮已添加');
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
            console.log('marrish.com基本信息区域加载超时');
        }, CONFIG.PAIRS_MODAL_TIMEOUT);
    }
    function tryAddMarrishButton() {
        const buttonContainer = document.querySelector(CSS_SELECTORS.MARRISH.AREA);
        if (buttonContainer) {
            addCopyButton('MARRISH');
            return true;
        }
        return false;
    }
    function waitForMarrishMessages() {
        console.log('等待marrish.com聊天消息加载...');
        if (tryAddMessageButtons()) {
            addCopyAllChatButton();
            return;
        }
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'childList') {
                    if (tryAddMessageButtons()) {
                        console.log('marrish.com聊天消息已加载，按钮已添加');
                        addCopyAllChatButton();
                    }
                }
            }
        });
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
    function tryAddMessageButtons() {
        const messageBubbles = document.querySelectorAll(CSS_SELECTORS.MARRISH.MESSAGE_BUBBLE);
        let addedButtons = false;
        messageBubbles.forEach(bubble => {
            if (!bubble.querySelector('.message-copy-button')) {
                addMessageCopyButton(bubble);
                addedButtons = true;
            }
        });
        return addedButtons;
    }
    function addMessageCopyButton(bubble) {
        const copyButton = document.createElement('button');
        copyButton.textContent = '📋';
        copyButton.className = 'message-copy-button';
        copyButton.style.cssText = `
            position: absolute;
            top: 5px;
            left: 5px;
            padding: 2px 6px;
            background: rgba(0, 123, 255, 0.8);
            color: white;
            border: none;
            border-radius: 3px;
            cursor: pointer;
            font-size: 10px;
            z-index: 10;
            opacity: 0.7;
            transition: opacity 0.2s;
        `;
        copyButton.addEventListener('mouseenter', () => {
            copyButton.style.opacity = '1';
        });
        copyButton.addEventListener('mouseleave', () => {
            copyButton.style.opacity = '0.7';
        });
        copyButton.addEventListener('click', (e) => {
            e.stopPropagation();
            copyMessageContent(bubble);
        });
        if (getComputedStyle(bubble).position === 'static') {
            bubble.style.position = 'relative';
        }
        bubble.appendChild(copyButton);
    }
    function copyMessageContent(bubble) {
        try {
            const messageContent = bubble.querySelector(CSS_SELECTORS.MARRISH.MESSAGE_CONTENT);
            if (messageContent) {
                const htmlContent = messageContent.innerHTML;
                const textContent = htmlContent
                    .replace(/<br\s*\/?>/gi, '\n')
                    .replace(/<[^>]*>/g, '')
                    .replace(/\n{3,}/g, '\n\n')
                    .trim();
                const speakerNameElement = document.querySelector(CSS_SELECTORS.MARRISH.SPEAKER_NAME);
                let speakerName = '見つかりません';
                if (speakerNameElement) {
                    speakerName = speakerNameElement.textContent?.trim() || '見つかりません';
                }
                const isMyMessage = bubble.classList.contains('yi-message-form-text-body-bg1-me');
                const speakerPrefix = isMyMessage ? '俺' : speakerName;
                const formattedContent = `${speakerPrefix}：\n${textContent}`;
                GM_setClipboard(formattedContent, 'text');
                showMessage('✅ メッセージをコピーしました！', 'success');
            }
            else {
                showMessage('❌ メッセージ内容が見つかりません', 'error');
            }
        }
        catch (error) {
            console.error('メッセージコピーに失敗しました:', error);
            showMessage('❌ コピーに失敗しました', 'error');
        }
    }
    function addCopyAllChatButton() {
        const readUnreadButton = document.getElementById('read_unread_func_off');
        if (!readUnreadButton) {
            console.log('既読機能OFF按钮が見つかりません');
            return;
        }
        if (readUnreadButton.parentNode?.querySelector('.copy-all-chat-button')) {
            return;
        }
        const copyAllButton = document.createElement('button');
        copyAllButton.textContent = '📋 チャット履歴をコピー';
        copyAllButton.className = 'copy-all-chat-button';
        copyAllButton.style.cssText = `
            margin-right: 10px;
            padding: 6px 12px;
            background: #28a745;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
        `;
        copyAllButton.addEventListener('click', copyAllChatHistory);
        readUnreadButton.parentNode?.insertBefore(copyAllButton, readUnreadButton);
    }
    function copyAllChatHistory() {
        try {
            const messageBubbles = document.querySelectorAll(CSS_SELECTORS.MARRISH.MESSAGE_BUBBLE);
            if (messageBubbles.length === 0) {
                showMessage('❌ チャット履歴が見つかりません', 'error');
                return;
            }
            const speakerNameElement = document.querySelector(CSS_SELECTORS.MARRISH.SPEAKER_NAME);
            const speakerName = speakerNameElement?.textContent?.trim() || '相手';
            const messages = [];
            messages.push('チャット履歴');
            messageBubbles.forEach(bubble => {
                const messageContent = bubble.querySelector(CSS_SELECTORS.MARRISH.MESSAGE_CONTENT);
                if (messageContent) {
                    const htmlContent = messageContent.innerHTML;
                    const textContent = htmlContent
                        .replace(/<br\s*\/?>/gi, '\n')
                        .replace(/<[^>]*>/g, '')
                        .replace(/\n{3,}/g, '\n\n')
                        .trim();
                    const isMyMessage = bubble.classList.contains('yi-message-form-text-body-bg1-me');
                    const speakerPrefix = isMyMessage ? '俺' : speakerName;
                    messages.push(`${speakerPrefix}：`);
                    messages.push(textContent);
                    messages.push('');
                }
            });
            const fullChatHistory = messages.join('\n').trim();
            GM_setClipboard(fullChatHistory, 'text');
            showMessage('✅ チャット履歴をコピーしました！', 'success');
        }
        catch (error) {
            console.error('チャット履歴コピーに失敗しました:', error);
            showMessage('❌ チャット履歴のコピーに失敗しました', 'error');
        }
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
        else if (site === 'MARRISH') {
            buttonContainer = document.querySelector(CSS_SELECTORS.MARRISH.AREA);
            buttonText = '📋 プロフィールをコピー';
        }
        if (!buttonContainer) {
            console.log('ボタン追加位置が見つかりません:', site, 'selector:', site === 'WITH_IS' ? CSS_SELECTORS.WITH_IS.NICKNAME :
                site === 'PAIRS' ? CSS_SELECTORS.PAIRS.BUTTON_INSERT :
                    CSS_SELECTORS.MARRISH.AREA);
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
        else if (window.location.href.includes('marrish.com/profile/detail/partner/')) {
            selectors = CSS_SELECTORS.MARRISH;
            site = 'MARRISH';
        }
        else {
            throw new Error('サポートされていないサイトです');
        }
        if (site === 'WITH_IS') {
            return extractWithIsData(selectors);
        }
        else if (site === 'PAIRS') {
            return extractPairsData(selectors);
        }
        else {
            return extractMarrishData(selectors);
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
    function extractMarrishData(selectors) {
        const name = document.querySelector(selectors.NAME)?.textContent?.trim() || '見つかりません';
        const age = document.querySelector(selectors.AGE)?.textContent?.trim() || '見つかりません';
        const location = document.querySelector(selectors.AREA)?.textContent?.trim() || '見つかりません';
        const groups = [];
        const groupElements = document.querySelectorAll(selectors.GROUP_ITEMS);
        groupElements.forEach(el => {
            const title = el.querySelector(selectors.GROUP_TITLE)?.textContent?.trim();
            const member = el.querySelector(selectors.GROUP_MEMBER)?.textContent?.trim();
            if (title) {
                groups.push({
                    title,
                    member: member || '不明'
                });
            }
        });
        const selfPrElement = document.querySelector(selectors.SELF_PR);
        let selfPr = '見つかりません';
        if (selfPrElement) {
            const htmlContent = selfPrElement.innerHTML;
            selfPr = htmlContent
                .replace(/<br\s*\/?>/gi, '\n')
                .replace(/<[^>]*>/g, '')
                .replace(/\n{3,}/g, '\n\n')
                .trim();
        }
        const basicInfo = {};
        const detailGroups = document.querySelectorAll(selectors.DETAIL_GROUP);
        detailGroups.forEach(group => {
            const subTitle = group.querySelector(selectors.DETAIL_SUB_TITLE)?.textContent?.trim();
            const detailItems = group.querySelectorAll(selectors.DETAIL_ITEM);
            detailItems.forEach((item) => {
                const title = item.querySelector(selectors.DETAIL_ITEM_TITLE)?.textContent?.trim();
                const dateElement = item.querySelector(selectors.DETAIL_ITEM_DATE);
                if (title && dateElement) {
                    let date = title === '活動エリア' ?
                        dateElement.innerHTML
                            .replace(/<br\s*\/?>/gi, ',')
                            .replace(/<[^>]*>/g, '')
                            .trim()
                            .replace(/,\s*,/g, ',')
                            .replace(/,$/, '') :
                        dateElement.textContent?.trim();
                    if (title && date) {
                        const key = title;
                        basicInfo[key] = {
                            value: date,
                            group: subTitle || 'その他'
                        };
                    }
                }
            });
        });
        return {
            nickname: name,
            age,
            location,
            groups,
            selfPr,
            basicInfo,
            site: 'MARRISH'
        };
    }
    function generatePrompt(data) {
        const template = TEMPLATES[data.site];
        if (!template) {
            throw new Error(`未知的网站类型: ${data.site}`);
        }
        let basicInfoText;
        if (data.site === 'MARRISH') {
            basicInfoText = formatMarrishBasicInfo(data.basicInfo);
        }
        else {
            basicInfoText = formatBasicInfo(data.basicInfo);
        }
        const additionalText = formatAdditionalData(data);
        return buildPrompt(template, data, basicInfoText, additionalText);
    }
    function formatBasicInfo(basicInfo) {
        if (Object.entries(basicInfo).length === 0) {
            return 'なし';
        }
        return Object.entries(basicInfo)
            .map(([key, value]) => `${key}: ${value}`)
            .join('\n');
    }
    function formatMarrishBasicInfo(basicInfo) {
        if (Object.entries(basicInfo).length === 0) {
            return 'なし';
        }
        const groupedData = {};
        Object.entries(basicInfo).forEach(([key, data]) => {
            const group = data.group;
            if (!groupedData[group]) {
                groupedData[group] = [];
            }
            groupedData[group].push({ key, value: data.value });
        });
        const sections = [];
        Object.entries(groupedData).forEach(([group, items]) => {
            sections.push(group);
            items.forEach(item => {
                sections.push(`  ${item.key}: ${item.value}`);
            });
            sections.push('');
        });
        return sections.join('\n').trim();
    }
    function formatAdditionalData(data) {
        switch (data.site) {
            case 'WITH_IS':
                return data.commonPoints.length > 0
                    ? data.commonPoints.map(point => `- ${point}`).join('\n')
                    : 'なし';
            case 'PAIRS':
                return data.myTags.length > 0
                    ? data.myTags.map(tag => `- ${tag}`).join('\n')
                    : 'なし';
            case 'MARRISH':
                return data.groups.length > 0
                    ? data.groups.map(group => `- ${group.title} (${group.member})`).join('\n')
                    : 'なし';
            default:
                return 'なし';
        }
    }
    function buildPrompt(template, data, basicInfoText, additionalText) {
        const introductionField = data.site === 'MARRISH' ? 'selfPr' : 'introduction';
        return `${template.header}

${template.nickname}：${data.nickname}
${template.age}：${data.age}
${template.location}：${data.location}

${template.introduction}：
${data[introductionField]}

${template.additional}：
${additionalText}

${template.basicInfo}：
${basicInfoText}

${template.footer}`;
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
