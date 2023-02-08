import {
  EmptyState,
  EmptyStateVariant,
  List,
  ListItem,
  Popover,
  Title,
  EmptyStateBody,
  ModalVariant,
  FormGroup,
  Form,
  Modal,
  Button,
  TextInput,
  FormSelect,
  FormSelectOption,
} from '@patternfly/react-core'
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
import { DBaaSInventoryCRName } from '../const'
import './_dbaas-import-view.css'

class AdminConnectionsTable extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      currentNS: window.location.pathname.split('/')[3],
      columns: [
        { title: 'Instance Name', transforms: [wrappable, cellWidth(20), sortable] },
        { title: 'DB Provider', transforms: [wrappable, cellWidth(20), sortable] },
        { title: 'Provider Account', transforms: [wrappable, cellWidth(20), sortable] },
        { title: 'Alert', transforms: [wrappable, cellWidth(10)] },
        { title: 'Project', transforms: [wrappable, cellWidth(10)] },
        { title: 'Bound', transforms: [wrappable, cellWidth(10)] },
        { title: 'User', transforms: [wrappable, cellWidth(15)] },
        { title: 'Application', transforms: [wrappable, cellWidth(15)] },
        { title: '', transforms: [fitContent] },
      ],
      rows: [],
      dBaaSOperatorNameWithVersion: this.props.dBaaSOperatorNameWithVersion,
      noInstances: this.props.noInstances,
      sortBy: {},
      isConnectToAppModalOpen: false,
    }
    this.getRows = this.getRows.bind(this)
    this.onSort = this.onSort.bind(this)
    this.handleConnectToAppModalToggle = this.handleConnectToAppModalToggle.bind(this)
  }

  componentDidMount() {
    this.getRows(this.props.inventoryInstances)
  }

  componentDidUpdate(prevProps) {
    if (
      (this.props.inventoryInstances &&
        this.props.inventoryInstances.length > 0 &&
        !_.isEqual(prevProps.inventoryInstances, this.props.inventoryInstances)) ||
      !_.isEqual(prevProps.filteredInstances, this.props.filteredInstances)
    ) {
      if (this.props.filteredInstances) {
        this.getRows(this.props.filteredInstances)
      } else {
        this.getRows(this.props.inventoryInstances)
      }
    }
  }

  handleConnectToAppModalToggle() {
    console.log('handleConnectToAppModalToggle')
    this.setState(({ isConnectToAppModalOpen }) => ({
      isConnectToAppModalOpen: !isConnectToAppModalOpen,
    }))
  }

  onSort = (_event, index, direction) => {
    let filterKey = ''
    let sortedInstances = []
    const filterColumns = ['serviceName', 'dbProvider', 'providerAcct']
    filterKey = filterColumns[index]
    const { inventoryInstances } = this.props

    if (!_.isEmpty(inventoryInstances)) {
      sortedInstances = inventoryInstances.sort((a, b) => {
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

    this.getRows(direction === SortByDirection.asc ? sortedInstances : sortedInstances.reverse())
    this.setState({ sortBy: { index, direction } })
  }

  getRows(data) {
    let rowList = []
    const genericAlert = 'Click on the link below for more information about this issue.'
    if (data && data.length > 0) {
      data.forEach((inventoryInstance) => {
        console.log('inventoryInstance')
        console.log(inventoryInstance.connections)
        rowList.push({
          cells: [
            inventoryInstance.serviceName,
            inventoryInstance.dbProvider,
            inventoryInstance.providerAcct,
            inventoryInstance.alert.length > 0 ? (
              <div>
                <Popover
                  aria-label="Basic popover"
                  headerContent={inventoryInstance.alert !== 'alert' ? <div>Connection issue</div> : <div>Issue</div>}
                  bodyContent={
                    inventoryInstance.alert !== 'alert' ? (
                      <div>
                        {inventoryInstance.alert} {genericAlert}
                      </div>
                    ) : (
                      <div>{genericAlert}</div>
                    )
                  }
                  footerContent={
                    <a
                      href={`/k8s/ns/${this.state.currentNS}/clusterserviceversions/${this.state.dBaaSOperatorNameWithVersion}/${DBaaSInventoryCRName}/${inventoryInstance.providerAcct}`}
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
            <React.Fragment>
              <List isPlain>
                {inventoryInstance.connections.map((con) => (
                  <ListItem>{con[0]}</ListItem>
                ))}
              </List>
            </React.Fragment>,
            <React.Fragment>
              <List isPlain>
                {inventoryInstance.connections.map((con) => (
                  <ListItem>{con[1]}</ListItem>
                ))}
              </List>
            </React.Fragment>,
            <React.Fragment>
              <List isPlain>
                {inventoryInstance.connections.map((con) => (
                  <ListItem>{con[2]}</ListItem>
                ))}
              </List>
            </React.Fragment>,
            <React.Fragment>
              <List isPlain>
                {inventoryInstance.connections.map((con) => (
                  <ListItem>{con[3]}</ListItem>
                ))}
              </List>
            </React.Fragment>,
            <React.Fragment>
              <ActionsColumn items={this.defaultItems(inventoryInstance)} />
            </React.Fragment>,
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
                <EmptyStateBody>
                  {this.state.noInstances
                    ? 'Import a database provider account to view available database instances.'
                    : ''}
                </EmptyStateBody>
              </EmptyState>
            ),
          },
        ],
      })
    }
    this.setState({ rows: rowList })
  }

  defaultItems = (instance) => [
    {
      title: 'Connect to application',
      onClick: this.handleConnectToAppModalToggle,
    },
  ]

  render() {
    const { columns, rows, sortBy, isConnectToAppModalOpen } = this.state
    const { inventoryInstances } = this.props

    return (
      <React.Fragment>
        <Modal
          variant={ModalVariant.small}
          title="Connect to application"
          description="Please select the application you wish to connect to."
          isOpen={isConnectToAppModalOpen}
          onClose={this.handleConnectToAppModalToggle}
          actions={[
            <Button
              key="create"
              variant="primary"
              form="modal-with-form-form"
              onClick={this.handleConnectToAppModalToggle}
            >
              Connect
            </Button>,
            <Button key="cancel" variant="link" onClick={this.handleConnectToAppModalToggle}>
              Cancel
            </Button>,
          ]}
        >
          <Form id="modal-with-form-form">
            <FormGroup label="Project" fieldId="project" isRequired>
              <FormSelect
                isRequired
                // value={selectedInventory.name}
                // onChange={handleInventorySelection}
                aria-label="Project"
              >
                {/* {filteredInventories?.map((inventory, index) => ( */}
                {/*     <FormSelectOption key={index} value={inventory.name} label={inventory.name} /> */}
                {/* ))} */}
              </FormSelect>
            </FormGroup>
            <FormGroup
              label="Application"
              fieldId="application"
              isRequired
              helperTextInvalid="This is a required field"
            >
              <FormSelect
                isRequired
                // value={selectedInventory.name}
                // onChange={handleInventorySelection}
                aria-label="Application"
              >
                {/* {filteredInventories?.map((inventory, index) => ( */}
                {/*     <FormSelectOption key={index} value={inventory.name} label={inventory.name} /> */}
                {/* ))} */}
              </FormSelect>
            </FormGroup>
          </Form>
        </Modal>

        <div className="sticky-table-container">
          <OuterScrollContainer>
            <InnerScrollContainer>
              <Table
                sortBy={!_.isEmpty(inventoryInstances) ? sortBy : null}
                onSort={!_.isEmpty(inventoryInstances) ? this.onSort : null}
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
export default AdminConnectionsTable
