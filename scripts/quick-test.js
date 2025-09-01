// اختبار سريع لنظام ZK-KYC
const fs = require('fs');
const { ethers } = require('ethers');

async function quickTest() {
    console.log('⚡ اختبار سريع لنظام ZK-KYC');
    console.log('=' .repeat(40));

    try {
        // قراءة معلومات العقود
        const deployedInfo = JSON.parse(fs.readFileSync('deployed-localhost.json', 'utf8'));
        console.log('✅ تم قراءة معلومات العقود');
        console.log('📋 Registry:', deployedInfo.registry);
        
        // إعداد الاتصال
        const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
        const wallet = new ethers.Wallet("0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d", provider);
        
        // اختبار الاتصال
        const blockNumber = await provider.getBlockNumber();
        console.log('🔗 متصل بالشبكة - البلوك:', blockNumber);
        
        // إعداد العقد
        const registryAbi = [
            "function verifyAndNullifyGroth16(uint256[2] a, uint256[2][2] b, uint256[2] c, uint256[] input) returns (bool)",
            "function currentRoot() view returns (bytes32)"
        ];
        const registry = new ethers.Contract(deployedInfo.registry, registryAbi, wallet);
        
        // قراءة الجذر الحالي
        const root = await registry.currentRoot();
        console.log('🌳 الجذر الحالي:', root);
        
        // إعداد بيانات الإثبات
        const signalHash = ethers.keccak256(ethers.toUtf8Bytes("defi-allowlist-poc:age18-country-allow"));
        const nullifier = ethers.keccak256(ethers.toUtf8Bytes("test-nullifier-" + Date.now()));
        
        console.log('📊 بيانات الإثبات:');
        console.log('   signalHash:', signalHash);
        console.log('   nullifier:', nullifier);
        
        // إثبات وهمي
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
        
        console.log('📤 إرسال الإثبات...');
        
        // إرسال الإثبات
        const tx = await registry.verifyAndNullifyGroth16(
            proof.a,
            proof.b,
            proof.c,
            publicInputs
        );
        
        console.log('⏳ انتظار التأكيد...');
        const receipt = await tx.wait();
        
        console.log('🎉 نجح الاختبار!');
        console.log('   Hash:', receipt.hash);
        console.log('   Gas:', receipt.gasUsed.toString());
        
    } catch (error) {
        console.log('❌ خطأ في الاختبار:');
        console.log('   ', error.message);
        
        if (error.message.includes('could not detect network')) {
            console.log('💡 تأكد من تشغيل: npm run node');
        }
    }
}

quickTest();
