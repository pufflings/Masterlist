/* ==================================================================== */
/* Import Charadex
======================================================================= */
import { charadex } from '../charadex.js';

const MASTERLIST_BASE_INCLUDE = 'includes/masterlist-base.html';

let currentMasterlistPageUrl = (window?.location?.pathname?.split('/')?.pop?.() || 'masterlist.html');

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

const updateSeekerRow = (data) => {
  if (!data) return;
  const seekerName = data.seekername || data.seekerName;
  const seekerLink = data.seekerlink || data.seekerLink;
  if (!seekerName || !seekerLink) return;

  const row = document.querySelector('.seeker-row');
  if (!row) return;

  row.style.display = '';
  const link = row.querySelector('.seekerlink');
  if (link) {
    link.textContent = seekerName;
    link.href = seekerLink;
  }
};

const registerProfileLoadedHandler = () => {
  const handler = (event, payload) => {
    const data = payload || event?.detail;
    updateSeekerRow(data || {});
  };

  if (window?.$?.fn?.on) {
    $(document).on('cd-profile-loaded', handler);
  } else {
    document.addEventListener('cd-profile-loaded', (event) => handler(event, event.detail));
  }
};

document.addEventListener('charadex:includeLoaded', (event) => {
  const detail = event?.detail;
  if (!detail || detail.source !== MASTERLIST_BASE_INCLUDE) return;

  const dataset = detail.dataset || {};
  const root = detail.root || (detail.nodes?.find?.(node => node.nodeType === Node.ELEMENT_NODE) ?? null);
  if (!root) return;

  const title = dataset.masterlistTitle || 'Masterlist';
  const link = dataset.masterlistLink || 'masterlist.html';

  const linkElement = root.querySelector('.charadex-controls-link');
  if (linkElement) {
    linkElement.textContent = title;
    linkElement.setAttribute('href', link);
  }

  currentMasterlistPageUrl = link;

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
  registerProfileLoadedHandler();

  const designTypeFilters = (() => {
    const body = document.body || {};
    const raw = body.dataset ? body.dataset.designTypeFilter || '' : '';
    return raw
      .split(',')
      .map(type => charadex.tools.scrub(type.trim()))
      .filter(Boolean);
  })();

  // Load options from sheet first
  await charadex.loadOptions();

  let dex = await charadex.initialize.page(
    null,
    charadex.page.masterlist,
    // Data callback to process traits
    (data) => {
      if (designTypeFilters.length) {
        for (let i = data.length - 1; i >= 0; i--) {
          const entry = data[i];
          const entryDesignType = entry.Type || entry.type || entry['Design Type'] || entry.designType || entry.designtype || '';
          const entryTypeKey = charadex.tools.scrub(entryDesignType);
          if (!designTypeFilters.includes(entryTypeKey)) {
            data.splice(i, 1);
          }
        }
      }

      // Process traits for each masterlist entry
      for (let entry of data) {
        const rawTraits = typeof entry.traits === 'string' ? entry.traits : '';
        const traitNames = rawTraits
          .split(/[,;\n]+/)
          .map(trait => trait.trim())
          .filter(Boolean);

        if (traitNames.length > 0) {
          let traitsHtml = '<ul style="padding-left: 1.2em; margin-bottom: 0;">';
          for (let traitName of traitNames) {
            const profile = charadex.tools.scrub(traitName);
            traitsHtml += `<li><a href="traits.html?profile=${profile}">${traitName}</a></li>`;
          }
          traitsHtml += '</ul>';
          entry.traits = traitsHtml;
        } else {
          entry.traits = '<em>No traits listed</em>';
        }
        
        // Process owner link to point to inventories page
        if (entry.owner) {
          let ownerProfile = entry.owner.toLowerCase().replace(/\s+/g, '');
          entry.ownerlink = `inventories.html?profile=${ownerProfile}`;
        }
        // Process seeker link if present
        if (entry.seeker) {
          // Split into design and name
          let parts = entry.seeker.split(/\s+/, 2);
          let design = parts[0];
          let name = entry.seeker.substring(design.length).trim();
          entry.seekerlink = `seekers.html?profile=${encodeURIComponent(design)}`;
          entry.seekername = name || entry.seeker;
        }
      }
    },
    async (listData) => {

      if (listData.type == 'profile') {
        // Create the log dex
        if (charadex.tools.checkArray(listData.profileArray[0].masterlistlog)) {
          let logs = await charadex.initialize.page(
            listData.profileArray[0].masterlistlog,
            charadex.page.masterlist.relatedData['masterlist log']
          );
        }

        // Directly update the Seeker row in the DOM
        const data = listData.profileArray[0];
        updateSeekerRow(data);
        
        // Update Relationship Gauge if data exists
        if (data && data.relationship) {
          const relationshipRow = document.querySelector('.relationship-row');
          if (relationshipRow) {
            relationshipRow.style.display = '';
            
            // Get relationship values (try different possible field names)
            const current = data.relationship || 0;
            const max = 50;
            
            // Calculate percentage
            const percentage = Math.min(Math.max((current / max) * 100, 0), 100);
            
            // Update gauge fill
            const gaugeFill = relationshipRow.querySelector('.gauge-fill');
            if (gaugeFill) {
              gaugeFill.style.width = percentage + '%';
            }
            
            // Update gauge text
            const gaugeText = relationshipRow.querySelector('.gauge-text');
            if (gaugeText) {
              gaugeText.textContent = `${current} / ${max}`;
            }
            
            // Update heart icon based on heartboundcrystal
            const heartIcon = relationshipRow.querySelector('.heart-icon');
            if (heartIcon) {
              if (data.heartboundcrystal === true || data.heartboundcrystal === 'true') {
                heartIcon.classList.add('heartbound');
              } else {
                heartIcon.classList.remove('heartbound');
              }
            }
          }
        }

        // Set Design Type
        const designType = data.Type || data.type || data['Design Type'] || data.designType || '';
        const designTypeElem = document.querySelector('.designtype');
        if (designTypeElem) designTypeElem.textContent = designType;

        // Render profile image(s)
        const imageContainer = document.querySelector('.cd-profile-image-container');
        if (imageContainer) {
          imageContainer.innerHTML = '';
          if (data.humanoidimage) {
            // Check if heartboundcrystal is true to determine lock status
            const isHeartbound = data.heartboundcrystal === true || data.heartboundcrystal === 'true';
            const lockIcon = isHeartbound ? '' : ' 🔒';
            const humanoidTabClass = isHeartbound ? '' : 'locked-humanoid-tab';
            
            imageContainer.innerHTML = `
              <ul class="nav nav-tabs justify-content-center mb-3" id="imageTab" role="tablist">
                <li class="nav-item">
                  <a class="nav-link active" id="main-image-tab" data-toggle="tab" href="#main-image" role="tab" aria-controls="main-image" aria-selected="true">Puffling</a>
                </li>
                <li class="nav-item">
                  <a class="nav-link" id="alt-image-tab" data-toggle="tab" href="#alt-image" role="tab" aria-controls="alt-image" aria-selected="false">Humanoid${lockIcon}</a>
                </li>
              </ul>
              <div class="tab-content" id="imageTabContent">
                <div class="tab-pane fade show active" id="main-image" role="tabpanel" aria-labelledby="main-image-tab">
                  <img class="image img-fluid" src="${data.image}">
                </div>
                <div class="tab-pane fade ${humanoidTabClass}" id="alt-image" role="tabpanel" aria-labelledby="alt-image-tab">
                  <div class="locked-humanoid-container">
                    <img class="alt-image img-fluid" src="${data.humanoidimage}">
                    ${!isHeartbound ? '<div class="locked-humanoid-overlay">🔒</div>' : ''}
                  </div>
                </div>
              </div>
            `;
          } else {
            imageContainer.innerHTML = `<img class="image img-fluid" src="${data.image}">`;
          }
        }
      }

    },
    currentMasterlistPageUrl
  );

  charadex.tools.loadPage('.softload', 500);
  
});
