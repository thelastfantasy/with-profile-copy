// ==UserScript==
// @name         With Profile Copy
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  在with.is用户页面添加复制按钮，用于生成AI对话提示
// @author       Your Name
// @match        https://with.is/users/*
// @grant        GM_setClipboard
// @require      https://unpkg.com/typescript@latest/lib/typescript.js
// ==/UserScript==

(function() {
    'use strict';

    // 等待页面加载完成
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    function init() {
        // 检查是否在用户详情页面
        if (!window.location.href.includes('/users/')) {
            return;
        }

        // 添加复制按钮
        addCopyButton();
    }

    function addCopyButton() {
        // 查找用户名称元素
        const nicknameElement = document.querySelector('.profile_main-nickname');
        if (!nicknameElement) {
            console.log('未找到用户名称元素');
            return;
        }

        // 创建复制按钮
        const copyButton = document.createElement('button');
        copyButton.textContent = '📋 复制用户信息';
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

        // 将按钮添加到用户名称后面
        nicknameElement.parentNode?.insertBefore(copyButton, nicknameElement.nextSibling);
    }

    function handleCopy() {
        try {
            const userData = extractUserData();
            const promptText = generatePrompt(userData);

            // 复制到剪贴板
            GM_setClipboard(promptText, 'text');

            // 显示成功消息
            showMessage('✅ 用户信息已复制到剪贴板！', 'success');
        } catch (error) {
            console.error('复制失败:', error);
            showMessage('❌ 复制失败，请检查控制台', 'error');
        }
    }

    function extractUserData(): UserData {
        // 用户名
        const nickname = document.querySelector('.profile_main-nickname')?.textContent?.trim() || '未找到';

        // 年龄和居住地（从同一元素中分离）
        const ageAddressElement = document.querySelector('.profile_main-age-address');
        let age = '未找到';
        let location = '未找到';

        if (ageAddressElement) {
            const text = ageAddressElement.textContent?.trim() || '';
            // 分离年龄和居住地（假设格式为 "年龄\n居住地"）
            const parts = text.split('\n').filter(part => part.trim());
            if (parts.length >= 1) age = parts[0].trim();
            if (parts.length >= 2) location = parts[1].trim();
        }

        // 自我介绍（移除可能存在的重复标题）
        let introduction = document.querySelector('.profile-introduction')?.textContent?.trim() || '未找到';
        // 如果自我介绍包含"自己紹介文"，移除它
        if (introduction.startsWith('自己紹介文')) {
            introduction = introduction.replace(/^自己紹介文\s*/, '');
        }

        // 共同点
        const commonPoints: string[] = [];
        const commonPointElements = document.querySelectorAll('.profile-affinities_list.on-user-detail li');
        commonPointElements.forEach(el => {
            const text = el.textContent?.trim();
            if (text) commonPoints.push(text);
        });

        // 基本信息
        const basicInfo: Record<string, string> = {};
        const basicInfoTable = document.querySelector('.profile-detail table');
        if (basicInfoTable) {
            const rows = basicInfoTable.querySelectorAll('tr');
            rows.forEach(row => {
                const th = row.querySelector('th')?.textContent?.trim();
                const td = row.querySelector('td')?.textContent?.trim();
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

        // 3秒后自动移除
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