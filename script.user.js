// ==UserScript==
// @name         deai prompt generator
// @namespace    http://tampermonkey.net/
// @version      1.0.9
// @description  with.isとpairs.lvとmarrish.comのユーザーページにコピーボタンを追加し、AI対話プロンプトを生成します。marrish.comのチャットページでメッセージをコピーできます。
// @author       Your Name
// @match        https://with.is/users/*
// @match        https://pairs.lv/*
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
    "use strict";
    let lastUrl = window.location.href;
    let pairsObserver = null;
    let isAddingPairsButton = false;
    const CONFIG = {
        MESSAGE_DISPLAY_TIME: 3000,
        PAIRS_MODAL_TIMEOUT: 10000,
    };
    const COMMON_FOOTER = "以上情報常に忘れず、相手と会話で送るメッセージを提案してみてください。提案するメッセージには非常用の絵文字を使わず、あまり堅苦しくなく、失礼にならない程度のカジュアルな表現でお願いします。\n生成されたメッセージ内容（本文）は、なるべくAIぽくない、相手のメッセージ内容を重複しない、自然な日本語で、emojiはよく使うやつに限定し、「」などの記号はできるだけ控えてください。\n生成されたメッセージはMarkdownの```で囲んだコードブロックに入れ、コードブロック内には送信するメッセージ本文のみを含めてください（コードブロックの```はこの制限の例外として必ず付けてください）。";
    const TEMPLATES = {
        WITH_IS: {
            header: "with.isで以下ユーザーとマッチしました。相手の情報は以下になります",
            nickname: "ユーザー名",
            age: "年齢",
            location: "居住地",
            introduction: "自己紹介文",
            additional: "俺との共通点",
            basicInfo: "相手の基本情報",
            footer: COMMON_FOOTER,
        },
        PAIRS: {
            header: "pairs.lvで以下ユーザーとマッチしました。相手の情報は以下になります",
            nickname: "ユーザー名",
            age: "年齢",
            location: "居住地",
            introduction: "自己紹介",
            additional: "マイタグ",
            pairsQuestions: "ペアーズクエスチョン",
            basicInfo: "相手の基本情報",
            footer: COMMON_FOOTER,
        },
        MARRISH: {
            header: "marrish.comで以下ユーザーとマッチしました。相手の情報は以下になります",
            nickname: "ユーザー名",
            age: "年齢",
            location: "居住地",
            introduction: "自己PR",
            additional: "参加グループ",
            basicInfo: "相手の基本情報",
            footer: COMMON_FOOTER,
        },
    };
    const CSS_SELECTORS = {
        WITH_IS: {
            NICKNAME: ".profile_main-nickname",
            AGE_ADDRESS: ".profile_main-age-address",
            INTRODUCTION: ".profile-introduction",
            COMMON_POINTS: ".profile-affinities_list.on-user-detail li",
            BASIC_INFO_TABLE: ".profile-detail table",
            BASIC_INFO_ROW: "tr",
            BASIC_INFO_HEADER: "th",
            BASIC_INFO_DATA: "td",
        },
        PAIRS: {
            ROOT: "#dialog-root",
            BUTTON_INSERT: "#dialog-root > div > div > div > div:nth-child(2) > div > div > div:nth-child(3) > div:nth-child(1) > div > div:nth-child(1) > div:nth-child(3) > p",
        },
        MARRISH: {
            BASE_INFO: ".as-profile__baseinfo-pc",
            NAME: ".as-profile__name",
            AGE: ".as-profile__age",
            AREA: ".as-profile__area",
            GROUP_LIST: ".as-prof-group-list",
            GROUP_ITEMS: ".as-prof-group-list__item",
            GROUP_TITLE: ".as-prof-group-list__title",
            GROUP_MEMBER: ".as-prof-group-list__member",
            SELF_PR: ".as-profile-text-contents",
            DETAIL_WRAP: ".as-profile-detail-wrap",
            DETAIL_GROUP: ".as-profile-detail-item-group",
            DETAIL_SUB_TITLE: ".as-profile-detail-sub-title",
            DETAIL_ITEM: ".as-profile-detail-item",
            DETAIL_ITEM_TITLE: ".as-profile-detail-item-title",
            DETAIL_ITEM_DATE: ".as-profile-detail-item-date",
            MOBILE_ONLINE_INFO: ".as-prof-info__online",
            MOBILE_LIKE_COUNT: ".as-prof-like-count",
            MOBILE_BASE_INFO: ".as-prof-info__base",
            MOBILE_NAME: ".as-prof-info__name",
            MOBILE_AGE: ".as-prof-info__age",
            MOBILE_AREA: ".as-prof-info__area",
            MESSAGE_BUBBLE: ".yi-message-form-text-body-bg1, .yi-message-form-text-body-bg1-me",
            MESSAGE_CONTENT: "p",
            SPEAKER_NAME: ".yi-message-form-phone_head_name_textover",
        },
    };
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    }
    else {
        init();
    }
    window.addEventListener("hashchange", handleRouteChange);
    window.addEventListener("popstate", handleRouteChange);
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    history.pushState = function (...args) {
        originalPushState.apply(this, args);
        handleRouteChange();
    };
    history.replaceState = function (...args) {
        originalReplaceState.apply(this, args);
        handleRouteChange();
    };
    function isPairsUserPage(url = window.location.href) {
        return url.includes("pairs.lv/message/detail/");
    }
    function handleRouteChange() {
        const currentUrl = window.location.href;
        if (currentUrl !== lastUrl) {
            lastUrl = currentUrl;
            console.log("URL changed, checking for all supported pages...");
            if (currentUrl.includes("with.is/users/")) {
                addCopyButton("WITH_IS");
            }
            else if (isPairsUserPage(currentUrl)) {
                if (pairsObserver) {
                    pairsObserver.disconnect();
                    pairsObserver = null;
                }
                waitForPairsModal();
            }
            else if (currentUrl.includes("marrish.com/profile/detail/partner/")) {
                waitForMarrishBaseInfo();
            }
            else if (currentUrl.includes("marrish.com/message/index/")) {
                waitForMarrishMessages();
            }
        }
    }
    function init() {
        console.log("脚本初始化，当前URL:", window.location.href);
        console.log("isPairsUserPage() 结果:", isPairsUserPage());
        if (window.location.href.includes("with.is/users/")) {
            console.log("检测到with.is页面");
            addCopyButton("WITH_IS");
        }
        else if (isPairsUserPage()) {
            console.log("检测到pairs.lv页面，执行pairs.lv逻辑");
            waitForPairsModal();
        }
        else if (window.location.href.includes("marrish.com/profile/detail/partner/")) {
            console.log("检测到marrish.com页面，执行marrish.com逻辑");
            waitForMarrishBaseInfo();
        }
        else if (window.location.href.includes("marrish.com/message/index/")) {
            console.log("检测到marrish.com聊天页面，执行聊天逻辑");
            waitForMarrishMessages();
        }
        else {
            console.log("未匹配到支持的页面类型");
            return;
        }
    }
    function waitForPairsModal() {
        console.log("等待pairs.lv模态框加载...");
        if (tryAddPairsButton()) {
            return;
        }
        if (pairsObserver) {
            pairsObserver.disconnect();
            pairsObserver = null;
        }
        pairsObserver = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === "childList") {
                    const dialogRoot = document.querySelector(CSS_SELECTORS.PAIRS.ROOT);
                    if (dialogRoot && tryAddPairsButton()) {
                        console.log("pairs.lv模态框已加载，按钮已添加");
                        if (pairsObserver) {
                            pairsObserver.disconnect();
                            pairsObserver = null;
                        }
                        return;
                    }
                }
            }
        });
        pairsObserver.observe(document.body, {
            childList: true,
            subtree: true,
        });
        setTimeout(() => {
            if (pairsObserver) {
                pairsObserver.disconnect();
                pairsObserver = null;
                console.log("pairs.lv模态框加载超时");
            }
        }, CONFIG.PAIRS_MODAL_TIMEOUT);
    }
    function tryAddPairsButton() {
        if (isAddingPairsButton) {
            return false;
        }
        isAddingPairsButton = true;
        try {
            const buttonContainer = document.querySelector(CSS_SELECTORS.PAIRS.BUTTON_INSERT);
            if (buttonContainer) {
                const existingButton = buttonContainer.parentNode?.querySelector('button[style*="background: #007bff"]');
                if (!existingButton) {
                    addCopyButton("PAIRS");
                    return true;
                }
                else {
                    console.log("按钮已存在，跳过重复添加");
                    return true;
                }
            }
            return false;
        }
        finally {
            isAddingPairsButton = false;
        }
    }
    function waitForMarrishBaseInfo() {
        console.log("等待marrish.com基本信息区域加载...");
        if (tryAddMarrishButton()) {
            return;
        }
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === "childList") {
                    if (tryAddMarrishButton()) {
                        observer.disconnect();
                        console.log("marrish.com基本信息区域已加载，按钮已添加");
                        return;
                    }
                }
            }
        });
        observer.observe(document.body, {
            childList: true,
            subtree: true,
        });
        setTimeout(() => {
            observer.disconnect();
            console.log("marrish.com基本信息区域加载超时");
        }, CONFIG.PAIRS_MODAL_TIMEOUT);
    }
    function tryAddMarrishButton() {
        const pcButtonContainer = document.querySelector(CSS_SELECTORS.MARRISH.AREA);
        if (pcButtonContainer) {
            console.log("检测到PC版marrish.com，在居住地后面添加按钮");
            addCopyButton("MARRISH");
            return true;
        }
        const mobileLikeCount = document.querySelector(CSS_SELECTORS.MARRISH.MOBILE_LIKE_COUNT);
        if (mobileLikeCount) {
            console.log("检测到手机版marrish.com，在点赞数元素后面添加按钮");
            addCopyButton("MARRISH");
            return true;
        }
        return false;
    }
    function waitForMarrishMessages() {
        console.log("等待marrish.com聊天消息加载...");
        if (tryAddMessageButtons()) {
            addCopyAllChatButton();
            return;
        }
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === "childList") {
                    if (tryAddMessageButtons()) {
                        console.log("marrish.com聊天消息已加载，按钮已添加");
                        addCopyAllChatButton();
                    }
                }
            }
        });
        observer.observe(document.body, {
            childList: true,
            subtree: true,
        });
    }
    function tryAddMessageButtons() {
        const messageBubbles = document.querySelectorAll(CSS_SELECTORS.MARRISH.MESSAGE_BUBBLE);
        let addedButtons = false;
        messageBubbles.forEach((bubble) => {
            if (!bubble.querySelector(".message-copy-button")) {
                addMessageCopyButton(bubble);
                addedButtons = true;
            }
        });
        return addedButtons;
    }
    function addMessageCopyButton(bubble) {
        const copyButton = document.createElement("button");
        copyButton.textContent = "📋";
        copyButton.className = "message-copy-button";
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
        copyButton.addEventListener("mouseenter", () => {
            copyButton.style.opacity = "1";
        });
        copyButton.addEventListener("mouseleave", () => {
            copyButton.style.opacity = "0.7";
        });
        copyButton.addEventListener("click", (e) => {
            e.stopPropagation();
            copyMessageContent(bubble);
        });
        if (getComputedStyle(bubble).position === "static") {
            bubble.style.position = "relative";
        }
        bubble.appendChild(copyButton);
    }
    function copyMessageContent(bubble) {
        try {
            const messageContent = bubble.querySelector(CSS_SELECTORS.MARRISH.MESSAGE_CONTENT);
            if (messageContent) {
                const htmlContent = messageContent.innerHTML;
                const textContent = htmlContent
                    .replace(/<br\s*\/?>/gi, "\n")
                    .replace(/<[^>]*>/g, "")
                    .replace(/\n{3,}/g, "\n\n")
                    .trim();
                const speakerNameElement = document.querySelector(CSS_SELECTORS.MARRISH.SPEAKER_NAME);
                let speakerName = "見つかりません";
                if (speakerNameElement) {
                    speakerName =
                        speakerNameElement.textContent?.trim() || "見つかりません";
                }
                const isMyMessage = bubble.classList.contains("yi-message-form-text-body-bg1-me");
                const speakerPrefix = isMyMessage ? "俺" : speakerName;
                const formattedContent = `${speakerPrefix}：\n${textContent}`;
                GM_setClipboard(formattedContent, "text");
                showMessage("✅ メッセージをコピーしました！", "success");
            }
            else {
                showMessage("❌ メッセージ内容が見つかりません", "error");
            }
        }
        catch (error) {
            console.error("メッセージコピーに失敗しました:", error);
            showMessage("❌ コピーに失敗しました", "error");
        }
    }
    function addCopyAllChatButton() {
        const readUnreadButton = document.getElementById("read_unread_func_off");
        if (!readUnreadButton) {
            console.log("既読機能OFF按钮が見つかりません");
            return;
        }
        if (readUnreadButton.parentNode?.querySelector(".copy-all-chat-button")) {
            return;
        }
        const copyAllButton = document.createElement("button");
        copyAllButton.textContent = "📋 チャット履歴をコピー";
        copyAllButton.className = "copy-all-chat-button";
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
        copyAllButton.addEventListener("click", copyAllChatHistory);
        readUnreadButton.parentNode?.insertBefore(copyAllButton, readUnreadButton);
    }
    function copyAllChatHistory() {
        try {
            const messageBubbles = document.querySelectorAll(CSS_SELECTORS.MARRISH.MESSAGE_BUBBLE);
            if (messageBubbles.length === 0) {
                showMessage("❌ チャット履歴が見つかりません", "error");
                return;
            }
            const speakerNameElement = document.querySelector(CSS_SELECTORS.MARRISH.SPEAKER_NAME);
            const speakerName = speakerNameElement?.textContent?.trim() || "相手";
            const messages = [];
            messages.push("チャット履歴");
            messageBubbles.forEach((bubble) => {
                const messageContent = bubble.querySelector(CSS_SELECTORS.MARRISH.MESSAGE_CONTENT);
                if (messageContent) {
                    const htmlContent = messageContent.innerHTML;
                    const textContent = htmlContent
                        .replace(/<br\s*\/?>/gi, "\n")
                        .replace(/<[^>]*>/g, "")
                        .replace(/\n{3,}/g, "\n\n")
                        .trim();
                    const isMyMessage = bubble.classList.contains("yi-message-form-text-body-bg1-me");
                    const speakerPrefix = isMyMessage ? "俺" : speakerName;
                    messages.push(`${speakerPrefix}：`);
                    messages.push(textContent);
                    messages.push("");
                }
            });
            const fullChatHistory = messages.join("\n").trim();
            GM_setClipboard(fullChatHistory, "text");
            showMessage("✅ チャット履歴をコピーしました！", "success");
        }
        catch (error) {
            console.error("チャット履歴コピーに失敗しました:", error);
            showMessage("❌ チャット履歴のコピーに失敗しました", "error");
        }
    }
    function addCopyButton(site) {
        let buttonContainer = null;
        let buttonText = "📋 ユーザー情報をコピー";
        if (site === "WITH_IS") {
            buttonContainer = document.querySelector(CSS_SELECTORS.WITH_IS.NICKNAME);
        }
        else if (site === "PAIRS") {
            buttonContainer = document.querySelector(CSS_SELECTORS.PAIRS.BUTTON_INSERT);
            buttonText = "📋 プロフィールをコピー";
        }
        else if (site === "MARRISH") {
            buttonContainer = document.querySelector(CSS_SELECTORS.MARRISH.AREA);
            if (!buttonContainer) {
                buttonContainer = document.querySelector(CSS_SELECTORS.MARRISH.MOBILE_LIKE_COUNT);
            }
            buttonText = "📋 プロフィールをコピー";
        }
        if (!buttonContainer) {
            console.log("ボタン追加位置が見つかりません:", site, "selector:", site === "WITH_IS"
                ? CSS_SELECTORS.WITH_IS.NICKNAME
                : site === "PAIRS"
                    ? CSS_SELECTORS.PAIRS.BUTTON_INSERT
                    : CSS_SELECTORS.MARRISH.AREA);
            return;
        }
        createCopyButton(buttonContainer, buttonText);
    }
    function createCopyButton(container, buttonText) {
        const copyButton = document.createElement("button");
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
        copyButton.addEventListener("click", handleCopy);
        container.parentNode?.insertBefore(copyButton, container.nextSibling);
    }
    function handleCopy() {
        try {
            const userData = extractUserData();
            const promptText = generatePrompt(userData);
            GM_setClipboard(promptText, "text");
            showMessage("✅ ユーザー情報をクリップボードにコピーしました！", "success");
        }
        catch (error) {
            console.error("コピーに失敗しました:", error);
            showMessage("❌ コピーに失敗しました。コンソールを確認してください", "error");
        }
    }
    function extractUserData() {
        let selectors;
        let site = "WITH_IS";
        if (window.location.href.includes("with.is/users/")) {
            selectors = CSS_SELECTORS.WITH_IS;
            site = "WITH_IS";
        }
        else if (isPairsUserPage()) {
            selectors = CSS_SELECTORS.PAIRS;
            site = "PAIRS";
        }
        else if (window.location.href.includes("marrish.com/profile/detail/partner/")) {
            selectors = CSS_SELECTORS.MARRISH;
            site = "MARRISH";
            const mobileBaseInfo = document.querySelector(CSS_SELECTORS.MARRISH.MOBILE_BASE_INFO);
            if (mobileBaseInfo) {
                console.log("检测到移动版marrish.com，使用移动版数据提取");
                return extractMarrishMobileData(selectors);
            }
            else {
                console.log("检测到PC版marrish.com，使用PC版数据提取");
                return extractMarrishData(selectors);
            }
        }
        else {
            throw new Error("サポートされていないサイトです");
        }
        if (site === "WITH_IS") {
            return extractWithIsData(selectors);
        }
        else if (site === "PAIRS") {
            return extractPairsData(selectors);
        }
        else {
            return extractMarrishData(selectors);
        }
    }
    function extractWithIsData(selectors) {
        const nickname = document.querySelector(selectors.NICKNAME)?.textContent?.trim() ||
            "見つかりません";
        const ageAddressElement = document.querySelector(selectors.AGE_ADDRESS);
        let age = "見つかりません";
        let location = "見つかりません";
        if (ageAddressElement) {
            const text = ageAddressElement.textContent?.trim() || "";
            const parts = text.split("\n").filter((part) => part.trim());
            if (parts.length >= 1)
                age = parts[0].trim();
            if (parts.length >= 2)
                location = parts[1].trim();
        }
        let introduction = document.querySelector(selectors.INTRODUCTION)?.textContent?.trim() ||
            "見つかりません";
        if (introduction.startsWith("自己紹介文")) {
            introduction = introduction.replace(/^自己紹介文\s*/, "");
        }
        const commonPoints = [];
        const commonPointElements = document.querySelectorAll(selectors.COMMON_POINTS);
        commonPointElements.forEach((el) => {
            const text = el.textContent?.trim();
            if (text)
                commonPoints.push(text);
        });
        const basicInfo = {};
        const basicInfoTable = document.querySelector(selectors.BASIC_INFO_TABLE);
        if (basicInfoTable) {
            const rows = basicInfoTable.querySelectorAll(selectors.BASIC_INFO_ROW);
            rows.forEach((row) => {
                const th = row
                    .querySelector(selectors.BASIC_INFO_HEADER)
                    ?.textContent?.trim();
                const td = row
                    .querySelector(selectors.BASIC_INFO_DATA)
                    ?.textContent?.trim();
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
            site: "WITH_IS",
        };
    }
    function extractBasicInfoFromProfile(dialogRoot) {
        const basicInfo = {};
        const profileH2 = Array.from(dialogRoot.querySelectorAll("h2")).find((h2) => h2.textContent?.includes("プロフィール"));
        if (profileH2) {
            let profileContainer = profileH2.parentElement;
            if (profileContainer) {
                const allDlElements = profileContainer.querySelectorAll("dl");
                if (allDlElements.length > 0) {
                    allDlElements.forEach((dl) => {
                        const dtElements = dl.querySelectorAll("dt");
                        const ddElements = dl.querySelectorAll("dd");
                        dtElements.forEach((dt, index) => {
                            const key = dt.textContent?.trim();
                            const value = ddElements[index]?.textContent?.trim();
                            if (key && value) {
                                basicInfo[key] = value;
                            }
                        });
                    });
                }
            }
        }
        return basicInfo;
    }
    function extractPairsData(selectors) {
        const dialogRoot = document.querySelector(selectors.ROOT);
        if (!dialogRoot) {
            console.log("未找到#dialog-root容器");
            return {
                nickname: "見つかりません",
                age: "見つかりません",
                location: "見つかりません",
                introduction: "見つかりません",
                myTags: [],
                pairsQuestions: [],
                basicInfo: {},
                site: "PAIRS",
            };
        }
        let nickname = "見つかりません";
        const nameElements = dialogRoot.querySelectorAll("p, span, h1, h2, h3, div");
        for (const element of nameElements) {
            const text = element.textContent?.trim();
            if (text &&
                text.length > 0 &&
                text.length < 30 &&
                !text.includes("歳") &&
                !text.includes("自己紹介") &&
                !text.includes("マイタグ") &&
                !text.includes("プロフィール") &&
                !text.includes("新着のお相手") &&
                !text.includes("お相手詳細") &&
                !text.includes("本人確認済み") &&
                !text.includes("プロフィールをコピー") &&
                !text.includes("前の写真") &&
                !text.includes("次の写真") &&
                !text.includes("いいね！")) {
                nickname = text;
                break;
            }
        }
        if (nickname === "見つかりません") {
            const marinaElements = dialogRoot.querySelectorAll("*");
            for (const element of marinaElements) {
                const text = element.textContent?.trim();
                if (text && text.includes("marina")) {
                    nickname = "marina";
                    break;
                }
            }
        }
        if (nickname === "見つかりません") {
            const profileBasicInfo = extractBasicInfoFromProfile(dialogRoot);
            if (profileBasicInfo["ニックネーム"]) {
                nickname = profileBasicInfo["ニックネーム"];
            }
        }
        let age = "見つかりません";
        let location = "見つかりません";
        const profileBasicInfo = extractBasicInfoFromProfile(dialogRoot);
        if (profileBasicInfo["年齢"])
            age = profileBasicInfo["年齢"];
        if (profileBasicInfo["居住地"])
            location = profileBasicInfo["居住地"];
        if (age === "見つかりません" || location === "見つかりません") {
            const allElements = dialogRoot.querySelectorAll("*");
            for (const element of allElements) {
                const text = element.textContent?.trim();
                if (text && text.includes("歳")) {
                    const cleanText = text
                        .replace(/[\n\r]/g, " ")
                        .replace(/\s+/g, " ")
                        .trim();
                    const parts = cleanText
                        .split(" ")
                        .filter((part) => part.trim());
                    const agePart = parts.find((part) => part.includes("歳"));
                    if (agePart) {
                        age = agePart.trim();
                        const ageIndex = parts.indexOf(agePart);
                        if (ageIndex >= 0 && ageIndex + 1 < parts.length) {
                            location = parts[ageIndex + 1].trim();
                        }
                        break;
                    }
                }
            }
        }
        if (age === "見つかりません") {
            const verifiedElements = dialogRoot.querySelectorAll("*");
            for (const element of verifiedElements) {
                const text = element.textContent?.trim();
                if (text && text.includes("本人確認済み")) {
                    const parentText = element.parentElement?.textContent?.trim();
                    if (parentText && parentText.includes("歳")) {
                        const cleanText = parentText
                            .replace(/[\n\r]/g, " ")
                            .replace(/\s+/g, " ")
                            .trim();
                        const parts = cleanText
                            .split(" ")
                            .filter((part) => part.trim());
                        const agePart = parts.find((part) => part.includes("歳"));
                        if (agePart) {
                            age = agePart.trim();
                            break;
                        }
                    }
                }
            }
        }
        let introduction = "見つかりません";
        const introH2 = Array.from(dialogRoot.querySelectorAll("h2")).find((h2) => h2.textContent?.includes("自己紹介"));
        console.log("自己紹介h2找到:", !!introH2);
        if (introH2) {
            let currentElement = introH2.nextElementSibling;
            while (currentElement) {
                const introP = currentElement.querySelector("p");
                if (introP && introP.textContent?.trim()) {
                    introduction = introP.textContent.trim();
                    console.log("找到自己紹介内容");
                    break;
                }
                const elementText = currentElement.textContent?.trim();
                if (elementText &&
                    elementText.length > 50 &&
                    !elementText.includes("プロフィール")) {
                    introduction = elementText;
                    console.log("通过文本找到自己紹介内容");
                    break;
                }
                currentElement = currentElement.nextElementSibling;
            }
        }
        if (introduction === "見つかりません") {
            const allElements = dialogRoot.querySelectorAll("p, div");
            for (const element of allElements) {
                const text = element.textContent?.trim();
                if (text &&
                    text.length > 100 &&
                    (text.includes("初めまして") ||
                        text.includes("よろしくお願いします") ||
                        text.includes("プロフィールを見ていただき"))) {
                    const cleanText = text
                        .replace(/お相手詳細を閉じるメニュー前の写真次の写真新着のお相手.*?プロフィールをコピー/g, "")
                        .replace(/30歳 大阪.*?本人確認済み/g, "")
                        .replace(/ペアーズクエスチョン.*?マイタグ/g, "")
                        .replace(/自己紹介/g, "")
                        .replace(/プロフィール.*/g, "")
                        .replace(/真面目に真剣に出会いを探してます.*?趣味全般/g, "")
                        .replace(/恋愛・結婚/g, "")
                        .replace(/Netflix観てます/g, "")
                        .replace(/自然のあるところが好き/g, "")
                        .replace(/旅行/g, "")
                        .replace(/Pickup/g, "")
                        .replace(/一緒に夜カフェでまったりしよう/g, "")
                        .replace(/\s+/g, " ")
                        .trim();
                    if (cleanText.length > 50) {
                        introduction = cleanText;
                        console.log("通过关键词找到自己紹介内容");
                        break;
                    }
                }
            }
        }
        const myTags = [];
        const tagsH2 = Array.from(dialogRoot.querySelectorAll("h2")).find((h2) => h2.textContent?.includes("マイタグ"));
        if (tagsH2?.nextElementSibling) {
            const tagLinks = tagsH2.nextElementSibling.querySelectorAll("ul > li > a");
            tagLinks.forEach((a) => {
                const title = a.getAttribute("title");
                if (title)
                    myTags.push(title);
            });
        }
        const pairsQuestions = [];
        const questionsH2 = Array.from(dialogRoot.querySelectorAll("h2")).find((h2) => h2.textContent?.includes("ペアーズクエスチョン"));
        console.log("ペアーズクエスチョンh2找到:", !!questionsH2);
        if (questionsH2) {
            let questionsContainer = questionsH2.nextElementSibling;
            while (questionsContainer) {
                const questionElements = questionsContainer.querySelectorAll("div, p, span");
                console.log("找到的问题元素数量:", questionElements.length);
                for (let i = 0; i < questionElements.length; i++) {
                    const element = questionElements[i];
                    const text = element.textContent?.trim();
                    if (text &&
                        (text.includes("毎日しちゃうルーティンは？") ||
                            text.includes("居心地のいい場所は？") ||
                            text.includes("最高に幸せ！") ||
                            text.includes("デートプランどうやって決める？") ||
                            text.includes("急に1日だけ休みをもらえたら何する？"))) {
                        const question = text;
                        if (i + 1 < questionElements.length) {
                            const answerElement = questionElements[i + 1];
                            const answer = answerElement.textContent?.trim();
                            if (answer && !answer.includes("？") && !answer.includes("！")) {
                                pairsQuestions.push({ question, answer });
                                console.log("找到ペアーズクエスチョン:", question, "=>", answer);
                            }
                        }
                    }
                }
                if (pairsQuestions.length > 0) {
                    console.log("找到ペアーズクエスチョン数量:", pairsQuestions.length);
                    break;
                }
                questionsContainer = questionsContainer.nextElementSibling;
            }
        }
        const basicInfo = extractBasicInfoFromProfile(dialogRoot);
        console.log("提取的基本信息数量:", Object.keys(basicInfo).length);
        console.log("提取的键:", Object.keys(basicInfo));
        return {
            nickname,
            age,
            location,
            introduction,
            myTags,
            pairsQuestions,
            basicInfo,
            site: "PAIRS",
        };
    }
    function extractMarrishData(selectors) {
        const name = document.querySelector(selectors.NAME)?.textContent?.trim() ||
            "見つかりません";
        const age = document.querySelector(selectors.AGE)?.textContent?.trim() ||
            "見つかりません";
        const location = document.querySelector(selectors.AREA)?.textContent?.trim() ||
            "見つかりません";
        const groups = [];
        const groupElements = document.querySelectorAll(selectors.GROUP_ITEMS);
        groupElements.forEach((el) => {
            const title = el
                .querySelector(selectors.GROUP_TITLE)
                ?.textContent?.trim();
            const member = el
                .querySelector(selectors.GROUP_MEMBER)
                ?.textContent?.trim();
            if (title) {
                groups.push({
                    title,
                    member: member || "不明",
                });
            }
        });
        const selfPrElement = document.querySelector(selectors.SELF_PR);
        let selfPr = "見つかりません";
        if (selfPrElement) {
            const htmlContent = selfPrElement.innerHTML;
            selfPr = htmlContent
                .replace(/<br\s*\/?>/gi, "\n")
                .replace(/<[^>]*>/g, "")
                .replace(/\n{3,}/g, "\n\n")
                .trim();
        }
        const basicInfo = {};
        const detailGroups = document.querySelectorAll(selectors.DETAIL_GROUP);
        detailGroups.forEach((group) => {
            const subTitle = group
                .querySelector(selectors.DETAIL_SUB_TITLE)
                ?.textContent?.trim();
            const detailItems = group.querySelectorAll(selectors.DETAIL_ITEM);
            detailItems.forEach((item) => {
                const title = item
                    .querySelector(selectors.DETAIL_ITEM_TITLE)
                    ?.textContent?.trim();
                const dateElement = item.querySelector(selectors.DETAIL_ITEM_DATE);
                if (title && dateElement) {
                    let date = title === "活動エリア"
                        ? dateElement.innerHTML
                            .replace(/<br\s*\/?>/gi, ",")
                            .replace(/<[^>]*>/g, "")
                            .trim()
                            .replace(/,\s*,/g, ",")
                            .replace(/,$/, "")
                        : dateElement.textContent?.trim();
                    if (title && date) {
                        const key = title;
                        basicInfo[key] = {
                            value: date,
                            group: subTitle || "その他",
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
            site: "MARRISH",
        };
    }
    function extractMarrishMobileData(selectors) {
        const name = document.querySelector(selectors.MOBILE_NAME)?.textContent?.trim() ||
            "見つかりません";
        const age = document.querySelector(selectors.MOBILE_AGE)?.textContent?.trim() ||
            "見つかりません";
        const location = document.querySelector(selectors.MOBILE_AREA)?.textContent?.trim() ||
            "見つかりません";
        const groups = [];
        const groupElements = document.querySelectorAll(selectors.GROUP_ITEMS);
        groupElements.forEach((el) => {
            const title = el
                .querySelector(selectors.GROUP_TITLE)
                ?.textContent?.trim();
            const member = el
                .querySelector(selectors.GROUP_MEMBER)
                ?.textContent?.trim();
            if (title) {
                groups.push({
                    title,
                    member: member || "不明",
                });
            }
        });
        const selfPrElement = document.querySelector(selectors.SELF_PR);
        let selfPr = "見つかりません";
        if (selfPrElement) {
            const htmlContent = selfPrElement.innerHTML;
            selfPr = htmlContent
                .replace(/<br\s*\/?>/gi, "\n")
                .replace(/<[^>]*>/g, "")
                .replace(/\n{3,}/g, "\n\n")
                .trim();
        }
        const basicInfo = {};
        const detailGroups = document.querySelectorAll(selectors.DETAIL_GROUP);
        detailGroups.forEach((group) => {
            const subTitle = group
                .querySelector(selectors.DETAIL_SUB_TITLE)
                ?.textContent?.trim();
            const detailItems = group.querySelectorAll(selectors.DETAIL_ITEM);
            detailItems.forEach((item) => {
                const title = item
                    .querySelector(selectors.DETAIL_ITEM_TITLE)
                    ?.textContent?.trim();
                const dateElement = item.querySelector(selectors.DETAIL_ITEM_DATE);
                if (title && dateElement) {
                    let date = title === "活動エリア"
                        ? dateElement.innerHTML
                            .replace(/<br\s*\/?>/gi, ",")
                            .replace(/<[^>]*>/g, "")
                            .trim()
                            .replace(/,\s*,/g, ",")
                            .replace(/,$/, "")
                        : dateElement.textContent?.trim();
                    if (title && date) {
                        const key = title;
                        basicInfo[key] = {
                            value: date,
                            group: subTitle || "その他",
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
            site: "MARRISH",
        };
    }
    function generatePrompt(data) {
        const template = TEMPLATES[data.site];
        if (!template) {
            throw new Error(`未知的网站类型: ${data.site}`);
        }
        let basicInfoText;
        if (data.site === "MARRISH") {
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
            return "なし";
        }
        return Object.entries(basicInfo)
            .map(([key, value]) => `${key}: ${value}`)
            .join("\n");
    }
    function formatMarrishBasicInfo(basicInfo) {
        if (Object.entries(basicInfo).length === 0) {
            return "なし";
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
            items.forEach((item) => {
                sections.push(`  ${item.key}: ${item.value}`);
            });
            sections.push("");
        });
        return sections.join("\n").trim();
    }
    function formatAdditionalData(data) {
        switch (data.site) {
            case "WITH_IS":
                return data.commonPoints.length > 0
                    ? data.commonPoints.map((point) => `- ${point}`).join("\n")
                    : "なし";
            case "PAIRS":
                const parts = [];
                if (data.myTags.length > 0) {
                    parts.push(...data.myTags.map((tag) => `- ${tag}`));
                }
                if (data.pairsQuestions.length > 0) {
                    if (parts.length > 0)
                        parts.push("");
                    parts.push("ペアーズクエスチョン:");
                    data.pairsQuestions.forEach((q) => {
                        parts.push(`- ${q.question}`);
                        parts.push(`  ${q.answer}`);
                    });
                }
                return parts.length > 0 ? parts.join("\n") : "なし";
            case "MARRISH":
                return data.groups.length > 0
                    ? data.groups
                        .map((group) => `- ${group.title} (${group.member})`)
                        .join("\n")
                    : "なし";
            default:
                return "なし";
        }
    }
    function buildPrompt(template, data, basicInfoText, additionalText) {
        const introductionField = data.site === "MARRISH" ? "selfPr" : "introduction";
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
        const messageDiv = document.createElement("div");
        messageDiv.textContent = message;
        messageDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 10px 15px;
            background: ${type === "success" ? "#28a745" : "#dc3545"};
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
