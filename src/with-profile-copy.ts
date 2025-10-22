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
// @require      https://unpkg.com/typescript@latest/lib/typescript.js
// ==/UserScript==

(function() {
    'use strict';

    // 类型定义
    type WithIsUserData = {
        nickname: string;
        age: string;
        location: string;
        introduction: string;
        commonPoints: string[];
        basicInfo: Record<string, string>;
        site: 'WITH_IS';
    };

    type PairsUserData = {
        nickname: string;
        age: string;
        location: string;
        introduction: string;
        myTags: string[];
        basicInfo: Record<string, string>;
        site: 'PAIRS';
    };

    type MarrishUserData = {
        nickname: string;
        age: string;
        location: string;
        groups: Array<{ title: string; member: string }>;
        selfPr: string;
        basicInfo: Record<string, { value: string; group: string }>;
        site: 'MARRISH';
    };

    type UserData = WithIsUserData | PairsUserData | MarrishUserData;

    // 配置常量
    const CONFIG = {
        MESSAGE_DISPLAY_TIME: 3000, // 消息显示时间（毫秒）
        PAIRS_MODAL_TIMEOUT: 10000  // pairs.lv模态框等待超时时间（毫秒）
    };

    // 模板常量
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

    // CSS 选择器常量 - 便于未来扩展和维护
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
            // 昵称 - 使用XPath精确层级定位
            NICKNAME: '#dialog-root > div > div > div > div:nth-child(2) > div > div > div:nth-child(3) > div:nth-child(1) > div > div:nth-child(1) > div:nth-child(3) > p',
            // 年龄和居住地 - 使用XPath精确层级定位
            AGE_LOCATION: '#dialog-root > div > div > div > div:nth-child(2) > div > div > div:nth-child(3) > div:nth-child(1) > div > div:nth-child(1) > div:nth-child(4) > span',
            // 我的标签 - 使用新的XPath路径
            MY_TAGS: '#dialog-root > div > div > div > div:nth-child(2) > div > div > div:nth-child(3) > div:nth-child(2) > div:nth-child(1) > div > ul > li > a',
            // 自我介绍 - 使用新的XPath路径
            INTRODUCTION: '#dialog-root > div > div > div > div:nth-child(2) > div > div > div:nth-child(3) > div:nth-child(2) > div:nth-child(2) > div > p',
            // 个人资料详细信息容器
            PROFILE_CONTAINER: '#dialog-root > div > div > div > div:nth-child(2) > div > div > div:nth-child(3) > div:nth-child(2) > div:nth-child(3) > div',
            // 按钮插入位置（昵称元素本身）
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
            // 聊天页面选择器
            MESSAGE_BUBBLE: '.yi-message-form-text-body-bg1, .yi-message-form-text-body-bg1-me',
            MESSAGE_CONTENT: 'p',
            SPEAKER_NAME: '.yi-message-form-phone_head_name_textover'
        }
    };

    // ページの読み込み完了を待機
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    function init() {
        // サイトを判定して適切なボタン追加関数を呼び出す
        if (window.location.href.includes('with.is/users/')) {
            addCopyButton('WITH_IS');
        } else if (window.location.href.includes('pairs.lv/message/detail/')) {
            // pairs.lv: 使用MutationObserver监听模态框加载
            waitForPairsModal();
        } else if (window.location.href.includes('marrish.com/profile/detail/partner/')) {
            // marrish.com: 使用MutationObserver监听基本信息区域加载
            waitForMarrishBaseInfo();
        } else if (window.location.href.includes('marrish.com/message/index/')) {
            // marrish.com聊天页面: 使用MutationObserver监听消息加载
            waitForMarrishMessages();
        } else {
            return;
        }
    }

    function waitForPairsModal() {
        console.log('等待pairs.lv模态框加载...');

        // 先尝试立即添加按钮（如果模态框已经加载）
        if (tryAddPairsButton()) {
            return;
        }

        // 使用MutationObserver监听DOM变化
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

        // 监听body的子元素变化
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        // 设置超时，如果指定时间内模态框仍未加载，则停止监听
        setTimeout(() => {
            observer.disconnect();
            console.log('pairs.lv模态框加载超时');
        }, CONFIG.PAIRS_MODAL_TIMEOUT);
    }

    function tryAddPairsButton(): boolean {
        const buttonContainer = document.querySelector(CSS_SELECTORS.PAIRS.BUTTON_INSERT);
        if (buttonContainer) {
            addCopyButton('PAIRS');
            return true;
        }
        return false;
    }

    function waitForMarrishBaseInfo() {
        console.log('等待marrish.com基本信息区域加载...');

        // 先尝试立即添加按钮（如果基本信息区域已经加载）
        if (tryAddMarrishButton()) {
            return;
        }

        // 使用MutationObserver监听DOM变化
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

        // 监听body的子元素变化
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        // 设置超时，如果指定时间内基本信息区域仍未加载，则停止监听
        setTimeout(() => {
            observer.disconnect();
            console.log('marrish.com基本信息区域加载超时');
        }, CONFIG.PAIRS_MODAL_TIMEOUT);
    }

    function tryAddMarrishButton(): boolean {
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
            return;
        }

        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'childList') {
                    if (tryAddMessageButtons()) {
                        console.log('marrish.com聊天消息已加载，按钮已添加');
                    }
                }
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        // 持续观察，因为聊天消息可能会动态增加
    }

    function tryAddMessageButtons(): boolean {
        const messageBubbles = document.querySelectorAll(CSS_SELECTORS.MARRISH.MESSAGE_BUBBLE);
        let addedButtons = false;

        messageBubbles.forEach(bubble => {
            // 检查是否已经添加过按钮
            if (!bubble.querySelector('.message-copy-button')) {
                addMessageCopyButton(bubble);
                addedButtons = true;
            }
        });

        return addedButtons;
    }

    function addMessageCopyButton(bubble: Element) {
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

        // 确保气泡有相对定位
        if (getComputedStyle(bubble).position === 'static') {
            (bubble as HTMLElement).style.position = 'relative';
        }

        bubble.appendChild(copyButton);
    }

    function copyMessageContent(bubble: Element) {
        try {
            const messageContent = bubble.querySelector(CSS_SELECTORS.MARRISH.MESSAGE_CONTENT);
            if (messageContent) {
                // 获取HTML内容并清理格式
                const htmlContent = messageContent.innerHTML;
                const textContent = htmlContent
                    .replace(/<br\s*\/?>/gi, '\n')
                    .replace(/<[^>]*>/g, '')
                    .replace(/\n{3,}/g, '\n\n')
                    .trim();

                // 获取发言人名称
                const speakerNameElement = document.querySelector(CSS_SELECTORS.MARRISH.SPEAKER_NAME);
                let speakerName = '見つかりません';
                if (speakerNameElement) {
                    speakerName = speakerNameElement.textContent?.trim() || '見つかりません';
                }

                // 判断发言人是自己还是对方
                const isMyMessage = bubble.classList.contains('yi-message-form-text-body-bg1-me');
                const speakerPrefix = isMyMessage ? '俺' : speakerName;

                // 格式化复制内容
                const formattedContent = `${speakerPrefix}：\n${textContent}`;

                GM_setClipboard(formattedContent, 'text');
                showMessage('✅ メッセージをコピーしました！', 'success');
            } else {
                showMessage('❌ メッセージ内容が見つかりません', 'error');
            }
        } catch (error) {
            console.error('メッセージコピーに失敗しました:', error);
            showMessage('❌ コピーに失敗しました', 'error');
        }
    }

    function addCopyButton(site: 'WITH_IS' | 'PAIRS' | 'MARRISH') {
        let buttonContainer: Element | null = null;
        let buttonText = '📋 ユーザー情報をコピー';

        if (site === 'WITH_IS') {
            // with.is: ユーザー名要素の後ろに追加
            buttonContainer = document.querySelector(CSS_SELECTORS.WITH_IS.NICKNAME);
        } else if (site === 'PAIRS') {
            // pairs.lv: 指定された挿入位置に追加
            buttonContainer = document.querySelector(CSS_SELECTORS.PAIRS.BUTTON_INSERT);
            buttonText = '📋 プロフィールをコピー';
        } else if (site === 'MARRISH') {
            // marrish.com: 居住地要素の後ろに追加
            buttonContainer = document.querySelector(CSS_SELECTORS.MARRISH.AREA);
            buttonText = '📋 プロフィールをコピー';
        }

        if (!buttonContainer) {
            console.log('ボタン追加位置が見つかりません:', site, 'selector:',
                site === 'WITH_IS' ? CSS_SELECTORS.WITH_IS.NICKNAME :
                site === 'PAIRS' ? CSS_SELECTORS.PAIRS.BUTTON_INSERT :
                CSS_SELECTORS.MARRISH.AREA);
            return;
        }

        // 共通のボタン作成関数
        createCopyButton(buttonContainer, buttonText);
    }

    function createCopyButton(container: Element, buttonText: string) {
        // コピーボタンを作成
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

        // ボタンをコンテナの後ろに追加
        container.parentNode?.insertBefore(copyButton, container.nextSibling);
    }

    function handleCopy() {
        try {
            const userData = extractUserData();
            const promptText = generatePrompt(userData);

            // クリップボードにコピー
            GM_setClipboard(promptText, 'text');

            // 成功メッセージを表示
            showMessage('✅ ユーザー情報をクリップボードにコピーしました！', 'success');
        } catch (error) {
            console.error('コピーに失敗しました:', error);
            showMessage('❌ コピーに失敗しました。コンソールを確認してください', 'error');
        }
    }

    function extractUserData(): UserData {
        // 現在のサイトを判定
        let selectors;
        let site: 'WITH_IS' | 'PAIRS' | 'MARRISH' = 'WITH_IS';

        if (window.location.href.includes('with.is/users/')) {
            selectors = CSS_SELECTORS.WITH_IS;
            site = 'WITH_IS';
        } else if (window.location.href.includes('pairs.lv/message/detail/')) {
            selectors = CSS_SELECTORS.PAIRS;
            site = 'PAIRS';
        } else if (window.location.href.includes('marrish.com/profile/detail/partner/')) {
            selectors = CSS_SELECTORS.MARRISH;
            site = 'MARRISH';
        } else {
            throw new Error('サポートされていないサイトです');
        }

        if (site === 'WITH_IS') {
            return extractWithIsData(selectors);
        } else if (site === 'PAIRS') {
            return extractPairsData(selectors);
        } else {
            return extractMarrishData(selectors);
        }
    }

    function extractWithIsData(selectors: any): UserData {
        // ユーザー名
        const nickname = document.querySelector(selectors.NICKNAME)?.textContent?.trim() || '見つかりません';

        // 年齢と居住地（同じ要素から分離）
        const ageAddressElement = document.querySelector(selectors.AGE_ADDRESS);
        let age = '見つかりません';
        let location = '見つかりません';

        if (ageAddressElement) {
            const text = ageAddressElement.textContent?.trim() || '';
            // 年齢と居住地を分離（形式が "年齢\n居住地" と仮定）
            const parts = text.split('\n').filter((part: string) => part.trim());
            if (parts.length >= 1) age = parts[0].trim();
            if (parts.length >= 2) location = parts[1].trim();
        }

        // 自己紹介（重複するタイトルを削除）
        let introduction = document.querySelector(selectors.INTRODUCTION)?.textContent?.trim() || '見つかりません';
        // 自己紹介に"自己紹介文"が含まれている場合は削除
        if (introduction.startsWith('自己紹介文')) {
            introduction = introduction.replace(/^自己紹介文\s*/, '');
        }

        // 共通点
        const commonPoints: string[] = [];
        const commonPointElements = document.querySelectorAll(selectors.COMMON_POINTS);
        commonPointElements.forEach(el => {
            const text = el.textContent?.trim();
            if (text) commonPoints.push(text);
        });

        // 基本情報
        const basicInfo: Record<string, string> = {};
        const basicInfoTable = document.querySelector(selectors.BASIC_INFO_TABLE);
        if (basicInfoTable) {
            const rows = basicInfoTable.querySelectorAll(selectors.BASIC_INFO_ROW);
            rows.forEach((row: Element) => {
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
            site: 'WITH_IS' as const
        };
    }

    function extractPairsData(selectors: any): UserData {
        // ユーザー名
        const nickname = document.querySelector(selectors.NICKNAME)?.textContent?.trim() || '見つかりません';

        // 年齢と居住地
        const ageLocationElement = document.querySelector(selectors.AGE_LOCATION);
        let age = '見つかりません';
        let location = '見つかりません';

        if (ageLocationElement) {
            const text = ageLocationElement.textContent?.trim() || '';
            // 年齢と居住地を分離（形式が "28歳 京都" と仮定）
            const parts = text.split(' ').filter((part: string) => part.trim());
            if (parts.length >= 1) age = parts[0].trim();
            if (parts.length >= 2) location = parts.slice(1).join(' ').trim();
        }

        // 自己紹介
        const introduction = document.querySelector(selectors.INTRODUCTION)?.textContent?.trim() || '見つかりません';

        // マイタグ
        const myTags: string[] = [];
        const myTagElements = document.querySelectorAll(selectors.MY_TAGS);
        myTagElements.forEach(el => {
            const title = el.getAttribute('title');
            if (title) {
                myTags.push(title);
            }
        });

        // 基本情報（プロフィール詳細から抽出）
        const basicInfo: Record<string, string> = {};

        // 使用正确的profile容器选择器
        const profileContainer = document.querySelector(CSS_SELECTORS.PAIRS.PROFILE_CONTAINER);

        if (profileContainer) {
            console.log('找到プロフィール容器');

            // 寻找所有h3标题
            const allH3Elements = profileContainer.querySelectorAll('h3');
            console.log('找到的h3元素数量:', allH3Elements.length);

            // 寻找所有dl元素
            const allDlElements = profileContainer.querySelectorAll('dl');
            console.log('找到的dl元素数量:', allDlElements.length);

            // 直接提取所有dt/dd对
            allDlElements.forEach((dl: Element) => {
                const dtElements = dl.querySelectorAll('dt');
                const ddElements = dl.querySelectorAll('dd');

                dtElements.forEach((dt: Element, index: number) => {
                    const key = dt.textContent?.trim();
                    const value = ddElements[index]?.textContent?.trim();
                    if (key && value) {
                        basicInfo[key] = value;
                    }
                });
            });

            console.log('提取的基本信息数量:', Object.keys(basicInfo).length);
            console.log('提取的键:', Object.keys(basicInfo));
        } else {
            console.log('未找到プロフィール容器');
        }

        return {
            nickname,
            age,
            location,
            introduction,
            myTags,
            basicInfo,
            site: 'PAIRS' as const
        };
    }

    function extractMarrishData(selectors: any): UserData {
        // 基本信息提取
        const name = document.querySelector(selectors.NAME)?.textContent?.trim() || '見つかりません';
        const age = document.querySelector(selectors.AGE)?.textContent?.trim() || '見つかりません';
        const location = document.querySelector(selectors.AREA)?.textContent?.trim() || '見つかりません';

        // 参加グループ提取
        const groups: Array<{ title: string; member: string }> = [];
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

        // 自己PR提取 - 保持HTML中的换行格式，合并多个连续空行
        const selfPrElement = document.querySelector(selectors.SELF_PR);
        let selfPr = '見つかりません';
        if (selfPrElement) {
            // 获取innerHTML并清理多余的HTML标签，保留换行
            const htmlContent = selfPrElement.innerHTML;
            selfPr = htmlContent
                .replace(/<br\s*\/?>/gi, '\n') // 将<br>标签转换为换行
                .replace(/<[^>]*>/g, '') // 移除其他HTML标签
                .replace(/\n{3,}/g, '\n\n') // 将3个或更多连续换行合并为2个
                .trim();
        }

        // 詳細プロフィール提取
        const basicInfo: Record<string, { value: string; group: string }> = {};
        const detailGroups = document.querySelectorAll(selectors.DETAIL_GROUP);
        detailGroups.forEach(group => {
            const subTitle = group.querySelector(selectors.DETAIL_SUB_TITLE)?.textContent?.trim();
            const detailItems = group.querySelectorAll(selectors.DETAIL_ITEM);

            detailItems.forEach((item: Element) => {
                const title = item.querySelector(selectors.DETAIL_ITEM_TITLE)?.textContent?.trim();
                const dateElement = item.querySelector(selectors.DETAIL_ITEM_DATE);
                if (title && dateElement) {
                    // 特别处理活动エリア，转换为逗号分隔格式
                    let date = title === '活動エリア' ?
                        dateElement.innerHTML
                            .replace(/<br\s*\/?>/gi, ',')
                            .replace(/<[^>]*>/g, '')
                            .trim()
                            .replace(/,\s*,/g, ',')
                            .replace(/,$/, '') :
                        dateElement.textContent?.trim();

                    if (title && date) {
                        // 存储原始数据用于分组显示
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
            site: 'MARRISH' as const
        };
    }

    function generatePrompt(data: UserData): string {
        const template = TEMPLATES[data.site];
        if (!template) {
            throw new Error(`未知的网站类型: ${data.site}`);
        }

        const basicInfoText = formatBasicInfo(data.basicInfo);
        const additionalText = formatAdditionalData(data);

        return buildPrompt(template, data, basicInfoText, additionalText);
    }

    function formatBasicInfo(basicInfo: any): string {
        if (Object.entries(basicInfo).length === 0) {
            return 'なし';
        }

        // 按分组组织数据
        const groupedData: Record<string, Array<{ key: string; value: string }>> = {};
        Object.entries(basicInfo).forEach(([key, data]: [string, any]) => {
            const group = data.group;
            if (!groupedData[group]) {
                groupedData[group] = [];
            }
            groupedData[group].push({ key, value: data.value });
        });

        // 构建分组显示格式
        const sections: string[] = [];
        Object.entries(groupedData).forEach(([group, items]) => {
            sections.push(group);
            items.forEach(item => {
                sections.push(`  ${item.key}: ${item.value}`);
            });
            sections.push(''); // 空行分隔
        });

        return sections.join('\n').trim();
    }

    function formatAdditionalData(data: UserData): string {
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

    function buildPrompt(template: any, data: UserData, basicInfoText: string, additionalText: string): string {
        const introductionField = data.site === 'MARRISH' ? 'selfPr' : 'introduction';

        return `${template.header}

${template.nickname}：${data.nickname}
${template.age}：${data.age}
${template.location}：${data.location}

${template.introduction}：
${(data as any)[introductionField]}

${template.additional}：
${additionalText}

${template.basicInfo}：
${basicInfoText}

${template.footer}`;
    }

    function showMessage(message: string, type: 'success' | 'error') {
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

        // 指定時間後に自動的に削除
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.parentNode.removeChild(messageDiv);
            }
        }, CONFIG.MESSAGE_DISPLAY_TIME);
    }
})();