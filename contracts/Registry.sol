// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

interface IVerifier {
    function verify(bytes calldata proof, bytes32 root, bytes32 signalHash) external view returns (bool);
}

interface IVerifierGroth16 {
    function verifyProof(
        uint256[2] calldata a,
        uint256[2][2] calldata b,
        uint256[2] calldata c,
        uint256[] calldata input
    ) external view returns (bool);
}

/// @title ZK-KYC Registry
/// @notice Tracks valid Merkle roots (epochs), nullifiers, and integrates with a Verifier.
contract Registry is Ownable {
    IVerifier public verifier; // mock/simple interface
    IVerifierGroth16 public verifierGroth16; // real Groth16 verifier

    bytes32 public currentRoot;
    uint64 public currentEpoch;

    mapping(bytes32 => bool) public validRoots; // root => valid
    mapping(bytes32 => bool) public nullifiers; // nullifier => used

    event RootUpdated(uint64 indexed epoch, bytes32 indexed root);
    event VerifierUpdated(address indexed verifier);
    event VerifierGroth16Updated(address indexed verifier);
    event NullifierUsed(bytes32 indexed nullifier);
    event ProofVerified(address indexed account, bytes32 indexed nullifier, bytes32 indexed root);
    event ProofVerifiedGroth16(address indexed account, bytes32 indexed nullifier, bytes32 indexed root);

    constructor(address _owner, IVerifier _verifier) Ownable(_owner) {
        verifier = _verifier;
        emit VerifierUpdated(address(_verifier));
    }

    function setVerifier(IVerifier _verifier) external onlyOwner {
        verifier = _verifier;
        emit VerifierUpdated(address(_verifier));
    }

    function setVerifierGroth16(IVerifierGroth16 _verifier) external onlyOwner {
        verifierGroth16 = _verifier;
        emit VerifierGroth16Updated(address(_verifier));
    }

    function updateRoot(bytes32 newRoot) external onlyOwner {
        require(newRoot != bytes32(0), "invalid root");
        currentEpoch += 1;
        currentRoot = newRoot;
        validRoots[newRoot] = true;
        emit RootUpdated(currentEpoch, newRoot);
    }

    function isRootValid(bytes32 root) external view returns (bool) {
        return validRoots[root];
    }

    function isNullifierUsed(bytes32 nul) external view returns (bool) {
        return nullifiers[nul];
    }

    /// @notice Verify zk-proof off-chain/on-chain via Verifier and mark nullifier as used.
    /// @dev signalHash could be a hash of (appId, policyId, optional signal) bound inside the proof.
    function verifyAndNullify(
        bytes calldata proof,
        bytes32 root,
        bytes32 nullifier,
        bytes32 signalHash
    ) external returns (bool) {
        require(validRoots[root], "root not valid");
        require(!nullifiers[nullifier], "nullifier used");
        require(address(verifier) != address(0), "verifier not set");
        bool ok = verifier.verify(proof, root, signalHash);
        require(ok, "invalid proof");
        nullifiers[nullifier] = true;
        emit NullifierUsed(nullifier);
        emit ProofVerified(msg.sender, nullifier, root);
        return true;
    }

    /// @notice Verify a Groth16 proof and nullify using public inputs layout: [root, signalHash, nullifier]
    function verifyAndNullifyGroth16(
        uint256[2] calldata a,
        uint256[2][2] calldata b,
        uint256[2] calldata c,
        uint256[] calldata input
    ) external returns (bool) {
        require(address(verifierGroth16) != address(0), "g16 verifier not set");
        require(input.length == 3, "bad public inputs");
        bytes32 root = bytes32(input[0]);
        bytes32 signalHash = bytes32(input[1]);
        bytes32 nullifier = bytes32(input[2]);
        require(validRoots[root], "root not valid");
        require(!nullifiers[nullifier], "nullifier used");
        bool ok = verifierGroth16.verifyProof(a, b, c, input);
        require(ok, "invalid proof");
        nullifiers[nullifier] = true;
        emit NullifierUsed(nullifier);
        emit ProofVerifiedGroth16(msg.sender, nullifier, root);
        return true;
    }
}
