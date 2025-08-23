# Pufflings Masterlist

Welcome to the Puffling ARPG! Pufflings are a mysterious, fluffy creature, believed to be descendants of legendary dragons.

## Performance Optimizations

This site has been optimized for faster loading times:

### Caching System
- **Client-side caching**: Data from Google Sheets is cached in localStorage for 5 minutes
- **Reduced API calls**: Subsequent page loads use cached data when available
- **Cache management**: Users can clear cache via the Help menu if needed

### Loading Optimizations
- **Parallel data loading**: Related data is loaded simultaneously instead of sequentially
- **Preloading**: Critical data starts loading immediately when the page begins to load
- **Performance monitoring**: Console logs show loading times for debugging

### How to Clear Cache
If you're experiencing issues with outdated data:
1. Click on "Help" in the navigation menu
2. Select "Clear Cache"
3. Refresh the page

### Performance Tips
- The first page load will be slower as it fetches fresh data
- Subsequent page loads should be much faster due to caching
- If data seems outdated, use the "Clear Cache" option
- Check the browser console for performance metrics

## Technical Details

- Built with Charadex framework
- Data sourced from Google Sheets
- Responsive design with Bootstrap 4.5
- Font Awesome icons for UI elements