#!/bin/bash

# Script to update imports from old utilities to new locations

echo "Updating imports from utilities to new locations..."

# Format utilities
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i 's|@/utilities/formatCurrency|@/lib/format|g' {} +
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i 's|@/utilities/formatDate|@/lib/format|g' {} +
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i 's|@/utilities/formatNumber|@/lib/format|g' {} +
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i 's|@/utilities/shortAddress|@/lib/format|g' {} +

# Markdown and meta
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i 's|@/utilities/markdown|@/lib/markdown|g' {} +
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i 's|@/utilities/meta|@/lib/meta|g' {} +

# Utils
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i 's|@/utilities/generateRandomString|@/lib/utils/generateRandomString|g' {} +
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i 's|@/utilities/reduceText|@/lib/utils/reduceText|g' {} +
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i 's|@/utilities/commons|@/lib/utils/commons|g' {} +
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i 's|@/utilities/fetchFromServer|@/lib/utils/fetch-from-server|g' {} +
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i 's|@/utilities/fillDateRangeWithValues|@/lib/utils/fill-date-range|g' {} +
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i 's|@/utilities/checkExpirationStatus|@/lib/utils/date|g' {} +
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i 's|@/utilities/checkNetworkIsValid|@/lib/web3/network-validation|g' {} +

# Components
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i 's|@/utilities/ReadMore|@/components/ui/read-more|g' {} +

# Config
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i 's|@/utilities/socials|@/config/socials|g' {} +

# Regex
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i 's|@/utilities/regexs/addressRegex|@/lib/utils/regex|g' {} +
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i 's|@/utilities/regexs/urlRegex|@/lib/utils/regex|g' {} +
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i 's|@/utilities/regexs|@/lib/utils/regex|g' {} +

# Sentry
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i 's|@/utilities/sentry/ignoreErrors|@/lib/monitoring/ignoreErrors|g' {} +

# Services
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i 's|@/utilities/gapIndexerClient|@/services/gap-indexer/client|g' {} +
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i 's|@/utilities/indexer"|@/services/indexer"|g' {} +
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i 's|@/utilities/indexer/|@/services/indexer/|g' {} +

# Styles
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i 's|@/utilities/tailwind|@/lib/styles/tailwind|g' {} +

echo "Import updates completed!"