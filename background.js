chrome.runtime.onInstalled.addListener(() => {
    console.log('Extension installed');
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action !== 'commit') return;

    chrome.storage.sync.get(['githubToken', 'githubRepo', 'commitFolder'], async ({ githubToken, githubRepo, commitFolder }) => {
        const response = await fetch(`${githubRepo}/contents/${commitFolder}/${new Date().toISOString().split('T')[0]}-post.md`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${githubToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: 'New Velog post',
                content: btoa(request.data),
                branch: 'main'
            })
        });
        const result = await response.json();
        sendResponse({ status: result });
    });
});

const commit = (content) => {
    console.log('committing to git...');
}