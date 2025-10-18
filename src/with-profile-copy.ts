// ==UserScript==
// @name         With Profile Copy
// @namespace    http://tampermonkey.net/
// @version      1.0.2
// @description  with.isとpairs.lvのユーザーページにコピーボタンを追加し、AI対話プロンプトを生成します
// @author       Your Name
// @match        https://with.is/users/*
// @match        https://pairs.lv/message/detail/*
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

    type UserData = WithIsUserData | PairsUserData;

    // 配置常量
    const CONFIG = {
        MESSAGE_DISPLAY_TIME: 3000, // 消息显示时间（毫秒）
        PAIRS_MODAL_TIMEOUT: 10000  // pairs.lv模态框等待超时时间（毫秒）
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

    function addCopyButton(site: 'WITH_IS' | 'PAIRS') {
        let buttonContainer: Element | null = null;
        let buttonText = '📋 ユーザー情報をコピー';

        if (site === 'WITH_IS') {
            // with.is: ユーザー名要素の後ろに追加
            buttonContainer = document.querySelector(CSS_SELECTORS.WITH_IS.NICKNAME);
        } else if (site === 'PAIRS') {
            // pairs.lv: 指定された挿入位置に追加
            buttonContainer = document.querySelector(CSS_SELECTORS.PAIRS.BUTTON_INSERT);
            buttonText = '📋 プロフィールをコピー';
        }

        if (!buttonContainer) {
            console.log('ボタン追加位置が見つかりません:', site, 'selector:', site === 'WITH_IS' ? CSS_SELECTORS.WITH_IS.NICKNAME : CSS_SELECTORS.PAIRS.BUTTON_INSERT);
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
        let site: 'WITH_IS' | 'PAIRS' = 'WITH_IS';

        if (window.location.href.includes('with.is/users/')) {
            selectors = CSS_SELECTORS.WITH_IS;
            site = 'WITH_IS';
        } else if (window.location.href.includes('pairs.lv/message/detail/')) {
            selectors = CSS_SELECTORS.PAIRS;
            site = 'PAIRS';
        } else {
            throw new Error('サポートされていないサイトです');
        }

        if (site === 'WITH_IS') {
            return extractWithIsData(selectors);
        } else {
            return extractPairsData(selectors);
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

    function generatePrompt(data: UserData): string {
        const basicInfoText = Object.entries(data.basicInfo).length > 0
            ? Object.entries(data.basicInfo).map(([key, value]) => `${key}: ${value}`).join('\n')
            : 'なし';

        // サイトに応じたテンプレートを選択
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
        } else {
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