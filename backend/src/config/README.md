# 🔑 Firebase Service Account Setup

## Quick Setup (2 minutes)

### Step 1: Download Service Account Key

1. **Click this direct link:** 
   👉 [Firebase Console - Service Accounts](https://console.firebase.google.com/project/cocopeat-d2bd3/settings/serviceaccounts/adminsdk)

2. **Click "Generate new private key"** button

3. **Click "Generate key"** in the confirmation dialog

4. A JSON file will download (e.g., `cocopeat-d2bd3-firebase-adminsdk-xxxxx.json`)

### Step 2: Save the File

**Rename** the downloaded file to exactly:
```
serviceAccountKey.json
```

**Move** it to this directory:
```
backend/src/config/serviceAccountKey.json
```

### Step 3: Restart Server

```bash
cd backend
npm run dev
```

You should see: `✅ Firebase Realtime Database connected successfully`

---

## ⚠️ Security Notes

- ✅ `serviceAccountKey.json` is already in `.gitignore` 
- ❌ **NEVER** commit this file to Git
- ❌ **NEVER** share this file publicly
- ✅ Keep it secure on your local machine only

---

## Alternative: Environment Variable Method

If you prefer not to use a file, you can set an environment variable:

1. Copy the **entire contents** of your service account JSON
2. Add to `backend/.env` as a **single line**:

```env
FIREBASE_SERVICE_ACCOUNT='{"type":"service_account","project_id":"cocopeat-d2bd3",...}'
```

⚠️ Make sure it's all on one line with no line breaks!

---

## Troubleshooting

### Error: "Could not load the default credentials"
➜ You need to download the service account key (see Step 1 above)

### Error: "Credential implementation failed"
➜ Make sure the JSON file is valid and in the correct location

### Error: "FIREBASE CREDENTIALS NOT FOUND"
➜ Check that the file is named exactly `serviceAccountKey.json` in the `backend/src/config/` folder

---

## File Structure Should Look Like:

```
backend/
  src/
    config/
      ├── db.js
      ├── serviceAccountKey.json          ← Your actual key (DO NOT COMMIT)
      ├── serviceAccountKey.json.example  ← Template only
      └── README.md                       ← This file
```

---

**Need help?** Check `backend/FIREBASE_SETUP.md` for more detailed instructions.
