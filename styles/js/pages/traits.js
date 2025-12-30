/* ==================================================================== */
/* Import Charadex
======================================================================= */
import { charadex } from '../charadex.js';


/* ==================================================================== */
/* Load
======================================================================= */
document.addEventListener("DOMContentLoaded", async () => {

  await charadex.loadOptions();

  const items = await charadex.importSheet(charadex.sheet.pages.items);

  const basePufflingConfig =
    charadex.page.traits?.relatedData?.[charadex.sheet.pages.masterlist];

  const defaultPufflingConfig = {
    ...charadex.page.masterlist,
    sheetPage: charadex.sheet.pages.masterlist,
    sitePage: 'masterlist',
    filters: { toggle: false, parameters: () => ({}) },
    fauxFolder: { toggle: false, folderProperty: '', parameters: [] },
    search: { toggle: false, filterToggle: false, parameters: [] },
    pagination: { toggle: false, bottomToggle: false, amount: 100 },
    relatedData: null,
  };

  const traitPufflingsGalleryConfig = {
    ...(basePufflingConfig || defaultPufflingConfig),
  };

  traitPufflingsGalleryConfig.dexSelector = 'trait-pufflings';
  traitPufflingsGalleryConfig.profileToggle = false;
  traitPufflingsGalleryConfig.profileProperty =
    traitPufflingsGalleryConfig.profileProperty || 'design';
  traitPufflingsGalleryConfig.hideControlsOnProfile =
    traitPufflingsGalleryConfig.hideControlsOnProfile ?? false;
  traitPufflingsGalleryConfig.sheetPage =
    traitPufflingsGalleryConfig.sheetPage || charadex.sheet.pages.masterlist;
  traitPufflingsGalleryConfig.sitePage =
    traitPufflingsGalleryConfig.sitePage || 'masterlist';
  traitPufflingsGalleryConfig.relatedData = null;

  const decoratePufflingEntries = (entries = []) => {
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

      decorated.image = decorated.image || '';

      return decorated;
    });
  };

  await charadex.initialize.page(null, charadex.page.traits,
    (data) => {
      data.forEach(trait => {
        const itemValue = trait.item || '';
        if (!itemValue) {
          trait.Item = '-';
          return;
        }

        const itemMatch = items.find(i => {
          return i.item === itemValue || String(i.id) === itemValue;
        });

        if (!itemMatch) {
          trait.Item = '-';
          return;
        }

        const itemName = itemMatch.item || itemValue;
        const profile = itemName ? itemName.toLowerCase().replace(/\s+/g, '') : '';
        const link = profile ? `items.html?profile=${profile}` : '';
        const image = itemMatch.image || '';

        let html = '';
        if (image) {
          html += `<img src="${image}" alt="${itemName}" style="max-width:32px;max-height:32px;vertical-align:middle;"/> `;
        }
        html += link ? `<a href="${link}">${itemName}</a>` : itemName || '-';
        trait.Item = html;
      });
    },
    async (listData) => {
      if (listData.type !== 'profile' || !listData.profileArray || !listData.profileArray[0]) return;

      const trait = listData.profileArray[0];
      $("#related-item-row").show();
      $("#related-item-row .related-item").html(trait.Item || '-');

      // Use long description in profile if available, with HTML support
      const longDesc = trait['long description'] || trait.longDescription || trait.longdescription;
      if (longDesc) {
        $("#charadex-profile .description").html(longDesc);
      }

      const pufflingsSection = document.getElementById('trait-pufflings-gallery-section');
      const pufflingsListContainer = document.querySelector('#trait-pufflings-gallery .trait-pufflings-list');
      if (!pufflingsSection || !pufflingsListContainer) return;

      const relatedPufflings = decoratePufflingEntries(trait.pufflings || []);

      if (!relatedPufflings.length) {
        pufflingsSection.style.display = 'none';
        pufflingsListContainer.innerHTML = '';
        return;
      }

      const charadexList = document.querySelector('#charadex-gallery .charadex-list');
      if (charadexList && !pufflingsSection.dataset.inserted) {
        charadexList.appendChild(pufflingsSection);
        pufflingsSection.dataset.inserted = 'true';
      }

      pufflingsListContainer.innerHTML = '';

      await charadex.initialize.page(
        relatedPufflings,
        traitPufflingsGalleryConfig,
        null,
        null,
        false
      );

      pufflingsSection.style.display = '';
      const heading = pufflingsSection.querySelector('.card-header h4');
      if (heading) heading.textContent = 'Pufflings with this trait';
    }
  );

  charadex.tools.loadPage('.softload', 500);
});
