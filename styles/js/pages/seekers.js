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

  let dex = await charadex.initialize.page(
    null,
    charadex.page.seekers,
    // Data callback to process data
    (data) => {     
      if (typeFilters.length) {
        for (let i = data.length - 1; i >= 0; i--) {
          const entry = data[i];
          const entryType = entry.type ?? '';
          const entryTypeKey = charadex.tools.scrub(entryType);
          if (!typeFilters.includes(entryTypeKey)) {
            data.splice(i, 1);
          }
        }
      }
      // Process data for each seekers entry
      for (let entry of data) {
        // Set image: prefer Preview, then Image, then Image URL
        entry.image = entry.preview || entry.image || entry['image url'] || '';
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

        const seekerDesign = profile.design || '';
        const seekerTypeRaw = profile.type ?? '';
        const normalizedSeekerType = typeof seekerTypeRaw === 'string' ? seekerTypeRaw.toLowerCase() : '';
        const isMyoSeeker = normalizedSeekerType.includes('myo');
        let hasLinkedPufflings = false;
        if (seekerDesign) {
          // Load all Pufflings from the masterlist
          const allPufflings = await charadex.importSheet(charadex.sheet.pages.masterlist);

          const seekerDesignKey = charadex.tools.scrub(seekerDesign);
          const filteredPufflings = allPufflings.filter(p => {
            const rawSeeker = p.seeker ?? '';
            const seekerId = rawSeeker ? String(rawSeeker).trim() : '';
            if (!seekerId) return false;
            return charadex.tools.scrub(seekerId) === seekerDesignKey;
          });
          if (filteredPufflings.length > 0) {
            hasLinkedPufflings = true;
            // Ensure the Pufflings section is visible and part of the profile layout
            const pufflingsSection = document.getElementById('pufflings-gallery-section');
            if (pufflingsSection) {
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
            }
            // Custom config for gallery without filters/search
            const seekerPufflingsGalleryConfig = {
              ...charadex.page.masterlist,
              dexSelector: 'pufflings',
              hideControlsOnProfile: false,
              profileToggle: false,
              filters: { toggle: false, parameters: () => ({}) },
              fauxFolder: { toggle: false, folderProperty: '', parameters: [] },
              search: { toggle: false, filterToggle: false, parameters: [] },
              pagination: { toggle: false, bottomToggle: false, amount: 100 },
            };
            // Render the gallery using the masterlist config
            await charadex.initialize.page(
              filteredPufflings,
              seekerPufflingsGalleryConfig,
              null,
              null,
              false
            );
          } else {
            const pufflingsSection = document.getElementById('pufflings-gallery-section');
            if (pufflingsSection) {
              pufflingsSection.style.display = 'none';
              const galleryContainer = pufflingsSection.querySelector('#pufflings-gallery');
              if (galleryContainer) {
                galleryContainer.innerHTML = '';
              }
            }
          }
        }
        const shouldLockSeekerImage = isMyoSeeker && !hasLinkedPufflings;
        const seekerLockMessage = "This seeker can't be used for guild activities until a puffling is registered with them.";
        const imageContainer = document.querySelector('.cd-profile-image-container');
        if (imageContainer) {
          imageContainer.classList.toggle('locked-overlay-container', shouldLockSeekerImage);
          const imageElement = imageContainer.querySelector('img.image');
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
