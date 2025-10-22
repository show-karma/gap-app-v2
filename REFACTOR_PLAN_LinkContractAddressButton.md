# PLAN: Further Complexity Reduction for LinkContractAddressButton

## Current Issues
The component has **~430 lines** with multiple responsibilities:
- State management (8+ useState hooks)
- Validation orchestration
- Contract save logic
- Pair management (add/remove/edit)
- Dialog UI management
- Error handling

## Proposed Refactoring Strategy

### **Phase 1: Extract Custom Hooks** ✅ COMPLETED (High Impact)

**1.1 Create `useContractAddressPairs` hook** ✅
- Move pair state and handlers (`networkAddressPairs`, `handleAddPair`, `handleRemovePair`, `handleAddressChange`, `handleNetworkChange`)
- Handle initialization from project data
- Return: `{ pairs, addPair, removePair, updateAddress, updateNetwork, setPairs }`
- **Impact**: Remove ~100 lines from component

**1.2 Enhance `useContractAddressValidation` hook** ✅
- Merged validation orchestration logic into existing hook
- Move validation state (`invalidContracts`, `clearContractValidationError`)
- Move `validateAllContracts` logic
- Return: `{ validateContract, isValidating, error, invalidContracts, validateAll, clearError, setInvalidContracts }`
- **Impact**: Remove ~80 lines from component, consolidate validation logic

**1.3 Create `useContractAddressSave` hook** ✅
- Move `saveContracts` and `handleSave` logic
- Combine with validation hook
- Return: `{ save, isLoading, error, setError, invalidContracts }`
- **Impact**: Remove ~90 lines from component

**Result**: Component reduced from ~416 lines to ~248 lines (~40% reduction)

### **Phase 2: Extract UI Components** ✅ COMPLETED (Medium Impact)

**2.1 Create `ContractAddressDialog` component** ✅
- Extracted entire Dialog UI wrapper with Headless UI transitions
- Props: `{ isOpen, onClose, children, title, description }`
- **Impact**: 68-line reusable dialog component

**2.2 Create `ContractAddressList` component** ✅
- Extracted the list rendering and "Add Another" button
- Props: `{ pairs, invalidContracts, onNetworkChange, onAddressChange, onRemove, onAdd, supportedNetworks, error }`
- **Impact**: 55-line focused list component

**Result**: Component reduced from ~248 lines to ~196 lines (additional ~21% reduction)

### **Phase 3: Configuration & Constants** (Low Impact)

**3.1 Move `SUPPORTED_NETWORKS` to constants file**
- Create `constants/contract-networks.ts`
- Rename to SUPPORTED_CONTRACT_NETWORKS
- Export as `SUPPORTED_NETWORKS` and optionally add network metadata
- **Impact**: Remove ~45 lines, improve maintainability

**3.2 Create types file for all interfaces**
- Move `LinkContractAddressesButtonProps` to separate types file
- Co-locate with `NetworkAddressPair` and `InvalidInfo`
- **Impact**: Better organization

## Proposed File Structure After Refactoring

```
components/Pages/Project/
  ├── LinkContractAddressButton.tsx          (~80 lines - orchestration only)
  ├── ContractAddressDialog.tsx              (new - dialog UI)
  ├── ContractAddressList.tsx                (new - list rendering)
  ├── ContractAddressItem.tsx                (existing)
  └── types.ts                               (all interfaces)

hooks/
  ├── useContractAddressValidation.ts        (enhanced - includes validation orchestration)
  ├── useContractAddressPairs.ts             (new - pair management)
  └── useContractAddressSave.ts              (new - save logic)

constants/
  └── contract-networks.ts                            (new - supported networks)

utilities/
  └── contractKey.ts                         (existing)
```

## Current Outcome (After Phase 1 & 2)
- **LinkContractAddressButton**: ~416 lines → ~196 lines (53% reduction)
- **Improved testability**: Each hook can be tested independently
- **Better separation of concerns**: UI, state, and business logic separated
- **Increased reusability**: Dialog and list components reusable across the app
- **Easier maintenance**: Smaller, focused modules

## Final Expected Outcome (After Phase 3)
- **LinkContractAddressButton**: ~196 lines → ~150 lines (64% total reduction from original)
- All constants and types externalized for better organization

## Recommended Execution Order
1. Start with **Phase 1.1** (useContractPairs) - lowest risk, immediate benefit
2. Then **Phase 1.2** (useContractValidation) - builds on existing validation
3. Then **Phase 1.3** (useContractSave) - ties validation and save together
4. Then **Phase 3.1** (constants) - quick win
5. Finally **Phase 2** (UI components) - visual restructuring

**Note:** Each phase can be done incrementally with testing between steps.
