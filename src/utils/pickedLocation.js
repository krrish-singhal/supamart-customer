const { validCoordinates } = require('../config/deliveryArea');
function locationFromGeocode(coordinate, geo) {
  if (!validCoordinates(coordinate?.latitude, coordinate?.longitude)) return null;
  const text = value => typeof value === 'string' ? value.trim() : '';
  const area = text(geo?.neighborhood || geo?.district || geo?.subregion);
  const city = text(geo?.city || geo?.subregion);
  const street = text(geo?.street || geo?.name);
  const region = text(geo?.region);
  return {
    lat: coordinate.latitude, lng: coordinate.longitude, street: street.slice(0, 160), area: area.slice(0, 160), city: city.slice(0, 100),
    pincode: /^\d{6}$/.test(text(geo?.postalCode)) ? text(geo.postalCode) : '',
    locationName: area || city || street || 'Selected map pin',
    locality: [city, region].filter((value, index, values) => value && values.indexOf(value) === index).join(', ') || `${coordinate.latitude.toFixed(5)}, ${coordinate.longitude.toFixed(5)}`,
  };
}
module.exports = { locationFromGeocode };
