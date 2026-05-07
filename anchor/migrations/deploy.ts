// Migrations are an early feature. Currently, they're nothing more than this
// single deploy script that's invoked from the CLI, injecting a provider
// configured from the workspace's Anchor.toml.

// Anchor's generated migration template uses CommonJS because the CLI loads
// this file directly during deploy.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const anchor = require("@coral-xyz/anchor");

module.exports = async function (provider) {
  // Configure client to use the provider.
  anchor.setProvider(provider);

  // Add your deploy script here.
};
