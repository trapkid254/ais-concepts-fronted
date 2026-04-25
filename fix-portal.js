const fs = require('fs');

// Read the current file
let content = fs.readFileSync('portal-script.js', 'utf8');

console.log('Looking for broken code...');

// Find and replace the broken section
const brokenStart = '.catch(error => {';
const brokenEnd = 'projectForm.reset();\n        });';

const startIndex = content.indexOf(brokenStart);
if (startIndex !== -1) {
    const endIndex = content.indexOf(brokenEnd, startIndex) + brokenEnd.length;
    
    const brokenSection = content.substring(startIndex, endIndex);
    console.log('Found broken section:', brokenSection);
    
    const fixedSection = `.catch(error => {
                        console.error('Error creating foreman account:', error);
                        alert(\`Project "\${name}" created successfully, but there was an issue creating the foreman account: \${error.message}\`);
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
                        
                        fetch(\`\${window.API_BASE}/api/projects/create-with-foreman\`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': \`Bearer \${authToken}\`
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
    
    // Replace the broken section with the fixed one
    content = content.substring(0, startIndex) + fixedSection + content.substring(endIndex);
    
    // Write the fixed content back
    fs.writeFileSync('portal-script.js', content);
    console.log('Fixed portal-script.js successfully!');
} else {
    console.log('Could not find the broken section to fix.');
}
