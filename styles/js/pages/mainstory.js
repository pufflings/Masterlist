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
  
  let dex = await charadex.initialize.page(null, charadex.page.mainstory, 
    // Data callback to process new status and debug field names
    (data) => {     
      for (let story of data) {
        // Convert new boolean to readable status for filtering
        if (story.new === true || story.new === 'TRUE') {
          story.new = 'New';
        } else {
          story.new = 'Previous';
        }
        
        // Add the folder property for fauxfolders to work correctly
        // This ensures the folder system uses the processed 'New'/'Previous' values
        story.folder = story.new;
      }
      
      // Handle custom filtering for "All" folder
      const urlParams = charadex.url.getUrlParametersObject();
      if (urlParams && urlParams.folder === 'All') {
        // Remove the folder parameter so no filtering is applied
        delete urlParams.folder;
        // Update the URL without the folder parameter
        const newUrl = charadex.url.addUrlParameters(window.location.pathname, urlParams);
        if (newUrl !== window.location.pathname + window.location.search) {
          window.history.replaceState({}, '', newUrl);
        }
      }
    },
    (listData) => {
      let backgroundElement = $('.cd-prompt-background');
      
      // Set background images for gallery view
      backgroundElement.each(function(i) {
        const image = listData.array[i]?.image;
        if (image) {
          $(this).attr('style', `background-image: url(${image})`);
        }
      });
      
      // Ensure data-folder attribute is set for CSS targeting, add NEW! buttons, and override profile links
      if (listData.type == 'gallery') {
        setTimeout(() => {
          listData.array.forEach((story) => {
            if (story.folder) {
              $('.col-md-6.p-2 > .card.h-100').each(function () {
                const titleLink = $(this).find('.card-header a');
                if (titleLink.text().trim() === (story.title || '').trim()) {
                  $(this).attr('data-folder', story.folder);
                  
                  // Add NEW! button if story is new
                  if (story.folder === 'New') {
                    // Remove any existing NEW! button first
                    $(this).find('.new-badge').remove();
                    
                    // Add NEW! button next to the title
                    const newBadge = $('<span class="new-badge badge badge-danger ml-2">NEW!</span>');
                    titleLink.after(newBadge);
                  } else {
                    // Remove NEW! button if not new
                    $(this).find('.new-badge').remove();
                  }
                  
                  // Override profile link to go directly to URL
                  if (story.link) {
                    titleLink.attr('href', story.link);
                    titleLink.attr('target', '_blank');
                    
                    // Make the background image clickable too
                    const backgroundDiv = $(this).find('.cd-prompt-background');
                    backgroundDiv.css('cursor', 'pointer');
                    backgroundDiv.off('click').on('click', function() {
                      window.open(story.link, '_blank');
                    });
                  }
                }
              });
            }
          });
        }, 100);
      }
    }
  );
  charadex.tools.loadPage('.softload', 500);
});
