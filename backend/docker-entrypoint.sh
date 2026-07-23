#!/bin/sh
# Entrypoint for the backend container.
#
# Why this exists: the app runs as the non-root `node` user (good), but a
# Railway volume is mounted owned by root. Node would then get EACCES trying to
# write uploads into it. So we start as root ONLY to fix ownership of the
# mount, then drop to `node` for the actual process via su-exec. The Node
# process itself never runs as root.
set -e

# Railway sets this whenever a volume is attached. Chown the whole mount so the
# app can create its `uploads/` subdirectory inside it (see env.uploadDir).
if [ -n "$RAILWAY_VOLUME_MOUNT_PATH" ] && [ -d "$RAILWAY_VOLUME_MOUNT_PATH" ]; then
  chown -R node:node "$RAILWAY_VOLUME_MOUNT_PATH" 2>/dev/null || \
    echo "entrypoint: could not chown $RAILWAY_VOLUME_MOUNT_PATH (continuing)"
fi

# An explicit UPLOAD_DIR might point somewhere else (or be used with no
# Railway volume); make sure it exists and is writable by node too.
if [ -n "$UPLOAD_DIR" ]; then
  mkdir -p "$UPLOAD_DIR" 2>/dev/null || true
  chown -R node:node "$UPLOAD_DIR" 2>/dev/null || true
fi

exec su-exec node "$@"
