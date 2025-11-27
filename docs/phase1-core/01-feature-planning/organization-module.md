# Phase 1 - Organization Module Feature Planning

> Module: Organization Management
> Priority: P0
> APIs: 7
> Status: Planning

---

## 1. Module Overview

The Organization module provides hierarchical team structure management, allowing teams to create departments, sub-departments, and manage member assignments.

### Existing Resources

| Resource | Path | Status |
|----------|------|--------|
| Org Schema | `packages/service/support/permission/org/orgSchema.ts` | Exists |
| Org Member Schema | `packages/service/support/permission/org/orgMemberSchema.ts` | Exists |
| Controllers | `packages/service/support/permission/org/controllers.ts` | Exists |
| Types | `packages/global/support/user/team/org/type.d.ts` | Exists |

---

## 2. API Specifications

### 2.1 Get Organization List

**Endpoint**: `POST /api/support/user/team/org/list`

**Request**:
```typescript
type GetOrgListRequest = {
  searchKey?: string;     // Search by org name
  parentId?: string;      // Filter by parent org
}
```

**Response**:
```typescript
type GetOrgListResponse = OrgItem[];

type OrgItem = {
  _id: string;
  name: string;
  parentId?: string;
  path: string;           // e.g., "/root/dept1/dept2"
  memberCount: number;
  children?: OrgItem[];   // Nested structure
}
```

---

### 2.2 Create Organization

**Endpoint**: `POST /api/support/user/team/org/create`

**Request**:
```typescript
type CreateOrgRequest = {
  parentId?: string;      // Parent org ID, null for root
  orgName: string;        // Organization name
}
```

**Response**:
```typescript
type CreateOrgResponse = {
  _id: string;
}
```

---

### 2.3 Update Organization

**Endpoint**: `PUT /api/support/user/team/org/update`

**Request**:
```typescript
type UpdateOrgRequest = {
  orgId: string;
  orgName?: string;
}
```

**Response**: `{ success: true }`

---

### 2.4 Delete Organization

**Endpoint**: `DELETE /api/support/user/team/org/delete`

**Request**:
```typescript
type DeleteOrgRequest = {
  orgId: string;
}
```

**Response**: `{ success: true }`

**Business Rules**:
- Cannot delete org with children (must delete children first)
- Cannot delete org with members (must remove members first)
- Or cascade delete all children and move members to parent

---

### 2.5 Move Organization

**Endpoint**: `PUT /api/support/user/team/org/move`

**Request**:
```typescript
type MoveOrgRequest = {
  orgId: string;
  parentId: string;       // New parent ID
}
```

**Response**: `{ success: true }`

**Business Rules**:
- Cannot move to self or descendants
- Update all descendant paths

---

### 2.6 Update Organization Members

**Endpoint**: `PUT /api/support/user/team/org/updateMembers`

**Request**:
```typescript
type UpdateOrgMembersRequest = {
  orgId: string;
  tmbIds: string[];       // Member IDs to add
}
```

**Response**: `{ success: true }`

---

### 2.7 Delete Organization Member

**Endpoint**: `DELETE /api/support/user/team/org/deleteMember`

**Request**:
```typescript
type DeleteOrgMemberRequest = {
  orgId: string;
  tmbId: string;
}
```

**Response**: `{ success: true }`

---

## 3. Data Model

### Organization Schema
```typescript
type OrgSchema = {
  _id: ObjectId;
  teamId: ObjectId;           // Team reference
  name: string;               // Org name
  parentId?: ObjectId;        // Parent org ID
  path: string;               // Materialized path
  pathIds: ObjectId[];        // Path as array of IDs
  order: number;              // Sort order
  createTime: Date;
  updateTime: Date;
}

// Indexes
{ teamId: 1, parentId: 1 }
{ teamId: 1, path: 1 }
```

### Organization Member Schema
```typescript
type OrgMemberSchema = {
  _id: ObjectId;
  teamId: ObjectId;
  orgId: ObjectId;
  tmbId: ObjectId;            // Team member ID
  createTime: Date;
}

// Indexes
{ teamId: 1, orgId: 1 }
{ teamId: 1, tmbId: 1 }
```

---

## 4. Frontend Integration

### Component Location
```
projects/app/src/pageComponents/account/team/OrgManage/
├── index.tsx                    # Main component
├── OrgTree.tsx                  # Tree view
├── OrgForm.tsx                  # Create/Edit form
└── MemberSelect.tsx             # Member selector
```

### API Client
```typescript
// projects/app/src/web/support/user/team/org/api.ts
// Need to update paths from /proApi to /api

export const getOrgList = (data) =>
  POST('/api/support/user/team/org/list', data);

export const postCreateOrg = (data) =>
  POST('/api/support/user/team/org/create', data);

export const putUpdateOrg = (data) =>
  PUT('/api/support/user/team/org/update', data);

export const deleteOrg = (data) =>
  DELETE('/api/support/user/team/org/delete', data);

export const putMoveOrg = (data) =>
  PUT('/api/support/user/team/org/move', data);

export const putUpdateOrgMembers = (data) =>
  PUT('/api/support/user/team/org/updateMembers', data);

export const deleteOrgMember = (data) =>
  DELETE('/api/support/user/team/org/deleteMember', data);
```

---

## 5. Implementation Tasks

- [ ] Review existing schema and controllers
- [ ] Create 7 API route files
- [ ] Implement tree building logic
- [ ] Add path update cascade logic
- [ ] Add permission checks
- [ ] Update frontend API paths
- [ ] Write unit tests

---

## 6. Notes

1. Use materialized path pattern for efficient tree queries
2. Consider caching org tree for performance
3. Org operations should trigger audit logs
4. Member can belong to multiple orgs
