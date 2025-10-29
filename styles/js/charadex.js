/* ==================================================================== */
/* Import Charadex
======================================================================= */
import { charadex } from './list.js';

/* ==================================================================== */
/* Initialize
/* ====================================================================  /

  This is where the real magic happens
    
======================================================================= */
charadex.initialize = {};


/* ==================================================================== */
/* Page
======================================================================= */
charadex.initialize.page = async (dataArr, config, dataCallback, listCallback, customPageUrl = false) => {

  if (!config) return console.error('No configuration added.');

  // Set up
  let selector = config.dexSelector;
  let pageUrl = customPageUrl || charadex.url.getPageUrl(config.sitePage);
  const setControlsVisibility = (shouldShow) => {
    if (!config.hideControlsOnProfile) return;
    const controls = document.querySelector(`#${selector}-gallery .charadex-controls`);
    if (!controls) return;
    controls.style.display = shouldShow ? '' : 'none';
  };
  const hideProfileControls = () => setControlsVisibility(false);

  // Add folders, filters & search
  let folders = config.fauxFolder?.toggle ?? false ? charadex.listFeatures.fauxFolders(pageUrl, typeof config.fauxFolder.parameters === 'function' ? config.fauxFolder.parameters() : config.fauxFolder.parameters, selector) : false;
  let filters = config.filters?.toggle ?? false ? charadex.listFeatures.filters(typeof config.filters.parameters === 'function' ? config.filters.parameters() : config.filters.parameters, selector) : false;
  let search = config.search?.toggle ?? false ? charadex.listFeatures.search(config.search.parameters, config.search.filterToggle, selector) : false;

  // Get our data
  let charadexData = dataArr || await charadex.importSheet(config.sheetPage);

  // Add profile information
  for (let entry of charadexData) {
    charadex.tools.addProfileLinks(entry, pageUrl, config.profileProperty); // Go ahead and add profile keys just in case
    if (folders) folders(entry, config.fauxFolder.folderProperty); // If folders, add folder info
    if (entry.rarity) entry.raritybadge = `<span class="badge badge-${charadex.tools.scrub(entry.rarity)}">${entry.rarity}</span>`; // Adds a rarity badge
  }

  // If there's related data, add it
  if (config.relatedData) {
    // Load all related data in parallel
    const relatedDataPromises = [];
    const relatedDataConfigs = [];
    
    for (let page in config.relatedData) {
      relatedDataPromises.push(charadex.importSheet(page));
      relatedDataConfigs.push({
        page: page,
        config: config.relatedData[page]
      });
    }
    
    // Wait for all related data to load
    const relatedDataResults = await Promise.all(relatedDataPromises);
    
    // Process the related data
    for (let i = 0; i < relatedDataResults.length; i++) {
      const relatedData = relatedDataResults[i];
      const relatedConfig = relatedDataConfigs[i];
      
      await charadex.manageData.relateData(
        charadexData, 
        relatedConfig.config.primaryProperty, 
        relatedConfig.page, 
        relatedConfig.config.relatedProperty
      );
    }
  }

  // Initialize the list
  let list = charadex.buildList(selector);

  // Let us manipulate the data before it gets to the list
  if (typeof dataCallback === 'function') {
    await dataCallback(charadexData);
  }

  /* Sort the Dex */
  if (config.sort?.toggle ?? false) {
    charadexData = charadex.manageData.sortArray(
      charadexData, 
      config.sort.sortProperty, 
      config.sort.order,
      config.sort.parametersKey,
      typeof config.sort.parameters === 'function' ? config.sort.parameters() : config.sort.parameters,
    );
  }

  // Create Profile
  const createProfile = async () => {

    // If they dont need to render a profile, don't
    if (config.profileToggle !== undefined && !config.profileToggle) return false;

    let profileArr = list.getProfile(charadexData);
    if (!profileArr) {
      charadex.tools.resetPageTitle();
      return false;
    }

    const profileEntry = profileArr[0] || null;
    if (profileEntry) {
      const titleProperties = [
        config.profileTitleProperty,
        config.profileProperty,
        'profileid',
        'title',
        'name'
      ];
      let profileTitle = '';
      for (const key of titleProperties) {
        if (!key) continue;
        const value = profileEntry[key];
        if (value) {
          profileTitle = value;
          break;
        }
      }
      if (typeof config.profileTitleFormatter === 'function') {
        try {
          const formatted = config.profileTitleFormatter(profileEntry, profileTitle);
          if (formatted) profileTitle = formatted;
        } catch (error) {
          console.warn('profileTitleFormatter failed:', error);
        }
      }
      charadex.tools.setPageTitleSuffix(profileTitle);
    } else {
      charadex.tools.resetPageTitle();
    }

    if (config.prevNext?.toggle ?? false) {
      charadex.listFeatures.prevNextLink(pageUrl, charadexData, profileArr, selector);
    }
    
    /* Create Profile */
    hideProfileControls();
    let profileList = list.initializeProfile(profileArr);

    // Return those values on Callback
    if (typeof listCallback === 'function') {
      await listCallback({
        type: 'profile',
        pageUrl: pageUrl,
        array: charadexData,
        profileArray: profileArr,
        list: profileList
      })
    }

    return true;

  }

  // If there's a profile, nyoom
  if (await createProfile()) return;

  // Create Gallery
  const createGallery = async () => {

    charadex.tools.resetPageTitle();
    setControlsVisibility(true);

    // Add additional list junk
    let additionalListConfigs = {};

    // Filter by parameters
    charadexData = charadex.manageData.filterByPageParameters(charadexData);

    // Add Pagination
    if (config.pagination?.toggle ?? false) {
      let pagination = charadex.listFeatures.pagination(charadexData.length, config.pagination.amount, config.pagination.bottomToggle, selector);
      if (pagination) additionalListConfigs = { ...additionalListConfigs, ...pagination };
    }

    // Initialize Gallery
    let galleryList = list.initializeGallery(charadexData, additionalListConfigs);

    // Initialize filters and search
    if ((config.filters?.toggle ?? false) && filters) {
      filters.initializeFilters(galleryList);
    }
    if ((config.search?.toggle ?? false) && search) search.initializeSearch(galleryList);

    // Return those values on Callback
    if (typeof listCallback === 'function') {
      await listCallback({
        type: 'gallery',
        pageUrl: pageUrl,
        array: charadexData,
        list: galleryList,
      })
    }

    return true;

  }

  // Else the gallery nyooms instead
  return await createGallery();

}



/* ==================================================================== */
/* Grouped Gallery (Mostly for inventory items)
======================================================================= */
charadex.initialize.groupGallery = async function (config, dataArray, groupBy, customPageUrl = false) {

  /* Check the Configs */
  if (!config) return console.error(`No config added.`);
  
  /* Get some stuff we'll need */
  let selector = config.dexSelector;
  const pageUrl = customPageUrl || charadex.url.getPageUrl(config.sitePage);

  // Add filters & Search
  let filters = config.filters?.toggle ?? false ? charadex.listFeatures.filters(typeof config.filters.parameters === 'function' ? config.filters.parameters() : config.filters.parameters, selector) : false;
  let search = config.search?.toggle ?? false ? charadex.listFeatures.search(config.search.parameters, config.search.filterToggle, selector) : false;

  /* Attempt to Fetch the data */
  let charadexData = dataArray;

  // Add profile information
  for (let entry of charadexData) {
    charadex.tools.addProfileLinks(entry, pageUrl, config.profileProperty);
  }

  /* Sort the Dex */
  if (config.sort?.toggle ?? false) {
    charadexData = charadex.manageData.sortArray(
      charadexData, 
      config.sort.sortProperty, 
      config.sort.order,
      config.sort.parametersKey,
      typeof config.sort.parameters === 'function' ? config.sort.parameters() : config.sort.parameters,
    );
  }

  /* Attempt deal with gallery
  ======================================================================= */
  const handleGallery = () => {

    if (!charadex.tools.checkArray(charadexData)) return false;

    // Filter by parameters
    charadexData = charadex.manageData.filterByPageParameters(charadexData);

    // Group data
    const groupArray = charadex.tools.groupBy(
      charadexData,
      entry => entry[groupBy]
    );

    // Create base selectors
    let itemSelector =  { item: `${selector}-gallery-item` };
    let containerSelector =  `${selector}-gallery`;

    for (let group in groupArray) {

      //Create the list selector
      let groupListSelector = charadex.tools.scrub(group);
      
      // Create the DOM elements
      let groupElement = $(`#${selector}-group-list`).clone();
      groupElement.removeAttr('id');
      groupElement.find(`.${selector}-list`).addClass(`${groupListSelector}-list`);
      groupElement.find(`.${selector}-group-title`).text(group);
      $(`#${selector}-group`).append(groupElement);
      
      // Build list based on group
      let groupListManager = charadex.buildList(groupListSelector);
      let groupList = groupListManager.initializeGallery(groupArray[group], itemSelector, containerSelector);

      // Add filters & Search
      if ((config.filters?.toggle ?? false) && filters) filters.initializeFilters(groupList);
      if ((config.search?.toggle ?? false) && search) search.initializeSearch(groupList);

    }

    return true;

  };

  return handleGallery();

};

export { charadex };
