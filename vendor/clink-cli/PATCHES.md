# Vendored CLI Patches

## trae-config-dir-hotfix

The wrapper sets `CLINK_CONFIG_DIR=$HOME/.local/share/clink-cli/trae-work-cn`
when `TRAE_SANDBOX_SBOX_ID` is present and no explicit override exists. The
vendored CLI accepts that absolute override for the config, lock, and
wallet-init generation files; relative values fail with a config error.

Preserve this behavior when updating the bundle. The wrapper test verifies the
TRAE config path and its private file permissions.
