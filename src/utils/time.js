/**
 * Parses a time string (e.g. 10m, 1h, 2d) into milliseconds
 * @param {string} str
 * @returns {number|null} Milliseconds, or null if invalid
 */
function parseTime(str) {
  if (!str) return null;
  const match = str.match(/^(\d+)(s|m|h|d|w)$/);
  if (!match) return null;

  const val = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 's':
      return val * 1000;
    case 'm':
      return val * 60 * 1000;
    case 'h':
      return val * 60 * 60 * 1000;
    case 'd':
      return val * 24 * 60 * 60 * 1000;
    case 'w':
      return val * 7 * 24 * 60 * 60 * 1000;
    default:
      return null;
  }
}

module.exports = { parseTime };
