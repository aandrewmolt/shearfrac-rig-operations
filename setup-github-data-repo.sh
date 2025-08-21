#!/bin/bash

# Script to set up the shearfrac-data repository structure

echo "Setting up shearfrac-data repository..."

# Create a temporary directory
TEMP_DIR=$(mktemp -d)
cd $TEMP_DIR

# Clone the repository
git clone https://github.com/aandrewmolt/shearfrac-data.git
cd shearfrac-data

# Create the data directory
mkdir -p data

# Create a README
cat > README.md << 'EOF'
# ShearFrac Data Repository

This repository stores JSON data files for the ShearFrac Well Rig Visualizer application.

## Structure

- `/data/contacts.json` - Contact management data
- Additional data files will be added as needed

## Access

This repository is used by the Well Rig Visualizer application to store and retrieve data with full audit trail for regulatory compliance.

## Security

- All changes are tracked via Git commits
- Access is controlled via GitHub permissions
- Data is automatically backed up through Git history

## For Developers

The application automatically reads and writes to this repository using the GitHub API.
No manual editing of these files is required.
EOF

# Create initial empty contacts structure (will be replaced on first save)
cat > data/contacts.json << 'EOF'
{
  "version": "1.0.0",
  "lastModified": "2024-01-01T00:00:00.000Z",
  "contacts": [],
  "customTypes": ["Coldbore"],
  "columnSettings": {}
}
EOF

# Commit and push
git add .
git commit -m "Initial repository structure for ShearFrac data storage"
git push origin main

echo "✅ Repository setup complete!"
echo "The data/contacts.json file has been created and is ready to use."

# Cleanup
cd ~
rm -rf $TEMP_DIR