/* ==================================================================== */
/* Import Charadex
======================================================================= */
import { charadex } from '../charadex.js';


/* ==================================================================== */
/* Load
======================================================================= */
document.addEventListener("DOMContentLoaded", async () => {
  
  // Load options from sheet first
  await charadex.loadOptions();

  const items = await charadex.importSheet(charadex.sheet.pages.items);

  await charadex.initialize.page(null, charadex.page.traits,
    (data) => {
      data.forEach(trait => {
        const itemValue = (trait.item || '').trim();
        if (!itemValue) {
          trait.Item = '-';
          return;
        }

        const itemMatch = items.find(i => {
          const byName = (i.item || '').trim().toLowerCase() === itemValue.toLowerCase();
          const byId = (i.id || '').toString().trim().toLowerCase() === itemValue.toLowerCase();
          return byName || byId;
        });

        if (!itemMatch) {
          trait.Item = '-';
          return;
        }

        const itemName = (itemMatch.item || itemValue).trim();
        const profile = itemName ? itemName.toLowerCase().replace(/\s+/g, '') : '';
        const link = profile ? `items.html?profile=${profile}` : '';
        const image = (itemMatch.image || '').trim();

        let html = '';
        if (image) {
          html += `<img src="${image}" alt="${itemName}" style="max-width:32px;max-height:32px;vertical-align:middle;"/> `;
        }
        html += link ? `<a href="${link}">${itemName}</a>` : itemName || '-';
        trait.Item = html;
      });
    },
    (listData) => {
      if (listData.type !== 'profile' || !listData.profileArray || !listData.profileArray[0]) return;

      const trait = listData.profileArray[0];
      $("#related-item-row").show();
      $("#related-item-row .related-item").html(trait.Item || '-');
    }
  );
  charadex.tools.loadPage('.softload', 500);
});
