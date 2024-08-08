const UI = {
  showLoadingUI: () => {
    document.querySelector('#container').innerHTML = `
			<div id="loadingBox">
				Loading...
			</div>
		`;
  },

  showLoginUI: () => {
    document.querySelector('#container').innerHTML = `
			<div id="loginBox">
				<img class="github_icon" src="/images/github_icon.png" />
				<button id="login">Login with Github</button>
			</div>
		`;
  },

  showRepositoryURLUI: () => {
    document.querySelector('#container').innerHTML = `
			<div id="repositoryBox">
				<p>Please enter your GitHub repository URL:</p>
				<input type="text" id="repo-url" placeholder="https://github.com/user/repo">
				<button id="save-repo-url">Save</button>
			</div>
		`;
  },

  showRunningUI: () => {
    document.querySelector('#container').innerHTML = `
			<div id="runningBox">
				Running...
			</div>
		`;
  },

  showErrorUI: (errorMessage) => {
    document.querySelector('#container').innerHTML = `
			<div id="errorBox">
				Error: ${errorMessage}
			</div>
		`;
  },
};

const handleUI = (status) => {
  const { showLoadingUI, showLoginUI, showRepositoryURLUI, showRunningUI, showErrorUI } = UI;

  switch (status) {
    case 'login':
      showLoginUI();
      document.querySelector('#login').addEventListener('click', login);
      break;

    case 'repo_url':
      showRepositoryURLUI();
      document.querySelector('#save-repo-url').addEventListener('click', saveRepoUrl);
      break;

    case 'running':
      showRunningUI();
      break;

    case 'error':
      showErrorUI();
      break;
  }
};

const checkStatus = () => {
  chrome.runtime.sendMessage({ type: 'check_status' }, (response) => handleUI(response.status));
};

const login = () => {
  chrome.runtime.sendMessage({ type: 'login' }, checkStatus);
};

const saveRepoUrl = () => {
  const url = document.querySelector('#repo-url').value;
  chrome.runtime.sendMessage({ type: 'save_repo_url', url }, checkStatus);
};

document.addEventListener('DOMContentLoaded', () => {
  checkStatus();
});

window.addEventListener('popstate', checkStatus);
window.addEventListener('hashchange', checkStatus);