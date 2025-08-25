#!/bin/bash

echo "🔧 Fixing TypeScript 'any' types..."

# Fix common any types in node components
find src/components/nodes -name "*.tsx" -exec sed -i \
  -e 's/data: any/data: { label?: string; equipmentId?: string; color?: string; wellNumber?: number; jobId?: string; assigned?: boolean; customName?: string; fracComPort?: string; gaugeComPort?: string; fracBaudRate?: string; gaugeBaudRate?: string; [key: string]: any }/g' \
  {} \;

# Fix any[] arrays to proper types
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i \
  -e 's/: any\[\]/: unknown[]/g' \
  -e 's/Array<any>/Array<unknown>/g'

# Fix function parameters
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i \
  -e 's/(error: any)/(error: unknown)/g' \
  -e 's/(e: any)/(e: unknown)/g' \
  -e 's/(err: any)/(err: unknown)/g' \
  -e 's/(data: any)/(data: unknown)/g' \
  -e 's/(value: any)/(value: unknown)/g' \
  -e 's/(item: any)/(item: unknown)/g'

# Fix setState callbacks
find src -name "*.tsx" | xargs sed -i \
  -e 's/setState<any>/setState<unknown>/g' \
  -e 's/useState<any>/useState<unknown>/g'

# Fix Record types
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i \
  -e 's/Record<string, any>/Record<string, unknown>/g'

# Fix promise types  
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i \
  -e 's/Promise<any>/Promise<unknown>/g'

echo "✅ Fixed common 'any' type patterns"
echo "Remaining any types will need manual review"