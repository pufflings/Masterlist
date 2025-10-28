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

  const toBoolean = (value) => (
    value === true ||
    value === "true" ||
    value === 1 ||
    value === "1" ||
    value === "yes" ||
    value === "Yes"
  );

  const isOutOfStock = (value) => value === 0 || value === "0";

  const buildStockCallout = (item) => {
    if (!item) return '';

    const stocked = toBoolean(item.stockedinshop);
    if (!stocked || isOutOfStock(item.stockquantity)) return '';

    const shopUrl = charadex.tools.resolveRelativeUrl('shop.html');
    return `
      <a class="item-stock-callout" href="${shopUrl}">
        <span class="fa-solid fa-store item-stock-callout__icon" aria-hidden="true"></span>
        <span class="item-stock-callout__copy">
          <strong>Currently in stock!</strong>
          <span class="item-stock-callout__cta">Visit the shop</span>
        </span>
        <span class="fa-solid fa-arrow-right item-stock-callout__chevron" aria-hidden="true"></span>
      </a>
    `.trim();
  };

  const traits = await charadex.importSheet(charadex.sheet.pages.traits);

  await charadex.initialize.page(null, charadex.page.items,
    (itemsArray) => {
      if (!Array.isArray(itemsArray)) return;
      for (const entry of itemsArray) {
        entry.stockcallout = buildStockCallout(entry);
      }
    },
    (listData) => {
      if (listData.type !== 'profile' || !listData.profileArray || !listData.profileArray[0]) return;

      const item = listData.profileArray[0];

      const tradeable = item.tradeable ?? '';
      let tradeableText = 'No';
      if (tradeable === true || tradeable === "true" || tradeable === 1 || tradeable === "1" || tradeable === "yes" || tradeable === "Yes") {
        tradeableText = 'Yes';
      }
      $(".tradeable").text(tradeableText);

      const itemType = (item.type || '').trim().toLowerCase();
      if (itemType !== 'trait') {
        $("#related-trait-row").hide();
        $("#related-trait-row .related-trait-label").text('');
        $("#related-trait-row .related-trait").empty();
        return;
      }

      const traitValue = (item.trait || '').trim();
      if (!traitValue) {
        $("#related-trait-row").show();
        $("#related-trait-row .related-trait-label").text('Related trait');
        $("#related-trait-row .related-trait").text('-');
        return;
      }

      const traitMatch = traits.find(t => {
        const byName = (t.trait || '').trim().toLowerCase() === traitValue.toLowerCase();
        const byId = (t.id || '').toString().trim().toLowerCase() === traitValue.toLowerCase();
        return byName || byId;
      });

      $("#related-trait-row").show();
      $("#related-trait-row .related-trait-label").text('Related trait');

      if (!traitMatch) {
        $("#related-trait-row .related-trait").text('-');
        return;
      }

      const traitName = (traitMatch.trait || traitValue).trim();
      const profile = traitName ? traitName.toLowerCase().replace(/\s+/g, '') : '';
      const link = profile ? `traits.html?profile=${profile}` : '';
      const image = (traitMatch.image || '').trim();

      let html = '';
      if (image) {
        html += `<img src="${image}" alt="${traitName}" style="max-width:32px;max-height:32px;vertical-align:middle;"/> `;
      }
      html += link ? `<a href="${link}">${traitName}</a>` : traitName || '-';
      $("#related-trait-row .related-trait").html(html);
    }
  );
  charadex.tools.loadPage('.softload', 500);
});
