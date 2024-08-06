/*
    textarea.byYUYx     : 타이틀
    div.CodeMirror-code : 게시글
    pre.CodeMirror-line : 라인 하나
    button.jYsOEX       : 출간/수정 버튼 (text: 출간하기)
*/

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

const convertCodeMirrorToMd = () => {
    const SELECTOR = {
        title           : 'textarea.byYUYx',
        codeMirrorCode  : 'div.CodeMirror-code',
        codeMirrorLine  : 'pre.CodeMirror-line',
        button          : 'button.jYsOEX',
    }

    // 본문
    const codeMirrorCode = document.querySelector(SELECTOR.codeMirrorCode);

    // 본문 내용 없을 시
    if (!codeMirrorCode) return '';

    let markdownContent = '';
    const codeMirrorLines = codeMirrorCode.querySelectorAll(SELECTOR.codeMirrorLine);

    // codeMirrorLine에서 텍스트 노드 추출
    codeMirrorLines.forEach(codeMirrorLine => {
        markdownContent += extractText(codeMirrorLine) + '\n';
    });

    
};