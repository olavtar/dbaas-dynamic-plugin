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
  DBAAS_API_VERSION,
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
  const [region, setRegion] = React.useState([])
  const [regionsOptions, setRegionsOptions] = React.useState([])
  const [selectedProvisioningData, setSelectedProvisioningData] = React.useState({})
  const [spendLimit, setSpendLimit] = React.useState('')
  const [isSpendLimitFieldValid, setIsSpendLimitFieldValid] = React.useState('')
  const [isRegionFieldValid, setIsRegionFieldValid] = React.useState('')
  const [isCloudProviderFieldValid, setIsCloudProviderFieldValid] = React.useState('')
  const [nodes, setNodes] = React.useState([])
  const [nodesOptions, setNodesOptions] = React.useState([])
  const [isNodesFieldValid, setIsNodesFieldValid] = React.useState('')
  const [compute, setCompute] = React.useState([])
  const [computeOptions, setComputeOptions] = React.useState([])
  const [isComputeFieldValid, setIsComputeFieldValid] = React.useState('')
  const [storage, setStorage] = React.useState([])
  const [storageOptions, setStorageOptions] = React.useState([])
  const [isStorageFieldValid, setIsStorageFieldValid] = React.useState('')

  const [filteredFields, setFilteredFields] = React.useState([])
  const [providerFilteredDataMap, setProviderFilteredDataMap] = React.useState(new Map())

  const [mergedData, setMergedData] = React.useState([])

  const [expanded, setExpanded] = React.useState(['ex2-toggle4'])
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
        '/api/kubernetes/apis/dbaas.redhat.com/' +
          DBAAS_API_VERSION +
          '/namespaces/' +
          currentNS +
          '/dbaasinstances/' +
          clusterName,
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
      if (plan.value === 'Serverless') {
        otherInstanceParams = {
          cloud_provider: cloudProvider.key,
          plan: plan.key,
          region: region.key,
          spend_limit: spendLimit.key,
        }
      } else if (plan.value === 'Dedicated') {
        otherInstanceParams = {
          cloud_provider: cloudProvider.key,
          plan: plan.key,
          region: region.key,
          nodes: nodes.key,
          machine_type: compute.key,
          storage_gib: storage.key,
          spend_limit: spendLimit.key,
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
        apiVersion: 'dbaas.redhat.com/' + DBAAS_API_VERSION,
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

    fetch(
      '/api/kubernetes/apis/dbaas.redhat.com/' + DBAAS_API_VERSION + '/namespaces/' + currentNS + '/dbaasinstances',
      requestOpts
    )
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
    if (selectedDBProvider.value === cockroachdbProviderType) {
      isValid =
        isValid &&
        isPlanFieldValid === ValidatedOptions.default &&
        isCloudProviderFieldValid === ValidatedOptions.default &&
        isRegionFieldValid === ValidatedOptions.default
      if (plan.value === 'Serverless') {
        isValid = isValid && isSpendLimitFieldValid === ValidatedOptions.default
      } else if (plan.value === 'Dedicated') {
        isValid =
          isValid &&
          isComputeFieldValid === ValidatedOptions.default &&
          isNodesFieldValid === ValidatedOptions.default &&
          isStorageFieldValid === ValidatedOptions.default
      }
    }
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
    //  let matched = true
    let matchedItem
    console.log('filterSelected')
    console.log(unfilteredList)
    console.log(selections)

    filterLoop: for (const item of unfilteredList) {
      for (const dependsItem of item.dependencies) {
        if (dependsItem.value !== selections.get(dependsItem.field)) {
          continue filterLoop
        }
      }
      matchedItem = item
    }

    // for (const dependsItem of unfilteredList.dependencies) {
    //   console.log(dependsItem.value)
    //   console.log(selections.get(dependsItem.field))
    //   if (dependsItem.value !== selections.get(dependsItem.field)) {
    //     matched = false
    //     break
    //   }
    //   // selectionList.push(unfilteredList)
    // }

    // filterLoop: for (const item of unfilteredList) {
    //   for (const dependsItem of item.dependencies) {
    //     if (dependsItem.value !== selections.get(dependsItem.field)) {
    //       continue filterLoop
    //     }
    //   }
    //   selectionList = item
    // }
    console.log(matchedItem)
    return matchedItem
  }

  const setDefaultProviderData = (providerProvisioningData) => {
    console.log('setDefaultProviderData')
    // setting plan options and initial value
    console.log('plan')
    console.log(providerProvisioningData.plan.optionsLists[0].defaultOption)
    console.log(providerProvisioningData.plan.optionsLists[0].options)

    if (providerProvisioningData.plan?.optionsLists[0]?.defaultOption === undefined) {
      setIsPlanFieldValid(ValidatedOptions.error)
    } else {
      setPlan(providerProvisioningData.plan.optionsLists[0].defaultOption)
      setPlanOptions(providerProvisioningData.plan.optionsLists[0].options)
      setIsPlanFieldValid(ValidatedOptions.default)
    }

    // setting cloud provider options and initial value
    console.log('cloudProvider')
    console.log(providerProvisioningData.cloudProvider.optionsLists[0].defaultOption)
    console.log(providerProvisioningData.cloudProvider.optionsLists[0].options)
    if (providerProvisioningData.cloudProvider?.optionsLists[0]?.defaultOption === undefined) {
      setIsCloudProviderFieldValid(ValidatedOptions.error)
    } else {
      setCloudProvider(providerProvisioningData.cloudProvider.optionsLists[0].defaultOption)
      setCpOptions(providerProvisioningData.cloudProvider.optionsLists[0].options)
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

    fetch('/api/kubernetes/apis/dbaas.redhat.com/' + DBAAS_API_VERSION + '/dbaasproviders', requestOpts)
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

  const toggle = (id) => {
    const index = expanded.indexOf(id)
    const newExpanded =
      index >= 0 ? [...expanded.slice(0, index), ...expanded.slice(index + 1, expanded.length)] : [...expanded, id]
    setExpanded(newExpanded)
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
  }

  const handleRegionChange = (value) => {
    const selectedRegion = _.find(regionsOptions, (cpRegion) => cpRegion.displayValue === value)
    setRegion(selectedRegion)
  }

  const handleCPChange = (value) => {
    if (_.isEmpty(value)) {
      setIsCloudProviderFieldValid(ValidatedOptions.error)
    } else {
      setIsCloudProviderFieldValid(ValidatedOptions.default)
    }
    const selectedCP = _.find(cpOptions, (cp) => cp.displayValue === value)
    setCloudProvider(selectedCP)
  }

  const handleSpendLimitChange = (field, value) => {
    console.log('handleSpendLimitChange')
    console.log(field)
    console.log(value)
    if (_.isEmpty(value)) {
      setIsSpendLimitFieldValid(ValidatedOptions.error)
    } else {
      setIsSpendLimitFieldValid(ValidatedOptions.default)
    }
    setSpendLimit(value)
  }

  const handleNodesChange = (value) => {
    const selectedNodes = _.find(nodesOptions, (cpNodes) => cpNodes.displayValue === value)
    setNodes(selectedNodes)
  }

  const handleComputeChange = (value) => {
    const selectedCompute = _.find(computeOptions, (cpCompute) => cpCompute.displayValue === value)
    setCompute(selectedCompute)
  }

  const handleStorageChange = (value) => {
    const selectedStorage = _.find(storageOptions, (cpStorage) => cpStorage.displayValue === value)
    setStorage(selectedStorage)
  }

  const generateField = (field) => {
    console.log('generateField')
    console.log(field)
    if (field.control === 'editbox') {
      return (
        <FormGroup
          label={field.displayName}
          fieldId={field.name}
          className="half-width-selection"
          isRequired
          helperTextInvalid="This is a required field"
          validated={isSpendLimitFieldValid}
        >
          <TextInput
            isRequired
            type="text"
            id={field.name}
            name={field.name}
            value="{field.name}"
            onChange={(value) => {
              field.value = value
              handleSpendLimitChange(field, value)
            }}
            // onChange={handleSpendLimitChange}
            validated={isSpendLimitFieldValid}
          />
        </FormGroup>
      )
    }
    if (field.control === 'dropdown') {
      return (
        <FormGroup
          label={field.displayName}
          fieldId={field.name}
          className="half-width-selection"
          isRequired
          helperTextInvalid="This is a required field"
          validated={isRegionFieldValid}
        >
          <FormSelect
            isRequired
            value={region.displayValue}
            onChange={handleRegionChange}
            aria-label="regions"
            validated={isRegionFieldValid}
          >
            {regionsOptions.map((option, index) => (
              <FormSelectOption key={index} value={option.displayValue} label={option.displayValue} />
            ))}
          </FormSelect>
        </FormGroup>
      )
    }
    if (field.control === 'text') {
    }
  }

  const displayField = (fieldName) => {
    console.log('displayField')
    console.log(fieldName)
    console.log(filteredFields)
    const resultNodes = filteredFields.find((item) => item.field === fieldName)
    if (resultNodes !== undefined) {
      console.log(resultNodes)
      console.log(resultNodes.options)
      console.log(providerFilteredDataMap)
      console.log(providerFilteredDataMap.get(fieldName))
    }
    //   if does not exist it's undefined
    return resultNodes
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
          <FormFieldGroup
            className="half-width-selection"
            header={
              <FormFieldGroupHeader
                titleText={{ text: 'Select a Plan', id: 'field-group4-non-expandable-titleText-id' }}
                titleDescription=""
              />
            }
          >
            <FormGroup
              label="Hosting plan"
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
              label="Cloud Provider"
              fieldId="cloudprovider"
              isRequired
              helperTextInvalid="This is a required field"
              validated={isCloudProviderFieldValid}
            >
              <FormSelect
                isRequired
                value={cloudProvider.displayValue}
                onChange={handleCPChange}
                aria-label="cloudprovider"
                validated={isCloudProviderFieldValid}
              >
                {cpOptions.map((option, index) => (
                  <FormSelectOption key={index} value={option.displayValue} label={option.displayValue} />
                ))}
              </FormSelect>
            </FormGroup>
          </FormFieldGroup>

          {plan.displayValue === 'Serverless' ? (
            <>
              {/* {filteredFields.map((field) => generateField(field))} */}
              {/* <FormFieldGroup */}
              {/*   className="half-width-selection" */}
              {/*   header={ */}
              {/*     <FormFieldGroupHeader */}
              {/*       titleText={{ text: 'Select Regions', id: 'field-group4-non-expandable-titleText-id' }} */}
              {/*       titleDescription="" */}
              {/*     /> */}
              {/*   } */}
              {/* > */}
              {/*   <FormGroup */}
              {/*     label="Regions" */}
              {/*     fieldId="serverless_regions" */}
              {/*     isRequired */}
              {/*     helperTextInvalid="This is a required field" */}
              {/*     validated={isRegionFieldValid} */}
              {/*     className={displayField('serverless_regions') === undefined ? 'hide' : 'none'} */}
              {/*   > */}
              {/*     <FormSelect */}
              {/*       isRequired */}
              {/*       value={ */}
              {/*         providerFilteredDataMap.has('serverless_regions') === true */}
              {/*           ? providerFilteredDataMap.get('serverless_regions').displayValue */}
              {/*           : '' */}
              {/*       } */}
              {/*       // onChange={handleRegionChange} */}
              {/*       onChange={(value) => { */}
              {/*         providerFilteredDataMap.set( */}
              {/*           'serverless_regions', */}
              {/*           displayField('serverless_regions').options.find((item) => item.displayValue === value) */}
              {/*         ) */}
              {/*         console.log('onChange') */}
              {/*         setProviderFilteredDataMap(providerFilteredDataMap) */}
              {/*         setProviderFilteredDataMap(new Map(providerFilteredDataMap)) */}
              {/*         console.log(providerFilteredDataMap) */}
              {/*       }} */}
              {/*       aria-label="serverless_regions" */}
              {/*       validated={isRegionFieldValid} */}
              {/*     > */}
              {/*       {displayField('serverless_regions') !== undefined && */}
              {/*         displayField('serverless_regions').options.map((option, index) => ( */}
              {/*           <FormSelectOption key={index} value={option.displayValue} label={option.displayValue} /> */}
              {/*         ))} */}
              {/*     </FormSelect> */}
              {/*   </FormGroup> */}
              {/* </FormFieldGroup> */}
              {/* <FormFieldGroup */}
              {/*   className="half-width-selection" */}
              {/*   header={ */}
              {/*     <FormFieldGroupHeader */}
              {/*       titleText={{ text: 'Spend Limit', id: 'field-group4-non-expandable-titleText-id' }} */}
              {/*       titleDescription="Field group description text." */}
              {/*     /> */}
              {/*   } */}
              {/* > */}
              {/*   <FormGroup */}
              {/*     label="Spend Limit" */}
              {/*     fieldId="spend-limit" */}
              {/*     isRequired */}
              {/*     helperTextInvalid="This is a required field" */}
              {/*     validated={isSpendLimitFieldValid} */}
              {/*   > */}
              {/*     <TextInput */}
              {/*       isRequired */}
              {/*       type="text" */}
              {/*       id="spend-limit" */}
              {/*       name="spend-limit" */}
              {/*       value={spendLimit} */}
              {/*       onChange={handleSpendLimitChange} */}
              {/*       validated={isSpendLimitFieldValid} */}
              {/*     /> */}
              {/*   </FormGroup> */}
              {/* </FormFieldGroup> */}
            </>
          ) : (
            <>
              <FormFieldGroup
                className="half-width-selection"
                header={
                  <FormFieldGroupHeader
                    titleText={{
                      text: 'Regions & Nodes',
                      id: 'field-group4-non-expandable-titleText-id',
                    }}
                    titleDescription="Field group description text."
                  />
                }
              >
                <FormGroup
                  label="Region"
                  fieldId="regions"
                  isRequired
                  helperTextInvalid="This is a required field"
                  validated={isRegionFieldValid}
                >
                  <FormSelect
                    isRequired
                    value={region.displayValue}
                    onChange={handleRegionChange}
                    aria-label="regions"
                    validated={isRegionFieldValid}
                  >
                    {regionsOptions.map((option, index) => (
                      <FormSelectOption key={index} value={option.displayValue} label={option.displayValue} />
                    ))}
                  </FormSelect>
                </FormGroup>
                <FormGroup
                  label="Nodes"
                  fieldId="nodes"
                  isRequired
                  // className="half-width-selection"
                  helperTextInvalid="This is a required field"
                  validated={isNodesFieldValid}
                >
                  <FormSelect
                    isRequired
                    value={nodes.displayValue}
                    onChange={handleNodesChange}
                    aria-label="nodes"
                    validated={isNodesFieldValid}
                  >
                    {nodesOptions.map((option, index) => (
                      <FormSelectOption key={index} value={option.displayValue} label={option.displayValue} />
                    ))}
                  </FormSelect>
                </FormGroup>
              </FormFieldGroup>
              <FormFieldGroup
                className="half-width-selection"
                header={
                  <FormFieldGroupHeader
                    titleText={{ text: 'Hardware', id: 'field-group4-non-expandable-titleText-id' }}
                    titleDescription="Field group description text."
                  />
                }
              >
                <FormGroup
                  label="Compute"
                  fieldId="compute"
                  isRequired
                  helperTextInvalid="This is a required field"
                  validated={isComputeFieldValid}
                >
                  <FormSelect
                    isRequired
                    value={compute.displayValue}
                    onChange={handleComputeChange}
                    aria-label="compute"
                    validated={isComputeFieldValid}
                  >
                    {computeOptions.map((option, index) => (
                      <FormSelectOption key={index} value={option.displayValue} label={option.displayValue} />
                    ))}
                  </FormSelect>
                </FormGroup>
                <FormGroup
                  label="Storage"
                  fieldId="storage"
                  isRequired
                  helperTextInvalid="This is a required field"
                  validated={isStorageFieldValid}
                >
                  <FormSelect
                    isRequired
                    value={storage.displayValue}
                    onChange={handleStorageChange}
                    aria-label="storage"
                    validated={isStorageFieldValid}
                  >
                    {storageOptions.map((option, index) => (
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
    providerFilteredDataMap.clear()
    setFilteredFields([])
    const matchedFields = []
    console.log(selectedProvisioningData)

    Object.keys(selectedProvisioningData).map((key) => {
      console.log(selectedProvisioningData[key])
      const item = selectedProvisioningData[key]
      if (item.optionsLists !== undefined) {
        console.log('optionLists is not Undefined')
        //    for (const optionsListItem of item.optionsLists) {
        //  if (optionsListItem.dependencies !== undefined) {
        if (item.optionsLists[0].dependencies !== undefined) {
          console.log('dependencies are not Undefined')
          // console.log(optionsListItem.dependencies)
          const matchedDependencies = filterSelected(item.optionsLists, selections)
          if (matchedDependencies !== undefined) {
            console.log(item.key)
            setProviderFilteredDataMap(new Map(providerFilteredDataMap.set(key, matchedDependencies.defaultOption)))
          }
        }
        //  }
      }
    })

    console.log('providerFilteredDataMap')
    console.log(providerFilteredDataMap)
    // Object.entries(selectedProvisioningData).forEach((entry) => {
    //   console.log(entry)
    //   console.log(entry.displayName)
    // })

    // for (const item of selectedDBProvider.providerProvisioningData) {
    //   if (item.dependencies !== undefined) {
    //     const matchedDependencies = filterSelected(item, selections)
    //     console.log('matchedDependencies')
    //     console.log(matchedDependencies)
    //     console.log(item)
    //     if (matchedDependencies === true) {
    //       matchedFields.push(item)
    //       setProviderFilteredDataMap(new Map(providerFilteredDataMap.set(item.field, item.defaultOption)))
    //     }
    //   }
    // }

    // for (const item of selectedDBProvider.defaultData) {
    //   if (item.dependencies !== undefined) {
    //     const matchedDependencies = filterSelected(item, selections)
    //     console.log('matchedDependencies')
    //     console.log(matchedDependencies)
    //     console.log(item)
    //     if (matchedDependencies === true) {
    //       filteredFields.push(item)
    //       const unfilteredDataList = selectedDBProvider.providerProvisioningData.filter((dataItem) => dataItem.field === item.name)
    //       unfilteredDataList.forEach((element) => {
    //         if(){
    //
    //         }
    //         const obj = {id: 0, name: '', namespace: '', instances: [], status: {}}
    //         obj.id = index
    //         obj.name = inventory.metadata.name
    //         obj.namespace = inventory.metadata.namespace
    //         obj.status = inventory.status
    //       }
    //       for (const element of unfilteredDataList) {
    //         const matchedData = filterSelected(element, selections)
    //         if(matchedData === true){
    //           setProviderFilteredDataMap(new Map(providerFilteredDataMap.set(item.name, element)))
    //         }
    //       }
    //     }
    //   }
    // }

    // setFilteredFields([...matchedFields])
    // console.log('matchedFields')
    // console.log(matchedFields)

    // console.log(mergedData)
    // const filteredSelectedData = []
    // for (const item of mergedData) {
    //   if (item.dependencies !== undefined) {
    //     const filteredFields = filterSelected(item, selections)
    //     console.log('filteredFields')
    //     console.log(filteredFields)
    //     console.log(filteredFields.length)
    //     if (filteredFields.length !== 0) {
    //       filteredSelectedData.push(filteredFields)
    //     }
    //   }
    // }
    // console.log('filteredSelectedData')
    // console.log(filteredSelectedData)

    // const resultRegionsUnfiltered = selectedProvisioningData.filter((item) => item.field === 'regions')
    // const filteredRegions = filterSelected(resultRegionsUnfiltered, selections)
    // if (filteredRegions?.options.isEmpty) {
    //   setIsRegionFieldValid(ValidatedOptions.error)
    // } else {
    //   setRegionsOptions(filteredRegions.options)
    //   setRegion(filteredRegions.defaultOption)
    //   setIsRegionFieldValid(ValidatedOptions.default)
    // }
    // if (plan.value === 'DEDICATED') {
    //   // Setting Dedicated values
    //   const resultNodes = selectedProvisioningData.find((item) => item.field === 'nodes')
    //   if (resultNodes?.options.isEmpty) {
    //     setIsNodesFieldValid(ValidatedOptions.error)
    //   } else {
    //     setNodesOptions(resultNodes.options)
    //     setNodes(resultNodes.defaultOption)
    //     setIsNodesFieldValid(ValidatedOptions.default)
    //   }
    //
    //   const resultComputeUnfiltered = selectedProvisioningData.filter((item) => item.field === 'machine_type')
    //   const filteredCompute = filterSelected(resultComputeUnfiltered, selections)
    //   if (filteredCompute?.options.isEmpty) {
    //     setIsComputeFieldValid(ValidatedOptions.error)
    //   } else {
    //     setComputeOptions(filteredCompute.options)
    //     setCompute(filteredCompute.defaultOption)
    //     setIsComputeFieldValid(ValidatedOptions.default)
    //   }
    //
    //   const resultStorage = selectedProvisioningData.find((item) => item.field === 'storage_gib')
    //   if (resultStorage?.options.isEmpty) {
    //     setIsStorageFieldValid(ValidatedOptions.error)
    //   } else {
    //     setStorageOptions(resultStorage.options)
    //     setStorage(resultStorage.defaultOption)
    //     setIsStorageFieldValid(ValidatedOptions.default)
    //   }
    // }
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
