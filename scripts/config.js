const path = require('path')
const config = {
  version: '',
  site: {
    name: '',
    title: '',
    description: '',
    keywords: '',
    url: '',
    favicon: '',
    logo: '',
    slogan: ''
  },
	output: {
		public: 'public',
		static: 'static',
		posts: 'posts',
    tags: 'tags',
    authors: 'authors',
		categories: 'categories',
		series: 'series',
    archives: 'archives',
    page: 'page'
	},
	pageSize: {
		posts: 10,
    tagsHome: -1,
    categoriesHome: -1,
    seriesHome: 30,
    tag: 30,
		categorie: 30,
		series: 30,
    archives: 30,
    rss: 10
  },
  inject: {
    header: '',
    body: ''
  },
  theme: {
    name: 'default',
    config: {}
  }
}

module.exports = Object.assign(config, require(path.join(__dirname, '../config')))
