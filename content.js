(() => {
    'use strict';

    const STORAGE_KEY = 'visitedArticles';
    const TARGET_CAFE_ID = '30946980'; 
    const MARKER_TEXT = '💫[밑줄이 봄]💫 '; 

    let visitedData = {};
    let lastUrl = location.href; 
    
    let debounceTimer = null;
    let urlCheckTimer = null;

    // --- [유틸리티 함수] ---

    function isTargetCafe() {
        if (location.search.includes(`clubid=${TARGET_CAFE_ID}`)) return true;
        if (location.pathname.startsWith('/f-e')) return true;
        if (location.href.includes(TARGET_CAFE_ID)) return true;
        return false;
    }

    function getArticleId(url) {
        if (!url) return null;
        try {
            const urlObj = new URL(url, location.origin);
            if (urlObj.searchParams.has('articleid')) {
                return urlObj.searchParams.get('articleid');
            }
            const match = urlObj.pathname.match(/\/(\d+)$/);
            if (match) return match[1];
        } catch (error) {
            const fallbackMatch = url.match(/articleid=(\d+)/) || url.match(/\/(\d+)$/);
            return fallbackMatch ? fallbackMatch[1] : null;
        }
        return null;
    }

    /**
     * [핵심 추가] 엘리먼트 내부를 깊숙이 탐색하여 실제 제목 글자가 시작되는 텍스트 노드를 찾습니다.
     */
    function findTitleTextNode(element) {
        for (const node of element.childNodes) {
            // 공백이 아닌 실제 텍스트가 포함된 노드를 찾은 경우
            if (node.nodeType === Node.TEXT_NODE && node.textContent.trim().length > 0) {
                return node;
            }
            // 다른 하위 태그가 있다면 더 깊숙이 탐색 (이미 등록된 마커나 댓글수는 제외)
            if (node.nodeType === Node.ELEMENT_NODE && 
                !node.classList.contains('visit-marker') && 
                !node.classList.contains('cmt') &&
                !node.classList.contains('memo')) {
                const innerNode = findTitleTextNode(node);
                if (innerNode) return innerNode;
            }
        }
        return null;
    }

    // --- [데이터 관리 및 저장] ---

    async function loadData() {
        const result = await chrome.storage.local.get(STORAGE_KEY);
        visitedData = result[STORAGE_KEY] || {};
    }

    async function saveData() {
        await chrome.storage.local.set({ [STORAGE_KEY]: visitedData });
    }

    async function saveArticle(articleId) {
        if (!articleId || visitedData[articleId]) return;
        visitedData[articleId] = true;
        await saveData();
    }

    // --- [방문 표시] ---

    function markArticles() {
        if (!isTargetCafe()) return;

        const container = document.querySelector('.article-board') || document;
        const articleLinks = container.querySelectorAll('a.article');
        
        if (articleLinks.length === 0) return;

        articleLinks.forEach(link => {
            const articleId = getArticleId(link.href);
            if (!articleId || !visitedData[articleId]) return;
            if (link.querySelector('.visit-marker')) return; 

            const marker = document.createElement('span');
            marker.className = 'visit-marker';
            marker.textContent = MARKER_TEXT;
            marker.style.fontWeight = 'bold';
            marker.style.color = '#000000'; 
            marker.style.marginRight = '3px'; 

            // [수정 포인트] 무조건 앞에 넣는 것이 아니라, 실제 글자 노드를 찾아서 그 바로 앞에 삽입합니다.
            const textNode = findTitleTextNode(link);
            if (textNode) {
                textNode.parentNode.insertBefore(marker, textNode);
            } else {
                link.prepend(marker); // 텍스트 노드를 못 찾았을 때를 대비한 안전 장치 백업
            }
        });
    }

    // --- [실시간 감시 메커니즘] ---

    function setupMutationObserver() {
        if (!isTargetCafe()) return;

        const observer = new MutationObserver(() => {
            if (location.href !== lastUrl) {
                lastUrl = location.href;
                
                clearTimeout(urlCheckTimer);
                urlCheckTimer = setTimeout(async () => {
                    await loadData(); 
                    const currentArticleId = getArticleId(location.href);
                    if (currentArticleId) {
                        await saveArticle(currentArticleId);
                    }
                    markArticles();
                }, 50); 
            }

            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(markArticles, 100);
        });

        observer.observe(document.body, { childList: true, subtree: true });
    }

    // --- [초기화] ---

    async function initialize() {
        if (!isTargetCafe()) return;
        
        await loadData(); 

        const currentArticleId = getArticleId(location.href);
        if (currentArticleId) {
            await saveArticle(currentArticleId);
        }

        markArticles(); 
        setupMutationObserver(); 
    }

    document.addEventListener('click', async (e) => {
        const link = e.target.closest('a');
        if (!link || !isTargetCafe()) return;

        const articleId = getArticleId(link.href);
        if (articleId) {
            await saveArticle(articleId);
            setTimeout(markArticles, 30);
        }
    }, true);

    initialize();
})();
