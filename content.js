const SELECTOR = {
  title             : 'textarea.jTDuYk',        // 제목
  codeMirrorCode    : 'div.CodeMirror-code',    // 게시글
  codeMirrorLine    : 'pre.CodeMirror-line',    // 라인 하나
  firstApplyButton  : 'button.jYsOEX ',         // 첫번째 출간하기 버튼
  secondApplyButton : 'button.gepEBt',          // 두번째 출간하기 버튼
  openButton        : 'button.sc-cbTzjv',       // 전체공개/비공개 버튼
  btnSelected       : 'hcqYLK'                  // 버튼 활성화 클래스
};

const TOKEN_KEY = 'github_token';
const REPO_URL_KEY = 'repo_url';

// 최하위 텍스트 노드 추출
const extractText = (element) => {
  let text = '';

  const traverse = (node) => {
    switch (node?.nodeType) {
      case Node.TEXT_NODE:
        text += (node?.nodeValue + '   ');
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
  try {
    const title = document.querySelector(SELECTOR.title).value;
    if (!title) return { result: 'fail' };

    let markdownContent = '';
    const codeMirrorCode = document.querySelector(SELECTOR.codeMirrorCode);
    const codeMirrorLines = codeMirrorCode.querySelectorAll(SELECTOR.codeMirrorLine);

    codeMirrorLines?.forEach(codeMirrorLine => {
      markdownContent += extractText(codeMirrorLine);
    });

    return {
      result: 'success',
      title: title,
      content: markdownContent,
    };
  } catch (error) {
    return {
      result: 'error',
      title: '',
      content: '',
      message: error,
    }
  }
};

const pushToGitHub = () => {
  const data = convertCodeToMarkdown();

  if (data.result === 'fail' || !data.content) {
    console.log('push error');
    return;
  }
  //data.content = btoa(encodeURIComponent(data.content));

  console.log(data.content);

  chrome.runtime.sendMessage({ type: 'push_to_github', data }, (response) => {
    if (response.status === 'error') {
      alert(response.message);
    } else {
      console.log('succeed in push');
    }
  });
};

window.addEventListener('load', () => {
  const firstApplyButton = document.querySelector(SELECTOR.firstApplyButton);
  console.log(firstApplyButton)

  // fixme:
  // 사실 innerHTML의 경우 문구를 변경하여 클릭할 여지가 있기에 좋은 방법이 아니다.
  // 이보단 차라리 깃에 올라온 글을 모두 비교한 뒤 id가 존재하면 수정, 그렇지 않으면 등록으로 하는 편이 좋을 듯 하다.
  if (
    firstApplyButton?.constructor.name !== 'HTMLButtonElement' 
    || firstApplyButton?.innerHTML !== '출간하기'
  ) {
    console.log('no event')
    return;
  } else {
    console.log('event');
    console.log(convertCodeToMarkdown());
  }

  // 첫번째 등록 버튼이 아닌 두번째 등록 버튼을 눌러야만 실제로 글이 작성된다.
  // 하지만 첫번째 등록 버튼을 누르기 전까진 두번째 등록 버튼은 DOM 상에 없는 상황
  // 그래서 첫번째 버튼을 누르면 두번째 버튼 생성을 감지하는 MutationObserver 사용
  firstApplyButton.addEventListener('click', () => {
    const observer = new MutationObserver((mutations) => {
      const box = mutations[0].addedNodes[0];
      const secondApplyButton = box.querySelector(SELECTOR.secondApplyButton);
      const openButton = box.querySelector(SELECTOR.openButton);

      if (!secondApplyButton || secondApplyButton?.constructor.name !== 'HTMLButtonElement') {
        console.log('no button');
        return;
      }

      // 두번째 등록 버튼에 실제 푸시 이벤트 적용
      secondApplyButton.addEventListener('click', () => {
        if (openButton.classList.contains('hcqYLK')) {
          console.log('전체공개')
          pushToGitHub();
        } else {
          console.log('비공개')
        }
      });

      observer.disconnect();
    })

    observer.observe(document.body, { childList: true, subtree: true });
  });
});