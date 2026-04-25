const fs = require('fs');

// Read the current file
let content = fs.readFileSync('portal-script.js', 'utf8');

console.log('Fixing syntax error at line 643...');

// Fix the template literal issue - the backticks are causing problems
content = content.replace(
    'alert(`Project "${name}" created successfully, but there was an issue creating the foreman account: ${error.message}`);',
    'alert("Project \"" + name + "\" created successfully, but there was an issue creating the foreman account: " + error.message);'
);

// Fix other template literals in the fixed section
content = content.replace(
    'fetch(`${window.API_BASE}/api/projects/create-with-foreman`, {',
    'fetch(window.API_BASE + "/api/projects/create-with-foreman", {'
);

content = content.replace(
    "'Authorization': `Bearer ${authToken}`",
    "'Authorization': 'Bearer ' + authToken"
);

// Write the fixed content back
fs.writeFileSync('portal-script.js', content);
console.log('Fixed template literal syntax errors!');
