# V2 Program Registry Integration - Frontend

## Summary

Successfully integrated V2 Program Registry endpoints in the frontend (`gap-app-v2`).

## Changes Made

### 1. Updated INDEXER Endpoints

**File**: `utilities/indexer.ts`

Added V2 endpoints:
```typescript
REGISTRY: {
  // ... existing V1 endpoints
  V2: {
    CREATE: "/v2/program-registry",
    UPDATE: (programId: string, chainId: number) => `/v2/program-registry/${programId}/${chainId}`,
    APPROVE: "/v2/program-registry/approve",
    GET_BY_ID: (programId: string, chainId: number) => `/v2/program-registry/${programId}/${chainId}`,
  },
}
```

### 2. Updated ProgramRegistryService

**File**: `services/programRegistry.service.ts`

#### Changes:

1. **`extractProgramId()`** - Updated to handle V2 response format:
   - V2 format: `{ programId: "..." }` ✅ (checked first)
   - V1 format: `{ _id: { $oid: "..." } }` (backward compatible)

2. **`extractMongoId()`** - New method for approve endpoint:
   - Extracts MongoDB `_id` (needed for approve endpoint)
   - Handles both V1 and V2 formats

3. **`createProgram()`** - Updated to use V2 endpoint:
   - **Endpoint**: `POST /v2/program-registry`
   - **Request**: `{ chainId, metadata }` (owner comes from JWT)
   - **Response**: `{ programId, isValid, ... }`
   - **Auto-approval**: Checks `isValid` field (true = auto-approved)

4. **`updateProgram()`** - New method using V2 endpoint:
   - **Endpoint**: `PUT /v2/program-registry/:programId/:chainId`
   - **Request**: `{ metadata }`
   - **Uses**: `programId` (domain identifier), not MongoDB `_id`

5. **`approveProgram()`** - Updated to use V2 endpoint:
   - **Endpoint**: `POST /v2/program-registry/approve`
   - **Request**: `{ id: mongoId, isValid: "accepted" }`
   - **Uses**: MongoDB `_id` (not `programId`)

### 3. Updated Components

#### CreateProgramModal.tsx

**Changes**:
- Removed auto-approve logic (V2 handles this automatically)
- Checks `requiresManualApproval` flag from response
- Shows appropriate success message based on approval status

**Before**:
```typescript
// Auto-approve the program
await ProgramRegistryService.approveProgram(result.programId);
```

**After**:
```typescript
// V2 auto-approves if user is community admin
if (result.requiresManualApproval) {
  toast.success("Program created successfully. Please approve it manually...");
} else {
  toast.success("Program created and approved successfully!");
}
```

#### ProgramDetailsTab.tsx

**Changes**:
- Uses `programId` directly (from route params or program data)
- Calls `ProgramRegistryService.updateProgram()` instead of direct fetch
- No longer extracts MongoDB `_id`

**Before**:
```typescript
const programDbId = ProgramRegistryService.extractProgramId(program!);
await fetchData(INDEXER.REGISTRY.UPDATE(programDbId, chainId), ...);
```

**After**:
```typescript
const programIdToUpdate = programId || ProgramRegistryService.extractProgramId(program!);
await ProgramRegistryService.updateProgram(programIdToUpdate, chainId, metadata);
```

#### AddProgram.tsx

**Changes**:
- Create: Uses V2 endpoint (removed `owner` from request body)
- Update: Uses `programId` instead of MongoDB `_id`
- Calls `ProgramRegistryService.updateProgram()`

**Before**:
```typescript
await fetchData(INDEXER.REGISTRY.CREATE, "POST", {
  owner: address,
  chainId: chainSelected,
  metadata,
});
```

**After**:
```typescript
await fetchData(INDEXER.REGISTRY.V2.CREATE, "POST", {
  chainId: chainSelected,
  metadata,
});
// owner comes from JWT session
```

#### ManagePrograms.tsx

**Changes**:
- Approve: Uses V2 endpoint
- Still uses MongoDB `_id` for approve (correct)

**Before**:
```typescript
await fetchData(INDEXER.REGISTRY.APPROVE, "POST", { id, isValid: value });
```

**After**:
```typescript
await fetchData(INDEXER.REGISTRY.V2.APPROVE, "POST", { id, isValid: value });
```

## Key Differences: V1 vs V2

### Create Endpoint

| Aspect | V1 | V2 |
|--------|----|----|
| **Endpoint** | `POST /registry/offchain/create` | `POST /v2/program-registry` |
| **Request Body** | `{ owner, chainId, metadata }` | `{ chainId, metadata }` |
| **Owner** | In request body | From JWT session |
| **Response** | `{ _id: { $oid: "..." } }` | `{ programId: "...", isValid: true\|null }` |
| **Auto-approval** | Manual (separate approve call) | Automatic (if community admin) |

### Update Endpoint

| Aspect | V1 | V2 |
|--------|----|----|
| **Endpoint** | `PUT /registry/:id/:chainId/updateMetadata` | `PUT /v2/program-registry/:programId/:chainId` |
| **ID Type** | MongoDB `_id` | Domain `programId` |
| **Request Body** | `{ metadata }` | `{ metadata }` |
| **Authorization** | Not validated | Validated (staff/community admin) |

### Approve Endpoint

| Aspect | V1 | V2 |
|--------|----|----|
| **Endpoint** | `POST /registry/approve` | `POST /v2/program-registry/approve` |
| **ID Type** | MongoDB `_id` | MongoDB `_id` (same) |
| **Request Body** | `{ id, isValid }` | `{ id, isValid }` (same) |

## Authorization Flow

### Create
1. User creates program → JWT session provides `publicAddress`
2. Backend checks if user is staff or community admin
3. If yes → `isValid: true` (auto-approved)
4. If no → `isValid: null` (pending approval)

### Update
1. User updates program → JWT session provides `publicAddress`
2. Backend validates:
   - Is user staff? → Allow
   - Is user community admin for program's community? → Allow
   - Otherwise → Throw `ProgramRegistryAccessDeniedException`

### Approve
1. User approves program → Uses MongoDB `_id`
2. Backend sets `isValid: true/false`
3. Sets `approvedAt` timestamp

## Backward Compatibility

- ✅ V1 endpoints still exist and functional
- ✅ `extractProgramId()` handles both V1 and V2 formats
- ✅ Can migrate gradually (component by component)

## Testing Checklist

- [ ] Test create program (should get programId immediately)
- [ ] Test create as community admin (should auto-approve)
- [ ] Test create as regular user (should be pending)
- [ ] Test update program (should use programId)
- [ ] Test update authorization (should check staff/community admin)
- [ ] Test approve program (should use MongoDB _id)
- [ ] Test error handling (duplicate title, validation errors)

## Migration Notes

### Breaking Changes
- **Create**: No longer sends `owner` in request body
- **Update**: Uses `programId` instead of MongoDB `_id`
- **Response**: Different structure (has `programId` field)

### Non-Breaking
- **Approve**: Still uses MongoDB `_id` (no change needed)

## Files Modified

1. ✅ `utilities/indexer.ts` - Added V2 endpoints
2. ✅ `services/programRegistry.service.ts` - Updated methods
3. ✅ `components/FundingPlatform/CreateProgramModal.tsx` - Updated create flow
4. ✅ `components/FundingPlatform/QuestionBuilder/ProgramDetailsTab.tsx` - Updated update flow
5. ✅ `components/Pages/ProgramRegistry/AddProgram.tsx` - Updated create/update
6. ✅ `components/Pages/ProgramRegistry/ManagePrograms.tsx` - Updated approve

---

**Status**: ✅ Frontend Integration Complete - Ready for Testing

