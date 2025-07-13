/* ==================================================================== */
/* Import Charadex
======================================================================= */
import { charadex } from '../charadex.js';


/* ==================================================================== */
/* Load
======================================================================= */
document.addEventListener("DOMContentLoaded", async () => {

  /* Prompts
  ===================================================================== */
  let prompts = await charadex.initialize.page(null, charadex.page.index.prompts, (arr) => {

      // Splice the silly little array
      let sliceAmount = charadex.page.index.prompts.amount || 4;
      arr.splice(sliceAmount, arr.length);

    }, (data) => {

      // Add the silly little prompt stuff here too
      $('.cd-prompt-background').each(function(i) {
        const element = $(this);
        const image = data.array[i]?.image;
        element.attr('style', `background-image: url(${image})`);
      });
      
    }
    
  );


  /* Staff
  ===================================================================== */
  let staff = await charadex.initialize.page(null, charadex.page.index.staff, (arr) => {
    
    // Splice the silly little array
    let sliceAmount = charadex.page.index.staff.amount || 6;
    arr.splice(sliceAmount, arr.length);

  });


  /* Designs
  ===================================================================== */
  let designs = await charadex.initialize.page(null, charadex.page.index.designs, (arr) => {
    
    // Filter out designs of type "slot" or "MYO Slot"
    arr.splice(0, arr.length, ...arr.filter(design => {
      const designType = design.type || design['Design Type'] || '';
      return !designType.toLowerCase().includes('slot');
    }));
    
    // Get the latest X items from the array
    let sliceAmount = charadex.page.index.designs.amount || 6;

    if (arr.length > sliceAmount) {
      arr.splice(0, arr.length - sliceAmount);
    }
    // Set ownerlink for each design
    for (let entry of arr) {
      if (entry.owner) {
        let ownerProfile = entry.owner.toLowerCase().replace(/\s+/g, '');
        entry.ownerlink = `/inventories.html?profile=${ownerProfile}`;
      }
    }

  });
    await charadex.loadOptions();
  
      /* Carousel
  ===================================================================== */
    // Load carousel data from sheet
    const carouselData = await charadex.importSheet(charadex.sheet.pages.carousel);
  
    // Filter out hidden images (hide: TRUE or 'TRUE' or true)
    const visibleSlides = carouselData.filter(slide =>
      !slide.hide || slide.hide === 'FALSE' || slide.hide === false || slide.hide === 'false' || slide.hide === 0 || slide.hide === '0'
    );
  
    // Build carousel indicators and items
    let indicators = '';
    let items = '';
    visibleSlides.forEach((slide, i) => {
      // indicators += `<li data-target="#pufflingCarousel" data-slide-to="${i}"${i === 0 ? ' class="active"' : ''}></li>`;
      items += `
        <div class="carousel-item${i === 0 ? ' active' : ''}">
          <a href="${slide.link || '#'}" target="_blank">
            <img src="${slide.image}" class="d-block w-100 rounded" alt="${slide.alt || ''}">
          </a>
        </div>
      `;
    });
  
    // Insert into the DOM
    const ind = document.getElementById('pufflingCarouselIndicators');
    const inn = document.getElementById('pufflingCarouselInner');
    if (ind && inn) {
      // Dispose of any previous carousel instance
      if ($('#pufflingCarousel').data('bs.carousel')) {
        $('#pufflingCarousel').carousel('dispose');
      }
      // Insert new HTML
      // ind.innerHTML = indicators;
      inn.innerHTML = items;
      // Initialize carousel
      $('#pufflingCarousel').carousel({ interval: 5000, wrap: true });
      $('#pufflingCarousel').carousel(0); // Go to the first slide
    } else {
      console.error('Carousel container elements not found in DOM!');
    }


  /* Load Page
  ===================================================================== */
  charadex.tools.loadPage('.softload', 500);

});