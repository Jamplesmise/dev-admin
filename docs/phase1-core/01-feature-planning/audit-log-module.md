# Phase 1 - Audit Log Module Feature Planning

> Module: Audit Log
> Priority: P0
> APIs: 1
> Status: Planning

---

## 1. Module Overview

The Audit Log module provides team operation tracking and auditing capabilities. It records all important operations performed by team members.

### Existing Resources

| Resource | Path | Status |
|----------|------|--------|
| Schema | `packages/service/support/user/audit/schema.ts` | Exists |
| Types | `packages/global/support/user/audit/type.d.ts` | Exists |
| Constants | `packages/global/support/user/audit/constants.ts` | Exists |
| Util | `packages/service/support/user/audit/util.ts` | Exists |

### Permission Flag

- `permissionTeamOperationLog`: Controls access to audit logs

---

## 2. API Specification

### 2.1 Get Audit Logs

**Endpoint**: `POST /api/support/user/audit/list`

**Request**:
```typescript
type GetAuditLogsRequest = {
  pageNum: number;           // Page number, starts from 1
  pageSize: number;          // Page size, max 100
  tmbIds?: string[];         // Filter by member IDs
  events?: AuditEventEnum[]; // Filter by event types
  startTime?: string;        // ISO date string
  endTime?: string;          // ISO date string
}
```

**Response**:
```typescript
type GetAuditLogsResponse = {
  list: AuditLogItem[];
  total: number;
}

type AuditLogItem = {
  _id: string;
  tmbId: string;
  tmbName: string;          // Joined from team member
  tmbAvatar?: string;
  event: AuditEventEnum;
  metadata: Record<string, any>;
  timestamp: string;
}
```

---

## 3. Supported Event Types (66+)

### Team Events
```typescript
LOGIN                        // User login
CREATE_INVITATION_LINK       // Create invite link
JOIN_TEAM                    // Join team
CHANGE_MEMBER_NAME           // Change member name
KICK_OUT_TEAM                // Remove member
RECOVER_TEAM_MEMBER          // Restore member
CREATE_DEPARTMENT            // Create department
CHANGE_DEPARTMENT            // Update department
DELETE_DEPARTMENT            // Delete department
RELOCATE_DEPARTMENT          // Move department
CREATE_GROUP                 // Create group
DELETE_GROUP                 // Delete group
ASSIGN_PERMISSION            // Assign permission
```

### App Events
```typescript
CREATE_APP                   // Create app
UPDATE_APP_INFO              // Update app info
MOVE_APP                     // Move app
DELETE_APP                   // Delete app
UPDATE_APP_COLLABORATOR      // Update collaborator
DELETE_APP_COLLABORATOR      // Delete collaborator
TRANSFER_APP_OWNERSHIP       // Transfer ownership
CREATE_APP_COPY              // Copy app
CREATE_APP_FOLDER            // Create folder
UPDATE_PUBLISH_APP           // Update publish
CREATE_APP_PUBLISH_CHANNEL   // Create channel
UPDATE_APP_PUBLISH_CHANNEL   // Update channel
DELETE_APP_PUBLISH_CHANNEL   // Delete channel
EXPORT_APP_CHAT_LOG          // Export chat log
CREATE_EVALUATION            // Create evaluation
EXPORT_EVALUATION            // Export evaluation
DELETE_EVALUATION            // Delete evaluation
```

### Dataset Events
```typescript
CREATE_DATASET               // Create dataset
UPDATE_DATASET               // Update dataset
DELETE_DATASET               // Delete dataset
MOVE_DATASET                 // Move dataset
UPDATE_DATASET_COLLABORATOR  // Update collaborator
DELETE_DATASET_COLLABORATOR  // Delete collaborator
TRANSFER_DATASET_OWNERSHIP   // Transfer ownership
EXPORT_DATASET               // Export dataset
CREATE_DATASET_FOLDER        // Create folder
```

### Collection/Data Events
```typescript
CREATE_COLLECTION            // Create collection
UPDATE_COLLECTION            // Update collection
DELETE_COLLECTION            // Delete collection
RETRAIN_COLLECTION           // Retrain collection
CREATE_DATA                  // Create data
UPDATE_DATA                  // Update data
DELETE_DATA                  // Delete data
SEARCH_TEST                  // Search test
```

### Account Events
```typescript
CHANGE_PASSWORD              // Change password
CHANGE_NOTIFICATION_SETTINGS // Update notifications
CHANGE_MEMBER_NAME_ACCOUNT   // Change name
PURCHASE_PLAN                // Purchase plan
EXPORT_BILL_RECORDS          // Export bills
CREATE_INVOICE               // Create invoice
SET_INVOICE_HEADER           // Set invoice header
CREATE_API_KEY               // Create API key
UPDATE_API_KEY               // Update API key
DELETE_API_KEY               // Delete API key
```

---

## 4. Frontend Integration

### Component Location
```
projects/app/src/pageComponents/account/team/Audit/
├── index.tsx                    # Main component
└── processors/
    ├── index.ts                 # Event processor index
    ├── commonProcessor.ts       # Common metadata
    ├── appProcessors.ts         # App events
    ├── datasetProcessors.ts     # Dataset events
    └── teamProcessors.ts        # Team events
```

### API Client
```typescript
// projects/app/src/web/support/user/team/operantionLog/api.ts
export const getOperationLogs = (data: GetAuditLogsRequest) =>
  POST<GetAuditLogsResponse>('/proApi/support/user/audit/list', data);

// Need to change to:
export const getOperationLogs = (data: GetAuditLogsRequest) =>
  POST<GetAuditLogsResponse>('/api/support/user/audit/list', data);
```

---

## 5. Implementation Tasks

- [ ] Create API route file
- [ ] Implement pagination query
- [ ] Add member info join
- [ ] Add permission check
- [ ] Update frontend API path
- [ ] Write unit tests

---

## 6. Notes

1. Logs auto-expire after 14 days (TTL index)
2. Sensitive metadata fields should be sanitized
3. Permission check: `permissionTeamOperationLog` must be true
