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

  // Load the Shop sheet to check stock availability
  const shopData = await charadex.importSheet(charadex.sheet.pages.shop);

  // Create a map of shop items by ID and name for quick lookup
  const shopById = {};
  const shopByName = {};
  shopData.forEach(shopEntry => {
    if (shopEntry.id) {
      shopById[shopEntry.id] = shopEntry;
    }
    if (shopEntry.item) {
      shopByName[shopEntry.item.toLowerCase()] = shopEntry;
    }
  });

  // Load the Exchange Shop sheet to check stock availability
  const exchangeShopData = await charadex.importSheet(charadex.sheet.pages.exchangeShop);

  // Create a map of exchange shop items by ID and name for quick lookup
  const exchangeShopById = {};
  const exchangeShopByName = {};
  exchangeShopData.forEach(shopEntry => {
    if (shopEntry.id) {
      exchangeShopById[shopEntry.id] = shopEntry;
    }
    if (shopEntry.item) {
      exchangeShopByName[shopEntry.item.toLowerCase()] = shopEntry;
    }
  });

  const buildStockCallout = (item) => {
    if (!item) return '';

    // Check if the item exists in the Shop sheet
    let shopEntry = null;
    if (item.id && shopById[item.id]) {
      shopEntry = shopById[item.id];
    } else if (item.item && shopByName[item.item.toLowerCase()]) {
      shopEntry = shopByName[item.item.toLowerCase()];
    }

    // If not in shop or out of stock, return empty
    if (!shopEntry) return '';

    const quantity = Number(shopEntry.stockquantity ?? 0);
    const hasInfiniteStock = quantity === -1;
    // Show callout if infinite stock (-1) or if stock > 0
    if (!hasInfiniteStock && (!Number.isFinite(quantity) || quantity <= 0)) return '';

    const shopUrl = charadex.tools.resolveRelativeUrl('poki-shop.html');
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

  const buildExchangeStockCallout = (item) => {
    if (!item) return '';

    // Check if the item exists in the Exchange Shop sheet
    let shopEntry = null;
    if (item.id && exchangeShopById[item.id]) {
      shopEntry = exchangeShopById[item.id];
    } else if (item.item && exchangeShopByName[item.item.toLowerCase()]) {
      shopEntry = exchangeShopByName[item.item.toLowerCase()];
    }

    // If not in shop or out of stock, return empty
    if (!shopEntry) return '';

    const quantity = Number(shopEntry.stockquantity ?? 0);
    const hasInfiniteStock = quantity === -1;
    // Show callout if infinite stock (-1) or if stock > 0
    if (!hasInfiniteStock && (!Number.isFinite(quantity) || quantity <= 0)) return '';

    const shopUrl = charadex.tools.resolveRelativeUrl('exchange-shop.html');
    return `
      <a class="item-exchange-callout" href="${shopUrl}">
        <span class="fa-solid fa-sparkles item-exchange-callout__icon" aria-hidden="true"></span>
        <span class="item-exchange-callout__copy">
          <strong>Available in the Exchange Shop!</strong>
          <span class="item-exchange-callout__cta">Visit the exchange shop</span>
        </span>
        <span class="fa-solid fa-arrow-right item-exchange-callout__chevron" aria-hidden="true"></span>
      </a>
    `.trim();
  };

  const traits = await charadex.importSheet(charadex.sheet.pages.traits);
  const variantDisplayMap = {
    s: 'Soulbound',
    t: 'Tradeable'
  };

  await charadex.initialize.page(null, charadex.page.items,
    (itemsArray) => {
      if (!Array.isArray(itemsArray)) return;
      for (const entry of itemsArray) {
        entry.stockcallout = '';
        entry.exchangecallout = '';
      }
    },
    (listData) => {
      if (listData.type !== 'profile' || !listData.profileArray || !listData.profileArray[0]) return;

      const item = listData.profileArray[0];
      const stockCalloutMarkup = buildStockCallout(item);
      const exchangeCalloutMarkup = buildExchangeStockCallout(item);
      const urlParams = charadex.url.getUrlParameters();
      const variantParam = (urlParams.get('variant') || '').trim().toLowerCase();
      const variantOverride = variantParam === 's' || variantParam === 't' ? variantParam : null;
      const variantDisplayText = variantOverride ? (variantDisplayMap[variantOverride] || variantOverride.toUpperCase()) : '';
      const baseName = item.item ?? '';
      const displayName = variantDisplayText ? `${baseName} (${variantDisplayText})` : baseName;

      if (listData.list && Array.isArray(listData.list.items) && listData.list.items[0]) {
        const listItem = listData.list.items[0];
        listItem.values({ stockcallout: stockCalloutMarkup, exchangecallout: exchangeCalloutMarkup });
        const stockNode = listItem.elm?.querySelector?.('.stockcallout');
        if (stockNode) {
          stockNode.style.display = stockCalloutMarkup ? '' : 'none';
        }
        const exchangeNode = listItem.elm?.querySelector?.('.exchangecallout');
        if (exchangeNode) {
          exchangeNode.style.display = exchangeCalloutMarkup ? '' : 'none';
        }
      } else {
        const profileStockCallout = $("#charadex-profile .stockcallout");
        profileStockCallout.html(stockCalloutMarkup);
        profileStockCallout.toggle(!!stockCalloutMarkup);

        const profileExchangeCallout = $("#charadex-profile .exchangecallout");
        profileExchangeCallout.html(exchangeCalloutMarkup);
        profileExchangeCallout.toggle(!!exchangeCalloutMarkup);
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
