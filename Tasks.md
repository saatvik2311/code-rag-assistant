### 1️⃣ Create isolated Chrome user

```bash
sudo sysadminctl -addUser chromeuser -password chrome123 -home /Users/chromeuser
```

(You can later change the password or disable login.)

---


---

## ✅ The Only Working Solution for Safari: Native User Switching

Apple's security (SIP) prevents Safari from being "wrapped" in scripts like Chrome. It will always crash if you force it.

**However, you have already secured your files.**

Since you ran:
```bash
chmod 700 /Users/username
```
**NO other user on this Mac can see your files.**

### How to Run Isolated Safari:

1.  **Click the Apple Menu () -> System Settings.**
2.  **Users & Groups.**
3.  Click the **"i"** next to **Guest User**.
4.  Turn **ON** "Allow guests to log in to this computer".

### Whenever you want an Isolated Browser:

1.  Click your name in the **Menu Bar** (top right) or go to the **Lock Screen**.
2.  Select **Guest User**.
3.  It will switch you to a **temporary, clean workspace**.
4.  Open **Safari** there.
    *   It has **NO access** to your history/passwords.
    *   It has **NO access** to your files (blocked by `chmod 700`).
    *   When you log out, **everything is deleted** (cookies, cache, history).

This is the **Gold Standard** for isolation on macOS. It is cleaner and safer than any script.

---


---

## 5️⃣ 🛡️ MAXIMUM ISOLATION (Recommended)

By default, macOS allows other users to "see" inside your home folder (but not read Documents/Desktop). The "Isolated Safari" could still read public files.

**To forcefully take away ALL permissions from the isolated user:**

Run this command for your **Main User** (`username`):

```bash
chmod 700 /Users/username
```

**What this does:**
*   Sets your home folder to **Owner Only**.
*   `chromeuser` (and everyone else) is **strictly denied** entry.
*   They cannot even list files, let alone read them.
*   Safari will have **ZERO** file access to your data.

---

## 6️⃣ 🕵️‍♀️ How to Verify Isolation

### Test 1: File System Access
1.  **Ensure you ran the `chmod 700` command above.**
2.  In the **Isolated Safari**, try to open **ANY** file from your home folder.
    *   Press `Cmd+O` -> Press `Cmd+Shift+G` -> Type `/Users/username`.
3.  **Result:** It should be **empty** or show **"Permission denied"**. You won't even be able to see filenames.

### Test 2: Hardware Access (Mic/Cam/Screen)
*   **Microphone/Camera:** macOS will prompt YOU (on the main desktop) if the background user asks for access. You can deny it.
*   **Screen Recording:** macOS System Settings > Privacy & Security > Screen Recording.
    *   Ensure **Safari** is **NOT** checked here.
    *   Background users are blocked from recording the active session by default.

---
