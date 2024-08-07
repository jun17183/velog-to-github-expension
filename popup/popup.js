document.addEventListener('DOMContentLoaded', () => {
  const container = document.querySelector('#container');

  const showLoadingUI = () => {
    container.innerHTML = `
			<div id="loadingBox">
				Loading...
			</div>
		`;
  };

  const showLoginUI = () => {
    container.innerHTML = `
			<div id="loginBox">
				<img class="github_icon" src="/images/github_icon.png" />
				<button id="login">Login with Github</button>
			</div>
		`;
  };

  const showRepositoryURLUI = () => {
    container.innerHTML = `
			<div id="repositoryBox">
				<p>Please enter your GitHub repository URL:</p>
				<input type="text" id="repo-url" placeholder="https://github.com/user/repo">
				<button id="save-repo-url">Save</button>
			</div>
		`;
  };

  const showRunningUI = () => {
    container.innerHTML = `
			<div id="runningBox">
				Running...
			</div>
		`;
  };

  const showErrorUI = (errorMessage) => {
    container.innerHTML = `
			<div id="errorBox">
				Error: ${errorMessage}
			</div>
		`;
  };

  chrome.runtime.sendMessage({ type: 'check_status' }, (response) => {
    if (response.status === 'login') {
      showLoginUI();
      document.getElementById('login').addEventListener('click', () => {
        chrome.runtime.sendMessage({ type: 'login' });
      });
    } else if (response.status === 'repo_url') {
      showRepositoryURLUI();
      document.querySelector('#save-repo-url').addEventListener('click', () => {
        const url = document.querySelector('#repo-url').value;
        chrome.runtime.sendMessage({ type: 'save_repo_url', url });
      });
    } else if (response.status === 'running') {
      showRunningUI();
    } else if (response.status === 'error') {
      showErrorUI(response.message);
    }
  });
});
