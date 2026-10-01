(function (window) {
  function text(value) {
    return String(value || '').trim();
  }

  function name(value) {
    return text(value).toLowerCase().replace(/[\s\u0021-\u002f\u003a-\u0040\u005b-\u0060\u007b-\u007e]/g, '');
  }

  function phone(value) {
    var normalized = text(value).replace(/[\s().-]/g, '').replace(/^\+/, '').replace(/^0+/, '');
    return /^\d{8,15}$/.test(normalized) ? normalized : '';
  }

  function location(value, maxLength) {
    var normalized = text(value);
    return normalized.length <= maxLength ? normalized : '';
  }

  window.openaiMatching = {
    buildUser: function (fields) {
      var user = {};
      var email = text(fields.email).toLowerCase();
      var normalizedPhone = phone(fields.phone_number);
      var externalId = text(fields.external_id);
      var firstName = name(fields.first_name);
      var lastName = name(fields.last_name);
      var country = text(fields.country).toUpperCase();
      var city = location(fields.city, 128).toLowerCase();
      var region = location(fields.region, 128);
      var postalCode = location(fields.postal_code, 32);

      if (email && fields.email_valid) user.email_sha256 = sha256(email);
      if (normalizedPhone) user.phone_number_sha256 = sha256(normalizedPhone);
      if (externalId) user.external_id_sha256 = sha256(externalId);
      if (firstName) user.first_name_sha256 = sha256(firstName);
      if (lastName) user.last_name_sha256 = sha256(lastName);
      if (/^[A-Z]{2}$/.test(country)) user.country = country;
      if (city) user.city = city;
      if (region) user.region = region;
      if (postalCode && /^[A-Za-z0-9 -]+$/.test(postalCode)) user.postal_code = postalCode;

      return user;
    }
  };
})(window);
