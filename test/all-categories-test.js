async function verifyRulesAndCities() {
  const baseUrl = 'http://localhost:3000';
  console.log('Testing category rules and cities...');

  // Bakery
  const r1 = await fetch(`${baseUrl}/api/listings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ category: 'Bakery', quantity: 30, city: 'Indore', donor_name: 'Bake Studio' })
  }).then(r => r.json());
  console.log('Bakery -> shelf_life:', r1.listing.shelf_life_hours, 'urgency:', r1.listing.urgency);
  if (parseFloat(r1.listing.shelf_life_hours) !== 8.0 || r1.listing.urgency !== 'normal') throw new Error('Bakery rule failed');

  // Fruits & Veg
  const r2 = await fetch(`${baseUrl}/api/listings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ category: 'Fruits & Veg', quantity: 20, city: 'Sehore', donor_name: 'Sehore Mandi' })
  }).then(r => r.json());
  console.log('Fruits & Veg -> shelf_life:', r2.listing.shelf_life_hours, 'urgency:', r2.listing.urgency);
  if (parseFloat(r2.listing.shelf_life_hours) !== 24.0 || r2.listing.urgency !== 'normal') throw new Error('Fruits & Veg rule failed');

  // Packaged
  const r3 = await fetch(`${baseUrl}/api/listings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ category: 'Packaged', quantity: 15, city: 'Indore', donor_name: 'Supermart Store' })
  }).then(r => r.json());
  console.log('Packaged -> shelf_life:', r3.listing.shelf_life_hours, 'urgency:', r3.listing.urgency);
  if (parseFloat(r3.listing.shelf_life_hours) !== 48.0 || r3.listing.urgency !== 'normal') throw new Error('Packaged rule failed');

  // Test Sehore capacity filter
  const r4 = await fetch(`${baseUrl}/api/ngos/match?city=Sehore&quantity=22`).then(r => r.json());
  console.log('Sehore qty 22 match count:', r4.count, 'NGO:', r4.ngos.map(n => `${n.name} (${n.capacity_per_day})`));
  if (r4.count !== 1 || r4.ngos[0].name !== 'Gramin Sewa Sangathan') throw new Error('Sehore matching failed');

  console.log('✓ All category rules and city matching tests passed!\n');
}

verifyRulesAndCities().catch(e => {
  console.error(e);
  process.exit(1);
});
