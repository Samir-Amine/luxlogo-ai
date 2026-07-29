/* ============================================================
   LuxLogo AI — Frontend Logic
   ------------------------------------------------------------
   Static frontend that talks to Make.com via Webhooks (Fetch API).
   No backend, no framework. Deployable to GitHub Pages.

   SETUP: paste your Make.com webhook URLs into the constants below.
   ============================================================ */

/* ============================================================
   CONFIG — paste your Make.com Webhook URLs here
   ============================================================ */

/** Webhook that receives company info and returns an AI prompt. */
const GENERATE_PROMPT_WEBHOOK = "https://hook.eu1.make.com/9t5mn39mdvd4evqkl4ic237mmrnv8bgh";

/** Webhook that receives an approved prompt and returns logo URLs. */
const GENERATE_LOGO_WEBHOOK = "https://hook.eu1.make.com/mej3b8m128tjki7f7mk453uv4dfpw62k";

/** Optional: webhook for the contact form. Leave empty to use a mailto fallback. */
const CONTACT_WEBHOOK = "";

/** Network timeout for webhook requests, in milliseconds. */
const REQUEST_TIMEOUT_MS = 120000;

/* ============================================================
   DOM REFERENCES
   ============================================================ */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const dom = {
  // Navbar
  navbar: $('#navbar'),
  navToggle: $('#navToggle'),
  navLinks: $('#navLinks'),
  // Generator form
  form: $('#logoForm'),
  companyName: $('#companyName'),
  industry: $('#industry'),
  tagline: $('#tagline'),
  logoStyle: $('#logoStyle'),
  primaryColor: $('#primaryColor'),
  primaryColorText: $('#primaryColorText'),
  secondaryColor: $('#secondaryColor'),
  secondaryColorText: $('#secondaryColorText'),
  iconPreference: $('#iconPreference'),
  instructions: $('#instructions'),
  generatePromptBtn: $('#generatePromptBtn'),
  regeneratePromptBtn: $('#regeneratePromptBtn'),
  generateLogoBtn: $('#generateLogoBtn'),
  // Prompt preview
  promptPreview: $('#promptPreview'),
  promptText: $('#promptText'),
  regeneratePromptBtn2: $('#regeneratePromptBtn2'),
  generateLogoBtn2: $('#generateLogoBtn2'),
  // States
  loadingState: $('#loadingState'),
  loadingTitle: $('#loadingTitle'),
  loadingSub: $('#loadingSub'),
  loadingBarFill: $('#loadingBarFill'),
  errorState: $('#errorState'),
  errorTitle: $('#errorTitle'),
  errorSub: $('#errorSub'),
  errorRetryBtn: $('#errorRetryBtn'),
  // Results
  resultsSection: $('#resultsSection'),
  successBanner: $('#successBanner'),
  gallery: $('#gallery'),
  newBatchBtn: $('#newBatchBtn'),
  // Contact
  contactForm: $('#contactForm'),
  contactStatus: $('#contactStatus'),
  // Misc
  backToTop: $('#backToTop'),
  year: $('#year'),
};

/** Tracks the last action so the error retry button can replay it. */
let lastAction = null;
/** Stores the currently displayed logos so "Generate Similar" can reuse them. */
let currentLogos = [];

/* ============================================================
   INITIALIZATION
   ============================================================ */
function init() {
  dom.year.textContent = new Date().getFullYear();

  initNavbar();
  initSmoothScroll();
  initAccordion();
  initColorSync();
  initFormHandlers();
  initContactForm();
  initBackToTop();
  initScrollSpy();
}

/* ============================================================
   NAVBAR
   ============================================================ */

/** Adds scrolled state + toggles the mobile menu. */
function initNavbar() {
  const onScroll = () => {
    dom.navbar.classList.toggle('scrolled', window.scrollY > 12);
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  dom.navToggle.addEventListener('click', () => {
    const open = dom.navLinks.classList.toggle('open');
    dom.navToggle.classList.toggle('open', open);
    dom.navToggle.setAttribute('aria-expanded', String(open));
  });

  // Close mobile menu when a link is clicked.
  $$('.nav-link', dom.navLinks).forEach((link) => {
    link.addEventListener('click', () => closeMobileMenu());
  });
}

function closeMobileMenu() {
  dom.navLinks.classList.remove('open');
  dom.navToggle.classList.remove('open');
  dom.navToggle.setAttribute('aria-expanded', 'false');
}

/* ============================================================
   SMOOTH SCROLL
   ============================================================ */

/** Smooth-scrolls to anchor targets, accounting for the sticky navbar. */
function initSmoothScroll() {
  $$('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', (e) => {
      const id = anchor.getAttribute('href');
      if (!id || id === '#') return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      const top = target.getBoundingClientRect().top + window.scrollY - (parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-h')) || 72) - 8;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });
}

/* ============================================================
   SCROLL SPY — highlight active nav link
   ============================================================ */
function initScrollSpy() {
  const sections = ['home', 'features', 'how', 'faq', 'contact']
    .map((id) => document.getElementById(id))
    .filter(Boolean);
  const linkFor = (id) => $(`.nav-link[href="#${id}"]`);

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          $$('.nav-link').forEach((l) => l.classList.remove('active'));
          const link = linkFor(entry.target.id);
          if (link) link.classList.add('active');
        }
      });
    },
    { rootMargin: '-45% 0px -50% 0px' }
  );
  sections.forEach((s) => observer.observe(s));
}

/* ============================================================
   ACCORDION (FAQ)
   ============================================================ */
function initAccordion() {
  $$('.accordion-header').forEach((header) => {
    header.addEventListener('click', () => {
      const item = header.parentElement;
      const panel = header.nextElementSibling;
      const isOpen = item.classList.contains('open');

      // Close all others (single-open accordion).
      $$('.accordion-item').forEach((other) => {
        other.classList.remove('open');
        other.querySelector('.accordion-panel').style.maxHeight = null;
        other.querySelector('.accordion-header').setAttribute('aria-expanded', 'false');
      });

      if (!isOpen) {
        item.classList.add('open');
        panel.style.maxHeight = panel.scrollHeight + 'px';
        header.setAttribute('aria-expanded', 'true');
      }
    });
  });
}

/* ============================================================
   COLOR INPUT SYNC
   ============================================================ */

/** Keeps the color picker and its hex text input in sync. */
function initColorSync() {
  syncColor(dom.primaryColor, dom.primaryColorText);
  syncColor(dom.secondaryColor, dom.secondaryColorText);
}

function syncColor(picker, text) {
  picker.addEventListener('input', () => {
    text.value = picker.value;
  });
  text.addEventListener('input', () => {
    const v = text.value.trim();
    if (/^#?[0-9a-fA-F]{6}$/.test(v)) {
      const hex = v.startsWith('#') ? v : '#' + v;
      picker.value = hex;
    }
  });
}

/* ============================================================
   FORM HANDLERS
   ============================================================ */
function initFormHandlers() {
  dom.generatePromptBtn.addEventListener('click', () => {
    if (!validateForm()) return;
    lastAction = 'prompt';
    generatePrompt();
  });

  dom.regeneratePromptBtn.addEventListener('click', () => {
    if (!validateForm()) return;
    lastAction = 'prompt';
    generatePrompt();
  });

  dom.generateLogoBtn.addEventListener('click', () => {
    if (!validateForm()) return;
    if (!dom.promptText.value.trim()) {
      showError('No prompt yet', 'Generate or write a prompt before creating your logo.');
      return;
    }
    lastAction = 'logo';
    generateLogo();
  });

  // Prompt preview buttons
  dom.regeneratePromptBtn2.addEventListener('click', () => {
    if (!validateForm()) return;
    lastAction = 'prompt';
    generatePrompt();
  });

  dom.generateLogoBtn2.addEventListener('click', () => {
    if (!dom.promptText.value.trim()) {
      showError('Empty prompt', 'Please write or generate a prompt first.');
      return;
    }
    lastAction = 'logo';
    generateLogo();
  });

  dom.errorRetryBtn.addEventListener('click', () => {
    if (lastAction === 'prompt') generatePrompt();
    else if (lastAction === 'logo') generateLogo();
    else hideError();
  });

  dom.newBatchBtn.addEventListener('click', () => resetGenerator());
}

/* ============================================================
   FORM VALIDATION
   ============================================================ */

/**
 * Validates required generator fields and shows inline errors.
 * @returns {boolean} true if valid.
 */
function validateForm() {
  let valid = true;
  const required = [
    { el: dom.companyName, name: 'Company Name' },
    { el: dom.industry, name: 'Industry' },
  ];

  // Clear previous errors.
  $$('.field-error', dom.form).forEach((e) => (e.textContent = ''));
  $$('.invalid', dom.form).forEach((el) => el.classList.remove('invalid'));

  required.forEach(({ el, name }) => {
    if (!el.value.trim()) {
      const errEl = dom.form.querySelector(`[data-error-for="${el.id}"]`);
      if (errEl) errEl.textContent = `${name} is required.`;
      el.classList.add('invalid');
      valid = false;
    }
  });

  if (!valid) {
    const firstInvalid = dom.form.querySelector('.invalid');
    if (firstInvalid) firstInvalid.focus();
  }
  return valid;
}

/* ============================================================
   COLLECT FORM DATA
   ============================================================ */

/** Builds the payload object sent to Make.com from the form. */
function collectFormData() {
  return {
    companyName: dom.companyName.value.trim(),
    industry: dom.industry.value.trim(),
    tagline: dom.tagline.value.trim(),
    logoStyle: dom.logoStyle.value,
    primaryColor: dom.primaryColor.value,
    secondaryColor: dom.secondaryColor.value,
    iconPreference: dom.iconPreference.value,
    instructions: dom.instructions.value.trim(),
    timestamp: new Date().toISOString(),
  };
}

/* ============================================================
   WEBHOOK REQUEST HELPER
   ============================================================ */

/**
 * Sends a JSON POST to a Make.com webhook with timeout handling.
 * @param {string} url - webhook URL.
 * @param {object} payload - JSON body.
 * @returns {Promise<object>} parsed JSON response.
 */
async function postWebhook(url, payload) {
  if (!url) {
    throw { type: 'config', message: 'Webhook URL not configured. Paste your Make.com webhook URL into the JavaScript.' };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!res.ok) {
      throw { type: 'http', message: `Webhook returned status ${res.status}.`, status: res.status };
    }

    let data;
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      data = await res.json();
    } else {
      const text = await res.text();
      try { data = JSON.parse(text); }
      catch { throw { type: 'parse', message: 'Webhook did not return valid JSON.' }; }
    }
    return data;
  } catch (err) {
    if (err.name === 'AbortError') {
      throw { type: 'timeout', message: 'The request timed out. Make.com may still be processing.' };
    }
    if (err.type) throw err; // already a typed error
    if (!navigator.onLine) {
      throw { type: 'offline', message: 'No internet connection.' };
    }
    throw { type: 'network', message: 'Could not reach the webhook. It may be unavailable.' };
  } finally {
    clearTimeout(timeout);
  }
}

/* ============================================================
   GENERATE PROMPT
   ============================================================ */

/** Sends company info to Make.com and displays the returned AI prompt. */
async function generatePrompt() {
  showLoading('Generating Prompt...', 'Crafting the perfect AI prompt for your brand.');
  hideError();
  hideResults();

  try {
    const data = await postWebhook(GENERATE_PROMPT_WEBHOOK, collectFormData());
    const prompt = extractPrompt(data);
    displayPrompt(prompt);
    hideLoading();
  } catch (err) {
    hideLoading();
    showError(mapErrorTitle(err), err.message || 'Unexpected error.');
  }
}

/**
 * Extracts the prompt string from a Make.com response, supporting
 * common shapes: { prompt }, { data: { prompt } }, { output }, etc.
 */
function extractPrompt(data) {
  if (!data || typeof data !== 'object') return '';
  if (typeof data.prompt === 'string') return data.prompt;
  if (typeof data.output === 'string') return data.output;
  if (data.data && typeof data.data.prompt === 'string') return data.data.prompt;
  if (data.data && typeof data.data.output === 'string') return data.data.output;
  if (Array.isArray(data.result) && typeof data.result[0] === 'string') return data.result[0];
  return '';
}

/* ============================================================
   REGENERATE PROMPT
   ============================================================ */

/** Re-requests a prompt from Make.com (same as generatePrompt). */
async function regeneratePrompt() {
  return generatePrompt();
}

/* ============================================================
   GENERATE LOGO
   ============================================================ */

/** Sends the approved prompt to Make.com and displays returned logos. */
async function generateLogo() {
  const prompt = dom.promptText.value.trim();
  if (!prompt) {
    showError('No prompt', 'Generate or write a prompt before creating your logo.');
    return;
  }

  showLoading('Creating Luxury Logo...', 'Preparing your logo concepts.');
  hideError();
  hideResults();

  try {
    const payload = {
      ...collectFormData(),
      prompt,
      timestamp: new Date().toISOString(),
    };
    const data = await postWebhook(GENERATE_LOGO_WEBHOOK, payload);

    if (data && data.success === false) {
      throw { type: 'logic', message: data.message || 'Logo generation failed on the server.' };
    }

    const logos = extractLogos(data);
    if (!logos.length) {
      throw { type: 'empty', message: 'No logos were returned. Try regenerating.' };
    }

    currentLogos = logos;
    displayLogos(logos);
    showSuccess();
    hideLoading();
  } catch (err) {
    hideLoading();
    showError(mapErrorTitle(err), err.message || 'Unexpected error.');
  }
}

/**
 * Extracts logo URLs from a Make.com response.
 * Supports: { logos: [{url}] }, { images: [{url}] }, { data: { logos } },
 * or a flat array of strings.
 */
function extractLogos(data) {
  if (!data) return [];
  let arr = null;
  if (Array.isArray(data.logos)) arr = data.logos;
  else if (Array.isArray(data.images)) arr = data.images;
  else if (data.data && Array.isArray(data.data.logos)) arr = data.data.logos;
  else if (Array.isArray(data)) arr = data;

  if (!arr) return [];
  return arr
    .map((item) => {
      if (typeof item === 'string') return { url: item };
      if (item && typeof item === 'object') {
        return { url: item.url || item.image || item.link || '', ...item };
      }
      return { url: '' };
    })
    .filter((l) => l.url);
}

/* ============================================================
   DISPLAY PROMPT
   ============================================================ */

/** Shows the editable prompt textarea with the given text. */
function displayPrompt(promptText) {
  dom.promptText.value = promptText || '';
  dom.promptPreview.hidden = false;
  dom.regeneratePromptBtn.disabled = false;
  dom.generateLogoBtn.disabled = false;
  dom.promptPreview.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

/* ============================================================
   DISPLAY LOGOS
   ============================================================ */

/** Builds the logo gallery dynamically from an array of logo objects. */
function displayLogos(logos) {
  dom.gallery.innerHTML = '';
  logos.forEach((logo, i) => {
    const card = createLogoCard(logo, i);
    dom.gallery.appendChild(card);
  });
  dom.resultsSection.hidden = false;
  dom.resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/** Creates a single logo card element. */
function createLogoCard(logo, index) {
  const card = document.createElement('article');
  card.className = 'logo-card';
  card.style.animationDelay = `${index * 0.08}s`;

  const wrap = document.createElement('div');
  wrap.className = 'logo-image-wrap';

  const img = document.createElement('img');
  img.className = 'logo-image';
  img.alt = `Generated logo concept ${index + 1}`;
  img.loading = 'lazy';
  img.src = logo.url;
  img.addEventListener('error', () => {
    const ph = document.createElement('div');
    ph.className = 'logo-image-placeholder';
    ph.textContent = 'Image unavailable';
    img.replaceWith(ph);
  });

  wrap.appendChild(img);

  const body = document.createElement('div');
  body.className = 'logo-card-body';

  const actions = document.createElement('div');
  actions.className = 'logo-card-actions';

  const downloadBtn = document.createElement('button');
  downloadBtn.className = 'btn btn-secondary btn-sm';
  downloadBtn.type = 'button';
  downloadBtn.innerHTML = iconDownload() + ' Download';
  downloadBtn.addEventListener('click', () => downloadLogo(logo.url, index));

  const similarBtn = document.createElement('button');
  similarBtn.className = 'icon-btn';
  similarBtn.type = 'button';
  similarBtn.title = 'Generate similar';
  similarBtn.setAttribute('aria-label', 'Generate similar logo');
  similarBtn.innerHTML = iconRefresh();
  similarBtn.addEventListener('click', () => generateSimilar(logo));

  const favBtn = document.createElement('button');
  favBtn.className = 'icon-btn';
  favBtn.type = 'button';
  favBtn.title = 'Favorite';
  favBtn.setAttribute('aria-label', 'Favorite this logo');
  favBtn.innerHTML = iconHeart();
  favBtn.addEventListener('click', () => {
    favBtn.classList.toggle('favorited');
  });

  actions.append(downloadBtn, similarBtn, favBtn);
  body.appendChild(actions);
  card.append(wrap, body);
  return card;
}

/* ============================================================
   DOWNLOAD LOGO
   ============================================================ */

/** Downloads a logo image by URL. Falls back to opening in a new tab. */
async function downloadLogo(url, index) {
  const filename = `luxlogo-${Date.now()}-${index + 1}.png`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('fetch failed');
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    triggerDownload(objectUrl, filename);
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  } catch {
    // CORS or network issue — fall back to direct link.
    triggerDownload(url, filename);
  }
}

function triggerDownload(href, filename) {
  const a = document.createElement('a');
  a.href = href;
  a.download = filename;
  a.target = '_blank';
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/* ============================================================
   GENERATE SIMILAR
   ============================================================ */

/** Re-runs logo generation, hinting Make.com to produce a similar logo. */
function generateSimilar(logo) {
  const prompt = dom.promptText.value.trim();
  if (!prompt) return;
  const enhanced = `${prompt}\n\nGenerate a logo similar in style to this reference: ${logo.url}`;
  dom.promptText.value = enhanced;
  lastAction = 'logo';
  generateLogo();
}

/* ============================================================
   LOADING STATE
   ============================================================ */

/** Shows the loading state with a title, subtitle, and animated bar. */
function showLoading(title, sub) {
  dom.loadingTitle.textContent = title || 'Loading...';
  dom.loadingSub.textContent = sub || '';
  dom.loadingState.hidden = false;
  dom.loadingBarFill.style.width = '0%';

  // Simulated progress while waiting (indeterminate-ish).
  let pct = 8;
  clearInterval(showLoading._timer);
  showLoading._timer = setInterval(() => {
    pct = Math.min(pct + Math.random() * 14, 92);
    dom.loadingBarFill.style.width = pct + '%';
  }, 600);

  dom.loadingState.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

/** Hides the loading state and completes the progress bar. */
function hideLoading() {
  clearInterval(showLoading._timer);
  dom.loadingBarFill.style.width = '100%';
  setTimeout(() => {
    dom.loadingState.hidden = true;
    dom.loadingBarFill.style.width = '0%';
  }, 300);
}

/* ============================================================
   ERROR STATE
   ============================================================ */

/** Shows an error card with a title and message. */
function showError(title, message) {
  dom.errorTitle.textContent = title || 'Something went wrong';
  dom.errorSub.textContent = message || 'Please try again.';
  dom.errorState.hidden = false;
  dom.errorState.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function hideError() {
  dom.errorState.hidden = true;
}

/** Maps typed errors to friendly titles. */
function mapErrorTitle(err) {
  switch (err.type) {
    case 'config': return 'Setup needed';
    case 'timeout': return 'Timeout';
    case 'offline': return 'No internet';
    case 'network': return 'Webhook unavailable';
    case 'http': return 'Generation failed';
    case 'parse': return 'Invalid response';
    case 'logic': return 'Generation failed';
    case 'empty': return 'No logos returned';
    default: return 'Generation failed';
  }
}

/* ============================================================
   SUCCESS STATE
   ============================================================ */

function showSuccess() {
  dom.successBanner.hidden = false;
}

function hideResults() {
  dom.resultsSection.hidden = true;
  dom.successBanner.hidden = true;
  dom.gallery.innerHTML = '';
  currentLogos = [];
}

/* ============================================================
   RESET GENERATOR
   ============================================================ */

function resetGenerator() {
  hideLoading();
  hideError();
  hideResults();
  dom.promptPreview.hidden = true;
  dom.promptText.value = '';
  dom.regeneratePromptBtn.disabled = true;
  dom.generateLogoBtn.disabled = true;
  dom.form.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ============================================================
   CONTACT FORM
   ============================================================ */
function initContactForm() {
  dom.contactForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validateContactForm()) return;

    const payload = {
      name: $('#contactName').value.trim(),
      email: $('#contactEmail').value.trim(),
      message: $('#contactMessage').value.trim(),
      timestamp: new Date().toISOString(),
    };

    setContactStatus('Sending your message...', 'success');

    if (!CONTACT_WEBHOOK) {
      // Fallback: open the user's mail client.
      const body = encodeURIComponent(`Name: ${payload.name}\nEmail: ${payload.email}\n\n${payload.message}`);
      window.location.href = `mailto:hello@luxlogo.ai?subject=LuxLogo%20AI%20Contact&body=${body}`;
      setContactStatus('Your email client should open shortly.', 'success');
      return;
    }

    try {
      await postWebhook(CONTACT_WEBHOOK, payload);
      setContactStatus('Thanks! Your message has been sent.', 'success');
      dom.contactForm.reset();
    } catch (err) {
      setContactStatus('Could not send your message. Please try again later.', 'error');
    }
  });
}

function validateContactForm() {
  let valid = true;
  const fields = [
    { id: 'contactName', name: 'Name' },
    { id: 'contactEmail', name: 'Email' },
    { id: 'contactMessage', name: 'Message' },
  ];
  fields.forEach(({ id, name }) => {
    const el = $('#' + id);
    const errEl = dom.contactForm.querySelector(`[data-error-for="${id}"]`);
    if (!el.value.trim()) {
      if (errEl) errEl.textContent = `${name} is required.`;
      el.classList.add('invalid');
      valid = false;
    } else if (id === 'contactEmail' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(el.value.trim())) {
      if (errEl) errEl.textContent = 'Enter a valid email address.';
      el.classList.add('invalid');
      valid = false;
    } else {
      if (errEl) errEl.textContent = '';
      el.classList.remove('invalid');
    }
  });
  return valid;
}

function setContactStatus(msg, type) {
  dom.contactStatus.textContent = msg;
  dom.contactStatus.className = 'form-status ' + (type || '');
  dom.contactStatus.hidden = !msg;
}

/* ============================================================
   BACK TO TOP
   ============================================================ */
function initBackToTop() {
  const onScroll = () => {
    dom.backToTop.classList.toggle('visible', window.scrollY > 600);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

/* ============================================================
   ICONS (inline SVG strings)
   ============================================================ */
function iconDownload() {
  return '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>';
}
function iconRefresh() {
  return '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>';
}
function iconHeart() {
  return '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>';
}

/* ============================================================
   BOOT
   ============================================================ */
document.addEventListener('DOMContentLoaded', init);
