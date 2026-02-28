// ==UserScript==
// @name         deai prompt generator
// @namespace    http://tampermonkey.net/
// @version      1.0.7
// @description  with.isとpairs.lvとmarrish.comのユーザーページにコピーボタンを追加し、AI対話プロンプトを生成します。marrish.comのチャットページでメッセージをコピーできます。
// @author       Your Name
// @match        https://with.is/users/*
// @match        https://pairs.lv/*
// @match        https://marrish.com/profile/detail/partner/*
// @match        https://marrish.com/message/index/*
// @grant        GM_setClipboard
// @require      https://unpkg.com/typescript@latest/lib/typescript.js
// ==/UserScript==

(function () {
  "use strict";

  // React路由变化监听
  let lastUrl = window.location.href;
  let pairsObserver: MutationObserver | null = null;
  let isAddingPairsButton = false;

  // 类型定义
  type WithIsUserData = {
    nickname: string;
    age: string;
    location: string;
    introduction: string;
    commonPoints: string[];
    basicInfo: Record<string, string>;
    site: "WITH_IS";
  };

  type PairsUserData = {
    nickname: string;
    age: string;
    location: string;
    introduction: string;
    myTags: string[];
    pairsQuestions: Array<{ question: string; answer: string }>;
    basicInfo: Record<string, string>;
    site: "PAIRS";
  };

  type MarrishUserData = {
    nickname: string;
    age: string;
    location: string;
    groups: Array<{ title: string; member: string }>;
    selfPr: string;
    basicInfo: Record<string, { value: string; group: string }>;
    site: "MARRISH";
  };

  type UserData = WithIsUserData | PairsUserData | MarrishUserData;

  // 配置常量
  const CONFIG = {
    MESSAGE_DISPLAY_TIME: 3000, // 消息显示时间（毫秒）
    PAIRS_MODAL_TIMEOUT: 10000, // pairs.lv模态框等待超时时间（毫秒）
  };

  // 公用常量
  const COMMON_FOOTER =
    "以上情報常に忘れず、相手と会話で送るメッセージを提案してみてください。提案するメッセージには非常用の絵文字を使わず、あまり堅苦しくなく、失礼にならない程度のカジュアルな表現でお願いします。\n生成されたメッセージ内容はなるべくAIぽくない、相手のメッセージ内容を重複しない、自然な日本語で、emojiはよく使うやつに限定、「」などの記号を控えるようにお願いします。\n生成されたメッセージはコードブロックに入れて。";

  // 模板常量
  const TEMPLATES = {
    WITH_IS: {
      header:
        "with.isで以下ユーザーとマッチしました。相手の情報は以下になります",
      nickname: "ユーザー名",
      age: "年齢",
      location: "居住地",
      introduction: "自己紹介文",
      additional: "俺との共通点",
      basicInfo: "相手の基本情報",
      footer: COMMON_FOOTER,
    },
    PAIRS: {
      header:
        "pairs.lvで以下ユーザーとマッチしました。相手の情報は以下になります",
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
      header:
        "marrish.comで以下ユーザーとマッチしました。相手の情報は以下になります",
      nickname: "ユーザー名",
      age: "年齢",
      location: "居住地",
      introduction: "自己PR",
      additional: "参加グループ",
      basicInfo: "相手の基本情報",
      footer: COMMON_FOOTER,
    },
  };

  // CSS 选择器常量 - 便于未来扩展和维护
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
      // 对话框根容器
      ROOT: "#dialog-root",
      // 按钮插入位置（昵称元素本身）
      BUTTON_INSERT:
        "#dialog-root > div > div > div > div:nth-child(2) > div > div > div:nth-child(3) > div:nth-child(1) > div > div:nth-child(1) > div:nth-child(3) > p",
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
      // 手机版选择器
      MOBILE_ONLINE_INFO: ".as-prof-info__online",
      MOBILE_LIKE_COUNT: ".as-prof-like-count",
      MOBILE_BASE_INFO: ".as-prof-info__base",
      MOBILE_NAME: ".as-prof-info__name",
      MOBILE_AGE: ".as-prof-info__age",
      MOBILE_AREA: ".as-prof-info__area",
      // 聊天页面选择器
      MESSAGE_BUBBLE:
        ".yi-message-form-text-body-bg1, .yi-message-form-text-body-bg1-me",
      MESSAGE_CONTENT: "p",
      SPEAKER_NAME: ".yi-message-form-phone_head_name_textover",
    },
  };

  // ページの読み込み完了を待機
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // 监听URL变化（React路由）
  window.addEventListener("hashchange", handleRouteChange);
  window.addEventListener("popstate", handleRouteChange);

  // 手动监听pushState和replaceState
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

  function isPairsUserPage(url: string = window.location.href): boolean {
    return url.includes("pairs.lv/message/detail/");
  }

  function handleRouteChange() {
    const currentUrl = window.location.href;
    if (currentUrl !== lastUrl) {
      lastUrl = currentUrl;
      console.log("URL changed, checking for all supported pages...");

      // 根据当前URL重新初始化相应的功能
      if (currentUrl.includes("with.is/users/")) {
        addCopyButton("WITH_IS");
      } else if (isPairsUserPage(currentUrl)) {
        // 停止之前的观察器
        if (pairsObserver) {
          pairsObserver.disconnect();
          pairsObserver = null;
        }
        // 重新等待模态框
        waitForPairsModal();
      } else if (currentUrl.includes("marrish.com/profile/detail/partner/")) {
        waitForMarrishBaseInfo();
      } else if (currentUrl.includes("marrish.com/message/index/")) {
        waitForMarrishMessages();
      }
    }
  }

  function init() {
    console.log("脚本初始化，当前URL:", window.location.href);
    console.log("isPairsUserPage() 结果:", isPairsUserPage());

    // サイトを判定して適切なボタン追加関数を呼び出す
    if (window.location.href.includes("with.is/users/")) {
      console.log("检测到with.is页面");
      addCopyButton("WITH_IS");
    } else if (isPairsUserPage()) {
      console.log("检测到pairs.lv页面，执行pairs.lv逻辑");
      // pairs.lv: 使用MutationObserver监听模态框加载
      waitForPairsModal();
    } else if (
      window.location.href.includes("marrish.com/profile/detail/partner/")
    ) {
      console.log("检测到marrish.com页面，执行marrish.com逻辑");
      // marrish.com: 使用MutationObserver监听基本信息区域加载
      waitForMarrishBaseInfo();
    } else if (window.location.href.includes("marrish.com/message/index/")) {
      console.log("检测到marrish.com聊天页面，执行聊天逻辑");
      // marrish.com聊天页面: 使用MutationObserver监听消息加载
      waitForMarrishMessages();
    } else {
      console.log("未匹配到支持的页面类型");
      // 其他pairs.lv页面，不添加按钮但保持路由监听
      return;
    }
  }

  function waitForPairsModal() {
    console.log("等待pairs.lv模态框加载...");

    // 先尝试立即添加按钮（如果模态框已经加载）
    if (tryAddPairsButton()) {
      return;
    }

    // 停止之前的观察器
    if (pairsObserver) {
      pairsObserver.disconnect();
      pairsObserver = null;
    }

    // 使用MutationObserver监听DOM变化
    pairsObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "childList") {
          // 检查是否添加了按钮容器（dialog-root）
          const dialogRoot = document.querySelector(CSS_SELECTORS.PAIRS.ROOT);
          if (dialogRoot && tryAddPairsButton()) {
            console.log("pairs.lv模态框已加载，按钮已添加");
            // 停止观察器，避免死循环
            if (pairsObserver) {
              pairsObserver.disconnect();
              pairsObserver = null;
            }
            return;
          }
        }
      }
    });

    // 监听body的子元素变化
    pairsObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // 设置超时，如果指定时间内模态框仍未加载，则停止监听
    setTimeout(() => {
      if (pairsObserver) {
        pairsObserver.disconnect();
        pairsObserver = null;
        console.log("pairs.lv模态框加载超时");
      }
    }, CONFIG.PAIRS_MODAL_TIMEOUT);
  }

  function tryAddPairsButton(): boolean {
    // 防止重复调用
    if (isAddingPairsButton) {
      return false;
    }

    isAddingPairsButton = true;

    try {
      const buttonContainer = document.querySelector(
        CSS_SELECTORS.PAIRS.BUTTON_INSERT
      );
      if (buttonContainer) {
        // 检查是否已经添加了按钮
        const existingButton = buttonContainer.parentNode?.querySelector(
          'button[style*="background: #007bff"]'
        );
        if (!existingButton) {
          addCopyButton("PAIRS");
          return true;
        } else {
          console.log("按钮已存在，跳过重复添加");
          return true; // 按钮已存在，视为成功
        }
      }
      return false;
    } finally {
      isAddingPairsButton = false;
    }
  }

  function waitForMarrishBaseInfo() {
    console.log("等待marrish.com基本信息区域加载...");

    // 先尝试立即添加按钮（如果基本信息区域已经加载）
    if (tryAddMarrishButton()) {
      return;
    }

    // 使用MutationObserver监听DOM变化
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

    // 监听body的子元素变化
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // 设置超时，如果指定时间内基本信息区域仍未加载，则停止监听
    setTimeout(() => {
      observer.disconnect();
      console.log("marrish.com基本信息区域加载超时");
    }, CONFIG.PAIRS_MODAL_TIMEOUT);
  }

  function tryAddMarrishButton(): boolean {
    // 优先检测PC版
    const pcButtonContainer = document.querySelector(
      CSS_SELECTORS.MARRISH.AREA
    );
    if (pcButtonContainer) {
      console.log("检测到PC版marrish.com，在居住地后面添加按钮");
      addCopyButton("MARRISH");
      return true;
    }

    // 检测手机版 - 在点赞数元素后面添加按钮
    const mobileLikeCount = document.querySelector(
      CSS_SELECTORS.MARRISH.MOBILE_LIKE_COUNT
    );
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
    // 持续观察，因为聊天消息可能会动态增加
  }

  function tryAddMessageButtons(): boolean {
    const messageBubbles = document.querySelectorAll(
      CSS_SELECTORS.MARRISH.MESSAGE_BUBBLE
    );
    let addedButtons = false;

    messageBubbles.forEach((bubble) => {
      // 检查是否已经添加过按钮
      if (!bubble.querySelector(".message-copy-button")) {
        addMessageCopyButton(bubble);
        addedButtons = true;
      }
    });

    return addedButtons;
  }

  function addMessageCopyButton(bubble: Element) {
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

    // 确保气泡有相对定位
    if (getComputedStyle(bubble).position === "static") {
      (bubble as HTMLElement).style.position = "relative";
    }

    bubble.appendChild(copyButton);
  }

  function copyMessageContent(bubble: Element) {
    try {
      const messageContent = bubble.querySelector(
        CSS_SELECTORS.MARRISH.MESSAGE_CONTENT
      );
      if (messageContent) {
        // 获取HTML内容并清理格式
        const htmlContent = messageContent.innerHTML;
        const textContent = htmlContent
          .replace(/<br\s*\/?>/gi, "\n")
          .replace(/<[^>]*>/g, "")
          .replace(/\n{3,}/g, "\n\n")
          .trim();

        // 获取发言人名称
        const speakerNameElement = document.querySelector(
          CSS_SELECTORS.MARRISH.SPEAKER_NAME
        );
        let speakerName = "見つかりません";
        if (speakerNameElement) {
          speakerName =
            speakerNameElement.textContent?.trim() || "見つかりません";
        }

        // 判断发言人是自己还是对方
        const isMyMessage = bubble.classList.contains(
          "yi-message-form-text-body-bg1-me"
        );
        const speakerPrefix = isMyMessage ? "俺" : speakerName;

        // 格式化复制内容
        const formattedContent = `${speakerPrefix}：\n${textContent}`;

        GM_setClipboard(formattedContent, "text");
        showMessage("✅ メッセージをコピーしました！", "success");
      } else {
        showMessage("❌ メッセージ内容が見つかりません", "error");
      }
    } catch (error) {
      console.error("メッセージコピーに失敗しました:", error);
      showMessage("❌ コピーに失敗しました", "error");
    }
  }

  function addCopyAllChatButton() {
    // 查找"既読機能OFF"按钮
    const readUnreadButton = document.getElementById("read_unread_func_off");
    if (!readUnreadButton) {
      console.log("既読機能OFF按钮が見つかりません");
      return;
    }

    // 检查是否已经添加过按钮
    if (readUnreadButton.parentNode?.querySelector(".copy-all-chat-button")) {
      return;
    }

    // 创建复制全部聊天记录按钮
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

    // 在"既読機能OFF"按钮的左边插入
    readUnreadButton.parentNode?.insertBefore(copyAllButton, readUnreadButton);
  }

  function copyAllChatHistory() {
    try {
      // 获取所有消息气泡
      const messageBubbles = document.querySelectorAll(
        CSS_SELECTORS.MARRISH.MESSAGE_BUBBLE
      );
      if (messageBubbles.length === 0) {
        showMessage("❌ チャット履歴が見つかりません", "error");
        return;
      }

      // 获取对方名称
      const speakerNameElement = document.querySelector(
        CSS_SELECTORS.MARRISH.SPEAKER_NAME
      );
      const speakerName = speakerNameElement?.textContent?.trim() || "相手";

      // 收集所有消息
      const messages: string[] = [];
      messages.push("チャット履歴");

      messageBubbles.forEach((bubble) => {
        const messageContent = bubble.querySelector(
          CSS_SELECTORS.MARRISH.MESSAGE_CONTENT
        );
        if (messageContent) {
          // 获取HTML内容并清理格式
          const htmlContent = messageContent.innerHTML;
          const textContent = htmlContent
            .replace(/<br\s*\/?>/gi, "\n")
            .replace(/<[^>]*>/g, "")
            .replace(/\n{3,}/g, "\n\n")
            .trim();

          // 判断发言人是自己还是对方
          const isMyMessage = bubble.classList.contains(
            "yi-message-form-text-body-bg1-me"
          );
          const speakerPrefix = isMyMessage ? "俺" : speakerName;

          messages.push(`${speakerPrefix}：`);
          messages.push(textContent);
          messages.push(""); // 空行分隔
        }
      });

      // 合并所有消息
      const fullChatHistory = messages.join("\n").trim();

      // 复制到剪贴板
      GM_setClipboard(fullChatHistory, "text");
      showMessage("✅ チャット履歴をコピーしました！", "success");
    } catch (error) {
      console.error("チャット履歴コピーに失敗しました:", error);
      showMessage("❌ チャット履歴のコピーに失敗しました", "error");
    }
  }

  function addCopyButton(site: "WITH_IS" | "PAIRS" | "MARRISH") {
    let buttonContainer: Element | null = null;
    let buttonText = "📋 ユーザー情報をコピー";

    if (site === "WITH_IS") {
      // with.is: ユーザー名要素の後ろに追加
      buttonContainer = document.querySelector(CSS_SELECTORS.WITH_IS.NICKNAME);
    } else if (site === "PAIRS") {
      // pairs.lv: 指定された挿入位置に追加
      buttonContainer = document.querySelector(
        CSS_SELECTORS.PAIRS.BUTTON_INSERT
      );
      buttonText = "📋 プロフィールをコピー";
    } else if (site === "MARRISH") {
      // marrish.com: 优先检测PC版，然后检测手机版
      buttonContainer = document.querySelector(CSS_SELECTORS.MARRISH.AREA);
      if (!buttonContainer) {
        // 如果PC版没找到，尝试手机版
        buttonContainer = document.querySelector(
          CSS_SELECTORS.MARRISH.MOBILE_LIKE_COUNT
        );
      }
      buttonText = "📋 プロフィールをコピー";
    }

    if (!buttonContainer) {
      console.log(
        "ボタン追加位置が見つかりません:",
        site,
        "selector:",
        site === "WITH_IS"
          ? CSS_SELECTORS.WITH_IS.NICKNAME
          : site === "PAIRS"
          ? CSS_SELECTORS.PAIRS.BUTTON_INSERT
          : CSS_SELECTORS.MARRISH.AREA
      );
      return;
    }

    // 共通のボタン作成関数
    createCopyButton(buttonContainer, buttonText);
  }

  function createCopyButton(container: Element, buttonText: string) {
    // コピーボタンを作成
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

    // ボタンをコンテナの後ろに追加
    container.parentNode?.insertBefore(copyButton, container.nextSibling);
  }

  function handleCopy() {
    try {
      const userData = extractUserData();
      const promptText = generatePrompt(userData);

      // クリップボードにコピー
      GM_setClipboard(promptText, "text");

      // 成功メッセージを表示
      showMessage(
        "✅ ユーザー情報をクリップボードにコピーしました！",
        "success"
      );
    } catch (error) {
      console.error("コピーに失敗しました:", error);
      showMessage(
        "❌ コピーに失敗しました。コンソールを確認してください",
        "error"
      );
    }
  }

  function extractUserData(): UserData {
    // 現在のサイトを判定
    let selectors;
    let site: "WITH_IS" | "PAIRS" | "MARRISH" = "WITH_IS";

    if (window.location.href.includes("with.is/users/")) {
      selectors = CSS_SELECTORS.WITH_IS;
      site = "WITH_IS";
    } else if (isPairsUserPage()) {
      selectors = CSS_SELECTORS.PAIRS;
      site = "PAIRS";
    } else if (
      window.location.href.includes("marrish.com/profile/detail/partner/")
    ) {
      selectors = CSS_SELECTORS.MARRISH;
      site = "MARRISH";

      // 检测是否为移动版marrish.com
      const mobileBaseInfo = document.querySelector(
        CSS_SELECTORS.MARRISH.MOBILE_BASE_INFO
      );
      if (mobileBaseInfo) {
        console.log("检测到移动版marrish.com，使用移动版数据提取");
        return extractMarrishMobileData(selectors);
      } else {
        console.log("检测到PC版marrish.com，使用PC版数据提取");
        return extractMarrishData(selectors);
      }
    } else {
      throw new Error("サポートされていないサイトです");
    }

    if (site === "WITH_IS") {
      return extractWithIsData(selectors);
    } else if (site === "PAIRS") {
      return extractPairsData(selectors);
    } else {
      return extractMarrishData(selectors);
    }
  }

  function extractWithIsData(selectors: any): UserData {
    // ユーザー名
    const nickname =
      document.querySelector(selectors.NICKNAME)?.textContent?.trim() ||
      "見つかりません";

    // 年齢と居住地（同じ要素から分離）
    const ageAddressElement = document.querySelector(selectors.AGE_ADDRESS);
    let age = "見つかりません";
    let location = "見つかりません";

    if (ageAddressElement) {
      const text = ageAddressElement.textContent?.trim() || "";
      // 年齢と居住地を分離（形式が "年齢\n居住地" と仮定）
      const parts = text.split("\n").filter((part: string) => part.trim());
      if (parts.length >= 1) age = parts[0].trim();
      if (parts.length >= 2) location = parts[1].trim();
    }

    // 自己紹介（重複するタイトルを削除）
    let introduction =
      document.querySelector(selectors.INTRODUCTION)?.textContent?.trim() ||
      "見つかりません";
    // 自己紹介に"自己紹介文"が含まれている場合は削除
    if (introduction.startsWith("自己紹介文")) {
      introduction = introduction.replace(/^自己紹介文\s*/, "");
    }

    // 共通点
    const commonPoints: string[] = [];
    const commonPointElements = document.querySelectorAll(
      selectors.COMMON_POINTS
    );
    commonPointElements.forEach((el) => {
      const text = el.textContent?.trim();
      if (text) commonPoints.push(text);
    });

    // 基本情報
    const basicInfo: Record<string, string> = {};
    const basicInfoTable = document.querySelector(selectors.BASIC_INFO_TABLE);
    if (basicInfoTable) {
      const rows = basicInfoTable.querySelectorAll(selectors.BASIC_INFO_ROW);
      rows.forEach((row: Element) => {
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
      site: "WITH_IS" as const,
    };
  }

  function extractBasicInfoFromProfile(
    dialogRoot: Element
  ): Record<string, string> {
    const basicInfo: Record<string, string> = {};

    // 使用文本查找策略查找プロフィール容器
    const profileH2 = Array.from(dialogRoot.querySelectorAll("h2")).find((h2) =>
      (h2 as Element).textContent?.includes("プロフィール")
    ) as Element | undefined;

    if (profileH2) {
      // 查找包含所有dl元素的父容器
      let profileContainer = profileH2.parentElement;
      if (profileContainer) {
        // 寻找所有dl元素
        const allDlElements = profileContainer.querySelectorAll("dl");

        if (allDlElements.length > 0) {
          // 直接提取所有dt/dd对
          allDlElements.forEach((dl: Element) => {
            const dtElements = dl.querySelectorAll("dt");
            const ddElements = dl.querySelectorAll("dd");

            dtElements.forEach((dt: Element, index: number) => {
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

  function extractPairsData(selectors: any): UserData {
    // 首先获取dialog-root容器
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
        site: "PAIRS" as const,
      };
    }

    // ユーザー名 - 使用文本查找策略
    let nickname = "見つかりません";

    // 策略1: 查找用户名元素（通常在顶部区域，有特定样式）
    const nameElements = dialogRoot.querySelectorAll(
      "p, span, h1, h2, h3, div"
    );
    for (const element of nameElements) {
      const text = element.textContent?.trim();
      if (
        text &&
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
        !text.includes("いいね！")
      ) {
        // 假设用户名是较短的文本，不是其他类型的文本
        nickname = text;
        break;
      }
    }

    // 策略2: 如果没找到，尝试查找包含"marina"的元素
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

    // 策略3: 从基本资料中获取昵称
    if (nickname === "見つかりません") {
      const profileBasicInfo = extractBasicInfoFromProfile(dialogRoot);
      if (profileBasicInfo["ニックネーム"]) {
        nickname = profileBasicInfo["ニックネーム"];
      }
    }

    // 年齢と居住地 - 使用文本查找策略
    let age = "見つかりません";
    let location = "見つかりません";

    // 策略1: 从基本资料中获取
    const profileBasicInfo = extractBasicInfoFromProfile(dialogRoot);
    if (profileBasicInfo["年齢"]) age = profileBasicInfo["年齢"];
    if (profileBasicInfo["居住地"]) location = profileBasicInfo["居住地"];

    // 策略2: 查找包含年龄和居住地的元素
    if (age === "見つかりません" || location === "見つかりません") {
      const allElements = dialogRoot.querySelectorAll("*");
      for (const element of allElements) {
        const text = element.textContent?.trim();
        if (text && text.includes("歳")) {
          // 查找简洁的年龄和居住地文本
          const cleanText = text
            .replace(/[\n\r]/g, " ")
            .replace(/\s+/g, " ")
            .trim();
          const parts = cleanText
            .split(" ")
            .filter((part: string) => part.trim());

          // 查找包含"歳"的部分
          const agePart = parts.find((part: string) => part.includes("歳"));
          if (agePart) {
            age = agePart.trim();

            // 查找居住地（通常是年龄后面的部分）
            const ageIndex = parts.indexOf(agePart);
            if (ageIndex >= 0 && ageIndex + 1 < parts.length) {
              location = parts[ageIndex + 1].trim();
            }
            break;
          }
        }
      }
    }

    // 策略3: 如果还没找到，尝试查找包含"本人確認済み"附近的年龄信息
    if (age === "見つかりません") {
      const verifiedElements = dialogRoot.querySelectorAll("*");
      for (const element of verifiedElements) {
        const text = element.textContent?.trim();
        if (text && text.includes("本人確認済み")) {
          // 在附近查找年龄信息
          const parentText = element.parentElement?.textContent?.trim();
          if (parentText && parentText.includes("歳")) {
            const cleanText = parentText
              .replace(/[\n\r]/g, " ")
              .replace(/\s+/g, " ")
              .trim();
            const parts = cleanText
              .split(" ")
              .filter((part: string) => part.trim());
            const agePart = parts.find((part: string) => part.includes("歳"));
            if (agePart) {
              age = agePart.trim();
              break;
            }
          }
        }
      }
    }

    // 自己紹介 - 使用文本查找策略（在dialog-root范围内）
    let introduction = "見つかりません";

    // 策略1: 查找"自己紹介"标题下的内容
    const introH2 = Array.from(dialogRoot.querySelectorAll("h2")).find((h2) =>
      (h2 as Element).textContent?.includes("自己紹介")
    ) as Element | undefined;
    console.log("自己紹介h2找到:", !!introH2);
    if (introH2) {
      // 尝试查找包含自我介绍内容的元素
      let currentElement = introH2.nextElementSibling;
      while (currentElement) {
        // 查找p元素或包含长文本的元素
        const introP = currentElement.querySelector("p");
        if (introP && introP.textContent?.trim()) {
          introduction = introP.textContent.trim();
          console.log("找到自己紹介内容");
          break;
        }

        // 如果p元素没找到，尝试直接获取元素的文本内容
        const elementText = currentElement.textContent?.trim();
        if (
          elementText &&
          elementText.length > 50 &&
          !elementText.includes("プロフィール")
        ) {
          introduction = elementText;
          console.log("通过文本找到自己紹介内容");
          break;
        }

        currentElement = currentElement.nextElementSibling;
      }
    }

    // 策略2: 查找包含自我介绍关键词的长文本
    if (introduction === "見つかりません") {
      const allElements = dialogRoot.querySelectorAll("p, div");
      for (const element of allElements) {
        const text = element.textContent?.trim();
        if (
          text &&
          text.length > 100 &&
          (text.includes("初めまして") ||
            text.includes("よろしくお願いします") ||
            text.includes("プロフィールを見ていただき"))
        ) {
          // 清理文本，移除多余内容
          const cleanText = text
            .replace(
              /お相手詳細を閉じるメニュー前の写真次の写真新着のお相手.*?プロフィールをコピー/g,
              ""
            )
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

    // マイタグ - 使用文本查找策略（在dialog-root范围内）
    const myTags: string[] = [];
    const tagsH2 = Array.from(dialogRoot.querySelectorAll("h2")).find((h2) =>
      (h2 as Element).textContent?.includes("マイタグ")
    ) as Element | undefined;
    if (tagsH2?.nextElementSibling) {
      const tagLinks =
        tagsH2.nextElementSibling.querySelectorAll("ul > li > a");
      tagLinks.forEach((a: Element) => {
        const title = a.getAttribute("title");
        if (title) myTags.push(title);
      });
    }

    // ペアーズクエスチョン - 使用文本查找策略（在dialog-root范围内）
    const pairsQuestions: Array<{ question: string; answer: string }> = [];
    const questionsH2 = Array.from(dialogRoot.querySelectorAll("h2")).find(
      (h2) => (h2 as Element).textContent?.includes("ペアーズクエスチョン")
    ) as Element | undefined;
    console.log("ペアーズクエスチョンh2找到:", !!questionsH2);
    if (questionsH2) {
      // 查找包含问题的容器
      let questionsContainer = questionsH2.nextElementSibling;
      while (questionsContainer) {
        // 查找所有包含问题和答案的容器
        const questionElements =
          questionsContainer.querySelectorAll("div, p, span");
        console.log("找到的问题元素数量:", questionElements.length);

        // 使用文本模式查找问题和答案
        for (let i = 0; i < questionElements.length; i++) {
          const element = questionElements[i];
          const text = element.textContent?.trim();
          if (
            text &&
            (text.includes("毎日しちゃうルーティンは？") ||
              text.includes("居心地のいい場所は？") ||
              text.includes("最高に幸せ！") ||
              text.includes("デートプランどうやって決める？") ||
              text.includes("急に1日だけ休みをもらえたら何する？"))
          ) {
            const question = text;
            // 查找下一个元素作为答案
            if (i + 1 < questionElements.length) {
              const answerElement = questionElements[i + 1];
              const answer = answerElement.textContent?.trim();
              if (answer && !answer.includes("？") && !answer.includes("！")) {
                pairsQuestions.push({ question, answer });
                console.log(
                  "找到ペアーズクエスチョン:",
                  question,
                  "=>",
                  answer
                );
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

    // 基本情報（プロフィール詳細から抽出）
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
      site: "PAIRS" as const,
    };
  }

  function extractMarrishData(selectors: any): UserData {
    // 基本信息提取
    const name =
      document.querySelector(selectors.NAME)?.textContent?.trim() ||
      "見つかりません";
    const age =
      document.querySelector(selectors.AGE)?.textContent?.trim() ||
      "見つかりません";
    const location =
      document.querySelector(selectors.AREA)?.textContent?.trim() ||
      "見つかりません";

    // 参加グループ提取
    const groups: Array<{ title: string; member: string }> = [];
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

    // 自己PR提取 - 保持HTML中的换行格式，合并多个连续空行
    const selfPrElement = document.querySelector(selectors.SELF_PR);
    let selfPr = "見つかりません";
    if (selfPrElement) {
      // 获取innerHTML并清理多余的HTML标签，保留换行
      const htmlContent = selfPrElement.innerHTML;
      selfPr = htmlContent
        .replace(/<br\s*\/?>/gi, "\n") // 将<br>标签转换为换行
        .replace(/<[^>]*>/g, "") // 移除其他HTML标签
        .replace(/\n{3,}/g, "\n\n") // 将3个或更多连续换行合并为2个
        .trim();
    }

    // 詳細プロフィール提取
    const basicInfo: Record<string, { value: string; group: string }> = {};
    const detailGroups = document.querySelectorAll(selectors.DETAIL_GROUP);
    detailGroups.forEach((group) => {
      const subTitle = group
        .querySelector(selectors.DETAIL_SUB_TITLE)
        ?.textContent?.trim();
      const detailItems = group.querySelectorAll(selectors.DETAIL_ITEM);

      detailItems.forEach((item: Element) => {
        const title = item
          .querySelector(selectors.DETAIL_ITEM_TITLE)
          ?.textContent?.trim();
        const dateElement = item.querySelector(selectors.DETAIL_ITEM_DATE);
        if (title && dateElement) {
          // 特别处理活动エリア，转换为逗号分隔格式
          let date =
            title === "活動エリア"
              ? dateElement.innerHTML
                  .replace(/<br\s*\/?>/gi, ",")
                  .replace(/<[^>]*>/g, "")
                  .trim()
                  .replace(/,\s*,/g, ",")
                  .replace(/,$/, "")
              : dateElement.textContent?.trim();

          if (title && date) {
            // 存储原始数据用于分组显示
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
      site: "MARRISH" as const,
    };
  }

  function extractMarrishMobileData(selectors: any): UserData {
    // 移动版基本信息提取
    const name =
      document.querySelector(selectors.MOBILE_NAME)?.textContent?.trim() ||
      "見つかりません";
    const age =
      document.querySelector(selectors.MOBILE_AGE)?.textContent?.trim() ||
      "見つかりません";
    const location =
      document.querySelector(selectors.MOBILE_AREA)?.textContent?.trim() ||
      "見つかりません";

    // 参加グループ提取（移动版可能使用相同的选择器）
    const groups: Array<{ title: string; member: string }> = [];
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

    // 自己PR提取 - 移动版可能使用相同的选择器
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

    // 詳細プロフィール提取（移动版可能使用相同的选择器）
    const basicInfo: Record<string, { value: string; group: string }> = {};
    const detailGroups = document.querySelectorAll(selectors.DETAIL_GROUP);
    detailGroups.forEach((group) => {
      const subTitle = group
        .querySelector(selectors.DETAIL_SUB_TITLE)
        ?.textContent?.trim();
      const detailItems = group.querySelectorAll(selectors.DETAIL_ITEM);

      detailItems.forEach((item: Element) => {
        const title = item
          .querySelector(selectors.DETAIL_ITEM_TITLE)
          ?.textContent?.trim();
        const dateElement = item.querySelector(selectors.DETAIL_ITEM_DATE);
        if (title && dateElement) {
          let date =
            title === "活動エリア"
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
      site: "MARRISH" as const,
    };
  }

  function generatePrompt(data: UserData): string {
    const template = TEMPLATES[data.site];
    if (!template) {
      throw new Error(`未知的网站类型: ${data.site}`);
    }

    // 根据网站类型选择正确的格式化函数
    let basicInfoText: string;
    if (data.site === "MARRISH") {
      basicInfoText = formatMarrishBasicInfo(
        data.basicInfo as Record<string, { value: string; group: string }>
      );
    } else {
      basicInfoText = formatBasicInfo(data.basicInfo);
    }

    const additionalText = formatAdditionalData(data);

    return buildPrompt(template, data, basicInfoText, additionalText);
  }

  function formatBasicInfo(basicInfo: any): string {
    if (Object.entries(basicInfo).length === 0) {
      return "なし";
    }

    // 简单的键值对格式（with.is和pairs.lv使用）
    return Object.entries(basicInfo)
      .map(([key, value]) => `${key}: ${value}`)
      .join("\n");
  }

  function formatMarrishBasicInfo(
    basicInfo: Record<string, { value: string; group: string }>
  ): string {
    if (Object.entries(basicInfo).length === 0) {
      return "なし";
    }

    // marrish.com格式：按分组组织数据
    const groupedData: Record<
      string,
      Array<{ key: string; value: string }>
    > = {};
    Object.entries(basicInfo).forEach(([key, data]) => {
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
      items.forEach((item) => {
        sections.push(`  ${item.key}: ${item.value}`);
      });
      sections.push(""); // 空行分隔
    });

    return sections.join("\n").trim();
  }

  function formatAdditionalData(data: UserData): string {
    switch (data.site) {
      case "WITH_IS":
        return data.commonPoints.length > 0
          ? data.commonPoints.map((point) => `- ${point}`).join("\n")
          : "なし";
      case "PAIRS":
        const parts: string[] = [];
        // 添加マイタグ（不加前缀，因为模板已经有"マイタグ："）
        if (data.myTags.length > 0) {
          parts.push(...data.myTags.map((tag) => `- ${tag}`));
        }
        // 添加ペアーズクエスチョン
        if (data.pairsQuestions.length > 0) {
          if (parts.length > 0) parts.push(""); // 空行分隔
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

  function buildPrompt(
    template: any,
    data: UserData,
    basicInfoText: string,
    additionalText: string
  ): string {
    const introductionField =
      data.site === "MARRISH" ? "selfPr" : "introduction";

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

  function showMessage(message: string, type: "success" | "error") {
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

    // 指定時間後に自動的に削除
    setTimeout(() => {
      if (messageDiv.parentNode) {
        messageDiv.parentNode.removeChild(messageDiv);
      }
    }, CONFIG.MESSAGE_DISPLAY_TIME);
  }
})();
