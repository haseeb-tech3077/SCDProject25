const fileDB = require('./file');
const recordUtils = require('./record');
const vaultEvents = require('../events');

function addRecord({ name, value }) {
  recordUtils.validateRecord({ name, value });
  const data = fileDB.readDB();
  const newRecord = { id: recordUtils.generateId(), name, value };
  data.push(newRecord);
  fileDB.writeDB(data);
  vaultEvents.emit('recordAdded', newRecord);
  return newRecord;
}

function listRecords() {
  return fileDB.readDB();
}

function updateRecord(id, newName, newValue) {
  const data = fileDB.readDB();
  const record = data.find(r => r.id === id);
  if (!record) return null;
  record.name = newName;
  record.value = newValue;
  fileDB.writeDB(data);
  vaultEvents.emit('recordUpdated', record);
  return record;
}

function deleteRecord(id) {
  let data = fileDB.readDB();
  const record = data.find(r => r.id === id);
  if (!record) return null;
  data = data.filter(r => r.id !== id);
  fileDB.writeDB(data);
  vaultEvents.emit('recordDeleted', record);
  return record;
}

function searchRecords(keyword) {
  const data = fileDB.readDB();
  const searchTerm = keyword.toLowerCase();
  
  // Search by name (case-insensitive) or by ID (exact match)
  return data.filter(record => {
    const nameMatch = record.name.toLowerCase().includes(searchTerm);
    const idMatch = record.id.toString() === keyword;
    return nameMatch || idMatch;
  });
}

function sortRecords(field, order) {
  const data = fileDB.readDB();
  // Create a copy to avoid modifying the original array
  const sortedData = [...data];
  
  sortedData.sort((a, b) => {
    let comparison = 0;
    
    if (field === 'name') {
      // Case-insensitive name comparison
      comparison = a.name.toLowerCase().localeCompare(b.name.toLowerCase());
    } else if (field === 'id') {
      // ID comparison (creation date, since ID is timestamp)
      comparison = a.id - b.id;
    }
    
    // Reverse for descending order
    return order === 'desc' ? -comparison : comparison;
  });
  
  return sortedData;
}

function exportData() {
  const fs = require('fs');
  const path = require('path');
  const data = fileDB.readDB();
  
  // Generate export file path (root directory)
  const exportPath = path.join(__dirname, '..', '..', 'export.txt');
  
  // Get current date and time
  const now = new Date();
  const exportDate = now.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  const exportTime = now.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit' 
  });
  
  // Build the export content
  let content = '';
  content += '═══════════════════════════════════════════════════════════\n';
  content += '                    NODEVAULT DATA EXPORT                  \n';
  content += '═══════════════════════════════════════════════════════════\n';
  content += '\n';
  content += `Export Date: ${exportDate}\n`;
  content += `Export Time: ${exportTime}\n`;
  content += `Total Records: ${data.length}\n`;
  content += `File Name: export.txt\n`;
  content += '\n';
  content += '═══════════════════════════════════════════════════════════\n';
  content += '                         RECORDS                           \n';
  content += '═══════════════════════════════════════════════════════════\n';
  content += '\n';
  
  if (data.length === 0) {
    content += 'No records found in the vault.\n';
  } else {
    data.forEach((record, index) => {
      content += `Record #${index + 1}\n`;
      content += `${'─'.repeat(59)}\n`;
      content += `ID:    ${record.id}\n`;
      content += `Name:  ${record.name}\n`;
      content += `Value: ${record.value}\n`;
      
      // Convert timestamp ID to readable date
      const createdDate = new Date(record.id);
      content += `Created: ${createdDate.toLocaleString('en-US')}\n`;
      content += '\n';
    });
  }
  
  content += '═══════════════════════════════════════════════════════════\n';
  content += '                      END OF EXPORT                        \n';
  content += '═══════════════════════════════════════════════════════════\n';
  
  // Write to file
  fs.writeFileSync(exportPath, content, 'utf8');
  
  return exportPath;
}

module.exports = { addRecord, listRecords, updateRecord, deleteRecord, searchRecords, sortRecords, exportData };
