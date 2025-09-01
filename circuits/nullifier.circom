pragma circom 2.0.0;

template NullifierCircuit() {
    signal private input userSecret;
    signal private input appIdHash;
    signal input root;
    signal input signalHash;
    signal output nullifier;
    
    // Simple constraint: nullifier = userSecret + appIdHash (for demo)
    nullifier <== userSecret + appIdHash;
    
    // Ensure root and signalHash are used (dummy constraints)
    component dummy1 = Num2Bits(254);
    component dummy2 = Num2Bits(254);
    dummy1.in <== root;
    dummy2.in <== signalHash;
}

template Num2Bits(n) {
    signal input in;
    signal output out[n];
    var lc1=0;
    var e2=1;
    for (var i = 0; i<n; i++) {
        out[i] <-- (in >> i) & 1;
        out[i] * (out[i] -1 ) === 0;
        lc1 += out[i] * e2;
        e2 = e2+e2;
    }
    lc1 === in;
}

component main = NullifierCircuit();
