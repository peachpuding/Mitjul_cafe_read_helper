(() => {
    'use strict';

    const STORAGE_KEY = 'visitedArticles';
    const TARGET_CAFE_ID = '30946980';

    let visitedData = {};

    function isTargetCafe() {
        return location.href.match(/cafes\/(\d+)/)?.[1] === TARGET_CAFE_ID;
    }

    function getArticleId(url) {
        return url.match(/articles\/(\d+)/)?.[1];
    }

    async function loadData() {
        const result = await chrome.storage.local.get(STORAGE_KEY);
        visitedData = result[STORAGE_KEY] || {};
    }

    async function saveData() {
        await chrome.storage.local.set({
            [STORAGE_KEY]: visitedData
        });
    }

    async function saveArticle(articleId) {

        if (!articleId)
            return;

        if (visitedData[articleId])
            return;

        visitedData[articleId] = true;

        await saveData();

        console.log('[VisitMarker] 저장:', articleId);
    }

    function markArticles() {

        if (!isTargetCafe())
            return;

        document.querySelectorAll('a.article').forEach(link => {

            const articleId = getArticleId(link.href);

            if (!articleId)
                return;

            if (!visitedData[articleId])
                return;

            if (link.querySelector('.visit-marker'))
                return;

            const marker = document.createElement('span');

            marker.className = 'visit-marker';
            marker.textContent = '💫[밑줄이 봄]💫 ';
            marker.style.fontWeight = 'bold';

            link.prepend(marker);
        });
    }

    document.addEventListener('click', async (e) => {

        const link = e.target.closest('a.article');

        if (!link)
            return;

        if (!isTargetCafe())
            return;

        const articleId = getArticleId(link.href);

        await saveArticle(articleId);

    }, true);

    (async () => {
        await loadData();
        markArticles();
    })();

})();
