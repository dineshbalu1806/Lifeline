const https = require('https');

const geocodeAddress = (address) => {
  return new Promise((resolve) => {
    if (!address || address.trim().length < 5) {
      return resolve(null);
    }

    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`;

    https.get(url, { headers: { 'User-Agent': 'LifeLineBloodBank/1.0' } }, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const results = JSON.parse(data);
          if (results && results.length > 0) {
            resolve({
              lat: parseFloat(results[0].lat),
              lng: parseFloat(results[0].lon),
              displayName: results[0].display_name,
            });
          } else {
            resolve(null);
          }
        } catch {
          resolve(null);
        }
      });
    }).on('error', () => resolve(null));
  });
};

const buildAddressString = (fields) => {
  const parts = [];
  if (fields.address) parts.push(fields.address);
  if (fields.city) parts.push(fields.city);
  if (fields.district) parts.push(fields.district);
  if (fields.ward) parts.push(fields.ward);
  return parts.join(', ');
};

module.exports = { geocodeAddress, buildAddressString };
