import { EmptyState, EmptyStateVariant, List, ListItem, Popover, Title, EmptyStateBody } from '@patternfly/react-core'
import { ExclamationTriangleIcon } from '@patternfly/react-icons'
import {
  cellWidth,
  Table,
  TableBody,
  TableHeader,
  wrappable,
  OuterScrollContainer,
  InnerScrollContainer,
  sortable,
  SortByDirection,
  ActionsColumn,
  fitContent,
} from '@patternfly/react-table'
import _ from 'lodash'
import React from 'react'
import {
  cockroachdbProviderName,
  cockroachdbProviderType,
  crunchyProviderName,
  crunchyProviderType,
  DBaaSInventoryCRName,
  mongoProviderName,
  mongoProviderType,
  rdsProviderName,
  rdsProviderType,
} from '../const'
import './_dbaas-import-view.css'

class AdminProvidersTable extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      currentNS: window.location.pathname.split('/')[3],
      columns: [
        { title: 'DB Provider', transforms: [wrappable, cellWidth(20), sortable] },
        { title: 'Provider Account', transforms: [wrappable, cellWidth(20), sortable] },
        { title: 'Alert', transforms: [wrappable, cellWidth(10)] },
        { title: 'Import Date', transforms: [wrappable, cellWidth(10)] },
      ],
      rows: [],
      dBaaSOperatorNameWithVersion: this.props.dBaaSOperatorNameWithVersion,
      noInstances: this.props.noInstances,
      sortBy: {},
    }
    this.getRows = this.getRows.bind(this)
    this.onSort = this.onSort.bind(this)
  }

  componentDidMount() {
    this.getRows(this.props.inventories)
  }

  componentDidUpdate(prevProps) {
    if (!_.isEqual(prevProps.inventories, this.props.inventories)) {
      if (this.props.inventories) {
        this.getRows(this.props.inventories)
      }
    }
  }

  onSort = (_event, index, direction) => {
    let filterKey = ''
    let sortedInventories = []
    const filterColumns = ['providername', 'name']
    filterKey = filterColumns[index]
    const { inventories } = this.props

    if (!_.isEmpty(inventories)) {
      sortedInventories = inventories.sort((a, b) => {
        const keyA = a[filterKey].toLowerCase()
        const keyB = b[filterKey].toLowerCase()
        if (keyA < keyB) {
          return -1
        }
        if (keyA > keyB) {
          return 1
        }
        return 0
      })
    }

    this.getRows(direction === SortByDirection.asc ? sortedInventories : sortedInventories.reverse())
    this.setState({ sortBy: { index, direction } })
  }

  getRows(data) {
    let rowList = []
    const genericAlert = 'Click on the link below for more information about this issue.'
    if (data && data.length > 0) {
      data.forEach((inventory) => {
        rowList.push({
          cells: [
            this.getProviderName(inventory.providername),
            //inventory.providername,
            inventory.name,
            inventory.alert.length > 0 ? (
              <div>
                <Popover
                  aria-label="Basic popover"
                  headerContent={inventory.alert !== 'alert' ? <div>Connection issue</div> : <div>Issue</div>}
                  bodyContent={
                    inventory.alert !== 'alert' ? (
                      <div>
                        {inventory.alert} {genericAlert}
                      </div>
                    ) : (
                      <div>{genericAlert}</div>
                    )
                  }
                  footerContent={
                    <a
                      href={`/k8s/ns/${this.state.currentNS}/clusterserviceversions/${this.state.dBaaSOperatorNameWithVersion}/${DBaaSInventoryCRName}/${inventory.name}`}
                    >
                      Learn more
                    </a>
                  }
                >
                  <div>
                    <ExclamationTriangleIcon color="#f0ab00"></ExclamationTriangleIcon>
                    <span className="issue-text"> Issue</span>
                  </div>
                </Popover>
              </div>
            ) : (
              ''
            ),
            inventory.importdate,
          ],
        })
      })
    } else {
      // Empty State for the table
      rowList.push({
        heightAuto: true,
        cells: [
          {
            props: { colSpan: 8 },
            title: (
              <EmptyState variant={EmptyStateVariant.small}>
                <Title headingLevel="h2" size="lg">
                  {this.state.noInstances ? 'No database provider account imported' : 'No database instances'}
                </Title>
                <EmptyStateBody>{this.state.noInstances ? 'Import a database provider account.' : ''}</EmptyStateBody>
              </EmptyState>
            ),
          },
        ],
      })
    }
    this.setState({ rows: rowList })
  }

  getProviderName = (providerName) => {
    let dbProvider
    if (providerName === crunchyProviderType) {
      dbProvider = crunchyProviderName
    } else if (providerName === mongoProviderType) {
      dbProvider = mongoProviderName
    } else if (providerName === cockroachdbProviderType) {
      dbProvider = cockroachdbProviderName
    } else if (providerName === rdsProviderType) {
      dbProvider = rdsProviderName
    }
    return dbProvider
  }

  render() {
    const { columns, rows, sortBy } = this.state
    const { inventories } = this.props

    return (
      <React.Fragment>
        <div className="sticky-table-container">
          <OuterScrollContainer>
            <InnerScrollContainer>
              <Table
                sortBy={!_.isEmpty(inventories) ? sortBy : null}
                onSort={!_.isEmpty(inventories) ? this.onSort : null}
                id="instance-connection-status-table"
                aria-label="Instance Connection Status Table"
                cells={columns}
                rows={rows}
              >
                <TableHeader className="sticky-header-th" />
                <TableBody />
              </Table>
            </InnerScrollContainer>
          </OuterScrollContainer>
        </div>
      </React.Fragment>
    )
  }
}
export default AdminProvidersTable
