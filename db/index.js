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

module.exports = { addRecord, listRecords, updateRecord, deleteRecord, searchRecords, sortRecords };
