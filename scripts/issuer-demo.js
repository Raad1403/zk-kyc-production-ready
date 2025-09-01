// ZK-KYC Issuer Demo - Simulates credential issuer publishing Merkle roots
const fs = require('fs');
const { ethers } = require('ethers');

async function runIssuerDemo() {
    console.log('🏛️  عرض توضيحي لمُصدر الهويات');
    console.log('=' .repeat(50));

    // Setup
    const rpcUrl = process.env.RPC_URL || "http://127.0.0.1:8545";
    const privateKey = process.env.PRIVATE_KEY || "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);

    // Load deployed contract info
    const deployedInfo = JSON.parse(fs.readFileSync('deployed-localhost.json', 'utf8'));
    
    const registryAbi = [
        "function updateRoot(bytes32 root) external",
        "function validRoots(bytes32) view returns (bool)",
        "function currentRoot() view returns (bytes32)",
        "event RootUpdated(uint64 indexed epoch, bytes32 indexed root)"
    ];

    const registry = new ethers.Contract(deployedInfo.registry, registryAbi, wallet);

    console.log('📋 معلومات المُصدر:');
    console.log('   🏛️  عنوان المُصدر:', wallet.address);
    console.log('   📜 عقد التسجيل:', deployedInfo.registry);
    console.log('');

    // Current root
    const currentRoot = await registry.currentRoot();
    console.log('🌳 الجذر الحالي:', currentRoot);

    // Simulate issuing new credentials and generating new Merkle root
    console.log('');
    console.log('📝 محاكاة إصدار هويات جديدة...');
    
    // Mock user credentials (in real system, these would be verified KYC data)
    const users = [
        { id: 'user001', age: 25, country: 'UAE', verified: true },
        { id: 'user002', age: 30, country: 'KSA', verified: true },
        { id: 'user003', age: 22, country: 'QAT', verified: true },
        { id: 'user004', age: 28, country: 'BHR', verified: true }
    ];

    console.log('👥 المستخدمون المُتحققون:');
    users.forEach((user, i) => {
        console.log(`   ${i+1}. ${user.id}: عمر ${user.age}, ${user.country}`);
    });

    // Generate Merkle tree leaves (hashes of user credentials)
    const leaves = users.map(user => {
        const userData = JSON.stringify({
            id: user.id,
            age: user.age,
            country: user.country,
            timestamp: Date.now()
        });
        return ethers.keccak256(ethers.toUtf8Bytes(userData));
    });

    console.log('');
    console.log('🍃 أوراق شجرة ميركل:');
    leaves.forEach((leaf, i) => {
        console.log(`   ${i+1}. ${leaf}`);
    });

    // Simple Merkle root calculation (for demo - in production use proper Merkle tree)
    let merkleRoot;
    if (leaves.length === 1) {
        merkleRoot = leaves[0];
    } else {
        // Combine all leaves into a single hash (simplified)
        const combined = leaves.join('');
        merkleRoot = ethers.keccak256(ethers.toUtf8Bytes(combined));
    }

    console.log('');
    console.log('🌳 جذر ميركل الجديد:', merkleRoot);

    // Check if root already exists
    const rootExists = await registry.validRoots(merkleRoot);
    if (rootExists) {
        console.log('⚠️  هذا الجذر موجود مسبقاً');
        return;
    }

    // Publish new root to registry
    console.log('');
    console.log('📤 نشر الجذر الجديد إلى العقد...');
    
    try {
        const tx = await registry.updateRoot(merkleRoot);
        console.log('⏳ انتظار تأكيد المعاملة...');
        
        const receipt = await tx.wait();
        
        console.log('✅ تم نشر الجذر بنجاح!');
        console.log('   🔗 هاش المعاملة:', receipt.hash);
        console.log('   ⛽ الغاز المستخدم:', receipt.gasUsed.toString());

        // Verify root is now valid
        const isValid = await registry.validRoots(merkleRoot);
        console.log('   ✓ حالة الجذر:', isValid ? 'صالح' : 'غير صالح');

        // Update deployment info with new root
        deployedInfo.latestRoot = merkleRoot;
        deployedInfo.rootHistory = deployedInfo.rootHistory || [];
        deployedInfo.rootHistory.push({
            root: merkleRoot,
            timestamp: new Date().toISOString(),
            userCount: users.length
        });

        fs.writeFileSync('deployed-localhost.json', JSON.stringify(deployedInfo, null, 2));
        console.log('💾 تم تحديث معلومات النشر');

        console.log('');
        console.log('🎉 العرض التوضيحي للمُصدر مكتمل!');
        console.log('✨ تم بنجاح:');
        console.log('   ✓ محاكاة التحقق من هويات المستخدمين');
        console.log('   ✓ بناء شجرة ميركل');
        console.log('   ✓ نشر الجذر الجديد');
        console.log('   ✓ التحقق من صحة العملية');

    } catch (error) {
        console.log('❌ فشل في نشر الجذر:');
        console.log('   خطأ:', error.message);
    }
}

runIssuerDemo().catch(console.error);
