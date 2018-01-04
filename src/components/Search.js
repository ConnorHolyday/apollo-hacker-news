import React, { Component } from 'react'
import { withApollo } from 'react-apollo'
import Link from './Link'
import gql from 'graphql-tag'

class Search extends Component {
    state = {
        searchText: '',
        links: []
    }

    render() {
        return (
            <div>
                <div>
                    <input
                        type="text"
                        value={this.state.searchText}
                        onChange={(e) => this.setState({ searchText: e.target.value })}
                        />
                    <button
                        className="ml1"
                        onClick={() => this._executeSearch()}
                        >search</button>
                </div>
                <div>
                    {this.state.links.map((link, index) => <Link key={link.id} link={link} index={index} />)}
                </div>
            </div>
        )
    }

    _executeSearch = async () => {
        const { searchText } = this.state
        const result = await this.props.client.query({
            query: ALL_LINKS_SEARCH_QUERY,
            variables: {
                searchText
            }
        })

        const links = result.data.allLinks
        this.setState({ links })
    }
}

const ALL_LINKS_SEARCH_QUERY = gql`
    query AllLinksSearchQuery($searchText: String!) {
        allLinks(filter: {
            OR: [{
                url_contains: $searchText
            }, {
                description_contains: $searchText
            }]
        }) {
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
    }
`

export default withApollo(Search)