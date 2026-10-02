(function (window) {
  var pending = Object.create(null);
  var nextId = 0;
  var tiktokStorageKeys = {
    first_name: 'ttq_first_name',
    last_name: 'ttq_last_name',
    email: 'ttq_email',
    phone_number: 'ttq_phone',
    city: 'ttq_city',
    state: 'ttq_state',
    country: 'ttq_country',
    zip_code: 'ttq_zip',
    external_id: 'ttq_extid'
  };

  function enqueue(eventName, item, preview) {
    var id = String(++nextId);
    pending[id] = item;
    preview.event = eventName;
    preview.tracking_event_id = id;
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(preview);
  }

  function savedTikTokIdentity() {
    var identity = {};
    Object.keys(tiktokStorageKeys).forEach(function (field) {
      var value = localStorage.getItem(tiktokStorageKeys[field]);
      if (value) identity[field] = value;
    });
    return identity;
  }

  window.siteTracking = {
    pending: pending,

    tiktokTrack: function (name, parameters) {
      enqueue('site_tiktok_event', {
        channel: 'tiktok', action: 'track', name: name, data: parameters
      }, {
        tiktok_event_name: name,
        tiktok_parameters: JSON.parse(JSON.stringify(parameters)),
        tiktok_identity: null
      });
    },

    tiktokIdentify: function (identity) {
      if (!Object.keys(identity).length) return;
      enqueue('site_tiktok_event', {
        channel: 'tiktok', action: 'identify', data: identity
      }, {
        tiktok_event_name: null,
        tiktok_parameters: null,
        tiktok_identity: identity
      });
    },

    openaiUpdateUser: function (user) {
      if (!Object.keys(user).length) return;
      enqueue('site_openai_event', {
        channel: 'openai', action: 'init', user: user
      }, {
        openai_event_name: null,
        openai_user_fields: Object.keys(user)
      });
    },

    openaiEmail: function (user) {
      user = user || {};
      var data = {
        type: 'custom',
        plan_id: 'demo_email_signup',
        amount: 1234,
        currency: 'USD',
        contents: [{
          id: 'demo_email_signup',
          name: 'Demo email signup',
          content_type: 'plan',
          quantity: 1,
          amount: 1234,
          currency: 'USD'
        }]
      };
      var options = {
        custom_event_name: 'email',
        event_id: 'email_' + Date.now() + '_' + (nextId + 1)
      };
      enqueue('site_openai_event', {
        channel: 'openai', action: 'measure', name: 'custom', data: data, options: options,
        user: user
      }, {
        openai_event_name: 'email',
        openai_event_data: data,
        openai_user_fields: Object.keys(user)
      });
    }
  };

  window.siteTracking.tiktokIdentify(savedTikTokIdentity());
})(window);
