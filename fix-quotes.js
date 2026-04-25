const fs = require('fs');

// Read the current file
let content = fs.readFileSync('portal-script.js', 'utf8');

console.log('Fixing quote escaping issue...');

// Fix the malformed alert statement
content = content.replace(
    'alert("Project "" + name + "" created successfully, but there was an issue creating the foreman account: " + error.message);',
    'alert("Project \\"" + name + "\\" created successfully, but there was an issue creating the foreman account: " + error.message);'
);

// Write the fixed content back
fs.writeFileSync('portal-script.js', content);
console.log('Fixed quote escaping!');
