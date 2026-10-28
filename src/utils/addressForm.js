const { validCoordinates } = require('../config/deliveryArea');

function validateAddressForm(form) {
  const errors = {};
  if (!form.houseNo?.trim()) errors.houseNo = 'Enter your house or flat number.';
  if (!form.street?.trim()) errors.street = 'Enter the building or street name.';
  const street = [form.street?.trim(), form.area?.trim()].filter(Boolean).join(', ');
  if (street.length > 160) errors.street = 'Keep the street and locality within 160 characters.';
  if (!/^\d{6}$/.test(form.pincode?.trim() || '')) errors.pincode = 'Enter a 6-digit PIN code.';
  if (!form.label?.trim()) errors.label = 'Choose an address label.';
  if (!validCoordinates(form.lat, form.lng)) errors.location = 'Choose your delivery location on the map.';
  return errors;
}

function formatDeliveryAddress(address) {
  if (!address) return '';
  const seen = new Set();
  const parts = [address.houseNo, address.street, address.area, address.landmark, address.city, address.pincode]
    .filter(value => typeof value === 'string' && value.trim())
    .map(value => value.trim())
    .filter(value => !/^(current location|current street|house \/ flat)$/i.test(value))
    .filter(value => { const key = value.toLowerCase(); if (seen.has(key)) return false; seen.add(key); return true; });
  return parts.join(', ') || (validCoordinates(address.lat, address.lng) ? `${address.lat.toFixed(5)}, ${address.lng.toFixed(5)}` : 'Tap to complete your address');
}

module.exports = { validateAddressForm, formatDeliveryAddress };
