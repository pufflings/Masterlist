/* ==================================================================== */
/* Import Charadex
======================================================================= */
import { charadex } from './config.js';

// Make charadex globally available for inline handlers
window.charadex = charadex;


/* ==================================================================== */
/* Tools
=======================================================================  /

  A bunch of tools I made for the dex to ease my woes
    
======================================================================= */
charadex.tools = {

  // Store canonical page title so we can restore it later
  basePageTitle: null,

  // Scrub
  // Scrubs data so its all lowercase with no spaces
  scrub(str) {
    if (!str) return str;
    if (!isNaN(str)) return Number(str);
    return str.toLowerCase().replace(/[^a-z0-9]/g, "");
  },

  // Similar to scrub
  // Scrubs data so its all lowercase with no spaces
  createKey(str) {
    if (!str) return str;
    return String(str).toLowerCase().replaceAll(" ", "");
  },

  // Create Select Options
  // Creates select options from an array
  createSelectOptions(optionArray) {
    let options = [];
    for (let value of optionArray) {
      options.push(`<option value="${charadex.tools.scrub(value)}">${value}</option>`);
    };
    return options;
  },

  // Fetch the current <title> element
  _getTitleElement() {
    return document.querySelector('title');
  },

  // Capture and return the original page title
  getBasePageTitle() {
    if (typeof this.basePageTitle === 'string' && this.basePageTitle.length > 0) {
      return this.basePageTitle;
    }
    const titleElement = this._getTitleElement();
    const currentTitle = (titleElement?.textContent || document.title || '').trim();
    this.basePageTitle = currentTitle;
    return this.basePageTitle;
  },

  // Update the document title and matching meta tag
  setPageTitle(newTitle = '') {
    const safeTitle = (newTitle || '').toString();
    const titleElement = this._getTitleElement();
    if (titleElement) {
      titleElement.textContent = safeTitle;
    }
    document.title = safeTitle;
    const metaTitle = document.querySelector('meta[name="title"]');
    if (metaTitle) {
      metaTitle.setAttribute('content', safeTitle);
    }
  },

  // Apply a suffix to the base page title (e.g., profile views)
  setPageTitleSuffix(suffix, separator = ' - ') {
    const baseTitle = this.getBasePageTitle();
    if (!baseTitle) return;
    const trimmedSuffix = typeof suffix === 'string' ? suffix.trim() : suffix;
    const fullTitle = trimmedSuffix ? `${baseTitle}${separator}${trimmedSuffix}` : baseTitle;
    this.setPageTitle(fullTitle);
  },

  // Restore page title to its original value
  resetPageTitle() {
    const baseTitle = this.getBasePageTitle();
    if (baseTitle) {
      this.setPageTitle(baseTitle);
    }
  },

  // Determine how many directory levels away from the site root the current page is
  getBasePath() {
    if (this._cachedBasePath !== undefined) return this._cachedBasePath;

    const path = window.location.pathname.replace(/\\/g, '/');
    const segments = path.split('/').filter(Boolean);
    const rootMarkers = ['Masterlist_v2', 'Masterlist'];
    let rootIndex = -1;

    for (const marker of rootMarkers) {
      const candidate = segments.lastIndexOf(marker);
      if (candidate !== -1) {
        rootIndex = candidate;
        break;
      }
    }

    let depth = 0;
    if (rootIndex !== -1) {
      depth = Math.max(segments.length - (rootIndex + 1) - 1, 0);
    } else if (path.toLowerCase().includes('/prompts/')) {
      depth = 1;
    }

    this._cachedBasePath = depth > 0 ? '../'.repeat(depth) : '';
    return this._cachedBasePath;
  },

  // Prefix relative URLs with the current base path
  resolveRelativeUrl(url) {
    if (!url) return url;
    if (/^(?:[a-z]+:|\/\/|#|\?|mailto:|tel:)/i.test(url)) return url;
    if (url.startsWith('../') || url.startsWith('./') || url.startsWith('/')) return url;
    return this.getBasePath() + url;
  },

  // Apply the base path adjustments to anchor and image elements within the supplied root
  applyBasePath(root) {
    const scope = root && typeof root.querySelectorAll === 'function' ? root : document;
    const adjustAttribute = (selector, attr) => {
      scope.querySelectorAll?.(selector).forEach((element) => {
        const current = element.getAttribute(attr);
        const resolved = charadex.tools.resolveRelativeUrl(current);
        if (resolved && resolved !== current) {
          element.setAttribute(attr, resolved);
        }
      });
    };

    adjustAttribute('a[href]', 'href');
    adjustAttribute('img[src]', 'src');
    adjustAttribute('link[rel$="icon"][href]', 'href');
  },

  // Load files via include
  // Will replace the entire div
  loadIncludedFiles() {
    const applyBasePath = charadex.tools.applyBasePath.bind(charadex.tools);
    $(".load-html").each(function () {
      const placeholder = this;
      const datasetCopy = { ...placeholder.dataset };
      $.get(placeholder.dataset.source)
        .done(function (data) {
          const wrapper = document.createElement('div');
          wrapper.innerHTML = data;
          applyBasePath(wrapper);

          const fragment = document.createDocumentFragment();
          const nodes = Array.from(wrapper.childNodes);
          for (const node of nodes) {
            fragment.appendChild(node);
          }

          placeholder.replaceWith(fragment);
          applyBasePath(document);

          const firstElement = nodes.find(node => node.nodeType === Node.ELEMENT_NODE) || null;
          document.dispatchEvent(new CustomEvent('charadex:includeLoaded', {
            detail: {
              source: datasetCopy.source || '',
              dataset: datasetCopy,
              nodes,
              root: firstElement
            }
          }));

          const hasNestedIncludes = nodes.some((node) => {
            if (node.nodeType !== Node.ELEMENT_NODE) return false;
            if (node.classList?.contains('load-html')) return true;
            return typeof node.querySelector === 'function' && node.querySelector('.load-html');
          });

          if (hasNestedIncludes) {
            setTimeout(() => charadex.tools.loadIncludedFiles(), 0);
          }
        })
        .fail(function (error) {
          console.error('Failed to load include:', error);
        });
    });
  },

  // Load Page
  // Load selected areas
  loadPage(loadAreaSelector = '', timeout = 500, loadIconSelector = '#loading') {
    // Show loading indicator immediately
    if (loadIconSelector) {
      $(loadIconSelector).show();
    }
    
    setTimeout(function () {
      if (loadIconSelector) {
        $(loadIconSelector).hide();
      }
      if (loadAreaSelector) {
        $(loadAreaSelector).addClass('active');
      }
    }, timeout);
  },
  
  // Change meta information
  updateMeta() {
    try {
      let title =  $('title');
      let titleStr = title.text();
      if ((titleStr).includes('Charadex')) {
        titleStr = titleStr.replace('Charadex', charadex.site.title);
        title.text(titleStr);
        $('meta[name="title"]').attr("content", titleStr);
        $('meta[name="url"]').attr("content", charadex.site.url);
        $('meta[name="description"]').attr("content", charadex.site.description);
      }
      return;
    } catch (err) {
      return console.error(err);
    }
  },

  // Check Array
  // Check if array is actually an array and has info
  checkArray(arr) {
    return (arr && Array.isArray(arr) && arr.length > 0);
  },

  // Create list classes for List.JS
  // All things with the word 'image' will be made into images
  // And all things with the word 'link' will be made into links
  createListClasses(sheetArray) {
    let classArr = [...new Set(sheetArray.slice(0, 5).flatMap(Object.keys))];
    if (!classArr.includes('folder')) classArr.push('folder');
    let newArr = [];
    for (let i in classArr) {
      newArr[i] = classArr[i];
      if (classArr[i].includes('image') || classArr[i].includes('avatar') || classArr[i].includes('thumbnail')) {
        newArr[i] = { name: classArr[i], attr: 'src' };
      }
      if (classArr[i].includes('link') || classArr[i].includes('toyhouse')) {
        newArr[i] = { name: classArr[i], attr: 'href' };
      }
    }
    return newArr;
  },
  
  // Adds profile links
  addProfileLinks(entry, pageUrl, key = 1) {
    entry.profileid = entry[key];
    entry.profilelink = charadex.url.addUrlParameters(pageUrl, { profile: entry[key] });
    entry.imageprofilelink = entry.profilelink;
    
  },

  // Try to add the select picker
  addMultiselect (selectElement) {
    try {
      selectElement.selectpicker({
        noneSelectedText : `All`,
        style: '',
        styleBase: 'form-control'
      });
    } catch (err) { 
      console.error('Make sure the Multiselect CDN is in this file.') 
    }
  },

  // Clear all cached data
  clearCache() {
    try {
      const keys = Object.keys(localStorage);
      let clearedCount = 0;
      keys.forEach(key => {
        if (key.startsWith('charadex_')) {
          localStorage.removeItem(key);
          clearedCount++;
        }
      });
      return true;
    } catch (error) {
      console.warn('Cache clear failed:', error);
      return false;
    }
  },

  // Clear cache for specific sheet/page
  clearCacheFor(sheetPage, sheetId = charadex.sheet.id) {
    try {
      const cacheKey = `charadex_${sheetId}_${sheetPage}`;
      localStorage.removeItem(cacheKey);

    } catch (error) {
      console.warn('Cache clear failed:', error);
    }
  },

  // Performance monitoring
  performance: {
    timers: {},
    
    start(label) {
      this.timers[label] = performance.now();
    },
    
    end(label) {
      if (this.timers[label]) {
        const duration = performance.now() - this.timers[label];
        delete this.timers[label];
        return duration;
      }
      return 0;
    },
    
    log(label, message) {
      // Development logging disabled
    }
  }

}



/* ==================================================================== */
/* URL
=======================================================================  /

  We're keeping urls CLEAN this time i s2g
    
======================================================================= */
charadex.url = {

  // Returns the entire URL w/ parameters 
  // https://charadex.com/masterlist.html?param=value
  getUrl(url) {
    return new URL(url || window.location.href).href;
  },

  // Returns the base site URL
  // https://charadex.com
  getSiteUrl() {
    let host = window.location.protocol + window.location.host;
    if (host.includes('localhost')) {
      let fileName = window.location.pathname.split("/");
      fileName.pop();
      let baseFile = fileName.join("/");
      host += baseFile;
    } else if (!host.includes('localhost')) {
      host = charadex.site.url;
    }
    return charadex.url.getUrl(host);
  },

  // Returns the page URL
  // https://charadex.com/masterlist.html
  getPageUrl(page, url) {
    let pageUrl = url ?? charadex.url.getSiteUrl();
    return `${pageUrl.replace(/\/$/, '')}/${page}.html`
  },

  // Returns the parameters in object form
  // If you want a specific parameter, add 
  // { key: value }
  getUrlParameters(url) {
    return new URLSearchParams(url || window.location.search)
  },

  // Returns the parameters in object form
  // If you want a specific parameter, add 
  // { key: value }
  getUrlParametersObject(url, keys = false) {

    let params = charadex.url.getUrlParameters(url);
    if (params.size === 0) return false;

    let newObject = {};
    params.forEach((value, key) => {
      let newValue = !value ? '' : String(value).split(',').filter(function (i) { return i !== 'all' })
      if (charadex.tools.checkArray(newValue)) {
        if (charadex.tools.checkArray(keys)) {
          if (keys.includes(key)) newObject[key] = newValue;
        } else {
          newObject[key] = newValue;
        }
      }
    });

    return newObject;

  },

  // Adds parameters based on an object
  addUrlParameters(url, obj) {
    let params = '';
    for (let k in obj) params += `&${encodeURIComponent(charadex.tools.scrub(k))}=${encodeURIComponent(charadex.tools.createKey(obj[k]))}`;
    if (!url.includes('?')) params = '?' + params.substring(1);
    return url + params;
  },

}



/* ==================================================================== */
/* Data Processor
/* ====================================================================  /

    A library of functions you can use to manage the data
    received from the sheet
    
======================================================================= */
charadex.manageData = {

  /* Sort Array
  ===================================================================== */
  sortArray(sheetArray, property, order = 'asc', orderArrayKey, orderArray = false) {

    let sorted;

    if (charadex.tools.checkArray(orderArray)) {
      const orderMap = new Map(orderArray.map((item, index) => [item, index]));
      sorted = sheetArray.sort((a, b) => {
        const aIndex = orderMap.get(a[orderArrayKey]);
        const bIndex = orderMap.get(b[orderArrayKey]);
        return aIndex - bIndex;
      });
    } else {
      sorted = sheetArray.slice(0).sort(function (a, b) {
        const valA = String(a[property] || '').toLowerCase();
        const valB = String(b[property] || '').toLowerCase();
        return valA.localeCompare(valB, undefined, { numeric: true, sensitivity: 'base' });
      });
    }

    return charadex.tools.scrub(order) === 'asc' ? sorted : sorted.reverse();

  },

  /* Filter Array
  ===================================================================== */
  filterArray(sheetArray, criteria) {

    // Profiles have theri own filter so we want to omit them
    if (criteria.hasOwnProperty('profile')) delete criteria.profile;

    let filterArr = sheetArray.filter(function (item) {
      for (let key in criteria) {

        // Make the values into an array no matter what
        if(!charadex.tools.checkArray(criteria[key])) criteria[key] = [criteria[key]];

        // Scrub criteria
        criteria[key] = criteria[key].map(c => charadex.tools.scrub(c)).filter(c => c !== 'all');

        // If the item is an array, loop through it
        if (charadex.tools.checkArray(item[key])) {
          item[key] = item[key].map(i => charadex.tools.scrub(i));
          for (const name of criteria[key]) if (!item[key].includes(name)) return false;
        } 
        
        // Else check the string
        else if (!criteria[key].includes(charadex.tools.scrub(item[key]))) return false;

      }
      return true;
    });

    return filterArr;

  },

  /* Filter sheet by the page parameters
  ===================================================================== */
  filterByPageParameters(sheetArray) {

    let filterParams = charadex.url.getUrlParametersObject();
    if (!filterParams) return sheetArray;

    let filteredArray = charadex.manageData.filterArray(sheetArray, filterParams);

    return filteredArray;

  },

 /* Relates data to a main sheet via a key
  ===================================================================== */
  async relateData (primaryArray, primaryKey, secondaryPageName, secondaryKey) {

    let scrub = charadex.tools.scrub;
    let secondaryArray = await charadex.importSheet(secondaryPageName);

    for (let primaryEntry of primaryArray) {
      primaryEntry[scrub(secondaryPageName)] = [];
      for (let secondaryEntry of secondaryArray) {
        let secondaryDataArray = (secondaryEntry[secondaryKey] || '').split(',');
        for (let prop of secondaryDataArray) {
          if (scrub(primaryEntry[primaryKey]) === scrub(prop)) {
            primaryEntry[scrub(secondaryPageName)].push(secondaryEntry);
          }
        }
      }
    }

  },

  /* Fixes old style of inventories
  ===================================================================== */
  async inventoryFix(profileArray) {
    const items = await charadex.importSheet(charadex.sheet.pages.items);
    const inventoryData = [];

    for (const [property, value] of Object.entries(profileArray)) {
      if (value === '' || value === null || value === undefined) continue;
      const match = items.find(item => item.item === property);
      if (!match) continue;

      const entry = {
        ...match,
        quantity: value
      };

      if (entry.profilelink) {
        entry.imageprofilelink = entry.profilelink;
      }

      inventoryData.push(entry);
    }

    return inventoryData;
  },
  
  /* Adds profile links
  ===================================================================== */
  addProfileLinks(pageUrl, key, galleryArray) {
    for (let entry of galleryArray) {
      entry.profileid = entry[key];
      entry.profilelink = charadex.manage.url.addParameters(pageUrl, { profile: entry[key] });
    };
  }

}



/* ==================================================================== */
/* Import Sheet
/* ====================================================================  /

  Does what it says on the box.
    
======================================================================= */
charadex.importSheet = async (sheetPage, sheetId = charadex.sheet.id) => {

  if (!sheetId) return console.error('Missing sheetID.');
  if (!sheetPage) return console.error('Missing sheetPage.');

  charadex.tools.performance.start(`Loading ${sheetPage}`);

  // Check cache first
  const cacheKey = `charadex_${sheetId}_${sheetPage}`;
  const cacheExpiry = 5 * 60 * 1000; // 5 minutes cache
  
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const cachedData = JSON.parse(cached);
      if (Date.now() - cachedData.timestamp < cacheExpiry) {
        charadex.tools.performance.end(`Loading ${sheetPage}`);
        if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
          console.log(`Sheet page "${sheetPage}" served from cache:`, cachedData.data);
        }
        return cachedData.data;
      }
    }
  } catch (error) {
    console.warn('Cache read failed:', error);
  }

  // Fetch the sheet
  const importUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&headers=1&tq=WHERE A IS NOT NULL&sheet=${sheetPage}`;

  // Attempt to get it
  const sheetJSON = await fetch(importUrl).then(i => i.text()).catch(err => {
    return console.error(`${err} sheet. Please make sure that the sheet is public and that you're only using the ID.`);
  });

  // Parse the text
  const sliceJSON = JSON.parse(sheetJSON.substring(47).slice(0, -2));

  // Grab column headers
  const col = [];
  if (sliceJSON.table.cols[0].label) {
    for (let headers of sliceJSON.table.cols) {
      if (headers.label) col.push(headers.label.toLowerCase().replace(/\s/g, ""));
    };
  }

  // Scrubs columns and puts them in a readable object
  const scrubbedData = [];
  for (let info of sliceJSON.table.rows) {
    const row = {};
    const isBoolean = val => 'boolean' === typeof val;
    col.forEach((ele, ind) => {
        row[ele] = info.c[ind] != null ? 
        info.c[ind].f != null && !isBoolean(info.c[ind].v) ? 
        info.c[ind].f : info.c[ind].v != null ? 
        info.c[ind].v : "" : "";
    });
    scrubbedData.push(row);
  };

  // Filter out everything that says hide
  let publicData = scrubbedData.filter(i => !i['hide']);

  // Cache the data
  try {
    localStorage.setItem(cacheKey, JSON.stringify({
      data: publicData,
      timestamp: Date.now()
    }));
  } catch (error) {
    console.warn('Cache write failed:', error);
  }

  charadex.tools.performance.end(`Loading ${sheetPage}`);

  if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
    console.log(`Sheet page "${sheetPage}" loaded:`, publicData);
  }

  // Return Data
  return publicData;

};


export { charadex };
