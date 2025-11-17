/**
 * チャット画面のメインロジック
 */

import memberstackDOM from '@memberstack/dom';

import {
  initSupabase,
  saveChatHistory,
  getChatHistory,
  checkUsageLimit
} from '../lib/supabase.js';

import {
  getAIResponse,
  validateQuestion
} from './openai.js';

// グローバル変数
let currentUserId = null;
let conversationHistory = [];
const MAX_QUERIES_PER_MONTH = 100;

/**
 * ページ初期化
 */
async function initializePage() {
  try {
    console.log('Initializing chat page...');

    // Memberstack初期化（window.ENVから取得）
    console.log('Using Public Key:', window.ENV.MEMBERSTACK_PUBLIC_KEY);
    const memberstack = memberstackDOM.init({
      publicKey: window.ENV.MEMBERSTACK_PUBLIC_KEY
    });
    console.log('Memberstack initialized');

    // 認証チェック
    const member = await memberstack.getCurrentMember();

    // 未ログインの場合はログイン画面へリダイレクト
    if (!member || !member.data) {
      console.log('Not logged in, redirecting to login page');
      window.location.href = '/index.html';
      return;
    }

    // MemberstackユーザーIDを取得
    currentUserId = member.data.id;
    console.log('Logged in user ID:', currentUserId);

    // ユーザー情報を表示（実際のメールアドレス）
    document.getElementById('userEmail').textContent = member.data.auth.email;

    // Supabase初期化
    initSupabase();

    // 利用回数を取得・表示
    await updateUsageCount();

    // 会話履歴を読み込み
    await loadChatHistory();

    // イベントリスナーを設定
    setupEventListeners();

  } catch (error) {
    console.error('Initialization error:', error);

    // 認証エラーの場合はログイン画面へリダイレクト
    if (error.message && (error.message.includes('auth') || error.message.includes('member'))) {
      window.location.href = '/index.html';
    } else {
      showError('初期化に失敗しました。ページを再読み込みしてください。');
    }
  }
}

/**
 * イベントリスナーの設定
 */
function setupEventListeners() {
  // フォーム送信
  const chatForm = document.getElementById('chatForm');
  chatForm.addEventListener('submit', handleSubmit);

  // 文字数カウント
  const questionInput = document.getElementById('questionInput');
  questionInput.addEventListener('input', updateCharCount);

  // Enterキーで送信（Shift+Enterは改行）
  questionInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      chatForm.dispatchEvent(new Event('submit'));
    }
  });

  // ログアウトボタン
  const logoutButton = document.getElementById('logoutButton');
  logoutButton.addEventListener('click', handleLogout);
}

/**
 * フォーム送信処理
 */
async function handleSubmit(e) {
  e.preventDefault();

  const questionInput = document.getElementById('questionInput');
  const sendButton = document.getElementById('sendButton');
  const question = questionInput.value.trim();

  // バリデーション
  const validation = validateQuestion(question);
  if (!validation.valid) {
    showError(validation.message);
    return;
  }

  try {
    // 利用制限チェック
    const usage = await checkUsageLimit(currentUserId, MAX_QUERIES_PER_MONTH);
    if (!usage.allowed) {
      showError(`月間の利用上限（${MAX_QUERIES_PER_MONTH}回）に達しました。来月までお待ちください。`);
      return;
    }

    // UI更新
    questionInput.value = '';
    updateCharCount();
    sendButton.disabled = true;

    // ユーザーの質問を表示
    addMessageToChat('user', question);

    // ローディング表示
    const loadingId = addLoadingIndicator();

    // AI回答を取得
    const response = await getAIResponse(question, conversationHistory);

    // ローディングを削除
    removeLoadingIndicator(loadingId);

    // AI回答を表示
    addMessageToChat('assistant', response.answer);

    // 会話履歴に追加
    conversationHistory.push({
      question,
      answer: response.answer
    });

    // Supabaseに保存
    await saveChatHistory(currentUserId, question, response.answer, response.sources || []);

    // 利用回数を更新
    await updateUsageCount();

  } catch (error) {
    console.error('Error handling question:', error);
    showError('回答の取得に失敗しました: ' + error.message);
  } finally {
    sendButton.disabled = false;
    questionInput.focus();
  }
}

/**
 * メッセージをチャットに追加
 */
function addMessageToChat(role, content) {
  const messagesContainer = document.getElementById('chatMessages');
  const messageId = 'msg-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);

  const messageDiv = document.createElement('div');
  messageDiv.id = messageId;
  messageDiv.className = `message-bubble flex ${role === 'user' ? 'justify-end' : 'justify-start'}`;

  const bubbleClass = role === 'user'
    ? 'bg-indigo-600 text-white'
    : 'bg-gray-100 text-gray-800';

  const maxWidth = role === 'user' ? 'max-w-md' : 'max-w-2xl';

  messageDiv.innerHTML = `
    <div class="${bubbleClass} ${maxWidth} px-4 py-3 rounded-2xl shadow-sm">
      <div class="text-xs font-semibold mb-1 ${role === 'user' ? 'text-indigo-200' : 'text-gray-600'}">
        ${role === 'user' ? 'あなた' : 'AI アシスタント'}
      </div>
      <div class="prose prose-sm ${role === 'user' ? 'prose-invert' : ''} max-w-none">
        ${formatMessage(content)}
      </div>
    </div>
  `;

  messagesContainer.appendChild(messageDiv);
  scrollToBottom();

  return messageId;
}

/**
 * メッセージ内容を更新（ストリーミング用）
 */
function updateMessageContent(messageId, content) {
  const messageDiv = document.getElementById(messageId);
  if (!messageDiv) return;

  const contentDiv = messageDiv.querySelector('.prose');
  if (contentDiv) {
    contentDiv.innerHTML = formatMessage(content);
    scrollToBottom();
  }
}

/**
 * ローディングインジケーターを追加
 */
function addLoadingIndicator() {
  const messagesContainer = document.getElementById('chatMessages');
  const loadingId = 'loading-' + Date.now();

  const loadingDiv = document.createElement('div');
  loadingDiv.id = loadingId;
  loadingDiv.className = 'message-bubble flex justify-start';

  loadingDiv.innerHTML = `
    <div class="bg-gray-100 px-4 py-3 rounded-2xl shadow-sm">
      <div class="text-xs font-semibold mb-2 text-gray-600">AI アシスタント</div>
      <div class="typing-indicator">
        <span></span>
        <span></span>
        <span></span>
      </div>
    </div>
  `;

  messagesContainer.appendChild(loadingDiv);
  scrollToBottom();

  return loadingId;
}

/**
 * ローディングインジケーターを削除
 */
function removeLoadingIndicator(loadingId) {
  const loadingDiv = document.getElementById(loadingId);
  if (loadingDiv) {
    loadingDiv.remove();
  }
}

/**
 * メッセージをフォーマット（改行、リンクなどを処理）
 */
function formatMessage(text) {
  // 改行を<br>に変換
  let formatted = text.replace(/\n/g, '<br>');

  // URLをリンクに変換
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  formatted = formatted.replace(urlRegex, '<a href="$1" target="_blank" class="underline hover:text-indigo-600">$1</a>');

  return formatted;
}

/**
 * チャット履歴を読み込み
 */
async function loadChatHistory() {
  try {
    const history = await getChatHistory(currentUserId, 10);

    if (history && history.length > 0) {
      // 最新10件を表示（古い順）
      history.reverse().forEach(item => {
        addMessageToChat('user', item.question);
        addMessageToChat('assistant', item.answer);
      });

      conversationHistory = history.map(item => ({
        question: item.question,
        answer: item.answer
      }));
    }
  } catch (error) {
    console.error('Error loading chat history:', error);
  }
}

/**
 * 利用回数を更新・表示
 */
async function updateUsageCount() {
  try {
    const usage = await checkUsageLimit(currentUserId, MAX_QUERIES_PER_MONTH);
    document.getElementById('usageCount').textContent = usage.currentCount;

    // 残り回数が少ない場合は警告色に
    const usageElement = document.getElementById('usageCount');
    if (usage.remaining < 10) {
      usageElement.classList.add('text-red-600');
      usageElement.classList.remove('text-indigo-600');
    }
  } catch (error) {
    console.error('Error updating usage count:', error);
  }
}

/**
 * 文字数カウントを更新
 */
function updateCharCount() {
  const questionInput = document.getElementById('questionInput');
  const charCount = document.getElementById('charCount');
  charCount.textContent = questionInput.value.length;
}

/**
 * スクロールを最下部に移動
 */
function scrollToBottom() {
  const messagesContainer = document.getElementById('chatMessages');
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

/**
 * エラーメッセージを表示
 */
function showError(message) {
  // トースト通知として表示
  const toast = document.createElement('div');
  toast.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-4 rounded-lg shadow-lg z-50 animate-fade-in';
  toast.innerHTML = `
    <div class="flex items-center space-x-3">
      <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
      </svg>
      <span>${message}</span>
    </div>
  `;

  document.body.appendChild(toast);

  // 5秒後に自動削除
  setTimeout(() => {
    toast.remove();
  }, 5000);
}

/**
 * ログアウト処理
 */
async function handleLogout() {
  try {
    // Memberstack認証ログアウト
    const memberstack = memberstackDOM.init({
      publicKey: window.ENV.MEMBERSTACK_PUBLIC_KEY
    });
    await memberstack.logout();

    console.log('Successfully logged out');

    // ログイン画面へリダイレクト
    window.location.href = '/index.html';
  } catch (error) {
    console.error('Logout error:', error);
    showError('ログアウトに失敗しました');
  }
}

// ページロード時に初期化
window.addEventListener('DOMContentLoaded', initializePage);
