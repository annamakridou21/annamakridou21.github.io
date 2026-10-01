document.getElementById('fireViewContentBtn').addEventListener('click', function() {
  var parameters = {
    contents: [{
      content_id: 'second_page_item',
      content_type: 'product',
      content_name: 'Second Page Special Item',
      content_category: 'special',
      price: 10,
      num_items: 1,
      brand: 'MyBrand'
    }],
    value: 10,
    currency: 'USD'
  };
  window.siteTracking.tiktokTrack('ViewContent', parameters);
  alert('ViewContent event has been triggered! Check your TikTok Pixel Helper.');
});
