const { safeRequire } = require('./utils');
const categories = safeRequire('../source/categories')
const series = safeRequire('../source/series')
const tags = safeRequire('../source/tags')

function getI18nNameKeys(obj) {
  return Object.keys(obj).filter(key => {
    return /^name([A-Z][a-zA-Z]+)?$/.test(key)
  })
}

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
        const i18nNameKeys = getI18nNameKeys(item)
        i18nNameKeys.forEach(nameKey => {
          this.map[type][item[nameKey]] = item
        })
      })
    });
    this.map.categories = {}
    this._walkCategoryChildren(this.data.categories, (item, parent) => {
      const i18nNameKeys = getI18nNameKeys(item)
      i18nNameKeys.forEach(nameKey => {
        this.map.categories[item[nameKey]] = {
          ...item,
          children: undefined,
          parent
        }
      })
    })
  }

  getItem (type, name) {
    const data = this.map[type][name]
    if (!data) throw new Error(`There has no ${name} ${type}`)
    return data
  }

  completeConfig (config) {
    let tags = []
    let categories = []
    let series = ''

    if (config.series && config.series.trim()) {
      series = this._plainObject(this.getItem('series', config.series.trim()))
    }

    if (config.categories && config.categories.length) {
      categories = config.categories.reduce((last, category) => {
        const str = category ? category.trim() : ''
        if (str) last.push(this._plainObject(this.getItem('categories', str)))
        return last
      }, [])
    }

    if (config.tags && config.tags.length) {
      tags = config.tags.reduce((last, tag) => {
        const str = tag ? tag.trim() : ''
        if (str) last.push(this._plainObject(this.getItem('tags', str)))
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
    let target = this.map.categories[category.name]

    if (!target) throw new Error(`There has no ${category.name} category`)

    res.unshift(this._plainObject(target))

    while (target.parent) {
      target = target.parent
      res.unshift(this._plainObject(target))
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

  _walkCategoryChildren (data, cb, parent = null) {
    if (data && typeof data === 'object' && data.length) {
      data.forEach(item => {
        cb(item, parent)
        this._walkCategoryChildren(item.children, cb, item)
      })
    }
  }

  _plainObject(obj) {
    const res = {
      ...obj
    };
    delete res.parent;
    delete res.children;
    return res;
  }
}
