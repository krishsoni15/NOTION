# Inventory Image Upload APIs - Complete List

This document lists all APIs required for inventory image upload functionality using Cloudflare R2.

## 1. AWS SDK APIs (for Cloudflare R2)

### Package: `@aws-sdk/client-s3`

#### 1.1 S3Client
- **Purpose**: Initialize S3-compatible client for Cloudflare R2
- **Location**: `lib/r2/client.ts`
- **Configuration**:
  - `region`: "auto"
  - `endpoint`: R2_ENDPOINT or `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
  - `credentials`: 
    - `accessKeyId`: R2_ACCESS_KEY_ID
    - `secretAccessKey`: R2_SECRET_ACCESS_KEY

#### 1.2 PutObjectCommand
- **Purpose**: Upload image to R2 bucket
- **Location**: `lib/r2/client.ts` → `uploadImage()` function
- **Parameters**:
  - `Bucket`: R2_BUCKET_NAME
  - `Key`: Generated image key (e.g., `inventory/{itemId}/{timestamp}-{filename}`)
  - `Body`: File buffer
  - `ContentType`: Image MIME type (e.g., "image/jpeg", "image/png")

#### 1.3 DeleteObjectCommand
- **Purpose**: Delete image from R2 bucket
- **Location**: `lib/r2/client.ts` → `deleteImage()` function
- **Parameters**:
  - `Bucket`: R2_BUCKET_NAME
  - `Key`: Image key to delete

---

## 2. Next.js API Routes

### 2.1 POST `/api/upload/image`
- **Purpose**: Upload image to Cloudflare R2
- **Location**: `app/api/upload/image/route.ts`
- **Method**: POST
- **Authentication**: Required (Clerk auth)
- **Request Body**: FormData
  - `file`: Image file (File object)
  - `itemId`: Inventory item ID (string)
- **Validation**:
  - File must be an image (MIME type starts with "image/")
  - Max file size: 10MB
- **Response**:
  ```json
  {
    "success": true,
    "imageUrl": "https://public-url.com/inventory/itemId/timestamp-filename.jpg",
    "imageKey": "inventory/itemId/timestamp-filename.jpg"
  }
  ```
- **Error Responses**:
  - `401`: Unauthorized
  - `400`: No file/itemId provided, invalid file type, or file too large
  - `500`: Upload failed

### 2.2 DELETE `/api/delete/image?key={imageKey}`
- **Purpose**: Delete image from Cloudflare R2
- **Location**: `app/api/delete/image/route.ts`
- **Method**: DELETE
- **Authentication**: Required (Clerk auth)
- **Query Parameters**:
  - `key`: Image key to delete (string)
- **Response**:
  ```json
  {
    "success": true
  }
  ```
- **Error Responses**:
  - `401`: Unauthorized
  - `400`: No image key provided
  - `500`: Delete failed

---

## 3. Convex APIs (Database Operations)

### 3.1 `api.inventory.addImageToInventory`
- **Purpose**: Add image metadata to inventory item in database
- **Location**: `convex/inventory.ts`
- **Type**: Mutation
- **Authentication**: Required (Site Engineer or Purchase Officer only)
- **Parameters**:
  - `itemId`: Inventory item ID (v.id("inventory"))
  - `imageUrl`: Public URL of uploaded image (v.string())
  - `imageKey`: R2 object key for deletion (v.string())
- **Returns**: Item ID
- **Side Effects**: Updates inventory item with new image in images array

### 3.2 `api.inventory.removeImageFromInventory`
- **Purpose**: Remove image from inventory item
- **Location**: `convex/inventory.ts`
- **Type**: Mutation
- **Authentication**: Required (Purchase Officer only)
- **Parameters**:
  - `itemId`: Inventory item ID (v.id("inventory"))
  - `imageKey`: R2 object key to remove (v.string())
- **Returns**: Item ID
- **Side Effects**: Removes image from inventory item's images array

### 3.3 `api.inventory.getInventoryItemById`
- **Purpose**: Get inventory item with images
- **Location**: `convex/inventory.ts`
- **Type**: Query
- **Parameters**:
  - `itemId`: Inventory item ID (v.id("inventory"))
- **Returns**: Inventory item object with images array

---

## 4. Frontend APIs (React Components)

### 4.1 `uploadImages(itemId: string)`
- **Purpose**: Upload multiple images to R2
- **Location**: `components/inventory/inventory-form-dialog.tsx`
- **Function**: Client-side function that calls `/api/upload/image`
- **Returns**: Promise<Array<{ imageUrl: string, imageKey: string }>>
- **Usage**: Called during inventory item creation/update

### 4.2 `handleImageSelect(files: FileList | null)`
- **Purpose**: Handle file selection from input
- **Location**: `components/inventory/inventory-form-dialog.tsx`
- **Function**: Validates and stores selected image files
- **Validation**: Only accepts image files

### 4.3 `handleCameraCapture(event)`
- **Purpose**: Handle camera capture
- **Location**: `components/inventory/inventory-form-dialog.tsx`
- **Function**: Captures image from webcam and adds to selected images

---

## 5. Environment Variables Required

Add these to your `.env.local` file:

```env
# Cloudflare R2 Configuration
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key_id
R2_SECRET_ACCESS_KEY=your_secret_access_key
R2_BUCKET_NAME=your_bucket_name
R2_ENDPOINT=https://your_account_id.r2.cloudflarestorage.com  # Optional
R2_PUBLIC_URL=https://your-public-domain.com  # Public URL for accessing images
```

---

## 6. NPM Packages Required

```json
{
  "@aws-sdk/client-s3": "^3.955.0",
  "@aws-sdk/s3-request-presigner": "^3.955.0"
}
```

---

## 7. API Flow Summary

### Upload Flow:
1. User selects/captures image → `handleImageSelect()` or `handleCameraCapture()`
2. On form submit → `uploadImages(itemId)` called
3. For each image:
   - Create FormData with file and itemId
   - POST to `/api/upload/image`
   - API validates, uploads to R2 using `PutObjectCommand`
   - Returns `imageUrl` and `imageKey`
4. Call `api.inventory.addImageToInventory()` with imageUrl and imageKey
5. Image metadata stored in Convex database

### Delete Flow:
1. User clicks delete on image
2. DELETE request to `/api/delete/image?key={imageKey}`
3. API deletes from R2 using `DeleteObjectCommand`
4. Call `api.inventory.removeImageFromInventory()` to remove from database

---

## 8. Helper Functions

### `generateImageKey(itemId: string, filename: string)`
- **Location**: `lib/r2/client.ts`
- **Purpose**: Generate unique key for R2 object
- **Format**: `inventory/{itemId}/{timestamp}-{sanitizedFilename}`
- **Returns**: string

---

## Summary

**Total APIs Used:**
- **AWS SDK**: 3 (S3Client, PutObjectCommand, DeleteObjectCommand)
- **Next.js Routes**: 2 (POST /api/upload/image, DELETE /api/delete/image)
- **Convex Mutations**: 2 (addImageToInventory, removeImageFromInventory)
- **Convex Queries**: 1 (getInventoryItemById)
- **Frontend Functions**: 3 (uploadImages, handleImageSelect, handleCameraCapture)

**Total**: 11 APIs/Functions

