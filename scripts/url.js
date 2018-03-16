const path = require('path')
const moment = require('moment')
const config = require(path.join(__dirname, './config'))

module.exports = {
  home (page = 0) {
    return (page > 1) ? `/${config.output.page}/${page}.html` : '/'
  },
  archives (page = 0) {
    return this.for('archives', '', page)
  },
  categories (slug, page = 0) {
    return this.for('categories', slug, page)
  },
  tags (slug, page = 0) {
    return this.for('tags', slug, page)
  },
  series (slug, page = 0) {
    return this.for('series', slug, page)
  },
  static (file) {
    return `/${config.output.static}/${file}?v=${config.version}`
  },
  for (type, slug, page) {
    let url = `/${config.output[type]}`
    if (slug) url += `/${slug}`
    if (page > 1) url += `/${config.output.page}/${page}.html`
    return url
  },
  rss () {
    return '/rss.xml'
  },
  post (post) {
    const date = moment(post.publishedAt).format('YYYYMMDD')
    return `/${config.output.posts}/${date}-${post.slug}.html`
  },
  page (slug) {
    return `/${slug}.html`
  }
}
