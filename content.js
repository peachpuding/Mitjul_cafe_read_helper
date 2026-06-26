(() => {
    'use strict';

    const STORAGE_KEY = 'visitedArticles';
    const TARGET_CAFE_ID = '30946980';

    function isTargetCafe() {
        const match =
            location.href.match(/cafes\/(\d+)/);

        return match?.[1] === TARGET_CAFE_ID;
    }

    async function getData() {
        const result =
            await chrome.storage.local.get(STORAGE_KEY);

        return result[STORAGE_KEY] || {};
    }

    async function saveData(data) {
        await chrome.storage.local.set({
            [STORAGE_KEY]: data
        });
    }

    function getArticleId(url) {
        return url.match(/articles\/(\d+)/)?.[1];
    }

    async function saveCurrentArticle() {

        if (!isTargetCafe())
            return;

        const articleId =
            getArticleId(location.href);

        if (!articleId)
            return;

        const data =
            await getData();

        data[articleId] = true;

        await saveData(data);

        console.log(
            '[VisitMarker] 저장:',
            articleId
        );
    }

    async function markArticles() {

        if (!isTargetCafe())
            return;

        const data =
            await getData();

        document
            .querySelectorAll('a.article')
            .forEach(link => {

                const articleId =
                    getArticleId(link.href);

                if (!articleId)
                    return;

                const old =
                    link.querySelector(
                        '.visit-marker'
                    );

                if (old)
                    old.remove();

                if (!data[articleId])
                    return;

                const heart =
                    document.createElement('span');

                heart.className =
                    'visit-marker';

                heart.textContent =
                    '💫[밑줄이 봄]💫 ';

                heart.style.fontWeight =
                    'bold';

                link.prepend(heart);
            });
    }

    let previousUrl =
        location.href;

    setInterval(() => {

        if (
            previousUrl ===
            location.href
        ) {
            return;
        }

        previousUrl =
            location.href;

        saveCurrentArticle();

        setTimeout(() => {
            markArticles();
        }, 1000);

    }, 500);

    const observer =
        new MutationObserver(() => {
            markArticles();
        });

    observer.observe(
        document.body,
        {
            childList: true,
            subtree: true
        }
    );

    saveCurrentArticle();
    markArticles();

})();