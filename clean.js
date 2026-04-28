const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'web-ui/src/components');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.jsx'));

const allowedClasses = ['btn-primary', 'btn-secondary', 'btn-danger', 'card', 'input-field', 'label-text'];

function cleanClasses(content, filename) {
  return content.replace(/className="([^"]+)"/g, (match, p1) => {
    let classes = p1.split(' ');
    let keep = classes.filter(c => allowedClasses.includes(c));
    
    // structural mapping
    if (filename === 'Sidebar.jsx' && p1.includes('w-64')) keep.push('sidebar');
    if (filename === 'Sidebar.jsx' && p1.includes('space-y-2')) keep.push('nav-links');
    if (filename === 'Dashboard.jsx' && p1.includes('min-h-screen')) keep.push('dashboard-layout');
    if (filename === 'Dashboard.jsx' && p1.includes('flex-1')) keep.push('dashboard-main');
    if (p1.includes('animate-spin')) keep.push('spinner');
    if (p1.includes('bg-green-500 rounded-full animate-pulse')) keep.push('status-indicator', 'online');
    if (p1.includes('fixed inset-0')) keep.push('modal-overlay');
    if (p1.includes('max-w-4xl')) keep.push('modal-content');
    if (p1.includes('grid') && p1.includes('grid-cols')) keep.push('stats-grid');
    if (p1.includes('overflow-x-auto')) keep.push('table-container');
    
    if (keep.length > 0) {
      return `className="${keep.join(' ')}"`;
    }
    return '';
  });
}

for (const file of files) {
  let content = fs.readFileSync(path.join(dir, file), 'utf8');
  content = cleanClasses(content, file);
  // remove empty className="" if any
  content = content.replace(/ className=""/g, '');
  fs.writeFileSync(path.join(dir, file), content);
}
console.log('Cleaned JSX files');
