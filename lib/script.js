
process.env.INTERCOM_APP_ID = 'wqzm3rju'
process.env.INTERCOM_API_KEY = '6f6400402170e78fa1ad4418608aacc63512122b'

const orion = require('@runnable/orion')

const TrialsToKillSegmentId = '585bf9ef050d3ec2af8b3b37'

orion.companies.listBy({ segment_id: TrialsToKillSegmentId })
  .then((res) => {
    if (!res) {
      throw new Error('Failed to find orgs to kill in Intercom.')
    }
    var companies = res.companies
    function getAllCompanies (page) {
      page.companies.map((company) => {
        companies.push(company)
      })
      if (page.pages.page < page.pages.total_pages) {
        return orion.nextPage(page.pages)
          .then((nextPage) => {
            return getAllCompanies(nextPage)
          })
      } else {
        return companies
      }
    }

    return getAllCompanies(res)
  })
  .then((orgs) => {
    return orgs.map((o) => {
      return { orgId: o.custom_attributes.github_id, name: o.name }
    })
  })
  .then(console.log)
