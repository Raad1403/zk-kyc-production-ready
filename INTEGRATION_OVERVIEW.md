# 🔗 Integration Overview: Privacy Layer over Traditional KYC

This project is a privacy-preserving KYC layer that integrates with a traditional KYC provider (e.g., Onfido, Veriff). The provider performs off-chain document/AML checks and publishes signed Merkle roots. Users then prove membership privately using Groth16, and on-chain contracts only verify root validity and nullifier uniqueness—no PII is ever stored on-chain.

## 🧩 Roles
- **KYC Provider (Off-chain)**: Performs document/AML checks. Maintains user registry and emits signed Merkle roots.
- **User / Wallet (Client)**: Receives a credential/leaf from the provider and generates a ZK proof (Groth16) bound to a `signalHash`.
- **Verifier + Registry (On-chain)**: Accepts trusted Merkle roots, verifies proofs, and nullifies one-time `nullifier`s.
- **Integrator (dApp/Protocol)**: Calls verification before allowing gated actions (trade, borrow, vote, etc.).

## 🔄 Data Flow
```
Provider (off-chain)        User (client)                    On-chain (L2)
--------------------        -------------------------------  ---------------------------
1) Document/AML checks  ->  2) Receives leaf/credential  
                             from provider (off-chain)
                                                          3) Owner updates Registry with
                                                             signed Merkle root (rotation)

                           4) Generates Groth16 proof
                              inputs: [root, signalHash, nullifier]

                                                          5) dApp calls Registry.verifyAndNullifyGroth16(
                                                             proof, [root, signalHash, nullifier])

                                                          6) Contract checks:
                                                             - root is valid (known)
                                                             - nullifier unused (anti-replay)
                                                             - Groth16 proof is valid

                                                          7) Marks nullifier as used, emits event
```

## 🧪 Proof Binding and Abuse Prevention
- **signalHash**: Binds a proof to a specific action/context (e.g., `"DEX:limit-order"`).
- **nullifier**: One-time identifier preventing proof reuse (sybil/double-spend resistance).
- **root rotation**: Provider rotates Merkle roots; `Registry` accepts/sets valid roots with owner-controlled updates.

## 🔐 Trust & Security Model
- The on-chain contract only trusts roots set by the owner (multisig recommended).
- Provider authenticity is enforced off-chain via signing roots and operational controls.
- No PII on-chain. Contracts store used `nullifier`s and current `root`s only.

## ⚙️ Integrator Guide (dApp)
1) Watch `RootUpdated` events from `Registry` and cache the latest root.
2) Require users to submit `proof, root, signalHash, nullifier` for gated actions.
3) Call `verifyAndNullifyGroth16(...)` before executing the action.
4) On success, proceed; on failure, show a retry/reauth flow.

## 🧰 Provider Ops
- Maintain authoritative registry and generate Merkle tree periodically.
- Sign each `root` and publish it through a secure out-of-band channel.
- Define rotation cadence and revocation policy.

## 📋 Mainnet Readiness Checklist (Summary)
- Multisig ownership and key rotation procedures.
- Monitoring/alerts for verification failures and abnormal `nullifier` patterns.
- Runbooks for root rotation and emergency invalidation.
- Independent review/audit of `Registry` and integration paths.

## 🧪 SDK/API Sketch
- SDK: `verifyKyc(signalHash, proof, root)` helper + TS types.
- REST (optional): `POST /verify { proof, root, signalHash }` -> boolean + tx hash (if relayed).

This architecture preserves user privacy while enabling on-chain compliance gating for DeFi and Web3 applications.
