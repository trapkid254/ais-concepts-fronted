const fs = require('fs');

const content = fs.readFileSync('services/index.html', 'utf8');

// Find the exact line with the spacing
const lines = content.split('\n');
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('Find Us')) {
        console.log(`Line ${i + 1}:`, JSON.stringify(lines[i]));
        console.log(`Line ${i}:`, JSON.stringify(lines[i - 1]));
        console.log(`Line ${i - 1}:`, JSON.stringify(lines[i - 2]));
        break;
    }
}
