const path = require('path')
const moment = require('moment')
const urlBuilder = require(path.join(__dirname, './url'))
const categories = require(path.join(__dirname, '../source/categories'))
const series = require(path.join(__dirname, '../source/series'))
const tags = require(path.join(__dirname, '../source/tags'))

module.exports = class Meta {
  constructor () {
    const arr = ['series', 'tags']
    this.data = {
      categories,
      series,
      tags
    }
    this.map = {
      categories: {},
      series: {},
      tags: {}
    }
    arr.forEach(type => {
      this.data[type].forEach(item => {
        this.map[type][item.name] = item
      })
    });
    this.map.categories = {}
    this._walkCategoryChildrens(this.data.categories, (item, parent) => {
      this.map.categories[item.name] = {
        name: item.name,
        slug: item.slug,
        parent
      }
    })
  }

  getSlug (type, name) {
    const data = this.map[type][name]
    if (!data) throw new Error(`There has no ${name} ${type}`)
    return data.slug
  }

  completeConfig (config) {
    let tags = []
    let categories = []
    let series = ''

    if (config.series && config.series.trim()) {
      series = {
        name: config.series.trim(),
        slug: this.getSlug('series', config.series.trim())
      }
    }

    if (config.categories && config.categories.length) {
      categories = config.categories.reduce((last, category) => {
        const str = category ? category.trim() : ''
        if (str) last.push({
          name: str,
          slug: this.getSlug('categories', str)
        })
        return last
      }, [])
    }

    if (config.tags && config.tags.length) {
      tags = config.tags.reduce((last, tag) => {
        const str = tag ? tag.trim() : ''
        if (str) last.push({
          name: str,
          slug: this.getSlug('tags', str)
        })
        return last
      }, [])
    }

    return {
      ...config,
      tags,
      categories,
      series
    }
  }

  getCategoryFamily (category) {
    const res = []
    let target = this.map.categories[category.slug]

    if (!target) throw new Error(`There has no ${category.slug} category`)

    res.unshift({
      name: target.name,
      slug: target.slug
    })

    while (target.parent) {
      target = target.parent
      res.unshift({
        name: target.name,
        slug: target.slug
      })
    }

    return res;
  }

  checkConfig (config) {
    if (!config || !config.id || !config.title || !config.slug || !config.publishedAt) {
      throw new Error('file meta info is incomplete!')
    }
  }

  getData (type) {
    return this.data[type]
  }

  _walkCategoryChildrens (data, cb, parent = null) {
    if (data && typeof data === 'object' && data.length) {
      data.forEach(item => {
        cb(item, parent)
        this._walkCategoryChildrens(item.childrens, cb, item)
      })
    }
  }
}
