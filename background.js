const CLIENT_ID = 'Ov23liVjZX04G4iRWxie';
const REDIRECT_URI = chrome.identity.getRedirectURL();
const TOKEN_KEY = 'github_token';
const REPO_URL_KEY = 'repo_url';

const getAuthURL = () => {
  return `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=repo,user`;
};

// #region :  ============================ token =============================

// node.js 서버에 토큰 발급 요청
const fetchAccessToken = (code) => {
  return fetch('http://localhost:3000/oauth/callback', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      code: code
    })
  })
  .then(response => {
    console.log(response);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  })
  .then(data => {
    if (data.error) {
      throw new Error(data.error);
    }
    return data;
  });
};

// 토큰 유효성 확인
const checkToken = (token) => {
  return fetch('https://api.github.com/user', {
    headers: {
      Authorization: `token ${token}`
    }
  }).then(response => response.ok);
};

// storage에 토큰 저장
const storeToken = (token) => {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [TOKEN_KEY]: token }, resolve);
  });
};

// storage에서 토큰 가져오기
const getToken = () => {
  return new Promise((resolve) => {
    chrome.storage.local.get(TOKEN_KEY, (result) => resolve(result[TOKEN_KEY]));
  });
};

// storage에서 토큰 삭제
const deleteToken = () => {
  return new Promise((resolve, reject) => {
    chrome.storage.local.remove(TOKEN_KEY, () => {
      // chrome.runtime.lastError를 사용하여 오류를 확인합니다.
      if (chrome.runtime.lastError) {
        reject(`Error removing token: ${chrome.runtime.lastError.message}`);
      } else {
        resolve('Token deleted successfully');
      }
    });
  });
};

// #endregion : ===============================================================

// #region :  ============================ repoUrl ============================

// storage에 url 저장
const storeRepoURL = (url) => {
  console.log(url)

  // URL 형식 검증
  const pattern = /^https:\/\/github\.com\/([^\/]+)\/([^\/]+)$/;
  if (!pattern.test(url)) {
    console.log('wrong url format')
    return Promise.reject('Invalid URL format');
  }

  // URL에서 소유자와 저장소 이름 추출
  url = url.replace(/\.git$/, '');
  const [owner, repo] = url.replace(/\.git$/, '').split('/').slice(-2);

  console.log(url, owner, repo)

  // GitHub API를 통해 저장소 접근 가능성 및 권한 확인
  return (
    getToken()
    .then(token => {
      console.log(token)
      return fetch(`https://api.github.com/repos/${owner}/${repo}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
    })
    .then(response => {
      if (response.status === 404) {
        throw new Error('Repository not found');
      } else if (response.status === 403) {
        throw new Error('Forbidden: Check your permissions');
      } else if (!response.ok) {
        throw new Error('Failed to access the repository');
      }
      return response.json();
    })
    .then(() => {
      // 저장소 검증 성공 시 로컬 스토리지에 저장
      return new Promise((resolve) => {
        chrome.storage.local.set({ [REPO_URL_KEY]: url }, resolve);
      });
    })
    .catch(error => {
      // 에러 발생 시 에러 메시지 반환
      return Promise.reject(error.message);
    })
  );
};

// storage에서 url 가져오기
const getRepoURL = () => {
  return new Promise((resolve) => {
    chrome.storage.local.get(REPO_URL_KEY, (result) => resolve(result[REPO_URL_KEY]));
  });
};

// storage에서 토큰 삭제
const deleteRepoUrl = () => {
  return new Promise((resolve, reject) => {
    chrome.storage.local.remove(REPO_URL_KEY, () => {
      // chrome.runtime.lastError를 사용하여 오류를 확인합니다.
      if (chrome.runtime.lastError) {
        reject(`Error removing repoUrl: ${chrome.runtime.lastError.message}`);
      } else {
        resolve('RepoUrl deleted successfully');
      }
    });
  });
};

// #endregion : ===============================================================

const checkStatus = (sendResponse) => {
  Promise.all([getToken(), getRepoURL()]).then(([token, repoURL]) => {
    console.log(token, repoURL)

    if (!token) {
      sendResponse({ status: 'login' });
    } else {
      checkToken(token)
      .then(isValid => {
        if (!isValid) {
          sendResponse({ status: 'login' });
          deleteRepoUrl();
        } else if (!repoURL) {
          sendResponse({ status: 'repo_url' });
        } else {
          sendResponse({ status: 'running' });
        }
      }).catch(error => {
        sendResponse({ status: 'error', message: 'Error checking token' });
        deleteRepoUrl();
      });
    }
  }).catch(error => {
    sendResponse({ status: 'error', message: 'Error retrieving token and repository URL' });
    deleteRepoUrl();
  });
};

const login = (sendResponse) => {
  const authURL = getAuthURL();

  chrome.identity.launchWebAuthFlow({
    url: authURL,
    interactive: true,
  }, (redirect_url) => {
    if (chrome.runtime.lastError) {
      sendResponse({ status: 'error', message: chrome.runtime.lastError.message });
    } else if (redirect_url) {
      const url = new URL(redirect_url);
      const code = url.searchParams.get('code');

      if (code) {
        fetchAccessToken(code).then(data => {
          const token = data.access_token;

          if (token) {
            storeToken(token)
            .then(data => {
              console.log(data);
              sendResponse({ status: 'repo_url' });
            })
            .catch(error => {
              sendResponse({ status: 'error', message: error });
            });
          } else {
            sendResponse({ status: 'error', message: 'Failed to retrieve access token' });
            deleteToken();
            deleteRepoUrl();
          }
        })
        .catch(error => {
          // Error fetching access token
          sendResponse({ status: 'error', message: error });
          deleteToken();
            deleteRepoUrl();
        });
      } else {
        sendResponse({ status: 'error', message: 'Authorization code not found in redirect URL' });
        deleteToken();
        deleteRepoUrl();
      }
    } else {
      sendResponse({ status: 'error', message: 'No redirect URL found' });
      deleteToken();
      deleteRepoUrl();
    }
  });
};

const saveRepoUrl = (message, sendResponse) => {
  console.log('saveRepoUrl')
  const url = message?.url;
  storeRepoURL(url)
  .then(data => {
    console.log(data);
    sendResponse({ status: 'running' });
  })
  .catch(error => {
    sendResponse({ status: 'error', message: 'Error saving repository URL' });
  });
}

const pushToGitHub = (data, sendResponse) => {
  console.log(data)

  Promise.all([getRepoURL(), getToken()])
  .then(([repoUrl, token]) => {
    if (!repoUrl || !token) {
      sendResponse({ status: 'error', message: 'GitHub Repository or token is not registered' });
      return;
    }

    console.log(repoUrl, token)

    checkToken(token).then(isValid => {
      if (!isValid) {
        sendResponse({ status: 'error', message: 'Invalid GitHub token' });
        return;
      }

      const body = {
        message: `Add post: ${data.title}`,
        content: btoa(unescape(encodeURIComponent(data.content).replace(/%([0-9A-F]{2})/g, (match, p1) => String.fromCharCode('0x' + p1)))),
      };

      const [owner, repo] = repoUrl.split('/').slice(-2);

      console.log(owner, repo);

      fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${data.title}.md`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `token ${token}`,
        },
        body: JSON.stringify(body),
      })
      .then(response => response.json())
      .then(resJson => {
        console.log(resJson);

        if (resJson.content) {
          sendResponse({ status: 'pushed' });
        } else {
          sendResponse({ status: 'error', message: 'Unknown error occurred while pushing content' });
        }
      })
      .catch(error => {
        console.error('Error:', error);
        sendResponse({ status: 'error', message: error.message });
      });
      
    })
    .catch(error => {
      console.error('Error:', error);
      sendResponse({ status: 'error', message: 'Failed to validate GitHub token' });
      deleteToken();
      deleteRepoUrl();
    });
  })
  .catch(error => {
    console.error('Error:', error);
    sendResponse({ success: false, message: 'Failed to retrieve GitHub Repository or token' });
    deleteToken();
    deleteRepoUrl();
  });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'check_status':
      checkStatus(sendResponse);
      break;

    case 'login':
      login(sendResponse);
      break;

    case 'save_repo_url':
      saveRepoUrl(message, sendResponse);
      break;

    case 'push_to_github':
      pushToGitHub(message.data, sendResponse);
      break;
  }
  return true;  // keep the message channel open for async sendResponse
});
