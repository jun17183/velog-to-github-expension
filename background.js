const CLIENT_ID = 'Ov23liVjZX04G4iRWxie';
const REDIRECT_URI = chrome.identity.getRedirectURL();
const TOKEN_KEY = 'github_token';
const REPO_URL_KEY = 'repo_url';

const getAuthURL = () => {
  return `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=repo,user`;
};

const fetchAccessToken = (code) => {
  console.log('fetchAccessToken')

  return fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ 
      // 여기에 client id, secret 등등 넣어야 함. 하지만 secret은 노출되면 안되기에 서버에서 관리하는 편이 좋음.
      // 그래서 서버를 결국 만드는 것이 정답인 것 같다.
      // 그전에 지금까지 과정을 블로그에 남기기
      code: code 
    })
  }).then(response => {
    console.log(response);
    return response.json();
  });
};

const checkToken = (token) => {
  return fetch('https://api.github.com/user', {
    headers: {
      Authorization: `token ${token}`
    }
  }).then(response => response.ok);
};

const storeToken = (token) => {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [TOKEN_KEY]: token }, resolve);
  });
};

const getToken = () => {
  return new Promise((resolve) => {
    chrome.storage.local.get(TOKEN_KEY, (result) => resolve(result[TOKEN_KEY]));
  });
};

const storeRepoURL = (url) => {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [REPO_URL_KEY]: url }, resolve);
  });
};

const getRepoURL = () => {
  return new Promise((resolve) => {
    chrome.storage.local.get(REPO_URL_KEY, (result) => resolve(result[REPO_URL_KEY]));
  });
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'check_status') {
    Promise.all([getToken(), getRepoURL()]).then(([token, repoURL]) => {
      if (!token) {
        sendResponse({ status: 'login' });
      } else {
        checkToken(token).then(isValid => {
          if (!isValid) {
            sendResponse({ status: 'login' });
          } else if (!repoURL) {
            sendResponse({ status: 'repo_url' });
          } else {
            sendResponse({ status: 'running' });
          }
        }).catch(error => {
          sendResponse({ status: 'error', message: 'Error checking token' });
        });
      }
    }).catch(error => {
      sendResponse({ status: 'error', message: 'Error retrieving token and repository URL' });
    });
    return true;  // keep the message channel open for async sendResponse
  }

  if (message.type === 'login') {
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

        console.log(code);

        if (code) {
          fetchAccessToken(code).then(data => {
            const token = data.access_token;

            console.log(token)

            if (token) {
              storeToken(token).then(() => {
                getToken().then((token) => console.log(token));

                sendResponse({ status: 'repo_url' });
              });
            } else {
              sendResponse({ status: 'error', message: 'Failed to retrieve access token' });
            }
          }).catch(error => {
            sendResponse({ status: 'error', message: 'Error fetching access token' });
          });
        } else {
          sendResponse({ status: 'error', message: 'Authorization code not found in redirect URL' });
        }
      } else {
        sendResponse({ status: 'error', message: 'No redirect URL found' });
      }
    });
    return true;  // keep the message channel open for async sendResponse
  }

  if (message.type === 'save_repo_url') {
    const url = message.url;
    storeRepoURL(url).then(() => {
      sendResponse({ status: 'running' });
    }).catch(error => {
      sendResponse({ status: 'error', message: 'Error saving repository URL' });
    });
    return true;  // keep the message channel open for async sendResponse
  }
});
