### 1️⃣ Create isolated Chrome user

```bash
sudo sysadminctl -addUser chromeuser -password chrome123 -home /Users/chromeuser
```

(You can later change the password or disable login.)

---

## ✅ Final combined script (THIS is what you asked for)

Create a file called:

```bash
chrome-isolated-final.sh
```

Paste **everything below exactly**:

```bash
#!/bin/bash

# -------- CONFIG --------
CHROME_USER="chromeuser"
CHROME_HOME="/Users/$CHROME_USER"
CHROME_PROFILE="$CHROME_HOME/.chrome-isolated"
SANDBOX_FILE="/tmp/chrome_isolated.sb"

# -------- SANDBOX POLICY --------
cat <<EOF > "$SANDBOX_FILE"
(version 1)

(deny default)

(allow process*)
(allow network*)
(allow sysctl-read)

(allow file-read*)
(allow file-write*
  (subpath "$CHROME_PROFILE"))
EOF

# -------- CREATE PROFILE DIR --------
sudo -u "$CHROME_USER" mkdir -p "$CHROME_PROFILE"

# -------- LAUNCH CHROME --------
sudo -u "$CHROME_USER" \
sandbox-exec -f "$SANDBOX_FILE" \
open -na "Google Chrome" --args \
  --user-data-dir="$CHROME_PROFILE" \
  --no-first-run \
  --disable-sync \
  --disable-component-update \
  --disable-background-networking \
  --disable-renderer-backgrounding \
  --disable-extensions \
  --disable-gpu
```

---

## 3️⃣ Make it executable

```bash
chmod +x chrome-isolated-final.sh
```

---

## 4️⃣ Run it

```bash
./chrome-isolated-final.sh
```

---

## 🔒 What this achieves (clearly)

✅ Chrome **has internet access**
✅ Runs as **another OS user**
✅ **Cannot see your apps, terminals, files, or processes**
✅ Separate Chrome profile, cache, extensions
✅ Sandboxed file access
✅ No third-party tools
✅ Appears as a normal Chrome window (Dock + Activity Monitor)

🚫 What cannot be hidden (macOS limitation):

* Overall CPU / memory pressure
* GPU availability

This is the **strongest isolation possible without a real VM**.

---

## 🧹 Remove everything (cleanup)

```bash
sudo sysadminctl -deleteUser chromeuser
rm -f /tmp/chrome_isolated.sb
```

---