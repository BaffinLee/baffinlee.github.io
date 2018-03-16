const path = require('path')
const fse = require('fs-extra')
const cacheDir = path.join(__dirname, '../.cache')
const cacheFile = path.join(__dirname, '../.cache/cache.json')

module.exports = class Cache {
  constructor () {
    const arr = ['posts', 'pages']
    fse.ensureDirSync(cacheDir)
    this.cacheDir = cacheDir
    this.cacheFile = cacheFile
    if (fse.pathExistsSync(this.cacheFile)) {
      this.data = require(this.cacheFile)
    } else {
      this.data = {
        posts: [],
        pages: []
      }
    }
    this.data.idMap = {}
    this.data.slugMap = {}
    arr.forEach(item => {
      this.data[item].sort((a, b) => {
        return (new Date(b.publishedAt)) - (new Date(a.publishedAt))
      })
      this.data[item].forEach(post => {
        this.data.idMap[post.id] = post
        this.data.slugMap[post.slug] = post
      });
    })
  }

  getPost (id) {
    return this.data.idMap[id]
  }

  addPost (post) {
    this.data.posts.push(post)
    this.mapIt(post)
  }

  addPage (page) {
    this.data.pages.push(page)
    this.mapIt(page)
  }

  mapIt (config) {
    if (this.data.slugMap[config.slug]) throw new Error(`duplicate slug: ${config.slug}`)
    if (this.data.idMap[config.id]) throw new Error(`duplicate id: ${config.id}`)
    this.data.slugMap[config.slug] = config
    this.data.idMap[config.id] = config
  }

  updatePost (id, config) {
    const post = this.data.idMap[id]
    if (!post) throw new Error(`there is no this post id: ${id}`)
    Object.keys(config).forEach(key => {
      post[key] = config[key]
    })
  }

  analyseData () {
    this.data.categories = {}
    this.data.series = {}
    this.data.tags = {}
    this.data.posts.forEach(post => {
      if (post.series) {
        if (!this.data.series[post.series.slug]) this.data.series[post.series.slug] = []
        this.data.series[post.series.slug].push(post)
      }
      post.categories.forEach(category => {
        if (!this.data.categories[category.slug]) this.data.categories[category.slug] = []
        this.data.categories[category.slug].push(post)
      })
      post.tags.forEach(tag => {
        if (!this.data.tags[tag.slug]) this.data.tags[tag.slug] = []
        this.data.tags[tag.slug].push(post)
      })
    })
  }

  getData (type) {
    return this.data[type]
  }

  sync () {
    fse.writeJSONSync(this.cacheFile, {
      pages: this.data.pages,
      posts: this.data.posts
    })
  }
}
