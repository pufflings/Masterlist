/* ==================================================================== */
/* Import Charadex
======================================================================= */
import { charadex } from '../charadex.js';

const PROMPTS_BASE_INCLUDE = 'includes/prompts-base.html';

document.addEventListener('charadex:includeLoaded', (event) => {
  const detail = event?.detail;
  if (!detail || detail.source !== PROMPTS_BASE_INCLUDE) return;

  const dataset = detail.dataset || {};
  const root = detail.root || null;
  if (!root) return;

  const titleText = dataset.promptsTitle || document.title || 'Prompts';
  const subtitleText = dataset.promptsSubtitle || '';
  const linkHref = dataset.promptsLink || (window.location.pathname.split('/').pop() || 'prompts.html');

  const titleLink = root.querySelector('.prompt-controls-link');
  if (titleLink) {
    titleLink.textContent = titleText;
    titleLink.setAttribute('href', linkHref);
  }

  const subtitleElement = root.querySelector('.prompt-subtitle');
  if (subtitleElement) {
    if (subtitleText) {
      subtitleElement.innerHTML = subtitleText;
      subtitleElement.style.display = '';
    } else {
      subtitleElement.innerHTML = '';
      subtitleElement.style.display = 'none';
    }
  }
});

/* ==================================================================== */
/* Helpers
======================================================================= */
const waitForElement = (selector) => new Promise((resolve) => {
  const found = document.querySelector(selector);
  if (found) return resolve(found);

  const observer = new MutationObserver(() => {
    const element = document.querySelector(selector);
    if (element) {
      observer.disconnect();
      resolve(element);
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
});

const parseBool = (value) => {
  if (value === true || value === false) return value;
  if (value === undefined || value === null || value === '') return false;
  return String(value).toLowerCase() === 'true';
};

const getTypeFilters = () => {
  const body = document.body || {};
  const raw = body.dataset ? body.dataset.promptTypeFilter || '' : '';
  return raw
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
};

const matchTypeFilter = (entryType, filterList) => {
  if (!filterList.length) return true;
  return filterList.includes((entryType || '').trim().toLowerCase());
};

const updateCardView = (card, entry) => {
  const titleLink = card.find('.card-header a');
  card.attr('data-folder', entry.folderLabel || entry.folder);
  card.toggleClass('shop-card-fade', entry.isArchived);

  // New badge
  card.find('.new-badge').remove();
  if (entry.isNew) {
    const badge = $('<span class="new-badge badge badge-danger ml-2">NEW!</span>');
    titleLink.after(badge);
  }

  // External link overrides
  if (entry.link) {
    titleLink.attr('href', entry.link);
    titleLink.attr('target', '_blank');

    const background = card.find('.cd-prompt-background');
    background.css('cursor', 'pointer');
    background.off('click').on('click', () => window.open(entry.link, '_blank'));
  } else {
    titleLink.removeAttr('target');
    const background = card.find('.cd-prompt-background');
    background.css('cursor', '');
    background.off('click');
  }

  // Schedule block
  const scheduleBlock = card.find('.prompt-schedule-fields');
  const hasStart = Boolean(entry.startdate);
  const hasEnd = Boolean(entry.enddate);

  if (hasStart || hasEnd) {
    scheduleBlock.show();
    scheduleBlock.find('.prompt-start-date').toggle(hasStart);
    scheduleBlock.find('.prompt-end-date').toggle(hasEnd);
  } else {
    scheduleBlock.hide();
  }
};

/* ==================================================================== */
/* Load
======================================================================= */
document.addEventListener('DOMContentLoaded', async () => {
  await waitForElement('#charadex-gallery');
  await charadex.loadOptions();

  const typeFilters = getTypeFilters();

  const currentPage = window.location.pathname.split('/').pop() || 'prompts.html';

  await charadex.initialize.page(
    null,
    charadex.page.prompts,
    (data) => {
      for (let i = data.length - 1; i >= 0; i--) {
        const entry = data[i];
        if (!matchTypeFilter(entry.type, typeFilters)) {
          data.splice(i, 1);
          continue;
        }

        const isArchived = parseBool(entry.archived);
        const isNew = parseBool(entry.new);

        entry.isArchived = isArchived;
        entry.isNew = !isArchived && isNew;
        entry.archived = isArchived ? 'Archived' : 'Active';
        entry.new = entry.isNew ? 'New' : 'Previous';

        const folderFilters = [];
        if (entry.isArchived) {
          folderFilters.push('Archived');
        } else {
          if (entry.isNew) folderFilters.push('New');
          folderFilters.push('Active');
        }

        entry.folder = folderFilters;
        entry.folderLabel = entry.isArchived ? 'Archived' : (entry.isNew ? 'New' : 'Active');
      }
    },
    (listData) => {
      setTimeout(() => {
        const cards = $('.charadex-list .col-md-6.p-2 > .card.h-100');
        const backgrounds = $('.charadex-list .cd-prompt-background');

        cards.each(function (index) {
          const entry = listData.array[index];
          if (!entry) return;
          updateCardView($(this), entry);
        });

        backgrounds.each(function (index) {
          const entry = listData.array[index];
          if (entry?.image) {
            $(this).attr('style', `background-image: url(${entry.image})`);
          } else {
            $(this).removeAttr('style');
          }
        });
      }, 50);
    },
    currentPage
  );

  charadex.tools.loadPage('.softload', 500);
});
