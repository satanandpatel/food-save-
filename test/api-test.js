const pool = require('../src/db/connection');

async function runTests() {
  console.log('🧪 Starting FoodSave Automated Backend & Database Tests...\n');
  const baseUrl = 'http://localhost:3000';

  // 1. Health check
  console.log('1. Testing GET /api/health...');
  const healthRes = await fetch(`${baseUrl}/api/health`);
  const healthData = await healthRes.json();
  console.log('   Response:', healthData);
  if (healthData.status !== 'ok') throw new Error('Health check failed');
  console.log('   ✓ Health check passed.\n');

  // 2. Test NGO Matching query
  console.log('2. Testing GET /api/ngos/match?city=Bhopal&quantity=40...');
  const matchRes = await fetch(`${baseUrl}/api/ngos/match?city=Bhopal&quantity=40`);
  const matchData = await matchRes.json();
  console.log('   Matched count:', matchData.count);
  console.log('   Matched NGOs:', matchData.ngos.map(n => `${n.name} (Cap: ${n.capacity_per_day})`));
  // In Bhopal: Roshni Balgrih (35 < 40, so excluded), Anna Sewa Samiti (45), Umeed Ashray Kendra (60). Best-fit ASC: 45, then 60.
  if (matchData.ngos.length !== 2) throw new Error(`Expected 2 NGOs for Bhopal with capacity >= 40, got ${matchData.ngos.length}`);
  if (matchData.ngos[0].name !== 'Anna Sewa Samiti') throw new Error('Expected Anna Sewa Samiti as first (best fit)');
  console.log('   ✓ Best-fit matching algorithm verified.\n');

  // 3. Test Creating Listing (Cooked meal -> 3 hrs, high urgency)
  console.log('3. Testing POST /api/listings (Cooked meal in Bhopal, qty 40)...');
  const createRes = await fetch(`${baseUrl}/api/listings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      donor_name: 'Bhopal Royal Palace',
      donor_type: 'restaurant',
      donor_phone: '+91 98260 99887',
      city: 'Bhopal',
      category: 'Cooked meal',
      quantity: 40,
      notes: 'Rice and curry freshly made'
    })
  });
  const createData = await createRes.json();
  console.log('   Created Listing ID:', createData.listing.id);
  console.log('   Urgency:', createData.listing.urgency);
  console.log('   Shelf life hours:', createData.listing.shelf_life_hours);
  console.log('   Status:', createData.listing.status);
  console.log('   Matched NGOs:', createData.matched_ngos.map(n => n.name));

  if (createData.listing.urgency !== 'high') throw new Error('Expected Cooked meal urgency to be high');
  if (parseFloat(createData.listing.shelf_life_hours) !== 3.0) throw new Error('Expected shelf life to be 3.0');
  if (createData.matched_ngos.length === 0) throw new Error('Expected matched NGOs');
  console.log('   ✓ Listing creation, rule calculation, and matching verified.\n');

  // 4. Test Confirming Pickup
  const listingId = createData.listing.id;
  const chosenNgo = createData.matched_ngos[0];
  console.log(`4. Testing POST /api/listings/${listingId}/confirm with NGO ${chosenNgo.name} (id ${chosenNgo.id})...`);
  const confirmRes = await fetch(`${baseUrl}/api/listings/${listingId}/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ngo_id: chosenNgo.id })
  });
  const confirmData = await confirmRes.json();
  console.log('   Confirm response:', confirmData.message);
  console.log('   Listing status in DB:', confirmData.listing.status);
  console.log('   Matched NGO in DB:', confirmData.listing.ngo_name);

  if (confirmData.listing.status !== 'confirmed') throw new Error('Expected status to be confirmed');
  if (confirmData.listing.matched_ngo_id !== chosenNgo.id) throw new Error('Expected matched_ngo_id to match');
  console.log('   ✓ Confirmation and database state update verified.\n');

  // 5. Test GET /api/listings
  console.log('5. Testing GET /api/listings...');
  const allListingsRes = await fetch(`${baseUrl}/api/listings`);
  const allListingsData = await allListingsRes.json();
  console.log(`   Fetched ${allListingsData.count} total listings from MySQL.`);
  const found = allListingsData.listings.find(l => l.id === listingId);
  if (!found) throw new Error('Created listing not found in listings query');
  if (found.status !== 'confirmed') throw new Error('Status in DB is not confirmed');
  console.log('   ✓ Listing found in audit log with confirmed status.\n');

  console.log('🎉 ALL AUTOMATED TESTS PASSED SUCCESSFULLY!\n');
  process.exit(0);
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
