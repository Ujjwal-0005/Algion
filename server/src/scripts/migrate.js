const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const config = require('../config');
const Migration = require('../models/Migration');

async function migrate() {
  try {
    console.log(`Connecting to MongoDB at ${config.mongodbUri}...`);
    await mongoose.connect(config.mongodbUri);

    const migrationsDir = path.resolve(__dirname, '../../migrations');
    if (!fs.existsSync(migrationsDir)) {
      console.log('No migrations directory found.');
      process.exit(0);
    }

    const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.js')).sort();
    const appliedMigrations = await Migration.find().select('name');
    const appliedSet = new Set(appliedMigrations.map(m => m.name));

    for (const file of files) {
      if (!appliedSet.has(file)) {
        console.log(`Running migration: ${file}...`);
        const migration = require(path.join(migrationsDir, file));
        if (typeof migration.up === 'function') {
          await migration.up();
        }
        await Migration.create({ name: file, appliedAt: new Date() });
        console.log(`Applied migration: ${file}`);
      } else {
        console.log(`Skipping already applied migration: ${file}`);
      }
    }

    console.log('All migrations completed successfully.');
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();

