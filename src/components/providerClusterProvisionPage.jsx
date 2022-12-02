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

const LoadingView = ({ loadingMsg }) => {
  return (
    <React.Fragment>
      <EmptyState>
        <EmptyStateIcon variant="container" component={Spinner} />
        <Title size="lg" headingLevel="h3">
          {loadingMsg}
        </Title>
      </EmptyState>
    </React.Fragment>
  )
}

const FailedView = ({ handleTryAgain, handleCancel, statusMsg }) => {
  return (
    <React.Fragment>
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
    </React.Fragment>
  )
}

const SuccessView = ({ goToInstancesPage }) => {
  return (
    <React.Fragment>
      <EmptyState>
        <EmptyStateIcon variant="container" component={CheckCircleIcon} className="success-icon" />
        <Title headingLevel="h2" size="md">
          Database instance creation started
        </Title>
        <EmptyStateBody>
          The database instance is being created, please click the button below to view it.
        </EmptyStateBody>
        <Button variant="primary" onClick={goToInstancesPage}>
          View Database Instances
        </Button>
      </EmptyState>
    </React.Fragment>
  )
}

const ProviderClusterProvisionPage = () => {
  const [plan, setPlan] = React.useState([])
  const [planOptions, setPlanOptions] = React.useState([])
  const [isPlanFieldValid, setIsPlanFieldValid] = React.useState('')
  const [cloudProvider, setCloudProvider] = React.useState([])
  const [cpOptions, setCpOptions] = React.useState([])
  const [region, setRegion] = React.useState([])
  const [regionsOptions, setRegionsOptions] = React.useState([])
  const [selectedDBProviderData, setSelectedDBProviderData] = React.useState({})
  const [spendLimit, setSpendLimit] = React.useState('0')
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
      let provider = _.find(providerList, (dbProvider) => {
        return dbProvider.value === devSelectedDBProviderName
      })
      setSelectedDBProvider(provider)
      filterInventoriesByProvider(provider)
      setIsDBProviderFieldValid(ValidatedOptions.default)
      setSelectedDBProviderData(provider.providerData)
    }

    if (!_.isEmpty(devSelectedProviderAccountName) && !_.isEmpty(inventories)) {
      let inventory = inventories.forEach((inv) => {
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
      let requestOpts = {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      }

      fetch(
        '/api/kubernetes/apis/dbaas.redhat.com/v1alpha1/namespaces/' + currentNS + '/dbaasinstances/' + clusterName,
        requestOpts
      )
        .then((response) => response.json())
        .then((responseJson) => {
          let provisionReadyCondition = responseJson?.status?.conditions?.find((condition) => {
            return condition.type?.toLowerCase() === 'provisionready'
          })

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
      otherInstanceParams = { projectName: projectName }
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

    let requestOpts = {
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
          otherInstanceParams: otherInstanceParams,
        },
      }),
    }

    setShowResults(false)
    setLoadingMsg('Creating Database Instance...')

    fetch('/api/kubernetes/apis/dbaas.redhat.com/v1alpha1/namespaces/' + currentNS + '/dbaasinstances', requestOpts)
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
      let filteredInventoryList = _.filter(inventories, (inventory) => {
        return inventory.providerRef?.name === provider.value
      })
      setFilteredInventories(filteredInventoryList)

      //Set the first inventory as the selected inventory by default
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
      let inventories = []

      inventoryItems.forEach((inventory, index) => {
        let obj = { id: 0, name: '', namespace: '', instances: [], status: {}, providerRef: {} }
        obj.id = index
        obj.name = inventory.metadata?.name
        obj.namespace = inventory.metadata?.namespace
        obj.status = inventory.status
        obj.providerRef = inventory.spec?.providerRef

        if (
          inventory.status?.conditions[0]?.status !== 'False' &&
          inventory.status?.conditions[0]?.type === 'SpecSynced'
        ) {
          inventory.status?.instances?.map((instance) => {
            return (instance.provider = inventory.spec?.providerRef?.name)
          })
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
    let inventoryData = await fetchInventoriesAndMapByNSAndRules(installNS).catch(function (error) {
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
    let engineType = _.find(engineTypeOptions, (eng) => {
      return eng.value === value
    })
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
    let inventory = _.find(inventories, (inv) => {
      return inv.name === value
    })
    checkInventoryStatus(inventory)
    setSelectedInventory(inventory)
  }

  const filterSelected = (unfilteredList, selections) => {
    let regionsList = {}
    console.log('filterSelected')
    console.log(unfilteredList)
    console.log(selections)
    filterLoop: for (const item of unfilteredList) {
      for (const dependsItem of item.dependencies) {
        console.log(dependsItem.value)
        console.log(selections.get(dependsItem.field))
        if (dependsItem.value !== selections.get(dependsItem.field)) {
          continue filterLoop
        }
      }
      regionsList = item
    }
    return regionsList
  }

  const setDefaultProviderData = (providerData) => {
    // setting plan options
    console.log('setDefaultProviderData')
    const resultPlan = providerData.find((item) => item.field === 'plan')
    console.log(resultPlan)
    console.log(resultPlan.options)
    console.log(resultPlan.defaultOption)
    setPlanOptions(resultPlan.options)
    setPlan(resultPlan.defaultOption)

    // setting cloud provider options
    const resultCP = providerData.find((item) => item.field === 'cloud_provider')
    setCpOptions(resultCP.options)
    setCloudProvider(resultCP.defaultOption)

    setIsPlanFieldValid(ValidatedOptions.default)
    setIsCloudProviderFieldValid(ValidatedOptions.default)
  }

  const handleDBProviderSelection = (value) => {
    if (_.isEmpty(value)) {
      setIsDBProviderFieldValid(ValidatedOptions.error)
    } else {
      setIsDBProviderFieldValid(ValidatedOptions.default)
    }
    if (!_.isEmpty(providerList)) {
      let provider = _.find(providerList, (dbProvider) => {
        return dbProvider.value === value
      })
      setInventoryHasIssue(false)
      setSelectedDBProvider(provider)
      console.log('provider')
      console.log(provider)
      if (provider.value === cockroachdbProviderType) {
        setSelectedDBProviderData(provider.providerData)
        setDefaultProviderData(provider.providerData)
      }
      filterInventoriesByProvider(provider)
    }
  }

  const fetchProviderInfo = () => {
    let requestOpts = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    }

    fetch('/api/kubernetes/apis/dbaas.redhat.com/v1alpha1/dbaasproviders', requestOpts)
      .then((response) => response.json())
      .then((data) => {
        let dbProviderList = []
        data.items?.forEach((dbProvider) => {
          dbProviderList.push({
            value: dbProvider?.metadata?.name,
            label: dbProvider?.spec?.provider?.displayName,
            allowsFreeTrial: dbProvider?.spec?.allowsFreeTrial,
            externalProvisionInfo: {
              url: dbProvider?.spec?.externalProvisionURL,
              desc: dbProvider?.spec?.externalProvisionDescription,
            },
            providerData: dbProvider?.status?.providerData,
            defaultData: dbProvider?.spec?.instanceParameterSpecs,
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
    let selectedPlan = _.find(planOptions, (cpPlan) => {
      return cpPlan.displayValue === value
    })
    setPlan(selectedPlan)
  }

  const handleRegionChange = (value) => {
    let selectedRegion = _.find(regionsOptions, (cpRegion) => {
      return cpRegion.displayValue === value
    })
    setRegion(selectedRegion)
  }

  const handleCPChange = (value) => {
    if (_.isEmpty(value)) {
      setIsCloudProviderFieldValid(ValidatedOptions.error)
    } else {
      setIsCloudProviderFieldValid(ValidatedOptions.default)
    }
    const selectedCP = _.find(cpOptions, (cp) => {
      return cp.displayValue === value
    })
    setCloudProvider(selectedCP)
  }

  const handleSpendLimitChange = (value) => {
    if (_.isEmpty(value)) {
      setIsSpendLimitFieldValid(ValidatedOptions.error)
    } else {
      setIsSpendLimitFieldValid(ValidatedOptions.default)
    }
    setSpendLimit(value)
  }

  const handleNodesChange = (value) => {
    const selectedNodes = _.find(nodesOptions, (cpNodes) => {
      return cpNodes.displayValue === value
    })
    setNodes(selectedNodes)
  }

  const handleComputeChange = (value) => {
    const selectedCompute = _.find(computeOptions, (cpCompute) => {
      return cpCompute.displayValue === value
    })
    setCompute(selectedCompute)
  }

  const handleStorageChange = (value) => {
    const selectedStorage = _.find(storageOptions, (cpStorage) => {
      return cpStorage.displayValue === value
    })
    setStorage(selectedStorage)
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
      return (
        <>
          <FormFieldGroup
            className="half-width-selection"
            header={
              <FormFieldGroupHeader
                titleText={{ text: 'Select a Plan', id: 'field-group4-non-expandable-titleText-id' }}
                titleDescription="Field group description text."
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
              <FormFieldGroup
                className="half-width-selection"
                header={
                  <FormFieldGroupHeader
                    titleText={{ text: 'Select Regions', id: 'field-group4-non-expandable-titleText-id' }}
                    titleDescription="Field group description text."
                  />
                }
              >
                <FormGroup
                  label="Regions"
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
              </FormFieldGroup>
              <FormFieldGroup
                className="half-width-selection"
                header={
                  <FormFieldGroupHeader
                    titleText={{ text: 'Spend Limit', id: 'field-group4-non-expandable-titleText-id' }}
                    titleDescription="Field group description text."
                  />
                }
              >
                <FormGroup
                  label="Spend Limit"
                  fieldId="spend-limit"
                  isRequired
                  helperTextInvalid="This is a required field"
                  validated={isSpendLimitFieldValid}
                >
                  <TextInput
                    isRequired
                    type="text"
                    id="spend-limit"
                    name="spend-limit"
                    value={spendLimit}
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

  function setProviderData() {
    const selections = new Map()
    console.log('setProviderData')
    selections.set('cloud_provider', cloudProvider.value)
    selections.set('plan', plan.value)

    const resultRegionsUnfiltered = selectedDBProviderData.filter((item) => item.field === 'regions')
    const filteredRegions = filterSelected(resultRegionsUnfiltered, selections)
    console.log(filteredRegions)
    if (filteredRegions?.options.isEmpty) {
      setIsRegionFieldValid(ValidatedOptions.error)
    } else {
      setRegionsOptions(filteredRegions.options)
      setRegion(filteredRegions.defaultOption)
      setIsRegionFieldValid(ValidatedOptions.default)
    }
    if (plan.value === 'DEDICATED') {
      // Setting Dedicated values
      const resultNodes = selectedDBProviderData.find((item) => item.field === 'nodes')
      console.log('resultNodes')
      if (resultNodes?.options.isEmpty) {
        setIsNodesFieldValid(ValidatedOptions.error)
      } else {
        setNodesOptions(resultNodes.options)
        setNodes(resultNodes.defaultOption)
        setIsNodesFieldValid(ValidatedOptions.default)
      }

      const resultComputeUnfiltered = selectedDBProviderData.filter((item) => item.field === 'machine_type')
      const filteredCompute = filterSelected(resultComputeUnfiltered, selections)
      if (filteredCompute?.options.isEmpty) {
        setIsComputeFieldValid(ValidatedOptions.error)
      } else {
        setComputeOptions(filteredCompute.options)
        setCompute(filteredCompute.defaultOption)
        setIsComputeFieldValid(ValidatedOptions.default)
      }

      const resultStorage = selectedDBProviderData.find((item) => item.field === 'storage_gib')
      if (resultStorage?.options.isEmpty) {
        setIsStorageFieldValid(ValidatedOptions.error)
      } else {
        setStorageOptions(resultStorage.options)
        setStorage(resultStorage.defaultOption)
        setIsStorageFieldValid(ValidatedOptions.default)
      }
    }
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
  }, [providerList, inventories, selectedDBProviderData])

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
          <React.Fragment>
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
              <React.Fragment>
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
              </React.Fragment>
            ) : null}
          </React.Fragment>
        ) : null}
      </FormBody>
    </FlexForm>
  )
}

export default ProviderClusterProvisionPage
