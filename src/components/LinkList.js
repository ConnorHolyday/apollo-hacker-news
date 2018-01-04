import React, { Component } from 'react'
import { graphql } from 'react-apollo'
import gql from 'graphql-tag'
import Link from './Link'
import { LINKS_PER_PAGE } from '../constants'

class LinkList extends Component {
  
  render() {

    const { allLinksQuery } = this.props;

    if (allLinksQuery && allLinksQuery.loading) {
      return <div>Loading&hellip;</div>
    }

    if (allLinksQuery && allLinksQuery.error) {
      return <div>Error</div>
    }

    const isNewPage = this.props.location.pathname.includes('new')
    const linksToRender = this._getLinksToRender(isNewPage)
    const page = parseInt(this.props.match.params.page, 10)

    return (
      <div>
        {linksToRender.map((link, index) => (
          <Link key={link.id} updateStoreAfterVote={this._updateCacheAfterVote} link={link} index={page ? ((page - 1) * LINKS_PER_PAGE) + index : index} />
        ))}
        {isNewPage &&
          <div className="flex ml4 mv3 gray">
            <div className="pointer mr2" onClick={() => this._previousPage()}>Previous</div>
            <div className="pointer" onClick={() => this._nextPage()}>Next</div>
          </div>
        }
      </div>
    )
  }

  _getLinksToRender = (isNewPage) => {
    if (isNewPage) {
      return this.props.allLinksQuery.allLinks
    }

    const rankedLinks = this.props.allLinksQuery.allLinks.slice()
    rankedLinks.sort((l1, l2) => l2.votes.length - l1.votes.length)
    return rankedLinks
  }

  _previousPage = () => {
    const page = parseInt(this.props.match.params.page, 10)
    if (page > 1) {
      const previousPage = page - 1
      this.props.history.push(`/new/${previousPage}`)
    }
  }

  _nextPage = () => {
    const page = parseInt(this.props.match.params.page, 10)
    if (page <= this.props.allLinksQuery._allLinksMeta.count / LINKS_PER_PAGE) {
      const nextPage = page + 1
      this.props.history.push(`/new/${nextPage}`)
    }
  }

  componentDidMount() {
    this._subscribeToNewLinks()
    this._subscribeToNewVotes()
  }

  _updateCacheAfterVote = (store, createVote, linkId) => {
    const data = store.readQuery({ query: ALL_LINKS_QUERY })

    const votedLink = data.allLinks.find(link => link.id === linkId)
    votedLink.votes = createVote.link.votes

    store.writeQuery({ query: ALL_LINKS_QUERY, data })
  }

  _subscribeToNewLinks = () => {
    this.props.allLinksQuery.subscribeToMore({
      document: gql`
        subscription {
          Link(filter: {
            mutation_in: [CREATED]
          }) {
            node {
              id
              url
              description
              createdAt
              postedBy {
                id
                name
              }
              votes {
                id
                user {
                  id
                }
              }
            }
          }
        }
      `,
      updateQuery: (previous, { subscriptionResult }) => {
        const newAllLinks = [
          ...previous.allLinks,
          subscriptionResult.data.Link.node
        ]
        const result = {
          ...previous,
          allLinks: newAllLinks
        }
        return result
      }
    })
  }

  _subscribeToNewVotes = () => {
    this.props.allLinksQuery.subscribeToMore({
      document: gql`
      subscription {
        Vote(filter: {
          mutation_in: [CREATED]
        }) {
          node {
            id
            link {
              id
              url
              description
              createdAt
              postedBy {
                id
                name
              }
              votes {
                id
                user {
                  id
                }
              }
            }
            user {
              id
            }
          }
        }
      }
      `,
      updateQuery: (previous, { subscriptionResult }) => {
        const votedLinkIndex = previous.allLinks.findIndex(link => link.id === subscriptionResult.data.Vote.node.link.id)
        const link = subscriptionResult.data.Vote.node.link
        const newAllLinks = previous.allLinks.slice()
        newAllLinks[votedLinkIndex] = link
        const result = {
          ...previous,
          allLinks: newAllLinks
        }
        return result
      }
    })
  }
}

export const ALL_LINKS_QUERY = gql`
  query AllLinksQuery($first: Int, $skip: Int, $orderBy: LinkOrderBy) {
    allLinks(
      first: $first,
      skip: $skip,
      orderBy: $orderBy
    ) {
      id
      createdAt
      url
      description
      postedBy {
        id
        name
      }
      votes {
        id
        user {
          id
        }
      }
    }
    _allLinksMeta {
      count
    }
  }
`

export default graphql(ALL_LINKS_QUERY, {
    name: 'allLinksQuery',
    options: (ownProps) => {
      const page = parseInt(ownProps.match.params.page, 10)
      const isNewPage = ownProps.location.pathname.includes('new')
      const skip = isNewPage ? (page - 1) * LINKS_PER_PAGE : 0
      const first = isNewPage ? LINKS_PER_PAGE : 100
      const orderBy = isNewPage ? 'createdAt_DESC' : null
      return {
        variables: { first, skip, orderBy }
      }
    }
  })(LinkList)
