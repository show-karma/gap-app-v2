#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');

// List of files with img tag issues that need to be fixed
const imgTagFiles = [
  './app/community/[communityId]/layout.tsx',
  './components/Dialogs/ProgressDialog/NoGrant.tsx',
  './components/Forms/MilestoneUpdate.tsx',
  './components/Pages/Admin/CommunityStats.tsx',
  './components/Pages/Grants/MilestonesAndUpdates/index.tsx',
  './components/Pages/Home/WhatIsSolving.tsx',
  './components/Pages/ProgramRegistry/ProgramHeader.tsx',
  './components/Pages/Project/Roadmap/index.tsx',
  './components/Pages/Project/Updates/Updates.tsx',
  './components/Utilities/ProfilePicture.tsx',
];

// List of files with hook dependency issues (with specific dependencies)
const hookDependencyFiles = {
  './components/Dialogs/ProgressDialog/Dropdown.tsx': {
    line: 60,
    deps: ['list', 'shouldSort']
  },
  './components/Dialogs/ProjectDialog/EditProjectDialog.tsx': {
    line: 674,
    deps: ['projectToUpdate']
  },
  './components/Dialogs/ProjectDialog/index.tsx': {
    lines: [
      { line: 303, deps: ['checkTeamError'] },
      { line: 740, deps: ['projectToUpdate'] }
    ]
  },
  './components/Disbursement/DisbursementForm.tsx': {
    lines: [
      { line: 151, deps: ['processFile'] },
      { line: 267, deps: ['walletChainId'] },
      { line: 328, deps: ['markStepComplete'] }
    ]
  },
  './components/EthereumAddressToENSAvatar.tsx': {
    line: 25,
    deps: ['ensAvatars', 'populateEns']
  },
  './components/EthereumAddressToENSName.tsx': {
    line: 26,
    deps: ['populateEns']
  },
  './components/Forms/ProjectUpdate.tsx': {
    lines: [
      { line: 357, deps: ['address', 'indicatorsData', 'project'] },
      { line: 439, deps: ['indicatorsData', 'updateToEdit', 'watch'] }
    ]
  },
  './components/Pages/Admin/CommunityStats.tsx': {
    line: 120,
    deps: ['fetchCommunities']
  },
  './components/Pages/Admin/EditCategoriesPage.tsx': {
    lines: [
      { line: 61, deps: ['router'] },
      { line: 112, deps: ['community', 'communityId'] }
    ]
  },
  './components/Pages/Admin/ImpactPage.tsx': {
    line: 62,
    deps: ['router']
  },
  './components/Pages/Admin/ManageIndicatorsPage.tsx': {
    lines: [
      { line: 96, deps: ['router'] },
      { line: 128, deps: ['community', 'communityId'] },
      { line: 199, deps: ['getCategories'] }
    ]
  },
  './components/Pages/Admin/OutputMetrics.tsx': {
    line: 72,
    deps: ['fetchMetricData']
  },
  './components/Pages/Admin/ReportMilestonePage.tsx': {
    line: 184,
    deps: ['communityId']
  },
  './components/Pages/Admin/index.tsx': {
    line: 74,
    deps: ['fetchCommunities']
  },
  './components/Pages/Communities/CommunityAdminPage.tsx': {
    line: 101,
    deps: ['community', 'communityId']
  },
  './components/Pages/Communities/TracksAdminPage.tsx': {
    line: 118,
    deps: ['community', 'communityId']
  },
  './components/Pages/GrantMilestonesAndUpdates/screens/MilestonesAndUpdates/MilestonesList.tsx': {
    lines: [
      { line: 103, deps: ['getOrderedMerge'] },
      { line: 225, deps: ['rearrangeArrayByType'] }
    ]
  },
  './components/Pages/GrantMilestonesAndUpdates/screens/MilestonesAndUpdates/VerificationsDialog.tsx': {
    lines: [
      { line: 43, deps: ['populateEns'] },
      { line: 81, deps: ['populateEns'] }
    ]
  },
  './components/Pages/GrantMilestonesAndUpdates/screens/MilestonesAndUpdates/VerifiedBadge.tsx': {
    line: 38,
    deps: ['populateEns']
  },
  './components/Pages/Project/Grants/Layout.tsx': {
    line: 206,
    deps: ['checkIfAdmin']
  },
  './components/Pages/Project/Impact/FilteredOutputsAndOutcomes.tsx': {
    line: 131,
    deps: ['forms']
  },
  './components/Pages/Project/Impact/OutputsAndOutcomes.tsx': {
    line: 183,
    deps: ['forms']
  },
  './components/Pages/Project/Impact/index.tsx': {
    line: 64,
    deps: ['project']
  },
  './components/Pages/Project/ProjectNavigator.tsx': {
    line: 71,
    deps: ['projectId', 'publicTabs']
  },
  './components/Pages/Project/ProjectPage/index.tsx': {
    lines: [
      { line: 93, deps: ['populateEns'] },
      { line: 297, deps: ['checkCodeValidation', 'openModal'] }
    ]
  },
  './components/Pages/Project/Roadmap/index.tsx': {
    lines: [
      { line: 73, deps: ['getActiveFilters'] },
      { line: 218, deps: ['getSortTimestamp'] }
    ]
  },
  './components/Pages/Project/Team/MemberCard.tsx': {
    line: 69,
    deps: ['populateEns']
  },
  './components/Pages/Stats/LineChart.tsx': {
    line: 81,
    deps: ['groupBy']
  },
  './components/ProjectFeed.tsx': {
    line: 66,
    deps: ['feed']
  },
  './components/Shared/MilestoneVerification/MilestoneVerificationSection.tsx': {
    line: 58,
    deps: ['getVerifiedMilestones']
  },
  './components/Utilities/Header.tsx': {
    lines: [
      { line: 121, deps: ['chain', 'setIsOwner', 'setIsOwnerLoading'] },
      { line: 125, deps: ['getCommunities'] },
      { line: 163, deps: ['authenticate'] }
    ]
  },
  './components/VotingPowerPopover.tsx': {
    line: 72,
    deps: ['community.details?.data?.slug', 'reviewer']
  }
};

// Helper function to add eslint-disable comment
function addEslintDisable(content, lineNumber, rule) {
  const lines = content.split('\n');
  if (lineNumber > 0 && lineNumber <= lines.length) {
    // Add eslint-disable comment on the previous line
    lines[lineNumber - 1] = `    // eslint-disable-next-line ${rule}\n${lines[lineNumber - 1]}`;
  }
  return lines.join('\n');
}

// Function to process files and add eslint-disable comments
async function processFiles() {
  console.log('Starting to process lint issues...\n');

  // Process img tag files
  console.log('Processing img tag issues...');
  for (const file of imgTagFiles) {
    try {
      console.log(`  Checking ${file}...`);
      const filePath = path.join(process.cwd(), file);
      const content = await fs.readFile(filePath, 'utf8');
      
      // Check if file contains <img tags
      if (content.includes('<img')) {
        console.log(`    Found <img> tags in ${file}, you may want to replace with Next.js Image component`);
      }
    } catch (error) {
      console.error(`    Error processing ${file}:`, error.message);
    }
  }

  console.log('\nProcessing hook dependency issues...');
  // Process hook dependency files
  for (const [file, config] of Object.entries(hookDependencyFiles)) {
    try {
      console.log(`  Processing ${file}...`);
      const filePath = path.join(process.cwd(), file);
      let content = await fs.readFile(filePath, 'utf8');
      
      if (config.lines) {
        // Multiple lines to fix
        for (const { line, deps } of config.lines) {
          console.log(`    Line ${line}: Missing deps [${deps.join(', ')}]`);
        }
      } else {
        // Single line to fix
        console.log(`    Line ${config.line}: Missing deps [${config.deps.join(', ')}]`);
      }
    } catch (error) {
      console.error(`    Error processing ${file}:`, error.message);
    }
  }

  console.log('\nLint issue analysis complete!');
  console.log('\nTo fix these issues, you have two options:');
  console.log('1. Add the missing dependencies to the hooks');
  console.log('2. Add eslint-disable comments if the dependencies are intentionally omitted');
  console.log('3. Replace <img> tags with Next.js Image component where appropriate');
}

processFiles();