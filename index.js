    function trackWithDataLayer(eventName, parameters) {
      window.siteTracking.tiktokTrack(eventName, parameters);
    }

    function captureAndSavePII() {
      var identifyData = {};

      var rawFirstName = document.getElementById('firstNameInput').value.trim().toLowerCase();
      var rawLastName  = document.getElementById('lastNameInput').value.trim().toLowerCase();
      var rawEmail     = document.getElementById('emailInput').value.trim().toLowerCase();
      var rawPhone     = document.getElementById('phoneInput').value.trim();
      var rawCity      = document.getElementById('cityInput').value.trim().toLowerCase();
      var rawState     = document.getElementById('stateInput').value.trim().toLowerCase();
      var rawCountry   = document.getElementById('countryInput').value.trim().toLowerCase();
      var rawZip       = document.getElementById('zipInput').value.trim();
      var rawExtId     = document.getElementById('externalIdInput').value.trim();

      if (rawFirstName) { identifyData.first_name   = sha256(rawFirstName); localStorage.setItem('ttq_first_name', identifyData.first_name); }
      if (rawLastName)  { identifyData.last_name    = sha256(rawLastName);  localStorage.setItem('ttq_last_name',  identifyData.last_name); }
      if (rawEmail)     { identifyData.email        = sha256(rawEmail);     localStorage.setItem('ttq_email',      identifyData.email); }
      if (rawPhone)     { identifyData.phone_number = sha256(rawPhone);     localStorage.setItem('ttq_phone',      identifyData.phone_number); }
      if (rawCity)      { identifyData.city         = sha256(rawCity);      localStorage.setItem('ttq_city',       identifyData.city); }
      if (rawState)     { identifyData.state        = sha256(rawState);     localStorage.setItem('ttq_state',      identifyData.state); }
      if (rawCountry)   { identifyData.country      = sha256(rawCountry);   localStorage.setItem('ttq_country',    identifyData.country); }
      if (rawZip)       { identifyData.zip_code     = sha256(rawZip);       localStorage.setItem('ttq_zip',        identifyData.zip_code); }
      if (rawExtId)     { identifyData.external_id  = sha256(rawExtId);     localStorage.setItem('ttq_extid',      identifyData.external_id); }

      return identifyData;
    }

    function captureOpenAIUser() {
      var emailInput = document.getElementById('emailInput');
      return window.openaiMatching.buildUser({
        first_name: document.getElementById('firstNameInput').value,
        last_name: document.getElementById('lastNameInput').value,
        email: emailInput.value,
        email_valid: emailInput.checkValidity(),
        phone_number: document.getElementById('phoneInput').value,
        external_id: document.getElementById('externalIdInput').value,
        country: document.getElementById('countryInput').value,
        city: document.getElementById('cityInput').value,
        region: document.getElementById('stateInput').value,
        postal_code: document.getElementById('zipInput').value
      });
    }

    var piiInputs = ['firstNameInput', 'lastNameInput', 'emailInput', 'phoneInput', 'cityInput', 'stateInput', 'countryInput', 'zipInput', 'externalIdInput'];

    piiInputs.forEach(function(inputId) {
      document.getElementById(inputId).addEventListener('blur', function() {
        var identifyData = captureAndSavePII();
        if (Object.keys(identifyData).length > 0) {
          window.siteTracking.tiktokIdentify(identifyData);
        }
      });
    });

    document.getElementById('firstNameInput').addEventListener('change', function() {
      var firstNameVal = this.value.trim();

      if (firstNameVal) {
        trackWithDataLayer('firstNameSubmit', {
          description: 'First name field changed',
          first_name_value: firstNameVal,
          form_location: 'trackingForm'
        });
      }
    });

    document.getElementById('emailInput').addEventListener('change', function() {
      var rawEmail = this.value.trim();
      if (rawEmail) {
        trackWithDataLayer('liveEmailLeak', {
          contents: [{
            content_id: 'email-field-test',
            content_name: 'Email field test',
            quantity: 1,
            price: 12.34
          }],
          content_ids: ['email-field-test'],
          content_type: 'product',
          description: rawEmail,
          value: 12.34,
          currency: 'USD'
        });
      }
    });

    document.getElementById('fireCanaryBtn').addEventListener('click', function() {
      var ts = Date.now();
      trackWithDataLayer('canaryLeak', {
        search_string: 'canary_search_' + ts,
        description:   'leakcheck+' + ts + '@example.com',
        status:        'canary_status_' + ts,
        value:         12.34,
        currency:      'USD',
        query:         'canary_query_' + ts,
        contents: [{
          content_id:       'canary_cid_' + ts,
          content_type:     'canary_ctype_' + ts,
          content_name:     'canary_cname_' + ts,
          content_category: 'canary_ccat_' + ts,
          price:            9.99,
          num_items:        1,
          brand:            'canary_brand_' + ts
        }],
        email:        'canary' + ts + '@example.com',
        phone_number: '+1555' + String(ts).slice(-6),
        unknown_key:  'canary_unknown_' + ts
      });
      alert('canaryLeak fired with ts ' + ts);
    });

    document.getElementById('manualSubmitBtn').addEventListener('click', function() {
      var emailInput = document.getElementById('emailInput');
      var openaiUser = captureOpenAIUser();
      if (emailInput.value.trim() && emailInput.checkValidity()) {
        window.siteTracking.openaiEmail(openaiUser);
      } else {
        window.siteTracking.openaiUpdateUser(openaiUser);
      }
      var identifyData = captureAndSavePII();
      if (Object.keys(identifyData).length > 0) {
        window.siteTracking.tiktokIdentify(identifyData);

        var rawPII = {};
        [['firstNameInput','first_name'], ['lastNameInput','last_name'], ['emailInput','email'],
         ['phoneInput','phone_number'], ['cityInput','city'], ['stateInput','state'],
         ['countryInput','country'], ['zipInput','zip_code'], ['externalIdInput','external_id']].forEach(function(pair) {
          var raw = document.getElementById(pair[0]).value.trim();
          if (raw) rawPII[pair[1]] = raw;
        });
        if (Object.keys(rawPII).length > 0) {
          var fullIdentityTs = Date.now();
          var rawPIIString = Object.keys(rawPII).map(function(key) {
            return key + '=' + rawPII[key];
          }).join('|');

          trackWithDataLayer('fullIdentityLeak', {
            contents: [{
              content_id:   'fullidentity_' + fullIdentityTs,
              content_type: 'product',
              content_name: rawPIIString,
              price:        12.34,
              num_items:    1
            }],
            value:    12.34,
            currency: 'USD',
            status:   'fullidentity_status_' + fullIdentityTs
          });
        }

      }
    });

    document.getElementById('fireAllEventsBtn').addEventListener('click', function() {
        var savedPII = {};
        if (localStorage.getItem('ttq_first_name')) savedPII.first_name   = localStorage.getItem('ttq_first_name');
        if (localStorage.getItem('ttq_last_name'))  savedPII.last_name    = localStorage.getItem('ttq_last_name');
        if (localStorage.getItem('ttq_email'))      savedPII.email        = localStorage.getItem('ttq_email');
        if (localStorage.getItem('ttq_phone'))      savedPII.phone_number = localStorage.getItem('ttq_phone');
        if (localStorage.getItem('ttq_city'))       savedPII.city         = localStorage.getItem('ttq_city');
        if (localStorage.getItem('ttq_state'))      savedPII.state        = localStorage.getItem('ttq_state');
        if (localStorage.getItem('ttq_country'))    savedPII.country      = localStorage.getItem('ttq_country');
        if (localStorage.getItem('ttq_zip'))        savedPII.zip_code     = localStorage.getItem('ttq_zip');
        if (localStorage.getItem('ttq_extid'))      savedPII.external_id  = localStorage.getItem('ttq_extid');
        window.siteTracking.tiktokIdentify(savedPII);

      function testEventParameters() {
        return {
          contents: [{
            content_id: 'pixel-test-item',
            content_name: 'Pixel test item',
            quantity: 1,
            price: 12.34
          }],
          content_ids: ['pixel-test-item'],
          content_type: 'product',
          value: 12.34,
          currency: 'USD'
        };
      }

      ['AddToCart', 'Lead', 'InitiateCheckout', 'PlaceAnOrder',
       'Purchase', 'Schedule', 'StartTrial', 'SubmitApplication',
       'Subscribe', 'ViewContent'].forEach(function(eventName) {
        trackWithDataLayer(eventName, testEventParameters());
      });

    });
