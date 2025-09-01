import { charadex } from '../charadex.js';

document.addEventListener("DOMContentLoaded", async () => {
  await charadex.loadOptions();
  // Load all items from the Items sheet
  const allItems = await charadex.importSheet(charadex.sheet.pages.items);

  // Filter for items with 'stockedinshop' set to true, 'true', 1, or '1'
  const shopItems = allItems.filter(item => 
    item.stockedinshop === true ||
    item.stockedinshop === "true" ||
    item.stockedinshop === 1 ||
    item.stockedinshop === "1"
  );

  const $list = $("div.charadex-shop-list");
  $list.empty();

  shopItems.forEach(item => {
    const rarity = item.rarity || '';
    const rarityBadge = rarity ? `<span class="badge badge-pill badge-${rarity.toLowerCase().replace(/\s/g, '')}">${rarity}</span>` : "";
    const price = item.price || '';
    const stock = item.stockquantity || '';
    const image = item.image || item.imageurl || 'assets/favicon.png';
    const name = item.item || '';
    const description = item.description || '';
    
    // Handle Tradeable field
    const tradeable = item.tradeable || item.Tradeable || '';
    let tradeableText = 'No';
    let tradeableClass = 'text-muted';
    if (tradeable === true || tradeable === "true" || tradeable === 1 || tradeable === "1" || tradeable === "yes" || tradeable === "Yes") {
      tradeableText = 'Yes';
      tradeableClass = 'text-success';
    }
    
    // Create profile link (lowercase, remove spaces and special characters)
    const profile = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    let nameLink = `<a href="items.html?profile=${profile}">${name}</a>`;
    let cardFadeClass = '';
    if (stock === 0 || stock === '0') {
      nameLink = `<s>${nameLink}</s>`;
      cardFadeClass = 'shop-card-fade';
    }
    const card = `
      <div class="col-md-6 p-2">
        <div class="card h-100 ${cardFadeClass}">
          <div class="card-header p-4">
            <div class="row no-gutters align-items-end m-n1">
              <div class="col"><h5 class="mb-0 pr-2">${nameLink}</h5></div>
              <div class="col-auto text-right raritybadge">${rarityBadge}</div>
            </div>
          </div>
          <div class="card-body p-md-4 p-3 d-flex flex-fill align-items-center">
            <div class="row no-gutters m-n2 w-100">
              <div class="col-md-4 p-2 d-flex align-items-center justify-content-center"><a href="items.html?profile=${profile}"><img class="image img-fluid m-auto" src="${image}" alt="${name}"></a></div>
              <div class="col-md-8 p-2">
                <div class="description mb-2">${description}</div>
                <div class="d-flex justify-content-between align-items-end mt-4">
                  <span><b>Price:</b> ${price} <img src="assets/coin.png" alt="coin" style="height: 1em; width: 1em; vertical-align: middle; margin-left: 0.25em;"></span>
                  <span><b>Stock:</b> ${stock}</span>
                </div>
                <div class="mt-2">
                  <span class="${tradeableClass}"><b>Tradeable:</b> ${tradeableText}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    $list.append(card);
  });

  // Make the shop list visible (fade-in)
  $list.addClass('active');
}); 