// Example usage of the SDK against a local hardhat node
const { verifyAndNullify, computeNullifier, computeSignalHash } = require("../src/index");
const fs = require("fs");

async function main() {
  const rpcUrl = process.env.RPC_URL || "http://127.0.0.1:8545";
  const privateKey = process.env.PRIVATE_KEY || "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"; // Hardhat default #1
  let registryAddress = process.env.REGISTRY_ADDRESS;
  if (!registryAddress) {
    // fallback to deployed-localhost.json
    const path = "deployed-localhost.json";
    if (!fs.existsSync(path)) {
      throw new Error("REGISTRY_ADDRESS not set and deployed-localhost.json not found. Please deploy first.");
    }
    const data = JSON.parse(fs.readFileSync(path, "utf8"));
    registryAddress = data.registry;
    if (!registryAddress) {
      throw new Error("deployed-localhost.json missing 'registry' field.");
    }
    console.log("Using registry from deployed-localhost.json:", registryAddress);
  } else {
    console.log("Using registry from REGISTRY_ADDRESS env:", registryAddress);
  }

  const appId = "defi-allowlist-poc";
  const policyId = "age18-country-allow";
  const userSecret = process.env.USER_SECRET || "demo-user-secret"; // replace in real apps

  console.log("nullifier:", computeNullifier(userSecret, appId));
  console.log("signalHash:", computeSignalHash(appId, policyId));

  const res = await verifyAndNullify({ rpcUrl, privateKey, registryAddress, userSecret, appId, policyId });
  console.log("verifyAndNullify tx:", res);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
