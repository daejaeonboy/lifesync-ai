const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'views', 'ChatView.tsx');
try {
    let content = fs.readFileSync(filePath, 'utf8');
    // Remove BOM if present
    if (content.charCodeAt(0) === 0xFEFF) {
        content = content.slice(1);
        fs.writeFileSync(filePath, content, 'utf8');
        console.log('Successfully removed BOM from ' + filePath);
    } else {
        console.log('No BOM found in ' + filePath);
        // Force write just in case
        fs.writeFileSync(filePath, content, 'utf8');
    }
} catch (err) {
    console.error('Error fixing encoding:', err);
    process.exit(1);
}
