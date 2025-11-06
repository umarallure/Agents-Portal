/**
 * Test Monday.com API Connection
 * 
 * This script tests the Monday.com API integration.
 * Run this in the browser console on the Commission Portal page.
 */

// Test 1: Check if API token is configured
console.log('=== Test 1: API Configuration ===');
console.log('API Token configured:', import.meta.env.VITE_MONDAY_API_TOKEN ? 'YES' : 'NO');
console.log('Board ID:', import.meta.env.VITE_MONDAY_BOARD_ID || 'Using default: 1234567890');

// Test 2: Test basic Monday.com API connection
async function testMondayConnection() {
  console.log('\n=== Test 2: Monday.com Connection ===');
  
  const token = import.meta.env.VITE_MONDAY_API_TOKEN;
  
  if (!token) {
    console.error('❌ No API token found. Please set VITE_MONDAY_API_TOKEN in your .env file');
    return;
  }

  try {
    const response = await fetch('https://api.monday.com/v2', {
      method: 'POST',
      headers: {
        'Authorization': token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: 'query { me { id name email } }'
      })
    });

    const result = await response.json();
    
    if (result.errors) {
      console.error('❌ API Error:', result.errors);
    } else {
      console.log('✅ Connection successful!');
      console.log('User:', result.data.me);
    }
  } catch (error) {
    console.error('❌ Connection failed:', error);
  }
}

// Test 3: Fetch board metadata
async function testBoardMetadata() {
  console.log('\n=== Test 3: Board Metadata ===');
  
  const token = import.meta.env.VITE_MONDAY_API_TOKEN;
  const boardId = import.meta.env.VITE_MONDAY_BOARD_ID || '1234567890';
  
  if (!token) {
    console.error('❌ No API token found');
    return;
  }

  try {
    const response = await fetch('https://api.monday.com/v2', {
      method: 'POST',
      headers: {
        'Authorization': token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `
          query {
            boards(ids: ${boardId}) {
              id
              name
              description
              columns {
                id
                title
                type
              }
            }
          }
        `
      })
    });

    const result = await response.json();
    
    if (result.errors) {
      console.error('❌ API Error:', result.errors);
    } else if (result.data.boards.length === 0) {
      console.error('❌ Board not found with ID:', boardId);
    } else {
      console.log('✅ Board found!');
      console.log('Board:', result.data.boards[0].name);
      console.log('Columns:', result.data.boards[0].columns.length);
      console.table(result.data.boards[0].columns);
    }
  } catch (error) {
    console.error('❌ Failed to fetch board:', error);
  }
}

// Test 4: Fetch items filtered by Sales Agent
async function testSalesAgentFilter(salesAgent = 'Isaac Reed') {
  console.log('\n=== Test 4: Sales Agent Filter ===');
  console.log('Filtering by:', salesAgent);
  
  const token = import.meta.env.VITE_MONDAY_API_TOKEN;
  const boardId = import.meta.env.VITE_MONDAY_BOARD_ID || '1234567890';
  
  if (!token) {
    console.error('❌ No API token found');
    return;
  }

  try {
    const response = await fetch('https://api.monday.com/v2', {
      method: 'POST',
      headers: {
        'Authorization': token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `
          query {
            boards(ids: ${boardId}) {
              items_page(
                limit: 10
                query_params: {
                  rules: [
                    {
                      column_id: "person"
                      compare_value: ["${salesAgent}"]
                      operator: contains_text
                    }
                  ]
                  operator: and
                }
              ) {
                cursor
                items {
                  id
                  name
                  column_values {
                    id
                    text
                    value
                  }
                }
              }
            }
          }
        `
      })
    });

    const result = await response.json();
    
    if (result.errors) {
      console.error('❌ API Error:', result.errors);
    } else {
      const items = result.data.boards[0].items_page.items;
      console.log(`✅ Found ${items.length} items for ${salesAgent}`);
      
      if (items.length > 0) {
        console.log('\nFirst item:');
        console.log('- ID:', items[0].id);
        console.log('- Name:', items[0].name);
        console.log('- Columns:', items[0].column_values.length);
        console.table(items[0].column_values.filter(c => c.text));
      }
    }
  } catch (error) {
    console.error('❌ Failed to fetch items:', error);
  }
}

// Run all tests
async function runAllTests() {
  await testMondayConnection();
  await testBoardMetadata();
  await testSalesAgentFilter('Isaac Reed');
  
  console.log('\n=== Tests Complete ===');
  console.log('If all tests passed, your Monday.com integration is working correctly!');
}

// Export functions for manual testing
window.mondayTests = {
  runAll: runAllTests,
  testConnection: testMondayConnection,
  testBoard: testBoardMetadata,
  testFilter: testSalesAgentFilter,
};

console.log('\n📋 Monday.com Test Suite Loaded');
console.log('Run tests manually:');
console.log('  mondayTests.runAll()           - Run all tests');
console.log('  mondayTests.testConnection()   - Test API connection');
console.log('  mondayTests.testBoard()        - Test board access');
console.log('  mondayTests.testFilter("Name") - Test sales agent filter');
console.log('\nOr run all tests now:');
console.log('  await mondayTests.runAll()');
