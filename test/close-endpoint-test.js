const pool = require('../src/db/connection');

async function testCloseEndpoint() {
  console.log('🧪 Testing POST /api/listings/:id/close...\n');
  const baseUrl = 'http://localhost:3000';

  // 1. Create a listing
  console.log('1. Creating listing for close test...');
  const createRes = await fetch(`${baseUrl}/api/listings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      donor_name: 'Test Banquet Hall',
      donor_type: 'event',
      city: 'Indore',
      category: 'Bakery',
      quantity: 25,
      notes: 'Testing cancellation flow'
    })
  });
  const createData = await createRes.json();
  const listingId = createData.listing.id;
  console.log(`   Created listing #FS-${listingId} with status: ${createData.listing.status}`);

  // 2. Close the listing
  console.log(`2. Calling POST /api/listings/${listingId}/close...`);
  const closeRes = await fetch(`${baseUrl}/api/listings/${listingId}/close`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  const closeData = await closeRes.json();
  console.log('   Response message:', closeData.message);
  console.log('   Updated status in response:', closeData.listing.status);
  console.log('   closed_at timestamp:', closeData.listing.closed_at);

  if (closeData.listing.status !== 'closed') throw new Error('Expected status to be closed');
  if (!closeData.listing.closed_at) throw new Error('Expected closed_at timestamp to be populated');

  // 3. Verify in database directly
  console.log('3. Verifying record directly in MySQL...');
  const [dbRows] = await pool.query('SELECT status, closed_at FROM listings WHERE id = ?', [listingId]);
  if (dbRows.length === 0) throw new Error('Listing not found in database');
  console.log(`   MySQL values: status=${dbRows[0].status}, closed_at=${dbRows[0].closed_at}`);
  if (dbRows[0].status !== 'closed') throw new Error('Database status is not closed');
  if (!dbRows[0].closed_at) throw new Error('Database closed_at is null');

  // 4. Test closing a confirmed listing
  console.log('\n4. Testing close on a confirmed listing...');
  const c2 = await fetch(`${baseUrl}/api/listings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ donor_name: 'Host 2', city: 'Bhopal', category: 'Packaged', quantity: 30 })
  }).then(r => r.json());
  const l2Id = c2.listing.id;
  const ngoId = c2.matched_ngos[0].id;
  await fetch(`${baseUrl}/api/listings/${l2Id}/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ngo_id: ngoId })
  });
  console.log(`   Confirmed listing #FS-${l2Id}. Now closing...`);

  const closeConfirmedRes = await fetch(`${baseUrl}/api/listings/${l2Id}/close`, { method: 'POST' }).then(r => r.json());
  console.log(`   Status after close on confirmed listing: ${closeConfirmedRes.listing.status}`);
  if (closeConfirmedRes.listing.status !== 'closed') throw new Error('Failed to close confirmed listing');

  console.log('\n✓ All close endpoint tests passed successfully!\n');
  process.exit(0);
}

testCloseEndpoint().catch(e => {
  console.error('❌ Close endpoint test failed:', e);
  process.exit(1);
});
