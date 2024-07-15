## Getting Started with GAP frontend

## Pre-Requisites

- [node.js](https://nodejs.org/en/download/package-manager) installed (>=18.17.0)
- typescript installed (developed on v5.3.3)
- [yarn](https://classic.yarnpkg.com/lang/en/docs/install/#windows-stable)
- Web3 Wallet installed in your browser

## Installation

### Forkin the repository

Fork this repository by:

1. Clicking in the arrow aside from the `fork`
2. Unmark the option `Copy the main branch only`
3. Click `Create fork`

### Cloning the repository

Open the VsCode or other IDE editor, and enter the following command in the cmd:

```bash
git clone https://github.com/YourUserName/gap-app-v2.git
```

### Instaling dependencies

Install all package dependencies by running:

```bash
yarn install
```

### Configure the `.env.example` file

1. Copy the `.env.example` file and paste it in the root directory
2. Remove the `.example` from the `.env.example` file name
3. Add your API keys in the `.env` file
4. Creating the keys to fulfill the `.env` file
   1. **ALCHEMY_KEY:** Follow [this](https://docs.alchemy.com/docs/alchemy-quickstart-guide) tutorial of the Alchemy Docs and fill the following keys: `NEXT_PUBLIC_ALCHEMY_KEY`(use base sepolia for this one), `NEXT_PUBLIC_RPC_OPTIMISM`, `NEXT_PUBLIC_RPC_ARBITRUM`, `NEXT_PUBLIC_RPC_SEPOLIA` and `NEXT_PUBLIC_RPC_OPTIMISM_SEPOLIA`
   2. **PROJECT_ID:** Create your account in [this](https://walletconnect.com/) link and follow the instructions to generate a key
   3. **NEXT_PUBLIC_MIXPANEL_KEY:** Create your account in [this](https://mixpanel.com/login/) and follow [this](https://www.storylane.io/tutorials/how-to-get-mixpanel-project-token) tutorial

### Running the application

First, run the development server:

```bash
yarn run dev
```

Open http://localhost:3000 with your browser.

<a href="https://twitter.com/@blockful_io" target="blank"><img align="center" src="https://raw.githubusercontent.com/rahuldkjain/github-profile-readme-generator/master/src/images/icons/Social/twitter.svg" alt="@blockful_io" height="30" width="40" /></a>
