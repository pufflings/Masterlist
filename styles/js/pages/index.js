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


  /* News
  ===================================================================== */
  let news = await charadex.initialize.page(null, charadex.page.index.news, (arr) => {
    
    // Filter out hidden news items (hide: TRUE or 'TRUE' or true)
    arr.splice(0, arr.length, ...arr.filter(newsItem => {
      return !newsItem.hide || newsItem.hide === 'FALSE' || newsItem.hide === false || newsItem.hide === 'false' || newsItem.hide === 0 || newsItem.hide === '0';
    }));
    
    // Show all news items (no limit for horizontal scrolling)

  }, (listData) => {
    let backgroundElement = $('.news-list .cd-prompt-background');
    
    // Set background images for news cards
    backgroundElement.each(function(i) {
      const image = listData.array[i]?.image;
      if (image) {
        $(this).attr('style', `background-image: url(${image})`);
      }
    });
    
    // Add NEW! badges and handle links
    if (listData.type == 'gallery') {
      setTimeout(() => {
        listData.array.forEach((newsItem) => {
          $('.news-list .news-item > .card.h-100').each(function () {
            const titleLink = $(this).find('.card-header a');
            if (titleLink.text().trim() === (newsItem.title || '').trim()) {
              
              // Add NEW! button if news item is new
              if (newsItem.new === true || newsItem.new === 'TRUE') {
                // Remove any existing NEW! button first
                $(this).find('.new-badge').remove();
                
                // Add NEW! button next to the title
                const newBadge = $('<span class="new-badge badge badge-danger ml-2">NEW!</span>');
                titleLink.after(newBadge);
              } else {
                // Remove NEW! button if not new
                $(this).find('.new-badge').remove();
              }
              
              // Handle links
              if (newsItem.link) {
                titleLink.attr('href', newsItem.link);
                titleLink.attr('target', '_blank');
                
                // Make the background image clickable too
                const backgroundDiv = $(this).find('.cd-prompt-background');
                backgroundDiv.css('cursor', 'pointer');
                backgroundDiv.off('click').on('click', function() {
                  window.open(newsItem.link, '_blank');
                });
                
                // Update footer link
                const footerLink = $(this).find('.card-footer .link');
                footerLink.attr('href', newsItem.link);
                footerLink.attr('target', '_blank');
              }
            }
          });
        });
      }, 100);
    }
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
        entry.ownerlink = `inventories.html?profile=${ownerProfile}`;
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