// ==UserScript==
// @name         With Profile Copy
// @namespace    http://tampermonkey.net/
// @version      1.0.2
// @description  with.isのユーザーページにコピーボタンを追加し、AI対話プロンプトを生成します
// @author       Your Name
// @match        https://with.is/users/*
// @grant        GM_setClipboard
// @require      https://unpkg.com/typescript@latest/lib/typescript.js
// ==/UserScript==

(function() {
    'use strict';

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
        }
        // 未来可以添加其他网站的CSS选择器，例如：
        // MARRISH: { ... },
        // PAIRS: { ... }
    };

    // ページの読み込み完了を待機
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    function init() {
        // ユーザー詳細ページかどうかを確認
        if (!window.location.href.includes('/users/')) {
            return;
        }

        // コピーボタンを追加
        addCopyButton();
    }

    function addCopyButton() {
        // ユーザー名要素を検索
        const nicknameElement = document.querySelector(CSS_SELECTORS.WITH_IS.NICKNAME);
        if (!nicknameElement) {
            console.log('ユーザー名要素が見つかりません');
            return;
        }

        // コピーボタンを作成
        const copyButton = document.createElement('button');
        copyButton.textContent = '📋 ユーザー情報をコピー';
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

        // ボタンをユーザー名の後ろに追加
        nicknameElement.parentNode?.insertBefore(copyButton, nicknameElement.nextSibling);
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
        const selectors = CSS_SELECTORS.WITH_IS;

        // ユーザー名
        const nickname = document.querySelector(selectors.NICKNAME)?.textContent?.trim() || '見つかりません';

        // 年齢と居住地（同じ要素から分離）
        const ageAddressElement = document.querySelector(selectors.AGE_ADDRESS);
        let age = '見つかりません';
        let location = '見つかりません';

        if (ageAddressElement) {
            const text = ageAddressElement.textContent?.trim() || '';
            // 年齢と居住地を分離（形式が "年齢\n居住地" と仮定）
            const parts = text.split('\n').filter(part => part.trim());
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
            rows.forEach(row => {
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
            basicInfo
        };
    }

    function generatePrompt(data: UserData): string {
        const commonPointsText = data.commonPoints.length > 0
            ? data.commonPoints.map(point => `- ${point}`).join('\n')
            : 'なし';

        const basicInfoText = Object.entries(data.basicInfo).length > 0
            ? Object.entries(data.basicInfo).map(([key, value]) => `${key}: ${value}`).join('\n')
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

        // 3秒後に自動的に削除
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.parentNode.removeChild(messageDiv);
            }
        }, 3000);
    }

    interface UserData {
        nickname: string;
        age: string;
        location: string;
        introduction: string;
        commonPoints: string[];
        basicInfo: Record<string, string>;
    }
})();