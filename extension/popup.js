// ── Config ────────────────────────────────────────────────────────────────────
const API_BASE = 'https://jobzenn.vercel.app';
const COOKIE_DOMAIN = 'jobzenn.vercel.app';

// ── DOM refs ─────────────────────────────────────────────────────────────────
const $ = (sel) => document.querySelector(sel);
const states = {
  auth:    $('#state-auth'),
  ready:   $('#state-ready'),
  loading: $('#state-loading'),
  results: $('#state-results'),
  saving:  $('#state-saving'),
  success: $('#state-success'),
  error:   $('#state-error'),
};

// ── State management ─────────────────────────────────────────────────────────
let currentUrl = '';
let authCookie = '';

function showState(name) {
  Object.values(states).forEach((el) => el.classList.add('hidden'));
  states[name].classList.remove('hidden');
}

// ── Auth: read HTTP-only cookie via chrome.cookies API ────────────────────────
async function getAuthCookie() {
  return new Promise((resolve) => {
    chrome.cookies.get(
      { url: API_BASE, name: 'access_token' },
      (cookie) => resolve(cookie ? cookie.value : null)
    );
  });
}

// ── Init ──────────────────────────────────────────────────────────────────────
async function init() {
  authCookie = await getAuthCookie();
  if (!authCookie) {
    showState('auth');
    return;
  }

  // Get current tab info
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab) {
    currentUrl = tab.url || '';
    const urlEl = $('#page-url');
    try {
      const u = new URL(currentUrl);
      urlEl.textContent = u.hostname + u.pathname;
    } catch {
      urlEl.textContent = currentUrl.slice(0, 40);
    }
    urlEl.title = currentUrl;
  }

  showState('ready');
}

// ── Capture: get HTML from content script → send to backend ──────────────────
async function capture() {
  showState('loading');

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // Inject content script if not already present
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js'],
      });
    } catch (e) {
      // May fail if already injected; that's fine
    }

    // Small delay to allow content script to initialise
    await new Promise((r) => setTimeout(r, 150));

    // Request HTML from content script
    const response = await new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(tab.id, { action: 'getPageHTML' }, (resp) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(resp);
        }
      });
    });

    if (!response || !response.html) {
      throw new Error('Could not read page content. Make sure you are on a job posting page.');
    }

    // Send HTML to backend for AI extraction
    const scrapeResp = await fetch(`${API_BASE}/api/v1/jobs/scrape`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authCookie}`,
      },
      body: JSON.stringify({
        url: response.url || currentUrl,
        html: response.html,
      }),
    });

    if (scrapeResp.status === 401 || scrapeResp.status === 403) {
      authCookie = '';
      showState('auth');
      return;
    }

    if (!scrapeResp.ok) {
      const errBody = await scrapeResp.text();
      throw new Error(`Server error ${scrapeResp.status}: ${errBody}`);
    }

    const data = await scrapeResp.json();
    populateForm(data);
    showState('results');
  } catch (err) {
    console.error('Capture error:', err);
    $('#error-msg').textContent = err.message || 'Unknown error occurred.';
    showState('error');
  }
}

// ── Populate form with extracted data ────────────────────────────────────────
function populateForm(data) {
  $('#f-company').value = data.company_name || '';
  $('#f-title').value = data.job_title || '';
  $('#f-location').value = data.location || '';
  $('#f-salary-min').value = data.salary_min || '';
  $('#f-salary-max').value = data.salary_max || '';
  $('#f-description').value = data.job_description || '';

  // Set selects
  if (data.currency) {
    const currSelect = $('#f-currency');
    const opt = currSelect.querySelector(`option[value="${data.currency}"]`);
    if (opt) currSelect.value = data.currency;
  }

  if (data.work_type) {
    const wt = data.work_type.toLowerCase();
    const wtSelect = $('#f-worktype');
    const opt = wtSelect.querySelector(`option[value="${wt}"]`);
    if (opt) wtSelect.value = wt;
  }
}

// ── Save job to JobZen ───────────────────────────────────────────────────────
async function saveJob() {
  showState('saving');

  try {
    const payload = {
      company_name: $('#f-company').value.trim(),
      job_title: $('#f-title').value.trim(),
      job_url: currentUrl,
      location: $('#f-location').value.trim() || null,
      salary_min: parseInt($('#f-salary-min').value) || null,
      salary_max: parseInt($('#f-salary-max').value) || null,
      currency: $('#f-currency').value,
      work_type: $('#f-worktype').value,
      status: $('#f-status').value,
      job_description: $('#f-description').value.trim() || null,
      date_applied: new Date().toISOString().split('T')[0],
    };

    const resp = await fetch(`${API_BASE}/api/v1/jobs/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authCookie}`,
      },
      body: JSON.stringify(payload),
    });

    if (resp.status === 401 || resp.status === 403) {
      authCookie = '';
      showState('auth');
      return;
    }

    if (!resp.ok) {
      const errBody = await resp.text();
      throw new Error(`Failed to save: ${errBody}`);
    }

    showState('success');
  } catch (err) {
    console.error('Save error:', err);
    $('#error-msg').textContent = err.message || 'Failed to save job.';
    showState('error');
  }
}

// ── Event listeners ──────────────────────────────────────────────────────────
$('#btn-retry-auth').addEventListener('click', init);
$('#btn-capture').addEventListener('click', capture);
$('#btn-recapture').addEventListener('click', capture);
$('#btn-retry').addEventListener('click', () => { showState('ready'); });
$('#btn-another').addEventListener('click', () => { showState('ready'); });

$('#job-form').addEventListener('submit', (e) => {
  e.preventDefault();
  saveJob();
});

// ── Bootstrap ────────────────────────────────────────────────────────────────
init();
