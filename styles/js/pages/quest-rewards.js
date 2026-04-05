/* ==================================================================== */
/* Quest Rewards Calculator
======================================================================= */
import { charadex } from '../charadex.js';

/* ==================================================================== */
/* Helpers
======================================================================= */
const parseBool = (value) => {
  if (value === true || value === false) return value;
  if (value === undefined || value === null || value === '') return false;
  return String(value).toLowerCase() === 'true';
};

const getNum = (id) => {
  const val = parseInt(document.getElementById(id)?.value, 10);
  return isNaN(val) || val < 0 ? 0 : val;
};

const getSelectNum = (id) => {
  const val = parseFloat(document.getElementById(id)?.value);
  return isNaN(val) ? 0 : val;
};

const isChecked = (id) => document.getElementById(id)?.checked || false;

/**
 * Get ISO week number for a date.
 */
const getWeekNumber = (date) => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
};

/**
 * Check if cooldown has elapsed.
 */
const isCooldownReady = (lastTimestamp, cooldownType) => {
  if (!cooldownType || !lastTimestamp) return true;

  const last = new Date(lastTimestamp);
  if (isNaN(last.getTime())) return true;

  const now = new Date();
  const type = cooldownType.trim().toLowerCase();

  if (type === 'daily') {
    const lastDate = new Date(last.getFullYear(), last.getMonth(), last.getDate());
    const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return lastDate < todayDate;
  }

  if (type === 'weekly') {
    const lastWeek = getWeekNumber(last);
    const lastYear = last.getFullYear();
    const currentWeek = getWeekNumber(now);
    const currentYear = now.getFullYear();
    return (currentYear > lastYear) || (currentYear === lastYear && currentWeek > lastWeek);
  }

  if (type === 'monthly') {
    const lastMonth = last.getMonth();
    const lastYear = last.getFullYear();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    return (currentYear > lastYear) || (currentYear === lastYear && currentMonth > lastMonth);
  }

  return true;
};

/**
 * Character coin calculation: base coins for first, +1 for each extra.
 */
const charCoins = (count, baseForFirst) => {
  if (count <= 0) return 0;
  return baseForFirst + (count - 1);
};

/**
 * Encode JSON to URL-safe Base64.
 */
const encodeUrlSafeBase64 = (obj) => {
  return btoa(JSON.stringify(obj))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
};

/* ==================================================================== */
/* State
======================================================================= */
let pageState = {
  username: '',
  promptTitle: '',
  promptData: null,
  lastTimestamp: null,
  hasHistory: false,
  itemsList: [],
};

/* ==================================================================== */
/* Initialization
======================================================================= */
document.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(window.location.search);
  const username = params.get('username');
  const prompt = params.get('prompt');

  if (!username || !prompt) {
    showError('Missing required URL parameters. Usage: <code>quest-rewards.html?username=NAME&prompt=QUEST_TITLE</code>');
    return;
  }

  pageState.username = username;
  pageState.promptTitle = prompt;

  try {
    const [inventoryData, promptsData, questLogData, itemsData] = await Promise.all([
      charadex.importSheet(charadex.sheet.pages.inventory),
      charadex.importSheet(charadex.sheet.pages.prompts),
      charadex.importSheet(charadex.sheet.pages.questStatusLog),
      charadex.importSheet(charadex.sheet.pages.items),
    ]);

    // Validate username
    const userEntry = inventoryData.find(
      (row) => row.username && row.username.toLowerCase() === username.toLowerCase()
    );
    if (!userEntry) {
      showError(`Username "<strong>${escapeHtml(username)}</strong>" not found in the inventory sheet.`);
      return;
    }

    // Validate prompt
    const promptEntry = promptsData.find(
      (row) => row.title && row.title === prompt
    );
    if (!promptEntry) {
      showError(`Prompt "<strong>${escapeHtml(prompt)}</strong>" not found in the prompts sheet.`);
      return;
    }

    pageState.promptData = promptEntry;
    pageState.itemsList = itemsData;

    // Find quest history
    const questEntries = questLogData.filter(
      (row) => row.username === username && row.quest === prompt
    );

    if (questEntries.length > 0) {
      const lastEntry = questEntries[questEntries.length - 1];
      pageState.lastTimestamp = lastEntry.timestamp || null;
      pageState.hasHistory = true;
    }

    // Render the page
    renderStatus();
    populateItemsDropdown();
    bindFormEvents();
    recalculate();

    document.getElementById('quest-loading').style.display = 'none';
    document.getElementById('quest-content').style.display = '';

  } catch (err) {
    console.error('Quest Rewards init error:', err);
    showError('Failed to load sheet data. Please try again later.');
  }
});

/* ==================================================================== */
/* Error & Escape
======================================================================= */
const showError = (msg) => {
  document.getElementById('quest-loading').style.display = 'none';
  const errorEl = document.getElementById('quest-error');
  document.getElementById('quest-error-message').innerHTML = `<i class="fas fa-exclamation-triangle fa-fw mr-2"></i>${msg}`;
  errorEl.style.display = '';
};

const escapeHtml = (str) => {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
};

/* ==================================================================== */
/* Render Status Card
======================================================================= */
const renderStatus = () => {
  const { promptData, lastTimestamp, hasHistory, username, promptTitle } = pageState;

  // Title
  document.getElementById('quest-title').textContent = promptTitle;

  // Completing for
  document.getElementById('quest-completing-for').innerHTML =
    `Completing quest for <strong>${escapeHtml(username)}</strong>: ${escapeHtml(promptTitle)}`;

  // Archived
  const isArchived = parseBool(promptData.archived);
  const warnings = document.getElementById('quest-warnings');

  if (isArchived) {
    warnings.innerHTML += '<div class="quest-warning"><i class="fas fa-archive fa-fw mr-1"></i>This prompt is <strong>archived</strong>.</div>';
  }

  // Cooldown
  const cooldown = promptData.cooldown || '';
  const cooldownEl = document.getElementById('status-cooldown');

  if (!cooldown) {
    cooldownEl.textContent = '-';
  } else {
    const ready = isCooldownReady(lastTimestamp, cooldown);
    if (ready) {
      cooldownEl.innerHTML = `<span class="text-success">${cooldown} - Ready</span>`;
    } else {
      cooldownEl.innerHTML = `<span class="text-warning font-weight-bold">${cooldown} - On cooldown</span>`;
      warnings.innerHTML += `<div class="quest-warning"><i class="fas fa-clock fa-fw mr-1"></i>This quest is still on <strong>${cooldown.toLowerCase()}</strong> cooldown.</div>`;
    }
  }

  // First Time Bonus
  const firstTimeBonus = parseBool(promptData.firsttimebonus);
  const ftbEl = document.getElementById('status-first-time');

  if (firstTimeBonus) {
    if (!hasHistory) {
      ftbEl.innerHTML = '<span class="text-success">First time bonus active &#x2705;</span>';
    } else {
      ftbEl.innerHTML = '<span class="text-danger">First time bonus not active &#x274E;</span>';
    }
  } else {
    ftbEl.textContent = '-';
  }
};

/* ==================================================================== */
/* Items Section
======================================================================= */
let itemRowCounter = 0;

const populateItemsDropdown = () => {
  // Store item names for reuse
  pageState.itemNames = pageState.itemsList
    .map((item) => item.item)
    .filter(Boolean)
    .sort();
};

const addItemRow = () => {
  const container = document.getElementById('items-container');
  const emptyMsg = document.getElementById('items-empty-msg');
  emptyMsg.style.display = 'none';

  const rowId = `item-row-${itemRowCounter++}`;
  const row = document.createElement('div');
  row.className = 'item-row';
  row.id = rowId;

  const select = document.createElement('select');
  select.className = 'form-control form-control-sm';
  select.innerHTML = '<option value="">-- Select Item --</option>' +
    pageState.itemNames.map((name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join('');

  const qty = document.createElement('input');
  qty.type = 'number';
  qty.className = 'form-control form-control-sm';
  qty.value = '1';
  qty.min = '-999';
  qty.placeholder = 'Qty';

  const removeBtn = document.createElement('button');
  removeBtn.className = 'btn btn-sm btn-outline-danger btn-remove-item';
  removeBtn.innerHTML = '<i class="fas fa-times"></i>';
  removeBtn.addEventListener('click', () => {
    row.remove();
    if (container.children.length === 0) emptyMsg.style.display = '';
    recalculate();
  });

  select.addEventListener('change', recalculate);
  qty.addEventListener('input', recalculate);

  row.appendChild(select);
  row.appendChild(qty);
  row.appendChild(removeBtn);
  container.appendChild(row);

  recalculate();
};

const getItemsFromForm = () => {
  const items = {};
  const rows = document.querySelectorAll('#items-container .item-row');
  rows.forEach((row) => {
    const name = row.querySelector('select')?.value;
    const qty = parseInt(row.querySelector('input')?.value, 10);
    if (name && !isNaN(qty) && qty !== 0) {
      items[name] = (items[name] || 0) + qty;
    }
  });
  return items;
};

/* ==================================================================== */
/* Calculation
======================================================================= */
const recalculate = () => {
  // Character rewards
  const pufflings = charCoins(getNum('char-pufflings'), 3);
  const humanoidHeadshot = charCoins(getNum('char-humanoid-headshot'), 3);
  const humanoidHalfBody = charCoins(getNum('char-humanoid-halfbody'), 5);
  const humanoidFullBody = charCoins(getNum('char-humanoid-fullbody'), 7);
  const seekerHeadshot = charCoins(getNum('char-seeker-headshot'), 3);
  const seekerHalfBody = charCoins(getNum('char-seeker-halfbody'), 5);
  const seekerFullBody = charCoins(getNum('char-seeker-fullbody'), 7);

  // Art finish
  const coloring = getSelectNum('art-coloring');
  const shading = getSelectNum('art-shading');
  const background = getSelectNum('art-background');

  // Writing
  const wordCount = getNum('writing-wordcount');
  const writingRewards = Math.floor(wordCount / 100);

  // Extra bonuses
  const giftArt = isChecked('bonus-gift-art') ? 5 : 0;
  const masterpiece = isChecked('bonus-masterpiece') ? 5 : 0;
  const scenery = isChecked('bonus-scenery') ? 5 : 0;
  const extra = giftArt + masterpiece + scenery;

  // Scale
  const scale = getSelectNum('bonus-scale') || 1;

  // Base
  const baseCoins = getNum('base-coins');
  const baseRP = getNum('base-rp');

  // Commission & Collab
  const commissionMultiplier = isChecked('bonus-commission') ? 0.85 : 1;
  const collab = Math.max(1, getNum('bonus-collab'));

  // Formula calculation
  const artworkRewards = pufflings + humanoidHeadshot + humanoidHalfBody + humanoidFullBody
    + seekerHeadshot + seekerHalfBody + seekerFullBody
    + coloring + shading + background;

  const scaledArtWriting = (artworkRewards + writingRewards) * scale;
  const uncappedBonus = scaledArtWriting + extra;
  const bonus = Math.min(35, uncappedBonus);
  const total = bonus + baseCoins;
  const finalCoins = Math.round((total * commissionMultiplier) / collab);

  // Build result object for preview
  const result = {
    artworkRewards,
    writingRewards,
    scale,
    scaledArtWriting,
    extra,
    giftArt,
    masterpiece,
    scenery,
    uncappedBonus,
    bonus,
    baseCoins,
    baseRP,
    total,
    commissionMultiplier,
    collab,
    finalCoins,
    // Individual character counts for preview
    charCounts: {
      pufflings: { count: getNum('char-pufflings'), coins: pufflings },
      humanoidHeadshot: { count: getNum('char-humanoid-headshot'), coins: humanoidHeadshot },
      humanoidHalfBody: { count: getNum('char-humanoid-halfbody'), coins: humanoidHalfBody },
      humanoidFullBody: { count: getNum('char-humanoid-fullbody'), coins: humanoidFullBody },
      seekerHeadshot: { count: getNum('char-seeker-headshot'), coins: seekerHeadshot },
      seekerHalfBody: { count: getNum('char-seeker-halfbody'), coins: seekerHalfBody },
      seekerFullBody: { count: getNum('char-seeker-fullbody'), coins: seekerFullBody },
    },
    artFinish: {
      coloring: { value: coloring, label: coloring > 0 ? 'Yes' : 'No' },
      shading: { value: shading, label: ['No Shading', 'Minimal Shading', 'Full Shading'][[0, 2, 5].indexOf(shading)] || 'No Shading' },
      background: { value: background, label: ['No Background', 'Simple Background', 'Complex Background'][[0, 3, 5].indexOf(background)] || 'No Background' },
    },
    wordCount,
  };

  renderPreview(result);
};

/* ==================================================================== */
/* Preview
======================================================================= */
const renderPreview = (r) => {
  const { username, promptTitle, promptData, hasHistory } = pageState;

  // First time bonus status text
  const ftb = parseBool(promptData.firsttimebonus);
  let ftbText = '-';
  if (ftb) ftbText = hasHistory ? '\u274E' : '\u2705';

  // Cooldown status text
  const cooldown = promptData.cooldown || '';
  let cooldownText = '-';
  if (cooldown) {
    const ready = isCooldownReady(pageState.lastTimestamp, cooldown);
    cooldownText = ready ? `${cooldown} - Ready` : `${cooldown} - On cooldown`;
  }

  // Build synopsis lines in Discord markdown — used for both text preview and JSON Synopsis
  const charEntries = [
    { label: 'Pufflings', data: r.charCounts.pufflings },
    { label: 'Humanoid Puffling Headshot', data: r.charCounts.humanoidHeadshot },
    { label: 'Humanoid Puffling Half-body', data: r.charCounts.humanoidHalfBody },
    { label: 'Humanoid Puffling Full-body', data: r.charCounts.humanoidFullBody },
    { label: 'Seeker Headshot', data: r.charCounts.seekerHeadshot },
    { label: 'Seeker Half-body', data: r.charCounts.seekerHalfBody },
    { label: 'Seeker Full-body', data: r.charCounts.seekerFullBody },
  ];

  const formItems = getItemsFromForm();

  // Pre-calculate bonus modifier values
  const hasBonusModifiers = r.scale !== 1;
  const hasTotalModifiers = r.commissionMultiplier < 1 || r.collab > 1;

  // Bonus subtotal = artwork + writing + extra (before scale, before cap)
  const bonusSubtotal = r.artworkRewards + r.writingRewards + r.extra;

  // Bonus total = after scale applied, before cap
  const bonusTotalUncapped = r.uncappedBonus;
  const capNote = bonusTotalUncapped > 35 ? ' (capped to 35)' : '';

  const lines = [];
  lines.push(`**${promptTitle}**`);
  lines.push(`First Time Bonus: ${ftbText}  | Cooldown: ${cooldownText}`);
  lines.push('');
  lines.push(`Completing quest for **${username}**: ${promptTitle}`);
  lines.push('');

  // Base Rewards
  lines.push('**Base Rewards**');
  if (r.baseCoins > 0) lines.push(`- Coins: ${r.baseCoins}`);
  if (r.baseRP > 0) lines.push(`- Relationship points: ${r.baseRP} RP`);
  if (r.baseCoins === 0 && r.baseRP === 0) lines.push('- (none)');
  lines.push('');

  // Bonus Rewards
  lines.push('**Bonus Rewards (Art)**');
  charEntries.forEach(({ label, data }) => {
    if (data.count > 0) lines.push(`- ${label} (${data.count}): +${data.coins}`);
  });
  if (r.artFinish.coloring.value > 0) lines.push(`- Coloring: +${r.artFinish.coloring.value}`);
  if (r.artFinish.shading.value > 0) lines.push(`- ${r.artFinish.shading.label}: +${r.artFinish.shading.value}`);
  if (r.artFinish.background.value > 0) lines.push(`- Background (${r.artFinish.background.label}): +${r.artFinish.background.value}`);
  if (r.writingRewards > 0) lines.push(`- Writing (${r.wordCount} words): +${r.writingRewards}`);
  if (r.giftArt > 0) lines.push('- Gift art: +5');
  if (r.masterpiece > 0) lines.push('- Masterpiece Rendering: +5');
  if (r.scenery > 0) lines.push('- Scenery Background: +5');
  lines.push(`- Bonus subtotal: ${bonusSubtotal} coins`);

  // Bonus Modifiers (scale)
  if (hasBonusModifiers) {
    lines.push('');
    lines.push('**Bonus Modifiers**');
    const beforeScale = r.artworkRewards + r.writingRewards;
    const scaleAdded = Math.round(beforeScale * r.scale) - beforeScale;
    lines.push(`- Scale (${r.scale === 1.25 ? 'Full Scale (+25% bonus)' : r.scale + 'x'}): +${scaleAdded} coins`);
  }

  // Bonus Total
  lines.push('');
  lines.push(`**Bonus Total: ${bonusTotalUncapped} coins**${capNote}`);

  // Total Modifiers (commission, collab)
  if (hasTotalModifiers) {
    lines.push('');
    lines.push('**Total Modifiers**');
    if (r.commissionMultiplier < 1) {
      const discount = Math.round(r.total * (1 - r.commissionMultiplier));
      lines.push(`- Commission discount (-15% total): -${discount} coins`);
    }
    if (r.collab > 1) {
      const beforeCollab = Math.round(r.total * r.commissionMultiplier);
      const afterCollab = Math.round(beforeCollab / r.collab);
      const collabRemoved = beforeCollab - afterCollab;
      lines.push(`- Collab (\u00F7${r.collab}): -${collabRemoved} coins`);
    }
  }

  lines.push('');
  lines.push(`**Total coins: ${r.finalCoins}**`);

  if (Object.keys(formItems).length > 0) {
    lines.push('');
    lines.push('**Items**');
    for (const [name, qty] of Object.entries(formItems)) {
      lines.push(`- ${name}: ${qty}`);
    }
  }

  const synopsis = lines.join('\n');

  // Text preview = the same Discord-markdown synopsis string
  document.getElementById('preview-text').textContent = synopsis;

  // JSON output
  const jsonItems = { Coins: r.finalCoins };
  for (const [name, qty] of Object.entries(formItems)) {
    jsonItems[name] = qty;
  }

  const jsonOutput = {
    items: jsonItems,
    Relationship: r.baseRP,
    Synopsis: synopsis,
  };

  document.getElementById('preview-json').textContent = JSON.stringify(jsonOutput, null, 2);

  // Store for generate code
  pageState.currentJson = jsonOutput;
};

/* ==================================================================== */
/* Form Event Binding
======================================================================= */
const bindFormEvents = () => {
  // All numeric inputs and selects trigger recalculate
  const inputs = document.querySelectorAll(
    '#base-coins, #base-rp, ' +
    '#char-pufflings, #char-humanoid-headshot, #char-humanoid-halfbody, #char-humanoid-fullbody, ' +
    '#char-seeker-headshot, #char-seeker-halfbody, #char-seeker-fullbody, ' +
    '#writing-wordcount, #bonus-collab'
  );
  inputs.forEach((input) => input.addEventListener('input', recalculate));

  const selects = document.querySelectorAll(
    '#art-coloring, #art-shading, #art-background, #bonus-scale'
  );
  selects.forEach((select) => select.addEventListener('change', recalculate));

  const checkboxes = document.querySelectorAll(
    '#bonus-gift-art, #bonus-masterpiece, #bonus-scenery, #bonus-commission'
  );
  checkboxes.forEach((cb) => cb.addEventListener('change', recalculate));

  // Add item button
  document.getElementById('btn-add-item').addEventListener('click', addItemRow);

  // Generate code button
  document.getElementById('btn-generate-code').addEventListener('click', () => {
    if (!pageState.currentJson) return;
    const encoded = encodeUrlSafeBase64(pageState.currentJson);
    const outputEl = document.getElementById('generated-code-output');
    outputEl.textContent = encoded;
    outputEl.style.display = '';
    document.getElementById('btn-copy-code').style.display = '';
  });

  // Copy to clipboard
  document.getElementById('btn-copy-code').addEventListener('click', () => {
    const text = document.getElementById('generated-code-output').textContent;
    navigator.clipboard.writeText(text).then(() => {
      const btn = document.getElementById('btn-copy-code');
      const original = btn.innerHTML;
      btn.innerHTML = '<i class="fas fa-check fa-fw mr-1"></i>Copied!';
      setTimeout(() => { btn.innerHTML = original; }, 2000);
    });
  });
};
