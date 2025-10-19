/* ==================================================================== */
/* Charadex
=======================================================================  /

  The charadex namespace. You can use it if you like, but this should
  prevent charadex from messing with any other imported code.
    
======================================================================= */
let charadex = {};

/* ==================================================================== */
/* Site
/* If you don't want to hard code your site information, you
/* can fill this out instead
/* Any preview links will still show Charadex's information
/* ==================================================================== */
charadex.site = {
  title: "Pufflings",
  url: "",
  description: `Welcome to the Puffling ARPG! Pufflings are a mysterious, fluffy creature, believed to be a descendants of legendary dragons.`
}

// Automatically set the site URL based on environment
const isLocalhost = window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost";
charadex.site.url = isLocalhost
  ? "http://127.0.0.1:5500/"
  : "https://pufflings.github.io/Masterlist/";

/* ==================================================================== */
/* Sheet Config
/* Your sheet configuration
/* ==================================================================== */
charadex.sheet = {

  id: "1-CiEaVNos8-pKPM_MlXBEG67VmqeFwtxrw0whnaSwNY",

  pages: {
    masterlist: "Pufflings",
    masterlistTraits: "Puffling Traits",
    masterlistLog: "masterlist log",
    seekers: "seekers",
    inventory: "inventory",
    inventoryLog: "inventory log",
    items: "items",
    traits: "traits",
    prompts: "prompts",
    mainstory: "Main Story",
    faq: "faq",
    staff: "mods",
    options: "OptionsSheet", 
    carousel: "carousel",
    traitItems: "Trait items",
    news: "news",
  },

  options: {
    // These will be loaded from the sheet
    designTypes: [],
    statuses: [],
    rarity: [],
    species: [],
    itemTypes: [],
    traitTypes: []
  }

}

/* ==================================================================== */
/* Load Options from Sheet
/* ==================================================================== */
charadex.loadOptions = async () => {
  try {
    // Load options from the sheet
    const optionsData = await charadex.importSheet(charadex.sheet.pages.options);
    
    // Process the options data
    for (let option of optionsData) {
      if (option.optiontype && option.values) {
        const optionType = option.optiontype.replace(/\s/g, "");
        const values = option.values.split(',').map(v => v.trim());
        
        // Add 'All' option to the beginning of each array
        values.unshift('All');
        
        // Update the options in charadex.sheet.options
        if (charadex.sheet.options.hasOwnProperty(optionType)) {
          charadex.sheet.options[optionType] = values;
        }
      }
    }
    
    // Only log in development mode
    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
      console.log('Options loaded from sheet:', charadex.sheet.options);
    }
  } catch (error) {
    console.error('Error loading options from sheet:', error);
    // Fallback to default options if sheet loading fails
    // charadex.sheet.options = {
    //   designTypes: ['All', 'Official Design', 'Guest Design', 'MYO Slot', 'MYO Design'],
    //   statuses: ['All', 'Resell', 'Trade', 'Gift', 'Voided', 'For Sale', 'Purchased'],
    //   rarity: ['All', 'Common', 'Uncommon', 'Rare', 'Super Rare', 'Exclusive'],
    //   species: ['All', 'Dog', 'Cat', 'Bunny'],
    //   itemTypes: ['All', 'Currency', 'MYO Slot', 'Pet', 'Trait', 'Misc'],
    //   traitTypes: ['All', 'Ears', 'Eyes', 'Body', 'Limbs', 'Tails', 'Misc', 'Mutations']
    // };
  }
};

/* ==================================================================== */
/* Preload Critical Data
/* ==================================================================== */
charadex.preloadCriticalData = async () => {
  try {
    // Start loading critical data immediately when the page starts loading
    const criticalPages = [
      charadex.sheet.pages.options,
      charadex.sheet.pages.masterlist,
      charadex.sheet.pages.items,
      charadex.sheet.pages.traits
    ];
    
    // Load critical data in parallel
    const preloadPromises = criticalPages.map(page => 
      charadex.importSheet(page).catch(err => {
        console.warn(`Failed to preload ${page}:`, err);
        return null;
      })
    );
    
    Promise.all(preloadPromises);
    
  } catch (error) {
    console.warn('Preload failed:', error);
  }
};


/* ==================================================================== */
/* Page configuration
/* ==================================================================== */
charadex.page = {};


/* Item Catalogue
/* --------------------------------------------------------------- */
charadex.page.items = {

  sheetPage: charadex.sheet.pages.items,
  sitePage: 'items',
  dexSelector: 'charadex',
  profileProperty: 'item',

  sort: {
    toggle: true,
    key: "id",
    order: "asc",
    parameters: []
  },

  pagination: {
    toggle: true,
    bottomToggle: true,
    amount: 24,
  },

  filters: {
    toggle: true,
    parameters: () => ({
      'Type': charadex.sheet.options.itemTypes,
      'Rarity': charadex.sheet.options.rarity,
    })
  },

  fauxFolder: {
    toggle: false,
    folderProperty: 'Type',
    parameters: () => charadex.sheet.options.itemTypes,
  },

  search: {
    toggle: true,
    filterToggle: false,
    parameters: ['All', 'Item', 'Rarity']
  },

  prevNext: {
    toggle: true,
  },

};


/* Traits
/* --------------------------------------------------------------- */
charadex.page.traits = {

  sheetPage: charadex.sheet.pages.traits,
  sitePage: 'traits',
  dexSelector: 'charadex',
  profileProperty: 'trait',

  sort: {
    toggle: true,
    key: "id",
    order: "asc",
    parameters: []
  },

  pagination: {
    toggle: true,
    bottomToggle: true,
    amount: 24,
  },

  filters: {
    toggle: true,
    parameters: () => ({
      'Type': charadex.sheet.options.traitTypes,
      'Rarity': charadex.sheet.options.rarity,
    })
  },

  fauxFolder: {
    toggle: false,
    folderProperty: 'Type',
    parameters: () => charadex.sheet.options.rarity,
  },

  search: {
    toggle: true,
    filterToggle: false,
    parameters: ['All', 'Trait', 'Rarity']
  },

  prevNext: {
    toggle: true,
  },

};


/* Prompts
/* --------------------------------------------------------------- */
charadex.page.prompts = {

  sheetPage: charadex.sheet.pages.prompts,
  sitePage: 'prompts',
  dexSelector: 'charadex',
  profileProperty: 'title',

  sort: {
    toggle: true,
    key: "enddate",
    order: "asc",
    parameters: []
  },

  pagination: {
    toggle: true,
    bottomToggle: true,
    amount: 12,
  },

  filters: {
    toggle: false,
    parameters: {
      'archived': ['Active', 'Archived'],
    }
  },

  fauxFolder: {
    toggle: true,
    folderProperty: 'folder',
    parameters: () => ['All', 'Active', 'Archived'],
  },

  search: {
    toggle: true,
    filterToggle: false,
    parameters: ['Title']
  },

  prevNext: {
    toggle: false,
  },

};


/* Main Story
/* --------------------------------------------------------------- */
charadex.page.mainstory = {

  sheetPage: charadex.sheet.pages.mainstory,
  sitePage: 'mainstory',
  dexSelector: 'charadex',
  profileProperty: 'title',

  sort: {
    toggle: true,
    key: "title",
    order: "asc",
    parameters: []
  },

  pagination: {
    toggle: true,
    bottomToggle: true,
    amount: 12,
  },

  filters: {
    toggle: false,
    parameters: {
      'new': ['New', 'Previous'],
    }
  },

  fauxFolder: {
    toggle: true,
    folderProperty: 'folder',
    parameters: () => ['All', 'New', 'Previous'],
  },

  search: {
    toggle: true,
    filterToggle: false,
    parameters: ['Title']
  },

  prevNext: {
    toggle: false,
  },

};

/* News
/* --------------------------------------------------------------- */
charadex.page.news = {

  sheetPage: charadex.sheet.pages.news,
  sitePage: 'news',
  dexSelector: 'charadex',
  profileProperty: 'title',

  sort: {
    toggle: true,
    key: "id",
    order: "desc",
    parameters: []
  },

  pagination: {
    toggle: false,
    bottomToggle: false,
    amount: 6,
  },

  filters: {
    toggle: false,
    parameters: {}
  },

  fauxFolder: {
    toggle: false,
    folderProperty: '',
    parameters: [],
  },

  search: {
    toggle: false,
    filterToggle: false,
    parameters: []
  },

  prevNext: {
    toggle: false,
  },

};


/* Staff
/* --------------------------------------------------------------- */
charadex.page.staff = {

  sheetPage: charadex.sheet.pages.staff,
  sitePage: 'inventories',
  dexSelector: 'charadex',
  profileProperty: 'username',

  sort: {
    toggle: false,
    key: "username",
    order: "asc",
    parameters: []
  },

  pagination: {
    toggle: false,
    bottomToggle: false,
    amount: 12,
  },

  filters: {
    toggle: false,
    parameters: {
      'TBA': [],
    }
  },

  fauxFolder: {
    toggle: false,
    folderProperty: '',
    parameters: [],
  },

  search: {
    toggle: true,
    filterToggle: false,
    parameters: ['Username']
  },

  prevNext: {
    toggle: false,
  },

};


/* FAQ
/* --------------------------------------------------------------- */
charadex.page.faq = {

  sheetPage: charadex.sheet.pages.faq,
  sitePage: 'faq',
  dexSelector: 'charadex',
  profileProperty: 'id',

  sort: {
    toggle: false,
    key: "id",
    order: "asc",
    parameters: []
  },

  pagination: {
    toggle: true,
    bottomToggle: true,
    amount: 12,
  },

  filters: {
    toggle: false,
    parameters: {
      'TBA': [],
    }
  },

  fauxFolder: {
    toggle: false,
    folderProperty: '',
    parameters: [],
  },

  search: {
    toggle: true,
    filterToggle: true,
    parameters: ['All', 'Question', 'Answer', 'Tags']
  },

  prevNext: {
    toggle: false,
  },

}



/* Masterlist
/* --------------------------------------------------------------- */
charadex.page.masterlist = {

  sheetPage: charadex.sheet.pages.masterlist,
  sitePage: 'masterlist',
  dexSelector: 'charadex',
  profileProperty: 'design',

  sort: {
    toggle: true,
    key: "id",
    order: "desc",
    parameters: []
  },

  pagination: {
    toggle: true,
    bottomToggle: true,
    amount: 12,
  },

  filters: {
    toggle: false,
    parameters: () => ({
       'Species': charadex.sheet.options.species,
       'Type': charadex.sheet.options.designTypes,
      // 'Status': charadex.sheet.options.statuses,
      // 'Rarity': charadex.sheet.options.rarity,
    })
  },

  fauxFolder: {
    toggle: true,
    folderProperty: 'Species',
    parameters: () => charadex.sheet.options.species,
  },

  search: {
    toggle: true,
    filterToggle: true,
    parameters: ['All', 'Design', 'Owner', 'Designer', 'Artist']
  },

  prevNext: {
    toggle: true,
  },

  relatedData: {

    [charadex.sheet.pages.masterlistLog]: {

      sheetPage: charadex.sheet.pages.masterlistLog,
      primaryProperty: 'id',
      relatedProperty: 'id',
      dexSelector: 'log',
      profileProperty: 'design',
      profileToggle: false,

      sort: {
        toggle: true,
        key: "timestamp",
        order: "desc",
        parameters: []
      },

      pagination: {
        toggle: true,
        bottomToggle: false,
        amount: 12,
      },

    },

    [charadex.sheet.pages.masterlistTraits]: {

      sheetPage: charadex.sheet.pages.masterlistTraits,
      primaryProperty: 'design',
      relatedProperty: 'id',
      dexSelector: 'traits',
      profileProperty: 'trait',
      profileToggle: false,

      sort: {
        toggle: true,
        key: "trait",
        order: "asc",
        parameters: []
      },

      pagination: {
        toggle: false,
        bottomToggle: false,
        amount: 50,
      },

    }

  }

};

/* Seekers
/* --------------------------------------------------------------- */
charadex.page.seekers = {

  sheetPage: charadex.sheet.pages.seekers,
  sitePage: 'seekers',
  dexSelector: 'charadex',
  profileProperty: 'design',

  sort: {
    toggle: true,
    key: "id",
    order: "desc",
    parameters: []
  },

  pagination: {
    toggle: true,
    bottomToggle: true,
    amount: 12,
  },

  filters: {
    toggle: false,
    parameters: () => ({
      'Design Type': charadex.sheet.options.designTypes,
      'Status': charadex.sheet.options.statuses,
      'Rarity': charadex.sheet.options.rarity,
    })
  },

  fauxFolder: {
    toggle: false,
    folderProperty: 'Type',
    parameters: () => charadex.sheet.options.designTypes,
  },

  search: {
    toggle: true,
    filterToggle: true,
    parameters: ['All', 'Design', 'Owner', 'Designer', 'Artist']
  },

  prevNext: {
    toggle: true,
  },

};

/* Inventory
/* --------------------------------------------------------------- */
charadex.page.inventory = {

  // Dex Set Up
  sheetPage: charadex.sheet.pages.inventory,
  sitePage: 'inventories',
  dexSelector: 'charadex',
  profileProperty: 'username',

  // Dex Options
  sort: {
    toggle: true,
    sortProperty: "username",
    order: "asc",
    parameters: [],
    caseSensitive: false
  },

  pagination: {
    toggle: true,
    bottomToggle: true,
    amount: 24,
  },

  filters: {
    toggle: false,
    parameters: {}
  },

  fauxFolder: {
    toggle: false,
    folderProperty: '',
    parameters: [],
  },

  search: {
    toggle: true,
    filterToggle: false,
    parameters: ['Username']
  },

  prevNext: {
    toggle: false,
  },


  // Related Data
  relatedData: {

    [charadex.sheet.pages.inventoryLog]: {

      sheetPage: charadex.sheet.pages.inventoryLog,
      sitePage: 'inventories',
      primaryProperty: 'username',
      relatedProperty: 'username',
      dexSelector: 'log',
      profileProperty: 'id',
      profileToggle: false,

      pagination: {
        toggle: true,
        bottomToggle: false,
        amount: 12,
      },

    },
    

    [charadex.sheet.pages.masterlist]: {

      // This imports the config from the masterlist
      // So you dont have to repeat yourself
      ...charadex.page.masterlist, 

      sheetPage: charadex.sheet.pages.masterlist,
      sitePage: 'masterlist',
      primaryProperty: 'username',
      relatedProperty: 'owner',
      dexSelector: 'designs',
      profileProperty: 'design',
      profileToggle: false,

    },

    [charadex.sheet.pages.seekers]: {

      // This imports the config from the seekers
      // So you dont have to repeat yourself
      ...charadex.page.seekers, 

      sheetPage: charadex.sheet.pages.seekers,
      sitePage: 'seekers',
      primaryProperty: 'username',
      relatedProperty: 'owner',
      dexSelector: 'seekers',
      profileProperty: 'design',
      profileToggle: false,

    }

  },

  
  // This is a special config for their inventory
  inventoryConfig: {

    sheetPage: charadex.sheet.pages.items,
    sitePage: 'items',
    dexSelector: 'inventory',
    profileProperty: 'item',
    profileToggle: false,

    sort: {
      toggle: true,
      sortProperty: "item",
      order: "asc",
      parametersKey: 'type', 
      parameters: () => charadex.sheet.options.itemTypes
    },

    search: {
      toggle: true,
      filterToggle: false,
      parameters: ['Item']
    },

    filters: {
      toggle: true,
      parameters: () => ({
        'Type': charadex.sheet.options.itemTypes,
        'Rarity': charadex.sheet.options.rarity,
      })
    },

  }

};


/* Index
/* --------------------------------------------------------------- */
charadex.page.index = {

  prompts: {
    ... charadex.page.prompts,
    dexSelector: 'prompt',
    amount: 3,
  },

  staff: {
    ... charadex.page.staff,
    dexSelector: 'staff',
    amount: 6,
  },

  designs: {
    ... charadex.page.masterlist,
    dexSelector: 'design',
    amount: 4,
  },

  news: {
    ... charadex.page.news,
    dexSelector: 'news',
    amount: 3,
  }

};


export { charadex };