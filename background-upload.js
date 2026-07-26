const LOCAL_BG_KEY = 'customBgData';
const MAX_FILE_SIZE_MB = 15;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const fileInput = document.getElementById('backgroundFile');
const progress = document.getElementById('progress');
const progressBar = document.getElementById('progressBar');
const status = document.getElementById('status');

function setStatus(message, type = '') {
  status.textContent = message;
  status.className = `status${type ? ` ${type}` : ''}`;
}

function setProgress(percent) {
  progress.hidden = false;
  progressBar.style.width = `${percent}%`;
}

function saveBackground(dataUrl, fileName) {
  setStatus(`Saving ${fileName}`);
  setProgress(78);

  chrome.storage.local.set({ [LOCAL_BG_KEY]: dataUrl }, () => {
    if (chrome.runtime.lastError) {
      setStatus(`Aurora could not save this file. ${chrome.runtime.lastError.message}`, 'error');
      return;
    }

    chrome.storage.sync.set({ customBgUrl: '__local__' }, () => {
      if (chrome.runtime.lastError) {
        setStatus(`Aurora saved the file but could not activate it. ${chrome.runtime.lastError.message}`, 'error');
        return;
      }

      setProgress(100);
      setStatus(`${fileName} is now your Aurora background. You can close this tab.`, 'success');
    });
  });
}

fileInput.addEventListener('change', () => {
  const file = fileInput.files?.[0];
  if (!file) return;

  if (file.size > MAX_FILE_SIZE_BYTES) {
    setStatus(`Choose a file smaller than ${MAX_FILE_SIZE_MB} MB.`, 'error');
    fileInput.value = '';
    return;
  }

  setStatus(`Reading ${file.name}`);
  setProgress(20);

  const reader = new FileReader();
  reader.onprogress = (event) => {
    if (event.lengthComputable) {
      setProgress(Math.max(20, Math.min(70, Math.round((event.loaded / event.total) * 70))));
    }
  };
  reader.onload = () => {
    const dataUrl = reader.result;
    if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) {
      setStatus('Aurora could not read this file.', 'error');
      return;
    }
    saveBackground(dataUrl, file.name);
  };
  reader.onerror = () => {
    setStatus('Aurora could not read this file.', 'error');
  };
  reader.readAsDataURL(file);
});
