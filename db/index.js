const { getCollection, closeDB } = require('./mongo');
const recordUtils = require('./record');
const vaultEvents = require('../events');
const fs = require('fs');
const path = require('path');

// Collection name
const COLLECTION_NAME = 'records';

// Backup function (keeps file backup for safety)
function createBackup() {
  const backupsDir = path.join(__dirname, '..', '..', 'backups');
  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true });
  }
  
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  
  const filename = `backup_${year}-${month}-${day}_${hours}-${minutes}-${seconds}.json`;
  const backupPath = path.join(backupsDir, filename);
  
  // Note: This is now async - we'll handle it properly
  return { filename, backupPath };
}

async function addRecord({ name, value }) {
  recordUtils.validateRecord({ name, value });
  
  const collection = await getCollection(COLLECTION_NAME);
  const newRecord = { 
    id: recordUtils.generateId(), 
    name, 
    value,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  await collection.insertOne(newRecord);
  vaultEvents.emit('recordAdded', newRecord);
  
  // Create backup asynchronously
  const backupInfo = createBackup();
  const allRecords = await listRecords();
  fs.writeFileSync(backupInfo.backupPath, JSON.stringify(allRecords, null, 2), 'utf8');
  console.log(`💾 Backup created: ${backupInfo.filename}`);
  
  return newRecord;
}

async function listRecords() {
  const collection = await getCollection(COLLECTION_NAME);
  const records = await collection.find({}).toArray();
  return records;
}

async function updateRecord(id, newName, newValue) {
  const collection = await getCollection(COLLECTION_NAME);
  
  const result = await collection.findOneAndUpdate(
    { id: id },
    { 
      $set: { 
        name: newName, 
        value: newValue,
        updatedAt: new Date()
      } 
    },
    { returnDocument: 'after' }
  );
  
  if (!result) return null;
  
  vaultEvents.emit('recordUpdated', result);
  return result;
}

async function deleteRecord(id) {
  const collection = await getCollection(COLLECTION_NAME);
  
  const record = await collection.findOne({ id: id });
  if (!record) return null;
  
  await collection.deleteOne({ id: id });
  vaultEvents.emit('recordDeleted', record);
  
  // Create backup
  const backupInfo = createBackup();
  const allRecords = await listRecords();
  fs.writeFileSync(backupInfo.backupPath, JSON.stringify(allRecords, null, 2), 'utf8');
  console.log(`💾 Backup created: ${backupInfo.filename}`);
  
  return record;
}

async function searchRecords(keyword) {
  const collection = await getCollection(COLLECTION_NAME);
  const searchTerm = keyword.toLowerCase();
  
  // Search by name (case-insensitive) or by ID (exact match)
  const records = await collection.find({
    $or: [
      { name: { $regex: searchTerm, $options: 'i' } },
      { id: parseInt(keyword) || -1 }
    ]
  }).toArray();
  
  return records;
}

async function sortRecords(field, order) {
  const collection = await getCollection(COLLECTION_NAME);
  
  const sortDirection = order === 'desc' ? -1 : 1;
  const sortField = field === 'name' ? 'name' : 'id';
  
  const records = await collection
    .find({})
    .collation({ locale: 'en', strength: 2 }) // Case-insensitive sorting
    .sort({ [sortField]: sortDirection })
    .toArray();
  
  return records;
}

async function exportData() {
  const data = await listRecords();
  
  const exportPath = path.join(__dirname, '..', '..', 'export.txt');
  
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
  
  let content = '';
  content += '╔═══════════════════════════════════════════════════════════╗\n';
  content += '                    NODEVAULT DATA EXPORT                  \n';
  content += '╚═══════════════════════════════════════════════════════════╝\n';
  content += '\n';
  content += `Export Date: ${exportDate}\n`;
  content += `Export Time: ${exportTime}\n`;
  content += `Total Records: ${data.length}\n`;
  content += `File Name: export.txt\n`;
  content += `Database: MongoDB\n`;
  content += '\n';
  content += '╔═══════════════════════════════════════════════════════════╗\n';
  content += '                         RECORDS                           \n';
  content += '╚═══════════════════════════════════════════════════════════╝\n';
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
      
      const createdDate = new Date(record.id);
      content += `Created: ${createdDate.toLocaleString('en-US')}\n`;
      content += '\n';
    });
  }
  
  content += '╔═══════════════════════════════════════════════════════════╗\n';
  content += '                      END OF EXPORT                        \n';
  content += '╚═══════════════════════════════════════════════════════════╝\n';
  
  fs.writeFileSync(exportPath, content, 'utf8');
  
  return exportPath;
}

async function getVaultStatistics() {
  const collection = await getCollection(COLLECTION_NAME);
  const data = await collection.find({}).toArray();
  
  const stats = {
    totalRecords: data.length,
    lastModified: null,
    longestName: null,
    longestNameLength: 0,
    earliestRecord: null,
    latestRecord: null
  };
  
  if (data.length === 0) {
    return stats;
  }
  
  // Get most recent update time
  const mostRecent = await collection
    .find({})
    .sort({ updatedAt: -1 })
    .limit(1)
    .toArray();
  
  if (mostRecent.length > 0) {
    stats.lastModified = mostRecent[0].updatedAt;
  }
  
  // Find longest name
  data.forEach(record => {
    if (record.name.length > stats.longestNameLength) {
      stats.longestName = record.name;
      stats.longestNameLength = record.name.length;
    }
  });
  
  // Find earliest and latest records by ID (timestamp)
  const sortedByDate = [...data].sort((a, b) => a.id - b.id);
  stats.earliestRecord = new Date(sortedByDate[0].id);
  stats.latestRecord = new Date(sortedByDate[sortedByDate.length - 1].id);
  
  return stats;
}

module.exports = { 
  addRecord, 
  listRecords, 
  updateRecord, 
  deleteRecord, 
  searchRecords, 
  sortRecords, 
  exportData, 
  getVaultStatistics,
  closeDB 
};
