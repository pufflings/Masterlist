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

  const buildStockCallout = (item) => {
    if (!item || item.stockedinshop !== true) return '';

    const quantity = Number(item.stockquantity ?? 0);
    if (!Number.isFinite(quantity) || quantity <= 0) return '';

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
  const collectiblesSheet = await charadex.importSheet(charadex.sheet.pages.collectibles);
  const variantDisplayMap = {
    s: 'Soulbound',
    t: 'Tradeable'
  };

  await charadex.initialize.page(null, charadex.page.items,
    (itemsArray) => {
      if (!Array.isArray(itemsArray)) return;
      for (const entry of itemsArray) {
        entry.stockcallout = '';
      }
    },
    (listData) => {
      if (listData.type !== 'profile' || !listData.profileArray || !listData.profileArray[0]) return;

      const item = listData.profileArray[0];
      const stockCalloutMarkup = buildStockCallout(item);
      const urlParams = charadex.url.getUrlParameters();
      const variantParam = (urlParams.get('variant') || '').trim().toLowerCase();
      const variantOverride = variantParam === 's' || variantParam === 't' ? variantParam : null;
      const variantDisplayText = variantOverride ? (variantDisplayMap[variantOverride] || variantOverride.toUpperCase()) : '';
      const baseName = item.item ?? '';
      const displayName = variantDisplayText ? `${baseName} (${variantDisplayText})` : baseName;

      if (listData.list && Array.isArray(listData.list.items) && listData.list.items[0]) {
        const listItem = listData.list.items[0];
        listItem.values({ stockcallout: stockCalloutMarkup });
        const stockNode = listItem.elm?.querySelector?.('.stockcallout');
        if (stockNode) {
          stockNode.style.display = stockCalloutMarkup ? '' : 'none';
        }
      } else {
        const profileStockCallout = $("#charadex-profile .stockcallout");
        profileStockCallout.html(stockCalloutMarkup);
        profileStockCallout.toggle(!!stockCalloutMarkup);
      }

      if (variantOverride && displayName.trim()) {
        const profileLink = $("#charadex-profile .profileid");
        const linkLabel = displayName.trim() ? displayName : profileLink.text();
        if (linkLabel) {
          profileLink.text(linkLabel);
          charadex.tools.setPageTitleSuffix(linkLabel);
        }
      }

      $("#charadex-profile .item").text(displayName.trim() ? displayName : (item.item ?? ''));

      const isTradeable = variantOverride ? variantOverride === 't' : item.tradeable === true;
      const tradeableText = isTradeable ? 'Yes' : 'No';
      $(".tradeable").text(tradeableText);

      // Show collectible type by cross-referencing with Collectibles sheet
      let collectibleType = '';
      if (String(item.type).toLowerCase() === 'collectible') {
        const itemName = item.item ?? '';
        const itemNameScrubbed = charadex.tools.scrub(itemName);
        const itemNameKeyed = charadex.tools.createKey(itemName);

        const collectibleMatch = collectiblesSheet.find(c => {
          if (!c) return false;
          const cItem = c.item ?? '';
          const cItemScrubbed = charadex.tools.scrub(cItem);
          const cItemKeyed = charadex.tools.createKey(cItem);
          return (
            (cItemScrubbed && cItemScrubbed === itemNameScrubbed) ||
            (cItemKeyed && cItemKeyed === itemNameKeyed)
          );
        });

        if (collectibleMatch && collectibleMatch.collectibletype) {
          collectibleType = collectibleMatch.collectibletype;
        }
      }

      if (collectibleType.trim().length > 0) {
        $("#collectible-type-row").show();
        $("#collectible-type-row .collectibletype").text(collectibleType);
      } else {
        $("#collectible-type-row").removeClass('d-flex');
      }

      if (item.type !== 'Trait') {
        $("#related-trait-row").hide();
        $("#related-trait-row .related-trait-label").text('');
        $("#related-trait-row .related-trait").empty();
        return;
      }

      const traitValue = item.trait || '';
      if (!traitValue) {
        $("#related-trait-row").show();
        $("#related-trait-row .related-trait-label").text('Related trait');
        $("#related-trait-row .related-trait").text('-');
        return;
      }

      const traitMatch = traits.find(t => {
        return t.trait === traitValue || String(t.id) === traitValue;
      });

      $("#related-trait-row").show();
      $("#related-trait-row .related-trait-label").text('Related trait');

      if (!traitMatch) {
        $("#related-trait-row .related-trait").text('-');
        return;
      }

      const traitName = traitMatch.trait || traitValue;
      const profile = traitName ? traitName.toLowerCase().replace(/\s+/g, '') : '';
      const link = profile ? `traits.html?profile=${profile}` : '';
      const image = traitMatch.image || '';

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
