/* ==================================================================== */
/* Import Charadex
======================================================================= */
import { charadex } from '../charadex.js';

const SEEKERS_BASE_INCLUDE = 'includes/seekers-base.html';
let currentSeekersPageUrl = (window?.location?.pathname?.split?.('/')?.pop?.() || 'seekers.html');

const waitForElement = (selector) => new Promise((resolve) => {
  const element = document.querySelector(selector);
  if (element) {
    resolve(element);
    return;
  }
  const observer = new MutationObserver(() => {
    const found = document.querySelector(selector);
    if (found) {
      observer.disconnect();
      resolve(found);
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
});

document.addEventListener('charadex:includeLoaded', (event) => {
  const detail = event?.detail;
  if (!detail || detail.source !== SEEKERS_BASE_INCLUDE) return;

  const dataset = detail.dataset || {};
  const root = detail.root || (detail.nodes?.find?.(node => node.nodeType === Node.ELEMENT_NODE) ?? null);
  if (!root) return;

  const title = dataset.seekersTitle || 'Seekers';
  const link = dataset.seekersLink || 'seekers.html';

  const linkElement = root.querySelector('.seekers-controls-link');
  if (linkElement) {
    linkElement.textContent = title;
    linkElement.setAttribute('href', link);
  }

  currentSeekersPageUrl = link;

  const isProfileView = (() => {
    try {
      const params = charadex?.url?.getUrlParameters?.();
      return params ? Boolean(params.get('profile')) : false;
    } catch (err) {
      console.warn('Failed to inspect URL parameters for profile view:', err);
      return false;
    }
  })();

  if (isProfileView) {
    const controlsCard = root.classList?.contains('charadex-controls')
      ? root
      : root.querySelector?.('.charadex-controls');
    if (controlsCard) {
      controlsCard.style.display = 'none';
    }
  }
});


/* ==================================================================== */
/* Load
======================================================================= */
document.addEventListener("DOMContentLoaded", async () => {

  await waitForElement('#charadex-gallery');

  const typeFilters = (() => {
    const body = document.body || {};
    const raw = body.dataset ? body.dataset.seekerTypeFilter || '' : '';
    return raw
      .split(',')
      .map(type => charadex.tools.scrub(type.trim()))
      .filter(Boolean);
  })();

  // Load options from sheet first
  await charadex.loadOptions();

  const basePufflingsConfig =
    charadex.page.seekers?.relatedData?.[charadex.sheet.pages.masterlist];

  const defaultPufflingsConfig = {
    ...charadex.page.masterlist,
    sheetPage: charadex.sheet.pages.masterlist,
    sitePage: 'masterlist',
    filters: { toggle: false, parameters: () => ({}) },
    fauxFolder: { toggle: false, folderProperty: '', parameters: [] },
    search: { toggle: false, filterToggle: false, parameters: [] },
    pagination: { toggle: true, bottomToggle: true, amount: 12 },
    relatedData: null,
  };

  const pufflingsGalleryConfig = {
    ...(basePufflingsConfig || defaultPufflingsConfig),
  };

  pufflingsGalleryConfig.dexSelector = 'pufflings';
  pufflingsGalleryConfig.profileToggle = false;
  pufflingsGalleryConfig.hideControlsOnProfile =
    pufflingsGalleryConfig.hideControlsOnProfile ?? false;
  pufflingsGalleryConfig.relatedData = null;
  pufflingsGalleryConfig.sheetPage =
    pufflingsGalleryConfig.sheetPage || charadex.sheet.pages.masterlist;
  pufflingsGalleryConfig.sitePage =
    pufflingsGalleryConfig.sitePage || 'masterlist';

  const decoratePufflings = (entries = []) => {
    return entries.map(entry => {
      const decorated = { ...entry };

      if (decorated.owner) {
        const ownerProfile = decorated.owner.toLowerCase().replace(/\s+/g, '');
        decorated.ownerlink = `inventories.html?profile=${ownerProfile}`;
      }

      if (decorated.seeker) {
        const seekerProfile = decorated.seeker.toLowerCase().replace(/\s+/g, '');
        decorated.seekerlink = `seekers.html?profile=${seekerProfile}`;
      }

      const image = decorated.image || '';
      decorated.image = image.trim();

      return decorated;
    });
  };

  let dex = await charadex.initialize.page(
    null,
    charadex.page.seekers,
    // Data callback to process data
    (data) => {     
      if (typeFilters.length) {
        for (let i = data.length - 1; i >= 0; i--) {
          const entry = data[i];
          const entryTypeKey = charadex.tools.scrub(entry.type);
          if (!typeFilters.includes(entryTypeKey)) {
            data.splice(i, 1);
          }
        }
      }
      // Process data for each seekers entry
      for (let entry of data) {
        entry.image = entry.image || '';
        // Process owner link to point to inventories page
        if (entry.owner) {
          let ownerProfile = entry.owner.toLowerCase().replace(/\s+/g, '');
          entry.ownerlink = `inventories.html?profile=${ownerProfile}`;
        }
        // Notes, Artist, Designer are passed through as-is
      }
    },
    async (listData) => {
      // Render Pufflings gallery if on a profile view
      if (listData.type === 'profile') {
        const profile = listData.profileArray[0];
        if (!profile) return;

        const isMyoSeeker = profile.type === 'MYO';
        const imageContainer = document.querySelector('.cd-profile-image-container');
        let profileImageElement = null;
        if (imageContainer) {
          const imageSrc = profile.image ? String(profile.image).trim() : '';
          profileImageElement = document.createElement('img');
          profileImageElement.className = 'image img-fluid';
          profileImageElement.src = imageSrc;
          profileImageElement.alt = profile.profileid
            ? `${profile.profileid} reference image`
            : 'Seeker reference image';
          imageContainer.innerHTML = '';
          imageContainer.appendChild(profileImageElement);
        }

        const pufflingsSection = document.getElementById('pufflings-gallery-section');
        const pufflingsListContainer = document.querySelector('#pufflings-gallery .pufflings-list');
        const relatedPufflings = decoratePufflings(profile.pufflings || []);
        const hasLinkedPufflings = relatedPufflings.length > 0;

        if (pufflingsSection) {
          if (hasLinkedPufflings) {
            const charadexList = document.querySelector('#charadex-gallery .charadex-list');
            if (charadexList && !pufflingsSection.dataset.inserted) {
              charadexList.appendChild(pufflingsSection);
              pufflingsSection.dataset.inserted = 'true';
            }
            pufflingsSection.style.display = '';

            const pufflingsHeading = pufflingsSection.querySelector('.card-header h4');
            if (pufflingsHeading) {
              pufflingsHeading.textContent = 'Bonded pufflings';
            }

            if (pufflingsListContainer) {
              pufflingsListContainer.innerHTML = '';
            }

            await charadex.initialize.page(
              relatedPufflings,
              pufflingsGalleryConfig,
              null,
              null,
              false
            );
          } else {
            pufflingsSection.style.display = 'none';
            if (pufflingsListContainer) {
              pufflingsListContainer.innerHTML = '';
            }
            const paginationContainers = pufflingsSection.querySelectorAll('.pufflings-pagination-container');
            paginationContainers.forEach(container => {
              container.style.display = 'none';
              const paginationList = container.querySelector('.pufflings-pagination');
              if (paginationList) paginationList.innerHTML = '';
            });
          }
        }

        const shouldLockSeekerImage = isMyoSeeker && !hasLinkedPufflings;
        const seekerLockMessage = "This seeker can't be used for guild activities until a puffling is registered with them.";
        if (imageContainer) {
          imageContainer.classList.toggle('locked-overlay-container', shouldLockSeekerImage);
          const imageElement = profileImageElement || imageContainer.querySelector('img.image');
          if (imageElement) {
            imageElement.classList.toggle('locked-overlay-target', shouldLockSeekerImage);
          }
          let overlayElement = imageContainer.querySelector('.locked-overlay');
          if (shouldLockSeekerImage) {
            if (!overlayElement) {
              overlayElement = document.createElement('div');
              overlayElement.className = 'locked-overlay has-message';
              overlayElement.setAttribute('role', 'note');
              overlayElement.setAttribute('aria-live', 'polite');
              overlayElement.innerHTML = `
                <span class="locked-overlay-icon" aria-hidden="true">🔒</span>
                <span class="locked-overlay-message">${seekerLockMessage}</span>
              `;
              imageContainer.appendChild(overlayElement);
            } else {
              const messageNode = overlayElement.querySelector('.locked-overlay-message');
              if (messageNode) messageNode.textContent = seekerLockMessage;
            }
          } else if (overlayElement) {
            overlayElement.remove();
          }
        }
      }
    },
    currentSeekersPageUrl
  );
  
  charadex.tools.loadPage('.softload', 500);
  
}); 
