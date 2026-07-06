(() => {
    'use strict';

    const STORAGE_KEY = 'visitedArticles';
    const TARGET_CAFE_ID = '30946980'; 
    const MARKER_TEXT = '💫[밑줄이 봄]💫 '; 

    let visitedData = {};
    let lastUrl = location.href; 

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
        console.log(`[밑줄] 새 방문 저장 완료: ${articleId}`);
    }

    // --- [방문 표시] ---

    function markArticles() {
        if (!isTargetCafe()) return;

        const articleLinks = document.querySelectorAll('a.article');
        
        articleLinks.forEach(link => {
            const articleId = getArticleId(link.href);
            if (!articleId || !visitedData[articleId]) return;
            if (link.querySelector('.visit-marker')) return; 

            const marker = document.createElement('span');
            marker.className = 'visit-marker';
            marker.textContent = MARKER_TEXT;
            marker.style.fontWeight = 'bold';
            marker.style.color = '#ff6b6b'; 
            marker.style.marginRight = '3px'; 

            link.prepend(marker);
        });
    }

    // --- [실시간 감시 및 타이밍 보정 (핵심 수정)] ---

    function setupMutationObserver() {
        if (!isTargetCafe()) return;

        const observer = new MutationObserver(async () => {
            
            // [해결 포인트 1] 사용자가 이전/다음글을 보다가 '목록'으로 돌아와 주소가 바뀐 경우
            if (location.href !== lastUrl) {
                console.log(`[밑줄] 주소 변경 감지 (목록 복귀 또는 이동): ${location.href}`);
                lastUrl = location.href;
                
                // 본문 내 이동 중 저장된 최신 데이터를 창고에서 다시 동기화합니다.
                await loadData();
                
                // 만약 돌아온 곳이 또 다른 게시글 본문이라면 저장
                const currentArticleId = getArticleId(location.href);
                if (currentArticleId) {
                    await saveArticle(currentArticleId);
                }
                
                // [해결 포인트 2] 네이버가 목록 HTML을 늦게 뿌리는 것에 대비해 시차(0.1초, 0.3초, 0.6초)를 두고 연속 마킹 호출
                markArticles();
                setTimeout(markArticles, 100);
                setTimeout(markArticles, 300);
                setTimeout(markArticles, 600);
            }
            
            // 일반적인 DOM 변경 시에도 끊임없이 마킹 시도
            markArticles();
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

        // 초기 로드 시에도 네이버의 지연 로딩에 대응하기 위해 쪼개서 실행
        markArticles(); 
        setTimeout(markArticles, 200);
        setTimeout(markArticles, 500);
        
        setupMutationObserver(); 
    }

    // 클릭 백업 리스너
    document.addEventListener('click', async (e) => {
        const link = e.target.closest('a');
        if (!link || !isTargetCafe()) return;

        const articleId = getArticleId(link.href);
        if (articleId) {
            await saveArticle(articleId);
            setTimeout(markArticles, 50); // 클릭 직후 즉시 반영 시도
        }
    }, true);

    initialize();
})();
