#!/bin/sh
set -eu

save=/var/lib/niminglu/save.json
backups=/var/backups/niminglu
if [ ! -f "$save" ]; then exit 0; fi
umask 077
mkdir -p "$backups"
temporary=$(mktemp "$backups/.save-XXXXXXXX")
trap 'rm -f "$temporary"' EXIT HUP INT TERM
# The game saves with an atomic rename, so an open source is a complete snapshot.
cp "$save" "$temporary"
mv "$temporary" "$backups/save-$(date -u +%Y%m%dT%H%M%S)-$$.json"
# Keep daily and pre-update snapshots for thirty days.
find "$backups" -maxdepth 1 -type f -name 'save-*.json' -mtime +30 -delete
