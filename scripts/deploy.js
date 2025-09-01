const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const VerifierFactory = await ethers.getContractFactory("VerifierMock");
  const verifier = await VerifierFactory.deploy();
  await verifier.waitForDeployment();
  console.log("VerifierMock deployed:", await verifier.getAddress());

  const RegistryFactory = await ethers.getContractFactory("Registry");
  const registry = await RegistryFactory.deploy(deployer.address, await verifier.getAddress());
  await registry.waitForDeployment();
  console.log("Registry deployed:", await registry.getAddress());

  // Set an initial dummy root (issuer would publish real ones)
  const dummyRoot = ethers.keccak256(ethers.toUtf8Bytes("epoch-1-root"));
  const tx = await registry.updateRoot(dummyRoot);
  await tx.wait();
  console.log("Initial root set:", dummyRoot);

  // Write addresses to a local json file for downstream scripts
  const out = {
    network: "localhost",
    verifier: await verifier.getAddress(),
    registry: await registry.getAddress(),
    initialRoot: dummyRoot
  };
  const outPath = "deployed-localhost.json";
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log("Saved deployment info to:", outPath);

  // If a Groth16 verifier contract exists, deploy and set it
  const g16Path = "contracts/VerifierGroth16.sol";
  if (fs.existsSync(g16Path)) {
    console.log("Found VerifierGroth16.sol. Deploying Groth16 verifier...");
    const G16Factory = await ethers.getContractFactory("Verifier" /* snarkjs default name */);
    const g16 = await G16Factory.deploy();
    await g16.waitForDeployment();
    const g16Addr = await g16.getAddress();
    console.log("VerifierGroth16 deployed:", g16Addr);
    const tx2 = await registry.setVerifierGroth16(g16Addr);
    await tx2.wait();
    console.log("Registry linked to Groth16 verifier");
    // Update file
    out.verifierGroth16 = g16Addr;
    fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
    console.log("Updated deployment info with Groth16 verifier:", outPath);
  } else {
    console.log("VerifierGroth16.sol not found. Skipping Groth16 deployment.");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
