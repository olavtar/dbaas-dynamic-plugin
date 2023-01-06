import * as React from 'react'
import * as _ from 'lodash'
import './_dbaas-import-view.css'
import {
  Title,
  TextInput,
  FormGroup,
  FormSelect,
  FormSelectOption,
  Button,
  ActionGroup,
  Alert,
  EmptyState,
  EmptyStateIcon,
  EmptyStateBody,
  EmptyStateSecondaryActions,
  Spinner,
  Divider,
  ValidatedOptions,
  HelperTextItem,
  HelperText,
  Popover,
  FormFieldGroup,
  FormFieldGroupHeader,
} from '@patternfly/react-core'
import { InfoCircleIcon, CheckCircleIcon, ExternalLinkAltIcon, HelpIcon } from '@patternfly/react-icons'
import FormHeader from './form/formHeader'
import FlexForm from './form/flexForm'
import FormBody from './form/formBody'
import {
  mongoProviderType,
  crunchyProviderType,
  rdsProviderType,
  DBaaSOperatorName,
  rdsEngineTypeDocUrl,
  cockroachdbProviderType,
} from '../const'
import {
  getCSRFToken,
  fetchInventoriesAndMapByNSAndRules,
  disableNSSelection,
  enableNSSelection,
  filterInventoriesByConnNSandProvision,
  fetchDbaasCSV,
} from '../utils'

const LoadingView = ({ loadingMsg }) => (
  <>
    <EmptyState>
      <EmptyStateIcon variant="container" component={Spinner} />
      <Title size="lg" headingLevel="h3">
        {loadingMsg}
      </Title>
    </EmptyState>
  </>
)

const FailedView = ({ handleTryAgain, handleCancel, statusMsg }) => (
  <>
    <EmptyState>
      <EmptyStateIcon variant="container" component={InfoCircleIcon} className="error-icon" />
      <Title headingLevel="h2" size="md">
        Database instance creation failed
      </Title>
      <EmptyStateBody>The instance was not created. Try again.</EmptyStateBody>
      <Alert variant="danger" isInline title="An error occured" className="co-alert co-break-word extra-top-margin">
        <div>{statusMsg}</div>
      </Alert>
      <Button variant="primary" onClick={handleTryAgain}>
        Try Again
      </Button>
      <EmptyStateSecondaryActions>
        <Button variant="link" onClick={handleCancel}>
          Close
        </Button>
      </EmptyStateSecondaryActions>
    </EmptyState>
  </>
)

const SuccessView = ({ goToInstancesPage }) => (
  <>
    <EmptyState>
      <EmptyStateIcon variant="container" component={CheckCircleIcon} className="success-icon" />
      <Title headingLevel="h2" size="md">
        Database instance creation started
      </Title>
      <EmptyStateBody>The database instance is being created, please click the button below to view it.</EmptyStateBody>
      <Button variant="primary" onClick={goToInstancesPage}>
        View Database Instances
      </Button>
    </EmptyState>
  </>
)

const ProviderClusterProvisionPage = () => {
  const [plan, setPlan] = React.useState([])
  const [planOptions, setPlanOptions] = React.useState([])
  const [isPlanFieldValid, setIsPlanFieldValid] = React.useState('')
  const [cloudProvider, setCloudProvider] = React.useState([])
  const [cpOptions, setCpOptions] = React.useState([])
  const [selectedProvisioningData, setSelectedProvisioningData] = React.useState({})
  const [isSpendLimitFieldValid, setIsSpendLimitFieldValid] = React.useState('')
  const [isRegionFieldValid, setIsRegionFieldValid] = React.useState('')
  const [isCloudProviderFieldValid, setIsCloudProviderFieldValid] = React.useState('')
  const [isNodesFieldValid, setIsNodesFieldValid] = React.useState('')
  const [isComputeFieldValid, setIsComputeFieldValid] = React.useState('')
  const [isStorageFieldValid, setIsStorageFieldValid] = React.useState('')

  // const [filteredFields, setFilteredFields] = React.useState([])
  const [filteredFieldsMap, setFilteredFieldsMap] = React.useState(new Map())
  const [providerChosenOptionsMap, setProviderChosenOptionsMap] = React.useState(new Map())

  const [loadingMsg, setLoadingMsg] = React.useState('Fetching Database Providers and Provider Accounts...')
  const [providerList, setProviderList] = React.useState([{ value: '', label: 'Select database provider' }])
  const [selectedDBProvider, setSelectedDBProvider] = React.useState({})
  const [inventories, setInventories] = React.useState([])
  const [filteredInventories, setFilteredInventories] = React.useState([{ name: 'Select provider account' }])
  const [selectedInventory, setSelectedInventory] = React.useState({})
  const [clusterName, setClusterName] = React.useState('')
  const [projectName, setProjectName] = React.useState('')

  const [engine, setEngine] = React.useState('')
  const [statusMsg, setStatusMsg] = React.useState('')
  const [inventoryHasIssue, setInventoryHasIssue] = React.useState(false)
  const [showResults, setShowResults] = React.useState(false)
  const [clusterProvisionFailed, setClusterProvisionFailed] = React.useState(false)
  const [clusterProvisionSuccess, setClusterProvisionSuccess] = React.useState(false)
  const [provisionRequestFired, setProvisionRequestFired] = React.useState(false)
  const [isDBProviderFieldValid, setIsDBProviderFieldValid] = React.useState('')
  const [isInventoryFieldValid, setIsInventoryFieldValid] = React.useState('')
  const [isInstanceNameFieldValid, setIsInstanceNameFieldValid] = React.useState('')
  const [isProjectNameFieldValid, setIsProjectNameFieldValid] = React.useState('')
  const [isEngineFieldValid, setIsEngineFieldValid] = React.useState('')
  const [isFormValid, setIsFormValid] = React.useState(false)
  const [installNamespace, setInstallNamespace] = React.useState('')
  const currentNS = window.location.pathname.split('/')[3]
  const devSelectedDBProviderName = window.location.pathname.split('/db/')[1]?.split('/pa/')[0]
  const devSelectedProviderAccountName = window.location.pathname.split('/pa/')[1]
  const checkDBClusterStatusIntervalID = React.useRef()
  const checkDBClusterStatusTimeoutID = React.useRef()
  const engineTypeOptions = [
    { value: '', label: 'Select one', disabled: true, isPlaceholder: true },
    { value: 'mariadb', label: 'MariaDB', disabled: false },
    { value: 'mysql', label: 'MySQL', disabled: false },
    { value: 'postgres', label: 'PostgreSQL', disabled: false },
  ]

  const checkInventoryStatus = (inventory) => {
    if (inventory?.status?.conditions[0]?.type === 'SpecSynced') {
      if (inventory?.status?.conditions[0]?.status === 'False') {
        setInventoryHasIssue(true)
        setStatusMsg(inventory?.status?.conditions[0]?.message)
      } else {
        setInventoryHasIssue(false)
        setStatusMsg('')
      }
    } else {
      setInventoryHasIssue(true)
      setStatusMsg('Could not connect with database provider')
    }
  }

  const detectSelectedDBProviderAndProviderAccount = () => {
    if (!_.isEmpty(devSelectedDBProviderName) && !_.isEmpty(providerList)) {
      const provider = _.find(providerList, (dbProvider) => dbProvider.value === devSelectedDBProviderName)
      setSelectedDBProvider(provider)
      filterInventoriesByProvider(provider)
      setIsDBProviderFieldValid(ValidatedOptions.default)
      setSelectedProvisioningData(provider.providerProvisioningData)
    }

    if (!_.isEmpty(devSelectedProviderAccountName) && !_.isEmpty(inventories)) {
      const inventory = inventories.forEach((inv) => {
        if (inv.name === devSelectedProviderAccountName) {
          checkInventoryStatus(inv)
          setSelectedInventory(inv)
          setIsInventoryFieldValid(ValidatedOptions.default)
        }
      })
    }
  }

  const goToInstancesPage = () => {
    if (!_.isEmpty(devSelectedDBProviderName) && !_.isEmpty(devSelectedProviderAccountName)) {
      window.location.pathname = `/k8s/ns/${currentNS}/${devSelectedDBProviderName}`
    } else {
      window.location.pathname = `/k8s/ns/${currentNS}/rhoda-admin-dashboard`
    }
  }

  const handleTryAgain = () => {
    location.reload()
  }

  const handleCancel = () => {
    window.history.back()
  }

  const checkDBClusterStatus = (clusterName) => {
    if (!_.isEmpty(clusterName)) {
      const requestOpts = {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      }

      fetch(
        `/api/kubernetes/apis/dbaas.redhat.com/v1alpha1/namespaces/${currentNS}/dbaasinstances/${clusterName}`,
        requestOpts
      )
        .then((response) => response.json())
        .then((responseJson) => {
          const provisionReadyCondition = responseJson?.status?.conditions?.find(
            (condition) => condition.type?.toLowerCase() === 'provisionready'
          )

          if (responseJson?.status?.phase?.toLowerCase() === 'creating') {
            setClusterProvisionSuccess(true)
            clearInterval(checkDBClusterStatusIntervalID.current)
            clearTimeout(checkDBClusterStatusTimeoutID.current)
            setShowResults(true)
          } else if (responseJson?.status?.phase?.toLowerCase() === 'failed') {
            if (provisionReadyCondition?.status.toLowerCase() === 'false') {
              setClusterProvisionFailed(true)
              setStatusMsg(provisionReadyCondition?.message)
              clearInterval(checkDBClusterStatusIntervalID.current)
              clearTimeout(checkDBClusterStatusTimeoutID.current)
              setShowResults(true)
            }
          } else if (responseJson?.status?.phase?.toLowerCase() === 'ready') {
            setClusterProvisionSuccess(true)
            clearInterval(checkDBClusterStatusIntervalID.current)
            clearTimeout(checkDBClusterStatusTimeoutID.current)
            setShowResults(true)
          } else {
            if (!_.isEmpty(provisionReadyCondition?.message)) {
              setStatusMsg(provisionReadyCondition?.message)
            } else {
              setStatusMsg('Could not connect with database provider')
            }
            if (!checkDBClusterStatusTimeoutID.current) {
              checkDBClusterStatusTimeoutID.current = setTimeout(() => {
                setClusterProvisionFailed(true)
                clearInterval(checkDBClusterStatusIntervalID.current)
                setShowResults(true)
              }, 30000)
            }
          }
        })
    }
  }

  const provisionDBCluster = (e) => {
    e.preventDefault()

    if (!isFormValid) return

    let otherInstanceParams = {}

    if (selectedDBProvider.value === mongoProviderType) {
      otherInstanceParams = { projectName }
    } else if (selectedDBProvider.value === rdsProviderType) {
      otherInstanceParams = { Engine: engine.value }
    } else if (selectedDBProvider.value === cockroachdbProviderType) {
      if (plan.value === 'SERVERLESS') {
        otherInstanceParams = {
          cloudProvider: providerChosenOptionsMap.get('cloudProvider').value,
          plan: providerChosenOptionsMap.get('plan').value,
          regions: providerChosenOptionsMap.get('regions').value,
          spendLimit: providerChosenOptionsMap.get('spendLimit').value,
        }
      } else if (plan.value === 'DEDICATED') {
        otherInstanceParams = {
          cloudProvider: providerChosenOptionsMap.get('cloudProvider').value,
          plan: providerChosenOptionsMap.get('plan').value,
          regions: providerChosenOptionsMap.get('regions').value,
          nodes: providerChosenOptionsMap.get('nodes').value,
          machineType: providerChosenOptionsMap.get('machineType').value,
          storageGib: providerChosenOptionsMap.get('storageGib').value,
        }
      } else {
        otherInstanceParams = {}
      }
    }

    const requestOpts = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-CSRFToken': getCSRFToken(),
      },
      body: JSON.stringify({
        apiVersion: 'dbaas.redhat.com/v1alpha1',
        kind: 'DBaaSInstance',
        metadata: {
          name: clusterName,
          namespace: currentNS,
        },
        spec: {
          name: clusterName,
          inventoryRef: {
            name: selectedInventory.name,
            namespace: selectedInventory.namespace,
          },
          otherInstanceParams,
        },
      }),
    }

    setShowResults(false)
    setLoadingMsg('Creating Database Instance...')

    fetch(`/api/kubernetes/apis/dbaas.redhat.com/v1alpha1/namespaces/${currentNS}/dbaasinstances`, requestOpts)
      .then((response) => response.json())
      .then((data) => {
        if (data.status === 'Failure') {
          setProvisionRequestFired(true)
          setClusterProvisionFailed(true)
          setStatusMsg(data.message)
          setShowResults(true)
        } else {
          setProvisionRequestFired(true)
          checkDBClusterStatusIntervalID.current = setInterval(() => {
            checkDBClusterStatus(data?.metadata?.name)
          }, 3000)
        }
      })
      .catch((err) => {
        if (err?.response?.status == 404) {
          console.warn(err)
        } else {
          console.warn(err)
        }
      })
  }

  const fetchCSV = async () => {
    const dbaasCSV = await fetchDbaasCSV(currentNS, DBaaSOperatorName)
    setInstallNamespace(dbaasCSV?.metadata?.annotations['olm.operatorNamespace'])
  }

  const filterInventoriesByProvider = (provider) => {
    if (!_.isEmpty(provider)) {
      const filteredInventoryList = _.filter(inventories, (inventory) => inventory.providerRef?.name === provider.value)
      setFilteredInventories(filteredInventoryList)

      // Set the first inventory as the selected inventory by default
      if (filteredInventoryList.length > 0) {
        checkInventoryStatus(filteredInventoryList[0])
        setSelectedInventory(filteredInventoryList[0])
      }

      if (_.isEmpty(filteredInventoryList)) {
        setIsInventoryFieldValid(ValidatedOptions.error)
      } else {
        setIsInventoryFieldValid(ValidatedOptions.default)
      }
    }
  }

  const parseInventories = (inventoryItems) => {
    if (inventoryItems.length > 0) {
      const inventories = []

      inventoryItems.forEach((inventory, index) => {
        const obj = { id: 0, name: '', namespace: '', instances: [], status: {}, providerRef: {} }
        obj.id = index
        obj.name = inventory.metadata?.name
        obj.namespace = inventory.metadata?.namespace
        obj.status = inventory.status
        obj.providerRef = inventory.spec?.providerRef

        if (
          inventory.status?.conditions[0]?.status !== 'False' &&
          inventory.status?.conditions[0]?.type === 'SpecSynced'
        ) {
          inventory.status?.instances?.map((instance) => (instance.provider = inventory.spec?.providerRef?.name))
          obj.instances = inventory.status?.instances
        }

        inventories.push(obj)
      })
      setInventories(inventories)
      setShowResults(true)
    }
  }

  async function fetchInventoriesByNSAndRules() {
    const inventoryItems = await filteredInventoriesByValidConnectionNS(installNamespace)
    parseInventories(inventoryItems)
  }

  async function filteredInventoriesByValidConnectionNS(installNS = '') {
    const inventoryData = await fetchInventoriesAndMapByNSAndRules(installNS).catch((error) => {
      console.log(error)
    })
    return await filterInventoriesByConnNSandProvision(inventoryData, currentNS)
  }

  const validateForm = () => {
    let isValid =
      isDBProviderFieldValid === ValidatedOptions.default &&
      isInventoryFieldValid === ValidatedOptions.default &&
      isInstanceNameFieldValid === ValidatedOptions.default

    if (selectedDBProvider.value === mongoProviderType) {
      isValid = isValid && isProjectNameFieldValid === ValidatedOptions.default
    }
    if (selectedDBProvider.value === rdsProviderType) {
      isValid = isValid && isEngineFieldValid === ValidatedOptions.default
    }
    // if (selectedDBProvider.value === cockroachdbProviderType) {
    //   isValid =
    //     isValid &&
    //     isPlanFieldValid === ValidatedOptions.default &&
    //     isCloudProviderFieldValid === ValidatedOptions.default &&
    //     isRegionFieldValid === ValidatedOptions.default
    //   if (plan.value === 'SERVERLESS') {
    //     isValid = isValid && isSpendLimitFieldValid === ValidatedOptions.default
    //   } else if (plan.value === 'DEDICATED') {
    //     isValid =
    //       isValid &&
    //       isComputeFieldValid === ValidatedOptions.default &&
    //       isNodesFieldValid === ValidatedOptions.default &&
    //       isStorageFieldValid === ValidatedOptions.default
    //   }
    // }
    setIsFormValid(isValid)
  }

  const handleProjectNameChange = (value) => {
    if (_.isEmpty(value)) {
      setIsProjectNameFieldValid(ValidatedOptions.error)
    } else {
      setIsProjectNameFieldValid(ValidatedOptions.default)
    }
    setProjectName(value)
  }

  const handleEngineChange = (value) => {
    if (_.isEmpty(value)) {
      setIsEngineFieldValid(ValidatedOptions.error)
    } else {
      setIsEngineFieldValid(ValidatedOptions.default)
    }
    const engineType = _.find(engineTypeOptions, (eng) => eng.value === value)
    setEngine(engineType)
  }

  const handleInstanceNameChange = (value) => {
    if (_.isEmpty(value)) {
      setIsInstanceNameFieldValid(ValidatedOptions.error)
    } else {
      setIsInstanceNameFieldValid(ValidatedOptions.default)
    }
    setClusterName(value)
  }

  const handleInventorySelection = (value) => {
    if (_.isEmpty(value)) {
      setIsInventoryFieldValid(ValidatedOptions.error)
    } else {
      setIsInventoryFieldValid(ValidatedOptions.default)
    }
    const inventory = _.find(inventories, (inv) => inv.name === value)
    checkInventoryStatus(inventory)
    setSelectedInventory(inventory)
  }

  const filterSelected = (unfilteredList, selections) => {
    let matchedItem
    // console.log('filterSelected')
    // console.log(unfilteredList)
    // console.log(selections)

    filterLoop: for (const item of unfilteredList) {
      if (item.dependencies !== undefined) {
        for (const dependsItem of item.dependencies) {
          if (dependsItem.value !== selections.get(dependsItem.field)) {
            continue filterLoop
          }
        }
      }
      matchedItem = item
    }
    return matchedItem
  }

  const setDefaultProviderData = (providerProvisioningData) => {
    console.log('setDefaultProviderData')
    // setting plan options and initial value
    console.log('defatulPlan')

    const selections = new Map()

    if (providerProvisioningData.plan?.conditionalData[0].defaultValue === undefined) {
      setIsPlanFieldValid(ValidatedOptions.error)
    } else {
      const defatulPlan = _.find(
        providerProvisioningData.plan?.conditionalData[0].options,
        (item) => item.value === providerProvisioningData.plan?.conditionalData[0].defaultValue
      )
      console.log(defatulPlan)
      setPlan(defatulPlan)
      setPlanOptions(providerProvisioningData.plan.conditionalData[0].options)
      setIsPlanFieldValid(ValidatedOptions.default)
      selections.set('plan', defatulPlan.value)
    }
    console.log(selections)
    // setting cloud provider options and initial value
    console.log('cloudProvider cpDefault')
    const cpDefault = filterSelected(providerProvisioningData.cloudProvider.conditionalData, selections)

    console.log(cpDefault)
    if (cpDefault.defaultValue === undefined) {
      setIsCloudProviderFieldValid(ValidatedOptions.error)
    } else {
      const cloudProviderDefault = _.find(cpDefault.options, (item) => item.value === cpDefault.defaultValue)
      console.log('cloudProviderDefault')
      console.log(cloudProviderDefault)
      setCloudProvider(cloudProviderDefault)
      setProviderChosenOptionsMap(new Map(providerChosenOptionsMap.set('cloudProvider', cloudProviderDefault)))
      setCpOptions(cpDefault.options)
      setIsCloudProviderFieldValid(ValidatedOptions.default)
    }
  }

  const handleDBProviderSelection = (value) => {
    if (_.isEmpty(value)) {
      setIsDBProviderFieldValid(ValidatedOptions.error)
    } else {
      setIsDBProviderFieldValid(ValidatedOptions.default)
    }
    if (!_.isEmpty(providerList)) {
      const provider = _.find(providerList, (dbProvider) => dbProvider.value === value)
      setInventoryHasIssue(false)
      setSelectedDBProvider(provider)
      console.log('provider')
      console.log(provider)
      if (provider.value === cockroachdbProviderType) {
        setSelectedProvisioningData(provider.providerProvisioningData)
        setDefaultProviderData(provider.providerProvisioningData)
      }
      filterInventoriesByProvider(provider)
    }
  }

  const fetchProviderInfo = () => {
    const requestOpts = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    }

    fetch('/api/kubernetes/apis/dbaas.redhat.com/v1alpha1/dbaasproviders', requestOpts)
      .then((response) => response.json())
      .then((data) => {
        const dbProviderList = []
        data.items?.forEach((dbProvider) => {
          console.log('dbProvider')
          console.log(dbProvider)

          dbProviderList.push({
            value: dbProvider?.metadata?.name,
            label: dbProvider?.spec?.provider?.displayName,
            allowsFreeTrial: dbProvider?.spec?.allowsFreeTrial,
            externalProvisionInfo: {
              url: dbProvider?.spec?.externalProvisionURL,
              desc: dbProvider?.spec?.externalProvisionDescription,
            },
            providerProvisioningData: dbProvider?.spec?.provisioningParameters,
          })
        })
        setProviderList(providerList.concat(dbProviderList))
      })
      .catch((err) => {
        console.error(err)
      })
  }

  const handlePlanChange = (value) => {
    console.log('handlePlanChange')
    console.log(value)
    if (_.isEmpty(value)) {
      setIsPlanFieldValid(ValidatedOptions.error)
    } else {
      setIsPlanFieldValid(ValidatedOptions.default)
    }
    const selectedPlan = _.find(planOptions, (cpPlan) => cpPlan.displayValue === value)
    setPlan(selectedPlan)
    setProviderChosenOptionsMap(new Map(providerChosenOptionsMap.set('plan', plan)))
    console.log(providerChosenOptionsMap)
  }

  const handleRegionChange = (value) => {
    console.log('handleRegionChange')

    const selectedRegion = _.find(
      filteredFieldsMap.get('regions').options,
      (cpRegion) => cpRegion.displayValue === value
    )
    console.log(selectedRegion)
    setProviderChosenOptionsMap(new Map(providerChosenOptionsMap.set('regions', selectedRegion)))

    console.log(providerChosenOptionsMap)
  }

  const handleCPChange = (value) => {
    console.log('handleCPChange')
    console.log(value)
    console.log(filteredFieldsMap)
    if (_.isEmpty(value)) {
      setIsCloudProviderFieldValid(ValidatedOptions.error)
    } else {
      setIsCloudProviderFieldValid(ValidatedOptions.default)
    }
    const selectedCP = _.find(filteredFieldsMap.get('cloudProvider').options, (cp) => cp.displayValue === value)
    setCloudProvider(selectedCP)
    setProviderChosenOptionsMap(new Map(providerChosenOptionsMap.set('cloudProvider', selectedCP)))
    console.log(providerChosenOptionsMap)
  }

  const handleSpendLimitChange = (value) => {
    console.log('handleSpendLimitChange')
    console.log(value)
    if (_.isEmpty(value)) {
      setIsSpendLimitFieldValid(ValidatedOptions.error)
    } else {
      setIsSpendLimitFieldValid(ValidatedOptions.default)
    }
    setProviderChosenOptionsMap(new Map(providerChosenOptionsMap.set('spendLimit', value)))

    console.log(providerChosenOptionsMap)
  }

  const handleNodesChange = (value) => {
    console.log('handleNodesChange')
    const selectedNodes = _.find(filteredFieldsMap.get('nodes').options, (cpNodes) => cpNodes.displayValue === value)
    setProviderChosenOptionsMap(new Map(providerChosenOptionsMap.set('nodes', selectedNodes)))
    console.log(providerChosenOptionsMap)
  }

  const handleComputeChange = (value) => {
    const selectedCompute = _.find(
      filteredFieldsMap.get('machineType').options,
      (cpCompute) => cpCompute.displayValue === value
    )
    setProviderChosenOptionsMap(new Map(providerChosenOptionsMap.set('machineType', selectedCompute)))
    console.log(providerChosenOptionsMap)
  }

  const handleStorageChange = (value) => {
    const selectedStorage = _.find(
      filteredFieldsMap.get('storageGib').options,
      (cpStorage) => cpStorage.displayValue === value
    )
    setProviderChosenOptionsMap(new Map(providerChosenOptionsMap.set('storageGib', selectedStorage)))
    console.log(providerChosenOptionsMap)
  }

  const setDBProviderFields = () => {
    if (selectedDBProvider.value === mongoProviderType) {
      return (
        <FormGroup
          label="Project Name"
          fieldId="project-name"
          isRequired
          className="half-width-selection"
          helperTextInvalid="This is a required field"
          validated={isProjectNameFieldValid}
        >
          <TextInput
            isRequired
            type="text"
            id="project-name"
            name="project-name"
            value={projectName}
            onChange={handleProjectNameChange}
            validated={isProjectNameFieldValid}
          />
          <HelperText>
            <HelperTextItem variant="indeterminate">
              Name of project under which database instance will be created at MongoDB Atlas
            </HelperTextItem>
          </HelperText>
        </FormGroup>
      )
    }
    if (selectedDBProvider.value === rdsProviderType) {
      return (
        <>
          <FormGroup
            label="Engine Type"
            fieldId="engine"
            isRequired
            className="half-width-selection"
            helperTextInvalid="This is a required field"
            validated={isEngineFieldValid}
            labelIcon={
              <Popover
                headerContent={<div>Engine Type</div>}
                bodyContent={
                  <div>
                    The following options are set, regardless of which database engine is selected: <br />
                    <ul>
                      <li>DBInstanceClass: "db.t3.micro"</li>
                      <li>AllocatedStorage: 20 (GB)</li>
                      <li>PubliclyAccessible: true</li>
                      <li>AvailabilityZone: "us-east-1a"</li>
                    </ul>
                  </div>
                }
                footerContent={
                  <Button
                    variant="link"
                    component="a"
                    href={rdsEngineTypeDocUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    icon={<ExternalLinkAltIcon />}
                    iconPosition="right"
                    isInline
                  >
                    Learn more
                  </Button>
                }
              >
                <button
                  type="button"
                  aria-label="more info"
                  onClick={(e) => e.preventDefault()}
                  aria-describedby="more-info"
                  className="pf-c-form__group-label-help"
                >
                  <HelpIcon noVerticalAlign />
                </button>
              </Popover>
            }
          >
            <FormSelect
              isRequired
              value={engine.value}
              onChange={handleEngineChange}
              aria-label="Engine Type"
              validated={isEngineFieldValid}
            >
              {engineTypeOptions.map((option, index) => (
                <FormSelectOption isDisabled={option.disabled} key={index} value={option.value} label={option.label} />
              ))}
            </FormSelect>
            <HelperText>
              <HelperTextItem variant="indeterminate">
                The name of the database engine to be used for this instance
              </HelperTextItem>
            </HelperText>
          </FormGroup>
        </>
      )
    }
    if (selectedDBProvider.value === cockroachdbProviderType) {
      if (plan.displayValue === 'Free trial') {
        return <></>
      }
      return (
        <>
          {plan.displayValue === 'Serverless' ? (
            <>
              <FormFieldGroup
                className="half-width-selection"
                header={
                  <FormFieldGroupHeader
                    titleText={{
                      text: selectedProvisioningData.serverlessLocationLabel.displayName,
                      id: 'field-group4-non-expandable-titleText-id',
                    }}
                    titleDescription={selectedProvisioningData.serverlessLocationLabel.helpText}
                  />
                }
              >
                <FormGroup
                  label={selectedProvisioningData.regions.displayName}
                  fieldId="regions"
                  isRequired
                  helperTextInvalid="This is a required field"
                  validated={isRegionFieldValid}
                  // className={displayField('serverless_regions') === undefined ? 'hide' : 'none'}
                >
                  <FormSelect
                    isRequired
                    value={
                      providerChosenOptionsMap.get('regions') !== undefined &&
                      providerChosenOptionsMap.get('regions').displayValue
                    }
                    onChange={handleRegionChange}
                    aria-label="regions"
                    validated={isRegionFieldValid}
                  >
                    {filteredFieldsMap.get('regions') !== undefined &&
                      filteredFieldsMap
                        .get('regions')
                        .options.map((option, index) => (
                          <FormSelectOption key={index} value={option.displayValue} label={option.displayValue} />
                        ))}
                  </FormSelect>
                </FormGroup>
              </FormFieldGroup>
              <FormFieldGroup
                className="half-width-selection"
                header={
                  <FormFieldGroupHeader
                    titleText={{
                      text: selectedProvisioningData.spendLimitLabel.displayName,
                      id: 'field-group4-non-expandable-titleText-id',
                    }}
                    titleDescription={selectedProvisioningData.spendLimitLabel.helpText}
                  />
                }
              >
                <FormGroup
                  label={selectedProvisioningData.spendLimit.displayName}
                  fieldId="spendLimit"
                  isRequired
                  helperTextInvalid="This is a required field"
                  validated={isSpendLimitFieldValid}
                >
                  <TextInput
                    isRequired
                    type="text"
                    id="spendLimit"
                    name="spendLimit"
                    value={providerChosenOptionsMap.get('spendLimit')}
                    onChange={handleSpendLimitChange}
                    validated={isSpendLimitFieldValid}
                  />
                </FormGroup>
              </FormFieldGroup>
            </>
          ) : (
            <>
              <FormFieldGroup
                className="half-width-selection"
                header={
                  <FormFieldGroupHeader
                    titleText={{
                      text: selectedProvisioningData.dedicatedLocationLabel.displayName,
                      id: 'field-group4-non-expandable-titleText-id',
                    }}
                    titleDescription={selectedProvisioningData.dedicatedLocationLabel.helpText}
                  />
                }
              >
                <FormGroup
                  label={selectedProvisioningData.regions.displayName}
                  fieldId="regions"
                  isRequired
                  helperTextInvalid="This is a required field"
                  validated={isRegionFieldValid}
                  // className={displayField('serverless_regions') === undefined ? 'hide' : 'none'}
                >
                  <FormSelect
                    isRequired
                    value={
                      providerChosenOptionsMap.get('regions') !== undefined &&
                      providerChosenOptionsMap.get('regions').displayValue
                    }
                    onChange={handleRegionChange}
                    aria-label="regions"
                    validated={isRegionFieldValid}
                  >
                    {filteredFieldsMap.get('regions') !== undefined &&
                      filteredFieldsMap
                        .get('regions')
                        .options.map((option, index) => (
                          <FormSelectOption key={index} value={option.displayValue} label={option.displayValue} />
                        ))}
                  </FormSelect>
                </FormGroup>
                <FormGroup
                  label={selectedProvisioningData.nodes.displayName}
                  fieldId="nodes"
                  isRequired
                  // className="half-width-selection"
                  helperTextInvalid="This is a required field"
                  validated={isNodesFieldValid}
                >
                  <FormSelect
                    isRequired
                    value={
                      providerChosenOptionsMap.get('nodes') !== undefined &&
                      providerChosenOptionsMap.get('nodes').displayValue
                    }
                    onChange={handleNodesChange}
                    aria-label="nodes"
                    validated={isNodesFieldValid}
                  >
                    {filteredFieldsMap.get('nodes') !== undefined &&
                      filteredFieldsMap
                        .get('nodes')
                        .options.map((option, index) => (
                          <FormSelectOption key={index} value={option.displayValue} label={option.displayValue} />
                        ))}
                  </FormSelect>
                </FormGroup>
              </FormFieldGroup>
              <FormFieldGroup
                className="half-width-selection"
                header={
                  <FormFieldGroupHeader
                    titleText={{
                      text: selectedProvisioningData.hardwareLabel.displayName,
                      id: 'field-group4-non-expandable-titleText-id',
                    }}
                    titleDescription={selectedProvisioningData.hardwareLabel.helpText}
                  />
                }
              >
                <FormGroup
                  label={selectedProvisioningData.machineType.displayName}
                  fieldId="machineType"
                  isRequired
                  helperTextInvalid="This is a required field"
                  validated={isComputeFieldValid}
                >
                  <FormSelect
                    isRequired
                    value={
                      providerChosenOptionsMap.get('machineType') !== undefined &&
                      providerChosenOptionsMap.get('machineType').displayValue
                    }
                    onChange={handleComputeChange}
                    aria-label="machineType"
                    validated={isComputeFieldValid}
                  >
                    {filteredFieldsMap.get('machineType') !== undefined &&
                      filteredFieldsMap
                        .get('machineType')
                        .options.map((option, index) => (
                          <FormSelectOption key={index} value={option.displayValue} label={option.displayValue} />
                        ))}
                  </FormSelect>
                </FormGroup>
                <FormGroup
                  label={selectedProvisioningData.storageGib.displayName}
                  fieldId="storageGib"
                  isRequired
                  helperTextInvalid="This is a required field"
                  validated={isStorageFieldValid}
                >
                  <FormSelect
                    isRequired
                    value={
                      providerChosenOptionsMap.get('storageGib') !== undefined &&
                      providerChosenOptionsMap.get('storageGib').displayValue
                    }
                    onChange={handleStorageChange}
                    aria-label="storageGib"
                    validated={isStorageFieldValid}
                  >
                    {filteredFieldsMap.get('storageGib') !== undefined &&
                      filteredFieldsMap
                        .get('storageGib')
                        .options.map((option, index) => (
                          <FormSelectOption key={index} value={option.displayValue} label={option.displayValue} />
                        ))}
                  </FormSelect>
                </FormGroup>
              </FormFieldGroup>
            </>
          )}
        </>
      )
    }
    return null
  }

  const setProviderData = () => {
    const selections = new Map()
    console.log('setProviderData')
    selections.set('cloudProvider', cloudProvider.value)
    selections.set('plan', plan.value)
    filteredFieldsMap.clear()
    providerChosenOptionsMap.clear()
    setProviderChosenOptionsMap(new Map(providerChosenOptionsMap.set('plan', plan)))
    setProviderChosenOptionsMap(new Map(providerChosenOptionsMap.set('cloudProvider', cloudProvider)))

    console.log(selectedProvisioningData)
    console.log('selectionsMap')
    console.log(selections)

    Object.keys(selectedProvisioningData).map((key) => {
      // console.log(selectedProvisioningData[key])
      console.log('key')
      console.log(key)
      const item = selectedProvisioningData[key]
      if (item.conditionalData !== undefined) {
        const matchedDependencies = filterSelected(item.conditionalData, selections)
        if (matchedDependencies !== undefined) {
          console.log('matchedDependencies')
          console.log(matchedDependencies)
          if (key !== 'cloudProvider' && key !== 'plan') {
            if (matchedDependencies.options !== undefined) {
              setProviderChosenOptionsMap(
                new Map(
                  providerChosenOptionsMap.set(
                    key,
                    _.find(matchedDependencies.options, (option) => option.value === matchedDependencies.defaultValue)
                  )
                )
              )
            } else {
              setProviderChosenOptionsMap(new Map(providerChosenOptionsMap.set(key, matchedDependencies.defaultValue)))
            }
          }
          // map with filtered data of drop downs available options.
          setFilteredFieldsMap(new Map(filteredFieldsMap.set(key, matchedDependencies)))
        }
      }
    })

    console.log('providerChosenOptionsMap')
    console.log(providerChosenOptionsMap)
    console.log('filteredFieldsMap')
    console.log(filteredFieldsMap)
  }

  React.useEffect(() => {
    fetchCSV()
    fetchProviderInfo()
  }, [])

  React.useEffect(() => {
    disableNSSelection()

    return () => {
      clearInterval(checkDBClusterStatusIntervalID.current)
      enableNSSelection()
    }
  }, [])

  React.useEffect(() => {
    fetchInventoriesByNSAndRules()
  }, [installNamespace])

  React.useEffect(() => {
    validateForm()
  }, [
    isDBProviderFieldValid,
    isInstanceNameFieldValid,
    isInventoryFieldValid,
    isProjectNameFieldValid,
    selectedDBProvider,
    isEngineFieldValid,
    isPlanFieldValid,
    isCloudProviderFieldValid,
    isRegionFieldValid,
    isSpendLimitFieldValid,
    isComputeFieldValid,
    isStorageFieldValid,
    isNodesFieldValid,
  ])

  React.useEffect(() => {
    if (!_.isEmpty(providerList) && !_.isEmpty(inventories)) {
      detectSelectedDBProviderAndProviderAccount()
    }
  }, [providerList, inventories, selectedProvisioningData])

  React.useEffect(() => {
    if (!_.isEmpty(selectedDBProvider)) {
      setProviderData()
    }
  }, [plan, cloudProvider])

  return (
    <FlexForm className="instance-table-container" onSubmit={provisionDBCluster}>
      <FormBody flexLayout>
        <FormHeader
          title="Create New Database Instance"
          helpText="A trial version of a database instance for learning, and exploring."
        />
        <Divider />
        {!showResults ? <LoadingView loadingMsg={loadingMsg} /> : null}
        {provisionRequestFired && showResults && clusterProvisionFailed ? (
          <FailedView handleTryAgain={handleTryAgain} handleCancel={handleCancel} statusMsg={statusMsg} />
        ) : null}
        {provisionRequestFired && showResults && clusterProvisionSuccess ? (
          <SuccessView goToInstancesPage={goToInstancesPage} />
        ) : null}

        {showResults && !provisionRequestFired ? (
          <>
            <Alert
              variant="info"
              isInline
              title="Information to create a Production database instance"
              className="co-info co-break-word half-width-selection"
            >
              <p>
                To create a database for production use, please directly log-in to the database provider's website.
                <br />
                <br />
                Fill in the form below to create a database instance for trial use.
              </p>
              {!_.isEmpty(selectedDBProvider) ? (
                <a href={selectedDBProvider?.externalProvisionInfo?.url} target="_blank" rel="noopener noreferrer">
                  Create a production database instance
                </a>
              ) : null}
            </Alert>

            {selectedDBProvider.value === rdsProviderType ? (
              <Alert variant="warning" isInline title="Warning" className="co-info co-break-word half-width-selection">
                <p>
                  Using the{' '}
                  <a href="https://aws.amazon.com/rds/pricing/" target="_blank" rel="noreferrer">
                    Amazon Relational Database Service (RDS)
                  </a>{' '}
                  provider account does not provide a free trial database instance. Creating a new database instance
                  using Amazon’s RDS creates the instance at Amazon Web Services’ (AWS){' '}
                  <a
                    href="https://aws.amazon.com/free/?all-free-tier.sort-by=item.additionalFields.SortRank&all-free-tier.sort-order=asc&awsf.Free%20Tier%20Types=*all&awsf.Free%20Tier%20Categories=*all"
                    target="_blank"
                    rel="noreferrer"
                  >
                    free-tier level,
                  </a>{' '}
                  but be aware that there is still a possibility of accruing a cost for running this instance.
                </p>
              </Alert>
            ) : null}

            <FormGroup
              label="Database Provider"
              fieldId="database-provider"
              isRequired
              className="half-width-selection"
              helperTextInvalid="This is a required field"
              validated={isDBProviderFieldValid}
            >
              <FormSelect
                isRequired
                value={selectedDBProvider.value}
                onChange={handleDBProviderSelection}
                aria-label="Database Provider"
                validated={isDBProviderFieldValid}
              >
                {providerList?.map((provider, index) => (
                  <FormSelectOption key={index} value={provider.value} label={provider.label} />
                ))}
              </FormSelect>
            </FormGroup>
            {selectedDBProvider?.allowsFreeTrial === true ? (
              <>
                <FormGroup
                  label="Provider Account"
                  fieldId="provider-account"
                  isRequired
                  className="half-width-selection"
                  helperTextInvalid="This is a required field"
                  validated={isInventoryFieldValid}
                >
                  <FormSelect
                    isRequired
                    value={selectedInventory.name}
                    onChange={handleInventorySelection}
                    aria-label="Provider Account"
                    validated={isInventoryFieldValid}
                  >
                    {filteredInventories?.map((inventory, index) => (
                      <FormSelectOption key={index} value={inventory.name} label={inventory.name} />
                    ))}
                  </FormSelect>
                </FormGroup>
                {inventoryHasIssue ? (
                  <>
                    <EmptyState>
                      <EmptyStateIcon variant="container" component={InfoCircleIcon} className="warning-icon" />
                      <Title headingLevel="h2" size="md">
                        Provider account information retrieval failed
                      </Title>
                      <EmptyStateBody>
                        Provider account information could not be retrieved. Please try again.
                      </EmptyStateBody>
                      <Alert
                        variant="danger"
                        isInline
                        title="An error occured"
                        className="co-alert co-break-word extra-top-margin"
                      >
                        <div>{statusMsg}</div>
                      </Alert>
                      <Button variant="primary" onClick={handleTryAgain}>
                        Try Again
                      </Button>
                      <EmptyStateSecondaryActions>
                        <Button variant="link" onClick={handleCancel}>
                          Close
                        </Button>
                      </EmptyStateSecondaryActions>
                    </EmptyState>
                  </>
                ) : (
                  <>
                    <FormGroup
                      label="Instance Name"
                      fieldId="instance-name"
                      isRequired
                      className="half-width-selection"
                      helperTextInvalid="This is a required field"
                      validated={isInstanceNameFieldValid}
                    >
                      <TextInput
                        isRequired
                        type="text"
                        id="instance-name"
                        name="instance-name"
                        value={clusterName}
                        onChange={handleInstanceNameChange}
                        validated={isInstanceNameFieldValid}
                      />
                      <HelperText>
                        <HelperTextItem variant="indeterminate">
                          Name of DB instance that will be created at Database Provider
                        </HelperTextItem>
                      </HelperText>
                    </FormGroup>

                    <FormFieldGroup
                      className="half-width-selection"
                      header={
                        <FormFieldGroupHeader
                          titleText={{
                            text: selectedProvisioningData.planLabel.displayName,
                            id: 'field-group4-non-expandable-titleText-id',
                          }}
                          titleDescription=""
                        />
                      }
                    >
                      <FormGroup
                        label={selectedProvisioningData.plan.displayName}
                        fieldId="plan"
                        isRequired
                        helperTextInvalid="This is a required field"
                        validated={isPlanFieldValid}
                      >
                        <FormSelect
                          isRequired
                          value={plan.displayValue}
                          onChange={handlePlanChange}
                          aria-label="plan"
                          validated={isPlanFieldValid}
                        >
                          {planOptions.map((option, index) => (
                            <FormSelectOption key={index} value={option.displayValue} label={option.displayValue} />
                          ))}
                        </FormSelect>
                      </FormGroup>

                      <FormGroup
                        label={selectedProvisioningData.cloudProvider.displayName}
                        fieldId="cloudProvider"
                        isRequired
                        helperTextInvalid="This is a required field"
                        validated={isCloudProviderFieldValid}
                      >
                        <FormSelect
                          isRequired
                          value={cloudProvider.displayValue}
                          onChange={handleCPChange}
                          aria-label="cloudProvider"
                          validated={isCloudProviderFieldValid}
                        >
                          {cpOptions.map((option, index) => (
                            <FormSelectOption key={index} value={option.displayValue} label={option.displayValue} />
                          ))}
                        </FormSelect>
                      </FormGroup>
                    </FormFieldGroup>

                    {setDBProviderFields()}
                    <ActionGroup>
                      <Button id="cluster-provision-button" variant="primary" type="submit" isDisabled={!isFormValid}>
                        Create
                      </Button>
                      <Button variant="secondary" onClick={handleCancel}>
                        Cancel
                      </Button>
                    </ActionGroup>
                  </>
                )}
              </>
            ) : null}
          </>
        ) : null}
      </FormBody>
    </FlexForm>
  )
}

export default ProviderClusterProvisionPage
