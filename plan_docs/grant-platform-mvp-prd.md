# Grant Platform MVP - Product Requirements Document

## 1. Executive Summary

This PRD outlines the development of a Grant Platform MVP to be integrated into the existing GAP (Grant Accountability Platform) product. The MVP focuses on core program management and AI-powered application evaluation features.

## 2. MVP Scope

### 2.1 Core Features
1. **Program Management & Configuration**
   - Admin navigation to programs via `/community/<community-name>/admin`
   - Program listing and configuration interface
   - AI evaluation prompt configuration

2. **Application System**
   - Public application submission
   - AI-powered application evaluation
   - Application status management

3. **Admin Dashboard**
   - Application review and status management
   - Application download functionality

### 2.2 Out of Scope for MVP
- Advanced milestone management
- Complex notification systems
- Analytics and reporting
- GAP integration

## 3. Detailed Requirements

### 3.1 Program Management Interface

#### 3.1.1 Admin Navigation
**Location:** `/community/<community-name>/admin`

**Requirements:**
- New "Grant Programs" management block
- Lists all grant programs attached to the community
- Programs filtered by `metadata.communityRef` field in `program_registry` collection
- Design matches provided mockup (attached image 1)

#### 3.1.2 Program Listing
**Requirements:**
- Display program cards with:
  - Program name
  - Status (Active/Inactive)
  - Application count
  - Quick actions (View, Configure)
- Clickable program cards for detailed view

#### 3.1.3 Program Configuration
**Requirements:**
- Program details view (matches attached image 2)
- Configuration interface for AI evaluation (matches attached image 3)
- Form fields:
  - System prompt for evaluation (textarea)
  - Detailed evaluation prompt (textarea)
  - Save/Cancel actions

### 3.2 Application System

#### 3.2.1 Public Application Form
**Requirements:**
- Simple application form with basic fields:
  - Project name
  - Project description
  - Team information
  - Requested amount
  - Project goals
- Auto-save functionality
- Submission confirmation

#### 3.2.2 AI Evaluation
**Requirements:**
- Automatic evaluation on submission using OpenAI API
- Evaluation based on configured system prompt
- Numerical score (0-10 scale)
- Reasoning text output
- Results stored for admin review

### 3.3 Application Management

#### 3.3.1 Application Dashboard
**Requirements:**
- List all applications for a program
- Filter by status: Pending, In-Progress, Approved, Rejected
- Display:
  - Applicant name
  - Project title
  - AI score
  - Current status
  - Submission date

#### 3.3.2 Status Management
**Requirements:**
- Admin can change application status
- Status options:
  - Pending (default)
  - In-Progress
  - Approved
  - Rejected
- Status change audit trail

#### 3.3.3 Data Export
**Requirements:**
- Download all applications as CSV/Excel
- Include all application data and AI evaluation results
- Downloadable from program admin interface

## 4. Technical Architecture

### 4.1 Backend Components
- **Grant Applications Controller**: Handle CRUD operations for applications
- **Grant Programs Controller**: Manage program configuration and listing
- **AI Evaluation Service**: Interface with OpenAI API for application scoring
- **Admin Authorization**: Extend existing admin middleware for program access

### 4.2 Database Schema

#### 4.2.1 New Collections

**grant_applications**
```javascript
{
  _id: ObjectId,
  programId: String, // Reference to program_registry
  chainID: Number,
  applicantEmail: String,
  applicationData: {
    projectName: String,
    description: String,
    teamInfo: String,
    requestedAmount: String,
    goals: String
  },
  aiEvaluation: {
    score: Number, // 0-10
    reasoning: String,
    evaluatedAt: Date,
    model: String
  },
  status: Enum['pending', 'in-progress', 'approved', 'rejected'],
  statusHistory: [{
    status: String,
    changedBy: String,
    changedAt: Date,
    reason: String
  }],
  createdAt: Date,
  updatedAt: Date
}
```

#### 4.2.2 Schema Updates

**program_registry** (existing - add fields)
```javascript
{
  // ... existing fields
  grantPlatform: {
    isEnabled: Boolean,
    systemPrompt: String,
    detailedPrompt: String,
    applicationFormConfig: Object,
    enabledAt: Date
  }
}
```

### 4.3 API Endpoints

#### 4.3.1 Program Management
- `GET /api/communities/:communityId/grant-programs` - List programs for community
- `GET /api/grant-programs/:programId` - Get program details
- `PUT /api/grant-programs/:programId/configuration` - Update program configuration
- `GET /api/grant-programs/:programId/applications` - List applications for program

#### 4.3.2 Applications
- `POST /api/grant-programs/:programId/applications` - Submit application
- `GET /api/applications/:applicationId` - Get application details
- `PUT /api/applications/:applicationId/status` - Update application status
- `GET /api/grant-programs/:programId/applications/export` - Export applications

#### 4.3.3 AI Integration
- `POST /api/internal/ai/evaluate-application` - Internal endpoint for AI evaluation

### 4.4 Frontend Components

#### 4.4.1 Admin Interface
- `GrantProgramsBlock` - Admin dashboard block for grant programs
- `ProgramsList` - List of programs for a community
- `ProgramDetails` - Program configuration and details view
- `ApplicationsList` - List applications for a program
- `ApplicationDetails` - Single application view with status management

#### 4.4.2 Public Interface
- `ApplicationForm` - Public application submission form
- `ApplicationStatus` - Public status tracking (future)

## 5. Implementation Plan

### Phase 1: Backend Foundation (Week 1-2)
1. Create database schemas
2. Implement Grant Applications Controller
3. Implement Grant Programs Controller
4. Set up AI evaluation service
5. Create API endpoints

### Phase 2: Admin Interface (Week 3-4)
1. Create admin navigation integration
2. Build program listing and configuration UI
3. Implement application management interface
4. Add export functionality

### Phase 3: Public Application (Week 5-6)
1. Build public application form
2. Integrate AI evaluation
3. Implement status management
4. Testing and bug fixes

### Phase 4: Integration & Polish (Week 7-8)
1. Integration with existing admin system
2. UI/UX improvements
3. Performance optimization
4. Documentation and deployment

## 6. Success Metrics

### 6.1 MVP Success Criteria
- Admins can successfully configure grant programs
- Applications can be submitted and automatically evaluated
- Admin can manage application statuses and export data
- System processes 100+ applications without performance issues

### 6.2 Technical Requirements
- API response time < 2 seconds
- AI evaluation time < 10 seconds
- 99% uptime during testing period
- Mobile-responsive admin interface

## 7. Risk Mitigation

### 7.1 Technical Risks
- **OpenAI API reliability**: Implement retry logic and error handling
- **Performance at scale**: Implement pagination and caching
- **Data consistency**: Use transactions for critical operations

### 7.2 User Experience Risks
- **Complex admin interface**: Iterative design with user feedback
- **AI evaluation accuracy**: Configurable prompts and human override
- **Data export issues**: Comprehensive testing with large datasets

---

*This MVP PRD focuses on core functionality to validate the grant platform concept before expanding to full feature set.* 
