import { charadex } from '../charadex.js';
import { auth } from '../auth.js';

document.addEventListener("DOMContentLoaded", async () => {
  await charadex.loadOptions();

  // Display user's coin balance if logged in
  await displayUserCoins();

  // Load the Shop sheet and Items sheet
  const shopData = await charadex.importSheet(charadex.sheet.pages.shop);
  const itemsData = await charadex.importSheet(charadex.sheet.pages.items);

  // Create a map of items by ID and by name for quick lookup
  const itemsById = {};
  const itemsByName = {};
  itemsData.forEach(item => {
    if (item.id) {
      itemsById[item.id] = item;
    }
    if (item.item) {
      itemsByName[item.item.toLowerCase()] = item;
    }
  });

  const $list = $("div.charadex-shop-list");
  $list.empty();

  shopData.forEach(shopEntry => {
    // Find the corresponding item from the items sheet
    // Try matching by ID first, then by item name
    let item = null;
    if (shopEntry.id && itemsById[shopEntry.id]) {
      item = itemsById[shopEntry.id];
    } else if (shopEntry.item && itemsByName[shopEntry.item.toLowerCase()]) {
      item = itemsByName[shopEntry.item.toLowerCase()];
    }

    // Skip if we can't find the item
    if (!item) {
      console.warn(`Shop entry references unknown item: ${shopEntry.item || shopEntry.id}`);
      return;
    }

    // Get data from item sheet
    const rarity = item.rarity || '';
    const rarityBadge = rarity
      ? `<span class="badge badge-pill badge-${charadex.tools.scrub(rarity)}">${rarity}</span>`
      : "";
    const image = item.image || 'assets/favicon.png';
    const name = item.item || '';
    const description = item.description || '';
    const tradeableText = item.tradeable === true ? 'Yes' : 'No';
    const tradeableClass = item.tradeable === true ? 'text-success' : 'text-muted';

    // Get price and stock from shop sheet
    const price = shopEntry.price || '';
    const stockNumber = Number(shopEntry.stockquantity ?? 0);
    const hasInfiniteStock = stockNumber === -1;
    const stock = Number.isFinite(stockNumber) ? stockNumber : 0;
    
    // Create profile link (lowercase, remove spaces and special characters)
    const profile = charadex.tools.scrub(name);
    let nameLink = `<a href="items.html?profile=${profile}">${name}</a>`;
    let cardFadeClass = '';
    if (!hasInfiniteStock && stock <= 0) {
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
                  <span><b>Stock:</b> ${hasInfiniteStock ? '&infin;' : stock}</span>
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

/**
 * Display the user's coin balance if they are logged in
 */
async function displayUserCoins() {
  // Check if user is logged in
  if (!auth.isLoggedIn()) {
    return;
  }

  const username = auth.getUsername();
  if (!username) {
    return;
  }

  try {
    // Load inventory data
    const inventoryData = await charadex.importSheet(charadex.sheet.pages.inventory);

    // Find the logged-in user's inventory profile
    const userProfile = inventoryData.find(profile =>
      charadex.tools.scrub(profile.username) === charadex.tools.scrub(username)
    );

    if (!userProfile) {
      console.log('User profile not found in inventory');
      return;
    }

    // Look for coins in the user's inventory
    // Coins could be stored as 'coins', 'Coins', 'coin', or 'Coin'
    const coinAmount = userProfile.coins || userProfile.Coins || userProfile.coin || userProfile.Coin || 0;

    // Display the coin balance in the shop header
    displayCoinBalance(coinAmount, username);
  } catch (error) {
    console.error('Error loading user coin balance:', error);
  }
}

/**
 * Display the coin balance in the shop UI
 */
function displayCoinBalance(amount, username) {
  // Find the welcome message div
  const welcomeDiv = document.querySelector('.px-4.text-muted');

  if (!welcomeDiv) {
    return;
  }

  // Create a coin balance display element
  const coinBalanceDiv = document.createElement('div');
  coinBalanceDiv.className = 'card bg-faded p-3 mt-3 d-flex flex-row justify-content-between align-items-center';
  coinBalanceDiv.innerHTML = `
    <div>
      <strong>${username}</strong>'s Balance
    </div>
    <div class="h5 mb-0">
      <strong>${amount}</strong>
      <img src="assets/coin.png" alt="coins" style="height: 1.5em; width: 1.5em; vertical-align: middle; margin-left: 0.25em;">
    </div>
  `;

  // Insert the coin balance after the welcome message
  welcomeDiv.parentNode.insertBefore(coinBalanceDiv, welcomeDiv.nextSibling);
}
