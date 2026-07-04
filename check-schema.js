const fs = require('fs');

const testFile = 'reference/map-test.json';
const confFile = 'reference/map-confirmned.json';

const testData = JSON.parse(fs.readFileSync(testFile, 'utf8'));
const confData = JSON.parse(fs.readFileSync(confFile, 'utf8'));

function analyzePalette(palette) {
    const schemas = {};
    for (const item of palette || []) {
        const itemType = item.type || 'unknown';
        const keys = Object.keys(item);
        if (!schemas[itemType]) schemas[itemType] = [];
        schemas[itemType].push(keys);
    }
    
    const summary = {};
    for (const [t, keysList] of Object.entries(schemas)) {
        let allKeys = new Set();
        for (const keys of keysList) {
            keys.forEach(k => allKeys.add(k));
        }
        let reqKeys = new Set(allKeys);
        for (const keys of keysList) {
            const keySet = new Set(keys);
            for (const k of reqKeys) {
                if (!keySet.has(k)) reqKeys.delete(k);
            }
        }
        const optKeys = new Set();
        for (const k of allKeys) {
            if (!reqKeys.has(k)) optKeys.add(k);
        }
        summary[t] = {
            required: Array.from(reqKeys).sort(),
            optional: Array.from(optKeys).sort()
        };
    }
    return summary;
}

function analyzeObjects(objects) {
    if (!objects || objects.length === 0) return {};
    let allKeys = new Set();
    objects.forEach(o => Object.keys(o).forEach(k => allKeys.add(k)));
    let reqKeys = new Set(allKeys);
    objects.forEach(o => {
        const keySet = new Set(Object.keys(o));
        for (const k of reqKeys) {
            if (!keySet.has(k)) reqKeys.delete(k);
        }
    });
    const optKeys = new Set();
    for (const k of allKeys) {
        if (!reqKeys.has(k)) optKeys.add(k);
    }
    return {
        required: Array.from(reqKeys).sort(),
        optional: Array.from(optKeys).sort()
    };
}

console.log('--- TOP LEVEL KEYS ---');
console.log('Confirmed:', Object.keys(confData).sort());
console.log('Test:     ', Object.keys(testData).sort());

console.log('\n--- PALETTE SCHEMA ---');
const confPal = analyzePalette(confData.palette);
const testPal = analyzePalette(testData.palette);
console.log('Confirmed:');
for (const [t, s] of Object.entries(confPal)) {
    console.log(`  ${t}: req=[${s.required.join(', ')}], opt=[${s.optional.join(', ')}]`);
}
console.log('Test:');
for (const [t, s] of Object.entries(testPal)) {
    console.log(`  ${t}: req=[${s.required.join(', ')}], opt=[${s.optional.join(', ')}]`);
}

console.log('\n--- OBJECTS SCHEMA ---');
console.log('Confirmed:', analyzeObjects(confData.objects));
console.log('Test:     ', analyzeObjects(testData.objects));
