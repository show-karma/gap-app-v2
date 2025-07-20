# Project API Services

This directory contains all API service functions for the projects feature. Each service is responsible for a specific domain of project-related API calls.

## Service Structure

### project-service.ts
Core project CRUD and data fetching operations:
- `getProject()` - Fetch project by ID/slug
- `getProjectsByOwner()` - Get projects owned by an address
- `getAllProjects()` - Get paginated project list
- `getProjectsByProgram()` - Get projects in a program
- `subscribeToProject()` - Subscribe to project updates
- `updateProjectCategories()` - Update project categories
- `requestProjectIntro()` - Request introduction to project

### attestation-service.ts
Attestation and blockchain notification operations:
- `notifyAttestationCreated()` - Notify indexer of new attestation
- `revokeAttestation()` - Revoke an attestation

### external-links-service.ts
External service integrations:
- `updateExternalLink()` - Generic external link update
- `linkGithubRepo()` - Link GitHub repository
- `linkOSOProfile()` - Link OSO profile
- `linkDivviWallet()` - Link Divvi wallet
- `linkContractAddress()` - Link contract address

### milestone-service.ts
Project milestones/objectives:
- `getProjectMilestones()` - Fetch all milestones
- `getProjectObjectives()` - Fetch objectives (alias for milestones)

### payout-service.ts
Payout address management:
- `updatePayoutAddress()` - Update payout address
- `getPayoutAddress()` - Get current payout address

### feed-service.ts
Activity feed operations:
- `getProjectFeed()` - Get project activity feed

### invitation-service.ts
Team invitation management:
- `createInvitationCode()` - Create new invitation
- `revokeInvitationCode()` - Revoke invitation
- `acceptInvitation()` - Accept invitation
- `getInvitationLinks()` - Get all invitations
- `checkInvitationCode()` - Validate invitation code

### impact-endorsement-service.ts
Impact measurement endorsements:
- `notifyEndorsement()` - Send endorsement notification

## Usage

Import the services you need:

```typescript
import { 
  getProject, 
  subscribeToProject,
  notifyAttestationCreated 
} from '@/features/projects/api';
```

All services return promises and handle errors by throwing exceptions. Wrap calls in try-catch blocks for error handling:

```typescript
try {
  const project = await getProject('project-slug');
} catch (error) {
  // Handle error
}
```

## Migration Notes

When migrating components, replace direct `fetchData()` calls with the appropriate service methods:

```typescript
// Before:
const [data, error] = await fetchData(
  INDEXER.PROJECT.SUBSCRIBE(projectId),
  "POST"
);

// After:
await subscribeToProject(projectId);
```