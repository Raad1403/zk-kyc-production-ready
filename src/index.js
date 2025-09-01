// Simple SDK for zk-kyc-poc (placeholder, no real ZK proving yet)
// Uses ethers v6
const { ethers } = require("ethers");

function keccakHex(input) {
  return ethers.keccak256(ethers.toUtf8Bytes(input));
}

// Derive a per-app nullifier from a user secret (should be private to the user) and appId
function computeNullifier(userSecret, appId) {
  return keccakHex(`${userSecret}:${appId}`);
}

// Bind proof to an application/policy context
function computeSignalHash(appId, policyId) {
  return keccakHex(`${appId}:${policyId}`);
}

async function verifyAndNullify({
  rpcUrl,
  privateKey,
  registryAddress,
  userSecret,
  appId,
  policyId
}) {
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);
  const abi = [
    "function currentRoot() view returns (bytes32)",
    "function verifyAndNullify(bytes proof, bytes32 root, bytes32 nullifier, bytes32 signalHash) returns (bool)"
  ];
  const registry = new ethers.Contract(registryAddress, abi, wallet);

  const root = await registry.currentRoot();
  const nullifier = computeNullifier(userSecret, appId);
  const signalHash = computeSignalHash(appId, policyId);

  // Placeholder proof bytes; VerifierMock always returns true
  const proof = "0x";

  const tx = await registry.verifyAndNullify(proof, root, nullifier, signalHash);
  const receipt = await tx.wait();
  return { txHash: receipt.hash, root, nullifier, signalHash };
}

module.exports = {
  computeNullifier,
  computeSignalHash,
  verifyAndNullify
};
