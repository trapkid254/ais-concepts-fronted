(function(){
    function renderSupportTickets(tickets){
        var tbody = document.getElementById('adminSupportTicketsBody');
        if (!tbody) {
            console.error('adminSupportTicketsBody element not found');
            return;
        }
        if (!tickets || !tickets.length) {
            tbody.innerHTML = DOMPurify.sanitize('<tr><td colspan="6">No support tickets yet.</td></tr>');
            return;
        }
        console.log('Rendering support tickets:', tickets.length);
        tbody.innerHTML = DOMPurify.sanitize(tickets.map(function(t){
            var id = t.id || '';
            var date = t.date ? new Date(t.date).toLocaleDateString() : '';
            var statusClass = '';
            if (t.status === 'pending') statusClass = 'background: rgba(255, 193, 7, 0.1); color: #ffc107;';
            else if (t.status === 'in-progress') statusClass = 'background: rgba(23, 162, 184, 0.1); color: #17a2b8;';
            else if (t.status === 'resolved') statusClass = 'background: rgba(40, 167, 69, 0.1); color: #28a745;';
            
            var row = '<tr>' +
                '<td>'+DOMPurify.sanitize(t.name||'')+'</td>' +
                '<td>'+DOMPurify.sanitize(t.email||'')+'</td>' +
                '<td>'+DOMPurify.sanitize(t.subject||'')+'</td>' +
                '<td><span style="padding: 4px 8px; border-radius: 4px; font-size: 0.85rem; font-weight: 500; '+statusClass+'">'+DOMPurify.sanitize(t.status||'pending')+'</span></td>' +
                '<td>'+DOMPurify.sanitize(date)+'</td>' +
                '<td style="white-space:nowrap; padding: 14px; text-align: center;">' +
                '<button class="btn-icon" data-action="view" data-id="'+DOMPurify.sanitize(id)+'" style="display:inline-flex;align-items:center;gap:6px;padding:6px 10px;border-radius:6px;background:rgba(0,0,0,0.05);border:1px solid rgba(0,0,0,0.1);color:#0ea5a0;font-weight:600;cursor:pointer;min-width:60px;min-height:32px;"><i class="fas fa-eye" aria-hidden="true"></i> View</button> ' +
                '<button class="btn-icon btn-danger" data-action="delete" data-id="'+DOMPurify.sanitize(id)+'" style="display:inline-flex;align-items:center;gap:6px;padding:6px 10px;border-radius:6px;background:rgba(220,53,69,0.1);border:1px solid rgba(220,53,69,0.3);color:#dc3545;font-weight:600;cursor:pointer;min-width:60px;min-height:32px;"><i class="fas fa-trash" aria-hidden="true"></i> Delete</button>' +
                '</td>' +
                '</tr>';
            return row;
        }).join(''));

        tbody.querySelectorAll('button[data-action="view"]').forEach(function(btn){
            btn.addEventListener('click', function(){
                var id = btn.getAttribute('data-id');
                openSupportView(id);
            });
        });
        tbody.querySelectorAll('button[data-action="delete"]').forEach(function(btn){
            btn.addEventListener('click', function(){
                var id = btn.getAttribute('data-id');
                if (!confirm('Delete this support ticket?')) return;
                fetch((window.API_BASE||'') + '/api/admin/client-support-tickets/' + encodeURIComponent(id), {
                    method: 'DELETE',
                    headers: { 'Authorization': 'Bearer ' + sessionStorage.getItem('authToken') }
                }).then(function(r){
                    return r.json().then(function(d) {
                        if (r.ok) {
                            btn.closest('tr').remove();
                        } else {
                            alert('Could not delete ticket: ' + (d && d.error ? d.error : r.statusText));
                        }
                    }).catch(function() {
                        if (r.ok) {
                            btn.closest('tr').remove();
                        } else {
                            alert('Could not delete ticket: ' + r.statusText);
                        }
                    });
                }).catch(function(err){ 
                    console.error('Delete error:', err);
                    alert('Could not delete ticket: ' + err.message); 
                });
            });
        });
    }

    function openSupportView(ticketId){
        if (!ticketId) return;
        fetch((window.API_BASE||'') + '/api/admin/client-support-tickets', { headers: { 'Authorization': 'Bearer ' + sessionStorage.getItem('authToken') } })
            .then(function(r){
                if (!r.ok) throw new Error('Server error: ' + r.status);
                return r.json();
            })
            .then(function(tickets){
                var ticket = tickets.find(function(x){ return String(x.id) === String(ticketId); });
                var modal = document.getElementById('adminSupportViewModal');
                var content = document.getElementById('adminSupportViewContent');
                if (!modal || !content) return;
                if (!ticket) { content.innerHTML = DOMPurify.sanitize('<p>Ticket not found.</p>'); modal.classList.add('open'); return; }
                content.innerHTML = '';
                var table = document.createElement('table'); table.className = 'invoice-view-table';
                function addRow(k,v){ var tr=document.createElement('tr'); var th=document.createElement('th'); th.textContent=k; var td=document.createElement('td'); td.innerHTML=DOMPurify.sanitize(v||''); tr.appendChild(th); tr.appendChild(td); table.appendChild(tr); }
                addRow('Name', ticket.name);
                addRow('Email', ticket.email);
                addRow('Subject', ticket.subject);
                addRow('Status', ticket.status);
                addRow('Date', ticket.date ? new Date(ticket.date).toLocaleString() : '');
                addRow('Message', ticket.message);
                content.appendChild(table);
                
                // Add status update buttons
                var statusDiv = document.createElement('div');
                statusDiv.style.marginTop = '20px';
                statusDiv.style.padding = '15px';
                statusDiv.style.background = 'var(--bg-secondary)';
                statusDiv.style.borderRadius = '8px';
                statusDiv.innerHTML = DOMPurify.sanitize('<h4 style="margin-top:0;">Update Status</h4>');
                
                var statusSelect = document.createElement('select');
                statusSelect.id = 'supportStatusSelect';
                statusSelect.style.padding = '8px';
                statusSelect.style.borderRadius = '4px';
                statusSelect.style.border = '1px solid var(--border-color)';
                statusSelect.style.marginRight = '10px';
                ['pending', 'in-progress', 'resolved'].forEach(function(s){
                    var opt = document.createElement('option');
                    opt.value = s;
                    opt.textContent = s.charAt(0).toUpperCase() + s.slice(1);
                    if (s === ticket.status) opt.selected = true;
                    statusSelect.appendChild(opt);
                });
                
                var updateBtn = document.createElement('button');
                updateBtn.className = 'btn btn-primary';
                updateBtn.textContent = 'Update Status';
                updateBtn.addEventListener('click', function(){
                    var newStatus = statusSelect.value;
                    fetch((window.API_BASE||'') + '/api/admin/client-support-tickets/' + encodeURIComponent(ticketId) + '/status', {
                        method: 'PATCH',
                        headers: { 
                            'Authorization': 'Bearer ' + sessionStorage.getItem('authToken'),
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ status: newStatus })
                    }).then(function(r){
                        return r.json().then(function(d){
                            if (r.ok) {
                                alert('Status updated successfully');
                                loadSupportTickets();
                                modal.classList.remove('open');
                            } else {
                                alert('Could not update status: ' + (d && d.error ? d.error : r.statusText));
                            }
                        });
                    }).catch(function(err){
                        console.error('Status update error:', err);
                        alert('Could not update status: ' + err.message);
                    });
                });
                
                statusDiv.appendChild(statusSelect);
                statusDiv.appendChild(updateBtn);
                content.appendChild(statusDiv);
                
                if (!modal.__closeHandlersAttached){ modal.addEventListener('click', function(e){ if (e.target === modal || e.target.classList.contains('close-modal')) modal.classList.remove('open'); }); modal.__closeHandlersAttached = true; }
                modal.classList.add('open');
            }).catch(function(){ alert('Could not load ticket.'); });
    }

    function loadSupportTickets(){
        var tbody = document.getElementById('adminSupportTicketsBody');
        if (!tbody) return;
        fetch((window.API_BASE||'') + '/api/admin/client-support-tickets', { headers: { 'Authorization': 'Bearer ' + sessionStorage.getItem('authToken') } })
            .then(function(r){ 
                console.log('Support tickets response status:', r.status);
                return r.json().then(function(d){ 
                    if (!r.ok) {
                        console.error('Server error:', r.status, d);
                        throw new Error((d && d.details) || (d && d.error) || 'Server error: ' + r.status);
                    }
                    return d; 
                }); 
            })
            .then(function(data){ 
                console.log('Loaded support tickets:', data.length, 'tickets');
                renderSupportTickets(data || []); 
            })
            .catch(function(err){ 
                console.error('Failed to load support tickets:', err.message || err); 
                alert('Failed to load support tickets: ' + (err.message || 'Unknown error'));
                renderSupportTickets([]); 
            });
    }

    document.addEventListener('DOMContentLoaded', function(){
        loadSupportTickets();
    });

    // Re-load tickets when support section is shown
    document.addEventListener('click', function(e){
        var link = e.target.closest('.sidebar-nav a[data-section="admin-support"]');
        if (link) {
            setTimeout(loadSupportTickets, 100);
        }
    });
})();
