/*
    textarea.jTDuYk     : 제목
    div.CodeMirror-code : 게시글
    pre.CodeMirror-line : 라인 하나
    button.jYsOEX       : 출간하기 버튼
*/
const SELECTOR = {
    title           : 'textarea.jTDuYk',
    codeMirrorCode  : 'div.CodeMirror-code',
    codeMirrorLine  : 'pre.CodeMirror-line',
    button          : 'button.jYsOEX',
};

// 최하위 텍스트 노드 추출
const extractText = (element) => {
    let text = '';

    const traverse = (node) => {
        switch (node?.nodeType) {
            case Node.TEXT_NODE:
                text += node?.nodeValue;
                break;
            case Node.ELEMENT_NODE:
                node?.childNodes.forEach(traverse);
                break;
        }
    }
    traverse(element);

    return text;
};

// 게시글 본문 => 마크다운
const convertCodeToMarkdown = () => {
    const title = document.querySelector(SELECTOR.title).value;
    if (!title) return { result: 'fail' };
    
    let markdownContent = '';
    const codeMirrorCode = document.querySelector(SELECTOR.codeMirrorCode);
    const codeMirrorLines = codeMirrorCode.querySelector(SELECTOR.codeMirrorLine);

    codeMirrorLines?.forEach(codeMirrorLine => {
        markdownContent += extractText(codeMirrorLine) + '\n';
    });

    return { 
        result: 'success',
        title: title,
        content: markdownContent,
    };
};

const pushToGitHub = () => {
    const data = convertCodeToMarkdown();

    if (data.result === 'fail') {
        console.log('Error!');
        return;
    }

    if (data.content) {
        data.content = btoa(encodeURIComponent(data.content))
    }

    chrome.storage.sync.get(['repoUrl', 'githubToken'], ({ repoUrl, githubToken }) => {
        if (repoUrl && githubToken) {
            const [owner, repo] = repoUrl.split('/').slice(-2);

            const body = {
                message: `Add post: ${data.title}`,
                content: data.content,
            };

            fetch(`https://api.github.com/repos/${owner}/${repo}/${data.title}.md`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `token ${githubToken}`
                },
                body: JSON.stringify(body)
            })
                .then(response => response.json())
                .then(resJson => {
                    if (resJson.content) {
                        alert('push succeeded');
                    } else {
                        alert('push failed');
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    alert('push failed');
                });
        } else {
            alert('GitHub Repository is not registered.');
        }
    });
};

window.addEventListener('load', () => {
    const button = document.querySelector(SELECTOR.button);
    if (button?.constructor.name !== 'HTMLButtonElement' || button?.innerHTML !== '출간하기') return;
    button.addEventListener('click', pushToGitHub);
});