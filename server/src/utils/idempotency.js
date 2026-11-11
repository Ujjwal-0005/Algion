const crypto = require('crypto');

function computeRequestHash(payload) {
  // Sort keys deeply to achieve a deterministic representation
  const canonicalString = JSON.stringify(payload, Object.keys(payload || {}).sort());
  return crypto.createHash('sha256').update(canonicalString).digest('hex');
}

module.exports = {
  computeRequestHash
};

