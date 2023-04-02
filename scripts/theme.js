const fse = require('fs-extra')
const fs = require('fs')
const path = require('path')
const ejs = require('ejs')
const moment = require('moment')
const home = path.join(__dirname, '../')
const config = require('./config')
const publicPath = path.join(home, config.output.public)
const themeHome = path.join(home, 'theme', config.theme.name)
const files = {
  archives: 'archives.ejs',
  category: 'category.ejs',
  categoriesHome: 'categories-home.ejs',
  home: 'home.ejs',
  page: 'page.ejs',
  post: 'post.ejs',
  series: 'series.ejs',
  seriesHome: 'series-home.ejs',
  tag: 'tag.ejs',
  tagsHome: 'tags-home.ejs'
}

module.exports = class Theme {
  constructor () {
    this.prepareOutputPath()
    this.prepareCompilers()
  }

  compilePage (page, globalData) {
    const name = `${page.slug}.html`
    const file = path.join(this.paths.home, name)
    fs.writeFileSync(file, this.compilers.page({
      ...globalData,
      page,
      title: `${page.title} - ${config.site.title}`
    }))
  }

  compilePost (post, globalData) {
    const date = moment(post.publishedAt).format('YYYYMMDD')
    const name = `${date}-${post.slug}.html`
    const file = path.join(this.paths.posts, name)
    fs.writeFileSync(file, this.compilers.post({
      ...globalData,
      post,
      title: `${post.title} - ${config.site.title}`
    }))
  }

  compileArchives (posts, globalData) {
    const size = config.pageSize.archives
    this.paging(
      this.compilers.archives,
      this.paths.archives,
      posts,
      globalData,
      posts.length,
      size <= 0 ? posts.length : size,
      true,
      `归档 - ${config.site.title}`
    )
  }

  compileSeriesHome (series, globalData) {
    const size = config.pageSize.seriesHome
    this.paging(
      this.compilers.seriesHome,
      this.paths.series,
      series,
      globalData,
      series.length,
      size <= 0 ? series.length : size,
      false,
      `系列 - ${config.site.title}`
    )
  }

  compileSeries (series, posts, globalData) {
    const size = config.pageSize.series
    const dir = path.join(this.paths.series, series.slug)
    fse.ensureDirSync(dir)
    this.paging(
      this.compilers.series,
      dir,
      posts,
      {
        ...globalData,
        series
      },
      posts.length,
      size <= 0 ? posts.length : size,
      false,
      `${series.name} - ${config.site.title}`
    )
  }

  compileTagsHome (tags, globalData) {
    const size = config.pageSize.tagsHome
    this.paging(
      this.compilers.tagsHome,
      this.paths.tags,
      tags,
      globalData,
      tags.length,
      size <= 0 ? tags.length : size,
      false,
      `标签 - ${config.site.title}`
    )
  }

  compileTag (tag, posts, globalData) {
    const size = config.pageSize.tags
    const dir = path.join(this.paths.tags, tag.slug)
    fse.ensureDirSync(dir)
    this.paging(
      this.compilers.tag,
      dir,
      posts,
      {
        ...globalData,
        tag
      },
      posts.length,
      size <= 0 ? posts.length : size,
      false,
      `${tag.name} - ${config.site.title}`
    )
  }

  compileCategoriesHome (categories, globalData) {
    const size = config.pageSize.categoriesHome
    this.paging(
      this.compilers.categoriesHome,
      this.paths.categories,
      categories,
      globalData,
      categories.length,
      size <= 0 ? categories.length : size,
      false,
      `分类 - ${config.site.title}`
    )
  }

  compileCategory (category, posts, globalData) {
    const size = config.pageSize.categories
    const dir = path.join(this.paths.categories, category.slug)
    fse.ensureDirSync(dir)
    this.paging(
      this.compilers.category,
      dir,
      posts,
      {
        ...globalData,
        category
      },
      posts.length,
      size <= 0 ? posts.length : size,
      false,
      `${category.name} - ${config.site.title}`
    )
  }

  compileHome (posts, globalData) {
    const size = config.pageSize.posts
    this.paging(
      this.compilers.home,
      this.paths.home,
      posts,
      globalData,
      posts.length,
      size <= 0 ? posts.length : size,
      false,
      config.site.title
    )
  }

  copyStaticFiles () {
    const themeStatic = path.join(themeHome, 'static')
    fse.copySync(themeStatic, this.paths.static)
  }

  paging (compiler, dir, data, globalData, count, size, isArchive, title) {
    const pagePath = path.join(dir, config.output.page)
    const pageCount = Math.ceil(count / size)
    let now = 0
    let page = 1
    let file = ''
    let list = null
    while (page === 1 || now < count) {
      if (page === 1) {
        file = path.join(dir, 'index.html')
      } else if (page === 2) {
        fse.ensureDirSync(pagePath)
        file = path.join(pagePath, `${page}.html`)
      } else {
        file = path.join(pagePath, `${page}.html`)
      }
      list = isArchive ? this.genArchiveData(data.slice(now, now + size)) : data.slice(now, now + size)
      fs.writeFileSync(file, compiler({
        ...globalData,
        list,
        paging: {
          count,
          pageNow: page,
          pageSize: size,
          pageCount
        },
        title
      }))
      now += size
      page += 1
    }
  }

  prepareOutputPath () {
    this.paths = {
      home: publicPath,
      static: path.join(publicPath, config.output.static),
      archives: path.join(publicPath, config.output.archives),
      categories: path.join(publicPath, config.output.categories),
      posts: path.join(publicPath, config.output.posts),
      series: path.join(publicPath, config.output.series),
      tags: path.join(publicPath, config.output.tags)
    }
    for (const key in this.paths) {
      fse.ensureDirSync(this.paths[key])
    }
  }

  prepareCompilers () {
    let file = ''
    this.compilers = {}
    for (const key in files) {
      file = path.join(themeHome, files[key])
      this.compilers[key] = ejs.compile(fs.readFileSync(file, 'utf-8'), {
        filename: file,
        root: themeHome,
        _with: false,
        localsName: 'app',
        compileDebug: true
      })
    }
  }

  genArchiveData (data) {
    const res = {}
    data.forEach(item => {
      const year = (new Date(item.publishedAt)).getFullYear()
      if (!res[year]) res[year] = []
      res[year].push(item)
    })
    return res
  }
}
