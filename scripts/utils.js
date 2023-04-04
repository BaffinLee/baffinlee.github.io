module.exports = {
  encodeForHtml(str) {
    var arr = [
      ['&', '&amp;'],
      ['<', '&lt;'],
      ['>', '&gt;'],
      ['"', '&quot;'],
      ['\'', '&#39;'],
    ];
    return arr.reduce((prev, item) => prev.replace(new RegExp(item[0], 'g'), item[1]), str);
  },
  safeRequire(path, defaultValue = {}) {
    try {
      return require(path);
    } catch (e) {
      return defaultValue;
    }
  },
}
