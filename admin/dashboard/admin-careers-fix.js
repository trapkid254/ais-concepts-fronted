(function(){
    function escapeHtml(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,"&#39;"); }

    function renderApplications(apps){
        var tbody = document.getElementById('adminCareersBody');
        if (!tbody) {
            console.error('adminCareersBody element not found');
            return;
        }
        if (!apps || !apps.length) {
            tbody.innerHTML = '<tr><td colspan="7">No applications yet.</td></tr>';
            return;
        }
        console.log('Rendering applications:', apps.length);
        tbody.innerHTML = apps.map(function(a){
            var id = a.id || '';
            var date = a.date ? new Date(a.date).toLocaleDateString() : '';
            var row = '<tr>' +
                '<td>'+escapeHtml(a.name||'')+'</td>' +
                '<td>'+escapeHtml(a.email||'')+'</td>' +
                '<td>'+escapeHtml(a.type||'')+'</td>' +
                '<td>'+escapeHtml(a.campus||'-')+'</td>' +
                '<td>'+escapeHtml(a.yearOfStudy||'-')+'</td>' +
                '<td>'+escapeHtml(date)+'</td>' +
                '<td style="white-space:nowrap; padding: 14px; text-align: center;">' +
                '<button class="btn-icon" data-action="view" data-id="'+escapeHtml(id)+'" style="display:inline-flex;align-items:center;gap:6px;padding:6px 10px;border-radius:6px;background:rgba(0,0,0,0.05);border:1px solid rgba(0,0,0,0.1);color:#0ea5a0;font-weight:600;cursor:pointer;min-width:60px;min-height:32px;"><i class="fas fa-eye" aria-hidden="true"></i> View</button> ' +
                '<button class="btn-icon btn-danger" data-action="delete" data-id="'+escapeHtml(id)+'" style="display:inline-flex;align-items:center;gap:6px;padding:6px 10px;border-radius:6px;background:rgba(220,53,69,0.1);border:1px solid rgba(220,53,69,0.3);color:#dc3545;font-weight:600;cursor:pointer;min-width:60px;min-height:32px;"><i class="fas fa-trash" aria-hidden="true"></i> Delete</button>' +
                '</td>' +
                '</tr>';
            console.log('Row HTML for application', id, ':', row);
            return row;
        }).join('');
        console.log('Buttons rendered. Total buttons:', tbody.querySelectorAll('button').length);
        console.log('Total tds in tbody:', tbody.querySelectorAll('td').length);

        tbody.querySelectorAll('button[data-action="view"]').forEach(function(btn){
            btn.addEventListener('click', function(){
                var id = btn.getAttribute('data-id');
                openCareerView(id);
            });
        });
        tbody.querySelectorAll('button[data-action="delete"]').forEach(function(btn){
            btn.addEventListener('click', function(){
                var id = btn.getAttribute('data-id');
                if (!confirm('Delete this application?')) return;
                fetch((window.API_BASE||'') + '/api/admin/career-applications/' + encodeURIComponent(id), {
                    method: 'DELETE',
                    headers: { 'Authorization': 'Bearer ' + sessionStorage.getItem('authToken') }
                }).then(function(r){
                    return r.json().then(function(d) {
                        if (r.ok) {
                            btn.closest('tr').remove();
                        } else {
                            alert('Could not delete application: ' + (d && d.error ? d.error : r.statusText));
                        }
                    }).catch(function() {
                        if (r.ok) {
                            btn.closest('tr').remove();
                        } else {
                            alert('Could not delete application: ' + r.statusText);
                        }
                    });
                }).catch(function(err){ 
                    console.error('Delete error:', err);
                    alert('Could not delete application: ' + err.message); 
                });
            });
        });
    }

    function downloadCareerAttachment(appId, type, index){
        if (!appId) return;
        // First, try to get the application data to see if attachments are included
        fetch((window.API_BASE||'') + '/api/admin/career-applications', { headers: { 'Authorization': 'Bearer ' + sessionStorage.getItem('authToken') } })
            .then(function(r){ 
                if (!r.ok) throw new Error('Server error: ' + r.status);
                return r.json(); 
            })
            .then(function(apps){
                var app = apps.find(function(x){ return String(x.id) === String(appId); });
                if (!app) {
                    alert('Application not found');
                    return;
                }

                var attachmentData = null;
                var filename = '';

                if (type === 'resume' && app.resume) {
                    attachmentData = app.resume;
                    filename = app.resume.name || 'resume.pdf';
                } else if (type === 'certificate' && app.certificates && app.certificates[index]) {
                    attachmentData = app.certificates[index];
                    filename = attachmentData.name || ('certificate-' + index + '.pdf');
                }

                if (!attachmentData) {
                    alert('Attachment not found');
                    return;
                }

                // Check if attachment has data property (base64) or url property
                console.log('Attachment data structure:', attachmentData);
                console.log('Attachment data keys:', Object.keys(attachmentData));

                if (attachmentData.data) {
                    // Handle base64 data (Data URL format)
                    console.log('Data length:', attachmentData.data.length);
                    console.log('Data type:', typeof attachmentData.data);
                    console.log('Data preview:', attachmentData.data.substring(0, 100));
                    try {
                        // Data URLs have format: data:[<mediatype>][;base64],<data>
                        var base64Data = attachmentData.data;
                        if (base64Data.indexOf('data:') === 0) {
                            // Extract the base64 part after the comma
                            var parts = base64Data.split(',');
                            if (parts.length > 1) {
                                base64Data = parts[1];
                            }
                        }
                        var byteCharacters = atob(base64Data);
                        var byteNumbers = new Array(byteCharacters.length);
                        for (var i = 0; i < byteCharacters.length; i++) {
                            byteNumbers[i] = byteCharacters.charCodeAt(i);
                        }
                        var byteArray = new Uint8Array(byteNumbers);
                        var blob = new Blob([byteArray], { type: 'application/pdf' });
                        var a = document.createElement('a');
                        a.href = URL.createObjectURL(blob);
                        a.download = filename;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(a.href);
                        console.log('Download successful');
                    } catch (e) {
                        console.error('Error processing base64 data:', e);
                        alert('Could not process attachment data: ' + e.message);
                    }
                } else if (attachmentData.url) {
                    // Handle URL
                    var a = document.createElement('a');
                    a.href = attachmentData.url;
                    a.download = filename;
                    a.target = '_blank';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                } else {
                    console.log('No data or url property found in attachment');
                    alert('Attachment data format not supported. Backend download endpoint needs to be implemented.');
                }
            }).catch(function(err){
                console.error('Error fetching application:', err);
                alert('Could not fetch application data');
            });
    }

    function openCareerView(appId){
        if (!appId) return;
        fetch((window.API_BASE||'') + '/api/admin/career-applications', { headers: { 'Authorization': 'Bearer ' + sessionStorage.getItem('authToken') } })
            .then(function(r){ 
                if (!r.ok) throw new Error('Server error: ' + r.status);
                return r.json(); 
            })
            .then(function(apps){
                var app = apps.find(function(x){ return String(x.id) === String(appId); });
                var modal = document.getElementById('adminCareerViewModal');
                var content = document.getElementById('adminCareerViewContent');
                if (!modal || !content) return;
                if (!app) { content.innerHTML = '<p>Application not found.</p>'; modal.classList.add('open'); return; }
                content.innerHTML = '';
                var table = document.createElement('table'); table.className = 'invoice-view-table';
                function addRow(k,v){ var tr=document.createElement('tr'); var th=document.createElement('th'); th.textContent=k; var td=document.createElement('td'); td.innerHTML=escapeHtml(v||''); tr.appendChild(th); tr.appendChild(td); table.appendChild(tr); }
                addRow('Name', app.name);
                addRow('Email', app.email);
                addRow('Phone', app.phone);
                addRow('Type', app.type);
                addRow('Campus', app.campus || '-');
                addRow('Year', app.yearOfStudy || '-');
                addRow('Date', app.date ? new Date(app.date).toLocaleString() : '');
                addRow('Motivation', app.message || '');
                content.appendChild(table);
                if ((app.resume) || (app.certificates && app.certificates.length)){
                    var h3=document.createElement('h3'); h3.textContent='Attachments'; content.appendChild(h3);
                    var ul=document.createElement('ul'); ul.className='attachments-list';
                    if (app.resume) {
                        var li=document.createElement('li'); li.textContent=(app.resume.name||'Resume')+' ';
                        var btn=document.createElement('button'); btn.className='btn btn-sm btn-primary'; btn.innerHTML='<i class="fa fas fa-download" aria-hidden="true"></i> Download';
                        btn.addEventListener('click', function(){ downloadCareerAttachment(app.id, 'resume', 0); });
                        li.appendChild(btn); ul.appendChild(li);
                    }
                    if (app.certificates && app.certificates.length) {
                        app.certificates.forEach(function(cert, idx){ var li=document.createElement('li'); li.textContent=(cert.name||('Certificate '+(idx+1)))+' '; var btn=document.createElement('button'); btn.className='btn btn-sm btn-primary'; btn.innerHTML='<i class="fa fas fa-download" aria-hidden="true"></i> Download'; btn.addEventListener('click', function(){ downloadCareerAttachment(app.id, 'certificate', idx); }); li.appendChild(btn); ul.appendChild(li); });
                    }
                    content.appendChild(ul);
                }
                if (!modal.__closeHandlersAttached){ modal.addEventListener('click', function(e){ if (e.target === modal || e.target.classList.contains('close-modal')) modal.classList.remove('open'); }); modal.__closeHandlersAttached = true; }
                modal.classList.add('open');
            }).catch(function(){ alert('Could not load application.'); });
    }

    function loadCareerApplications(){
        var tbody = document.getElementById('adminCareersBody');
        if (!tbody) return;
        fetch((window.API_BASE||'') + '/api/admin/career-applications', { headers: { 'Authorization': 'Bearer ' + sessionStorage.getItem('authToken') } })
            .then(function(r){ 
                console.log('Career applications response status:', r.status);
                return r.json().then(function(d){ 
                    if (!r.ok) {
                        console.error('Server error:', r.status, d);
                        throw new Error((d && d.details) || (d && d.error) || 'Server error: ' + r.status);
                    }
                    return d; 
                }); 
            })
            .then(function(data){ 
                console.log('Loaded career applications:', data.length, 'applications');
                renderApplications(data || []); 
            })
            .catch(function(err){ 
                console.error('Failed to load career applications:', err.message || err); 
                alert('Failed to load career applications: ' + (err.message || 'Unknown error'));
                renderApplications([]); 
            });
    }

    document.addEventListener('DOMContentLoaded', function(){
        loadCareerApplications();
    });

    // Re-load applications when careers section is shown
    document.addEventListener('click', function(e){
        var link = e.target.closest('.sidebar-nav a[data-section="admin-careers"]');
        if (link) {
            setTimeout(loadCareerApplications, 100);
        }
    });
})();
