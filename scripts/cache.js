const path = require('path')
const fse = require('fs-extra')
const { normalizeLang } = require('./utils');
// const cacheDir = path.join(__dirname, '../.cache')
// const cacheFile = path.join(__dirname, '../.cache/cache.json')

module.exports = class Cache {
  constructor (meta) {
    const arr = ['posts', 'pages']
    // fse.ensureDirSync(cacheDir)
    // this.cacheDir = cacheDir
    // this.cacheFile = cacheFile
    // if (fse.pathExistsSync(this.cacheFile)) {
    //   this.data = require(this.cacheFile)
    // } else {
      this.data = {
        posts: [],
        pages: []
      }
    // }
    this.updated = {}
    this.i18nPostsMap = {}
    this.meta = meta
    this.data.idMap = {}
    this.data.slugMap = {}
    arr.forEach(item => {
      this.data[item].sort((a, b) => {
        return (new Date(b.createdAt)) - (new Date(a.createdAt))
      })
      this.data[item].forEach(post => {
        this.data.idMap[post.file] = post
        this.data.slugMap[post.slug] = post
      });
    })
  }

  getPost (file) {
    this.updated[file] = true;
    return this.data.idMap[file]
  }

  addPost (post) {
    this.mapIt(post) && this.data.posts.unshift(post)
  }

  addPage (page) {
    this.mapIt(page) && this.data.pages.unshift(page)
  }

  mapIt (config) {
    let res = true
    if (this.data.slugMap[config.slug]) {
      const data = this.data.slugMap[config.slug];
      if (data.lang !== config.lang && data.file.split('.')[0] === config.file.split('.')[0]) {
        this.i18nPostsMap[data.slug] = this.i18nPostsMap[data.slug] || []
        this.i18nPostsMap[data.slug].push(config)
        config.slug = `${config.slug}-${normalizeLang(config.lang)}`
        res = false
      } else {
        throw new Error(`duplicate slug: ${config.slug}`)
      }
    }
    if (this.data.idMap[config.file]) throw new Error(`duplicate id: ${config.file}`)
    this.data.slugMap[config.slug] = config
    this.data.idMap[config.file] = config
    return res
  }

  updatePost (config) {
    const post = this.data.idMap[config.file]
    if (!post) throw new Error(`there is no this post/page: ${config.file}`)
    Object.assign(post, config)
  }

  analyzeData () {
    this.data.categories = {}
    this.data.series = {}
    this.data.tags = {}
    this.data.posts = this.data.posts.filter(post => this.updated[post.file])
    this.data.pages = this.data.pages.filter(page => this.updated[page.file])
    this.data.posts.forEach(post => {
      if (post.series) {
        if (!this.data.series[post.series.slug]) this.data.series[post.series.slug] = []
        this.data.series[post.series.slug].push(post)
      }
      (post.categories || []).forEach(category => {
        const list = this.meta.getCategoryFamily(category);
        list.forEach(item => {
          if (!this.data.categories[item.slug]) this.data.categories[item.slug] = []
          this.data.categories[item.slug].push(post)
        })
      });
      (post.tags || []).forEach(tag => {
        if (!this.data.tags[tag.slug]) this.data.tags[tag.slug] = []
        this.data.tags[tag.slug].push(post)
      });
      if (this.i18nPostsMap[post.slug]) {
        post.i18nList = this.i18nPostsMap[post.slug]
      }
    })
  }

  getData (type) {
    return this.data[type]
  }

  sync () {
    // const process = (list) => {
    //   list.forEach(item => {
    //     delete item.i18nList;
    //   });
    //   return list.reduce((res, item) => {
    //     res.push(item);
    //     return res.concat(this.i18nPostsMap[item.slug] || []);
    //   }, []);
    // };
    // fse.writeJSONSync(this.cacheFile, {
    //   pages: process(this.data.pages),
    //   posts: process(this.data.posts)
    // }, {
    //   spaces: 2,
    // })
  }
}
