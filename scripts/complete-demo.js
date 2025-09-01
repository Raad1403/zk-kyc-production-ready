// Complete ZK-KYC Demo - End-to-End Proof Generation and Verification
const fs = require('fs');
const { ethers } = require('ethers');

async function runCompleteDemo() {
    console.log('🚀 عرض توضيحي كامل لنظام ZK-KYC');
    console.log('=' .repeat(50));

    // Setup
    const rpcUrl = process.env.RPC_URL || "http://127.0.0.1:8545";
    const privateKey = process.env.PRIVATE_KEY || "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";
    
    console.log('🔗 الاتصال بالشبكة:', rpcUrl);
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);
    
    // Test connection first
    try {
        const blockNumber = await provider.getBlockNumber();
        console.log('✅ متصل بالشبكة - رقم البلوك:', blockNumber);
    } catch (error) {
        console.log('❌ فشل الاتصال بالشبكة:', error.message);
        console.log('💡 تأكد من تشغيل: npm run node');
        return;
    }

    // Load deployed contract info
    const deployedInfo = JSON.parse(fs.readFileSync('deployed-localhost.json', 'utf8'));
    console.log('📋 معلومات العقود المنشورة:');
    console.log('   Registry:', deployedInfo.registry);
    console.log('   VerifierMock:', deployedInfo.verifier);
    if (deployedInfo.verifierGroth16) {
        console.log('   VerifierGroth16:', deployedInfo.verifierGroth16);
    }
    console.log('');

    // Contract interfaces
    const registryAbi = [
        "function verifyAndNullifyGroth16(uint256[2] a, uint256[2][2] b, uint256[2] c, uint256[] input) returns (bool)",
        "function currentRoot() view returns (bytes32)",
        "function nullifiers(bytes32) view returns (bool)",
        "event ProofVerifiedGroth16(address indexed user, bytes32 indexed nullifier, bytes32 indexed root)"
    ];

    const registry = new ethers.Contract(deployedInfo.registry, registryAbi, wallet);

    // Demo parameters
    const userSecret = 'demo-user-secret-12345';
    const appId = 'defi-allowlist-poc';
    const policyId = 'age18-country-allow';
    
    console.log('👤 معلومات المستخدم:');
    console.log('   🔑 سر المستخدم:', userSecret);
    console.log('   📱 معرف التطبيق:', appId);
    console.log('   📜 معرف السياسة:', policyId);
    console.log('');

    // Get current root
    const root = await registry.currentRoot();
    console.log('🌳 جذر ميركل الحالي:', root);

    // Generate signal hash and nullifier
    const signalHash = ethers.keccak256(ethers.toUtf8Bytes(`${appId}:${policyId}`));
    const nullifierInput = ethers.keccak256(ethers.toUtf8Bytes(`${userSecret}:${appId}`));
    
    // For our simplified circuit: nullifier = userSecret + appId (as BigInts)
    const userSecretBigInt = BigInt(ethers.keccak256(ethers.toUtf8Bytes(userSecret)));
    const appIdBigInt = BigInt(ethers.keccak256(ethers.toUtf8Bytes(appId)));
    const nullifierBigInt = (userSecretBigInt + appIdBigInt) % BigInt('21888242871839275222246405745257275088548364400416034343698204186575808495617');
    const nullifier = '0x' + nullifierBigInt.toString(16).padStart(64, '0');

    console.log('🔐 معلومات الإثبات:');
    console.log('   📡 هاش الإشارة:', signalHash);
    console.log('   🔒 nullifier:', nullifier);
    console.log('');

    // Check if nullifier already used
    const isUsed = await registry.nullifiers(nullifier);
    if (isUsed) {
        console.log('⚠️  تحذير: هذا nullifier مستخدم مسبقاً!');
        return;
    }

    // Generate mock Groth16 proof
    const proof = {
        a: [1, 2],
        b: [[3, 4], [5, 6]],
        c: [7, 8]
    };

    const publicInputs = [
        BigInt(root).toString(),
        BigInt(signalHash).toString(), 
        BigInt(nullifier).toString()
    ];

    console.log('📊 المدخلات العامة للإثبات:');
    console.log('   [0] root:', publicInputs[0]);
    console.log('   [1] signalHash:', publicInputs[1]);
    console.log('   [2] nullifier:', publicInputs[2]);
    console.log('');

    // Submit proof to contract
    console.log('📤 إرسال الإثبات إلى العقد الذكي...');
    try {
        const tx = await registry.verifyAndNullifyGroth16(
            proof.a,
            proof.b, 
            proof.c,
            publicInputs
        );

        console.log('⏳ انتظار تأكيد المعاملة...');
        const receipt = await tx.wait();
        
        console.log('✅ تم التحقق من الإثبات بنجاح!');
        console.log('   🔗 هاش المعاملة:', receipt.hash);
        console.log('   ⛽ الغاز المستخدم:', receipt.gasUsed.toString());
        
        // Check events
        const events = receipt.logs.filter(log => {
            try {
                return registry.interface.parseLog(log);
            } catch {
                return false;
            }
        });

        if (events.length > 0) {
            console.log('📢 الأحداث المُرسلة:');
            events.forEach(event => {
                const parsed = registry.interface.parseLog(event);
                console.log(`   📋 ${parsed.name}:`, parsed.args);
            });
        }

        // Verify nullifier is now used
        const isNowUsed = await registry.nullifiers(nullifier);
        console.log('🔒 حالة nullifier بعد الاستخدام:', isNowUsed ? 'مستخدم' : 'غير مستخدم');

        console.log('');
        console.log('🎉 العرض التوضيحي مكتمل بنجاح!');
        console.log('✨ نظام ZK-KYC يعمل بالكامل مع:');
        console.log('   ✓ توليد nullifier');
        console.log('   ✓ إثباتات Groth16 (نموذجية)');
        console.log('   ✓ التحقق على البلوك تشين');
        console.log('   ✓ منع إعادة الاستخدام');

    } catch (error) {
        console.log('❌ فشل في التحقق من الإثبات:');
        console.log('   خطأ:', error.message);
        
        if (error.message.includes('nullifier used')) {
            console.log('   💡 السبب: nullifier مستخدم مسبقاً');
        } else if (error.message.includes('root not valid')) {
            console.log('   💡 السبب: جذر ميركل غير صالح');
        } else if (error.message.includes('invalid proof')) {
            console.log('   💡 السبب: الإثبات غير صحيح');
        }
    }
}

runCompleteDemo().catch(console.error);
