// SDK example for Groth16 flow after generating VerifierGroth16.sol and redeploying
// This expects deployed-localhost.json to contain verifierGroth16 and registry addresses,
// and a real proof to be provided. For now, this is a placeholder wiring that will fail
// until you generate a real proof with snarkjs.

const fs = require("fs");
const { ethers } = require("ethers");

async function main() {
  const rpcUrl = process.env.RPC_URL || "http://127.0.0.1:8545";
  const privateKey = process.env.PRIVATE_KEY || "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);

  const depPath = "deployed-localhost.json";
  if (!fs.existsSync(depPath)) throw new Error("Please deploy first; missing deployed-localhost.json");
  const dep = JSON.parse(fs.readFileSync(depPath, "utf8"));
  const registryAddress = dep.registry;

  const regAbi = [
    "function verifyAndNullifyGroth16(uint256[2] a, uint256[2][2] b, uint256[2] c, uint256[] input) returns (bool)",
    "function currentRoot() view returns (bytes32)"
  ];
  const registry = new ethers.Contract(registryAddress, regAbi, wallet);
  const root = await registry.currentRoot();

  // public inputs layout expected by Registry: [root, signalHash, nullifier]
  const appId = "defi-allowlist-poc";
  const policyId = "age18-country-allow";
  const signalHash = ethers.keccak256(ethers.toUtf8Bytes(`${appId}:${policyId}`));
  const nullifier = ethers.keccak256(ethers.toUtf8Bytes(`demo-user-secret:${appId}`));

  // PLACEHOLDER proof (all zeros). This will REVERT until you generate a real proof with snarkjs.
  const a = [0, 0];
  const b = [[0, 0],[0, 0]];
  const c = [0, 0];
  const input = [root, signalHash, nullifier].map(x => BigInt(x).toString());

  console.log("Calling verifyAndNullifyGroth16 with placeholder proof (expected to fail until proof generated)...");
  try {
    const tx = await registry.verifyAndNullifyGroth16(a, b, c, input);
    const rc = await tx.wait();
    console.log("Success:", rc.hash);
  } catch (e) {
    console.error("As expected, call failed without a real proof:", e.message || e);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
