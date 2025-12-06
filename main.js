const readline = require('readline');
const db = require('./db');
require('./events/logger');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function menu() {
  console.log(`
===== NodeVault =====
1. Add Record
2. List Records
3. Update Record
4. Delete Record
5. Search Records
6. Sort Records
7. Export Data
8. View Vault Statistics
9. Exit
=====================
  `);

  rl.question('Choose option: ', async (ans) => {
    try {
      switch (ans.trim()) {
        case '1':
          rl.question('Enter name: ', (name) => {
            rl.question('Enter value: ', async (value) => {
              try {
                await db.addRecord({ name, value });
                console.log('✅ Record added successfully!');
                menu();
              } catch (error) {
                console.log('❌ Error:', error.message);
                menu();
              }
            });
          });
          break;

        case '2':
          const records = await db.listRecords();
          if (records.length === 0) console.log('No records found.');
          else records.forEach(r => console.log(`ID: ${r.id} | Name: ${r.name} | Value: ${r.value}`));
          menu();
          break;

        case '3':
          rl.question('Enter record ID to update: ', (id) => {
            rl.question('New name: ', (name) => {
              rl.question('New value: ', async (value) => {
                try {
                  const updated = await db.updateRecord(Number(id), name, value);
                  console.log(updated ? '✅ Record updated!' : '❌ Record not found.');
                  menu();
                } catch (error) {
                  console.log('❌ Error:', error.message);
                  menu();
                }
              });
            });
          });
          break;

        case '4':
          rl.question('Enter record ID to delete: ', async (id) => {
            try {
              const deleted = await db.deleteRecord(Number(id));
              console.log(deleted ? '🗑️ Record deleted!' : '❌ Record not found.');
              menu();
            } catch (error) {
              console.log('❌ Error:', error.message);
              menu();
            }
          });
          break;
          
        case '5':
          rl.question('Enter search keyword: ', async (keyword) => {
            try {
              const results = await db.searchRecords(keyword);
              if (results.length === 0) {
                console.log('No records found.');
              } else {
                console.log(`\nFound ${results.length} matching record(s):`);
                results.forEach((r, index) => {
                  console.log(`${index + 1}. ID: ${r.id} | Name: ${r.name} | Value: ${r.value}`);
                });
              }
              menu();
            } catch (error) {
              console.log('Error:', error.message);
              menu();
            }
          });
          break;

        case '6':
          rl.question('Choose field to sort by (name/id): ', (field) => {
            const sortField = field.toLowerCase().trim();
            
            if (sortField !== 'name' && sortField !== 'id') {
              console.log('Invalid field. Please choose "name" or "id".');
              menu();
              return;
            }
            
            rl.question('Choose order (asc/desc): ', async (order) => {
              try {
                const sortOrder = order.toLowerCase().trim();
                
                if (sortOrder !== 'asc' && sortOrder !== 'desc') {
                  console.log('Invalid order. Please choose "asc" or "desc".');
                  menu();
                  return;
                }
                
                const sortedRecords = await db.sortRecords(sortField, sortOrder);
                
                if (sortedRecords.length === 0) {
                  console.log('No records to sort.');
                } else {
                  const fieldName = sortField === 'name' ? 'Name' : 'Creation Date (ID)';
                  const orderName = sortOrder === 'asc' ? 'Ascending' : 'Descending';
                  console.log(`\nSorted by ${fieldName} (${orderName}):`);
                  sortedRecords.forEach((r, index) => {
                    console.log(`${index + 1}. ID: ${r.id} | Name: ${r.name} | Value: ${r.value}`);
                  });
                }
                menu();
              } catch (error) {
                console.log('❌ Error:', error.message);
                menu();
              }
            });
          });
          break;

        case '7':
          try {
            const exportPath = await db.exportData();
            console.log('Data exported successfully to export.txt');
            console.log(`File location: ${exportPath}`);
          } catch (error) {
            console.log('Error exporting data:', error.message);
          }
          menu();
          break;

        case '8':
          try {
            const stats = await db.getVaultStatistics();
            
            console.log('\nVault Statistics:');
            console.log('─'.repeat(50));
            console.log(`Total Records: ${stats.totalRecords}`);
            
            if (stats.totalRecords === 0) {
              console.log('\nNo records in vault yet.');
            } else {
              if (stats.lastModified) {
                const lastMod = stats.lastModified;
                const formattedDate = `${lastMod.getFullYear()}-${String(lastMod.getMonth() + 1).padStart(2, '0')}-${String(lastMod.getDate()).padStart(2, '0')}`;
                const formattedTime = `${String(lastMod.getHours()).padStart(2, '0')}:${String(lastMod.getMinutes()).padStart(2, '0')}:${String(lastMod.getSeconds()).padStart(2, '0')}`;
                console.log(`Last Modified: ${formattedDate} ${formattedTime}`);
              }
              
              if (stats.longestName) {
                console.log(`Longest Name: ${stats.longestName} (${stats.longestNameLength} characters)`);
              }
              
              if (stats.earliestRecord) {
                const earliest = stats.earliestRecord;
                const formattedEarliest = `${earliest.getFullYear()}-${String(earliest.getMonth() + 1).padStart(2, '0')}-${String(earliest.getDate()).padStart(2, '0')}`;
                console.log(`Earliest Record: ${formattedEarliest}`);
              }
              
              if (stats.latestRecord) {
                const latest = stats.latestRecord;
                const formattedLatest = `${latest.getFullYear()}-${String(latest.getMonth() + 1).padStart(2, '0')}-${String(latest.getDate()).padStart(2, '0')}`;
                console.log(`Latest Record: ${formattedLatest}`);
              }
            }
            
            console.log('─'.repeat(50));
            menu();
          } catch (error) {
            console.log('Error:', error.message);
            menu();
          }
          break;

        case '9':
          console.log('👋 Exiting NodeVault...');
          await db.closeDB();
          rl.close();
          process.exit(0);
          break;

        default:
          console.log('Invalid option.');
          menu();
      }
    } catch (error) {
      console.log('❌ Unexpected error:', error.message);
      menu();
    }
  });
}

// Initialize and start
(async () => {
  try {
    console.log('🚀 Starting NodeVault with MongoDB...');
    menu();
  } catch (error) {
    console.error('❌ Failed to start application:', error);
    process.exit(1);
  }
})();
