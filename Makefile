# VERSION defines the project version for the bundle.
# Update this value when you upgrade the version of your project.
# To re-generate a bundle for another specific version without changing the standard setup, you can:
# - use the VERSION as arg of the bundle target (e.g make bundle VERSION=0.0.2)
# - use environment variables to overwrite this value (e.g export VERSION=0.0.2)
VERSION ?= 0.2.0

CONTAINER_ENGINE?=docker

# ORG indicates the organization that docker images will be build for & pushed to
# CHANGE THIS TO YOUR OWN QUAY USERNAME FOR DEV/TESTING/PUSHING
ORG ?= ecosystem-appeng

##@ Build Deploy
release-build: docker-build   ## Build dynamic plugin image

docker-build: ## Build docker image with the manager.
	QUAY_USER=$(ORG) yarn img-build

docker-push: ## Push docker image with the manager.
	QUAY_USER=$(ORG) yarn img-push

##@ Deployment
release-push: docker-push  ## Push operator docker, bundle, catalog images
