// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Mock verifier to be replaced by a real snarkjs-generated verifier.
contract VerifierMock {
    function verify(bytes calldata /*proof*/, bytes32 /*root*/, bytes32 /*signalHash*/) external pure returns (bool) {
        return true; // Always passes for PoC wiring
    }
}
