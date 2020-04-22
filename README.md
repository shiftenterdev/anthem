# Anthem by Chorus One

**Welcome to the codebase for Anthem!**

Anthem is a multi-network platform for managing blockchain proof-of-stake networks like [Cosmos](https://cosmos.network/), [Terra](https://terra.money/), [Kava](https://www.kava.io/), [Celo](https://celo.org/), [Oasis](https://www.oasislabs.com/), and other upcoming blockchains. Anthem is open source and built and maintained by [Chorus One](https://chorus.one/).

[![CircleCI](https://circleci.com/gh/ChorusOne/anthem.svg?style=svg&circle-token=efa3725ebd2648b4c6a5289ad3bb415383f21106)](https://circleci.com/gh/ChorusOne/anthem)

<img width="1439" alt="anthem" src="https://user-images.githubusercontent.com/18126719/79953826-0ff3ca80-84af-11ea-9059-2eee118618cd.png" />

---

## Getting Started

You will need [NodeJS](https://nodejs.org/en/) and [yarn](https://yarnpkg.com/lang/en/docs/) installed to proceed.

```sh
# Clone the repo
$ git clone https://github.com/ChorusOne/anthem.git

# Use Node LTS
$ nvm install lts/* && nvm alias default lts/*

# Install Lerna
$ npm i -g lerna

# Install dependencies
$ lerna bootstrap

# Build the utils/ package
$ yarn utils:build

# Setup environment variables
$ yarn setup

# Start the server
$ yarn server:start

# Start the client
$ yarn client:start

# Start the app in development mode (no server required)
$ yarn dev
```

We recommend using [VS Code](https://code.visualstudio.com/) and installing the recommended workspace extensions to make development easier.

## Project Overview

The codebase is organized into a monorepo with the following packages:

- [`client/`](https://github.com/ChorusOne/anthem/tree/master/packages/client): React client application.
- [`cypress/`](https://github.com/ChorusOne/anthem/tree/master/packages/cypress): Cypress e2e test suite.
- [`server/`](https://github.com/ChorusOne/anthem/tree/master/packages/server): GraphQL/Express API server.
- [`utils/`](https://github.com/ChorusOne/anthem/tree/master/packages/utils): Shared utils, tools, and types.

Each package contains a README document with more specific information about that package.

## Testing

The entire project is written in TypeScript and all packages follow the same testing conventions. You can run tests at the top level or in any package with the following commands:

```sh
# Run Prettier
$ yarn prettier

# Run TSLint
$ yarn tslint

# Run the TypeScript compiler
$ yarn tsc

# Run all the above tests
$ yarn test
```

You can also run `yarn prettier:fix` or `yarn tslint:fix` to use the auto-fix options for these tools to fix any issues (or `yarn format` to run both in one command). Normally, any linting/styling issues should be fixed automatically on-save if you are using VS Code with the recommended extensions.

The above commands cover static and unit testing the codebase. Additionally, we maintain a suite of e2e tests written with Cypress which you can run with the following commands:

```sh
# Start the client application (it needs to be running for the tests)
$ yarn dev

# Run the Cypress tests
$ yarn cypress
```

This will run the Cypress tests. You can see the Cypress package README for more information.

## GraphQL

The project relies on GraphQL for the majority of the APIs. The GraphQL schema exists in the `server` package. To work with GraphQL, some tooling exists to generate TypeScript type definitions from the GraphQL schema. This generated code is in the `utils/` package and can be imported and used by other packages. to generate the type definitions, run the following:

```sh
# Generate TypeScript type definitions for GraphQL schema
$ yarn types
```

## Development Mode

Some additional tooling exists to record mock API response data to use for offline development and to run the app for the Cypress tests. The mock data is generated by running the server, querying all of the GraphQL endpoints and recording the responses. If any GraphQL APIs are updated or changed, this mock data needs to be updated. To update this data, run the following commands:

```sh
# Start the server in recording mode
$ yarn recording

# Run the script to record the data
$ yarn record
```

## Docker Images

The docker image for the Anthem backend server can be found on [Docker Hub](https://hub.docker.com/r/chorusone/anthem). The latest release is kept up to date with the master branch of this repository.

A docker image for the frontend application will be available shortly.

## Kubernetes

A Kubernetes manifest file for the backend server is included in `packages/server/anthem.yaml.dist`.

## Contributing Guidelines

We use the [Gitflow Workflow](https://www.atlassian.com/git/tutorials/comparing-workflows/gitflow-workflow) for developing new features. This involves pulling the `master` branch, developing your fix or feature on a new branch, and then creating a pull request for your code changes. It is recommended to try to keep pull requests simple and confined to a concise set of changes to make it easy to review and merge code. Pull requests require review and all status checks (continuous integration checks, for instance) to pass before merging is allowed.

Any bug fixes, improvements, or new features are welcome. Pull requests must be reviewed and pass all project tests. If you are interested in contributing, feel free to explore the [open issues](https://github.com/ChorusOne/anthem/issues) or [open an issue](https://github.com/ChorusOne/anthem/issues/new/choose) if you have an idea for an improvement or new feature.
