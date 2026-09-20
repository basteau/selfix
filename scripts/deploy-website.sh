#!/usr/bin/env bash
set -euo pipefail
: "${EXE_HOST:?Set the verified VM SSH target}"
: "${EXE_SSH_KEY:?Set the dedicated deployment key}"
: "${EXE_KNOWN_HOSTS:?Set independently verified SSH host keys}"
: "${GITHUB_SHA:?Set the checked commit}"
[[ "$EXE_HOST" =~ ^([a-z_][a-z0-9_-]*@)?[a-z0-9][a-z0-9-]*\.exe\.xyz$ ]] || { echo 'Invalid exe.dev SSH target' >&2; exit 1; }
[[ "$GITHUB_SHA" =~ ^[0-9a-f]{40}$ ]] || { echo 'Invalid commit SHA' >&2; exit 1; }
[[ "$(cat apps/docs/dist/.well-known/selfix-release.txt)" == "$GITHUB_SHA" ]] || { echo 'Artifact does not match checked commit' >&2; exit 1; }
for page in index.html docs/index.html docs/getting-started/index.html; do
  test -s "apps/docs/dist/$page"
done
site_temp=$(mktemp -d)
trap 'rm -rf "$site_temp"' EXIT
umask 077
printf '%s\n' "$EXE_SSH_KEY" > "$site_temp/key"
printf '%s\n' "$EXE_KNOWN_HOSTS" > "$site_temp/known_hosts"
ssh_options=(-i "$site_temp/key" -o "UserKnownHostsFile=$site_temp/known_hosts" -o StrictHostKeyChecking=yes -o BatchMode=yes)
tar -czf "$site_temp/site.tgz" -C apps/docs/dist .
scp "${ssh_options[@]}" "$site_temp/site.tgz" "$EXE_HOST:site-upload-$GITHUB_SHA.tgz"
ssh "${ssh_options[@]}" "$EXE_HOST" "bash -s -- $GITHUB_SHA" <<'REMOTE'
set -euo pipefail
release=$1
mkdir -p "$HOME/selfix-site/releases"
cd "$HOME/selfix-site"
if test -f current/.well-known/selfix-release.txt && [[ "$(cat current/.well-known/selfix-release.txt)" == "$release" ]]; then
  rm "$HOME/site-upload-$release.tgz"
  exit 0
fi
release_dir=$(mktemp -d "releases/$release.XXXXXXXX")
tar -xzf "$HOME/site-upload-$release.tgz" -C "$release_dir"
for page in index.html docs/index.html docs/getting-started/index.html; do
  test -s "$release_dir/$page"
done
[[ "$(cat "$release_dir/.well-known/selfix-release.txt")" == "$release" ]]
# mktemp creates a private directory; the static server must be able to traverse it.
chmod 755 "$release_dir"
if test -L current; then
  previous=$(readlink current)
  ln -sfn "$previous" previous.next
  mv -Tf previous.next previous
fi
ln -sfn "$release_dir" current.next
mv -Tf current.next current
rm "$HOME/site-upload-$release.tgz"
REMOTE
node --input-type=module <<'NODE'
import assert from 'node:assert/strict'
for (const [route, expected] of [
  ['/.well-known/selfix-release.txt', process.env.GITHUB_SHA],
  ['/', 'selfix-landing'],
  ['/docs/', 'selfix'],
  ['/docs/getting-started', 'Reproduce a finding'],
]) {
  const response = await fetch(`https://selfix.dev${route}`, { signal: AbortSignal.timeout(30000), cache: 'no-store' })
  assert(response.ok, `${route}: HTTP ${response.status}`)
  assert((await response.text()).includes(expected), `${route}: unexpected content; use the documented rollback`)
}
NODE
