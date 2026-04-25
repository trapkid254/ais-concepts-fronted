const fs = require('fs');

// Read the current file
let content = fs.readFileSync('portal-script.js', 'utf8');

console.log('Fixing the entire broken structure...');

// Find the problematic section and replace it with correct structure
const brokenPattern = /            \.catch\(error => \{\s*console\.error\('Error creating foreman account:', error\);\s*alert\("Project \\".*?\\" created successfully, but there was an issue creating the foreman account: " \+ error\.message\);\s*\}\);\s*\} else \{[\s\S]*?projectForm\.reset\(\);\s*\}\);/;

const fixedCode = `            .catch(error => {
                        console.error('Error creating foreman account:', error);
                        alert("Project \\"" + name + "\\" created successfully, but there was an issue creating the foreman account: " + error.message);
                    });
                } else {
                    // No foreman account creation needed, just save the project
                    if (authToken) {
                        const backendProjectData = {
                            name: projectData.name,
                            location: {
                                name: projectData.location?.name || '',
                                address: projectData.location?.name || '',
                                latitude: projectData.location?.latitude || 0,
                                longitude: projectData.location?.longitude || 0
                            },
                            radius: 100,
                            foremanId: assignedForeman?.id || null,
                            foremanName: assignedForeman?.name || '',
                            foremanEmail: assignedForeman?.email || '',
                            foremanPhone: selectedForeman?.phone || '',
                            startDate: new Date().toISOString(),
                            endDate: projectData.deadline || '',
                            budget: projectData.budget || ''
                        };
                        
                        fetch(window.API_BASE + "/api/projects/create-with-foreman", {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': 'Bearer ' + authToken
                            },
                            body: JSON.stringify(backendProjectData)
                        })
                        .then(response => {
                            if (!response.ok) {
                                console.warn('Failed to save project to backend, but saved locally');
                                throw new Error('Backend save failed');
                            }
                            return response.json();
                        })
                        .then(data => {
                            console.log('Project saved to backend successfully:', data);
                        })
                        .catch(error => {
                            console.warn('Error saving project to backend:', error);
                        });
                    }
                }
            }
            
            // Refresh the projects table
            renderAdminProjectsTable();
            projectModal.classList.remove('open');
            projectForm.reset();
        });`;

// Replace the broken section
if (brokenPattern.test(content)) {
    content = content.replace(brokenPattern, fixedCode);
    console.log('Successfully replaced broken structure');
} else {
    console.log('Could not find the exact pattern to replace');
}

// Write the fixed content back
fs.writeFileSync('portal-script.js', content);
console.log('Fixed the entire structure!');
