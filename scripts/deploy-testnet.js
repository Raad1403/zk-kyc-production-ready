// Deploy ZK-KYC system to L2 testnets and measure gas costs
const fs = require('fs');
const { ethers } = require('hardhat');

async function main() {
    const networkName = hre.network.name;
    console.log(`🚀 نشر نظام ZK-KYC على شبكة: ${networkName}`);
    console.log('=' .repeat(50));

    // Get deployer account
    const [deployer] = await ethers.getSigners();
    const balance = await deployer.provider.getBalance(deployer.address);
    
    console.log('📋 معلومات النشر:');
    console.log('   👤 عنوان المنشر:', deployer.address);
    console.log('   💰 الرصيد:', ethers.formatEther(balance), 'ETH');
    console.log('   🌐 الشبكة:', networkName);
    console.log('');

    if (balance === 0n) {
        console.log('❌ خطأ: الرصيد صفر! تحتاج ETH للنشر');
        console.log('💡 احصل على ETH من:');
        if (networkName.includes('base')) {
            console.log('   🔗 Base Sepolia Faucet: https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet');
        } else if (networkName.includes('polygon')) {
            console.log('   🔗 Polygon Mumbai Faucet: https://faucet.polygon.technology/');
        } else if (networkName.includes('arbitrum')) {
            console.log('   🔗 Arbitrum Sepolia Faucet: https://faucet.quicknode.com/arbitrum/sepolia');
        }
        return;
    }

    let totalGasUsed = 0n;
    let totalCostETH = 0n;

    // Deploy VerifierMock
    console.log('📤 نشر VerifierMock...');
    const VerifierFactory = await ethers.getContractFactory("VerifierMock");
    const verifier = await VerifierFactory.deploy();
    await verifier.waitForDeployment();
    
    const verifierReceipt = await verifier.deploymentTransaction().wait();
    totalGasUsed += verifierReceipt.gasUsed;
    totalCostETH += verifierReceipt.gasUsed * verifierReceipt.gasPrice;
    
    console.log('✅ VerifierMock:', await verifier.getAddress());
    console.log('   ⛽ غاز:', verifierReceipt.gasUsed.toString());

    // Deploy VerifierGroth16
    console.log('📤 نشر VerifierGroth16...');
    const G16Factory = await ethers.getContractFactory("Verifier");
    const g16 = await G16Factory.deploy();
    await g16.waitForDeployment();
    
    const g16Receipt = await g16.deploymentTransaction().wait();
    totalGasUsed += g16Receipt.gasUsed;
    totalCostETH += g16Receipt.gasUsed * g16Receipt.gasPrice;
    
    console.log('✅ VerifierGroth16:', await g16.getAddress());
    console.log('   ⛽ غاز:', g16Receipt.gasUsed.toString());

    // Deploy Registry
    console.log('📤 نشر Registry...');
    const RegistryFactory = await ethers.getContractFactory("Registry");
    const registry = await RegistryFactory.deploy(deployer.address, await verifier.getAddress());
    await registry.waitForDeployment();
    
    const registryReceipt = await registry.deploymentTransaction().wait();
    totalGasUsed += registryReceipt.gasUsed;
    totalCostETH += registryReceipt.gasUsed * registryReceipt.gasPrice;
    
    console.log('✅ Registry:', await registry.getAddress());
    console.log('   ⛽ غاز:', registryReceipt.gasUsed.toString());

    // Set Groth16 verifier
    console.log('🔗 ربط VerifierGroth16 بـ Registry...');
    const setG16Tx = await registry.setVerifierGroth16(await g16.getAddress());
    const setG16Receipt = await setG16Tx.wait();
    totalGasUsed += setG16Receipt.gasUsed;
    totalCostETH += setG16Receipt.gasUsed * setG16Receipt.gasPrice;
    
    console.log('✅ تم الربط');
    console.log('   ⛽ غاز:', setG16Receipt.gasUsed.toString());

    // Set initial root
    const dummyRoot = "0xa24353a45ead21d4c74157049a46bebb347e925be04f53ca7b28cb25f9e57c87";
    console.log('🌳 تعيين الجذر الأولي...');
    const rootTx = await registry.updateRoot(dummyRoot);
    const rootReceipt = await rootTx.wait();
    totalGasUsed += rootReceipt.gasUsed;
    totalCostETH += rootReceipt.gasUsed * rootReceipt.gasPrice;
    
    console.log('✅ تم تعيين الجذر:', dummyRoot);
    console.log('   ⛽ غاز:', rootReceipt.gasUsed.toString());

    // Calculate costs
    const gasPrice = verifierReceipt.gasPrice;
    const costUSD = await estimateCostUSD(totalCostETH, networkName);

    console.log('');
    console.log('📊 ملخص التكاليف:');
    console.log('   ⛽ إجمالي الغاز:', totalGasUsed.toString());
    console.log('   💰 سعر الغاز:', ethers.formatUnits(gasPrice, 'gwei'), 'gwei');
    console.log('   💸 التكلفة الإجمالية:', ethers.formatEther(totalCostETH), 'ETH');
    if (costUSD) {
        console.log('   💵 التكلفة بالدولار:', costUSD.toFixed(4), 'USD');
    }

    // Save deployment info
    const deploymentInfo = {
        network: networkName,
        chainId: (await deployer.provider.getNetwork()).chainId.toString(),
        deployer: deployer.address,
        contracts: {
            verifierMock: await verifier.getAddress(),
            verifierGroth16: await g16.getAddress(),
            registry: await registry.getAddress()
        },
        initialRoot: dummyRoot,
        gasMetrics: {
            totalGasUsed: totalGasUsed.toString(),
            gasPrice: gasPrice.toString(),
            totalCostETH: ethers.formatEther(totalCostETH),
            costUSD: costUSD || 0
        },
        timestamp: new Date().toISOString()
    };

    const filename = `deployed-${networkName}.json`;
    fs.writeFileSync(filename, JSON.stringify(deploymentInfo, null, 2));
    
    console.log('');
    console.log('💾 تم حفظ معلومات النشر في:', filename);
    console.log('🎉 النشر مكتمل بنجاح!');
}

async function estimateCostUSD(costETH, networkName) {
    try {
        // Rough ETH price estimation (in production, use real API)
        const ethPriceUSD = 2500; // Approximate ETH price
        return parseFloat(ethers.formatEther(costETH)) * ethPriceUSD;
    } catch (error) {
        console.log('⚠️  لا يمكن تقدير التكلفة بالدولار');
        return null;
    }
}

main().catch((error) => {
    console.error('❌ خطأ في النشر:', error);
    process.exit(1);
});
