#!/bin/bash

echo "🔧 Standardizing cn function imports to use @/lib/utils..."

# Fix imports that use the consolidated location
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec grep -l "@/utils/consolidated/generalUtils" {} \; | while read file; do
  # Check if the file only imports cn
  if grep -q "import { cn } from ['\"]@/utils/consolidated/generalUtils['\"]" "$file"; then
    echo "Fixing cn-only import in: $file"
    sed -i "s|import { cn } from ['\"]@/utils/consolidated/generalUtils['\"]|import { cn } from '@/lib/utils'|g" "$file"
  elif grep -q "import { cn," "$file" && grep -q "@/utils/consolidated/generalUtils" "$file"; then
    echo "File imports cn plus other utilities: $file (needs manual review)"
  fi
done

# Also check for any imports from the index file
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec grep -l "from ['\"]@/utils/consolidated['\"]" {} \; | while read file; do
  if grep -q "import { cn } from ['\"]@/utils/consolidated['\"]" "$file"; then
    echo "Fixing cn import from consolidated index in: $file"
    sed -i "s|import { cn } from ['\"]@/utils/consolidated['\"]|import { cn } from '@/lib/utils'|g" "$file"
  fi
done

echo "✅ Standardized cn imports to use @/lib/utils"
echo ""
echo "Files that may need manual review (import cn plus other utilities):"
grep -r "import.*cn.*from.*@/utils/consolidated" src --include="*.ts" --include="*.tsx" | grep -v "cn }" | cut -d: -f1 | sort -u